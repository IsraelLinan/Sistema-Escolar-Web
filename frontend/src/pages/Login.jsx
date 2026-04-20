import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Complete todos los campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:8000/auth/login', { username, password });
      localStorage.setItem('authenticated', 'true');
      window.location.href = '/dashboard';
    } catch (e) {
      setError(e.response?.data?.detail || 'Error de conexión.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="bg-[#1a1d27] border border-[#2e3350] rounded-2xl p-8 w-full max-w-sm shadow-xl">
        
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🏫</div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Bienvenido</h1>
          <p className="text-[#94a3b8] text-sm mt-1">Ingrese sus credenciales para continuar</p>
        </div>

        {/* Usuario */}
        <div className="mb-4">
          <label className="block text-[#94a3b8] text-xs font-bold uppercase mb-2">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Ingrese su usuario"
            className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7] transition"
          />
        </div>

        {/* Contraseña */}
        <div className="mb-6">
          <label className="block text-[#94a3b8] text-xs font-bold uppercase mb-2">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Ingrese su contraseña"
            className="w-full bg-[#22263a] border border-[#2e3350] text-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8ef7] transition"
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

        <p className="text-center text-[#2e3350] text-xs mt-6">v2.0 • Sistema de Gestión Escolar</p>
      </div>
    </div>
  );
}