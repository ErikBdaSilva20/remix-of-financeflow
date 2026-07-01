import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, type UserSession } from '@/lib/data/client';

interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Extrai a mensagem legível do erro do gateway sem expor detalhes internos
// Formato do client.ts: "[gateway] METHOD /path → STATUS: <body>"
function parseGatewayError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/→\s*\d+:\s*(.+)$/);
  if (!match) return fallback;
  try {
    const parsed = JSON.parse(match[1]);
    if (typeof parsed?.error === 'string') return parsed.error;
  } catch {
    // body não é JSON — usa fallback genérico
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  const loadSession = useCallback(async () => {
    try {
      const user = await auth.me();
      setState({ user, isLoading: false, error: null });
    } catch {
      // 401 = não logado; qualquer outro erro também resulta em user null
      setState({ user: null, isLoading: false, error: null });
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const user = await auth.signIn(email, password);
      setState({ user, isLoading: false, error: null });
    } catch (err) {
      const message = parseGatewayError(err, 'Falha ao entrar. Verifique email e senha.');
      setState(s => ({ ...s, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const user = await auth.signUp(email, password, name);
      setState({ user, isLoading: false, error: null });
    } catch (err) {
      const message = parseGatewayError(err, 'Falha ao criar conta. Tente novamente.');
      setState(s => ({ ...s, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      await auth.signOut();
    } finally {
      setState({ user: null, isLoading: false, error: null });
    }
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
