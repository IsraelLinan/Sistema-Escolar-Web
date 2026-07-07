import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CuadroNotas() {
  const [materias, setMaterias] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [grados, setGrados] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState('');
  const [gradoSeleccionado, setGradoSeleccionado] = useState('');
  const [seccionSeleccionada, setSeccionSeleccionada] = useState('');
  const [anio, setAnio] = useState('2026');
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(null);
  const [notaTemp, setNotaTemp] = useState('');
  const [bimestreEditando, setBimestreEditando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [showMaterias, setShowMaterias] = useState(false);
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [estudianteDetalle, setEstudianteDetalle] = useState(null);
  const [notasDetalle, setNotasDetalle] = useState([]);

  useEffect(() => { fetchMaterias(); }, []);
  useEffect(() => {
    if (materiaSeleccionada) fetchCuadro();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaSeleccionada, anio, gradoSeleccionado, seccionSeleccionada]);

  const fetchMaterias = async () => {
    try {
      const res = await axios.get('http://localhost:8000/notas/materias');
      setMaterias(res.data.materias);
      if (res.data.materias.length > 0 && !materiaSeleccionada) {
        setMateriaSeleccionada(res.data.materias[0].id.toString());
      }
    } catch (e) { console.error(e); }
  };

  const fetchCuadro = async () => {
    setLoading(true);
    try {
      const params = { anio, materia_id: materiaSeleccionada };
      if (gradoSeleccionado) params.grado = gradoSeleccionado;
      if (seccionSeleccionada) params.seccion = seccionSeleccionada;
      const res = await axios.get('http://localhost:8000/notas/cuadro', { params });
      setEstudiantes(res.data.estudiantes);
      setGrados(res.data.grados || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchNotasEstudiante = async (est) => {
    try {
      const res = await axios.get(`http://localhost:8000/notas/estudiante/${est.id}`, {
        params: { anio }
      });
      setNotasDetalle(res.data.notas);
      setEstudianteDetalle(est);
    } catch (e) { console.error(e); }
  };

  const showMensajeF = (text, type) => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleGuardarNota = async (estudianteId, bimestre) => {
    const nota = parseFloat(notaTemp);
    if (isNaN(nota) || nota < 0 || nota > 20) {
      showMensajeF('La nota debe ser entre 0 y 20.', 'error');
      return;
    }
    try {
      await axios.post('http://localhost:8000/notas/guardar', {
        estudiante_id: estudianteId,
        materia_id: parseInt(materiaSeleccionada),
        anio, bimestre, nota, observacion: ''
      });
      showMensajeF('✔ Nota guardada.', 'success');
      setEditando(null);
      setBimestreEditando(null);
      setNotaTemp('');
      fetchCuadro();
    } catch (e) {
      showMensajeF('Error al guardar la nota.', 'error');
    }
  };

  const handleCrearMateria = async () => {
    if (!nuevaMateria.trim()) return;
    try {
      await axios.post('http://localhost:8000/notas/materias/crear', {
        nombre: nuevaMateria.trim(), grado: 'General'
      });
      showMensajeF('✔ Materia creada.', 'success');
      setNuevaMateria('');
      fetchMaterias();
    } catch (e) {
      showMensajeF('Error al crear materia.', 'error');
    }
  };

  const handleEliminarMateria = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/notas/materias/eliminar/${id}`);
      showMensajeF('✔ Materia eliminada.', 'success');
      fetchMaterias();
      if (materiaSeleccionada === id.toString()) setMateriaSeleccionada('');
    } catch (e) {
      showMensajeF('Error al eliminar materia.', 'error');
    }
  };

  const colorNota = (nota) => {
    if (nota === null || nota === undefined) return 'text-muted';
    if (nota >= 14) return 'text-[#22c55e]';
    if (nota >= 11) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const badgeNota = (nota) => {
    if (nota === null || nota === undefined) return '';
    if (nota >= 14) return 'bg-[#22c55e20] border-[#22c55e] text-[#22c55e]';
    if (nota >= 11) return 'bg-[#f59e0b20] border-[#f59e0b] text-[#f59e0b]';
    return 'bg-[#ef444420] border-[#ef4444] text-[#ef4444]';
  };

  // Secciones disponibles según grado seleccionado
  const seccionesDisponibles = [...new Set(
    grados.filter(g => !gradoSeleccionado || g.grado === gradoSeleccionado)
          .map(g => g.seccion).filter(Boolean)
  )];

  const gradosDisponibles = [...new Set(grados.map(g => g.grado).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">📊</span>
            <div>
              <h2 className="text-theme text-xl font-bold">Cuadro de Notas</h2>
              <p className="text-muted text-sm">Registro de notas por materia y bimestre</p>
            </div>
          </div>
          <button onClick={() => setShowMaterias(true)}
            className="bg-theme3 hover:bg-theme border border-theme text-theme font-bold px-4 py-2 rounded-xl transition text-sm">
            ⚙ Gestionar Materias
          </button>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`mb-4 border rounded-xl px-4 py-3 text-sm font-medium ${
          mensaje.type === 'success'
            ? 'bg-[#22c55e20] border-[#22c55e] text-[#22c55e]'
            : 'bg-[#ef444420] border-[#ef4444] text-[#ef4444]'
        }`}>{mensaje.text}</div>
      )}

      {/* Filtros */}
      <div className="bg-theme2 border border-theme rounded-2xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Materia */}
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Materia</label>
            <select value={materiaSeleccionada}
              onChange={e => setMateriaSeleccionada(e.target.value)}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ec4899]"
            >
              <option value="">Seleccionar materia</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Grado */}
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Grado</label>
            <select value={gradoSeleccionado}
              onChange={e => { setGradoSeleccionado(e.target.value); setSeccionSeleccionada(''); }}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ec4899]"
            >
              <option value="">Todos los grados</option>
              {gradosDisponibles.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Sección */}
          <div className="flex-1">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Sección</label>
            <select value={seccionSeleccionada}
              onChange={e => setSeccionSeleccionada(e.target.value)}
              disabled={!gradoSeleccionado}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ec4899] disabled:opacity-50"
            >
              <option value="">Todas las secciones</option>
              {seccionesDisponibles.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div className="w-28">
            <label className="block text-muted text-xs font-bold uppercase mb-2">Año</label>
            <input type="text" value={anio}
              onChange={e => setAnio(e.target.value)}
              className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ec4899]"
            />
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {[
          { label: 'Excelente (14-20)', color: 'bg-[#22c55e20] border-[#22c55e] text-[#22c55e]' },
          { label: 'Regular (11-13)',   color: 'bg-[#f59e0b20] border-[#f59e0b] text-[#f59e0b]' },
          { label: 'Desaprobado (0-10)',color: 'bg-[#ef444420] border-[#ef4444] text-[#ef4444]' },
        ].map(l => (
          <span key={l.label} className={`border rounded-full px-3 py-1 text-xs font-bold ${l.color}`}>
            {l.label}
          </span>
        ))}
      </div>

      {/* Tabla */}
      {!materiaSeleccionada ? (
        <div className="bg-theme2 border border-theme rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-muted text-sm">Selecciona una materia para ver el cuadro de notas</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-muted text-sm">Cargando...</div>
      ) : (
        <div className="bg-theme2 border border-theme rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-theme flex items-center justify-between">
            <p className="text-theme font-bold text-sm">
              {materias.find(m => m.id.toString() === materiaSeleccionada)?.nombre}
              {gradoSeleccionado && ` — ${gradoSeleccionado}`}
              {seccionSeleccionada && ` "${seccionSeleccionada}"`}
              {` — ${anio}`}
            </p>
            <p className="text-muted text-xs">{estudiantes.length} estudiantes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Estudiante</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Grado</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Sección</th>
                  {['B1','B2','B3','B4'].map(b => (
                    <th key={b} className="text-center px-4 py-3 text-muted text-xs font-bold uppercase">{b}</th>
                  ))}
                  <th className="text-center px-4 py-3 text-muted text-xs font-bold uppercase">Promedio</th>
                  <th className="text-center px-4 py-3 text-muted text-xs font-bold uppercase">Estado</th>
                  <th className="text-center px-4 py-3 text-muted text-xs font-bold uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {estudiantes.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-muted text-sm">
                      📭 No hay estudiantes con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  estudiantes.map(est => (
                    <tr key={est.id} className="border-b border-theme hover:bg-theme3 transition">
                      <td className="px-6 py-4 text-theme font-medium">{est.nombre}</td>
                      <td className="px-4 py-4 text-muted text-xs">{est.grado || '—'}</td>
                      <td className="px-4 py-4 text-muted text-xs">{est.seccion || '—'}</td>
                      {[1,2,3,4].map(b => {
                        const nota = est[`b${b}`];
                        const isEditando = editando === est.id && bimestreEditando === b;
                        return (
                          <td key={b} className="px-4 py-4 text-center">
                            {isEditando ? (
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number" min="0" max="20" step="0.5"
                                  value={notaTemp}
                                  onChange={e => setNotaTemp(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleGuardarNota(est.id, b);
                                    if (e.key === 'Escape') { setEditando(null); setBimestreEditando(null); }
                                  }}
                                  autoFocus
                                  className="w-16 bg-theme3 border border-[#ec4899] text-theme rounded-lg px-2 py-1 text-xs text-center focus:outline-none"
                                />
                                <button onClick={() => handleGuardarNota(est.id, b)}
                                  className="text-[#22c55e] hover:bg-[#22c55e20] p-1 rounded-lg transition text-xs">✔</button>
                                <button onClick={() => { setEditando(null); setBimestreEditando(null); }}
                                  className="text-[#ef4444] hover:bg-[#ef444420] p-1 rounded-lg transition text-xs">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditando(est.id);
                                  setBimestreEditando(b);
                                  setNotaTemp(nota !== null && nota !== undefined ? nota.toString() : '');
                                }}
                                className={`w-12 h-8 rounded-lg border font-bold text-sm transition hover:opacity-80 ${
                                  nota !== null && nota !== undefined
                                    ? badgeNota(nota)
                                    : 'bg-theme3 border-theme text-muted'
                                }`}
                              >
                                {nota !== null && nota !== undefined ? nota : '—'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center">
                        <span className={`font-bold text-sm ${colorNota(est.promedio)}`}>
                          {est.promedio !== null ? est.promedio : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {est.promedio !== null ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeNota(est.promedio)}`}>
                            {est.promedio >= 11 ? '✔ Aprobado' : '✗ Desaprobado'}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">Sin notas</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => fetchNotasEstudiante(est)}
                          className="bg-[#ec489920] hover:bg-[#ec489940] border border-[#ec4899] text-[#ec4899] text-xs font-bold px-3 py-1.5 rounded-lg transition">
                          Ver todo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal gestionar materias */}
      {showMaterias && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="bg-theme2 border border-theme rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-theme font-bold text-lg">⚙ Gestionar Materias</h3>
              <button onClick={() => setShowMaterias(false)}
                className="text-muted hover:text-theme text-xl font-bold transition">✕</button>
            </div>
            <div className="bg-theme3 rounded-xl p-4 mb-4">
              <p className="text-muted text-xs font-bold uppercase mb-3">Nueva Materia</p>
              <div className="flex gap-2">
                <input type="text" value={nuevaMateria}
                  onChange={e => setNuevaMateria(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCrearMateria()}
                  placeholder="Nombre de la materia"
                  className="flex-1 bg-theme2 border border-theme text-theme rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ec4899]"
                />
                <button onClick={handleCrearMateria}
                  className="bg-[#ec4899] hover:bg-[#db2777] text-white font-bold px-4 py-2 rounded-xl transition text-sm">+</button>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {materias.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-theme3 border border-theme rounded-xl px-4 py-3">
                  <div>
                    <p className="text-theme text-sm font-medium">{m.nombre}</p>
                    <p className="text-muted text-xs">{m.grado}</p>
                  </div>
                  <button onClick={() => handleEliminarMateria(m.id)}
                    className="text-[#ef4444] hover:bg-[#ef444420] p-2 rounded-lg transition text-xs">🗑</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowMaterias(false)}
              className="w-full mt-4 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal detalle estudiante */}
      {estudianteDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="bg-theme2 border border-theme rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-theme font-bold text-lg">{estudianteDetalle.nombre}</h3>
                <p className="text-muted text-xs">
                  {estudianteDetalle.grado && `${estudianteDetalle.grado}`}
                  {estudianteDetalle.seccion && ` "${estudianteDetalle.seccion}"`}
                  {` — ${anio}`}
                </p>
              </div>
              <button onClick={() => setEstudianteDetalle(null)}
                className="text-muted hover:text-theme text-xl font-bold transition">✕</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="text-left px-4 py-2 text-muted text-xs font-bold uppercase">Materia</th>
                    <th className="text-center px-3 py-2 text-muted text-xs font-bold">B1</th>
                    <th className="text-center px-3 py-2 text-muted text-xs font-bold">B2</th>
                    <th className="text-center px-3 py-2 text-muted text-xs font-bold">B3</th>
                    <th className="text-center px-3 py-2 text-muted text-xs font-bold">B4</th>
                    <th className="text-center px-3 py-2 text-muted text-xs font-bold">Prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {notasDetalle.map(n => (
                    <tr key={n.materia_id} className="border-b border-theme hover:bg-theme3 transition">
                      <td className="px-4 py-3 text-theme font-medium">{n.materia}</td>
                      {[n.b1, n.b2, n.b3, n.b4].map((nota, i) => (
                        <td key={i} className="px-3 py-3 text-center">
                          <span className={`font-bold text-sm ${colorNota(nota)}`}>
                            {nota !== null && nota !== undefined ? nota : '—'}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center">
                        {n.promedio !== null ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badgeNota(n.promedio)}`}>
                            {n.promedio}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setEstudianteDetalle(null)}
              className="w-full mt-4 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}