export default function Paginacion({ pagina, totalPaginas, onCambiarPagina, colorActivo = '#4f8ef7' }) {
  if (totalPaginas <= 1) return null;

  const paginasVisibles = Array.from({ length: totalPaginas }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onCambiarPagina(1)}
        disabled={pagina === 1}
        className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
      >«</button>
      <button
        onClick={() => onCambiarPagina(pagina - 1)}
        disabled={pagina === 1}
        className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
      >‹</button>

      {paginasVisibles.map((p, idx, arr) => (
        <span key={p} className="flex items-center gap-2">
          {idx > 0 && arr[idx - 1] !== p - 1 && (
            <span className="text-muted px-1 text-xs">...</span>
          )}
          <button
            onClick={() => onCambiarPagina(p)}
            style={p === pagina ? { backgroundColor: colorActivo, borderColor: colorActivo } : {}}
            className={`text-xs font-bold px-3 py-2 rounded-lg transition border ${
              p === pagina ? 'text-white' : 'bg-theme3 hover:bg-theme border-theme text-theme'
            }`}
          >{p}</button>
        </span>
      ))}

      <button
        onClick={() => onCambiarPagina(pagina + 1)}
        disabled={pagina === totalPaginas}
        className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
      >›</button>
      <button
        onClick={() => onCambiarPagina(totalPaginas)}
        disabled={pagina === totalPaginas}
        className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
      >»</button>
    </div>
  );
}