export default function RefreshIndicator({ show }) {
  if (!show) return null;
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-gray-800/80 text-white text-[11px] font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm pointer-events-none select-none">
      <span className="w-2.5 h-2.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      Actualizando…
    </div>
  );
}
