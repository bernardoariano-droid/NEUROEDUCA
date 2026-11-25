/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Cliente e Adaptador de Sincronização Supabase
 * Permite integração fluida e bidireccional entre LocalStorage, Express e Supabase PostgreSQL
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
  SupabaseSyncPullResult,
  SupabaseSyncPushResult,
  uploadArchiveDocumentToStorage
} from './supabaseSyncCore';

export type {
  StorageUploadResult,
  SupabaseHealthResult,
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

const SUPABASE_CONFIG_KEY = 'neuroeduca_supabase_config';

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

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = normalizeSupabaseUrlSafe((import.meta as any).env?.VITE_SUPABASE_URL || '');
  const envKey = String((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

  if (typeof window === 'undefined') {
    return {
      url: envUrl,
      anonKey: envKey,
      isConnected: Boolean(envUrl && envKey),
      autoSync: false,
      lastSyncAt: null
    };
  }

  try {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SupabaseConfig>;
      const normalizedSavedUrl = normalizeSupabaseUrlSafe(parsed.url || envUrl);
      return {
        url: normalizedSavedUrl,
        anonKey: String(parsed.anonKey || envKey || '').trim(),
        isConnected: Boolean(parsed.isConnected),
        autoSync: Boolean(parsed.autoSync),
        lastSyncAt: parsed.lastSyncAt || null,
        syncStatusMessage: parsed.syncStatusMessage
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações do Supabase:', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: Boolean(envUrl && envKey),
    autoSync: Boolean(envUrl && envKey),
    lastSyncAt: null
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): SupabaseConfig {
  const normalized: SupabaseConfig = {
    ...config,
    url: normalizeSupabaseUrlSafe(config.url),
    anonKey: String(config.anonKey || '').trim()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.error('Erro ao guardar configurações do Supabase:', e);
    }
  }
  return normalized;
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';
let lastUsedToken = '';
let inMemoryAccessToken: string | null = null;

export function setSupabaseAuthSessionToken(token: string | null): void {
  inMemoryAccessToken = token ? String(token).trim() : null;
  cachedClient = null;
}

export function getSupabaseAuthSessionToken(): string | null {
  return inMemoryAccessToken;
}

export function clearSupabaseAuthSession(): void {
  inMemoryAccessToken = null;
  lastUsedToken = '';
  cachedClient = null;
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
    // Sessão Auth opcional quando conta ainda não está em auth.users
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    const normalizedUrl = normalizeSupabaseUrl(config.url);
    const currentToken = inMemoryAccessToken || '';
    if (
      cachedClient &&
      lastUsedUrl === normalizedUrl &&
      lastUsedKey === config.anonKey &&
      lastUsedToken === currentToken
    ) {
      return cachedClient;
    }

    cachedClient = createValidatedSupabaseClient(
      normalizedUrl,
      config.anonKey,
      currentToken || undefined
    );
    lastUsedUrl = normalizedUrl;
    lastUsedKey = config.anonKey;
    lastUsedToken = currentToken;
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey, autoSync })
    });
    const data = (await res.json()) as {
      success?: boolean;
      serverConfigured?: boolean;
      urlHost?: string | null;
      message?: string;
    };
    if (res.ok && data?.success) {
      serverConfiguredCached = true;
      return { success: true, urlHost: data.urlHost || null };
    }
    return { success: false, message: data?.message || 'Erro ao guardar no servidor.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erro de rede ao contactar servidor.' };
  }
}

export async function fetchServerSupabaseStatus(): Promise<ServerSupabaseStatus> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) {
      serverConfiguredCached = false;
      return { serverConfigured: false, urlHost: null, normalizedUrl: '' };
    }
    const data = (await res.json()) as ServerSupabaseStatus;
    serverConfiguredCached = Boolean(data?.serverConfigured);

    // Hidratar automaticamente qualquer navegador que abra o link partilhado
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
        Boolean(data.configuredViaEnv && (current.url !== data.publicUrl || current.anonKey !== data.publicAnonKey));

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

/**
 * Testa conectividade e verifica estado das 15 tabelas relacionais no Supabase
 */
export async function testSupabaseConnection(
  url?: string,
  anonKey?: string
): Promise<SupabaseHealthResult> {
  const cleanUrl = normalizeSupabaseUrlSafe(url || '');
  const cleanKey = String(anonKey || '').trim();

  if (cleanUrl && cleanKey) {
    const direct = await checkSupabaseTablesHealth(
      cleanUrl,
      cleanKey,
      inMemoryAccessToken || undefined
    );
    return direct;
  }

  // Fallback para Secrets configuradas no servidor Express
  try {
    const res = await fetch('/api/supabase/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {})
      },
      body: JSON.stringify({})
    });
    return (await res.json()) as SupabaseHealthResult;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erro ao verificar estado do Supabase no servidor.',
      normalizedUrl: '',
      tablesReady: 0,
      totalTables: 15,
      missingTables: [],
      tableDetails: []
    };
  }
}

/**
 * Sincroniza dados locais para o Supabase (Push)
 */
export async function syncLocalDataToSupabase(
  bundle: StorageDataBundle
): Promise<SupabaseSyncPushResult> {
  const config = getSupabaseConfig();
  const client = getSupabaseClient();

  let result: SupabaseSyncPushResult;

  if (client) {
    result = await pushBundleToSupabase(client, bundle);
  } else {
    try {
      const res = await fetch('/api/supabase/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {})
        },
        body: JSON.stringify({ bundle })
      });
      result = (await res.json()) as SupabaseSyncPushResult;
    } catch (err: any) {
      result = {
        success: false,
        syncedCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: [err?.message || 'Cliente Supabase não configurado.'],
        syncedAt: new Date().toISOString()
      };
    }
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
 * Importa dados do Supabase para o Armazenamento Local (Pull)
 */
export async function pullSupabaseDataToLocal(): Promise<SupabaseSyncPullResult> {
  const config = getSupabaseConfig();
  const client = getSupabaseClient();

  let result: SupabaseSyncPullResult;

  if (client) {
    result = await pullBundleFromSupabase(client);
  } else {
    try {
      const res = await fetch('/api/supabase/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {})
        },
        body: JSON.stringify({})
      });
      result = (await res.json()) as SupabaseSyncPullResult;
    } catch (err: any) {
      result = {
        success: false,
        bundle: null,
        pulledCount: 0,
        tableCounts: {},
        missingTables: [],
        errors: [err?.message || 'Cliente Supabase não configurado.'],
        pulledAt: new Date().toISOString()
      };
    }
  }

  if (result.success) {
    saveSupabaseConfig({
      ...config,
      isConnected: true,
      lastSyncAt: result.cloudUpdatedAt || result.pulledAt,
      syncStatusMessage: `Importados ${result.pulledCount} registos do Supabase.`
    });
  }

  return result;
}

let autoPushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBundle: StorageDataBundle | null = null;

/**
 * Agenda sincronização automática em background quando o Auto-Sync está activo
 */
export function scheduleAutoSupabasePush(bundle: StorageDataBundle): void {
  if (typeof window === 'undefined') return;
  const config = getSupabaseConfig();
  const hasBrowserCreds = Boolean(config.url && config.anonKey);
  if (!config.autoSync && !serverConfiguredCached) return;
  if (config.autoSync === false && !serverConfiguredCached) return;
  if (!hasBrowserCreds && !serverConfiguredCached) return;

  pendingBundle = bundle;
  if (autoPushTimer) {
    clearTimeout(autoPushTimer);
  }

  autoPushTimer = setTimeout(() => {
    const toSync = pendingBundle;
    pendingBundle = null;
    if (toSync) {
      syncLocalDataToSupabase(toSync).catch((err) => {
        console.warn('Sincronização automática Supabase:', err);
      });
    }
  }, 1500);
}

export interface CloudLoginResult {
  authenticated: boolean;
  inactive?: boolean;
  cloudUnavailable?: boolean;
  accessToken?: string;
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

function isRpcMissingError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return code === 'PGRST202' || code === '42883' || msg.includes('could not find the function');
}

/**
 * Verifica credenciais via RPC segura (verify_neuroeduca_login) e/ou Supabase Auth (auth.users),
 * evitando leitura anónima directa da tabela neuroeduca_accounts.
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
      // 1. Verificação segura via RPC SECURITY DEFINER (sem expor passwords via REST)
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
          await signInSupabaseAuthSession(cleanEmail, cleanPassword);
          return resObj;
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
          token || undefined
        );
        const { data: syncedRow } = await authedClient
          .from('neuroeduca_accounts')
          .select('email, full_name, role, institution_id, municipality, province, status, payload')
          .eq('id', cleanEmail)
          .maybeSingle();

        const payload = ((syncedRow?.payload || {}) as Record<string, any>);
        const status = String(syncedRow?.status || payload.status || 'activo');
        if (status === 'inactivo') {
          clearSupabaseAuthSession();
          return { authenticated: false, inactive: true };
        }

        const meta = (authData.user.user_metadata || {}) as Record<string, any>;
        return {
          authenticated: true,
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

      // 3. Compatibilidade transitória caso a função RPC ainda não tenha sido aplicada no SQL Editor
      if (isRpcMissingError(rpcErr)) {
        const { data, error } = await client
          .from('neuroeduca_accounts')
          .select('email, full_name, role, institution_id, municipality, province, status, payload')
          .eq('id', cleanEmail)
          .maybeSingle();

        if (!error && data) {
          const payload = (data.payload || {}) as Record<string, any>;
          const status = String(data.status || payload.status || 'activo');
          if (status === 'inactivo') {
            return { authenticated: false, inactive: true };
          }
          const storedPassword = String(payload.password || '').trim();
          if (storedPassword && storedPassword === cleanPassword) {
            return {
              authenticated: true,
              account: {
                email: data.email || cleanEmail,
                fullName: data.full_name || payload.fullName || cleanEmail,
                role: data.role || payload.role || 'director_geral',
                institutionId: data.institution_id || payload.institutionId || undefined,
                institutionName: payload.institutionName || undefined,
                municipality: data.municipality || payload.municipality || undefined,
                province: data.province || payload.province || undefined,
                status: 'activo'
              }
            };
          }
        }
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });
    if (!res.ok) return { authenticated: false, cloudUnavailable: true };
    const cloudRes = (await res.json()) as CloudLoginResult;
    if (cloudRes.authenticated && cloudRes.accessToken) {
      setSupabaseAuthSessionToken(cloudRes.accessToken);
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
  if (client) {
    return uploadArchiveDocumentToStorage(client, doc, fileDataBase64);
  }

  try {
    const res = await fetch('/api/supabase/storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {})
      },
      body: JSON.stringify({ document: doc, fileDataBase64 })
    });
    if (!res.ok) {
      return {
        success: false,
        storageBucket: STUDENT_DOCS_BUCKET,
        error: 'Não foi possível enviar o documento para o Supabase Storage.'
      };
    }
    return (await res.json()) as StorageUploadResult;
  } catch (err: any) {
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
    if (client) {
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
          ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {})
        },
        body: JSON.stringify({
          storagePath: doc.storagePath,
          storageBucket: doc.storageBucket || STUDENT_DOCS_BUCKET,
          downloadFileName
        })
      });
      if (res.ok) {
        const data = (await res.json()) as { success?: boolean; signedUrl?: string };
        if (data?.success && data.signedUrl) {
          return data.signedUrl;
        }
      }
    } catch {
      // Fallback para URL guardado ou cópia local
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
  if (client) {
    await deleteArchiveDocumentFromStorage(client, storagePath, storageBucket);
    return;
  }

  try {
    await fetch('/api/supabase/storage/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {})
      },
      body: JSON.stringify({ storagePath, storageBucket })
    });
  } catch {
    // Fallback silencioso
  }
}


