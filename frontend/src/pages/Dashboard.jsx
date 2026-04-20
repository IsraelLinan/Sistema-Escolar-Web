import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentIngress from '../components/StudentIngress';
import TeacherIngress from '../components/TeacherIngress';
import BarcodeGenerator from '../components/BarcodeGenerator';
import WeeklyReports from '../components/WeeklyReports';
import FotocheckGenerator from '../components/FotocheckGenerator';

const MODULES = [
  { id: 'estudiantes', icon: '🎓', label: 'Asistencia de Estudiantes', color: '#4f8ef7' },
  { id: 'docentes',    icon: '👨‍🏫', label: 'Asistencia de Docentes',    color: '#22c55e' },
  { id: 'reportes',   icon: '📋', label: 'Reporte de Asistencia',      color: '#f59e0b' },
  { id: 'codigos',    icon: '🏷️', label: 'Generar Código de Barra',    color: '#a855f7' },
  { id: 'fotocheck',  icon: '🪪', label: 'Generar Fotocheck Escolar',  color: '#06b6d4' },
];

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    navigate('/');
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'estudiantes': return <StudentIngress />;
      case 'docentes':    return <TeacherIngress />;
      case 'reportes':    return <WeeklyReports />;
      case 'codigos':     return <BarcodeGenerator />;
      case 'fotocheck': return <FotocheckGenerator />;
      default:            return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col md:flex-row">

      {/* Sidebar */}
      <aside className="bg-[#1a1d27] border-b md:border-b-0 md:border-r border-[#2e3350] w-full md:w-72 md:min-h-screen flex flex-col">
        
        {/* Logo */}
        <div className="p-6 text-center border-b border-[#2e3350]">
          <div className="text-5xl mb-2">🏫</div>
          <h1 className="text-[#e2e8f0] font-bold text-base">Sistema de Gestión Escolar</h1>
          <p className="text-[#94a3b8] text-xs mt-1">v2.0</p>
        </div>

        {/* Módulos */}
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-[#94a3b8] text-xs font-bold uppercase mb-3 px-2">Módulos</p>
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition border ${
                activeModule === m.id
                  ? 'bg-[#22263a] border-[#2e3350] text-[#e2e8f0]'
                  : 'border-transparent text-[#94a3b8] hover:bg-[#22263a] hover:text-[#e2e8f0]'
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              <span className="text-sm font-medium">{m.label}</span>
              {activeModule === m.id && (
                <span className="ml-auto w-1.5 h-6 rounded-full" style={{ backgroundColor: m.color }} />
              )}
            </button>
          ))}

          {/* Dashboard Streamlit */}
          <div className="pt-4 border-t border-[#2e3350] mt-4">
            <p className="text-[#94a3b8] text-xs font-bold uppercase mb-3 px-2">Herramientas</p>
            <button
              onClick={() => window.open('http://localhost:8501', '_blank')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border border-transparent text-[#94a3b8] hover:bg-[#22263a] hover:text-[#e2e8f0] transition"
            >
              <span className="text-xl">📊</span>
              <span className="text-sm font-medium">Abrir Dashboard Web</span>
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#2e3350]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#ef4444] hover:bg-[#ef444420] transition text-sm font-medium"
          >
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6">
        {activeModule ? (
          <div>
            <button
              onClick={() => setActiveModule(null)}
              className="mb-4 text-[#94a3b8] hover:text-[#e2e8f0] text-sm flex items-center gap-2 transition"
            >
              ← Volver al menú
            </button>
            {renderModule()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-7xl mb-4">🏫</div>
            <h2 className="text-[#e2e8f0] text-2xl font-bold mb-2">Sistema de Gestión Escolar</h2>
            <p className="text-[#94a3b8] text-sm">Selecciona un módulo del menú para comenzar</p>
          </div>
        )}
      </main>
    </div>
  );
}