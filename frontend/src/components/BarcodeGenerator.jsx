import { useState } from 'react';
import axios from 'axios';

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
      const res = await axios.post('http://localhost:8000/codigos/generar', {
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
          <p>${resultado.tipo}</p>
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
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🏷️</span>
          <div>
            <h2 className="text-[#e2e8f0] text-xl font-bold">Generador de Códigos de Barra</h2>
            <p className="text-[#94a3b8] text-sm">Registre y genere identificadores para el personal</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 mb-4">
        {/* Nombre */}
        <label className="block text-[#94a3b8] text-xs font-bold uppercase mb-2">
          Apellidos y Nombres
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerar()}
          placeholder="Ej: García López, Juan Carlos"
          className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#a855f7] mb-4"
        />

        {/* Tipo */}
        <label className="block text-[#94a3b8] text-xs font-bold uppercase mb-3">
          Tipo de Persona
        </label>
        <div className="flex gap-6 mb-6">
          {['Estudiante', 'Docente'].map(t => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
                className="accent-[#a855f7] w-4 h-4"
              />
              <span className="text-[#e2e8f0] text-sm">{t}</span>
            </label>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-[#ef444420] border border-[#ef4444] text-[#ef4444] rounded-xl px-4 py-2 text-sm">
            ✗ {error}
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={handleGenerar}
          disabled={loading}
          className="w-full bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm"
        >
          {loading ? 'Generando...' : '⊕ Generar y Registrar Código'}
        </button>
      </div>

      {/* Vista previa */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6">
        <p className="text-[#94a3b8] text-xs font-bold uppercase mb-4">Vista previa del código</p>
        <div className="border-t border-[#2e3350] mb-4" />

        {resultado ? (
          <div className="text-center">
            <p className="text-[#e2e8f0] font-bold mb-1">{resultado.nombre}</p>
            <p className="text-[#94a3b8] text-xs mb-4">{resultado.tipo_persona}</p>
            <img
              src={resultado.imagen}
              alt="Código de barras"
              className="mx-auto max-w-xs rounded-lg mb-4 bg-white p-2"
            />
            <p className="text-[#94a3b8] text-xs font-mono mb-4">{resultado.codigo}</p>
            <button
              onClick={handleImprimir}
              className="w-full bg-[#22263a] hover:bg-[#2e3350] border border-[#2e3350] text-[#e2e8f0] font-bold py-3 rounded-xl transition text-sm"
            >
              🖨 Imprimir Código
            </button>
          </div>
        ) : (
          <p className="text-[#94a3b8] text-sm text-center py-8">
            El código generado aparecerá aquí
          </p>
        )}
      </div>
    </div>
  );
}