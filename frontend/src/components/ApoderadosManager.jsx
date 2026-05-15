import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ApoderadosManager() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [apoderadoNombre, setApoderadoNombre] = useState('');
  const [apoderadoChatId, setApoderadoChatId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [probando, setProbando] = useState(null);

  useEffect(() => { fetchEstudiantes(); }, []);

  const fetchEstudiantes = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/apoderados/lista');
      setEstudiantes(res.data.estudiantes);
    } catch (e) {
      setMensaje({ text: 'Error al cargar estudiantes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (est) => {
    setEditando(est.id);
    setApoderadoNombre(est.apoderado_nombre);
    setApoderadoChatId(est.apoderado_chat_id);
  };

  const handleGuardar = async (estudianteId) => {
    try {
      await axios.put('http://localhost:8000/apoderados/actualizar', {
        estudiante_id: estudianteId,
        apoderado_nombre: apoderadoNombre,
        apoderado_chat_id: apoderadoChatId
      });
      setMensaje({ text: '✔ Apoderado actualizado correctamente.', type: 'success' });
      setEditando(null);
      fetchEstudiantes();
    } catch (e) {
      setMensaje({ text: '✗ Error al actualizar.', type: 'error' });
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleProbar = async (est) => {
    setProbando(est.id);
    try {
      await axios.post('http://localhost:8000/apoderados/probar-notificacion', {
        chat_id: est.apoderado_chat_id,
        nombre: est.nombre
      });
      setMensaje({ text: `✔ Notificación enviada al apoderado de ${est.nombre}.`, type: 'success' });
    } catch (e) {
      setMensaje({ text: '✗ Error al enviar notificación de prueba.', type: 'error' });
    } finally {
      setProbando(null);
    }
    setTimeout(() => setMensaje(null), 3000);
  };

  const estudiantesFiltrados = estudiantes.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.apoderado_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalConChatId = estudiantes.filter(e => e.apoderado_chat_id).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">👨‍👩‍👧</span>
          <div>
            <h2 className="text-[#e2e8f0] text-xl font-bold">Gestión de Apoderados</h2>
            <p className="text-[#94a3b8] text-sm">Configura el Telegram de cada apoderado para recibir notificaciones</p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 text-center">
          <p className="text-[#94a3b8] text-xs font-bold uppercase mb-1">Total Estudiantes</p>
          <p className="text-[#4f8ef7] font-bold text-3xl">{estudiantes.length}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 text-center">
          <p className="text-[#94a3b8] text-xs font-bold uppercase mb-1">Con Telegram</p>
          <p className="text-[#22c55e] font-bold text-3xl">{totalConChatId}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 text-center">
          <p className="text-[#94a3b8] text-xs font-bold uppercase mb-1">Sin Telegram</p>
          <p className="text-[#ef4444] font-bold text-3xl">{estudiantes.length - totalConChatId}</p>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-4">
        <p className="text-[#94a3b8] text-xs font-bold uppercase mb-2">📋 Instrucciones para obtener el Chat ID</p>
        <ol className="text-[#94a3b8] text-sm space-y-1 list-decimal list-inside">
          <li>El apoderado debe buscar tu bot en Telegram y escribir <span className="text-[#4f8ef7] font-mono">/start</span></li>
          <li>Luego abre en tu navegador: <span className="text-[#4f8ef7] font-mono text-xs">https://api.telegram.org/bot[TOKEN]/getUpdates</span></li>
          <li>Busca el campo <span className="text-[#4f8ef7] font-mono">"id"</span> dentro de <span className="text-[#4f8ef7] font-mono">"chat"</span> — ese es el Chat ID</li>
          <li>Pégalo en el campo <span className="text-[#4f8ef7] font-mono">Chat ID Telegram</span> del apoderado</li>
        </ol>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`mb-4 border rounded-xl px-4 py-3 text-sm font-medium ${
          mensaje.type === 'success'
            ? 'bg-[#22c55e20] border-[#22c55e] text-[#22c55e]'
            : 'bg-[#ef444420] border-[#ef4444] text-[#ef4444]'
        }`}>
          {mensaje.text}
        </div>
      )}

      {/* Buscador */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-4 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre de estudiante o apoderado..."
          className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f43f5e]"
        />
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#2e3350]">
          <p className="text-[#e2e8f0] font-bold text-sm">Lista de Estudiantes y Apoderados</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#94a3b8] text-sm">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e3350]">
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Estudiante</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Apoderado</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Chat ID Telegram</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Estado</th>
                  <th className="text-left px-6 py-3 text-[#94a3b8] text-xs font-bold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estudiantesFiltrados.map(est => (
                  <tr key={est.id} className="border-b border-[#2e3350] hover:bg-[#22263a] transition">
                    <td className="px-6 py-4 text-[#e2e8f0] font-medium">{est.nombre}</td>
                    <td className="px-6 py-4">
                      {editando === est.id ? (
                        <input
                          type="text"
                          value={apoderadoNombre}
                          onChange={e => setApoderadoNombre(e.target.value)}
                          placeholder="Nombre del apoderado"
                          className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#f43f5e]"
                        />
                      ) : (
                        <span className="text-[#94a3b8]">{est.apoderado_nombre || '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editando === est.id ? (
                        <input
                          type="text"
                          value={apoderadoChatId}
                          onChange={e => setApoderadoChatId(e.target.value)}
                          placeholder="Ej: 1370436595"
                          className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#f43f5e]"
                        />
                      ) : (
                        <span className="text-[#94a3b8] font-mono text-xs">{est.apoderado_chat_id || '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {est.apoderado_chat_id ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#22c55e20] text-[#22c55e]">
                          ✔ Configurado
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ef444420] text-[#ef4444]">
                          ✗ Sin configurar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editando === est.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGuardar(est.id)}
                            className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            className="bg-[#22263a] hover:bg-[#2e3350] border border-[#2e3350] text-[#94a3b8] text-xs font-bold px-3 py-2 rounded-lg transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditar(est)}
                            className="bg-[#f43f5e20] hover:bg-[#f43f5e40] border border-[#f43f5e] text-[#f43f5e] text-xs font-bold px-3 py-2 rounded-lg transition"
                          >
                            ✏ Editar
                          </button>
                          {est.apoderado_chat_id && (
                            <button
                              onClick={() => handleProbar(est)}
                              disabled={probando === est.id}
                              className="bg-[#4f8ef720] hover:bg-[#4f8ef740] border border-[#4f8ef7] text-[#4f8ef7] text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-50"
                            >
                              {probando === est.id ? '...' : '📨 Probar'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
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