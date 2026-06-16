import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function NoAccess() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Sin permisos</h2>
      <p className="text-gray-500 mb-6 max-w-xs">No tienes acceso a esta sección. Contacta con el administrador.</p>
      <Button onClick={() => navigate(-1)}>Volver</Button>
    </div>
  );
}
