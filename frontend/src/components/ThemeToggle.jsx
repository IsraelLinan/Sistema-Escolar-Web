export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${
        isDark ? 'bg-[#8b5cf6]' : 'bg-[#f59e0b]'
      }`}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {/* Círculo deslizante */}
      <span className={`absolute w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-sm ${
        isDark ? 'translate-x-7 bg-[#1a1d27]' : 'translate-x-1 bg-white'
      }`}>
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}