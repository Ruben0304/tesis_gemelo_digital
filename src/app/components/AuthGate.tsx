'use client';

import { useCallback, useMemo, useState } from 'react';
import type { User } from '@/types';
import { Loader2, Sparkles, UserPlus, LogIn } from 'lucide-react';

type AuthMode = 'login' | 'register';

interface AuthGateProps {
  onAuthenticated: (user: User) => void;
}

interface AuthResponse {
  user?: User;
  error?: string;
}

const STORAGE_KEY = 'gd_auth_autofill';
const DEFAULT_DEMO: {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
} = {
  name: 'Operador Demo',
  email: 'demo@microrred.cu',
  password: 'Energia2025!',
  role: 'user',
};

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const isRegister = mode === 'register';

  const title = useMemo(() => (isRegister ? 'Crear cuenta' : 'Acceder al gemelo digital'), [isRegister]);
  const actionLabel = useMemo(() => (isRegister ? 'Registrar y acceder' : 'Iniciar sesión'), [isRegister]);

  const autofill = useCallback(() => {
    let values = DEFAULT_DEMO;
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          values = { ...DEFAULT_DEMO, ...parsed };
        } catch (error) {
          console.warn('No se pudieron leer los datos guardados del relleno rápido.', error);
        }
      }
    }
    setName(values.name);
    setEmail(values.email);
    setPassword(values.password);
    const resolvedRole: 'admin' | 'user' = values.role ?? 'user';
    setRole(resolvedRole);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...values, role: resolvedRole }));
    }
    setMessage({
      type: 'success',
      text: 'Campos rellenados con datos de demostración. Puede ajustar antes de continuar.',
    });
  }, []);

  const toggleMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);

    const payload: Record<string, unknown> = { email, password };
    if (isRegister) {
      payload.name = name.trim() || undefined;
      payload.role = role;
    }

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed: AuthResponse | User = await response.json();
      const user = ('user' in parsed ? parsed.user : parsed) as User | undefined;

      if (!response.ok || !user) {
        const errorMessage =
          (parsed as AuthResponse).error ?? 'No se pudo completar la autenticación.';
        throw new Error(errorMessage);
      }

      setMessage({
        type: 'success',
        text: isRegister ? 'Registro completado. Redirigiendo…' : 'Acceso concedido. Preparando panel…',
      });

      if (typeof window !== 'undefined') {
        const persistedRole = (user as User).role ?? role;
        const persistedName = (user as User).name ?? name;
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            name: persistedName,
            email,
            password,
            role: persistedRole,
          })
        );
      }

      onAuthenticated(user);
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Fallo inesperado al autenticar.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-transparent">
      <div className="max-w-md w-full bg-gray-900/60 border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-6 text-green-400">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-xl font-semibold tracking-wide uppercase">Gemelo Digital • Acceso</h1>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-400 mb-6">
          {isRegister
            ? 'Registre un operador para gestionar las proyecciones y configurar equipos.'
            : 'Ingrese con sus credenciales o utilice el relleno rápido para la demo.'}
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="name">
                Nombre completo (opcional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2 text-white shadow-inner focus:border-green-400 focus:outline-none"
                placeholder="Ej. Operador turno mañana"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2 text-white shadow-inner focus:border-green-400 focus:outline-none"
              placeholder="operador@microrred.cu"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2 text-white shadow-inner focus:border-green-400 focus:outline-none"
              placeholder="Mínimo 8 caracteres"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={8}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="role">
                Rol
              </label>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as 'user' | 'admin')}
                className="w-full rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2 text-white shadow-inner focus:border-green-400 focus:outline-none"
              >
                <option value="user">Operador (usuario)</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                El rol controla acceso a configuraciones avanzadas (futuro).
              </p>
            </div>
          )}

          {message && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border-green-500/30 bg-green-500/10 text-green-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-semibold text-gray-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-green-500/60"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando…
              </>
            ) : isRegister ? (
              <>
                <UserPlus className="h-4 w-4" />
                {actionLabel}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {actionLabel}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={autofill}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20 transition-colors"
            type="button"
          >
            Rellenar datos demo
          </button>
          <button
            onClick={toggleMode}
            className="text-sm text-gray-400 hover:text-green-300 transition"
            type="button"
          >
            {isRegister ? '¿Ya tiene cuenta? Inicie sesión' : '¿Sin cuenta? Registre un operador'}
          </button>
        </div>
      </div>
    </div>
  );
}
