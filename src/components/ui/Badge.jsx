export default function Badge({ children, color = 'gray', size = 'sm' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    black: 'bg-gray-800 text-white',
    primary: 'bg-blue-900 text-white',
  };
  const sizes = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-1' };
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colors[color] || colors.gray} ${sizes[size] || sizes.sm}`}>
      {children}
    </span>
  );
}
