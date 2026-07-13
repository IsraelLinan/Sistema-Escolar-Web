export default function ConfirmDeleteModal({ titulo, mensaje, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
      <div className="bg-theme2 border border-theme rounded-2xl p-6 max-w-sm w-full mx-4">
        <p className="text-theme font-bold text-lg mb-2">{titulo || '¿Eliminar registro?'}</p>
        <p className="text-muted text-sm mb-6">{mensaje || 'Esta acción no se puede deshacer.'}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-3 rounded-xl transition text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}