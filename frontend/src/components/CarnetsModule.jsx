import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CarnetsModule() {
  const [fotochecks, setFotochecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const carnetsRef = useRef({});

  useEffect(() => { fetchFotochecks(); }, [busqueda]);

  const fetchFotochecks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/fotochecks/lista', {
        params: { busqueda }
      });
      setFotochecks(res.data.fotochecks);
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
      pdf.save(`carnets_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setImprimiendo(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/fotochecks/eliminar/${id}`);
      showMensaje('✔ Carnet eliminado.', 'success');
      setConfirmDelete(null);
      fetchFotochecks();
    } catch (e) {
      showMensaje('Error al eliminar.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">🪪</span>
          <div>
            <h2 className="text-theme text-xl font-bold">Carnets</h2>
            <p className="text-muted text-sm">
              Carnets generados desde el módulo Generar Fotocheck Escolar
            </p>
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
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre del estudiante..."
          className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#3b82f6]"
        />
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-muted text-sm">
          <span className="text-theme font-bold">{seleccionados.length}</span> seleccionados de{' '}
          <span className="text-theme font-bold">{fotochecks.length}</span> carnets
        </p>
        <div className="flex gap-3">
          <button
            onClick={seleccionarTodos}
            className="bg-theme3 hover:bg-theme border border-theme text-theme text-sm font-bold px-4 py-2 rounded-xl transition"
          >
            {seleccionados.length === fotochecks.length && fotochecks.length > 0
              ? '✗ Deseleccionar Todos' : '✔ Seleccionar Todos'}
          </button>
          <button
            onClick={imprimirSeleccionados}
            disabled={seleccionados.length === 0 || imprimiendo}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
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
          <p>No hay carnets guardados aún.</p>
          <p className="text-xs mt-2">Genera carnets desde el módulo <strong>Generar Fotocheck Escolar</strong> y guárdalos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {fotochecks.map(c => (
            <div key={c.id} className="relative group">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={seleccionados.includes(c.id)}
                onChange={() => toggleSeleccion(c.id)}
                className="absolute top-2 left-2 z-10 w-4 h-4 accent-[#3b82f6] cursor-pointer"
              />

              {/* Botón eliminar */}
              <button
                onClick={() => setConfirmDelete(c.id)}
                className="absolute top-2 right-2 z-10 bg-[#ef444420] hover:bg-[#ef444440] border border-[#ef4444] text-[#ef4444] text-xs font-bold w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
              >✕</button>

              {/* Imagen del carnet */}
              <div
                ref={el => carnetsRef.current[c.id] = el}
                onClick={() => toggleSeleccion(c.id)}
                className={`cursor-pointer transition rounded-xl overflow-hidden ${
                  seleccionados.includes(c.id)
                    ? 'ring-2 ring-[#3b82f6] ring-offset-2'
                    : 'hover:ring-2 hover:ring-[#3b82f6] hover:ring-offset-1'
                }`}
              >
                {c.imagen_carnet ? (
                  <img
                    src={c.imagen_carnet}
                    alt={c.nombre}
                    className="w-full rounded-xl shadow-md"
                  />
                ) : (
                  <div className="bg-theme3 border border-theme rounded-xl p-4 text-center">
                    <span className="text-3xl">🪪</span>
                  </div>
                )}
              </div>

              {/* Nombre debajo */}
              <p className="text-theme text-xs font-medium text-center mt-2 truncate px-1">
                {c.nombre}
              </p>
              <p className="text-muted text-xs text-center">{c.grado} • {c.anio}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-theme2 border border-theme rounded-2xl p-6 max-w-sm w-full mx-4">
            <p className="text-theme font-bold text-lg mb-2">¿Eliminar carnet?</p>
            <p className="text-muted text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm"
              >Cancelar</button>
              <button
                onClick={() => handleEliminar(confirmDelete)}
                className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-3 rounded-xl transition text-sm"
              >Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}