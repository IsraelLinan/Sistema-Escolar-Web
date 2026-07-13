import { useState, useEffect } from 'react';
import axios from 'axios';
import ConfirmDeleteModal from './common/ConfirmDeleteModal';
import { API_URL } from '../config';

const TIPOS = [
  { valor: 'general',    label: 'General',    color: '#4f8ef7' },
  { valor: 'examen',     label: 'Examen',     color: '#ef4444' },
  { valor: 'reunion',    label: 'Reunión',    color: '#f59e0b' },
  { valor: 'feriado',    label: 'Feriado',    color: '#22c55e' },
  { valor: 'actividad',  label: 'Actividad',  color: '#a855f7' },
  { valor: 'entrega',    label: 'Entrega',    color: '#06b6d4' },
];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const initialForm = {
  titulo: '', descripcion: '', fecha_inicio: '',
  fecha_fin: '', hora_inicio: '', hora_fin: '',
  tipo: 'general', color: '#4f8ef7', todo_el_dia: true, imagen: ''
};

export default function AgendaEscolar() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchEventos(); }, [mes, anio]);

  const fetchEventos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/agenda/eventos`, {
        params: { mes: mes + 1, anio }
      });
      setEventos(res.data.eventos);
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

  const handleSubmit = async () => {
    if (!form.titulo.trim() || !form.fecha_inicio) {
      showMensaje('Título y fecha son obligatorios.', 'error');
      return;
    }
    try {
      if (editando) {
        await axios.put(`${API_URL}/agenda/actualizar`, { ...form, id: editando });
        showMensaje('✔ Evento actualizado.', 'success');
      } else {
        await axios.post(`${API_URL}/agenda/crear`, form);
        showMensaje('✔ Evento creado correctamente.', 'success');
      }
      setShowForm(false);
      setEditando(null);
      setForm(initialForm);
      fetchEventos();
    } catch (e) {
      showMensaje('Error al guardar el evento.', 'error');
    }
  };

  const handleEditar = (ev) => {
    setForm({
      titulo: ev.titulo, descripcion: ev.descripcion,
      fecha_inicio: ev.fecha_inicio, fecha_fin: ev.fecha_fin,
      hora_inicio: ev.hora_inicio, hora_fin: ev.hora_fin,
      tipo: ev.tipo, color: ev.color, todo_el_dia: ev.todo_el_dia,
      imagen: ev.imagen || ''
    });
    setEditando(ev.id);
    setShowForm(true);
  };

  const handleEliminar = async (id) => {
    try {
      await axios.delete(`${API_URL}/agenda/eliminar/${id}`);
      showMensaje('✔ Evento eliminado.', 'success');
      setConfirmDelete(null);
      fetchEventos();
    } catch (e) {
      showMensaje('Error al eliminar.', 'error');
    }
  };

  const handleImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm(f => ({ ...f, imagen: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleDiaClick = (dia) => {
    setDiaSeleccionado(dia);
    const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    setForm({ ...initialForm, fecha_inicio: fechaStr });
    setEditando(null);
    setShowForm(true);
  };

  const mesAnterior = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
  };

  const mesSiguiente = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + 1);
  };

  // Generar días del mes
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const eventosDelDia = (dia) => {
    const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return eventos.filter(e => e.fecha_inicio === fechaStr);
  };

  const esHoy = (dia) => {
    return dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
  };

  const eventosDiaSeleccionado = diaSeleccionado ? eventosDelDia(diaSeleccionado) : [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">📅</span>
            <div>
              <h2 className="text-theme text-xl font-bold">Agenda Escolar</h2>
              <p className="text-muted text-sm">Gestiona eventos y actividades del colegio</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditando(null); setForm(initialForm); setDiaSeleccionado(null); }}
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold px-5 py-3 rounded-xl transition text-sm"
          >
            + Nuevo Evento
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendario */}
        <div className="lg:col-span-2 bg-theme2 border border-theme rounded-2xl overflow-hidden">
          {/* Navegación mes */}
          <div className="flex items-center justify-between p-4 border-b border-theme">
            <button onClick={mesAnterior}
              className="bg-theme3 hover:bg-theme border border-theme text-theme font-bold px-3 py-2 rounded-xl transition text-sm">
              ‹
            </button>
            <h3 className="text-theme font-bold text-lg">
              {MESES[mes]} {anio}
            </h3>
            <button onClick={mesSiguiente}
              className="bg-theme3 hover:bg-theme border border-theme text-theme font-bold px-3 py-2 rounded-xl transition text-sm">
              ›
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 border-b border-theme">
            {DIAS.map(d => (
              <div key={d} className="text-center py-2 text-muted text-xs font-bold uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          {loading ? (
            <div className="text-center py-12 text-muted text-sm">Cargando...</div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Espacios vacíos antes del primer día */}
              {Array.from({ length: primerDia }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-theme bg-theme3 opacity-50" />
              ))}

              {/* Días del mes */}
              {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(dia => {
                const evs = eventosDelDia(dia);
                const hoyFlag = esHoy(dia);
                const selFlag = diaSeleccionado === dia;

                return (
                  <div
                    key={dia}
                    onClick={() => setDiaSeleccionado(dia)}
                    className={`min-h-[80px] border-b border-r border-theme p-1 cursor-pointer transition ${
                      selFlag ? 'bg-[#6366f120]' : 'hover:bg-theme3'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                      hoyFlag
                        ? 'bg-[#6366f1] text-white'
                        : 'text-theme'
                    }`}>
                      {dia}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="text-white text-xs px-1 rounded truncate"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.titulo}
                        </div>
                      ))}
                      {evs.length > 2 && (
                        <div className="text-muted text-xs px-1">+{evs.length - 2} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leyenda tipos */}
          <div className="p-4 border-t border-theme flex flex-wrap gap-3">
            {TIPOS.map(t => (
              <div key={t.valor} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-muted text-xs">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral — eventos del día seleccionado */}
        <div className="bg-theme2 border border-theme rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-theme">
            <h3 className="text-theme font-bold text-sm">
              {diaSeleccionado
                ? `${diaSeleccionado} de ${MESES[mes]}`
                : 'Selecciona un día'}
            </h3>
          </div>

          {diaSeleccionado ? (
            <div className="p-4 space-y-3">
              {eventosDiaSeleccionado.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-muted text-sm">Sin eventos</p>
                  <button
                    onClick={() => handleDiaClick(diaSeleccionado)}
                    className="mt-3 text-[#6366f1] text-xs font-bold hover:underline"
                  >
                    + Agregar evento
                  </button>
                </div>
              ) : (
                eventosDiaSeleccionado.map(ev => (
                  <div key={ev.id} className="bg-theme3 border border-theme rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: ev.color }} />
                        <p className="text-theme font-bold text-sm">{ev.titulo}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleEditar(ev)}
                          className="text-[#4f8ef7] hover:bg-[#4f8ef720] p-1 rounded-lg transition text-xs">✏</button>
                        <button onClick={() => setConfirmDelete(ev.id)}
                          className="text-[#ef4444] hover:bg-[#ef444420] p-1 rounded-lg transition text-xs">🗑</button>
                      </div>
                    </div>
                    {ev.descripcion && (
                      <p className="text-muted text-xs mt-1 ml-5">{ev.descripcion}</p>
                    )}
                    {ev.imagen && (
                      <img
                        src={ev.imagen} alt="evento"
                        className="w-full h-28 object-cover rounded-xl mt-2 border border-theme"
                      />
                    )}
                    {!ev.todo_el_dia && ev.hora_inicio && (
                      <p className="text-muted text-xs mt-1 ml-5">
                        🕐 {ev.hora_inicio}{ev.hora_fin ? ` - ${ev.hora_fin}` : ''}
                      </p>
                    )}
                    <span className="inline-block mt-2 ml-5 text-white text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: ev.color }}>
                      {TIPOS.find(t => t.valor === ev.tipo)?.label || ev.tipo}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted text-sm">
              Haz clic en un día del calendario
            </div>
          )}
        </div>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="bg-theme2 border border-theme rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-theme font-bold text-lg">
                {editando ? '✏ Editar Evento' : '+ Nuevo Evento'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditando(null); setForm(initialForm); }}
                className="text-muted hover:text-theme text-xl font-bold transition">✕</button>
            </div>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-muted text-xs font-bold uppercase mb-1">Título *</label>
                <input type="text" value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Examen de Matemática"
                  className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1]"
                />
              </div>

              {/* Tipo y Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-xs font-bold uppercase mb-1">Tipo</label>
                  <select value={form.tipo}
                    onChange={e => {
                      const tipo = TIPOS.find(t => t.valor === e.target.value);
                      setForm(f => ({ ...f, tipo: e.target.value, color: tipo?.color || f.color }));
                    }}
                    className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1]"
                  >
                    {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-muted text-xs font-bold uppercase mb-1">Color</label>
                  <input type="color" value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full h-[46px] bg-theme3 border border-theme rounded-xl px-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-xs font-bold uppercase mb-1">Fecha inicio *</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs font-bold uppercase mb-1">Fecha fin</label>
                  <input type="date" value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1]"
                  />
                </div>
              </div>

              {/* Todo el día */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.todo_el_dia}
                  onChange={e => setForm(f => ({ ...f, todo_el_dia: e.target.checked }))}
                  className="accent-[#6366f1] w-4 h-4"
                />
                <span className="text-theme text-sm">Todo el día</span>
              </label>

              {/* Horas */}
              {!form.todo_el_dia && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Hora inicio</label>
                    <input type="time" value={form.hora_inicio}
                      onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                      className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Hora fin</label>
                    <input type="time" value={form.hora_fin}
                      onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))}
                      className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1]"
                    />
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-muted text-xs font-bold uppercase mb-1">Descripción</label>
                <textarea value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2} placeholder="Detalles del evento..."
                  className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6366f1] resize-none"
                />
              </div>

              {/* Imagen */}
              <div>
                <label className="block text-muted text-xs font-bold uppercase mb-1">Imagen del Evento</label>
                {form.imagen ? (
                  <div className="relative">
                    <img
                      src={form.imagen} alt="preview"
                      className="w-full h-40 object-cover rounded-xl border border-theme mb-2"
                    />
                    <button
                      onClick={() => setForm(f => ({ ...f, imagen: '' }))}
                      className="absolute top-2 right-2 bg-[#ef444420] hover:bg-[#ef444440] border border-[#ef4444] text-[#ef4444] text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center transition"
                    >✕</button>
                  </div>
                ) : (
                  <label className="w-full flex items-center gap-3 bg-theme3 border border-dashed border-theme hover:border-[#6366f1] text-muted rounded-xl px-4 py-3 text-sm cursor-pointer transition">
                    <span>🖼️</span>
                    <span>Haz clic para subir una imagen</span>
                    <input type="file" accept="image/*" onChange={handleImagen} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setEditando(null); setForm(initialForm); }}
                className="flex-1 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm"
              >Cancelar</button>
              <button onClick={handleSubmit}
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold py-3 rounded-xl transition text-sm"
              >{editando ? '💾 Actualizar' : '✔ Crear Evento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmDelete && (
        <ConfirmDeleteModal
          titulo="¿Eliminar evento?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleEliminar(confirmDelete)}
        />
      )}
    </div>
  );
}