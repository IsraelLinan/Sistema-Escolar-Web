import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const TURNOS = ['Mañana', 'Tarde', 'Noche'];
const GENEROS = ['Masculino', 'Femenino'];
const CARGOS = ['Docente', 'Auxiliar', 'Personal Administrativo'];

const initialForm = {
  cargo: 'Auxiliar', nombres: '', apellidos: '', dni: '', fecha_nacimiento: '',
  genero: 'Masculino', telefono: '', email: '', direccion: '',
  area_asignada: '', turno: '', fecha_ingreso: new Date().toISOString().split('T')[0],
  foto: ''
};

const cargoColor = (cargo) => {
  if (cargo === 'Docente') return 'bg-[#22c55e20] text-[#22c55e] border-[#22c55e]';
  if (cargo === 'Personal Administrativo') return 'bg-[#f43f5e20] text-[#f43f5e] border-[#f43f5e]';
  return 'bg-[#8b5cf620] text-[#8b5cf6] border-[#8b5cf6]';
};

export default function AuxiliaresModule() {
  const [auxiliares, setAuxiliares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [mensaje, setMensaje] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fotoRef = useRef(null);

  useEffect(() => { fetchAuxiliares(); }, [busqueda, filtroCargo]);

  const fetchAuxiliares = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/auxiliares/lista`, {
        params: { busqueda, cargo: filtroCargo }
      });
      setAuxiliares(res.data.auxiliares);
    } catch (e) {
      showMensaje('Error al cargar registros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMensaje = (text, type) => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm(f => ({ ...f, foto: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      showMensaje('Nombres y apellidos son obligatorios.', 'error');
      return;
    }
    try {
      if (editando) {
        await axios.put(`${API_URL}/auxiliares/actualizar`, { ...form, id: editando });
        showMensaje('✔ Registro actualizado correctamente.', 'success');
      } else {
        await axios.post(`${API_URL}/auxiliares/crear`, form);
        showMensaje('✔ Registrado correctamente.', 'success');
      }
      setShowForm(false);
      setEditando(null);
      setForm(initialForm);
      fetchAuxiliares();
    } catch (e) {
      showMensaje(e.response?.data?.detail || 'Error al guardar.', 'error');
    }
  };

  const handleEditar = (aux) => {
    setForm({
      cargo: aux.cargo || 'Auxiliar',
      nombres: aux.nombres, apellidos: aux.apellidos, dni: aux.dni,
      fecha_nacimiento: aux.fecha_nacimiento, genero: aux.genero,
      telefono: aux.telefono, email: aux.email, direccion: aux.direccion,
      area_asignada: aux.area_asignada, turno: aux.turno,
      fecha_ingreso: aux.fecha_ingreso, foto: aux.foto
    });
    setEditando(aux.id);
    setShowForm(true);
  };

  const handleEliminar = async (id) => {
    try {
      await axios.delete(`${API_URL}/auxiliares/eliminar/${id}`);
      showMensaje('✔ Registro eliminado.', 'success');
      setConfirmDelete(null);
      fetchAuxiliares();
    } catch (e) {
      showMensaje('Error al eliminar.', 'error');
    }
  };

  const turnoColor = (turno) => {
    if (turno === 'Mañana') return 'bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b]';
    if (turno === 'Tarde')  return 'bg-[#4f8ef720] text-[#4f8ef7] border-[#4f8ef7]';
    if (turno === 'Noche')  return 'bg-[#a855f720] text-[#a855f7] border-[#a855f7]';
    return 'bg-theme3 text-muted border-theme';
  };

  return (
    <div className="max-w-6xl mx-auto">

      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🗂️</span>
            <div>
              <h2 className="text-theme text-xl font-bold">Registro Administrativo</h2>
              <p className="text-muted text-sm">Gestiona docentes, auxiliares y personal administrativo</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditando(null); setForm(initialForm); }}
            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold px-5 py-3 rounded-xl transition text-sm"
          >
            + Nuevo
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

      {/* Formulario */}
      {showForm && (
        <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
          <h3 className="text-theme font-bold text-base mb-6">
            {editando ? '✏ Editar Registro' : '+ Nuevo Registro'}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Datos */}
            <div className="lg:col-span-2 space-y-4">

              {/* Cargo */}
              <div className="bg-theme3 rounded-xl p-4">
                <p className="text-[#8b5cf6] text-xs font-bold uppercase mb-3">🧾 Cargo</p>
                <select value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                  className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                >
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Datos personales */}
              <div className="bg-theme3 rounded-xl p-4">
                <p className="text-[#8b5cf6] text-xs font-bold uppercase mb-4">👤 Datos Personales</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Nombres *</label>
                    <input type="text" value={form.nombres}
                      onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Apellidos *</label>
                    <input type="text" value={form.apellidos}
                      onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">DNI</label>
                    <input type="text" value={form.dni}
                      onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Fecha de Nacimiento</label>
                    <input type="date" value={form.fecha_nacimiento}
                      onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Género</label>
                    <select value={form.genero}
                      onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    >
                      {GENEROS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Teléfono</label>
                    <input type="text" value={form.telefono}
                      onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Email</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Dirección</label>
                    <textarea value={form.direccion}
                      onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                      rows={2}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Datos laborales */}
              <div className="bg-theme3 rounded-xl p-4">
                <p className="text-[#8b5cf6] text-xs font-bold uppercase mb-4">💼 Datos Laborales</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Área Asignada</label>
                    <input type="text" value={form.area_asignada}
                      placeholder="Ej: Primaria, Patio..."
                      onChange={e => setForm(f => ({ ...f, area_asignada: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Turno</label>
                    <select value={form.turno}
                      onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    >
                      <option value="">Seleccionar turno</option>
                      {TURNOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted text-xs font-bold uppercase mb-1">Fecha de Ingreso</label>
                    <input type="date" value={form.fecha_ingreso}
                      onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))}
                      className="w-full bg-theme2 border border-theme text-theme rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8b5cf6]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Foto */}
            <div className="bg-theme3 rounded-xl p-4 flex flex-col items-center justify-start">
              <p className="text-[#8b5cf6] text-xs font-bold uppercase mb-4 self-start">📷 Foto</p>
              <div className="w-36 h-36 rounded-2xl overflow-hidden bg-theme2 border-2 border-theme flex items-center justify-center mb-4">
                {form.foto ? (
                  <img src={form.foto} alt="foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl">👤</span>
                )}
              </div>
              <button
                onClick={() => fotoRef.current?.click()}
                className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold px-4 py-2 rounded-xl transition text-xs"
              >
                ↑ Subir Foto
              </button>
              <input ref={fotoRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-6 justify-end">
            <button
              onClick={() => { setShowForm(false); setEditando(null); setForm(initialForm); }}
              className="bg-theme3 hover:bg-theme border border-theme text-muted font-bold px-6 py-3 rounded-xl transition text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold px-6 py-3 rounded-xl transition text-sm"
            >
              {editando ? '💾 Actualizar' : '✔ Registrar'}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-theme2 border border-theme rounded-2xl p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar nombre, código, DNI..."
          className="flex-1 bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8b5cf6]"
        />
        <select
          value={filtroCargo}
          onChange={e => setFiltroCargo(e.target.value)}
          className="bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8b5cf6]"
        >
          <option value="">Todos los cargos</option>
          {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div className="bg-theme2 border border-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme flex items-center justify-between">
          <p className="text-theme font-bold text-sm">
            Registros <span className="text-[#8b5cf6] ml-2">{auxiliares.length}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">Cargando...</div>
        ) : auxiliares.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">🗂️ No hay registros aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Cargo</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">DNI</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Área</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Turno</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Teléfono</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {auxiliares.map(aux => (
                  <tr key={aux.id} className="border-b border-theme hover:bg-theme3 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-theme3 border border-theme flex items-center justify-center flex-shrink-0">
                          {aux.foto ? (
                            <img src={aux.foto} alt="foto" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">👤</span>
                          )}
                        </div>
                        <div>
                          <p className="text-theme font-bold">
                            {aux.apellidos ? `${aux.apellidos}, ${aux.nombres}` : aux.nombres}
                          </p>
                          <p className="text-muted text-xs">{aux.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cargoColor(aux.cargo)}`}>
                        {aux.cargo || 'Auxiliar'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#8b5cf620] text-[#8b5cf6] border border-[#8b5cf6]">
                        {aux.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{aux.dni || '—'}</td>
                    <td className="px-4 py-4 text-muted">{aux.area_asignada || '—'}</td>
                    <td className="px-4 py-4">
                      {aux.turno ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          aux.turno === 'Mañana' ? 'bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b]' :
                          aux.turno === 'Tarde' ? 'bg-[#4f8ef720] text-[#4f8ef7] border-[#4f8ef7]' :
                          'bg-[#a855f720] text-[#a855f7] border-[#a855f7]'
                        }`}>
                          {aux.turno}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4 text-muted">{aux.telefono || '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditar(aux)}
                          className="bg-[#4f8ef720] hover:bg-[#4f8ef740] border border-[#4f8ef7] text-[#4f8ef7] text-xs font-bold px-3 py-2 rounded-lg transition"
                        >✏</button>
                        <button
                          onClick={() => setConfirmDelete(aux.id)}
                          className="bg-[#ef444420] hover:bg-[#ef444440] border border-[#ef4444] text-[#ef4444] text-xs font-bold px-3 py-2 rounded-lg transition"
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmar eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-theme2 border border-theme rounded-2xl p-6 max-w-sm w-full mx-4">
            <p className="text-theme font-bold text-lg mb-2">¿Eliminar registro?</p>
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