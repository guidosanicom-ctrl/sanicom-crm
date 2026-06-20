import { useAuthStore } from '../../store/authStore';

/**
 * Muestra el avatar de un usuario: emoji si tiene avatar, inicial si no.
 * Props:
 *   user   — objeto usuario con { name, avatar, avatarBg }
 *   name   — alternativa: busca el usuario por nombre en el store
 *   size   — 'sm' (w-7), 'md' (w-9, default), 'lg' (w-11)
 *   className — clases extra
 */
export default function UserAvatar({ user, name, size = 'md', className = '' }) {
  const { users } = useAuthStore();

  const resolved = user || (name ? users.find(u => u.name === name) : null);

  const sizeMap = { sm: 'w-7 h-7 text-base', md: 'w-9 h-9 text-lg', lg: 'w-11 h-11 text-xl' };
  const ring = sizeMap[size] || sizeMap.md;

  const bg = resolved?.avatarBg || '#1B4F8A';
  const initial = (resolved?.name || name || '?').charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${ring} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {resolved?.avatar
        ? <span style={{ lineHeight: 1 }}>{resolved.avatar}</span>
        : <span className="text-white text-xs font-bold">{initial}</span>
      }
    </div>
  );
}
