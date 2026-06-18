import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

// Mapa de prefijo CP → provincia
export const CP_PROVINCIA = {
  '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería',
  '05': 'Ávila', '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona',
  '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón',
  '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca',
  '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Guipúzcoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León',
  '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid',
  '29': 'Málaga', '30': 'Murcia', '31': 'Navarra', '32': 'Ourense',
  '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas', '36': 'Pontevedra',
  '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria',
  '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona',
  '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid',
  '48': 'Vizcaya', '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

// Ciudades destacadas de Andalucía
const ANDALUCIA = [
  { ciudad: 'Sevilla',  provincia: 'Sevilla',  cp: '41001' },
  { ciudad: 'Málaga',   provincia: 'Málaga',   cp: '29001' },
  { ciudad: 'Córdoba',  provincia: 'Córdoba',  cp: '14001' },
  { ciudad: 'Granada',  provincia: 'Granada',  cp: '18001' },
  { ciudad: 'Almería',  provincia: 'Almería',  cp: '04001' },
  { ciudad: 'Huelva',   provincia: 'Huelva',   cp: '21001' },
  { ciudad: 'Jaén',     provincia: 'Jaén',     cp: '23001' },
  { ciudad: 'Cádiz',    provincia: 'Cádiz',    cp: '11001' },
];

// Lista amplia de ciudades españolas con provincia y CP principal
const CIUDADES = [
  // Andalucía
  { ciudad: 'Sevilla',                      provincia: 'Sevilla',                    cp: '41001' },
  { ciudad: 'Málaga',                       provincia: 'Málaga',                     cp: '29001' },
  { ciudad: 'Córdoba',                      provincia: 'Córdoba',                    cp: '14001' },
  { ciudad: 'Granada',                      provincia: 'Granada',                    cp: '18001' },
  { ciudad: 'Almería',                      provincia: 'Almería',                    cp: '04001' },
  { ciudad: 'Huelva',                       provincia: 'Huelva',                     cp: '21001' },
  { ciudad: 'Jaén',                         provincia: 'Jaén',                       cp: '23001' },
  { ciudad: 'Cádiz',                        provincia: 'Cádiz',                      cp: '11001' },
  { ciudad: 'Jerez de la Frontera',         provincia: 'Cádiz',                      cp: '11401' },
  { ciudad: 'Algeciras',                    provincia: 'Cádiz',                      cp: '11201' },
  { ciudad: 'San Fernando',                 provincia: 'Cádiz',                      cp: '11100' },
  { ciudad: 'El Puerto de Santa María',     provincia: 'Cádiz',                      cp: '11500' },
  { ciudad: 'Chiclana de la Frontera',      provincia: 'Cádiz',                      cp: '11130' },
  { ciudad: 'La Línea de la Concepción',    provincia: 'Cádiz',                      cp: '11300' },
  { ciudad: 'Marbella',                     provincia: 'Málaga',                     cp: '29600' },
  { ciudad: 'Torremolinos',                 provincia: 'Málaga',                     cp: '29620' },
  { ciudad: 'Fuengirola',                   provincia: 'Málaga',                     cp: '29640' },
  { ciudad: 'Mijas',                        provincia: 'Málaga',                     cp: '29650' },
  { ciudad: 'Estepona',                     provincia: 'Málaga',                     cp: '29680' },
  { ciudad: 'Vélez-Málaga',                 provincia: 'Málaga',                     cp: '29700' },
  { ciudad: 'Benalmádena',                  provincia: 'Málaga',                     cp: '29630' },
  { ciudad: 'Ronda',                        provincia: 'Málaga',                     cp: '29400' },
  { ciudad: 'Antequera',                    provincia: 'Málaga',                     cp: '29200' },
  { ciudad: 'Motril',                       provincia: 'Granada',                    cp: '18600' },
  { ciudad: 'Loja',                         provincia: 'Granada',                    cp: '18300' },
  { ciudad: 'Lucena',                       provincia: 'Córdoba',                    cp: '14900' },
  { ciudad: 'Linares',                      provincia: 'Jaén',                       cp: '23700' },
  { ciudad: 'Andújar',                      provincia: 'Jaén',                       cp: '23740' },
  { ciudad: 'Úbeda',                        provincia: 'Jaén',                       cp: '23400' },
  { ciudad: 'Baeza',                        provincia: 'Jaén',                       cp: '23440' },
  { ciudad: 'Dos Hermanas',                 provincia: 'Sevilla',                    cp: '41700' },
  { ciudad: 'Alcalá de Guadaíra',           provincia: 'Sevilla',                    cp: '41500' },
  { ciudad: 'Écija',                        provincia: 'Sevilla',                    cp: '41400' },
  { ciudad: 'Utrera',                       provincia: 'Sevilla',                    cp: '41710' },
  { ciudad: 'Mairena del Aljarafe',         provincia: 'Sevilla',                    cp: '41927' },
  { ciudad: 'Roquetas de Mar',              provincia: 'Almería',                    cp: '04740' },
  { ciudad: 'El Ejido',                     provincia: 'Almería',                    cp: '04700' },
  // Madrid y alrededores
  { ciudad: 'Madrid',                       provincia: 'Madrid',                     cp: '28001' },
  { ciudad: 'Móstoles',                     provincia: 'Madrid',                     cp: '28931' },
  { ciudad: 'Alcalá de Henares',            provincia: 'Madrid',                     cp: '28801' },
  { ciudad: 'Fuenlabrada',                  provincia: 'Madrid',                     cp: '28944' },
  { ciudad: 'Leganés',                      provincia: 'Madrid',                     cp: '28911' },
  { ciudad: 'Getafe',                       provincia: 'Madrid',                     cp: '28901' },
  { ciudad: 'Alcorcón',                     provincia: 'Madrid',                     cp: '28921' },
  { ciudad: 'Torrejón de Ardoz',            provincia: 'Madrid',                     cp: '28850' },
  { ciudad: 'Parla',                        provincia: 'Madrid',                     cp: '28981' },
  { ciudad: 'Alcobendas',                   provincia: 'Madrid',                     cp: '28100' },
  { ciudad: 'Pozuelo de Alarcón',           provincia: 'Madrid',                     cp: '28223' },
  // Cataluña
  { ciudad: 'Barcelona',                    provincia: 'Barcelona',                  cp: '08001' },
  { ciudad: 'L\'Hospitalet de Llobregat',   provincia: 'Barcelona',                  cp: '08901' },
  { ciudad: 'Badalona',                     provincia: 'Barcelona',                  cp: '08911' },
  { ciudad: 'Terrassa',                     provincia: 'Barcelona',                  cp: '08221' },
  { ciudad: 'Sabadell',                     provincia: 'Barcelona',                  cp: '08201' },
  { ciudad: 'Mataró',                       provincia: 'Barcelona',                  cp: '08301' },
  { ciudad: 'Santa Coloma de Gramenet',     provincia: 'Barcelona',                  cp: '08921' },
  { ciudad: 'Cornellà de Llobregat',        provincia: 'Barcelona',                  cp: '08940' },
  { ciudad: 'Girona',                       provincia: 'Girona',                     cp: '17001' },
  { ciudad: 'Lleida',                       provincia: 'Lleida',                     cp: '25001' },
  { ciudad: 'Tarragona',                    provincia: 'Tarragona',                  cp: '43001' },
  { ciudad: 'Reus',                         provincia: 'Tarragona',                  cp: '43201' },
  // Valencia
  { ciudad: 'Valencia',                     provincia: 'Valencia',                   cp: '46001' },
  { ciudad: 'Alicante',                     provincia: 'Alicante',                   cp: '03001' },
  { ciudad: 'Elche',                        provincia: 'Alicante',                   cp: '03201' },
  { ciudad: 'Torrent',                      provincia: 'Valencia',                   cp: '46900' },
  { ciudad: 'Gandía',                       provincia: 'Valencia',                   cp: '46700' },
  { ciudad: 'Castellón de la Plana',        provincia: 'Castellón',                  cp: '12001' },
  { ciudad: 'Benidorm',                     provincia: 'Alicante',                   cp: '03501' },
  // País Vasco
  { ciudad: 'Bilbao',                       provincia: 'Vizcaya',                    cp: '48001' },
  { ciudad: 'Vitoria-Gasteiz',              provincia: 'Álava',                      cp: '01001' },
  { ciudad: 'San Sebastián',                provincia: 'Guipúzcoa',                  cp: '20001' },
  { ciudad: 'Barakaldo',                    provincia: 'Vizcaya',                    cp: '48901' },
  // Galicia
  { ciudad: 'A Coruña',                     provincia: 'A Coruña',                   cp: '15001' },
  { ciudad: 'Vigo',                         provincia: 'Pontevedra',                 cp: '36201' },
  { ciudad: 'Ourense',                      provincia: 'Ourense',                    cp: '32001' },
  { ciudad: 'Lugo',                         provincia: 'Lugo',                       cp: '27001' },
  { ciudad: 'Pontevedra',                   provincia: 'Pontevedra',                 cp: '36001' },
  { ciudad: 'Santiago de Compostela',       provincia: 'A Coruña',                   cp: '15701' },
  // Asturias / Cantabria
  { ciudad: 'Gijón',                        provincia: 'Asturias',                   cp: '33201' },
  { ciudad: 'Oviedo',                       provincia: 'Asturias',                   cp: '33001' },
  { ciudad: 'Santander',                    provincia: 'Cantabria',                  cp: '39001' },
  // Aragón
  { ciudad: 'Zaragoza',                     provincia: 'Zaragoza',                   cp: '50001' },
  { ciudad: 'Huesca',                       provincia: 'Huesca',                     cp: '22001' },
  { ciudad: 'Teruel',                       provincia: 'Teruel',                     cp: '44001' },
  // Castilla y León
  { ciudad: 'Valladolid',                   provincia: 'Valladolid',                 cp: '47001' },
  { ciudad: 'Burgos',                       provincia: 'Burgos',                     cp: '09001' },
  { ciudad: 'Salamanca',                    provincia: 'Salamanca',                  cp: '37001' },
  { ciudad: 'León',                         provincia: 'León',                       cp: '24001' },
  { ciudad: 'Palencia',                     provincia: 'Palencia',                   cp: '34001' },
  { ciudad: 'Segovia',                      provincia: 'Segovia',                    cp: '40001' },
  { ciudad: 'Soria',                        provincia: 'Soria',                      cp: '42001' },
  { ciudad: 'Ávila',                        provincia: 'Ávila',                      cp: '05001' },
  { ciudad: 'Zamora',                       provincia: 'Zamora',                     cp: '49001' },
  // Castilla-La Mancha
  { ciudad: 'Toledo',                       provincia: 'Toledo',                     cp: '45001' },
  { ciudad: 'Albacete',                     provincia: 'Albacete',                   cp: '02001' },
  { ciudad: 'Ciudad Real',                  provincia: 'Ciudad Real',                cp: '13001' },
  { ciudad: 'Cuenca',                       provincia: 'Cuenca',                     cp: '16001' },
  { ciudad: 'Guadalajara',                  provincia: 'Guadalajara',                cp: '19001' },
  // Extremadura
  { ciudad: 'Badajoz',                      provincia: 'Badajoz',                    cp: '06001' },
  { ciudad: 'Cáceres',                      provincia: 'Cáceres',                    cp: '10001' },
  { ciudad: 'Mérida',                       provincia: 'Badajoz',                    cp: '06800' },
  // Navarra / La Rioja
  { ciudad: 'Pamplona',                     provincia: 'Navarra',                    cp: '31001' },
  { ciudad: 'Logroño',                      provincia: 'La Rioja',                   cp: '26001' },
  // Murcia
  { ciudad: 'Murcia',                       provincia: 'Murcia',                     cp: '30001' },
  { ciudad: 'Cartagena',                    provincia: 'Murcia',                     cp: '30201' },
  // Baleares / Canarias
  { ciudad: 'Palma',                        provincia: 'Baleares',                   cp: '07001' },
  { ciudad: 'Las Palmas de Gran Canaria',   provincia: 'Las Palmas',                 cp: '35001' },
  { ciudad: 'Santa Cruz de Tenerife',       provincia: 'Santa Cruz de Tenerife',     cp: '38001' },
  { ciudad: 'La Laguna',                    provincia: 'Santa Cruz de Tenerife',     cp: '38201' },
  // Ceuta / Melilla
  { ciudad: 'Ceuta',                        provincia: 'Ceuta',                      cp: '51001' },
  { ciudad: 'Melilla',                      provincia: 'Melilla',                    cp: '52001' },
];

export default function CiudadInput({ value, onSelect, error }) {
  const [text, setText] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Sincronizar con valor externo (ej: llenado por CP)
  useEffect(() => { setText(value || ''); }, [value]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const suggestions = text.length >= 2
    ? CIUDADES
        .filter(c => c.ciudad.toLowerCase().startsWith(text.toLowerCase()))
        .concat(CIUDADES.filter(c =>
          !c.ciudad.toLowerCase().startsWith(text.toLowerCase()) &&
          c.ciudad.toLowerCase().includes(text.toLowerCase())
        ))
        .slice(0, 8)
    : [];

  const showFeatured = open && text.length < 2;
  const showSuggestions = open && suggestions.length > 0;
  const showDropdown = showFeatured || showSuggestions;

  const pick = (c) => {
    setText(c.ciudad);
    setOpen(false);
    onSelect(c.ciudad, c.provincia, c.cp);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    setOpen(true);
    // Propagar el texto sin sobreescribir provincia/cp
    onSelect(v, undefined, undefined);
  };

  const clear = () => {
    setText('');
    onSelect('', undefined, undefined);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Sevilla, Málaga..."
          className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${error ? 'border-red-400' : 'border-gray-200'}`}
        />
        {text && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); clear(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {showFeatured && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Ciudades destacadas · Andalucía
              </p>
              <div className="grid grid-cols-4 gap-px p-1 bg-gray-100">
                {ANDALUCIA.map(c => (
                  <button
                    key={c.ciudad}
                    type="button"
                    onMouseDown={() => pick(c)}
                    className="bg-white px-2 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-[#1B4F8A] rounded-lg flex items-center gap-1 transition-colors cursor-pointer font-medium"
                  >
                    <MapPin className="w-3 h-3 text-[#3ABDD5] flex-shrink-0" />
                    {c.ciudad}
                  </button>
                ))}
              </div>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                O escribe para buscar cualquier ciudad
              </p>
            </>
          )}
          {showSuggestions && suggestions.map(c => (
            <button
              key={c.ciudad}
              type="button"
              onMouseDown={() => pick(c)}
              className="w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span className="text-gray-800">{c.ciudad}</span>
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">{c.provincia} · {c.cp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
