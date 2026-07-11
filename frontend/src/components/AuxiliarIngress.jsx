import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AuxiliarIngress() {
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
      const res = await axios.post(`http://localhost:8000/auxiliares/${tipo}`, { codigo_barras: codigo });
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
    success: 'bg-[#10b98120] border-[#10b981] text-[#10b981]',
    warning: 'bg-[#f59e0b20] border-[#f59e0b] text-[#f59e0b]',
    danger:  'bg-[#ef444420] border-[#ef4444] text-[#ef4444]',
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">👷</span>
          <div>
            <h2 className="text-theme text-xl font-bold">Asistencia de Auxiliares</h2>
            <p className="text-muted text-sm">Ingreso y salida mediante código de barras</p>
          </div>
        </div>
      </div>

      {/* Panel principal */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6">
        <p className="text-muted text-sm text-center mb-4">{clock}</p>
        <div className="border-t border-theme mb-6" />

        <div className="text-center mb-4">
          <span className="text-5xl text-[#10b981]">▤</span>
          <p className="text-muted text-sm mt-2">Escanee o ingrese el código de barras</p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAction('ingreso')}
          placeholder="Código de barras..."
          className="w-full bg-theme3 border border-[#10b981] text-theme rounded-xl px-4 py-3 text-sm font-mono focus:outline-none mb-6"
        />

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleAction('ingreso')}
            className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white font-bold py-3 rounded-xl transition text-sm"
          >
            ▶ Registrar Ingreso
          </button>
          <button
            onClick={() => handleAction('salida')}
            className="flex-1 bg-theme3 hover:bg-theme border border-theme text-theme font-bold py-3 rounded-xl transition text-sm"
          >
            ◀ Registrar Salida
          </button>
        </div>

        <div className="border-t border-theme pt-4">
          <p className="text-muted text-xs font-bold uppercase mb-2">Último registro</p>
          <div className={`border rounded-xl px-4 py-3 text-sm font-medium ${
            status ? statusColors[status.color] : 'bg-theme3 border-theme text-muted'
          }`}>
            {status ? status.msg : 'Sin registros aún'}
          </div>
        </div>
      </div>
    </div>
  );
}