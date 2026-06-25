import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { ParticleBackground } from "./ParticleBackground";

type Mode = 'signin' | 'signup';

function LoginForm() {
  const { signIn, signUp, isLoading, error, clearError } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name || undefined);
      }
    } catch {
      // erro já foi setado no contexto
    }
  };

  const switchMode = () => {
    clearError();
    setMode(m => (m === 'signin' ? 'signup' : 'signin'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative px-4">
      <ParticleBackground />
      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Logo / título */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">FinanceFlow</h1>
          <p className="text-sm text-muted-foreground">Dashboard financeiro completo</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">
              {mode === 'signin' ? 'Entrar na conta' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin'
                ? 'Digite seu email e senha para continuar.'
                : 'O primeiro usuário se torna administrador.'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome (opcional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={8}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                {mode === 'signin' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {mode === 'signin' ? 'Criar agora' : 'Entrar'}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
