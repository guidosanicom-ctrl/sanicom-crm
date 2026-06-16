import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { TIPOS_CLIENTE, ESPECIALIDADES, ESTADOS_CLIENTE } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';

const empty = {
  nombre: '', tipo: 'Clínica', especialidad: 'Medicina general', cif: '',
  direccion: '', ciudad: '', provincia: '', cp: '',
  telefono: '', email: '', website: '', estado: 'Activo', notas: '',
};

export default function ClienteForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initial || empty);
      setErrors({});
    }
  }, [open, initial]);

  const { isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const espOptions = isCarlos() ? CARLOS_ESPECIALIDADES : ESPECIALIDADES;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
    onClose();
    setForm(empty);
  };

  const f = (k) => ({
    value: form[k] || '',
    onChange: e => set(k, e.target.value),
    className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${errors[k] ? 'border-red-400' : 'border-gray-200'}`,
  });

  const sel = (k) => ({ ...f(k), className: `w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20` });

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar cliente' : 'Nuevo cliente'} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>{initial ? 'Guardar cambios' : 'Crear cliente'}</Button>
      </>}
    >
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Información general</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre empresa *</label>
              <input {...f('nombre')} placeholder="Hospital / Clínica..." />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select {...sel('tipo')}>{TIPOS_CLIENTE.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Especialidad médica</label>
              <select {...sel('especialidad')}>{espOptions.map(e => <option key={e}>{e}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CIF / NIF</label>
              <input {...f('cif')} placeholder="B12345678" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select {...sel('estado')}>{ESTADOS_CLIENTE.map(e => <option key={e}>{e}</option>)}</select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Dirección</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección (calle)</label>
              <input {...f('direccion')} placeholder="C/ Ejemplo, 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
              <input {...f('ciudad')} placeholder="Sevilla" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Provincia</label>
              <input {...f('provincia')} placeholder="Sevilla" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código Postal</label>
              <input {...f('cp')} placeholder="41001" />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Contacto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input {...f('telefono')} placeholder="000 000 000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input {...f('email')} type="email" placeholder="info@empresa.es" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input {...f('website')} placeholder="www.empresa.es" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas internas</label>
          <textarea {...f('notas')} rows={3} placeholder="Observaciones..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
        </div>
      </div>
    </Modal>
  );
}
