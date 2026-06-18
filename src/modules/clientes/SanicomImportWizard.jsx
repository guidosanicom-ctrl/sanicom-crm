import { useState, useRef } from 'react';
import { Upload, CheckCircle, FileJson, Info, Package, Star, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function SanicomImportWizard({ open, onClose, onImport }) {
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [mode, setMode] = useState('skip');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const reset = () => { setStep(1); setClientes([]); setError(''); };

  const parseJson = (file) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const arr = Array.isArray(data) ? data : [data];
        if (!arr[0]?.nombre) throw new Error('El JSON no tiene el formato esperado (falta campo "nombre").');
        setClientes(arr);
        setStep(2);
      } catch (err) {
        setError(`Error al leer el archivo: ${err.message}`);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setError('Solo se admite el archivo JSON generado por el script de Python. Para subir un Excel usa el importador genérico.');
      return;
    }
    parseJson(file);
  };

  const handleImport = async () => {
    const result = await onImport(clientes, mode);
    setStep(3);
    return result;
  };

  // Estadísticas del JSON cargado
  const stats = {
    total: clientes.length,
    conEquipos: clientes.filter(c => c.equiposInstalados?.length).length,
    totalEquipos: clientes.reduce((s, c) => s + (c.equiposInstalados?.length || 0), 0),
    conInteres: clientes.filter(c => c.equiposInteres?.length).length,
    totalInteres: clientes.reduce((s, c) => s + (c.equiposInteres?.length || 0), 0),
    provincias: [...new Set(clientes.map(c => c.provincia).filter(Boolean))],
  };

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Importar planilla Sanicom"
      size="lg"
      footer={
        step === 1 ? null :
        step === 2 ? (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
            <Button onClick={() => setStep(2.5)}>Ver opciones →</Button>
          </>
        ) :
        step === 2.5 ? (
          <>
            <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
            <Button onClick={handleImport}>Importar {stats.total} clientes</Button>
          </>
        ) : (
          <Button onClick={() => { onClose(); reset(); }}>Cerrar</Button>
        )
      }
    >
      {/* Indicador de pasos */}
      {step !== 3 && (
        <div className="flex items-center mb-6">
          {['Archivo', 'Preview', 'Opciones'].map((s, i) => {
            const num = i + 1;
            const cur = step < 2 ? 1 : step < 2.5 ? 2 : 3;
            return (
              <div key={i} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${cur > num ? 'bg-green-500 text-white' : cur === num ? 'bg-[#1B4F8A] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {cur > num ? <CheckCircle className="w-4 h-4" /> : num}
                </div>
                <span className={`ml-2 text-sm ${cur === num ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{s}</span>
                {i < 2 && <div className="w-8 h-px bg-gray-200 mx-3" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Paso 1: Instrucciones + subida de JSON */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Panel de instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Info className="w-4 h-4" />
              Cómo usar este importador
            </div>
            <ol className="text-sm text-blue-700 space-y-1 pl-5 list-decimal">
              <li>Descarga el script Python:&nbsp;
                <a href="/scripts/importar_sanicom.py" download="importar_sanicom.py"
                   className="underline font-medium text-blue-800 hover:text-blue-900">
                  importar_sanicom.py
                </a>
              </li>
              <li>Instala dependencias: <code className="bg-blue-100 px-1 rounded">pip install openpyxl</code></li>
              <li>Ejecuta: <code className="bg-blue-100 px-1 rounded">python importar_sanicom.py planilla.xlsx</code></li>
              <li>Se genera <code className="bg-blue-100 px-1 rounded">clientes_sanicom.json</code> — súbelo aquí</li>
            </ol>
          </div>

          {/* Leyenda de colores */}
          <div className="flex gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-400 border border-green-500" />
              Fondo verde → Equipos que tiene
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-300 border border-cyan-400" />
              Fondo celeste → Equipos con interés
            </div>
          </div>

          {/* Drop zone */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
              ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <FileJson className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Arrastra el archivo JSON aquí o haz clic para seleccionar</p>
            <p className="text-xs text-gray-400 mt-1">Solo archivos .json generados por el script de Python</p>
            <input ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        </div>
      )}

      {/* Paso 2: Preview */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#1B4F8A]">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Clientes</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.totalEquipos}</p>
              <p className="text-xs text-gray-500 mt-1">Equipos que tienen</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-cyan-700">{stats.totalInteres}</p>
              <p className="text-xs text-gray-500 mt-1">Equipos con interés</p>
            </div>
          </div>

          {/* Provincias */}
          {stats.provincias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stats.provincias.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{p}</span>
              ))}
            </div>
          )}

          {/* Tabla de preview */}
          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Ciudad</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Teléfono</th>
                  <th className="px-3 py-2 text-center font-semibold text-green-700">
                    <Package className="w-3 h-3 inline mr-1" />Tiene
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-cyan-700">
                    <Star className="w-3 h-3 inline mr-1" />Interés
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientes.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{c.nombre}</td>
                    <td className="px-3 py-2 text-gray-500">{c.ciudad || c.provincia || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{c.telefono || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {c.equiposInstalados?.length > 0
                        ? <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold leading-5">{c.equiposInstalados.length}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.equiposInteres?.length > 0
                        ? <span className="inline-block w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold leading-5">{c.equiposInteres.length}</span>
                        : <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paso 2.5: Opciones de importación */}
      {step === 2.5 && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800">Resumen</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• {stats.total} clientes a importar</li>
              <li>• {stats.totalEquipos} equipos que tienen (celdas verdes)</li>
              <li>• {stats.totalInteres} equipos con interés (celdas celestes)</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Si el cliente ya existe (mismo nombre):</p>
            <div className="space-y-2">
              {[
                { value: 'skip', label: 'Saltar duplicados', desc: 'No modifica clientes que ya existen en el CRM' },
                { value: 'update', label: 'Actualizar existentes', desc: 'Sobreescribe los datos con los de la planilla (equipos incluidos)' },
              ].map(o => (
                <label key={o.value} className="flex items-start gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <input type="radio" name="mode" value={o.value} checked={mode === o.value}
                    onChange={() => setMode(o.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{o.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Éxito */}
      {step === 3 && (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-800">¡Importación completada!</p>
          <p className="text-sm text-gray-500">
            {stats.total} clientes importados con sus equipos y equipos con interés.
          </p>
          <p className="text-xs text-gray-400">
            Los equipos con celdas verdes aparecen en la pestaña "Equipos que tiene" de cada ficha.<br />
            Los equipos con celdas celestes aparecen como "Equipos con interés".
          </p>
        </div>
      )}
    </Modal>
  );
}
