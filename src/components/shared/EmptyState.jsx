import { Inbox } from 'lucide-react';
import Button from '../ui/Button';

export default function EmptyState({ icon: Icon = Inbox, title = 'Sin resultados', message = 'No hay elementos para mostrar.', action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">{message}</p>
      {action && <Button onClick={action}>{actionLabel}</Button>}
    </div>
  );
}
