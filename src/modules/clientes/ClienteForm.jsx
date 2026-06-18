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
import { Loader2 } from 'lucide-react';

const empty = {
  nombre: '', contactoPrincipal: '', tipo: 'Clínica', especialidad: 'Medicina general', subespecialidad: '', cif: '',
  direccion: '', ciudad: '', provincia: '', cp: '',
  telefono: '', email: '', website: '', estado: 'Activo', notas: '',
  // Campos exclusivos de Hospital público
  servicio: '', jefeNombre: '', jefeTelefono: '', jefeEmail: '', jefeNotas: '',
};

function genId() { return `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

export default function ClienteForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});
  const [cpLoading, setCpLoading] = useState(false);
  const cpAbort = useRef(null);

  const { isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
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

  const handleSave = () => {
    if (!validate()) return;

    let data = { ...form };

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

    onSave(data);
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
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>{initial ? 'Guardar cambios' : 'Crear cliente'}</Button>
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

      </div>
    </Modal>
  );
}
