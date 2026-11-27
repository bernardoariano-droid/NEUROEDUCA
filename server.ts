/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Servidor Full-Stack Express, Autenticação via Cookie Seguro & API Gemini
 */

import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import {
  checkSupabaseTablesHealth,
  createValidatedSupabaseClient,
  deleteArchiveDocumentFromStorage,
  getSignedArchiveUrlFromStorage,
  normalizeSupabaseUrl,
  pullBundleFromSupabase,
  pushBundleToSupabase,
  SupabaseMutationBatch,
  syncChangesToSupabase,
  uploadArchiveDocumentToStorage
} from './src/lib/supabaseSyncCore';

dotenv.config();

const SERVER_ROOT_DIR = (() => {
  try {
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string' && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fallback seguro para CommonJS / Vercel Serverless
  }
  return process.cwd();
})();

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Inicialização segura do SDK Gemini no servidor com telemetria obrigatória
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const SESSION_COOKIE_NAME = 'ne_session';
const SESSION_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

interface ServerSupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
  updatedAt: string;
}

// Configuração opcional em memória (fallback caso não esteja em process.env)
let runtimeServerSupabaseConfig: ServerSupabaseRuntimeConfig | null = null;

function parseCookies(req: Request): Record<string, string> {
  const raw = String(req.headers.cookie || '');
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (name) {
      try {
        out[name] = decodeURIComponent(val);
      } catch {
        out[name] = val;
      }
    }
  }
  return out;
}

interface SessionCookiePayload {
  sessionToken?: string;
  accessToken?: string;
}

function readSessionCookie(req: Request): SessionCookiePayload | null {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_COOKIE_NAME];
  if (!raw) return null;
  try {
    const jsonStr = Buffer.from(raw, 'base64url').toString('utf-8');
    const parsed = JSON.parse(jsonStr) as SessionCookiePayload;
    if (!parsed || (!parsed.sessionToken && !parsed.accessToken)) return null;
    return {
      sessionToken: parsed.sessionToken ? String(parsed.sessionToken).trim() : undefined,
      accessToken: parsed.accessToken ? String(parsed.accessToken).trim() : undefined,
    };
  } catch {
    return null;
  }
}

function getNormalizedRequestHost(req: Request): string {
  const raw = String(req.get('x-forwarded-host') || req.get('host') || '');
  return raw.split(',')[0].trim().toLowerCase();
}

function buildCookieAttributes(req: Request, maxAgeSeconds: number): string[] {
  const host = getNormalizedRequestHost(req);
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  const isHttps = req.secure || proto === 'https';

  const attrs = ['Path=/', 'HttpOnly', `Max-Age=${maxAgeSeconds}`];
  if (isHttps || isLocal) {
    attrs.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  return attrs;
}

function setSessionCookie(req: Request, res: Response, tokens: SessionCookiePayload): void {
  const encoded = Buffer.from(JSON.stringify(tokens), 'utf-8').toString('base64url');
  const attrs = buildCookieAttributes(req, SESSION_COOKIE_MAX_AGE_SEC);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${encoded}; ${attrs.join('; ')}`);
}

function clearSessionCookie(req: Request, res: Response): void {
  const attrs = buildCookieAttributes(req, 0);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; ${attrs.join('; ')}`);
}

function isValidMutationOrigin(req: Request): boolean {
  const customHeader = String(req.headers['x-requested-with'] || '');
  if (customHeader !== 'NEUROEDUCA') {
    return false;
  }
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = getNormalizedRequestHost(req);
    return Boolean(originHost && requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}

// ==========================================
// ENDPOINTS DA API REST
// ==========================================

// Status e Configurações
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'NEUROEDUCA - Angola',
    geminiEnabled: Boolean(apiKey),
    persistenceMode: 'supabase_only',
    timestamp: new Date().toISOString(),
  });
});

// Proxy same-origin da Insígnia Oficial de Angola para exportação PDF sem bloqueio CORS
let cachedInsignia: { buffer: Buffer; contentType: string } | null = null;
app.get('/api/insignia', async (_req: Request, res: Response) => {
  if (cachedInsignia) {
    res.setHeader('Content-Type', cachedInsignia.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(cachedInsignia.buffer);
  }

  const remoteUrls = [
    'https://luanda.gov.ao/themes/portalweb/assets/insignia.png',
    'https://th.bing.com/th/id/R.ee6fee60d1fa04392c3c3573275bfde8?rik=gDE%2fatTNFOr1eQ&pid=ImgRaw&r=0',
  ];

  for (const url of remoteUrls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const contentType = response.headers.get('content-type') || 'image/png';
        cachedInsignia = { buffer, contentType };
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    } catch {
      // Tenta próxima origem
    }
  }

  const localFallbackCandidates = [
    path.join(process.cwd(), 'public', 'assets', 'aistudio', 'IMG-20261010-WA0062_2b38905c.jpg'),
    path.join(SERVER_ROOT_DIR, 'public', 'assets', 'aistudio', 'IMG-20261010-WA0062_2b38905c.jpg'),
  ];
  for (const localFallback of localFallbackCandidates) {
    if (fs.existsSync(localFallback)) {
      const buffer = fs.readFileSync(localFallback);
      cachedInsignia = { buffer, contentType: 'image/jpeg' };
      res.setHeader('Content-Type', 'image/jpeg');
      return res.send(buffer);
    }
  }

  return res.status(404).end();
});

// Diretório temporário de ficheiros (usado apenas como fallback caso o bucket Supabase Storage não esteja acessível)
const ARCHIVE_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), '.neuroeduca_archive')
  : path.join(SERVER_ROOT_DIR, '.neuroeduca_archive');

function ensureArchiveDir() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

function getSafeArchiveId(rawId: string): string {
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '');
}

function getExtensionFromMimeOrName(mimeType: string, fileName: string): string {
  const extFromName = path.extname(fileName || '').toLowerCase();
  if (extFromName && /^[a-z0-9.]+$/i.test(extFromName)) {
    return extFromName;
  }
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return map[mimeType] || '.bin';
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// INTEGRAÇÃO SEGURA COM SUPABASE POSTGRESQL
// ==========================================

function getSavedServerSupabaseConfig(): ServerSupabaseRuntimeConfig | null {
  return runtimeServerSupabaseConfig;
}

function persistServerSupabaseConfig(url: string, anonKey: string, autoSync = true) {
  const normalizedUrl = normalizeSupabaseUrl(url);
  const cleanKey = String(anonKey || '').trim();
  if (!normalizedUrl || !cleanKey) return null;
  const nextConfig: ServerSupabaseRuntimeConfig = {
    url: normalizedUrl,
    anonKey: cleanKey,
    autoSync: Boolean(autoSync),
    updatedAt: new Date().toISOString(),
  };
  runtimeServerSupabaseConfig = nextConfig;
  return nextConfig;
}

function resolveSupabaseCredentials(body?: { url?: string; anonKey?: string }) {
  const envUrl = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  ).trim();
  const envKey = String(
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();
  const saved = getSavedServerSupabaseConfig();

  const rawUrl = String(body?.url || envUrl || saved?.url || '').trim();
  const rawKey = String(body?.anonKey || envKey || saved?.anonKey || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!rawUrl || !rawKey) {
    return { configured: false as const, url: '', anonKey: '', serviceRoleKey: '' };
  }

  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  return {
    configured: true as const,
    url: normalizedUrl,
    anonKey: rawKey,
    serviceRoleKey,
  };
}

function extractBearerToken(req?: Request): string | undefined {
  const auth = String(req?.headers?.authorization || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  if (req) {
    return readSessionCookie(req)?.accessToken;
  }
  return undefined;
}

function extractSessionToken(req?: Request): string | undefined {
  const headerToken = String(req?.headers?.['x-ne-session'] || '').trim();
  if (headerToken) return headerToken;
  if (req) {
    return readSessionCookie(req)?.sessionToken;
  }
  return undefined;
}

function createServerSupabaseClient(
  creds: { url: string; anonKey: string; serviceRoleKey?: string },
  req?: Request
) {
  if (creds.serviceRoleKey) {
    return createValidatedSupabaseClient(creds.url, creds.serviceRoleKey);
  }
  return createValidatedSupabaseClient(creds.url, creds.anonKey, {
    accessToken: extractBearerToken(req),
    sessionToken: extractSessionToken(req),
  });
}

async function resolveAuthenticatedSessionFromTokens(
  creds: { url: string; anonKey: string; serviceRoleKey?: string },
  tokens: SessionCookiePayload
): Promise<{ authenticated: boolean; account?: any }> {
  if (tokens.sessionToken) {
    const sessionClient = createValidatedSupabaseClient(creds.url, creds.anonKey, {
      sessionToken: tokens.sessionToken,
      accessToken: tokens.accessToken,
    });
    const { data, error } = await sessionClient.rpc('get_neuroeduca_session_profile');
    if (!error && data && (data as any).authenticated && (data as any).account) {
      return { authenticated: true, account: (data as any).account };
    }
  }

  if (tokens.accessToken) {
    const authClient = createValidatedSupabaseClient(creds.url, creds.anonKey, {
      accessToken: tokens.accessToken,
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(tokens.accessToken);
    if (!userErr && userData?.user?.email) {
      const cleanEmail = userData.user.email.toLowerCase();
      const { data: accountRow } = await authClient
        .from('neuroeduca_accounts')
        .select('email, full_name, role, institution_id, municipality, province, status, payload')
        .eq('id', cleanEmail)
        .maybeSingle();

      const payload = (accountRow?.payload || {}) as Record<string, any>;
      const status = String(accountRow?.status || payload.status || 'activo');
      if (status === 'inactivo') {
        return { authenticated: false };
      }

      const meta = (userData.user.user_metadata || {}) as Record<string, any>;
      return {
        authenticated: true,
        account: {
          email: accountRow?.email || cleanEmail,
          fullName:
            accountRow?.full_name || payload.fullName || meta.full_name || meta.fullName || cleanEmail,
          role: accountRow?.role || payload.role || meta.role || 'director_geral',
          institutionId: accountRow?.institution_id || payload.institutionId || meta.institution_id || undefined,
          institutionName: payload.institutionName || undefined,
          municipality: accountRow?.municipality || payload.municipality || meta.municipality || undefined,
          province: accountRow?.province || payload.province || meta.province || undefined,
          status: 'activo',
        },
      };
    }
  }

  return { authenticated: false };
}

// Endpoints de Sessão Persistente em Cookie HttpOnly Validado pelo Supabase
app.post('/api/session', async (req: Request, res: Response) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ ok: false, message: 'Origem de pedido não autorizada.' });
  }

  const sessionToken = req.body?.sessionToken ? String(req.body.sessionToken).trim() : undefined;
  const accessToken = req.body?.accessToken ? String(req.body.accessToken).trim() : undefined;
  if (!sessionToken && !accessToken) {
    return res.status(400).json({ ok: false, message: 'Token de sessão em falta.' });
  }

  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(503).json({ ok: false, message: 'Supabase não configurado.' });
    }

    const verified = await resolveAuthenticatedSessionFromTokens(creds, {
      sessionToken,
      accessToken,
    });
    if (!verified.authenticated) {
      return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada.' });
    }

    setSessionCookie(req, res, { sessionToken, accessToken });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err?.message || 'Erro ao validar sessão.' });
  }
});

app.get('/api/session/me', async (req: Request, res: Response) => {
  const cookieTokens = readSessionCookie(req);
  if (!cookieTokens) {
    return res.json({ authenticated: false });
  }

  try {
    const creds = resolveSupabaseCredentials();
    if (!creds.configured) {
      return res.json({ authenticated: false });
    }

    const verified = await resolveAuthenticatedSessionFromTokens(creds, cookieTokens);
    if (!verified.authenticated || !verified.account) {
      clearSessionCookie(req, res);
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      account: verified.account,
      ...(cookieTokens.sessionToken ? { sessionToken: cookieTokens.sessionToken } : {}),
      ...(cookieTokens.accessToken ? { accessToken: cookieTokens.accessToken } : {}),
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

app.post('/api/session/logout', async (req: Request, res: Response) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ ok: false, message: 'Origem de pedido não autorizada.' });
  }

  const logoutToken = extractSessionToken(req);
  if (logoutToken) {
    try {
      const creds = resolveSupabaseCredentials(req.body);
      if (creds.configured) {
        const client = createValidatedSupabaseClient(creds.url, creds.anonKey, {
          sessionToken: logoutToken,
        });
        await client.rpc('logout_neuroeduca_session', { p_token: logoutToken });
      }
    } catch {
      // Prossegue remoção do cookie
    }
  }

  clearSessionCookie(req, res);
  return res.json({ ok: true });
});

app.get('/api/supabase/status', (_req: Request, res: Response) => {
  try {
    const rawEnvUrl = String(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    ).trim();
    const rawEnvKey = String(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    ).trim();
    const saved = getSavedServerSupabaseConfig();

    const configuredViaEnv = Boolean(rawEnvUrl && rawEnvKey);
    const activeUrl = rawEnvUrl || saved?.url || '';
    const activeKey = rawEnvKey || saved?.anonKey || '';

    if (!activeUrl || !activeKey) {
      return res.json({
        serverConfigured: false,
        configuredViaEnv: false,
        urlHost: null,
        normalizedUrl: '',
        publicUrl: '',
        publicAnonKey: '',
      });
    }

    const normalizedUrl = normalizeSupabaseUrl(activeUrl);
    const parsed = new URL(normalizedUrl);

    return res.json({
      serverConfigured: true,
      configuredViaEnv,
      urlHost: parsed.hostname,
      normalizedUrl,
      publicUrl: normalizedUrl,
      publicAnonKey: activeKey,
    });
  } catch (err: any) {
    return res.json({
      serverConfigured: false,
      configuredViaEnv: false,
      urlHost: null,
      normalizedUrl: '',
      publicUrl: '',
      publicAnonKey: '',
      error: err?.message || 'Configuração Supabase inválida no servidor.',
    });
  }
});

app.get('/api/supabase/bootstrap-status', async (_req: Request, res: Response) => {
  try {
    const creds = resolveSupabaseCredentials();
    if (!creds.configured) {
      return res.json({ hasAccounts: true, bootstrapRequired: false, cloudUnavailable: true });
    }
    const anonClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data, error } = await anonClient.rpc('check_neuroeduca_bootstrap_status');
    if (error || !data) {
      return res.json({ hasAccounts: true, bootstrapRequired: false });
    }
    return res.json({
      hasAccounts: Boolean((data as any).hasAccounts),
      bootstrapRequired: Boolean((data as any).bootstrapRequired),
    });
  } catch {
    return res.json({ hasAccounts: true, bootstrapRequired: false });
  }
});

app.post('/api/supabase/bootstrap-super-admin', async (req: Request, res: Response) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ authenticated: false, error: 'Origem não autorizada.' });
  }

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const fullName = String(req.body?.fullName || '').trim();
    const password = String(req.body?.password || '').trim();
    if (!email || !fullName || !password) {
      return res.status(400).json({ authenticated: false, error: 'Dados obrigatórios em falta.' });
    }

    const creds = resolveSupabaseCredentials();
    if (!creds.configured) {
      return res.status(503).json({ authenticated: false, error: 'Supabase não configurado.' });
    }

    const anonClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data, error } = await anonClient.rpc('bootstrap_neuroeduca_super_admin', {
      p_email: email,
      p_full_name: fullName,
      p_password: password,
    });
    if (error) {
      return res.status(400).json({ authenticated: false, error: error.message });
    }

    const resultObj = (data || {}) as { authenticated?: boolean; sessionToken?: string };
    if (resultObj.authenticated && resultObj.sessionToken) {
      setSessionCookie(req, res, { sessionToken: resultObj.sessionToken });
    }
    return res.json(resultObj);
  } catch (err: any) {
    return res.status(500).json({
      authenticated: false,
      error: err?.message || 'Erro ao criar Super Administrador inicial.',
    });
  }
});

app.post('/api/supabase/config', (req: Request, res: Response) => {
  try {
    const rawUrl = String(req.body?.url || '').trim();
    const rawKey = String(req.body?.anonKey || '').trim();
    const autoSync = req.body?.autoSync !== false;

    if (!rawUrl || !rawKey) {
      return res.status(400).json({
        success: false,
        message: 'Forneça o URL do projecto Supabase e a Chave Pública (anon/publishable).',
      });
    }

    const saved = persistServerSupabaseConfig(rawUrl, rawKey, autoSync);
    if (!saved) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais Supabase inválidas.',
      });
    }

    const parsed = new URL(saved.url);
    return res.json({
      success: true,
      serverConfigured: true,
      urlHost: parsed.hostname,
      normalizedUrl: saved.url,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'URL do Supabase inválido.',
    });
  }
});

app.post('/api/supabase/test', async (req: Request, res: Response) => {
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        message: 'Forneça o URL e a Chave Pública do Supabase ou configure-os em Settings > Secrets.',
      });
    }

    const health = await checkSupabaseTablesHealth(
      creds.url,
      creds.serviceRoleKey || creds.anonKey,
      creds.serviceRoleKey
        ? undefined
        : {
            accessToken: extractBearerToken(req),
            sessionToken: extractSessionToken(req),
          }
    );
    if (health.success && req.body?.url && req.body?.anonKey) {
      persistServerSupabaseConfig(creds.url, creds.anonKey, true);
    }
    return res.json(health);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'Erro ao validar ligação ao Supabase.',
    });
  }
});

app.post('/api/supabase/mutate', async (req: Request, res: Response) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      errors: ['Origem de pedido não autorizada.'],
      syncedAt: new Date().toISOString(),
    });
  }

  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        errors: ['Supabase não configurado.'],
        syncedAt: new Date().toISOString(),
      });
    }

    const sessionToken = extractSessionToken(req);
    const accessToken = extractBearerToken(req);
    if (!sessionToken && !accessToken) {
      return res.status(401).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        errors: ['Sessão autenticada obrigatória para gravar no Supabase.'],
        syncedAt: new Date().toISOString(),
      });
    }

    const batch = (req.body || {}) as SupabaseMutationBatch;
    const client = createServerSupabaseClient(creds, req);
    const result = await syncChangesToSupabase(client, batch);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      errors: [err?.message || 'Erro ao sincronizar alterações com o Supabase.'],
      syncedAt: new Date().toISOString(),
    });
  }
});

app.post('/api/supabase/push', async (req: Request, res: Response) => {
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: ['Supabase não configurado. Configure o URL e a Chave Pública primeiro.'],
        syncedAt: new Date().toISOString(),
      });
    }

    if (req.body?.url && req.body?.anonKey) {
      persistServerSupabaseConfig(creds.url, creds.anonKey, true);
    }

    const bundle = req.body?.bundle;
    if (!bundle || typeof bundle !== 'object') {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: ['Bundle de dados em falta para envio ao Supabase.'],
        syncedAt: new Date().toISOString(),
      });
    }

    const client = createServerSupabaseClient(creds, req);
    const result = await pushBundleToSupabase(client, bundle, {
      pruneMissing: Boolean(req.body?.pruneMissing),
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      tableCounts: {},
      missingTables: [],
      errors: [err?.message || 'Erro ao enviar dados para o Supabase.'],
      syncedAt: new Date().toISOString(),
    });
  }
});

app.post('/api/supabase/pull', async (req: Request, res: Response) => {
  try {
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({
        success: false,
        bundle: null,
        pulledCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: ['Supabase não configurado. Configure o URL e a Chave Pública primeiro.'],
        pulledAt: new Date().toISOString(),
      });
    }

    const client = createServerSupabaseClient(creds, req);
    const result = await pullBundleFromSupabase(client);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      bundle: null,
      pulledCount: 0,
      tableCounts: {},
      missingTables: [],
      errors: [err?.message || 'Erro ao importar dados do Supabase.'],
      pulledAt: new Date().toISOString(),
    });
  }
});

app.post('/api/supabase/announcement-read', async (req: Request, res: Response) => {
  if (!isValidMutationOrigin(req)) {
    return res.status(403).json({ success: false });
  }
  try {
    const announcementId = String(req.body?.announcementId || '').trim();
    const readKey = String(req.body?.readKey || '').trim();
    if (!announcementId || !readKey) {
      return res.status(400).json({ success: false });
    }
    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.status(400).json({ success: false });
    }
    const client = createServerSupabaseClient(creds, req);
    const { data, error } = await client.rpc('mark_neuroeduca_announcement_read', {
      p_announcement_id: announcementId,
      p_read_key: readKey,
    });
    return res.json({ success: !error && Boolean(data) });
  } catch {
    return res.status(500).json({ success: false });
  }
});

app.post('/api/supabase/login', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    if (!email || !password) {
      return res.status(400).json({ authenticated: false, message: 'E-mail e palavra-passe obrigatórios.' });
    }

    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ authenticated: false, cloudUnavailable: true });
    }

    const anonClient = createValidatedSupabaseClient(creds.url, creds.anonKey);

    // 1. Verificação segura via RPC verify_neuroeduca_login (emite sessionToken + verifica hash bcrypt)
    const { data: rpcData, error: rpcErr } = await anonClient.rpc('verify_neuroeduca_login', {
      p_email: email,
      p_password: password,
    });

    if (!rpcErr && rpcData) {
      const resultObj = rpcData as {
        authenticated?: boolean;
        inactive?: boolean;
        sessionToken?: string;
        account?: any;
      };
      if (resultObj.inactive) {
        return res.json({ authenticated: false, inactive: true });
      }
      if (resultObj.authenticated && resultObj.account) {
        let accessToken: string | undefined;
        try {
          const { data: authSessionData } = await anonClient.auth.signInWithPassword({ email, password });
          accessToken = authSessionData?.session?.access_token;
        } catch {
          // Opcional caso o utilizador utilize apenas RPC verify_neuroeduca_login
        }
        setSessionCookie(req, res, {
          sessionToken: resultObj.sessionToken,
          accessToken,
        });
        return res.json({
          authenticated: true,
          account: resultObj.account,
          ...(resultObj.sessionToken ? { sessionToken: resultObj.sessionToken } : {}),
          ...(accessToken ? { accessToken } : {}),
        });
      }
    }

    // 2. Autenticação oficial via Supabase Auth (auth.users)
    const authClient = createValidatedSupabaseClient(creds.url, creds.anonKey);
    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (!authErr && authData?.user) {
      const accessToken = authData.session?.access_token;
      const accountReader = creds.serviceRoleKey
        ? createValidatedSupabaseClient(creds.url, creds.serviceRoleKey)
        : createValidatedSupabaseClient(creds.url, creds.anonKey, { accessToken });

      const { data: accountRow } = await accountReader
        .from('neuroeduca_accounts')
        .select('email, full_name, role, institution_id, municipality, province, status, payload')
        .eq('id', email)
        .maybeSingle();

      const payload = (accountRow?.payload || {}) as Record<string, any>;
      const status = String(accountRow?.status || payload.status || 'activo');
      if (status === 'inactivo') {
        return res.json({ authenticated: false, inactive: true });
      }

      if (accessToken) {
        setSessionCookie(req, res, { accessToken });
      }

      const meta = (authData.user.user_metadata || {}) as Record<string, any>;
      return res.json({
        authenticated: true,
        ...(accessToken ? { accessToken } : {}),
        account: {
          email: accountRow?.email || authData.user.email || email,
          fullName:
            accountRow?.full_name ||
            payload.fullName ||
            meta.full_name ||
            meta.fullName ||
            email,
          role: accountRow?.role || payload.role || meta.role || 'director_geral',
          institutionId:
            accountRow?.institution_id || payload.institutionId || meta.institution_id || undefined,
          institutionName: payload.institutionName || undefined,
          municipality:
            accountRow?.municipality || payload.municipality || meta.municipality || undefined,
          province: accountRow?.province || payload.province || meta.province || undefined,
          status: 'activo',
        },
      });
    }

    // 3. Fallback administrativo estritamente quando existe SUPABASE_SERVICE_ROLE_KEY no servidor
    if (creds.serviceRoleKey) {
      const reader = createValidatedSupabaseClient(creds.url, creds.serviceRoleKey);
      const { data } = await reader
        .from('neuroeduca_accounts')
        .select('email, full_name, role, institution_id, municipality, province, status, payload')
        .eq('id', email)
        .maybeSingle();

      if (data) {
        const payload = (data.payload || {}) as Record<string, any>;
        const storedPassword = String(payload.password || '').trim();
        const status = String(data.status || payload.status || 'activo');
        if (status === 'inactivo') {
          return res.json({ authenticated: false, inactive: true });
        }
        if (storedPassword && storedPassword === password) {
          return res.json({
            authenticated: true,
            account: {
              email: data.email || email,
              fullName: data.full_name || payload.fullName || email,
              role: data.role || payload.role || 'director_geral',
              institutionId: data.institution_id || payload.institutionId || undefined,
              institutionName: payload.institutionName || undefined,
              municipality: data.municipality || payload.municipality || undefined,
              province: data.province || payload.province || undefined,
              status: 'activo',
            },
          });
        }
      }
    }

    return res.json({ authenticated: false });
  } catch {
    return res.json({ authenticated: false });
  }
});

app.post('/api/supabase/storage/upload', async (req: Request, res: Response) => {
  try {
    const { document, fileDataBase64 } = req.body || {};
    if (!document?.id || !fileDataBase64) {
      return res.status(400).json({ success: false, error: 'Documento ou ficheiro em falta.' });
    }

    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ success: false, cloudUnavailable: true, error: 'Supabase não configurado.' });
    }

    const client = createServerSupabaseClient(creds, req);
    const result = await uploadArchiveDocumentToStorage(client, document, fileDataBase64);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao enviar ficheiro para o Supabase Storage.',
    });
  }
});

app.post('/api/supabase/storage/signed-url', async (req: Request, res: Response) => {
  try {
    const { storagePath, storageBucket, downloadFileName } = req.body || {};
    if (!storagePath) {
      return res.status(400).json({ success: false, error: 'Caminho do ficheiro em falta.' });
    }

    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ success: false, cloudUnavailable: true });
    }

    const client = createServerSupabaseClient(creds, req);
    const result = await getSignedArchiveUrlFromStorage(
      client,
      storagePath,
      storageBucket,
      3600,
      downloadFileName
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao gerar URL assinado para o documento.',
    });
  }
});

app.post('/api/supabase/storage/delete', async (req: Request, res: Response) => {
  try {
    const { storagePath, storageBucket } = req.body || {};
    if (!storagePath) {
      return res.json({ success: true });
    }

    const creds = resolveSupabaseCredentials(req.body);
    if (!creds.configured) {
      return res.json({ success: false, cloudUnavailable: true });
    }

    const client = createServerSupabaseClient(creds, req);
    const result = await deleteArchiveDocumentFromStorage(client, storagePath, storageBucket);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao eliminar ficheiro do Supabase Storage.',
    });
  }
});

// Fallback temporário de ficheiro em disco (sem store JSON) caso o bucket Supabase Storage não esteja pronto
app.post('/api/archive/upload', (req: Request, res: Response) => {
  try {
    const { document, fileDataBase64 } = req.body || {};
    if (!document || !document.id || !fileDataBase64) {
      return res.status(400).json({ error: 'Dados do documento ou ficheiro em falta.' });
    }

    ensureArchiveDir();
    const safeId = getSafeArchiveId(document.id);
    const base64Clean = String(fileDataBase64).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const ext = getExtensionFromMimeOrName(document.mimeType, document.fileName);
    const filePath = path.join(ARCHIVE_DIR, `${safeId}${ext}`);
    fs.writeFileSync(filePath, buffer);

    const savedDoc = {
      ...document,
      fileUrl: `/api/archive/file/${safeId}`,
      fileSizeBytes: buffer.length,
      dataUrl: undefined,
    };

    return res.json({ success: true, document: savedDoc });
  } catch (err: any) {
    console.error('Erro ao guardar ficheiro no Arquivo Digital:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao guardar ficheiro.' });
  }
});

app.get('/api/archive/file/:id', (req: Request, res: Response) => {
  try {
    const safeId = getSafeArchiveId(req.params.id);

    if (fs.existsSync(ARCHIVE_DIR)) {
      const files = fs.readdirSync(ARCHIVE_DIR);
      const match = files.find((f) => f === safeId || f.startsWith(`${safeId}.`));
      if (match) {
        const fullPath = path.join(ARCHIVE_DIR, match);
        const ext = path.extname(match).toLowerCase();
        const fallbackMime =
          ext === '.pdf'
            ? 'application/pdf'
            : ext === '.png'
            ? 'image/png'
            : ext === '.webp'
            ? 'image/webp'
            : ext === '.svg'
            ? 'image/svg+xml'
            : 'image/jpeg';
        const disposition = req.query.download === '1' ? 'attachment' : 'inline';
        const downloadName = match.replace(/"/g, '');
        res.setHeader('Content-Type', fallbackMime);
        res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
        return res.sendFile(fullPath);
      }
    }

    const fileName = escapeXml(`${safeId}.svg`);
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="580" viewBox="0 0 840 580">
  <rect width="840" height="580" fill="#ffffff"/>
  <rect x="24" y="24" width="792" height="532" rx="12" fill="#f8fafc" stroke="#0073b7" stroke-width="3"/>
  <rect x="24" y="24" width="792" height="84" rx="12" fill="#0073b7"/>
  <text x="420" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">REPÚBLICA DE ANGOLA · ARQUIVO DIGITAL ESCOLAR</text>
  <text x="420" y="88" font-family="Arial, sans-serif" font-size="14" fill="#e0f2fe" text-anchor="middle">Documento Escolar Digitalizado</text>
  <rect x="64" y="160" width="712" height="290" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="420" y="290" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0073b7" text-anchor="middle">DOCUMENTO DIGITALIZADO ARQUIVADO</text>
  <text x="420" y="325" font-family="Arial, sans-serif" font-size="13" fill="#475569" text-anchor="middle">Referência: ${fileName}</text>
  <text x="420" y="360" font-family="Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Disponível para consulta no Supabase Storage</text>
  <text x="64" y="520" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Registo NEUROEDUCA Angola · Arquivo Digital Seguro</text>
</svg>`;
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeId}.svg"`);
    return res.send(sampleSvg);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao abrir documento.' });
  }
});

app.delete('/api/archive/file/:id', (req: Request, res: Response) => {
  try {
    const safeId = getSafeArchiveId(req.params.id);
    if (fs.existsSync(ARCHIVE_DIR)) {
      const files = fs.readdirSync(ARCHIVE_DIR);
      files
        .filter((f) => f === safeId || f.startsWith(`${safeId}.`))
        .forEach((f) => {
          try {
            fs.unlinkSync(path.join(ARCHIVE_DIR, f));
          } catch {
            // Ignora erro ao remover ficheiro individual
          }
        });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao eliminar ficheiro.' });
  }
});

// Assistente Pedagógico com IA Gemini (Server-side)
app.post('/api/gemini/pedagogical-assistant', async (req: Request, res: Response) => {
  const {
    subsystemCode,
    gradeLevel,
    subjectName,
    topic,
    subtopic,
    lessonDurationMinutes = 45,
    assistantTask = 'plano_aula',
  } = req.body;

  if (!apiKey || !aiClient) {
    return res.status(503).json({
      error: 'API Gemini não configurada no servidor. Verifique a chave em Settings > Secrets.',
    });
  }

  try {
    let taskInstruction = '';
    if (assistantTask === 'plano_aula') {
      taskInstruction = `
Elabora um PLANO DE AULA OFICIAL completo no modelo do Ministério da Educação de Angola (MED) e INIDE:
1. Cabeçalho Oficial (República de Angola, Ministério da Educação, Subsistema: ${subsystemCode}, Classe: ${gradeLevel}, Disciplina: ${subjectName}, Tema: ${topic}, Duração: ${lessonDurationMinutes} min).
2. Objectivos da Aula:
   - Objectivo Instrutivo / Cognitivo (o que os alunos irão aprender e assimilar).
   - Objectivo Educativo / Formativo (valores morais, cidadania e atitudes).
3. Meios e Recursos Didácticos (quadro, giz/marcador, manual escolar do aluno aprovado pelo INIDE, cartazes, etc.).
4. Métodos de Ensino (Expositivo, Elaboração Conjunta, Trabalho Independente, Prático).
5. Fases Didácticas da Aula (tabela/secções detalhadas com tempo, actividade do professor e actividade do aluno):
   - I. Introdução e Motivação (revisão da aula anterior, motivação, apresentação do tema).
   - II. Mediação e Assimilação da Nova Matéria (explicação detalhada do conteúdo com exemplos do quotidiano angolano).
   - III. Domínio e Consolidação (exercícios práticos no caderno e no quadro).
   - IV. Controlo e Avaliação (verificação formativa da aprendizagem).
6. Tarefa para Casa / Trabalho Individual.
7. Observação Pedagógica (alinhada aos critérios oficiais do INIDE).
`;
    } else if (assistantTask === 'exercicios') {
      taskInstruction = `
Elabora uma FICHA DE ACTIVIDADES E EXERCÍCIOS PEDAGÓGICOS completa para a disciplina de ${subjectName}, ${gradeLevel}, sobre o tema "${topic}" ${subtopic ? `e subtema "${subtopic}"` : ''}:
- Inclui 5 a 8 questões pedagógicas progressivas (do nível de reprodução ao de aplicação prática).
- Contextualiza os enunciados à realidade social, geográfica e cultural de Angola.
- Fornece no final a CHAVE DE RESOLUÇÃO / CORRECÇÃO detalhada para o professor.
`;
    } else if (assistantTask === 'avaliacao') {
      taskInstruction = `
Elabora uma PROVA DE AVALIAÇÃO TRIMESTRAL (NPT / Prova do Professor) oficial:
- Disciplina: ${subjectName}, Classe: ${gradeLevel}, Subsistema: ${subsystemCode}.
- Tema / Conteúdos avaliados: ${topic}.
- Cotação total de 20 valores (especificar a pontuação de cada questão).
- Matriz de Avaliação com competências avaliadas.
- Chave de correcção e critérios de classificação rigorosos.
`;
    } else {
      taskInstruction = `
Elabora um PLANO DE RECUPERAÇÃO PEDAGÓGICA para estudantes com dificuldades de aproveitamento em ${subjectName} (${gradeLevel}):
- Diagnóstico das dificuldades comuns no tema "${topic}".
- Estratégias diferenciadas de intervenção em sala de aula e reforço.
- 4 exercícios de recuperação com tutoria e apoio dos encarregados de educação.
`;
    }

    const systemInstruction = `És o Assistente Pedagógico Inteligente do NEUROEDUCA, especialista oficial no Sistema de Educação e Ensino da República de Angola (MED, INIDE, INETP, MESCTI).
Utilizas sempre a terminologia pedagógica angolana (Classes, Trimestres, Pautas, Mini-pautas, MAC, NPP, NPT, Encarregados de Educação, etc.).
Quando sugerires planos de aula ou actividades, respeitas rigorosamente as matrizes curriculares do INIDE.
Apresenta o conteúdo formatado com clareza em Markdown profissional, com secções organizadas, tabelas e avisos práticos.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: taskInstruction,
      config: {
        systemInstruction,
      },
    });

    const resultText = response.text || 'Não foi possível gerar a resposta.';
    res.json({
      success: true,
      resultText,
      subsystemCode,
      gradeLevel,
      subjectName,
      topic,
      assistantTask,
    });
  } catch (error: any) {
    console.error('Erro na API Gemini:', error);
    res.status(500).json({
      error: error.message || 'Erro ao processar pedido com IA pedagógica.',
    });
  }
});

// ==========================================
// INTEGRAÇÃO COM VITE NO MODO DESENVOLVIMENTO
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(SERVER_ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NEUROEDUCA rodando em http://localhost:${PORT}`);
    console.log(`🇦🇴 Sistema de Gestão Escolar de Angola configurado (100% Supabase)`);
  });
}

if (!IS_VERCEL) {
  startServer();
}

export { app };
export default app;
