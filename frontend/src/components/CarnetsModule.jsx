import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import jsPDF from 'jspdf';
import ConfirmDeleteModal from './common/ConfirmDeleteModal';

const TABS = [
  { valor: 'Estudiante', label: '🎓 Estudiantes', color: '#3b82f6' },
  { valor: 'Docente',    label: '👨‍🏫 Docentes',    color: '#22c55e' },
  { valor: 'Auxiliar',   label: '👷 Auxiliares',   color: '#ef4444' },
];

export default function CarnetsModule() {
  const [tipo, setTipo] = useState('Estudiante');
  const [fotochecks, setFotochecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const POR_PAGINA = 12;
  const carnetsRef = useRef({});

  useEffect(() => {
    setPagina(1);
    fetchFotochecks(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, tipo]);

  const fetchFotochecks = async (pag = pagina) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/fotochecks/lista`, {
        params: { busqueda, tipo, pagina: pag, por_pagina: POR_PAGINA }
      });
      setFotochecks(res.data.fotochecks);
      setTotal(res.data.total);
      setTotalPaginas(res.data.total_paginas);
      setPagina(res.data.pagina);
      setSeleccionados([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showMensaje = (text, type) => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 3000);
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === fotochecks.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(fotochecks.map(c => c.id));
    }
  };

  const imprimirSeleccionados = async () => {
    const aImprimir = fotochecks.filter(c => seleccionados.includes(c.id));
    if (aImprimir.length === 0) return;
    setImprimiendo(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const carnetW = 85.6;
      const carnetH = 54;
      const marginX = 10;
      const marginY = 10;
      const cols = 2;
      const gapX = 8;
      const gapY = 8;

      for (let i = 0; i < aImprimir.length; i++) {
        const col = i % cols;
        const row = Math.floor((i % (cols * 4)) / cols);
        if (i > 0 && i % (cols * 4) === 0) pdf.addPage();
        const x = marginX + col * (carnetW + gapX);
        const y = marginY + row * (carnetH + gapY);
        if (aImprimir[i].imagen_carnet) {
          pdf.addImage(aImprimir[i].imagen_carnet, 'PNG', x, y, carnetW, carnetH);
        }
      }
      pdf.save(`carnets_${tipo.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setImprimiendo(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await axios.delete(`${API_URL}/fotochecks/eliminar/${id}`);
      showMensaje('✔ Carnet eliminado.', 'success');
      setConfirmDelete(null);
      fetchFotochecks(pagina);
    } catch (e) {
      showMensaje('Error al eliminar.', 'error');
    }
  };

  const handlePagina = (nueva) => {
    if (nueva < 1 || nueva > totalPaginas) return;
    fetchFotochecks(nueva);
  };

  const colorActivo = TABS.find(t => t.valor === tipo)?.color || '#3b82f6';
  const nombrePersona = { Estudiante: 'estudiante', Docente: 'docente', Auxiliar: 'auxiliar' }[tipo];
  const nombreModulo = { Estudiante: 'Escolar', Docente: 'Docente', Auxiliar: 'Auxiliar' }[tipo];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🪪</span>
            <div>
              <h2 className="text-theme text-xl font-bold">Carnets</h2>
              <p className="text-muted text-sm">
                Carnets generados desde los módulos de Fotocheck
              </p>
            </div>
          </div>

          {/* Selector de pestañas */}
          <div className="flex bg-theme3 border border-theme rounded-xl p-1 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.valor}
                onClick={() => setTipo(t.valor)}
                style={tipo === t.valor ? { backgroundColor: t.color } : {}}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  tipo === t.valor ? 'text-white' : 'text-muted hover:text-theme'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
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
        <input
          type="text" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={`🔍 Buscar por nombre del ${nombrePersona}...`}
          className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none"
        />
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-muted text-sm">
          <span className="text-theme font-bold">{seleccionados.length}</span> seleccionados •{' '}
          <span className="text-theme font-bold">{total}</span> carnets de {nombrePersona}s
        </p>
        <div className="flex gap-3">
          <button
            onClick={seleccionarTodos}
            className="bg-theme3 hover:bg-theme border border-theme text-theme text-sm font-bold px-4 py-2 rounded-xl transition"
          >
            {seleccionados.length === fotochecks.length && fotochecks.length > 0
              ? '✗ Deseleccionar' : '✔ Seleccionar página'}
          </button>
          <button
            onClick={imprimirSeleccionados}
            disabled={seleccionados.length === 0 || imprimiendo}
            style={{ backgroundColor: colorActivo }}
            className="text-white text-sm font-bold px-4 py-2 rounded-xl transition disabled:opacity-50 hover:opacity-90"
          >
            {imprimiendo ? 'Generando PDF...' : `🖨 Imprimir (${seleccionados.length})`}
          </button>
        </div>
      </div>

      {/* Grid de carnets */}
      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Cargando carnets...</div>
      ) : fotochecks.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          <p className="text-4xl mb-3">🪪</p>
          <p>No hay carnets de {nombrePersona}s guardados aún.</p>
          <p className="text-xs mt-2">
            Genera carnets desde el módulo <strong>Generar Fotocheck {nombreModulo}</strong> y guárdalos aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          {fotochecks.map(c => (
            <div key={c.id} className="relative group">
              <input
                type="checkbox"
                checked={seleccionados.includes(c.id)}
                onChange={() => toggleSeleccion(c.id)}
                className="absolute top-2 left-2 z-10 w-4 h-4 cursor-pointer"
                style={{ accentColor: colorActivo }}
              />
              <button
                onClick={() => setConfirmDelete(c.id)}
                className="absolute top-2 right-2 z-10 bg-[#ef444420] hover:bg-[#ef444440] border border-[#ef4444] text-[#ef4444] text-xs font-bold w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
              >✕</button>
              <div
                ref={el => carnetsRef.current[c.id] = el}
                onClick={() => toggleSeleccion(c.id)}
                className="cursor-pointer transition rounded-xl overflow-hidden"
                style={{
                  boxShadow: seleccionados.includes(c.id) ? `0 0 0 2px ${colorActivo}` : 'none'
                }}
              >
                {c.imagen_carnet ? (
                  <img src={c.imagen_carnet} alt={c.nombre} className="w-full rounded-xl shadow-md" />
                ) : (
                  <div className="bg-theme3 border border-theme rounded-xl p-4 text-center">
                    <span className="text-3xl">🪪</span>
                  </div>
                )}
              </div>
              <p className="text-theme text-xs font-medium text-center mt-2 truncate px-1">{c.nombre}</p>
              <p className="text-muted text-xs text-center">
                {tipo === 'Estudiante' ? `${c.grado} • ${c.anio}` : `${tipo} • ${c.anio}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="bg-theme2 border border-theme rounded-2xl p-4 flex items-center justify-between">
          <p className="text-muted text-xs">
            Página <span className="text-theme font-bold">{pagina}</span> de{' '}
            <span className="text-theme font-bold">{totalPaginas}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePagina(1)}
              disabled={pagina === 1}
              className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
            >«</button>
            <button
              onClick={() => handlePagina(pagina - 1)}
              disabled={pagina === 1}
              className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
            >‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`dots-${p}`} className="text-muted px-1 py-2 text-xs">...</span>
                  )}
                  <button
                    key={p}
                    onClick={() => handlePagina(p)}
                    style={p === pagina ? { backgroundColor: colorActivo, borderColor: colorActivo } : {}}
                    className={`text-xs font-bold px-3 py-2 rounded-lg transition border ${
                      p === pagina ? 'text-white' : 'bg-theme3 hover:bg-theme border-theme text-theme'
                    }`}
                  >{p}</button>
                </>
              ))
            }
            <button
              onClick={() => handlePagina(pagina + 1)}
              disabled={pagina === totalPaginas}
              className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
            >›</button>
            <button
              onClick={() => handlePagina(totalPaginas)}
              disabled={pagina === totalPaginas}
              className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-40"
            >»</button>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmDelete && (
        <ConfirmDeleteModal
          titulo="¿Eliminar carnet?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleEliminar(confirmDelete)}
        />
      )}
    </div>
  );
}