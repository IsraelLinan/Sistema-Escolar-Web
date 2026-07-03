import { useState } from 'react';
import axios from 'axios';

export default function CambiarPassword({ onClose }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const handleCambiar = async () => {
    setError('');
    setExito('');

    if (!actual || !nueva || !confirmar) {
      setError('Complete todos los campos.');
      return;
    }
    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (actual === nueva) {
      setError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:8000/auth/cambiar-password', {
        password_actual: actual,
        password_nueva: nueva
      });
      setExito('✔ Contraseña actualizada correctamente.');
      setActual('');
      setNueva('');
      setConfirmar('');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-theme2 border border-theme rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <h2 className="text-theme font-bold text-lg">Cambiar Contraseña</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-theme transition text-xl font-bold"
          >✕</button>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-2">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={actual}
              onChange={e => setActual(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7]"
            />
          </div>
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-2">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={nueva}
              onChange={e => setNueva(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7]"
            />
            {nueva && (
              <div className="mt-1 flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition ${
                    nueva.length === 0 ? 'bg-theme3' :
                    nueva.length < 6 && i === 0 ? 'bg-[#ef4444]' :
                    nueva.length < 8 && i <= 1 ? 'bg-[#f59e0b]' :
                    nueva.length < 10 && i <= 2 ? 'bg-[#4f8ef7]' :
                    i <= 3 ? 'bg-[#22c55e]' : 'bg-theme3'
                  }`} />
                ))}
              </div>
            )}
            {nueva && (
              <p className="text-xs mt-1 text-muted">
                {nueva.length < 6 ? '🔴 Muy corta' :
                 nueva.length < 8 ? '🟡 Débil' :
                 nueva.length < 10 ? '🔵 Buena' : '🟢 Fuerte'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-muted text-xs font-bold uppercase mb-2">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCambiar()}
              placeholder="••••••••"
              className={`w-full bg-theme3 border text-theme rounded-xl px-4 py-3 text-sm focus:outline-none transition ${
                confirmar && nueva !== confirmar
                  ? 'border-[#ef4444]'
                  : confirmar && nueva === confirmar
                  ? 'border-[#22c55e]'
                  : 'border-theme focus:border-[#4f8ef7]'
              }`}
            />
            {confirmar && nueva !== confirmar && (
              <p className="text-[#ef4444] text-xs mt-1">✗ Las contraseñas no coinciden</p>
            )}
            {confirmar && nueva === confirmar && (
              <p className="text-[#22c55e] text-xs mt-1">✔ Las contraseñas coinciden</p>
            )}
          </div>
        </div>

        {/* Error / Éxito */}
        {error && (
          <div className="mt-4 bg-[#ef444420] border border-[#ef4444] text-[#ef4444] rounded-xl px-4 py-2 text-sm">
            ✗ {error}
          </div>
        )}
        {exito && (
          <div className="mt-4 bg-[#22c55e20] border border-[#22c55e] text-[#22c55e] rounded-xl px-4 py-2 text-sm">
            {exito}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleCambiar}
            disabled={loading}
            className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae0] text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : '🔐 Actualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}