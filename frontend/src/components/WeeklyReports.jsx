import { useState, useEffect } from 'react';
import axios from 'axios';

export default function WeeklyReports() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('Todos');

  const fetchReporte = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`http://localhost:8000/reportes/asistencia?fecha=${fecha}`);
      setRegistros(res.data.registros);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReporte(); }, [fecha]);

  const registrosFiltrados = filtro === 'Todos'
    ? registros
    : registros.filter(r => r.tipo === filtro);

  const totalEstudiantes = registros.filter(r => r.tipo === 'Estudiante').length;
  const totalDocentes = registros.filter(r => r.tipo === 'Docente').length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">📋</span>
          <div>
            <h2 className="text-[#e2e8f0] text-xl font-bold">Reporte de Asistencia</h2>
            <p className="text-[#94a3b8] text-sm">Consulta los registros de ingreso y salida</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Fecha */}
          <div className="flex-1">
            <label className="block text-[#94a3b8] text-xs font-bold uppercase mb-2">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            />
          </div>

          {/* Tipo */}
          <div className="flex-1">
            <label className="block text-[#94a3b8] text-xs font-bold uppercase mb-2">Filtrar por</label>
            <select
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="Todos">Todos</option>
              <option value="Estudiante">Estudiantes</option>
              <option value="Docente">Docentes</option>
            </select>
          </div>

          {/* Botón */}
          <div className="flex-shrink-0 mt-5">
            <button
              onClick={fetchReporte}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1117] font-bold px-6 py-3 rounded-xl transition text-sm"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Total Ingresos', value: registros.length, color: '#4f8ef7' },
          { label: 'Estudiantes',    value: totalEstudiantes,  color: '#22c55e' },
          { label: 'Docentes',       value: totalDocentes,     color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 text-center">
            <p className="text-[#94a3b8] text-xs font-bold uppercase mb-1">{m.label}</p>
            <p className="font-bold text-3xl" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2e3350]">
          <p className="text-[#e2e8f0] font-bold text-sm">
            Registros del {new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#94a3b8] text-sm">Cargando...</div>
        ) : error ? (
          <div className="text-center py-12 text-[#ef4444] text-sm">✗ {error}</div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-[#94a3b8] text-sm">
            📭 No hay registros para esta fecha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e3350]">
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Nombre</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Tipo</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Ingreso</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Salida</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r, i) => (
                  <tr key={i} className="border-b border-[#2e3350] hover:bg-[#22263a] transition">
                    <td className="px-6 py-4 text-[#e2e8f0] font-medium">{r.nombre}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        r.tipo === 'Estudiante'
                          ? 'bg-[#4f8ef720] text-[#4f8ef7]'
                          : 'bg-[#22c55e20] text-[#22c55e]'
                      }`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#94a3b8] font-mono">{r.hora_ingreso || '—'}</td>
                    <td className="px-6 py-4 text-[#94a3b8] font-mono">{r.hora_salida || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}