import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import CiudadInput, { CP_PROVINCIA } from '../../components/ui/CiudadInput';
import { ESTADOS_CLIENTE } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useEspecialidadesStore } from '../../store/especialidadesStore';
import { useSubespecialidadesStore } from '../../store/subespecialidadesStore';
import { useTiposClienteStore } from '../../store/tiposClienteStore';
import { useServiciosHospitalStore } from '../../store/serviciosHospitalStore';
import { useVisitasStore } from '../../store/visitasStore';
import { useAgendaStore } from '../../store/agendaStore';
import { geocodificar } from '../../utils/geocode';
import { Loader2 } from 'lucide-react';

const empty = {
  nombre: '', contactoPrincipal: '', tipo: 'Clínica', especialidad: 'Medicina general', subespecialidad: '', cif: '',
  direccion: '', ciudad: '', provincia: '', cp: '',
  telefono: '', email: '', website: '', estado: 'Activo', notas: '',
  // Campos exclusivos de Hospital público
  servicio: '', jefeNombre: '', jefeTelefono: '', jefeEmail: '', jefeNotas: '',
};

function genId() { return `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

const emptyVisita = { activa: false, fecha: '', hora: '', comercialId: '', objetivo: '', resultado: '' };

export default function ClienteForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});
  const [cpLoading, setCpLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [primeraVisita, setPrimeraVisita] = useState(emptyVisita);
  const cpAbort = useRef(null);

  const { isCarlos, CARLOS_ESPECIALIDADES, users } = useAuthStore();
  const { addVisita } = useVisitasStore();
  const addEvento = useAgendaStore(s => s.addEvento);
  const { especialidades } = useEspecialidadesStore();
  const { subespecialidades } = useSubespecialidadesStore();
  const { tipos: tiposCliente } = useTiposClienteStore();
  const { servicios: serviciosHospital } = useServiciosHospitalStore();
  const espOptions = isCarlos()
    ? CARLOS_ESPECIALIDADES.filter(e => especialidades.includes(e))
    : especialidades;

  const esHospitalPublico = form.tipo === 'Hospital público';

  useEffect(() => {
    if (open) {
      const base = initial || { ...empty, especialidad: espOptions[0], servicio: serviciosHospital[0] || '' };
      setForm(base);
      setErrors({});
      setCpLoading(false);
      setPrimeraVisita(emptyVisita);
    }
  }, [open, initial]);

  // Lookup automático al escribir un CP de 5 dígitos
  useEffect(() => {
    const cp = form.cp?.trim();
    if (!cp || cp.length !== 5 || !/^\d{5}$/.test(cp)) return;
    if (cpAbort.current) cpAbort.current.abort();
    const controller = new AbortController();
    cpAbort.current = controller;
    setCpLoading(true);
    fetch(`https://api.zippopotam.us/es/${cp}`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(data => {
        const place = data.places?.[0];
        if (place) {
          const provincia = CP_PROVINCIA[cp.substring(0, 2)] || '';
          setForm(f => ({ ...f, ciudad: place['place name'], provincia }));
        }
      })
      .catch(e => { if (e.name !== 'AbortError') { /* campo queda editable */ } })
      .finally(() => setCpLoading(false));
  }, [form.cp]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    let data = { ...form };

    // Geocodificar si tiene dirección/ciudad y aún no tiene coordenadas guardadas
    if ((data.direccion || data.ciudad) && (!data.lat || !data.lng)) {
      setGeoLoading(true);
      const coords = await geocodificar(data.direccion, data.ciudad, data.provincia);
      setGeoLoading(false);
      if (coords) { data.lat = coords.lat; data.lng = coords.lng; }
    }

    // Para Hospital público: convertir el servicio + jefe en la primera entrada de serviciosEspecialidades
    if (esHospitalPublico && form.servicio) {
      const entradaExistente = (initial?.serviciosEspecialidades || []).find(e => e.nombre === form.servicio);
      if (!entradaExistente) {
        data.serviciosEspecialidades = [
          ...(initial?.serviciosEspecialidades || []),
          {
            id:       genId(),
            nombre:   form.servicio,
            jefe:     form.jefeNombre  || '',
            telefono: form.jefeTelefono || '',
            email:    form.jefeEmail    || '',
            notas:    form.jefeNotas    || '',
          },
        ];
      }
    }

    const savedCliente = onSave(data);

    // Crear primera visita si el toggle está activo y tenemos un cliente nuevo con ID
    if (!initial && primeraVisita.activa && primeraVisita.fecha && primeraVisita.comercialId && savedCliente?.id) {
      const comercialUser = users.find(u => u.id === primeraVisita.comercialId);
      const visita = addVisita({
        clienteId: savedCliente.id,
        fecha: primeraVisita.fecha,
        hora: primeraVisita.hora || '',
        comercialId: primeraVisita.comercialId,
        comercialNombre: comercialUser?.name || '',
        estado: 'Realizada',
        objetivo: primeraVisita.objetivo,
        resultado: primeraVisita.resultado,
        oportunidadId: '',
      });
      // No agenda event for Realizada visits
      void visita;
    }

    onClose();
    setForm(empty);
  };

  const handleCiudadSelect = (ciudad, provincia, cp) => {
    setForm(f => ({
      ...f,
      ciudad,
      ...(provincia !== undefined && { provincia }),
      ...(cp !== undefined && { cp }),
    }));
  };

  const inp = (k) => ({
    value: form[k] || '',
    onChange: e => set(k, e.target.value),
    className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${errors[k] ? 'border-red-400' : 'border-gray-200'}`,
  });

  const sel = (k) => ({
    value: form[k] || '',
    onChange: e => set(k, e.target.value),
    className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20',
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar cliente' : 'Nuevo cliente'} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={geoLoading}>Cancelar</Button>
        <Button onClick={handleSave} disabled={geoLoading}>
          {geoLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Localizando…</>
            : initial ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </>}
    >
      <div className="space-y-6">

        {/* ── Información general ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Información general</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre empresa *</label>
              <input {...inp('nombre')} placeholder="Hospital / Clínica..." />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de contacto principal</label>
              <input {...inp('contactoPrincipal')} placeholder="Ej: Juan García" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select {...sel('tipo')}>{tiposCliente.map(t => <option key={t}>{t}</option>)}</select>
            </div>

            {/* Campo condicional: Especialidad médica (todos excepto Hospital público) */}
            {!esHospitalPublico && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Especialidad médica</label>
                <select {...sel('especialidad')} onChange={e => { set('especialidad', e.target.value); if (e.target.value !== 'Fisioterapia') set('subespecialidad', ''); }}>
                  {espOptions.map(e => <option key={e}>{e}</option>)}
                </select>
                {form.especialidad === 'Fisioterapia' && (
                  <select
                    value={form.subespecialidad || ''}
                    onChange={e => set('subespecialidad', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Subespecialidad (opcional)</option>
                    {subespecialidades.map(s => <option key={s}>{s}</option>)}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CIF / NIF</label>
              <input {...inp('cif')} placeholder="B12345678" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select {...sel('estado')}>{ESTADOS_CLIENTE.map(e => <option key={e}>{e}</option>)}</select>
            </div>
          </div>
        </div>

        {/* ── Sección exclusiva Hospital público: Servicio + Jefe de servicio ── */}
        {esHospitalPublico && (
          <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-semibold text-blue-800">Servicio hospitalario</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Servicio</label>
                <select {...sel('servicio')}>
                  {serviciosHospital.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del jefe de servicio</label>
                <input {...inp('jefeNombre')} placeholder="Dr. / Dra. ..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono directo</label>
                <input {...inp('jefeTelefono')} placeholder="Ext. o directo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input {...inp('jefeEmail')} type="email" placeholder="jefe@hospital.es" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <input {...inp('jefeNotas')} placeholder="Observaciones sobre el servicio..." />
              </div>
            </div>
          </div>
        )}

        {/* ── Dirección ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Dirección</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección (calle)</label>
              <input {...inp('direccion')} placeholder="C/ Ejemplo, 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
              <CiudadInput value={form.ciudad} onSelect={handleCiudadSelect} error={!!errors.ciudad} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Provincia</label>
              <input {...inp('provincia')} placeholder="Sevilla" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                Código Postal
                {cpLoading && <Loader2 className="w-3 h-3 text-[#3ABDD5] animate-spin" />}
              </label>
              <input {...inp('cp')} placeholder="41001" maxLength={5} />
            </div>
          </div>
        </div>

        {/* ── Contacto ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Contacto general</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input {...inp('telefono')} placeholder="000 000 000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input {...inp('email')} type="email" placeholder="info@empresa.es" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input {...inp('website')} placeholder="www.empresa.es" />
            </div>
          </div>
        </div>

        {/* ── Notas ── */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas internas</label>
          <textarea {...inp('notas')} rows={3} placeholder="Observaciones..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
        </div>

        {/* ── Primera visita (solo en creación) ── */}
        {!initial && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={primeraVisita.activa}
                onChange={e => setPrimeraVisita(v => ({ ...v, activa: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 accent-[#1B4F8A] cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">¿Ya has visitado este cliente?</span>
            </label>
            {primeraVisita.activa && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de la visita *</label>
                  <input
                    type="date"
                    value={primeraVisita.fecha}
                    onChange={e => setPrimeraVisita(v => ({ ...v, fecha: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora (opcional)</label>
                  <input
                    type="time"
                    value={primeraVisita.hora}
                    onChange={e => setPrimeraVisita(v => ({ ...v, hora: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Comercial *</label>
                  <select
                    value={primeraVisita.comercialId}
                    onChange={e => setPrimeraVisita(v => ({ ...v, comercialId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Seleccionar...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo</label>
                  <input
                    type="text"
                    value={primeraVisita.objetivo}
                    onChange={e => setPrimeraVisita(v => ({ ...v, objetivo: e.target.value }))}
                    placeholder="¿Para qué fue la visita?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Resultado / notas</label>
                  <textarea
                    value={primeraVisita.resultado}
                    onChange={e => setPrimeraVisita(v => ({ ...v, resultado: e.target.value }))}
                    rows={2}
                    placeholder="Resumen de lo hablado..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
}
