import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Pool, types } from 'pg';

// node-postgres devolve colunas `date` (OID 1082) como objetos Date por padrão.
// O front-end inteiro trata issue_date/due_date/date como strings "YYYY-MM-DD"
// (comparações lexicográficas, .slice(0,7), concatenação com 'T00:00:00'), então
// sem isto os filtros por data quebram silenciosamente para qualquer linha vinda do banco.
types.setTypeParser(1082, (val) => val);

// node-postgres devolve colunas `numeric`/`decimal` (OID 1700) como string por
// padrão (pra não perder precisão em valores arbitrariamente grandes). Como aqui
// os `numeric(18,2)` são valores monetários usados em aritmética e gráficos no
// front, devolvê-los como string faz `0 + "5000.00"` virar concatenação
// ("05000.00"). parseFloat é seguro na faixa 18,2 usada para exibição.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

const scryptAsync = promisify(scrypt);

const app = new Hono();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://masia:masia_dev@localhost:5432/tenant_local',
});

const sessions = new Map<string, string>();

// ── Tabelas específicas do FinanceFlow ────────────────────────────────────────
const TABLES_WITH_OWNER = new Set<string>([
  'customers',
  'invoices',
  'transactions',
  'vendors',
  'vendor_bills',
  'budgets',
  'financial_goals',
]);

const LOOKUP_TABLES = new Set<string>([]);

const ALL_TABLES = new Set<string>();
TABLES_WITH_OWNER.forEach((t) => ALL_TABLES.add(t));
LOOKUP_TABLES.forEach((t) => ALL_TABLES.add(t));

// Valores hardcoded — não vêm do usuário, portanto seguros como ORDER BY
const LOOKUP_ORDER: Record<string, string> = {};

// ── Validação de identificadores SQL ─────────────────────────────────────────
// Rejeita qualquer coisa que não seja snake_case simples (sem aspas, ponto, hífen, espaço…)
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function assertTable(table: string): boolean {
  return ALL_TABLES.has(table);
}

function assertColumns(cols: string[]): boolean {
  return cols.length > 0 && cols.every((col) => SAFE_IDENTIFIER.test(col));
}

// ── Hashing de senha (scrypt nativo do Node — sem dependências extras) ────────
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  // timingSafeEqual evita timing-attack
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// ── CORS (allowlist fixa — não reflete Origin arbitrário) ────────────────────
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://localhost:8084',
]);

app.use('*', async (c, next) => {
  const origin = c.req.header('origin') ?? '';
  // Só permite origins conhecidas; Origins não listadas recebem localhost como fallback
  // (o browser bloqueará a resposta por não casar com o Origin real)
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'http://localhost:5173';
  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type,X-Tenant-Id');
  if (c.req.method === 'OPTIONS') return c.text('OK');
  await next();
});

// Resolve owner_id pela sessão
async function resolveOwner(c: Parameters<typeof getCookie>[0]): Promise<string | null> {
  const token = getCookie(c, 'session');
  if (token) {
    const userId = sessions.get(token);
    if (userId) return userId;
  }
  return null;
}

app.get('/health', (c) => c.json({ status: 'ok' }));

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/auth/sign-up', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { name, email, password } = body ?? {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ error: 'email e senha são obrigatórios' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'senha deve ter pelo menos 8 caracteres' }, 400);
  }

  try {
    const hashed = await hashPassword(password);
    const r = await pool.query(
      `INSERT INTO "user" (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email`,
      [name ?? email.split('@')[0], email.toLowerCase().trim(), hashed]
    );
    const user = r.rows[0];
    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return c.json({ id: user.id, name: user.name, email: user.email, role: 'admin' });
  } catch (e: any) {
    // 23505 = unique_violation (email já cadastrado) — único erro seguro de expor
    if (e.code === '23505') return c.json({ error: 'Email já cadastrado' }, 409);
    return c.json({ error: 'Erro ao criar conta' }, 500);
  }
});

app.post('/auth/sign-in', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { email, password } = body ?? {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ error: 'email e senha são obrigatórios' }, 400);
  }

  try {
    const r = await pool.query(`SELECT * FROM "user" WHERE email = $1`, [
      email.toLowerCase().trim(),
    ]);
    const user = r.rows[0];

    // Sempre executa o hash (mesmo sem usuário) para evitar timing-attack de enumeração de emails
    let valid = false;
    if (user) {
      valid = await verifyPassword(password, user.password ?? '');
    } else {
      // hash dummy para manter tempo de resposta constante
      await verifyPassword(
        password,
        'dummy:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
      );
    }

    if (!user || !valid) {
      return c.json({ error: 'Credenciais inválidas' }, 401);
    }

    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return c.json({ id: user.id, name: user.name, email: user.email, role: 'admin' });
  } catch {
    return c.json({ error: 'Erro ao autenticar' }, 500);
  }
});

app.get('/auth/me', async (c) => {
  try {
    const userId = await resolveOwner(c);
    if (!userId) return c.json(null);
    const r = await pool.query(`SELECT id, name, email FROM "user" WHERE id = $1`, [userId]);
    if (!r.rows.length) return c.json(null);
    const u = r.rows[0];
    return c.json({ id: u.id, name: u.name, email: u.email, role: 'admin' });
  } catch {
    return c.json(null);
  }
});

app.post('/auth/sign-out', (c) => {
  const token = getCookie(c, 'session');
  if (token) sessions.delete(token);
  setCookie(c, 'session', '', { maxAge: 0 });
  return c.text('OK');
});

// ── CRUD genérico (plano, sem get-by-id) ─────────────────────────────────────

app.get('/data/:table', async (c) => {
  const table = c.req.param('table');
  if (!assertTable(table)) return c.json({ error: 'Recurso não encontrado' }, 404);

  try {
    if (TABLES_WITH_OWNER.has(table)) {
      const ownerId = await resolveOwner(c);
      if (!ownerId) return c.json({ error: 'Não autorizado' }, 401);
      const r = await pool.query(
        `SELECT * FROM ${table} WHERE owner_id = $1 ORDER BY created_at DESC`,
        [ownerId]
      );
      return c.json(r.rows);
    }
    let order = '';
    if (LOOKUP_ORDER[table]) order = `ORDER BY ${LOOKUP_ORDER[table]} ASC`;
    const r = await pool.query(`SELECT * FROM ${table} ${order}`);
    return c.json(r.rows);
  } catch {
    return c.json({ error: 'Erro ao buscar dados' }, 500);
  }
});

app.post('/data/:table', async (c) => {
  const table = c.req.param('table');
  if (!assertTable(table)) return c.json({ error: 'Recurso não encontrado' }, 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'Corpo da requisição inválido' }, 400);
  }

  if (TABLES_WITH_OWNER.has(table)) {
    const ownerId = await resolveOwner(c);
    if (!ownerId) return c.json({ error: 'Não autorizado' }, 401);
    body.owner_id = ownerId;
  }

  // Remove campos com valor undefined ou string vazia que são null no schema
  // (evita erro de tipo UUID no Postgres quando o front envia "" em vez de null)
  for (const key of Object.keys(body)) {
    if (body[key] === undefined || body[key] === '') {
      body[key] = null;
    }
  }

  const cols = Object.keys(body);
  if (!assertColumns(cols)) return c.json({ error: 'Campos inválidos' }, 400);

  try {
    const vals = Object.values(body);
    const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
    const r = await pool.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph}) RETURNING *`,
      vals
    );
    return c.json(r.rows[0]);
  } catch (e: unknown) {
    console.error(`[POST /${table}] SQL error:`, e instanceof Error ? e.message : e);
    return c.json({ error: 'Erro ao criar registro' }, 500);
  }
});

app.patch('/data/:table/:id', async (c) => {
  const table = c.req.param('table');
  const id = c.req.param('id');
  if (!assertTable(table)) return c.json({ error: 'Recurso não encontrado' }, 404);

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'Corpo da requisição inválido' }, 400);
  }

  // Front não pode sobrescrever estes campos
  delete body.owner_id;
  delete body.id;

  const cols = Object.keys(body);
  if (!assertColumns(cols)) return c.json({ error: 'Campos inválidos' }, 400);

  try {
    const vals = Object.values(body);
    const set = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const touch = TABLES_WITH_OWNER.has(table) ? `, updated_at = NOW()` : '';

    if (TABLES_WITH_OWNER.has(table)) {
      const ownerId = await resolveOwner(c);
      if (!ownerId) return c.json({ error: 'Não autorizado' }, 401);
      // WHERE inclui owner_id — usuário só pode editar seus próprios registros
      const r = await pool.query(
        `UPDATE ${table} SET ${set}${touch} WHERE id = $${cols.length + 1} AND owner_id = $${cols.length + 2} RETURNING *`,
        [...vals, id, ownerId]
      );
      if (!r.rows.length) return c.json({ error: 'Não encontrado' }, 404);
      return c.json(r.rows[0]);
    }

    const r = await pool.query(
      `UPDATE ${table} SET ${set}${touch} WHERE id = $${cols.length + 1} RETURNING *`,
      [...vals, id]
    );
    if (!r.rows.length) return c.json({ error: 'Não encontrado' }, 404);
    return c.json(r.rows[0]);
  } catch (e: unknown) {
    console.error(`[PATCH /${table}/${id}] SQL error:`, e instanceof Error ? e.message : e);
    return c.json({ error: 'Erro ao atualizar registro' }, 500);
  }
});

app.delete('/data/:table/:id', async (c) => {
  const table = c.req.param('table');
  const id = c.req.param('id');
  if (!assertTable(table)) return c.json({ error: 'Recurso não encontrado' }, 404);

  try {
    if (TABLES_WITH_OWNER.has(table)) {
      const ownerId = await resolveOwner(c);
      if (!ownerId) return c.json({ error: 'Não autorizado' }, 401);
      // WHERE inclui owner_id — usuário só pode deletar seus próprios registros
      await pool.query(`DELETE FROM ${table} WHERE id = $1 AND owner_id = $2`, [id, ownerId]);
    } else {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    }
    return c.text('OK');
  } catch {
    return c.json({ error: 'Erro ao deletar registro' }, 500);
  }
});

const port = 3000;
console.log(`Mock gateway em http://localhost:${port}`);
serve({ fetch: app.fetch, port });
