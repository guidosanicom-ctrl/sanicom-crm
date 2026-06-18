export default function Card({ children, className = '', padding = true, ...rest }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padding ? 'p-6' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
