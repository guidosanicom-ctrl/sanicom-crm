import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Upload, CheckCircle } from 'lucide-react';

const CRM_FIELDS = ['nombre', 'cif', 'telefono', 'email', 'direccion', 'ciudad', 'provincia', 'cp', 'tipo', 'especialidad'];
const FIELD_LABELS = { nombre: 'Nombre', cif: 'CIF/NIF', telefono: 'Teléfono', email: 'Email', direccion: 'Dirección', ciudad: 'Ciudad', provincia: 'Provincia', cp: 'Código Postal', tipo: 'Tipo', especialidad: 'Especialidad' };

const autoMap = (headers) => {
  const map = {};
  const normalize = s => s?.toLowerCase().replace(/[^a-z]/g, '');
  headers.forEach(h => {
    const hn = normalize(h);
    for (const field of CRM_FIELDS) {
      const fn = normalize(field);
      if (hn === fn || hn.includes(fn) || fn.includes(hn)) { if (!map[field]) map[field] = h; }
    }
  });
  return map;
};

export default function ImportWizard({ open, onClose, onImport }) {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mode, setMode] = useState('skip');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const reset = () => { setStep(1); setRows([]); setHeaders([]); setMapping({}); };

  const parseFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    if (ext === 'json') {
      reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        const arr = Array.isArray(data) ? data : [data];
        const h = Object.keys(arr[0] || {});
        setHeaders(h); setRows(arr); setMapping(autoMap(h)); setStep(2);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const h = Object.keys(data[0] || {});
        setHeaders(h); setRows(data); setMapping(autoMap(h)); setStep(2);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFile = (file) => { if (file) parseFile(file); };

  const mappedRows = rows.map(row => {
    const obj = {};
    CRM_FIELDS.forEach(field => { if (mapping[field]) obj[field] = String(row[mapping[field]] || ''); });
    return obj;
  });

  const handleImport = () => {
    const { imported, skipped } = onImport(mappedRows, mode);
    onClose(); reset();
    return { imported, skipped };
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ nombre: 'Ejemplo Clínica', cif: 'B12345678', telefono: '000 000 000', email: 'info@ejemplo.es', direccion: 'C/ Ejemplo, 1', ciudad: 'Madrid', provincia: 'Madrid', cp: '28001', tipo: 'Clínica', especialidad: 'Medicina general' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'plantilla_clientes_sanicom.xlsx');
  };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Importar clientes" size="lg"
      footer={
        step === 1 ? <Button variant="outline" onClick={downloadTemplate}>Descargar plantilla CSV</Button> :
        step === 2 ? <><Button variant="outline" onClick={() => setStep(1)}>Atrás</Button><Button onClick={() => setStep(3)}>Ver preview</Button></> :
        step === 3 ? <><Button variant="outline" onClick={() => setStep(2)}>Atrás</Button><Button onClick={() => setStep(4)}>Continuar</Button></> :
        <><Button variant="outline" onClick={() => setStep(3)}>Atrás</Button><Button onClick={handleImport}>Importar ahora</Button></>
      }
    >
      {/* Steps indicator */}
      <div className="flex items-center mb-6">
        {['Archivo', 'Mapeo', 'Preview', 'Confirmar'].map((s, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-[#1B4F8A] text-white' : 'bg-gray-100 text-gray-400'}`}>
              {step > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`ml-2 text-sm ${step === i + 1 ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-gray-200 mx-3" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Arrastra un archivo aquí o haz clic para seleccionar</p>
          <p className="text-xs text-gray-400 mt-1">Soportado: .csv, .xlsx, .xls, .json</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{rows.length} filas encontradas. Mapea las columnas del archivo a los campos del CRM:</p>
          {CRM_FIELDS.map(field => (
            <div key={field} className="flex items-center gap-4">
              <label className="w-36 text-sm font-medium text-gray-700">{FIELD_LABELS[field]}</label>
              <select
                value={mapping[field] || ''}
                onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
              >
                <option value="">— No mapear —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="overflow-x-auto">
          <p className="text-sm text-gray-600 mb-3">Mostrando primeras {Math.min(5, mappedRows.length)} de {mappedRows.length} filas:</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {CRM_FIELDS.filter(f => mapping[f]).map(f => <th key={f} className="px-2 py-2 text-left font-medium text-gray-600 border border-gray-200">{FIELD_LABELS[f]}</th>)}
              </tr>
            </thead>
            <tbody>
              {mappedRows.slice(0, 5).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {CRM_FIELDS.filter(f => mapping[f]).map(f => <td key={f} className="px-2 py-1.5 border border-gray-200 text-gray-700">{row[f]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800">Resumen de importación</p>
            <p className="text-sm text-blue-600 mt-1">{mappedRows.length} clientes listos para importar</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Si ya existe un cliente (mismo CIF o nombre):</p>
            <div className="space-y-2">
              {[{ value: 'skip', label: 'Saltar duplicados' }, { value: 'update', label: 'Actualizar si ya existe' }].map(o => (
                <label key={o.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="mode" value={o.value} checked={mode === o.value} onChange={() => setMode(o.value)} />
                  <span className="text-sm text-gray-700">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
