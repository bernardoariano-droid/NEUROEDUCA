/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Cliente e Adaptador de Sincronização Supabase (100% Nuvem)
 * Opera exclusivamente com Supabase PostgreSQL e sessão autenticada por cookie HttpOnly/memória.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { StorageDataBundle } from '../services/storageService';
import {
  checkSupabaseTablesHealth,
  createValidatedSupabaseClient,
  deleteArchiveDocumentFromStorage,
  getSignedArchiveUrlFromStorage,
  normalizeSupabaseUrl,
  pullBundleFromSupabase,
  pushBundleToSupabase,
  StorageUploadResult,
  STUDENT_DOCS_BUCKET,
  SupabaseHealthResult,
  SupabaseMutateResult,
  SupabaseMutationBatch,
  SupabaseSyncPullResult,
  SupabaseSyncPushResult,
  syncChangesToSupabase,
  uploadArchiveDocumentToStorage
} from './supabaseSyncCore';

export type {
  StorageUploadResult,
  SupabaseHealthResult,
  SupabaseMutateResult,
  SupabaseMutationBatch,
  SupabaseSyncPullResult,
  SupabaseSyncPushResult
};

export { normalizeSupabaseUrl, STUDENT_DOCS_BUCKET };

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  autoSync: boolean;
  lastSyncAt: string | null;
  syncStatusMessage?: string;
}

export interface ServerSupabaseStatus {
  serverConfigured: boolean;
  configuredViaEnv?: boolean;
  urlHost: string | null;
  normalizedUrl: string;
  publicUrl?: string;
  publicAnonKey?: string;
}

export interface CloudLoginResult {
  authenticated: boolean;
  inactive?: boolean;
  cloudUnavailable?: boolean;
  accessToken?: string;
  sessionToken?: string;
  error?: string;
  account?: {
    email: string;
    fullName: string;
    role: string;
    institutionId?: string;
    institutionName?: string;
    municipality?: string;
    province?: string;
    status: 'activo' | 'inactivo';
  };
}

export interface SupabaseBootstrapStatus {
  hasAccounts: boolean;
  bootstrapRequired: boolean;
  cloudUnavailable?: boolean;
}

declare const __PUBLIC_SUPABASE_URL__: string;
declare const __PUBLIC_SUPABASE_ANON_KEY__: string;

export function normalizeSupabaseUrlSafe(rawUrl: string): string {
  try {
    return normalizeSupabaseUrl(rawUrl);
  } catch {
    return String(rawUrl || '')
      .trim()
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/+$/, '');
  }
}

function getEnvSupabaseDefaults(): { url: string; anonKey: string } {
  const injectedUrl =
    typeof __PUBLIC_SUPABASE_URL__ !== 'undefined' ? __PUBLIC_SUPABASE_URL__ : '';
  const injectedKey =
    typeof __PUBLIC_SUPABASE_ANON_KEY__ !== 'undefined' ? __PUBLIC_SUPABASE_ANON_KEY__ : '';
  const envUrl = normalizeSupabaseUrlSafe(
    (import.meta as any).env?.VITE_SUPABASE_URL || injectedUrl || ''
  );
  const envKey = String(
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || injectedKey || ''
  ).trim();
  return { url: envUrl, anonKey: envKey };
}

let runtimeSupabaseConfig: SupabaseConfig | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  const { url: envUrl, anonKey: envKey } = getEnvSupabaseDefaults();

  if (!runtimeSupabaseConfig) {
    runtimeSupabaseConfig = {
      url: envUrl,
      anonKey: envKey,
      isConnected: Boolean(envUrl && envKey),
      autoSync: Boolean(envUrl && envKey),
      lastSyncAt: null
    };
  } else if (envUrl && envKey && (!runtimeSupabaseConfig.url || !runtimeSupabaseConfig.anonKey)) {
    runtimeSupabaseConfig = {
      ...runtimeSupabaseConfig,
      url: envUrl,
      anonKey: envKey,
      isConnected: true,
      autoSync: true
    };
  }

  return { ...runtimeSupabaseConfig };
}

export function saveSupabaseConfig(config: SupabaseConfig): SupabaseConfig {
  const normalized: SupabaseConfig = {
    ...config,
    url: normalizeSupabaseUrlSafe(config.url),
    anonKey: String(config.anonKey || '').trim()
  };
  runtimeSupabaseConfig = normalized;
  cachedClient = null;
  return { ...normalized };
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';
let lastUsedAccessToken = '';
let lastUsedSessionToken = '';
let inMemoryAccessToken: string | null = null;
let inMemorySessionToken: string | null = null;

export function setSupabaseAuthSessionToken(token: string | null): void {
  inMemoryAccessToken = token ? String(token).trim() : null;
  cachedClient = null;
}

export function getSupabaseAuthSessionToken(): string | null {
  return inMemoryAccessToken;
}

export function setSupabaseSessionToken(token: string | null): void {
  inMemorySessionToken = token ? String(token).trim() : null;
  cachedClient = null;
}

export function getSupabaseSessionToken(): string | null {
  return inMemorySessionToken;
}

export function clearSupabaseAuthSession(): void {
  inMemoryAccessToken = null;
  inMemorySessionToken = null;
  lastUsedAccessToken = '';
  lastUsedSessionToken = '';
  cachedClient = null;
}

function getAuthFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (inMemoryAccessToken) {
    headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  if (inMemorySessionToken) {
    headers['x-ne-session'] = inMemorySessionToken;
  }
  return headers;
}

export async function signInSupabaseAuthSession(
  email: string,
  password: string
): Promise<string | null> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  if (!cleanEmail || !cleanPassword) return null;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    const authClient = createValidatedSupabaseClient(
      normalizeSupabaseUrl(config.url),
      config.anonKey
    );
    const { data, error } = await authClient.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });
    if (!error && data?.session?.access_token) {
      setSupabaseAuthSessionToken(data.session.access_token);
      return data.session.access_token;
    }
  } catch {
    // Sessão Auth opcional quando a conta usa verificação RPC + token de sessão NEUROEDUCA
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    const normalizedUrl = normalizeSupabaseUrl(config.url);
    const currentAccessToken = inMemoryAccessToken || '';
    const currentSessionToken = inMemorySessionToken || '';
    if (
      cachedClient &&
      lastUsedUrl === normalizedUrl &&
      lastUsedKey === config.anonKey &&
      lastUsedAccessToken === currentAccessToken &&
      lastUsedSessionToken === currentSessionToken
    ) {
      return cachedClient;
    }

    cachedClient = createValidatedSupabaseClient(normalizedUrl, config.anonKey, {
      accessToken: currentAccessToken || undefined,
      sessionToken: currentSessionToken || undefined
    });
    lastUsedUrl = normalizedUrl;
    lastUsedKey = config.anonKey;
    lastUsedAccessToken = currentAccessToken;
    lastUsedSessionToken = currentSessionToken;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

let serverConfiguredCached = false;

export function isServerSupabaseConfigured(): boolean {
  return serverConfiguredCached;
}

export async function saveServerSupabaseConfig(
  url: string,
  anonKey: string,
  autoSync = true
): Promise<{ success: boolean; urlHost?: string | null; message?: string }> {
  const cleanUrl = normalizeSupabaseUrlSafe(url);
  const cleanKey = String(anonKey || '').trim();
  if (!cleanUrl || !cleanKey) {
    return { success: false, message: 'URL e chave pública obrigatórios.' };
  }

  try {
    const res = await fetch('/api/supabase/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'NEUROEDUCA'
      },
      credentials: 'include',
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey, autoSync })
    });
    const data = await safeParseJsonResponse<{
      success?: boolean;
      serverConfigured?: boolean;
      urlHost?: string | null;
      message?: string;
    }>(res);
    if (res.ok && data?.success) {
      serverConfiguredCached = true;
      return { success: true, urlHost: data.urlHost || null };
    }
    return {
      success: false,
      message: data?.message || `Erro HTTP ${res.status} ao guardar no servidor.`
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro de rede ao contactar servidor.' };
  }
}

export async function fetchServerSupabaseStatus(): Promise<ServerSupabaseStatus> {
  try {
    const res = await fetch('/api/supabase/status', { credentials: 'include' });
    if (!res.ok) {
      serverConfiguredCached = false;
      return { serverConfigured: false, urlHost: null, normalizedUrl: '' };
    }
    const data = await safeParseJsonResponse<ServerSupabaseStatus>(res);
    if (!data) {
      serverConfiguredCached = false;
      return { serverConfigured: false, urlHost: null, normalizedUrl: '' };
    }
    serverConfiguredCached = Boolean(data?.serverConfigured);

    if (
      typeof window !== 'undefined' &&
      data?.serverConfigured &&
      data?.publicUrl &&
      data?.publicAnonKey
    ) {
      const current = getSupabaseConfig();
      const needsHydration =
        !current.url ||
        !current.anonKey ||
        Boolean(
          data.configuredViaEnv &&
            (current.url !== data.publicUrl || current.anonKey !== data.publicAnonKey)
        );

      if (needsHydration) {
        saveSupabaseConfig({
          ...current,
          url: data.publicUrl,
          anonKey: data.publicAnonKey,
          isConnected: true,
          autoSync: true,
          lastSyncAt: current.lastSyncAt || null,
          syncStatusMessage: current.syncStatusMessage || 'Ligação permanente à nuvem activa.'
        });
      }
    }

    return data;
  } catch {
    serverConfiguredCached = false;
    return { serverConfigured: false, urlHost: null, normalizedUrl: '' };
  }
}

function shouldUseServerProxy(): boolean {
  return typeof window !== 'undefined' && (Boolean(inMemorySessionToken) || serverConfiguredCached);
}

function getConfigBodyFields(): { url?: string; anonKey?: string } {
  const cfg = getSupabaseConfig();
  return {
    ...(cfg.url ? { url: normalizeSupabaseUrlSafe(cfg.url) } : {}),
    ...(cfg.anonKey ? { anonKey: cfg.anonKey } : {})
  };
}

async function safeParseJsonResponse<T>(res: Response): Promise<T | null> {
  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Testa conectividade e verifica estado das 18 tabelas relacionais no Supabase
 */
export async function testSupabaseConnection(
  url?: string,
  anonKey?: string
): Promise<SupabaseHealthResult> {
  const cleanUrl = normalizeSupabaseUrlSafe(url || '');
  const cleanKey = String(anonKey || '').trim();

  if (typeof window !== 'undefined' && (serverConfiguredCached || inMemorySessionToken)) {
    try {
      const res = await fetch('/api/supabase/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthFetchHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({
          ...(cleanUrl ? { url: cleanUrl } : {}),
          ...(cleanKey ? { anonKey: cleanKey } : {}),
          ...(!cleanUrl || !cleanKey ? getConfigBodyFields() : {})
        })
      });
      if (res.ok || res.status === 400) {
        const parsed = await safeParseJsonResponse<SupabaseHealthResult>(res);
        if (parsed) return parsed;
      }
    } catch {
      // Fallback para cliente directo se /api não responder
    }
  }

  if (cleanUrl && cleanKey) {
    return checkSupabaseTablesHealth(cleanUrl, cleanKey, {
      accessToken: inMemoryAccessToken || undefined,
      sessionToken: !inMemoryAccessToken ? inMemorySessionToken || undefined : undefined
    });
  }

  try {
    const res = await fetch('/api/supabase/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthFetchHeaders()
      },
      credentials: 'include',
      body: JSON.stringify(getConfigBodyFields())
    });
    const parsed = await safeParseJsonResponse<SupabaseHealthResult>(res);
    if (parsed) return parsed;
    return {
      success: false,
      message: `Erro HTTP ${res.status} ao verificar estado do Supabase no servidor.`,
      normalizedUrl: '',
      tablesReady: 0,
      totalTables: 17,
      missingTables: [],
      tableDetails: []
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erro ao verificar estado do Supabase no servidor.',
      normalizedUrl: '',
      tablesReady: 0,
      totalTables: 17,
      missingTables: [],
      tableDetails: []
    };
  }
}

/**
 * Sincronização incremental imediata (Upserts + Deletes explícitos no PostgreSQL)
 */
export async function syncChangesToSupabaseClient(
  batch: SupabaseMutationBatch
): Promise<SupabaseMutateResult> {
  const config = getSupabaseConfig();
  const client = getSupabaseClient();
  let result: SupabaseMutateResult | null = null;

  if (shouldUseServerProxy() || !client) {
    let proxyFallbackError: string | null = null;
    try {
      const res = await fetch('/api/supabase/mutate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'NEUROEDUCA',
          ...getAuthFetchHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ ...batch, ...getConfigBodyFields() })
      });
      if (res.status !== 404) {
        const parsed = await safeParseJsonResponse<SupabaseMutateResult>(res);
        if (parsed) {
          result = parsed;
        } else {
          proxyFallbackError = `Erro HTTP ${res.status} no servidor da API ao gravar no Supabase.`;
        }
      }
    } catch (err: any) {
      proxyFallbackError = err?.message || 'Erro de rede ao contactar servidor Supabase.';
    }

    if (!result && proxyFallbackError && (!client || !inMemoryAccessToken)) {
      result = {
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        errors: [proxyFallbackError],
        syncedAt: new Date().toISOString()
      };
    }
  }

  if (!result && client) {
    result = await syncChangesToSupabase(client, batch);
  }

  if (!result) {
    result = {
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      errors: ['Cliente Supabase não configurado.'],
      syncedAt: new Date().toISOString()
    };
  }

  if (result.success) {
    saveSupabaseConfig({
      ...config,
      isConnected: true,
      lastSyncAt: result.syncedAt,
      syncStatusMessage: `Sincronização em tempo real: ${result.syncedCount} gravado(s), ${result.deletedCount} eliminado(s).`
    });
  }

  return result;
}

/**
 * Sincroniza um bundle completo com o Supabase (Push + reconciliação opcional de eliminações)
 */
export async function syncLocalDataToSupabase(
  bundle: StorageDataBundle,
  options?: { pruneMissing?: boolean }
): Promise<SupabaseSyncPushResult> {
  const config = getSupabaseConfig();
  const client = getSupabaseClient();
  let result: SupabaseSyncPushResult | null = null;

  if (shouldUseServerProxy() || !client) {
    let proxyFallbackError: string | null = null;
    try {
      const res = await fetch('/api/supabase/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'NEUROEDUCA',
          ...getAuthFetchHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({
          bundle,
          pruneMissing: Boolean(options?.pruneMissing),
          ...getConfigBodyFields()
        })
      });
      if (res.status !== 404) {
        const parsed = await safeParseJsonResponse<SupabaseSyncPushResult>(res);
        if (parsed) {
          result = parsed;
        } else {
          proxyFallbackError = `Erro HTTP ${res.status} no servidor da API ao enviar dados para o Supabase.`;
        }
      }
    } catch (err: any) {
      proxyFallbackError = err?.message || 'Erro de rede ao contactar servidor Supabase.';
    }

    if (!result && proxyFallbackError && (!client || !inMemoryAccessToken)) {
      result = {
        success: false,
        syncedCount: 0,
        deletedCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: [proxyFallbackError],
        syncedAt: new Date().toISOString()
      };
    }
  }

  if (!result && client) {
    result = await pushBundleToSupabase(client, bundle, options);
  }

  if (!result) {
    result = {
      success: false,
      syncedCount: 0,
      deletedCount: 0,
      tableCounts: {},
      missingTables: [],
      errors: ['Cliente Supabase não configurado.'],
      syncedAt: new Date().toISOString()
    };
  }

  if (result.syncedCount > 0 || result.success) {
    saveSupabaseConfig({
      ...config,
      isConnected: result.success ? true : config.isConnected,
      lastSyncAt: result.syncedAt,
      syncStatusMessage: result.success
        ? `Sincronizados ${result.syncedCount} registos com sucesso.`
        : `Sincronização parcial: ${result.syncedCount} registos enviados.`
    });
  }

  return result;
}

/**
 * Carrega todos os dados directamente do Supabase PostgreSQL (Pull)
 */
export async function pullSupabaseDataToLocal(): Promise<SupabaseSyncPullResult> {
  const config = getSupabaseConfig();
  const client = getSupabaseClient();
  let result: SupabaseSyncPullResult | null = null;

  if (shouldUseServerProxy() || !client) {
    let proxyFallbackError: string | null = null;
    try {
      const res = await fetch('/api/supabase/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthFetchHeaders()
        },
        credentials: 'include',
        body: JSON.stringify(getConfigBodyFields())
      });
      if (res.status !== 404) {
        const parsed = await safeParseJsonResponse<SupabaseSyncPullResult>(res);
        if (parsed) {
          result = parsed;
        } else {
          proxyFallbackError = `Erro HTTP ${res.status} no servidor da API ao carregar dados do Supabase.`;
        }
      }
    } catch (err: any) {
      proxyFallbackError = err?.message || 'Erro de rede ao carregar dados do Supabase.';
    }

    if (!result && proxyFallbackError && (!client || !inMemoryAccessToken)) {
      result = {
        success: false,
        bundle: null,
        pulledCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: [proxyFallbackError],
        pulledAt: new Date().toISOString()
      };
    }
  }

  if (!result && client) {
    result = await pullBundleFromSupabase(client);
  }

  if (!result) {
    result = {
      success: false,
      bundle: null,
      pulledCount: 0,
      tableCounts: {},
      missingTables: [],
      errors: ['Cliente Supabase não configurado.'],
      pulledAt: new Date().toISOString()
    };
  }

  if (result.success) {
    saveSupabaseConfig({
      ...config,
      isConnected: true,
      lastSyncAt: result.cloudUpdatedAt || result.pulledAt,
      syncStatusMessage: `Carregados ${result.pulledCount} registos do Supabase.`
    });
  }

  return result;
}

function isRpcMissingError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return code === 'PGRST202' || code === '42883' || msg.includes('could not find the function');
}

/**
 * Persiste o cookie HttpOnly da sessão autenticada no navegador via servidor
 */
export async function persistBrowserSessionCookie(tokens: {
  sessionToken?: string | null;
  accessToken?: string | null;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!tokens.sessionToken && !tokens.accessToken) return false;

  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'NEUROEDUCA'
      },
      credentials: 'include',
      body: JSON.stringify({
        sessionToken: tokens.sessionToken || undefined,
        accessToken: tokens.accessToken || undefined,
        ...getConfigBodyFields()
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Restaura a sessão autenticada a partir do cookie HttpOnly validado contra o Supabase
 */
export async function restoreSessionFromSupabase(): Promise<CloudLoginResult> {
  if (typeof window === 'undefined') return { authenticated: false };

  try {
    const res = await fetch('/api/session/me', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) return { authenticated: false };

    const data = await safeParseJsonResponse<CloudLoginResult>(res);
    if (data?.authenticated && data?.account) {
      if (data.sessionToken) setSupabaseSessionToken(data.sessionToken);
      if (data.accessToken) setSupabaseAuthSessionToken(data.accessToken);
      return data;
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Encerra a sessão no Supabase, limpa os tokens em memória e remove o cookie HttpOnly
 */
export async function logoutFromSupabase(): Promise<void> {
  const client = getSupabaseClient();
  const currentSessionToken = inMemorySessionToken;
  const authHeaders = getAuthFetchHeaders();

  if (client && currentSessionToken && !shouldUseServerProxy()) {
    try {
      await client.rpc('logout_neuroeduca_session', { p_token: currentSessionToken });
    } catch {
      // Continua limpeza no servidor
    }
  }

  clearSupabaseAuthSession();

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/session/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'NEUROEDUCA',
          ...authHeaders
        },
        credentials: 'include',
        body: JSON.stringify(getConfigBodyFields())
      });
    } catch {
      // Ignora erro de rede ao terminar sessão
    }
  }
}

/**
 * Verifica se já existem contas cadastradas no Supabase (ou se requer configuração inicial)
 */
export async function checkSupabaseBootstrapStatus(): Promise<SupabaseBootstrapStatus> {
  let client = getSupabaseClient();
  if (!client) {
    await fetchServerSupabaseStatus();
    client = getSupabaseClient();
  }

  if (client) {
    try {
      const { data, error } = await client.rpc('check_neuroeduca_bootstrap_status');
      if (!error && data) {
        return {
          hasAccounts: Boolean((data as any).hasAccounts),
          bootstrapRequired: Boolean((data as any).bootstrapRequired)
        };
      }
    } catch {
      // Tenta via servidor Express
    }
  }

  try {
    const res = await fetch('/api/supabase/bootstrap-status', { credentials: 'include' });
    if (!res.ok) {
      return { hasAccounts: true, bootstrapRequired: false, cloudUnavailable: true };
    }
    const data = await safeParseJsonResponse<SupabaseBootstrapStatus>(res);
    if (!data) {
      return { hasAccounts: true, bootstrapRequired: false, cloudUnavailable: true };
    }
    return data;
  } catch {
    return { hasAccounts: true, bootstrapRequired: false, cloudUnavailable: true };
  }
}

/**
 * Cria o primeiro Super Administrador num projecto Supabase recém-inicializado
 */
export async function bootstrapSuperAdminInSupabase(
  email: string,
  fullName: string,
  password: string
): Promise<CloudLoginResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(fullName || '').trim();
  const cleanPassword = String(password || '').trim();
  if (!cleanEmail || !cleanName || !cleanPassword) {
    return { authenticated: false, error: 'Preencha nome, e-mail e palavra-passe.' };
  }

  let client = getSupabaseClient();
  if (!client) {
    await fetchServerSupabaseStatus();
    client = getSupabaseClient();
  }

  if (client) {
    try {
      const { data, error } = await client.rpc('bootstrap_neuroeduca_super_admin', {
        p_email: cleanEmail,
        p_full_name: cleanName,
        p_password: cleanPassword
      });
      if (error) {
        return { authenticated: false, error: error.message };
      }
      const resObj = (data || {}) as CloudLoginResult;
      if (resObj.authenticated && resObj.account) {
        if (resObj.sessionToken) setSupabaseSessionToken(resObj.sessionToken);
        await persistBrowserSessionCookie({
          sessionToken: resObj.sessionToken,
          accessToken: inMemoryAccessToken
        });
      }
      return resObj;
    } catch (err: any) {
      return { authenticated: false, error: err?.message || 'Erro ao inicializar Super Administrador.' };
    }
  }

  try {
    const res = await fetch('/api/supabase/bootstrap-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'NEUROEDUCA'
      },
      credentials: 'include',
      body: JSON.stringify({ email: cleanEmail, fullName: cleanName, password: cleanPassword })
    });
    const data = await safeParseJsonResponse<CloudLoginResult>(res);
    if (!data) {
      return {
        authenticated: false,
        error: `Erro HTTP ${res.status} ao contactar servidor para inicialização.`
      };
    }
    if (data.authenticated && data.sessionToken) {
      setSupabaseSessionToken(data.sessionToken);
      await persistBrowserSessionCookie({ sessionToken: data.sessionToken });
    }
    return data;
  } catch (err: any) {
    return { authenticated: false, error: err?.message || 'Erro de rede ao contactar servidor.' };
  }
}

/**
 * Marca um comunicado como lido no Supabase via RPC segura
 */
export async function markAnnouncementReadInSupabase(
  announcementId: string,
  readKey: string
): Promise<boolean> {
  if (shouldUseServerProxy()) {
    try {
      const res = await fetch('/api/supabase/announcement-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'NEUROEDUCA',
          ...getAuthFetchHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ announcementId, readKey, ...getConfigBodyFields() })
      });
      if (res.ok) {
        const data = await safeParseJsonResponse<{ success?: boolean }>(res);
        return Boolean(data?.success);
      }
    } catch {
      // Fallback para cliente directo
    }
  }

  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { data, error } = await client.rpc('mark_neuroeduca_announcement_read', {
      p_announcement_id: announcementId,
      p_read_key: readKey
    });
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Verifica credenciais via RPC segura (verify_neuroeduca_login) e/ou Supabase Auth (auth.users).
 */
export async function verifySupabaseAccountLogin(
  email: string,
  password: string
): Promise<CloudLoginResult> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  if (!cleanEmail || !cleanPassword) return { authenticated: false };

  let client = getSupabaseClient();
  let config = getSupabaseConfig();
  if (!client || !config.url || !config.anonKey) {
    await fetchServerSupabaseStatus();
    client = getSupabaseClient();
    config = getSupabaseConfig();
  }

  if (client && config.url && config.anonKey) {
    try {
      const { data: rpcData, error: rpcErr } = await client.rpc('verify_neuroeduca_login', {
        p_email: cleanEmail,
        p_password: cleanPassword
      });

      if (!rpcErr && rpcData) {
        const resObj = rpcData as CloudLoginResult;
        if (resObj.inactive) {
          return { authenticated: false, inactive: true };
        }
        if (resObj.authenticated && resObj.account) {
          if (resObj.sessionToken) {
            setSupabaseSessionToken(resObj.sessionToken);
          }
          const accessToken = await signInSupabaseAuthSession(cleanEmail, cleanPassword);
          await persistBrowserSessionCookie({
            sessionToken: resObj.sessionToken,
            accessToken
          });
          return {
            ...resObj,
            ...(accessToken ? { accessToken } : {})
          };
        }
      }

      // 2. Autenticação oficial via Supabase Auth (auth.users)
      const authClient = createValidatedSupabaseClient(
        normalizeSupabaseUrl(config.url),
        config.anonKey
      );
      const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (!authErr && authData?.user) {
        const token = authData.session?.access_token || null;
        if (token) {
          setSupabaseAuthSessionToken(token);
        }

        const authedClient = createValidatedSupabaseClient(
          normalizeSupabaseUrl(config.url),
          config.anonKey,
          { accessToken: token || undefined }
        );
        const { data: syncedRow } = await authedClient
          .from('neuroeduca_accounts')
          .select('email, full_name, role, institution_id, municipality, province, status, payload')
          .eq('id', cleanEmail)
          .maybeSingle();

        const payload = (syncedRow?.payload || {}) as Record<string, any>;
        const status = String(syncedRow?.status || payload.status || 'activo');
        if (status === 'inactivo') {
          clearSupabaseAuthSession();
          return { authenticated: false, inactive: true };
        }

        await persistBrowserSessionCookie({ accessToken: token });

        const meta = (authData.user.user_metadata || {}) as Record<string, any>;
        return {
          authenticated: true,
          accessToken: token || undefined,
          account: {
            email: syncedRow?.email || authData.user.email || cleanEmail,
            fullName:
              syncedRow?.full_name ||
              payload.fullName ||
              meta.full_name ||
              meta.fullName ||
              cleanEmail,
            role: syncedRow?.role || payload.role || meta.role || 'director_geral',
            institutionId:
              syncedRow?.institution_id || payload.institutionId || meta.institution_id || undefined,
            institutionName: payload.institutionName || undefined,
            municipality: syncedRow?.municipality || payload.municipality || meta.municipality || undefined,
            province: syncedRow?.province || payload.province || meta.province || undefined,
            status: 'activo'
          }
        };
      }

      if (isRpcMissingError(rpcErr)) {
        return {
          authenticated: false,
          error:
            'Funções de autenticação RPC não encontradas no Supabase. Execute o script SQL completo (/supabase-neuroeduca-sync.sql) no SQL Editor.'
        };
      }

      return { authenticated: false };
    } catch (err: any) {
      return {
        authenticated: false,
        error: err?.message || 'Erro de ligação ao consultar o Supabase.'
      };
    }
  }

  try {
    const res = await fetch('/api/supabase/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'NEUROEDUCA'
      },
      credentials: 'include',
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });
    if (!res.ok) return { authenticated: false, cloudUnavailable: true };
    const cloudRes = await safeParseJsonResponse<CloudLoginResult>(res);
    if (!cloudRes) return { authenticated: false, cloudUnavailable: true };
    if (cloudRes.authenticated) {
      if (cloudRes.sessionToken) setSupabaseSessionToken(cloudRes.sessionToken);
      if (cloudRes.accessToken) setSupabaseAuthSessionToken(cloudRes.accessToken);
      await persistBrowserSessionCookie({
        sessionToken: cloudRes.sessionToken,
        accessToken: cloudRes.accessToken
      });
    }
    return cloudRes;
  } catch {
    return { authenticated: false, cloudUnavailable: true };
  }
}

/**
 * Faz upload directo de documentos pessoais do aluno (Fotografia, Cartão de Vacinas, BI, Certidão)
 * para o bucket neuroeduca-student-docs do Supabase Storage.
 */
export async function uploadStudentDocumentToSupabaseStorage(
  doc: {
    id: string;
    institutionId?: string;
    studentId?: string;
    category?: string;
    mimeType?: string;
    fileName?: string;
  },
  fileDataBase64: string
): Promise<StorageUploadResult> {
  const client = getSupabaseClient();
  if (client && !shouldUseServerProxy()) {
    return uploadArchiveDocumentToStorage(client, doc, fileDataBase64);
  }

  try {
    const res = await fetch('/api/supabase/storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthFetchHeaders()
      },
      credentials: 'include',
      body: JSON.stringify({ document: doc, fileDataBase64, ...getConfigBodyFields() })
    });
    if (!res.ok) {
      return {
        success: false,
        storageBucket: STUDENT_DOCS_BUCKET,
        error: 'Não foi possível enviar o documento para o Supabase Storage.'
      };
    }
    const parsed = await safeParseJsonResponse<StorageUploadResult>(res);
    if (parsed) return parsed;
    return {
      success: false,
      storageBucket: STUDENT_DOCS_BUCKET,
      error: `Erro HTTP ${res.status} ao enviar o documento para o Supabase Storage.`
    };
  } catch (err: any) {
    if (client && !inMemorySessionToken) {
      return uploadArchiveDocumentToStorage(client, doc, fileDataBase64);
    }
    return {
      success: false,
      storageBucket: STUDENT_DOCS_BUCKET,
      error: err?.message || 'Erro de rede ao contactar Supabase Storage.'
    };
  }
}

/**
 * Gera um URL assinado temporário para ficheiros armazenados no bucket privado neuroeduca-student-docs.
 */
export async function resolveSignedStudentDocumentUrl(
  doc: {
    id?: string;
    storagePath?: string;
    storageBucket?: string;
    fileUrl?: string;
    dataUrl?: string;
  },
  downloadFileName?: string
): Promise<string> {
  if (doc.storagePath) {
    const client = getSupabaseClient();
    if (client && !shouldUseServerProxy()) {
      const signed = await getSignedArchiveUrlFromStorage(
        client,
        doc.storagePath,
        doc.storageBucket || STUDENT_DOCS_BUCKET,
        3600,
        downloadFileName
      );
      if (signed.success && signed.signedUrl) {
        return signed.signedUrl;
      }
    }

    try {
      const res = await fetch('/api/supabase/storage/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthFetchHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({
          storagePath: doc.storagePath,
          storageBucket: doc.storageBucket || STUDENT_DOCS_BUCKET,
          downloadFileName,
          ...getConfigBodyFields()
        })
      });
      if (res.ok) {
        const data = await safeParseJsonResponse<{ success?: boolean; signedUrl?: string }>(res);
        if (data?.success && data.signedUrl) {
          return data.signedUrl;
        }
      }
    } catch {
      // Fallback para URL guardado ou cópia do servidor
    }
  }

  if (doc.dataUrl) return doc.dataUrl;
  if (doc.fileUrl) {
    if (downloadFileName && doc.fileUrl.startsWith('/api/archive/file/')) {
      return doc.fileUrl.includes('?') ? `${doc.fileUrl}&download=1` : `${doc.fileUrl}?download=1`;
    }
    return doc.fileUrl;
  }
  const fallback = `/api/archive/file/${doc.id || ''}`;
  return downloadFileName ? `${fallback}?download=1` : fallback;
}

/**
 * Remove um ficheiro do bucket neuroeduca-student-docs do Supabase Storage quando o documento é apagado.
 */
export async function deleteStudentDocumentFromSupabaseStorage(
  storagePath?: string,
  storageBucket = STUDENT_DOCS_BUCKET
): Promise<void> {
  if (!storagePath) return;
  const client = getSupabaseClient();
  if (client && !shouldUseServerProxy()) {
    await deleteArchiveDocumentFromStorage(client, storagePath, storageBucket);
    return;
  }

  try {
    await fetch('/api/supabase/storage/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthFetchHeaders()
      },
      credentials: 'include',
      body: JSON.stringify({ storagePath, storageBucket, ...getConfigBodyFields() })
    });
  } catch {
    // Fallback silencioso
  }
}
