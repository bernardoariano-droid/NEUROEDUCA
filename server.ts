/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Servidor Full-Stack Express & API Gemini para Angola
 */

import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  checkSupabaseTablesHealth,
  createValidatedSupabaseClient,
  deleteArchiveDocumentFromStorage,
  getSignedArchiveUrlFromStorage,
  normalizeSupabaseUrl,
  pullBundleFromSupabase,
  pushBundleToSupabase,
  uploadArchiveDocumentToStorage
} from './src/lib/supabaseSyncCore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Arquivo de persistência local para dados do sistema
const DATA_FILE = path.join(__dirname, '.neuroeduca_store.json');

function readStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
}

function writeStore(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar persistência:', err);
  }
}

// ==========================================
// ENDPOINTS DA API REST
// ==========================================

// Status e Configurações
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'NEUROEDUCA - Angola',
    geminiEnabled: Boolean(apiKey),
    localStoreExists: fs.existsSync(DATA_FILE),
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

  const localFallback = path.join(__dirname, 'public', 'assets', 'aistudio', 'IMG-20261010-WA0062_2b38905c.jpg');
  if (fs.existsSync(localFallback)) {
    const buffer = fs.readFileSync(localFallback);
    cachedInsignia = { buffer, contentType: 'image/jpeg' };
    res.setHeader('Content-Type', 'image/jpeg');
    return res.send(buffer);
  }

  return res.status(404).end();
});

// Diretório de armazenamento de ficheiros do Arquivo Digital Escolar
const ARCHIVE_DIR = path.join(__dirname, '.neuroeduca_archive');

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

// Sincronização e Persistência de Dados (Memória Localhost em .neuroeduca_store.json)
app.get('/api/sync', (req: Request, res: Response) => {
  const store = readStore();
  res.json({
    ...store,
    serverStored: fs.existsSync(DATA_FILE),
  });
});

app.post('/api/sync', (req: Request, res: Response) => {
  const existing = readStore();
  const incoming = req.body || {};
  const merged = {
    ...existing,
    ...incoming,
    updatedAt: new Date().toISOString(),
  };
  writeStore(merged);
  res.json({ success: true, savedAt: merged.updatedAt });
});

// ==========================================
// INTEGRAÇÃO SEGURA COM SUPABASE POSTGRESQL
// ==========================================

function resolveSupabaseCredentials(body?: { url?: string; anonKey?: string }) {
  const rawUrl = String(
    body?.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  ).trim();
  const rawKey = String(
    body?.anonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();
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
  if (!auth.toLowerCase().startsWith('bearer ')) return undefined;
  const token = auth.slice(7).trim();
  return token || undefined;
}

function createServerSupabaseClient(
  creds: { url: string; anonKey: string; serviceRoleKey?: string },
  req?: Request
) {
  if (creds.serviceRoleKey) {
    return createValidatedSupabaseClient(creds.url, creds.serviceRoleKey);
  }
  return createValidatedSupabaseClient(creds.url, creds.anonKey, extractBearerToken(req));
}

app.get('/api/supabase/status', (_req: Request, res: Response) => {
  try {
    const rawEnvUrl = String(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    ).trim();
    const rawEnvKey = String(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    ).trim();

    if (!rawEnvUrl || !rawEnvKey) {
      return res.json({
        serverConfigured: false,
        urlHost: null,
        normalizedUrl: '',
      });
    }

    const normalizedUrl = normalizeSupabaseUrl(rawEnvUrl);
    const parsed = new URL(normalizedUrl);

    return res.json({
      serverConfigured: true,
      urlHost: parsed.hostname,
      normalizedUrl,
    });
  } catch (err: any) {
    return res.json({
      serverConfigured: false,
      urlHost: null,
      normalizedUrl: '',
      error: err?.message || 'Configuração Supabase inválida no servidor.',
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
      creds.serviceRoleKey ? undefined : extractBearerToken(req)
    );
    return res.json(health);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'Erro ao validar ligação ao Supabase.',
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
        tableCounts: {},
        missingTables: [],
        errors: ['Supabase não configurado. Configure o URL e a Chave Pública primeiro.'],
        syncedAt: new Date().toISOString(),
      });
    }

    const store = readStore();
    const bundle = req.body?.bundle || store;
    const client = createServerSupabaseClient(creds, req);
    const result = await pushBundleToSupabase(client, bundle);

    if (result.success) {
      writeStore({
        ...store,
        ...(req.body?.bundle || {}),
        cloudLastSyncAt: result.syncedAt,
        updatedAt: store.updatedAt || result.syncedAt,
      });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      syncedCount: 0,
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

    if (result.success && result.bundle) {
      const existing = readStore();
      writeStore({
        ...existing,
        ...result.bundle,
        cloudLastSyncAt: result.cloudUpdatedAt || result.pulledAt,
        updatedAt: result.cloudUpdatedAt || result.pulledAt,
      });
    }

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

    // 1. Verificação segura via RPC verify_neuroeduca_login (nunca expõe passwords via REST)
    const { data: rpcData, error: rpcErr } = await anonClient.rpc('verify_neuroeduca_login', {
      p_email: email,
      p_password: password,
    });

    if (!rpcErr && rpcData) {
      const resultObj = rpcData as { authenticated?: boolean; inactive?: boolean; account?: any };
      if (resultObj.inactive) {
        return res.json({ authenticated: false, inactive: true });
      }
      if (resultObj.authenticated && resultObj.account) {
        let accessToken: string | undefined;
        try {
          const { data: authSessionData } = await anonClient.auth.signInWithPassword({ email, password });
          accessToken = authSessionData?.session?.access_token;
        } catch {
          // Opcional caso o utilizador ainda não esteja em auth.users
        }
        return res.json({
          authenticated: true,
          account: resultObj.account,
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
        : createValidatedSupabaseClient(creds.url, creds.anonKey, accessToken);

      const { data: accountRow } = await accountReader
        .from('neuroeduca_accounts')
        .select('email, full_name, role, institution_id, municipality, province, status, payload')
        .eq('id', email)
        .maybeSingle();

      const payload = ((accountRow?.payload || {}) as Record<string, any>);
      const status = String(accountRow?.status || payload.status || 'activo');
      if (status === 'inactivo') {
        return res.json({ authenticated: false, inactive: true });
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

    // 3. Fallback administrativo (apenas com service_role ou se RPC ainda não tiver sido aplicada)
    const rpcMsg = String(rpcErr?.message || '').toLowerCase();
    const rpcMissing =
      rpcErr?.code === 'PGRST202' ||
      rpcErr?.code === '42883' ||
      rpcMsg.includes('could not find the function');

    if (creds.serviceRoleKey || rpcMissing) {
      const reader = creds.serviceRoleKey
        ? createValidatedSupabaseClient(creds.url, creds.serviceRoleKey)
        : anonClient;
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
      error: err?.message || 'Erro ao enviar ficheiro para o Supabase Storage.'
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
      error: err?.message || 'Erro ao gerar URL assinado para o documento.'
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
      error: err?.message || 'Erro ao eliminar ficheiro do Supabase Storage.'
    });
  }
});

// Upload de ficheiro para o Arquivo Digital Escolar
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

    const store = readStore();
    const currentArchive = Array.isArray(store.digitalArchive) ? store.digitalArchive : [];
    store.digitalArchive = [
      savedDoc,
      ...currentArchive.filter((item: any) => item.id !== savedDoc.id),
    ];
    store.updatedAt = new Date().toISOString();
    writeStore(store);

    return res.json({ success: true, document: savedDoc });
  } catch (err: any) {
    console.error('Erro ao guardar ficheiro no Arquivo Digital:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao guardar ficheiro.' });
  }
});

// Visualização e Download de ficheiro do Arquivo Digital
app.get('/api/archive/file/:id', (req: Request, res: Response) => {
  try {
    const safeId = getSafeArchiveId(req.params.id);
    const store = readStore();
    const currentArchive = Array.isArray(store.digitalArchive) ? store.digitalArchive : [];
    const docMeta = currentArchive.find((item: any) => getSafeArchiveId(item.id) === safeId);

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
        const mimeType = docMeta?.mimeType || fallbackMime;
        const disposition = req.query.download === '1' ? 'attachment' : 'inline';
        const downloadName = (docMeta?.fileName || match).replace(/"/g, '');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
        return res.sendFile(fullPath);
      }
    }

    // Pré-visualização oficial gerada para documentos de demonstração inicial
    const docTitle = escapeXml(docMeta?.title || 'Documento Escolar Digitalizado');
    const stuName = escapeXml(docMeta?.studentName || 'Estudante Matriculado');
    const stuProc = escapeXml(docMeta?.studentProcessNumber || '2026/0001');
    const stuClass = escapeXml(docMeta?.className || 'Turma Escolar');
    const uploader = escapeXml(docMeta?.uploadedByName || 'Encarregado de Educação');
    const fileName = escapeXml(docMeta?.fileName || `${safeId}.svg`);
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="580" viewBox="0 0 840 580">
  <rect width="840" height="580" fill="#ffffff"/>
  <rect x="24" y="24" width="792" height="532" rx="12" fill="#f8fafc" stroke="#0073b7" stroke-width="3"/>
  <rect x="24" y="24" width="792" height="84" rx="12" fill="#0073b7"/>
  <text x="420" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">REPÚBLICA DE ANGOLA · ARQUIVO DIGITAL ESCOLAR</text>
  <text x="420" y="88" font-family="Arial, sans-serif" font-size="14" fill="#e0f2fe" text-anchor="middle">${docTitle}</text>
  <text x="64" y="155" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">Aluno(a): ${stuName}</text>
  <text x="64" y="185" font-family="Arial, sans-serif" font-size="14" fill="#334155">N.º de Processo: ${stuProc}   |   Turma: ${stuClass}</text>
  <text x="64" y="215" font-family="Arial, sans-serif" font-size="14" fill="#334155">Enviado por: ${uploader}</text>
  <rect x="64" y="245" width="712" height="230" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="420" y="340" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0073b7" text-anchor="middle">DOCUMENTO DIGITALIZADO ARQUIVADO</text>
  <text x="420" y="372" font-family="Arial, sans-serif" font-size="13" fill="#475569" text-anchor="middle">Ficheiro de Referência: ${fileName}</text>
  <text x="420" y="404" font-family="Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Disponível para consulta do Professor e Administrador Escolar</text>
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

// Remoção de ficheiro do Arquivo Digital
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
    const store = readStore();
    if (Array.isArray(store.digitalArchive)) {
      store.digitalArchive = store.digitalArchive.filter(
        (item: any) => getSafeArchiveId(item.id) !== safeId
      );
      store.updatedAt = new Date().toISOString();
      writeStore(store);
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
    learningObjectives,
    lessonDurationMinutes = 45,
    assistantTask = 'plano_aula', // 'plano_aula' | 'exercicios' | 'avaliacao' | 'recuperacao'
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
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Modo de produção: serve arquivos compilados da pasta dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NEUROEDUCA rodando em http://localhost:${PORT}`);
    console.log(`🇦🇴 Sistema de Gestão Escolar de Angola configurado`);
  });
}

startServer();
