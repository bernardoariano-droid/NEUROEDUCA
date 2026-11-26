/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Tipos de Bundle e Utilitários Puramente em Memória (Sem LocalStorage)
 * Toda a persistência operacional da plataforma ocorre directamente no Supabase PostgreSQL.
 */

import {
  Institution,
  ClassRoom,
  Student,
  Teacher,
  GradeRecord,
  Invoice,
  AuditLogItem,
  SchoolUser,
  SubscriptionPlan,
  StoredCredential,
  SchoolSubject,
  DigitalArchiveDocument,
  AttendanceRecord,
  FinancialNotification,
  Announcement,
  PsychopedagogicalProtocol,
  PsychopedagogicalCase
} from '../types';

import {
  INITIAL_INSTITUTIONS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_GRADES,
  INITIAL_INVOICES,
  INITIAL_AUDIT_LOGS,
  INITIAL_SCHOOL_USERS,
  INITIAL_SUBSCRIPTION_PLANS,
  INITIAL_DIGITAL_ARCHIVE,
  INITIAL_ATTENDANCE,
  INITIAL_FINANCIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_PSYCHOPEDAGOGICAL_PROTOCOLS,
  INITIAL_PSYCHOPEDAGOGICAL_CASES
} from '../data/initialData';

const CURRENT_BUNDLE_VERSION = '3.0';

export const DEFAULT_ACCOUNTS: StoredCredential[] = [
  {
    email: 'admin.geral@neuroeduca.ao',
    password: 'admin',
    fullName: 'Dr. Bernardo Ariano (Super Admin)',
    role: 'super_admin',
    institutionName: 'Administração Geral SaaS NEUROEDUCA',
    status: 'activo'
  },
  {
    email: 'director.municipal@neuroeduca.ao',
    password: '123',
    fullName: 'Dr. Agostinho Bento Kiala (Director Municipal)',
    role: 'director_municipal',
    institutionName: 'Direcção Municipal da Educação de Kilamba Kiaxi',
    municipality: 'Kilamba Kiaxi',
    province: 'Luanda',
    status: 'activo'
  },
  {
    email: 'direcao@sagradaesperanca.ao',
    password: '123',
    fullName: 'Prof. Dr. Mateus Domingos Afonso',
    role: 'director_geral',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'pedagogico@sagradaesperanca.ao',
    password: '123',
    fullName: 'Msc. Teresa Kiala',
    role: 'subdirector_pedagogico',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'professor@sagradaesperanca.ao',
    password: '123',
    fullName: 'Prof. Manuel Van-Dúnem',
    role: 'professor',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'josefina.ndalamba@sagradaesperanca.ao',
    password: '123',
    fullName: 'Dra. Josefina Ndalamba',
    role: 'professor',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'financas@sagradaesperanca.ao',
    password: '123',
    fullName: 'Dra. Elsa Caxito (Tesoureira)',
    role: 'funcionario_financeiro',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'aluno@sagradaesperanca.ao',
    password: '123',
    fullName: 'Kizua Manuel Domingos (Estudante)',
    role: 'aluno',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'carlos.muangala@aluno.sagradaesperanca.ao',
    password: '123',
    fullName: 'Carlos Alberto Muangala',
    role: 'aluno',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'ana.santos@aluno.sagradaesperanca.ao',
    password: '123',
    fullName: 'Ana Paula dos Santos',
    role: 'aluno',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  },
  {
    email: 'encarregado@sagradaesperanca.ao',
    password: '123',
    fullName: 'Dra. Francisca Paulo Kizua (Encarregada)',
    role: 'encarregado_educacao',
    institutionId: 'inst-01',
    institutionName: 'Complexo Escolar Sagrada Esperança',
    status: 'activo'
  }
];

export interface StorageDataBundle {
  institutions: Institution[];
  classes: ClassRoom[];
  subjects?: SchoolSubject[];
  students: Student[];
  teachers: Teacher[];
  grades: GradeRecord[];
  invoices: Invoice[];
  auditLogs: AuditLogItem[];
  schoolUsers: SchoolUser[];
  accounts: StoredCredential[];
  subscriptionPlans?: SubscriptionPlan[];
  digitalArchive?: DigitalArchiveDocument[];
  attendance?: AttendanceRecord[];
  financialNotifications?: FinancialNotification[];
  announcements?: Announcement[];
  psychopedagogicalProtocols?: PsychopedagogicalProtocol[];
  psychopedagogicalCases?: PsychopedagogicalCase[];
  version?: string;
  exportedAt?: string;
  updatedAt?: string;
}

export interface StorageStats {
  institutionsCount: number;
  classesCount: number;
  subjectsCount?: number;
  studentsCount: number;
  teachersCount: number;
  gradesCount: number;
  invoicesCount: number;
  auditLogsCount: number;
  schoolUsersCount: number;
  accountsCount: number;
  approxSizeKb: number;
  lastUpdated: string;
}

export function createEmptyBundle(): StorageDataBundle {
  return {
    institutions: [],
    classes: [],
    subjects: [],
    students: [],
    teachers: [],
    grades: [],
    invoices: [],
    auditLogs: [],
    schoolUsers: [],
    accounts: [],
    subscriptionPlans: INITIAL_SUBSCRIPTION_PLANS,
    digitalArchive: [],
    attendance: [],
    financialNotifications: [],
    announcements: [],
    psychopedagogicalProtocols: [],
    psychopedagogicalCases: [],
    version: CURRENT_BUNDLE_VERSION
  };
}

export function createDemoSeedBundle(): StorageDataBundle {
  return {
    institutions: INITIAL_INSTITUTIONS,
    classes: INITIAL_CLASSES,
    subjects: [],
    students: INITIAL_STUDENTS,
    teachers: INITIAL_TEACHERS,
    grades: INITIAL_GRADES,
    invoices: INITIAL_INVOICES,
    auditLogs: INITIAL_AUDIT_LOGS,
    schoolUsers: INITIAL_SCHOOL_USERS,
    accounts: DEFAULT_ACCOUNTS,
    subscriptionPlans: INITIAL_SUBSCRIPTION_PLANS,
    digitalArchive: INITIAL_DIGITAL_ARCHIVE,
    attendance: INITIAL_ATTENDANCE,
    financialNotifications: INITIAL_FINANCIAL_NOTIFICATIONS,
    announcements: INITIAL_ANNOUNCEMENTS,
    psychopedagogicalProtocols: INITIAL_PSYCHOPEDAGOGICAL_PROTOCOLS,
    psychopedagogicalCases: INITIAL_PSYCHOPEDAGOGICAL_CASES,
    version: CURRENT_BUNDLE_VERSION,
    updatedAt: new Date().toISOString()
  };
}

export function upsertAccountInList(
  current: StoredCredential[],
  cred: StoredCredential
): StoredCredential[] {
  const cleanEmail = cred.email.trim().toLowerCase();
  if (!cleanEmail) return current;
  const existing = current.find((a) => a.email.toLowerCase() === cleanEmail);
  const normalized: StoredCredential = {
    ...(existing || {}),
    ...cred,
    email: cleanEmail,
    password: cred.password || existing?.password || '123',
    status: cred.status || existing?.status || 'activo'
  };
  return [normalized, ...current.filter((a) => a.email.toLowerCase() !== cleanEmail)];
}

export function updateAccountStatusInList(
  current: StoredCredential[],
  email: string,
  status: 'activo' | 'inactivo'
): StoredCredential[] {
  const cleanEmail = email.trim().toLowerCase();
  return current.map((a) =>
    a.email.toLowerCase() === cleanEmail ? { ...a, status } : a
  );
}

export function updateAccountPasswordInList(
  current: StoredCredential[],
  email: string,
  newPassword: string
): StoredCredential[] {
  const cleanEmail = email.trim().toLowerCase();
  return current.map((a) =>
    a.email.toLowerCase() === cleanEmail ? { ...a, password: newPassword } : a
  );
}

export function deleteAccountInList(
  current: StoredCredential[],
  email: string
): StoredCredential[] {
  const cleanEmail = email.trim().toLowerCase();
  return current.filter((a) => a.email.toLowerCase() !== cleanEmail);
}

export function computeBundleStats(bundle: Partial<StorageDataBundle>): StorageStats {
  const safe: StorageDataBundle = {
    ...createEmptyBundle(),
    ...bundle
  };
  let approxSizeKb = 0;
  try {
    approxSizeKb = Number((JSON.stringify(safe).length / 1024).toFixed(2));
  } catch {
    approxSizeKb = 0;
  }

  return {
    institutionsCount: safe.institutions.length,
    classesCount: safe.classes.length,
    subjectsCount: (safe.subjects || []).length,
    studentsCount: safe.students.length,
    teachersCount: safe.teachers.length,
    gradesCount: safe.grades.length,
    invoicesCount: safe.invoices.length,
    auditLogsCount: safe.auditLogs.length,
    schoolUsersCount: safe.schoolUsers.length,
    accountsCount: safe.accounts.length,
    approxSizeKb,
    lastUpdated: safe.updatedAt || new Date().toISOString()
  };
}

export function exportBackupJson(bundle: StorageDataBundle): string {
  const exportObject: StorageDataBundle = {
    ...bundle,
    version: CURRENT_BUNDLE_VERSION,
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(exportObject, null, 2);
}

export function parseBackupJson(jsonString: string): StorageDataBundle | null {
  try {
    const parsed = JSON.parse(jsonString) as StorageDataBundle;
    if (!parsed || !Array.isArray(parsed.institutions)) {
      return null;
    }
    return {
      ...createEmptyBundle(),
      ...parsed,
      version: CURRENT_BUNDLE_VERSION,
      updatedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error('Erro ao analisar backup JSON:', e);
    return null;
  }
}

export function generateSupabaseSqlInserts(bundle: Partial<StorageDataBundle>): string {
  const data: StorageDataBundle = {
    ...createEmptyBundle(),
    ...bundle
  };
  const lines: string[] = [];

  lines.push('-- =====================================================================');
  lines.push('-- NEUROEDUCA - SCRIPT DE EXPORTAÇÃO SQL A PARTIR DO ESTADO ACTUAL');
  lines.push(`-- Gerado em: ${new Date().toISOString()}`);
  lines.push('-- Tabelas: neuroeduca_institutions, neuroeduca_classes, neuroeduca_students, neuroeduca_teachers, neuroeduca_invoices');
  lines.push('-- =====================================================================\n');

  lines.push('-- 1. INSTITUIÇÕES');
  data.institutions.forEach((inst) => {
    const code = (inst.code || inst.id).replace(/'/g, "''");
    const name = inst.name.replace(/'/g, "''");
    const province = (inst.province || '').replace(/'/g, "''");
    const municipality = (inst.municipality || '').replace(/'/g, "''");
    const acronym = (inst.acronym || '').replace(/'/g, "''");
    const maxClasses = inst.maxClasses || 20;
    const payload = JSON.stringify(inst).replace(/'/g, "''");

    lines.push(
      `INSERT INTO public.neuroeduca_institutions (id, code, name, acronym, province, municipality, institution_type, category, max_classes, status, payload) ` +
        `VALUES ('${inst.id}', '${code}', '${name}', '${acronym}', '${province}', '${municipality}', '${inst.institutionType || 'privada'}', '${inst.category || 'complexo_escolar'}', ${maxClasses}, '${inst.status || 'active'}', '${payload}'::jsonb) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, max_classes = EXCLUDED.max_classes, payload = EXCLUDED.payload;`
    );
  });
  lines.push('');

  lines.push('-- 2. TURMAS');
  data.classes.forEach((cls) => {
    const name = cls.name.replace(/'/g, "''");
    const code = (cls.code || '').replace(/'/g, "''");
    const room = (cls.room || '').replace(/'/g, "''");
    const payload = JSON.stringify(cls).replace(/'/g, "''");
    lines.push(
      `INSERT INTO public.neuroeduca_classes (id, institution_id, code, name, room, shift, academic_year, max_capacity, payload) ` +
        `VALUES ('${cls.id}', '${cls.institutionId}', '${code}', '${name}', '${room}', '${cls.shift}', '${cls.academicYear}', ${cls.maxCapacity}, '${payload}'::jsonb) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, payload = EXCLUDED.payload;`
    );
  });
  lines.push('');

  lines.push('-- 3. ESTUDANTES');
  data.students.forEach((stu) => {
    const name = stu.fullName.replace(/'/g, "''");
    const proc = (stu.processNumber || '').replace(/'/g, "''");
    const guardian = (stu.guardianName || '').replace(/'/g, "''");
    const bi = (stu.identityCardNumber || '').replace(/'/g, "''");
    const classVal = stu.classId ? `'${stu.classId}'` : 'NULL';
    const payload = JSON.stringify(stu).replace(/'/g, "''");

    lines.push(
      `INSERT INTO public.neuroeduca_students (id, institution_id, class_id, full_name, process_number, identity_card_number, guardian_name, guardian_phone, academic_status, payload) ` +
        `VALUES ('${stu.id}', '${stu.institutionId}', ${classVal}, '${name}', '${proc}', '${bi}', '${guardian}', '${stu.guardianPhone || ''}', '${stu.academicStatus}', '${payload}'::jsonb) ` +
        `ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, payload = EXCLUDED.payload;`
    );
  });
  lines.push('');

  lines.push('-- 4. DOCENTES');
  data.teachers.forEach((t) => {
    const name = t.fullName.replace(/'/g, "''");
    const spec = (t.specialization || '').replace(/'/g, "''");
    const payload = JSON.stringify(t).replace(/'/g, "''");
    lines.push(
      `INSERT INTO public.neuroeduca_teachers (id, institution_id, staff_code, full_name, specialization, email, phone, payload) ` +
        `VALUES ('${t.id}', '${t.institutionId}', '${t.staffCode}', '${name}', '${spec}', '${t.email}', '${t.phone}', '${payload}'::jsonb) ` +
        `ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, payload = EXCLUDED.payload;`
    );
  });
  lines.push('');

  lines.push('-- 5. FACTURAS E PROPINAS');
  data.invoices.forEach((inv) => {
    const num = inv.invoiceNumber.replace(/'/g, "''");
    const desc = (inv.description || '').replace(/'/g, "''");
    const ref = (inv.multicaixaReference || '').replace(/'/g, "''");
    const payload = JSON.stringify(inv).replace(/'/g, "''");

    lines.push(
      `INSERT INTO public.neuroeduca_invoices (id, institution_id, student_id, invoice_number, description, total_aoa, amount_paid_aoa, balance_aoa, status, multicaixa_reference, payload) ` +
        `VALUES ('${inv.id}', '${inv.institutionId}', '${inv.studentId}', '${num}', '${desc}', ${inv.totalAoa}, ${inv.amountPaidAoa}, ${inv.balanceAoa}, '${inv.status}', '${ref}', '${payload}'::jsonb) ` +
        `ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payload = EXCLUDED.payload;`
    );
  });
  lines.push('');
  lines.push('-- FIM DO SCRIPT DE EXPORTAÇÃO');
  return lines.join('\n');
}
