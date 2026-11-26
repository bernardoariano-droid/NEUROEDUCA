/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Núcleo Partilhado de Validação e Sincronização Supabase
 * Utilizado tanto no servidor Express quanto no adaptador cliente.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { StorageDataBundle } from '../services/storageService';

export const STUDENT_DOCS_BUCKET = 'neuroeduca-student-docs';

export const NEUROEDUCA_ENTITY_TABLES = [
  { key: 'institutions', table: 'neuroeduca_institutions', label: 'Instituições' },
  { key: 'teachers', table: 'neuroeduca_teachers', label: 'Docentes' },
  { key: 'classes', table: 'neuroeduca_classes', label: 'Turmas' },
  { key: 'subjects', table: 'neuroeduca_subjects', label: 'Disciplinas' },
  { key: 'students', table: 'neuroeduca_students', label: 'Alunos' },
  { key: 'grades', table: 'neuroeduca_grades', label: 'Notas & Pautas' },
  { key: 'invoices', table: 'neuroeduca_invoices', label: 'Facturas & Propinas' },
  { key: 'attendance', table: 'neuroeduca_attendance', label: 'Frequência' },
  { key: 'digitalArchive', table: 'neuroeduca_digital_archive', label: 'Arquivo Digital' },
  {
    key: 'financialNotifications',
    table: 'neuroeduca_financial_notifications',
    label: 'Notificações Financeiras'
  },
  { key: 'announcements', table: 'neuroeduca_announcements', label: 'Comunicados Oficiais' },
  { key: 'accounts', table: 'neuroeduca_accounts', label: 'Contas de Acesso' },
  { key: 'schoolUsers', table: 'neuroeduca_school_users', label: 'Utilizadores' },
  { key: 'subscriptionPlans', table: 'neuroeduca_subscription_plans', label: 'Planos SaaS' },
  { key: 'auditLogs', table: 'neuroeduca_audit_logs', label: 'Auditoria' },
  {
    key: 'psychopedagogicalProtocols',
    table: 'neuroeduca_psychopedagogical_protocols',
    label: 'Protocolos Psicopedagógicos'
  },
  {
    key: 'psychopedagogicalCases',
    table: 'neuroeduca_psychopedagogical_cases',
    label: 'Dossiês Psicopedagógicos'
  }
] as const;

export type NeuroeducaEntityTableKey = (typeof NEUROEDUCA_ENTITY_TABLES)[number]['key'];

export interface TableHealthInfo {
  key: string;
  table: string;
  label: string;
  exists: boolean;
  rowCount: number;
  error?: string;
}

export interface SupabaseHealthResult {
  success: boolean;
  message: string;
  normalizedUrl: string;
  tablesReady: number;
  totalTables: number;
  missingTables: string[];
  tableDetails: TableHealthResultMap;
  storageBucketReady?: boolean;
  storageBucketName?: string;
  storageBucketError?: string;
}

export type TableHealthResultMap = TableHealthInfo[];

export interface StorageUploadResult {
  success: boolean;
  storageBucket: string;
  storagePath?: string;
  fileUrl?: string;
  error?: string;
}

export interface SupabaseSyncPushResult {
  success: boolean;
  syncedCount: number;
  deletedCount?: number;
  tableCounts: Record<string, number>;
  missingTables: string[];
  errors: string[];
  syncedAt: string;
}

export interface SupabaseSyncPullResult {
  success: boolean;
  bundle: Partial<StorageDataBundle> | null;
  pulledCount: number;
  tableCounts: Record<string, number>;
  missingTables: string[];
  errors: string[];
  pulledAt: string;
  cloudUpdatedAt?: string;
}

export interface SupabaseMutationBatch {
  upserts?: Partial<StorageDataBundle>;
  deletes?: Partial<Record<NeuroeducaEntityTableKey, string[]>>;
  fkContext?: Partial<StorageDataBundle>;
}

export interface SupabaseMutateResult {
  success: boolean;
  syncedCount: number;
  deletedCount: number;
  errors: string[];
  syncedAt: string;
}

export interface SupabaseClientAuthOptions {
  accessToken?: string;
  sessionToken?: string;
}

/**
 * Normaliza e valida URLs de projectos Supabase.
 * Remove sufixos como /rest/v1 ou /rest/v1/ e garante esquema HTTPS seguro.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error('Endereço URL do Supabase inválido. Exemplo: https://seuprojecto.supabase.co');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('O endereço do Supabase deve usar HTTPS.');
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowedHost = host.endsWith('.supabase.co') || host.endsWith('.supabase.in');
  if (!isAllowedHost || host === 'supabase.co' || host === 'supabase.in') {
    throw new Error(
      'Endereço não reconhecido como projecto Supabase oficial (*.supabase.co ou *.supabase.in).'
    );
  }

  return parsed.origin;
}

export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('Could not find the table') ||
    message.includes('does not exist')
  );
}

export function isPermissionDeniedError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  if (message.includes('invalid api key') || message.includes('invalid jwt')) {
    return false;
  }
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('insufficient_privilege')
  );
}

export function createValidatedSupabaseClient(
  rawUrl: string,
  anonKey: string,
  authOrToken?: string | SupabaseClientAuthOptions
): SupabaseClient {
  const normalizedUrl = normalizeSupabaseUrl(rawUrl);
  const cleanKey = String(anonKey || '').trim();
  if (!normalizedUrl || !cleanKey) {
    throw new Error('URL do Supabase ou chave pública em falta.');
  }

  const cleanAccessToken =
    typeof authOrToken === 'string'
      ? String(authOrToken || '').trim()
      : String(authOrToken?.accessToken || '').trim();
  const cleanSessionToken =
    typeof authOrToken === 'object' && authOrToken !== null
      ? String(authOrToken.sessionToken || '').trim()
      : '';

  const headers: Record<string, string> = {};
  if (cleanAccessToken) {
    headers.Authorization = `Bearer ${cleanAccessToken}`;
  }
  if (cleanSessionToken) {
    headers['x-ne-session'] = cleanSessionToken;
  }

  return createClient(normalizedUrl, cleanKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    ...(Object.keys(headers).length > 0 ? { global: { headers } } : {})
  });
}

function sanitizePathSegment(raw: string, fallback = 'item'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned || fallback;
}

function inferExtensionFromMimeOrName(mimeType?: string, fileName?: string): string {
  const match = String(fileName || '').match(/\.([a-zA-Z0-9]{2,6})$/);
  if (match) return `.${match[1].toLowerCase()}`;
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  return map[String(mimeType || '').toLowerCase()] || '.bin';
}

function decodeBase64ToBytes(dataUrlOrBase64: string): { bytes: Uint8Array; detectedMime?: string } {
  const raw = String(dataUrlOrBase64 || '').trim();
  const dataUrlMatch = raw.match(/^data:([^;]+);base64,(.+)$/s);
  const detectedMime = dataUrlMatch ? dataUrlMatch[1] : undefined;
  const base64Body = (dataUrlMatch ? dataUrlMatch[2] : raw).replace(/\s+/g, '');

  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Buffer === 'function') {
    const buf = (globalThis as any).Buffer.from(base64Body, 'base64');
    return { bytes: new Uint8Array(buf), detectedMime };
  }

  const binary = atob(base64Body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, detectedMime };
}

export function buildStudentStoragePath(doc: {
  id: string;
  institutionId?: string;
  studentId?: string;
  category?: string;
  mimeType?: string;
  fileName?: string;
}): string {
  const inst = sanitizePathSegment(doc.institutionId || 'geral', 'geral');
  const student = sanitizePathSegment(doc.studentId || 'sem-aluno', 'sem-aluno');
  const category = sanitizePathSegment(doc.category || 'outro', 'outro');
  const docId = sanitizePathSegment(doc.id || `doc-${Date.now()}`, 'doc');
  const ext = inferExtensionFromMimeOrName(doc.mimeType, doc.fileName);
  return `${inst}/${student}/${category}/${docId}${ext}`;
}

export async function uploadArchiveDocumentToStorage(
  client: SupabaseClient,
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
  try {
    const { bytes, detectedMime } = decodeBase64ToBytes(fileDataBase64);
    if (!bytes || bytes.byteLength === 0) {
      return {
        success: false,
        storageBucket: STUDENT_DOCS_BUCKET,
        error: 'Conteúdo do ficheiro vazio.'
      };
    }

    const mimeType = doc.mimeType || detectedMime || 'application/octet-stream';
    const storagePath = buildStudentStoragePath({ ...doc, mimeType });

    const { error: uploadErr } = await client.storage
      .from(STUDENT_DOCS_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) {
      return {
        success: false,
        storageBucket: STUDENT_DOCS_BUCKET,
        error: uploadErr.message
      };
    }

    const { data: signedData } = await client.storage
      .from(STUDENT_DOCS_BUCKET)
      .createSignedUrl(storagePath, 3600);
    const { data: pub } = client.storage.from(STUDENT_DOCS_BUCKET).getPublicUrl(storagePath);
    return {
      success: true,
      storageBucket: STUDENT_DOCS_BUCKET,
      storagePath,
      fileUrl: signedData?.signedUrl || pub?.publicUrl
    };
  } catch (err: any) {
    return {
      success: false,
      storageBucket: STUDENT_DOCS_BUCKET,
      error: err?.message || 'Erro ao enviar documento para o Supabase Storage.'
    };
  }
}

export async function getSignedArchiveUrlFromStorage(
  client: SupabaseClient,
  storagePath: string,
  bucket = STUDENT_DOCS_BUCKET,
  expiresInSeconds = 3600,
  downloadFileName?: string
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  if (!storagePath) {
    return { success: false, error: 'Caminho de ficheiro em falta.' };
  }
  try {
    const { data, error } = await client.storage
      .from(bucket || STUDENT_DOCS_BUCKET)
      .createSignedUrl(
        storagePath,
        expiresInSeconds,
        downloadFileName ? { download: downloadFileName } : undefined
      );
    if (error || !data?.signedUrl) {
      return { success: false, error: error?.message || 'Não foi possível gerar URL assinado.' };
    }
    return { success: true, signedUrl: data.signedUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao gerar URL assinado.' };
  }
}

export async function deleteArchiveDocumentFromStorage(
  client: SupabaseClient,
  storagePath: string,
  bucket = STUDENT_DOCS_BUCKET
): Promise<{ success: boolean; error?: string }> {
  if (!storagePath) return { success: true };
  try {
    const { error } = await client.storage.from(bucket || STUDENT_DOCS_BUCKET).remove([storagePath]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao remover ficheiro do Supabase Storage.' };
  }
}

export async function checkSupabaseTablesHealth(
  rawUrl: string,
  anonKey: string,
  authOrToken?: string | SupabaseClientAuthOptions
): Promise<SupabaseHealthResult> {
  let normalizedUrl = '';
  try {
    normalizedUrl = normalizeSupabaseUrl(rawUrl);
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'URL do Supabase inválido.',
      normalizedUrl: '',
      tablesReady: 0,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: NEUROEDUCA_ENTITY_TABLES.map((t) => t.table),
      tableDetails: []
    };
  }

  if (!anonKey || !anonKey.trim()) {
    return {
      success: false,
      message: 'Forneça a chave pública (anon / publishable key) do Supabase.',
      normalizedUrl,
      tablesReady: 0,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: NEUROEDUCA_ENTITY_TABLES.map((t) => t.table),
      tableDetails: []
    };
  }

  try {
    const client = createValidatedSupabaseClient(normalizedUrl, anonKey, authOrToken);
    const details = await Promise.all(
      NEUROEDUCA_ENTITY_TABLES.map(async (item): Promise<TableHealthInfo> => {
        const { count, error } = await client
          .from(item.table)
          .select('id', { count: 'exact', head: true });

        if (error) {
          if (isTableMissingError(error)) {
            return {
              key: item.key,
              table: item.table,
              label: item.label,
              exists: false,
              rowCount: 0,
              error: 'Tabela ainda não criada'
            };
          }
          if (isPermissionDeniedError(error)) {
            return {
              key: item.key,
              table: item.table,
              label: item.label,
              exists: true,
              rowCount: 0
            };
          }
          return {
            key: item.key,
            table: item.table,
            label: item.label,
            exists: false,
            rowCount: 0,
            error: error.message
          };
        }

        return {
          key: item.key,
          table: item.table,
          label: item.label,
          exists: true,
          rowCount: count || 0
        };
      })
    );

    const missingTables = details.filter((d) => !d.exists).map((d) => d.table);
    const tablesReady = details.filter((d) => d.exists).length;
    const authErrors = details.filter(
      (d) =>
        d.error &&
        d.error !== 'Tabela ainda não criada' &&
        (d.error.toLowerCase().includes('invalid api key') ||
          d.error.toLowerCase().includes('jwt') ||
          d.error.toLowerCase().includes('unauthorized'))
    );

    const { error: storageErr } = await client.storage
      .from(STUDENT_DOCS_BUCKET)
      .list('', { limit: 1 });
    const storageErrMsg = String(storageErr?.message || '').toLowerCase();
    const isPrivateBucketRlsResponse =
      Boolean(storageErr) &&
      !storageErrMsg.includes('not found') &&
      !storageErrMsg.includes('does not exist') &&
      (storageErrMsg.includes('row-level security') ||
        storageErrMsg.includes('permission') ||
        storageErrMsg.includes('unauthorized') ||
        storageErrMsg.includes('403') ||
        storageErrMsg.includes('42501'));
    const storageBucketReady = !storageErr || isPrivateBucketRlsResponse;
    const storageBucketError = storageBucketReady ? undefined : storageErr?.message;

    if (authErrors.length > 0) {
      return {
        success: false,
        message: `Chave API ou permissão rejeitada pelo Supabase: ${authErrors[0].error}`,
        normalizedUrl,
        tablesReady,
        totalTables: NEUROEDUCA_ENTITY_TABLES.length,
        missingTables,
        tableDetails: details,
        storageBucketReady,
        storageBucketName: STUDENT_DOCS_BUCKET,
        storageBucketError
      };
    }

    if (tablesReady === 0) {
      return {
        success: true,
        message: `Ligação ao projecto Supabase verificada com sucesso! Falta apenas executar o Script SQL de criação das ${NEUROEDUCA_ENTITY_TABLES.length} tabelas e Storage no SQL Editor do Supabase.`,
        normalizedUrl,
        tablesReady,
        totalTables: NEUROEDUCA_ENTITY_TABLES.length,
        missingTables,
        tableDetails: details,
        storageBucketReady,
        storageBucketName: STUDENT_DOCS_BUCKET,
        storageBucketError
      };
    }

    if (missingTables.length > 0) {
      return {
        success: true,
        message: `Conectado ao Supabase (${tablesReady}/${NEUROEDUCA_ENTITY_TABLES.length} tabelas prontas). Execute o Script SQL actualizado para criar as ${missingTables.length} tabelas em falta.`,
        normalizedUrl,
        tablesReady,
        totalTables: NEUROEDUCA_ENTITY_TABLES.length,
        missingTables,
        tableDetails: details,
        storageBucketReady,
        storageBucketName: STUDENT_DOCS_BUCKET,
        storageBucketError
      };
    }

    return {
      success: true,
      message: storageBucketReady
        ? `Conexão total estabelecida! Todas as ${tablesReady} tabelas e o bucket "${STUDENT_DOCS_BUCKET}" estão activos no Supabase.`
        : `Tabelas activas (${tablesReady}/${NEUROEDUCA_ENTITY_TABLES.length}). Execute o Script SQL actualizado para criar o bucket "${STUDENT_DOCS_BUCKET}" no Supabase Storage.`,
      normalizedUrl,
      tablesReady,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: [],
      tableDetails: details,
      storageBucketReady,
      storageBucketName: STUDENT_DOCS_BUCKET,
      storageBucketError
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao testar conexão Supabase: ${err?.message || 'Verifique o URL e a chave.'}`,
      normalizedUrl,
      tablesReady: 0,
      totalTables: NEUROEDUCA_ENTITY_TABLES.length,
      missingTables: NEUROEDUCA_ENTITY_TABLES.map((t) => t.table),
      tableDetails: [],
      storageBucketReady: false,
      storageBucketName: STUDENT_DOCS_BUCKET
    };
  }
}

interface FkLookupSets {
  institutionIds?: Set<string>;
  teacherIds?: Set<string>;
  classIds?: Set<string>;
  studentIds?: Set<string>;
  invoiceIds?: Set<string>;
  accountIds?: Set<string>;
}

function buildFkLookupSets(bundle: Partial<StorageDataBundle>): FkLookupSets {
  const b = bundle as Record<string, any>;
  const makeSet = (arr: any, mapFn: (item: any) => string | null): Set<string> | undefined => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    const set = new Set<string>();
    for (const item of arr) {
      const val = mapFn(item);
      if (val) set.add(val);
    }
    return set.size > 0 ? set : undefined;
  };

  return {
    institutionIds: makeSet(b.institutions, (i) => (i?.id ? String(i.id) : null)),
    teacherIds: makeSet(b.teachers, (i) => (i?.id ? String(i.id) : null)),
    classIds: makeSet(b.classes, (i) => (i?.id ? String(i.id) : null)),
    studentIds: makeSet(b.students, (i) => (i?.id ? String(i.id) : null)),
    invoiceIds: makeSet(b.invoices, (i) => (i?.id ? String(i.id) : null)),
    accountIds: makeSet(b.accounts, (i) => {
      const e = String(i?.email || '').trim().toLowerCase();
      return e || null;
    })
  };
}

function sanitizeNullableFk(
  rawValue: any,
  validSet?: Set<string>,
  invalidTokens: string[] = ['', 'municipal']
): string | null {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed || invalidTokens.includes(trimmed)) return null;
  if (validSet && !validSet.has(trimmed)) return null;
  return trimmed;
}

function buildRowForEntity(
  key: NeuroeducaEntityTableKey,
  item: any,
  nowIso: string,
  fkLookup: FkLookupSets = {}
): Record<string, any> | null {
  if (!item) return null;
  switch (key) {
    case 'institutions':
      return {
        id: String(item.id),
        code: item.code || String(item.id),
        name: item.name || 'Instituição',
        acronym: item.acronym || null,
        nif: item.nif || null,
        institution_type: item.institutionType || 'privada',
        category: item.category || 'complexo_escolar',
        province: item.province || null,
        municipality: item.municipality || null,
        status: item.status || 'active',
        max_classes: Number(item.maxClasses || 20),
        current_classes_count: Number(item.currentClassesCount || 0),
        current_students_count: Number(item.currentStudentsCount || 0),
        current_teachers_count: Number(item.currentTeachersCount || 0),
        payload: item,
        updated_at: nowIso
      };
    case 'classes':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        code: item.code || null,
        name: item.name || 'Turma',
        subsystem_code: item.subsystemCode || null,
        grade_level: item.gradeLevel || null,
        shift: item.shift || null,
        room: item.room || null,
        academic_year: item.academicYear || null,
        max_capacity: Number(item.maxCapacity || 45),
        enrolled_students_count: Number(item.enrolledStudentsCount || 0),
        status: item.status || 'aberta',
        payload: item,
        updated_at: nowIso
      };
    case 'subjects':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        code: item.code || null,
        name: item.name || 'Disciplina',
        short_name: item.shortName || null,
        subsystem_code: item.subsystemCode || null,
        grade_level: item.gradeLevel || null,
        teacher_id: sanitizeNullableFk(item.teacherId, fkLookup.teacherIds, ['']),
        teacher_name: item.teacherName || null,
        status: item.status || 'activa',
        payload: item,
        updated_at: nowIso
      };
    case 'students':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        class_id: sanitizeNullableFk(item.classId, fkLookup.classIds, ['']),
        process_number: item.processNumber || null,
        full_name: item.fullName || 'Aluno',
        gender: item.gender || null,
        birth_date: item.birthDate || null,
        identity_card_number: item.identityCardNumber || null,
        guardian_name: item.guardianName || null,
        guardian_phone: item.guardianPhone || null,
        academic_status: item.academicStatus || 'matriculado',
        payload: item,
        updated_at: nowIso
      };
    case 'teachers':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        staff_code: item.staffCode || null,
        full_name: item.fullName || 'Docente',
        academic_degree: item.academicDegree || null,
        specialization: item.specialization || null,
        email: item.email || null,
        phone: item.phone || null,
        is_active: item.isActive !== false,
        payload: item,
        updated_at: nowIso
      };
    case 'grades':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        student_id: String(item.studentId || ''),
        class_id: String(item.classId || ''),
        subject_id: String(item.subjectId || ''),
        subject_name: item.subjectName || null,
        period: item.period || '1_trimestre',
        ac1: item.ac1 ?? null,
        ac2: item.ac2 ?? null,
        ac3: item.ac3 ?? null,
        mac: item.mac ?? null,
        npt: item.npt ?? null,
        mt: item.mt ?? null,
        exam_normal: item.examNormal ?? null,
        exam_recourse: item.examRecourse ?? null,
        final_grade: item.finalGrade ?? null,
        result_status: item.resultStatus || null,
        payload: item,
        updated_at: nowIso
      };
    case 'invoices':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        student_id: String(item.studentId || ''),
        invoice_number: item.invoiceNumber || String(item.id),
        category: item.category || 'propina',
        month_reference: item.monthReference || null,
        description: item.description || null,
        total_aoa: Number(item.totalAoa || 0),
        amount_paid_aoa: Number(item.amountPaidAoa || 0),
        balance_aoa: Number(item.balanceAoa || 0),
        due_date: item.dueDate || null,
        status: item.status || 'pendente',
        multicaixa_reference: item.multicaixaReference || null,
        receipt_number: item.receiptNumber || null,
        payload: item,
        updated_at: nowIso
      };
    case 'attendance':
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        student_id: String(item.studentId || ''),
        class_id: String(item.classId || ''),
        attendance_date: item.date || '',
        month_reference: item.month || null,
        status: item.status || 'presente',
        justification_status: item.justificationStatus || null,
        payload: item,
        updated_at: nowIso
      };
    case 'digitalArchive': {
      const hasStorage = Boolean(item.storagePath);
      const sanitizedPayload =
        hasStorage || (item.dataUrl && String(item.dataUrl).length > 180_000)
          ? { ...item, dataUrl: undefined }
          : item;
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        student_id: String(item.studentId || ''),
        document_type: item.category || null,
        title: item.title || 'Documento',
        file_name: item.fileName || null,
        mime_type: item.mimeType || null,
        file_size_bytes: item.fileSizeBytes ? Number(item.fileSizeBytes) : null,
        storage_bucket: item.storageBucket || STUDENT_DOCS_BUCKET,
        storage_path: item.storagePath || null,
        file_url: item.fileUrl || null,
        status: item.status || 'pendente',
        uploaded_at: item.uploadedAt || null,
        payload: sanitizedPayload,
        updated_at: nowIso
      };
    }
    case 'financialNotifications':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        student_id: String(item.studentId || ''),
        invoice_id: sanitizeNullableFk(item.invoiceId, fkLookup.invoiceIds, ['']),
        recipient_target: item.recipientTarget || null,
        notification_type: item.type || null,
        title: item.title || 'Notificação Financeira',
        message: item.message || null,
        amount_aoa: item.amountAoa ?? null,
        is_read: Boolean(item.isRead),
        sent_at: item.sentAt || null,
        payload: item,
        updated_at: nowIso
      };
    case 'announcements':
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        channel: item.channel || 'school_to_members',
        sender_role: item.senderRole || null,
        sender_name: item.senderName || null,
        target_scope: item.targetScope || null,
        priority: item.priority || 'normal',
        category: item.category || 'geral',
        title: item.title || 'Comunicado',
        content: item.content || null,
        published_at: item.createdAt || null,
        payload: item,
        updated_at: nowIso
      };
    case 'schoolUsers': {
      const cleanEmail = String(item.email || '').trim().toLowerCase();
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        account_id: sanitizeNullableFk(cleanEmail, fkLookup.accountIds, ['']),
        full_name: item.fullName || 'Utilizador',
        email: cleanEmail,
        role: item.role || 'professor',
        municipality: item.municipality || null,
        province: item.province || null,
        status: item.status || 'activo',
        payload: { ...item, email: cleanEmail },
        updated_at: nowIso
      };
    }
    case 'accounts': {
      const cleanEmail = String(item.email || '').trim().toLowerCase();
      if (!cleanEmail) return null;
      return {
        id: cleanEmail,
        email: cleanEmail,
        full_name: item.fullName || cleanEmail,
        role: item.role || 'aluno',
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        municipality: item.municipality || null,
        province: item.province || null,
        status: item.status || 'activo',
        payload: { ...item, email: cleanEmail },
        updated_at: nowIso
      };
    }
    case 'subscriptionPlans':
      return {
        id: String(item.id),
        name: item.name || 'Plano',
        cycle: item.cycle || 'mensal',
        price_aoa: Number(item.priceAoa || 0),
        max_classes: Number(item.maxClasses || 20),
        is_active: item.isActive !== false,
        payload: item,
        updated_at: nowIso
      };
    case 'auditLogs':
      return {
        id: String(item.id),
        institution_id: sanitizeNullableFk(item.institutionId, fkLookup.institutionIds),
        user_name: item.userName || null,
        user_role: item.userRole || null,
        action: item.action || 'EVENTO',
        details: item.details || null,
        timestamp_str: item.timestamp || null,
        payload: item,
        updated_at: nowIso
      };
    case 'psychopedagogicalProtocols':
      return {
        id: String(item.id),
        code: item.code || null,
        title: item.title || 'Protocolo Psicopedagógico',
        category: item.category || null,
        target_subsystem: Array.isArray(item.targetSubsystems)
          ? item.targetSubsystems.join(', ')
          : null,
        is_active: item.isActive !== false,
        payload: item,
        updated_at: nowIso
      };
    case 'psychopedagogicalCases':
      return {
        id: String(item.id),
        institution_id: String(item.institutionId || ''),
        student_id: sanitizeNullableFk(item.studentId, fkLookup.studentIds, ['']),
        case_code: item.caseCode || null,
        student_name: item.studentName || 'Aluno',
        status: item.status || 'em_triagem',
        risk_level: item.priority || null,
        payload: item,
        updated_at: nowIso
      };
    default:
      return null;
  }
}

async function upsertInBatches(
  client: SupabaseClient,
  table: string,
  rows: Record<string, any>[],
  batchSize = 200
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await client.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) return error;
  }
  return null;
}

async function deleteIdsInBatches(
  client: SupabaseClient,
  table: string,
  ids: string[],
  batchSize = 100
) {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const chunk = uniqueIds.slice(i, i + batchSize);
    const { error } = await client.from(table).delete().in('id', chunk);
    if (error) return error;
  }
  return null;
}

async function updateSyncMetaSafe(
  client: SupabaseClient,
  syncedAt: string,
  summary: Record<string, number>,
  appVersion = '3.0'
): Promise<boolean> {
  const { error: metaErr } = await client.from('neuroeduca_sync_meta').upsert(
    {
      id: 'primary',
      last_pushed_at: syncedAt,
      app_version: appVersion,
      summary,
      updated_at: syncedAt
    },
    { onConflict: 'id' }
  );
  return Boolean(metaErr && isTableMissingError(metaErr));
}

/**
 * Sincronização incremental imediata (Upserts em ordem pai->filho + Deletes explícitos em ordem filho->pai)
 */
export async function syncChangesToSupabase(
  client: SupabaseClient,
  batch: SupabaseMutationBatch
): Promise<SupabaseMutateResult> {
  const syncedAt = new Date().toISOString();
  const errors: string[] = [];
  let syncedCount = 0;
  let deletedCount = 0;

  const fkLookup = buildFkLookupSets({
    ...(batch.fkContext || {}),
    ...(batch.upserts || {})
  });

  // 1. Upserts em ordem pai -> filho
  if (batch.upserts) {
    for (const def of NEUROEDUCA_ENTITY_TABLES) {
      let list: any[] = (batch.upserts as Record<string, any>)[def.key];
      if (!Array.isArray(list) || list.length === 0) continue;

      if (def.key === 'digitalArchive') {
        const migratedList: any[] = [];
        for (const item of list) {
          if (item && item.dataUrl && !item.storagePath) {
            const uploadRes = await uploadArchiveDocumentToStorage(client, item, item.dataUrl);
            if (uploadRes.success && uploadRes.storagePath && uploadRes.fileUrl) {
              migratedList.push({
                ...item,
                storageBucket: uploadRes.storageBucket,
                storagePath: uploadRes.storagePath,
                fileUrl: uploadRes.fileUrl,
                dataUrl: undefined
              });
              continue;
            }
          }
          migratedList.push(item);
        }
        list = migratedList;
      }

      const rows = list
        .map((item: any) => buildRowForEntity(def.key, item, syncedAt, fkLookup))
        .filter((r: Record<string, any> | null): r is Record<string, any> => r !== null);

      if (rows.length === 0) continue;

      const err = await upsertInBatches(client, def.table, rows);
      if (err) {
        errors.push(`${def.label} (${def.table}): ${err.message}`);
      } else {
        syncedCount += rows.length;
      }
    }
  }

  // 2. Eliminações explícitas em ordem reversa (filho -> pai)
  if (batch.deletes) {
    const reverseDefs = [...NEUROEDUCA_ENTITY_TABLES].reverse();
    for (const def of reverseDefs) {
      const rawIds = batch.deletes[def.key];
      if (!Array.isArray(rawIds) || rawIds.length === 0) continue;

      const normalizedIds =
        def.key === 'accounts'
          ? rawIds.map((id) => String(id || '').trim().toLowerCase()).filter(Boolean)
          : rawIds.map((id) => String(id || '').trim()).filter(Boolean);

      if (normalizedIds.length === 0) continue;

      const err = await deleteIdsInBatches(client, def.table, normalizedIds);
      if (err) {
        if (!isTableMissingError(err)) {
          errors.push(`Eliminar ${def.label} (${def.table}): ${err.message}`);
        }
      } else {
        deletedCount += normalizedIds.length;
      }
    }
  }

  if (syncedCount > 0 || deletedCount > 0) {
    await updateSyncMetaSafe(client, syncedAt, { syncedCount, deletedCount });
  }

  return {
    success: errors.length === 0,
    syncedCount,
    deletedCount,
    errors,
    syncedAt
  };
}

export async function pushBundleToSupabase(
  client: SupabaseClient,
  bundle: Partial<StorageDataBundle>,
  options?: { pruneMissing?: boolean }
): Promise<SupabaseSyncPushResult> {
  const syncedAt = new Date().toISOString();
  const errors: string[] = [];
  const missingTables: string[] = [];
  const tableCounts: Record<string, number> = {};
  const fkLookup = buildFkLookupSets(bundle);
  let syncedCount = 0;
  let deletedCount = 0;

  for (const def of NEUROEDUCA_ENTITY_TABLES) {
    let list: any[] = (bundle as Record<string, any>)[def.key];
    if (!Array.isArray(list)) {
      list = [];
    }

    if (list.length > 0) {
      if (def.key === 'digitalArchive') {
        const migratedList: any[] = [];
        for (const item of list) {
          if (item && item.dataUrl && !item.storagePath) {
            const uploadRes = await uploadArchiveDocumentToStorage(client, item, item.dataUrl);
            if (uploadRes.success && uploadRes.storagePath && uploadRes.fileUrl) {
              migratedList.push({
                ...item,
                storageBucket: uploadRes.storageBucket,
                storagePath: uploadRes.storagePath,
                fileUrl: uploadRes.fileUrl,
                dataUrl: undefined
              });
              continue;
            }
          }
          migratedList.push(item);
        }
        list = migratedList;
      }

      const rows = list
        .map((item: any) => buildRowForEntity(def.key, item, syncedAt, fkLookup))
        .filter((r: Record<string, any> | null): r is Record<string, any> => r !== null);

      if (rows.length > 0) {
        const error = await upsertInBatches(client, def.table, rows);
        if (error) {
          if (isTableMissingError(error)) {
            missingTables.push(def.table);
          } else {
            errors.push(`${def.label} (${def.table}): ${error.message}`);
          }
          tableCounts[def.table] = 0;
        } else {
          tableCounts[def.table] = rows.length;
          syncedCount += rows.length;
        }
      } else {
        tableCounts[def.table] = 0;
      }
    } else {
      tableCounts[def.table] = 0;
    }
  }

  // Reconciliação opcional de registos removidos no frontend (filho -> pai)
  if (options?.pruneMissing) {
    const reverseDefs = [...NEUROEDUCA_ENTITY_TABLES].reverse();
    for (const def of reverseDefs) {
      if (missingTables.includes(def.table)) continue;
      const list = (bundle as Record<string, any>)[def.key];
      if (!Array.isArray(list)) continue;

      const localIdSet = new Set(
        list
          .map((item: any) => {
            if (def.key === 'accounts') {
              return String(item?.email || '').trim().toLowerCase();
            }
            return String(item?.id || '').trim();
          })
          .filter(Boolean)
      );

      const { data: remoteRows, error: fetchErr } = await client
        .from(def.table)
        .select('id')
        .limit(5000);

      if (fetchErr) {
        if (!isTableMissingError(fetchErr) && !isPermissionDeniedError(fetchErr)) {
          errors.push(`Reconciliar ${def.label} (${def.table}): ${fetchErr.message}`);
        }
        continue;
      }

      const staleIds = (remoteRows || [])
        .map((r: any) => String(r?.id || '').trim())
        .filter((id: string) => Boolean(id) && !localIdSet.has(id));

      if (staleIds.length > 0) {
        const delErr = await deleteIdsInBatches(client, def.table, staleIds);
        if (delErr) {
          if (!isPermissionDeniedError(delErr)) {
            errors.push(`Limpar ${def.label} (${def.table}): ${delErr.message}`);
          }
        } else {
          deletedCount += staleIds.length;
        }
      }
    }
  }

  const metaMissing = await updateSyncMetaSafe(
    client,
    syncedAt,
    tableCounts,
    bundle.version || '3.0'
  );
  if (metaMissing) {
    missingTables.push('neuroeduca_sync_meta');
  }

  if (missingTables.length > 0) {
    errors.unshift(
      `${missingTables.length} tabela(s) ainda não existem no Supabase (${missingTables.slice(0, 3).join(', ')}${missingTables.length > 3 ? '...' : ''}). Execute o Script SQL de integração na Aba 2.`
    );
  }

  return {
    success: errors.length === 0 && missingTables.length === 0,
    syncedCount,
    deletedCount,
    tableCounts,
    missingTables,
    errors,
    syncedAt
  };
}

export async function pullBundleFromSupabase(
  client: SupabaseClient
): Promise<SupabaseSyncPullResult> {
  const pulledAt = new Date().toISOString();
  const errors: string[] = [];
  const missingTables: string[] = [];
  const tableCounts: Record<string, number> = {};
  const bundle: Record<string, any> = {};
  let pulledCount = 0;
  let cloudUpdatedAt: string | undefined;

  const { data: metaRow, error: metaErr } = await client
    .from('neuroeduca_sync_meta')
    .select('last_pushed_at, app_version')
    .eq('id', 'primary')
    .maybeSingle();

  if (metaErr) {
    if (isTableMissingError(metaErr)) {
      missingTables.push('neuroeduca_sync_meta');
    }
  } else if (metaRow?.last_pushed_at) {
    cloudUpdatedAt = metaRow.last_pushed_at;
  }

  for (const def of NEUROEDUCA_ENTITY_TABLES) {
    const { data, error } = await client
      .from(def.table)
      .select('payload, updated_at')
      .limit(5000);

    if (error) {
      if (isTableMissingError(error)) {
        missingTables.push(def.table);
      } else {
        errors.push(`${def.label} (${def.table}): ${error.message}`);
      }
      tableCounts[def.table] = 0;
      continue;
    }

    const items = (data || [])
      .map((row: any) => row?.payload)
      .filter((p: any) => p !== null && p !== undefined);

    bundle[def.key] = items;
    tableCounts[def.table] = items.length;
    pulledCount += items.length;
  }

  if (missingTables.length > 0) {
    errors.unshift(
      `${missingTables.length} tabela(s) ainda não existem no Supabase. Execute o Script SQL na Aba 2 para inicializar o banco.`
    );
  }

  const allSucceeded = errors.length === 0 && missingTables.length === 0;

  return {
    success: allSucceeded,
    bundle: allSucceeded || pulledCount > 0 ? (bundle as Partial<StorageDataBundle>) : null,
    pulledCount,
    tableCounts,
    missingTables,
    errors,
    pulledAt,
    cloudUpdatedAt
  };
}
