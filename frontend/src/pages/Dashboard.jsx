import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentIngress from '../components/StudentIngress';
import TeacherIngress from '../components/TeacherIngress';
import AuxiliarIngress from '../components/AuxiliarIngress';
import PersonalAdminIngress from '../components/PersonalAdminIngress';
import AuxiliaresModule from '../components/AuxiliaresModule';
import BarcodeGenerator from '../components/BarcodeGenerator';
import WeeklyReports from '../components/WeeklyReports';
import FotocheckGenerator from '../components/FotocheckGenerator';
import CarnetsModule from '../components/CarnetsModule';
import ApoderadosManager from '../components/ApoderadosManager';
import AgendaEscolar from '../components/AgendaEscolar';
import CuadroNotas from '../components/CuadroNotas';
import useTheme from '../hooks/useTheme';
import ThemeToggle from '../components/ThemeToggle';
import CambiarPassword from '../components/CambiarPassword';
import GestionColegios from '../components/GestionColegios';

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState(null);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [showCambiarPassword, setShowCambiarPassword] = useState(false);
  const [colegioNombre] = useState(localStorage.getItem('colegio_nombre') || 'Sistema de Gestión Escolar');
  const [colegioLogo] = useState(localStorage.getItem('colegio_logo') || '');
  const [rol] = useState(localStorage.getItem('rol') || 'admin');
  const esSuperAdmin = rol === 'super_admin';

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('colegio_nombre');
    localStorage.removeItem('colegio_logo');
    localStorage.removeItem('rol');
    navigate('/');
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'estudiantes':               return <StudentIngress />;
      case 'docentes':                  return <TeacherIngress />;
      case 'asistencia_auxiliares':     return <AuxiliarIngress />;
      case 'asistencia_personal_admin': return <PersonalAdminIngress />;
      case 'reportes':                  return <WeeklyReports />;
      case 'auxiliares':                return <AuxiliaresModule />;
      case 'codigos':                   return <BarcodeGenerator />;
      case 'fotocheck':                 return <FotocheckGenerator />;
      case 'carnets':                   return <CarnetsModule />;
      case 'apoderados':                return <ApoderadosManager />;
      case 'agenda':                    return <AgendaEscolar />;
      case 'notas':                     return <CuadroNotas />;
      case 'colegios':                  return <GestionColegios />;
      default:                          return null;
    }
  };

  const NavButton = ({ id, icon, label, color }) => (
    <button
      onClick={() => setActiveModule(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition border ${
        activeModule === id
          ? 'bg-theme3 border-theme text-theme'
          : 'border-transparent text-muted hover:bg-theme3 hover:text-theme'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
      {activeModule === id && (
        <span className="ml-auto w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-theme flex flex-col md:flex-row">

      {/* Sidebar */}
      <aside className="bg-theme2 border-b md:border-b-0 md:border-r border-theme w-full md:w-72 md:min-h-screen flex flex-col">

        {/* Logo */}
        <div className="p-6 text-center border-b border-theme">
          {colegioLogo ? (
            <img
              src={colegioLogo}
              alt="Logo del colegio"
              className="w-16 h-16 object-contain mx-auto mb-2 rounded-xl"
            />
          ) : (
            <div className="text-5xl mb-2">🏫</div>
          )}
          <h1 className="text-theme font-bold text-base">{colegioNombre}</h1>
          <p className="text-muted text-xs mt-1">v2.0</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-muted text-xs">{isDark ? '🌙 Oscuro' : '☀️ Claro'}</span>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

          {esSuperAdmin ? (
            <>
              <p className="text-muted text-xs font-bold uppercase mb-2 px-2 pt-2">Administración</p>
              <NavButton id="colegios" icon="🏫" label="Gestión de Colegios" color="#4f8ef7" />
            </>
          ) : (
            <>
              {/* Asistencia */}
              <p className="text-muted text-xs font-bold uppercase mb-2 px-2 pt-2">Asistencia</p>
              <NavButton id="estudiantes"           icon="🎓"  label="Asistencia de Estudiantes" color="#4f8ef7" />
              <NavButton id="docentes"              icon="👨‍🏫" label="Asistencia de Docentes"    color="#22c55e" />
              <NavButton id="asistencia_auxiliares" icon="👷"  label="Asistencia de Auxiliares"  color="#10b981" />
              <NavButton id="asistencia_personal_admin" icon="🗂️" label="Asistencia de Personal Admin." color="#f43f5e" />
              <NavButton id="reportes"              icon="📋"  label="Reporte de Asistencia"     color="#f59e0b" />

              <div className="border-t border-theme my-3" />

              {/* Gestión General */}
              <p className="text-muted text-xs font-bold uppercase mb-2 px-2">Gestión General</p>
              <NavButton id="auxiliares" icon="🗂️"  label="Registro Administrativo"   color="#8b5cf6" />
              <NavButton id="codigos"    icon="🏷️" label="Generar Código de Barra"   color="#a855f7" />
              <NavButton id="fotocheck"  icon="🪪"  label="Generar Fotocheck"          color="#06b6d4" />
              <NavButton id="carnets"    icon="🖼️" label="Carnets"                   color="#3b82f6" />
              <NavButton id="apoderados" icon="👨‍👩‍👧" label="Gestión de Apoderados"    color="#f43f5e" />

              <div className="border-t border-theme my-3" />

              {/* Académico */}
              <p className="text-muted text-xs font-bold uppercase mb-2 px-2">Académico</p>
              <NavButton id="agenda" icon="📅" label="Agenda Escolar"  color="#6366f1" />
              <NavButton id="notas"  icon="📊" label="Cuadro de Notas" color="#ec4899" />

              <div className="border-t border-theme my-3" />

              {/* Herramientas */}
              <p className="text-muted text-xs font-bold uppercase mb-2 px-2">Herramientas</p>
              <button
                onClick={() => window.open('http://localhost:8501', '_blank')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border border-transparent text-muted hover:bg-theme3 hover:text-theme transition"
              >
                <span className="text-xl">📊</span>
                <span className="text-sm font-medium">Abrir Dashboard Web</span>
              </button>
            </>
          )}

        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-theme space-y-2">
          <button
            onClick={() => setShowCambiarPassword(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted hover:bg-theme3 transition text-sm font-medium"
          >
            <span>🔐</span> Cambiar Contraseña
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#ef4444] hover:bg-[#ef444420] transition text-sm font-medium"
          >
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>

        {/* Modal cambiar contraseña */}
        {showCambiarPassword && (
          <CambiarPassword onClose={() => setShowCambiarPassword(false)} />
        )}
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 bg-theme">
        {activeModule ? (
          <div>
            <button
              onClick={() => setActiveModule(null)}
              className="mb-4 text-muted hover:text-theme text-sm flex items-center gap-2 transition"
            >
              ← Volver al menú
            </button>
            {renderModule()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-7xl mb-4">🏫</div>
            <h2 className="text-theme text-2xl font-bold mb-2">Sistema de Gestión Escolar</h2>
            <p className="text-muted text-sm">Selecciona un módulo del menú para comenzar</p>
          </div>
        )}
      </main>
    </div>
  );
}