import { useState, useEffect } from 'react';
import axios from 'axios';

export default function WeeklyReports() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [busquedaNombre, setBusquedaNombre] = useState('');

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReporte(); }, [fecha]);

  const registrosFiltrados = registros
    .filter(r => filtro === 'Todos' || r.tipo === filtro)
    .filter(r => r.nombre.toLowerCase().includes(busquedaNombre.toLowerCase()));

  const totalEstudiantes = registros.filter(r => r.tipo === 'Estudiante').length;
  const totalDocentes    = registros.filter(r => r.tipo === 'Docente').length;
  const totalAuxiliares  = registros.filter(r => r.tipo === 'Auxiliar').length;

  const tipoColor = (tipo) => {
    if (tipo === 'Estudiante') return 'bg-[#4f8ef720] text-[#4f8ef7]';
    if (tipo === 'Docente')    return 'bg-[#22c55e20] text-[#22c55e]';
    return 'bg-[#10b98120] text-[#10b981]';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">📋</span>
          <div>
            <h2 className="text-theme text-xl font-bold">Reporte de Asistencia</h2>
            <p className="text-muted text-sm">Consulta los registros de ingreso y salida</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Filtrar por</label>
            <select
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="Todos">Todos</option>
              <option value="Estudiante">Estudiantes</option>
              <option value="Docente">Docentes</option>
              <option value="Auxiliar">Auxiliares</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Buscar por nombre</label>
            <input
              type="text"
              value={busquedaNombre}
              onChange={e => setBusquedaNombre(e.target.value)}
              placeholder="🔍 Nombre..."
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div className="flex-shrink-0 mt-5">
            <button
              onClick={fetchReporte}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-6 py-3 rounded-xl transition text-sm"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total Ingresos', value: registros.length, color: '#4f8ef7' },
          { label: 'Estudiantes',    value: totalEstudiantes,  color: '#22c55e' },
          { label: 'Docentes',       value: totalDocentes,     color: '#f59e0b' },
          { label: 'Auxiliares',     value: totalAuxiliares,   color: '#10b981' },
        ].map(m => (
          <div key={m.label} className="bg-theme2 border border-theme rounded-2xl p-4 text-center">
            <p className="text-muted text-xs font-bold uppercase mb-1">{m.label}</p>
            <p className="font-bold text-3xl" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-theme2 border border-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme">
          <p className="text-theme font-bold text-sm">
            Registros del {new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">Cargando...</div>
        ) : error ? (
          <div className="text-center py-12 text-[#ef4444] text-sm">✗ {error}</div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">
            📭 No hay registros para esta fecha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Nombre</th>
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Tipo</th>
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Ingreso</th>
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Salida</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r, i) => (
                  <tr key={i} className="border-b border-theme hover:bg-theme3 transition">
                    <td className="px-6 py-4 text-theme font-medium">{r.nombre}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${tipoColor(r.tipo)}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted font-mono">{r.hora_ingreso || '—'}</td>
                    <td className="px-6 py-4 text-muted font-mono">{r.hora_salida || '—'}</td>
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