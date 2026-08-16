import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import Paginacion from './common/Paginacion';

export default function WeeklyReports() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState({ estudiantes: 0, docentes: 0, auxiliares: 0, general: 0, personalAdmin: 0});
  const POR_PAGINA = 20;

  const fetchReporte = async (pag = pagina) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/reportes/asistencia`, {
        params: { fecha, tipo: filtro === 'Todos' ? null : filtro, pagina: pag, por_pagina: POR_PAGINA }
      });
      setRegistros(res.data.registros);
      setTotal(res.data.total);
      setTotalPaginas(res.data.total_paginas);
      setPagina(res.data.pagina);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTotales = async () => {
    try {
      const res = await axios.get(`${API_URL}/reportes/asistencia`, {
        params: { fecha, por_pagina: 9999, pagina: 1 }
      });
      const todos = res.data.registros;
      setTotales({
        general: res.data.total,
        estudiantes: todos.filter(r => r.tipo === 'Estudiante').length,
        docentes: todos.filter(r => r.tipo === 'Docente').length,
        auxiliares: todos.filter(r => r.tipo === 'Auxiliar').length,
        personalAdmin: todos.filter(r => r.tipo === 'Personal Administrativo').length,
      });
    } catch {}
  };

  useEffect(() => {
    setPagina(1);
    fetchReporte(1);
    fetchTotales();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, filtro]);

  const registrosFiltrados = registros.filter(r =>
    r.nombre.toLowerCase().includes(busquedaNombre.toLowerCase())
  );

  const tipoColor = (tipo) => {
    if (tipo === 'Estudiante') return 'bg-[#4f8ef720] text-[#4f8ef7]';
    if (tipo === 'Docente')    return 'bg-[#22c55e20] text-[#22c55e]';
    if (tipo === 'Personal Administrativo') return 'bg-[#f59e0b20] text-[#f59e0b]';
    return 'bg-[#10b98120] text-[#10b981]';
  };

  const handlePagina = (nueva) => {
    if (nueva < 1 || nueva > totalPaginas) return;
    fetchReporte(nueva);
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
              type="date" value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Filtrar por</label>
            <select value={filtro} onChange={e => setFiltro(e.target.value)}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            >
              <option value="Todos">Todos</option>
              <option value="Estudiante">Estudiantes</option>
              <option value="Docente">Docentes</option>
              <option value="Auxiliar">Auxiliares</option>
              <option value="Personal Administrativo">Personal Administrativo</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Buscar por nombre</label>
            <input
              type="text" value={busquedaNombre}
              onChange={e => setBusquedaNombre(e.target.value)}
              placeholder="🔍 Nombre..."
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div className="flex-shrink-0 mt-5">
            <button onClick={() => fetchReporte(1)}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-6 py-3 rounded-xl transition text-sm"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {[
          { label: 'Total Ingresos', value: totales.general,        color: '#4f8ef7' },
          { label: 'Estudiantes',    value: totales.estudiantes,     color: '#22c55e' },
          { label: 'Docentes',       value: totales.docentes,        color: '#f59e0b' },
          { label: 'Auxiliares',     value: totales.auxiliares,      color: '#10b981' },
          { label: 'Personal Admin.',value: totales.personalAdmin,   color: '#f43f5e' },
        ].map(m => (
          <div key={m.label} className="bg-theme2 border border-theme rounded-2xl p-4 text-center">
            <p className="text-muted text-xs font-bold uppercase mb-1">{m.label}</p>
            <p className="font-bold text-3xl" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-theme2 border border-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <p className="text-theme font-bold text-sm">
            Registros del {new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
          <p className="text-muted text-xs">{total} registros en total</p>
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

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="p-4 border-t border-theme flex items-center justify-between">
            <p className="text-muted text-xs">
              Página <span className="text-theme font-bold">{pagina}</span> de{' '}
              <span className="text-theme font-bold">{totalPaginas}</span>
            </p>
            <Paginacion
              pagina={pagina}
              totalPaginas={totalPaginas}
              onCambiarPagina={handlePagina}
              colorActivo="#f59e0b"
            />
          </div>
        )}
      </div>
    </div>
  );
}