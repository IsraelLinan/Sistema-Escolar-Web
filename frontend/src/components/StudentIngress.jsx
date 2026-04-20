import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function StudentIngress() {
  const [codigo, setCodigo] = useState('');
  const [status, setStatus] = useState(null);
  const [clock, setClock] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (tipo) => {
    if (!codigo.trim()) {
      setStatus({ msg: 'Ingrese un código de barras.', color: 'warning' });
      return;
    }
    try {
      const res = await axios.post(`http://localhost:8000/estudiantes/${tipo}`, { codigo_barras: codigo });
      setStatus({
        msg: `${tipo === 'ingreso' ? '✔ Ingreso' : '◀ Salida'}: ${res.data.nombre} — ${res.data.hora}`,
        color: tipo === 'ingreso' ? 'success' : 'warning'
      });
    } catch (e) {
      setStatus({ msg: `✗ ${e.response?.data?.detail || 'Error'}`, color: 'danger' });
    }
    setCodigo('');
    inputRef.current?.focus();
  };

  const statusColors = {
    success: 'bg-[#22c55e20] border-[#22c55e] text-[#22c55e]',
    warning: 'bg-[#f59e0b20] border-[#f59e0b] text-[#f59e0b]',
    danger:  'bg-[#ef444420] border-[#ef4444] text-[#ef4444]',
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Encabezado */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🎓</span>
          <div>
            <h2 className="text-[#e2e8f0] text-xl font-bold">Registro de Estudiantes</h2>
            <p className="text-[#94a3b8] text-sm">Ingreso y salida mediante código de barras</p>
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6">
        {/* Reloj */}
        <p className="text-[#94a3b8] text-sm text-center mb-4">{clock}</p>
        <div className="border-t border-[#2e3350] mb-6" />

        {/* Scanner */}
        <div className="text-center mb-4">
          <span className="text-5xl text-[#4f8ef7]">▤</span>
          <p className="text-[#94a3b8] text-sm mt-2">Escanee o ingrese el código de barras</p>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAction('ingreso')}
          placeholder="Código de barras..."
          className="w-full bg-[#22263a] border border-[#4f8ef7] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#4f8ef7] mb-6"
        />

        {/* Botones */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleAction('ingreso')}
            className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae0] text-white font-bold py-3 rounded-xl transition text-sm"
          >
            ▶ Registrar Ingreso
          </button>
          <button
            onClick={() => handleAction('salida')}
            className="flex-1 bg-[#22263a] hover:bg-[#2e3350] border border-[#2e3350] text-[#e2e8f0] font-bold py-3 rounded-xl transition text-sm"
          >
            ◀ Registrar Salida
          </button>
        </div>

        {/* Status */}
        <div className="border-t border-[#2e3350] pt-4">
          <p className="text-[#94a3b8] text-xs font-bold uppercase mb-2">Último registro</p>
          <div className={`border rounded-xl px-4 py-3 text-sm font-medium ${status ? statusColors[status.color] : 'bg-[#22263a] border-[#2e3350] text-[#94a3b8]'}`}>
            {status ? status.msg : 'Sin registros aún'}
          </div>
        </div>
      </div>
    </div>
  );
}