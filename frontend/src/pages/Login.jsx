import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import useTheme from '../hooks/useTheme';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Complete todos los campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      localStorage.setItem('authenticated', 'true');
      localStorage.setItem('token', res.data.token);
      window.location.href = '/dashboard';
    } catch (e) {
      setError(e.response?.data?.detail || 'Error de conexión.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme flex items-center justify-center px-4">

      {/* Toggle tema esquina superior derecha */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <span className="text-muted text-xs">{isDark ? '🌙 Oscuro' : '☀️ Claro'}</span>
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      <div className="bg-theme2 border border-theme rounded-2xl p-8 w-full max-w-sm shadow-xl">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🏫</div>
          <h1 className="text-2xl font-bold text-theme">Bienvenido</h1>
          <p className="text-muted text-sm mt-1">Ingrese sus credenciales para continuar</p>
        </div>

        {/* Usuario */}
        <div className="mb-4">
          <label className="block text-muted text-xs font-bold uppercase mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Ingrese su usuario"
            className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7] transition"
          />
        </div>

        {/* Contraseña */}
        <div className="mb-6">
          <label className="block text-muted text-xs font-bold uppercase mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Ingrese su contraseña"
            className="w-full bg-theme3 border border-theme text-theme rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7] transition"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-[#ef444420] border border-[#ef4444] text-[#ef4444] rounded-xl px-4 py-2 text-sm">
            ✗ {error}
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#4f8ef7] hover:bg-[#3a7ae0] text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Verificando...' : 'Iniciar Sesión'}
        </button>

        <p className="text-center text-muted text-xs mt-6">v2.0 • Sistema de Gestión Escolar</p>
      </div>
    </div>
  );
}