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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  const loadSession = useCallback(async () => {
    // ╔════════════════════════════════════════════════════════════════════╗
    // ║  🟡 LOGIN MOCKADO — somente para VISUALIZAÇÃO local (sem gateway).   ║
    // ║  Injeta um usuário admin fake e PULA a autenticação real, fazendo   ║
    // ║  o app abrir direto no dashboard (a tela de login não aparece).      ║
    // ║                                                                      ║
    // ║  ⚠️  NÃO PUBLIQUE com isto ativo. Para restaurar o login real:       ║
    // ║      1) apague este bloco MOCK;                                       ║
    // ║      2) descomente o bloco "LOGIN REAL" logo abaixo.                  ║
    // ║  Detalhes em docs/LOGIN-MOCKADO.md                                   ║
    // ╚════════════════════════════════════════════════════════════════════╝
    setState({
      user: { id: 'mock-admin', email: 'demo@financeflow.local', name: 'Usuário Demo', role: 'admin' },
      isLoading: false,
      error: null,
    });

    // ── LOGIN REAL (descomente para reativar) ─────────────────────────────
    // try {
    //   const user = await auth.me();
    //   setState({ user, isLoading: false, error: null });
    // } catch {
    //   // 401 = não logado; qualquer outro erro também resulta em user null
    //   setState({ user: null, isLoading: false, error: null });
    // }
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
      const message = err instanceof Error ? err.message : 'Falha ao entrar. Verifique email e senha.';
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
      const message = err instanceof Error ? err.message : 'Falha ao criar conta.';
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
