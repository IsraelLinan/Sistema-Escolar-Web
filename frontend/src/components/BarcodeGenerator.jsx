import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function BarcodeGenerator() {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Estudiante');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerar = async () => {
    if (!nombre.trim()) {
      setError('Ingrese un nombre completo.');
      return;
    }
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await axios.post(`${API_URL}/codigos/generar`, {
        nombre: nombre.trim(),
        tipo_persona: tipo
      });
      setResultado(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al generar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    if (!resultado) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head><title>Código de Barra - ${resultado.nombre}</title></head>
        <body style="text-align:center; padding:40px; font-family:sans-serif;">
          <h2>${resultado.nombre}</h2>
          <img src="${resultado.imagen}" style="max-width:400px;" />
          <p style="font-size:12px; color:#666;">${resultado.codigo}</p>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🏷️</span>
          <div>
            <h2 className="text-theme text-xl font-bold">Generador de Códigos de Barra</h2>
            <p className="text-muted text-sm">Registre y genere identificadores para el personal</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <label className="block text-muted text-xs font-bold uppercase mb-2">
          Apellidos y Nombres
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerar()}
          placeholder="Ej: García López Juan Carlos"
          className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#a855f7] mb-4"
        />

        <label className="block text-muted text-xs font-bold uppercase mb-3">
          Tipo de Persona
        </label>
        <div className="flex gap-6 mb-6 flex-wrap">
          {['Estudiante', 'Docente', 'Auxiliar', 'Personal Administrativo'].map(t => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="accent-[#a855f7] w-4 h-4"
              />
              <span className="text-theme text-sm">{t}</span>
            </label>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-[#ef444420] border border-[#ef4444] text-[#ef4444] rounded-xl px-4 py-2 text-sm">
            ✗ {error}
          </div>
        )}

        <button
          onClick={handleGenerar}
          disabled={loading}
          className="w-full bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm"
        >
          {loading ? 'Procesando...' : '⊕ Generar y Registrar Código'}
        </button>
      </div>

      {/* Vista previa */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6">
        <p className="text-muted text-xs font-bold uppercase mb-4">Vista previa del código</p>
        <div className="border-t border-theme mb-4" />

        {resultado ? (
          <div className="text-center">
            {/* Aviso duplicado o nuevo */}
            {resultado.duplicado ? (
              <div className="mb-4 bg-[#f59e0b20] border border-[#f59e0b] text-[#f59e0b] rounded-xl px-4 py-3 text-sm">
                ⚠️ {resultado.mensaje}
              </div>
            ) : (
              <div className="mb-4 bg-[#22c55e20] border border-[#22c55e] text-[#22c55e] rounded-xl px-4 py-3 text-sm">
                ✔ {resultado.mensaje}
              </div>
            )}

            <p className="text-theme font-bold mb-1">{resultado.nombre}</p>
            <img
              src={resultado.imagen}
              alt="Código de barras"
              className="mx-auto max-w-xs rounded-lg mb-4 bg-white p-2"
            />
            <p className="text-muted text-xs font-mono mb-4">{resultado.codigo}</p>
            <button
              onClick={handleImprimir}
              className="w-full bg-theme3 hover:bg-theme border border-theme text-theme font-bold py-3 rounded-xl transition text-sm"
            >
              🖨 Imprimir Código
            </button>
          </div>
        ) : (
          <p className="text-muted text-sm text-center py-8">
            El código generado aparecerá aquí
          </p>
        )}
      </div>
    </div>
  );
}