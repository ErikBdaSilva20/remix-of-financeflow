// PROTECTED — contrato com o tenant-gateway. Não edite este arquivo.
// A IA só pode editar arquivos em editable.allow (veja masi.template.json).

declare global {
  interface Window {
    __MASI_GW__?: string;
    __MASI_TENANT__?: string;
  }
}

function getGatewayUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('gw') ??
    window.__MASI_GW__ ??
    import.meta.env.VITE_GATEWAY_URL ??
    'http://localhost:3000'
  );
}

function getTenantId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('t') ?? window.__MASI_TENANT__ ?? null;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const gw = getGatewayUrl();
  const tenantId = getTenantId();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  const res = await fetch(`${gw}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[gateway] ${method} ${path} → ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const db = {
  table<R = Record<string, unknown>>(name: string) {
    return {
      list: () => api<R[]>('GET', `/data/${name}`),
      create: (input: Partial<R>) => api<R>('POST', `/data/${name}`, input),
      update: (id: string, patch: Partial<R>) => api<R>('PATCH', `/data/${name}/${id}`, patch),
      remove: (id: string) => api<void>('DELETE', `/data/${name}/${id}`),
    };
  },
};

export type UserSession = {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'rep';
};

export const auth = {
  signIn: (email: string, password: string) =>
    api<UserSession>('POST', '/auth/sign-in', { email, password }),

  signUp: (email: string, password: string, name?: string) =>
    api<UserSession>('POST', '/auth/sign-up', { email, password, name }),

  signOut: () => api<void>('POST', '/auth/sign-out'),

  me: () => api<UserSession>('GET', '/auth/me'),
};
