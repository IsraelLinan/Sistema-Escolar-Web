import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import useImageUpload from '../hooks/useImageUpload';

export default function GestionColegios() {
  const [colegios, setColegios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const { imagen: logo, handleImagen: handleLogo } = useImageUpload(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => { fetchColegios(); }, []);

  const fetchColegios = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/colegios/lista`);
      setColegios(res.data.colegios);
    } catch (e) {
      showMensaje(e.response?.data?.detail || 'Error al cargar colegios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMensaje = (text, type) => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 4000);
  };

  const handleCrear = async () => {
    if (!nombre.trim() || !codigo.trim()) {
      showMensaje('Nombre y código son obligatorios.', 'error');
      return;
    }
    setGuardando(true);
    try {
      await axios.post(`${API_URL}/colegios/crear`, {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        logo: logo || ''
      });
      showMensaje(`✔ Colegio "${nombre}" creado correctamente.`, 'success');
      setNombre('');
      setCodigo('');
      setShowForm(false);
      fetchColegios();
    } catch (e) {
      showMensaje(e.response?.data?.detail || 'Error al crear el colegio.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (id) => {
    try {
      await axios.put(`${API_URL}/colegios/${id}/activar`);
      fetchColegios();
    } catch (e) {
      showMensaje('Error al cambiar el estado del colegio.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🏫</span>
            <div>
              <h2 className="text-theme text-xl font-bold">Gestión de Colegios</h2>
              <p className="text-muted text-sm">Administra los colegios que usan el sistema</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#4f8ef7] hover:bg-[#3a7ae0] text-white font-bold px-5 py-3 rounded-xl transition text-sm"
          >
            + Nuevo Colegio
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

      {/* Formulario nuevo colegio */}
      {showForm && (
        <div className="bg-theme2 border border-theme rounded-2xl p-6 mb-4">
          <h3 className="text-theme font-bold text-base mb-4">+ Nuevo Colegio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-muted text-xs font-bold uppercase mb-1">Nombre del Colegio</label>
              <input
                type="text" value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: I.E. San Martín de Porres"
                className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7]"
              />
            </div>
            <div>
              <label className="block text-muted text-xs font-bold uppercase mb-1">Código Único</label>
              <input
                type="text" value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: SANMARTIN"
                className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7]"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-muted text-xs font-bold uppercase mb-1">Logo (opcional)</label>
            <div className="flex items-center gap-3">
              {logo && (
                <img src={logo} alt="logo" className="w-14 h-14 object-contain rounded-lg border border-theme bg-white p-1" />
              )}
              <label className="flex-1 flex items-center gap-3 bg-theme3 border border-dashed border-theme hover:border-[#4f8ef7] text-muted rounded-xl px-4 py-3 text-sm cursor-pointer transition">
                <span>🖼️</span>
                <span>{logo ? 'Logo cargado ✔' : 'Haz clic para subir el logo'}</span>
                <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setNombre(''); setCodigo(''); }}
              className="flex-1 bg-theme3 hover:bg-theme border border-theme text-muted font-bold py-3 rounded-xl transition text-sm"
            >Cancelar</button>
            <button
              onClick={handleCrear}
              disabled={guardando}
              className="flex-1 bg-[#4f8ef7] hover:bg-[#3a7ae0] text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
            >{guardando ? 'Creando...' : '✔ Crear Colegio'}</button>
          </div>
        </div>
      )}

      {/* Lista de colegios */}
      <div className="bg-theme2 border border-theme rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-theme">
          <p className="text-theme font-bold text-sm">
            Colegios registrados <span className="text-[#4f8ef7] ml-2">{colegios.length}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">Cargando...</div>
        ) : colegios.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">🏫 No hay colegios registrados aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="text-left px-6 py-3 text-muted text-xs font-bold uppercase">Colegio</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Usuarios</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Estudiantes</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-muted text-xs font-bold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {colegios.map(c => (
                  <tr key={c.id} className="border-b border-theme hover:bg-theme3 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-theme3 border border-theme flex items-center justify-center flex-shrink-0">
                          {c.logo ? (
                            <img src={c.logo} alt="logo" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xl">🏫</span>
                          )}
                        </div>
                        <div>
                          <p className="text-theme font-bold">{c.nombre}</p>
                          <p className="text-muted text-xs">Creado el {c.fecha}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#4f8ef720] text-[#4f8ef7] border border-[#4f8ef7]">
                        {c.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{c.total_usuarios}</td>
                    <td className="px-4 py-4 text-muted">{c.total_estudiantes}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        c.activo
                          ? 'bg-[#22c55e20] text-[#22c55e] border-[#22c55e]'
                          : 'bg-[#ef444420] text-[#ef4444] border-[#ef4444]'
                      }`}>
                        {c.activo ? '✔ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleActivo(c.id)}
                        className="bg-theme3 hover:bg-theme border border-theme text-theme text-xs font-bold px-3 py-2 rounded-lg transition"
                      >
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="bg-theme2 border border-theme rounded-2xl p-4 mt-4">
        <p className="text-muted text-xs">
          💡 Después de crear un colegio, registra su primer usuario administrador desde la Terminal.
          Consulta el archivo <strong>INSTALACION.md</strong> para el procedimiento detallado.
        </p>
      </div>
    </div>
  );
}