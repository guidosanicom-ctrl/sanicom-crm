import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Globe, Edit, Plus, Trash2 } from 'lucide-react';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useServicioStore } from '../../store/servicioStore';
import { useEquiposStore } from '../../store/equiposStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ClienteForm from './ClienteForm';
import { formatDate, formatCurrency } from '../../utils/formatters';
import MapView from './MapView';

const TABS = ['Resumen', 'Contactos', 'Equipos instalados', 'Oportunidades', 'Servicio técnico', 'Notas & actividad'];

export default function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCliente, updateCliente, deleteCliente, addContacto, updateContacto, deleteContacto } = useClientesStore();
  const { oportunidades } = useOportunidadesStore();
  const { servicios } = useServicioStore();
  const { getEquipo } = useEquiposStore();
  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [contactoForm, setContactoForm] = useState(null);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);

  const { isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const carlos = isCarlos();

  const cliente = getCliente(id);
  if (!cliente) return <div className="p-8 text-gray-400">Cliente no encontrado.</div>;
  if (carlos && !CARLOS_ESPECIALIDADES.includes(cliente.especialidad)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-400 text-sm">No tienes acceso a este cliente.</p>
        <button onClick={() => navigate('/clientes')} className="text-[#1B4F8A] text-sm hover:underline cursor-pointer">Volver a clientes</button>
      </div>
    );
  }

  const clienteOpps = oportunidades.filter(o => o.clienteId === id);
  const clienteServices = servicios.filter(s => s.clienteId === id);

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(n => [{ text: note, date: new Date().toISOString() }, ...n]);
    setNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/clientes')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cliente.nombre}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge color={cliente.estado === 'Activo' ? 'green' : 'gray'}>{cliente.estado}</Badge>
              <span className="text-sm text-gray-500">{cliente.tipo}</span>
              {cliente.especialidad && <span className="text-sm text-gray-400">· {cliente.especialidad}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Edit className="w-4 h-4" />Editar</Button>
          <Button variant="danger" size="sm" onClick={() => setDelOpen(true)}><Trash2 className="w-4 h-4" />Eliminar</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px
                ${activeTab === i ? 'border-[#1B4F8A] text-[#1B4F8A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <h3 className="font-semibold text-gray-800 mb-4">Datos generales</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-gray-500">CIF/NIF</div><div className="font-medium">{cliente.cif || '-'}</div>
                <div className="text-gray-500">Tipo</div><div className="font-medium">{cliente.tipo}</div>
                <div className="text-gray-500">Especialidad</div><div className="font-medium">{cliente.especialidad || '-'}</div>
                <div className="text-gray-500">Fecha de alta</div><div className="font-medium">{formatDate(cliente.fechaAlta)}</div>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-800 mb-4">Contacto</h3>
              <div className="space-y-2">
                {cliente.telefono && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" />{cliente.telefono}</div>}
                {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" />{cliente.email}</div>}
                {cliente.website && <div className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-gray-400" />{cliente.website}</div>}
                {cliente.direccion && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400" />{cliente.direccion}, {cliente.ciudad} {cliente.cp}</div>}
              </div>
            </Card>
            {cliente.notas && <Card><h3 className="font-semibold text-gray-800 mb-2">Notas internas</h3><p className="text-sm text-gray-600">{cliente.notas}</p></Card>}
          </div>
          <div>
            <MapView lat={cliente.lat} lng={cliente.lng} nombre={cliente.nombre} ciudad={cliente.ciudad} />
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Contactos</h3>
            <Button size="sm" onClick={() => setContactoForm({ nombre: '', cargo: '', telefono: '', email: '' })}>
              <Plus className="w-4 h-4" />Añadir
            </Button>
          </div>
          {contactoForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {['nombre', 'cargo', 'telefono', 'email'].map(k => (
                  <div key={k}>
                    <label className="text-xs font-medium text-gray-600 capitalize mb-1 block">{k}</label>
                    <input value={contactoForm[k]} onChange={e => setContactoForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setContactoForm(null)}>Cancelar</Button>
                <Button size="sm" onClick={() => { addContacto(id, contactoForm); setContactoForm(null); }}>Guardar</Button>
              </div>
            </div>
          )}
          {(cliente.contactos || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay contactos</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(cliente.contactos || []).map(ct => (
                <div key={ct.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{ct.nombre}</p>
                    <p className="text-xs text-gray-500">{ct.cargo} · {ct.telefono} · {ct.email}</p>
                  </div>
                  <button onClick={() => deleteContacto(id, ct.id)} className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Equipos instalados</h3>
          <p className="text-sm text-gray-400 text-center py-8">Sin equipos instalados registrados.</p>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Oportunidades</h3>
          {clienteOpps.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin oportunidades.</p> : (
            <div className="divide-y divide-gray-100">
              {clienteOpps.map(op => (
                <div key={op.id} className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg px-2" onClick={() => navigate('/pipeline')}>
                  <div>
                    <p className="text-sm font-medium">{op.nombre}</p>
                    <p className="text-xs text-gray-500">{op.etapa} · {formatCurrency(op.valor)}</p>
                  </div>
                  <Badge color={op.etapa === 'Ganado' ? 'green' : op.etapa === 'Perdido' ? 'gray' : 'blue'}>{op.etapa}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 4 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Historial de servicio técnico</h3>
          {clienteServices.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin órdenes de servicio.</p> : (
            <div className="divide-y divide-gray-100">
              {clienteServices.map(s => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.numero} · {s.tipo}</p>
                    <p className="text-xs text-gray-500">{formatDate(s.fechaProgramada)} · {s.estado}</p>
                  </div>
                  <Badge color={s.estado === 'Completada' ? 'green' : s.estado === 'En curso' ? 'orange' : 'yellow'}>{s.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 5 && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Notas & Actividad</h3>
          <div className="flex gap-2 mb-4">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Añadir nota..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" onKeyDown={e => e.key === 'Enter' && addNote()} />
            <Button size="sm" onClick={addNote}>Añadir</Button>
          </div>
          {notes.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin actividad registrada.</p> : (
            <div className="space-y-3">
              {notes.map((n, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ClienteForm open={editOpen} onClose={() => setEditOpen(false)} initial={cliente}
        onSave={(data) => updateCliente(id, data)} />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteCliente(id); navigate('/clientes'); }}
        title="Eliminar cliente"
        message={`¿Seguro que deseas eliminar "${cliente.nombre}"? Esta acción no se puede deshacer.`} />
    </div>
  );
}
