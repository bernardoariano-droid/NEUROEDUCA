/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Serviço de Armazenamento Local e Persistência de Dados
 * Preparado para sincronização e integração futura com Supabase PostgreSQL
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

// Chaves padronizadas de armazenamento local (LocalStorage)
export const STORAGE_KEYS = {
  INSTITUTIONS: 'neuroeduca_institutions',
  CLASSES: 'neuroeduca_classes',
  SUBJECTS: 'neuroeduca_subjects',
  STUDENTS: 'neuroeduca_students',
  TEACHERS: 'neuroeduca_teachers',
  GRADES: 'neuroeduca_grades',
  INVOICES: 'neuroeduca_invoices',
  AUDIT_LOGS: 'neuroeduca_audit_logs',
  SCHOOL_USERS: 'neuroeduca_school_users',
  AUTH_ACCOUNTS: 'neuroeduca_registered_users',
  SUBSCRIPTION_PLANS: 'neuroeduca_subscription_plans',
  DIGITAL_ARCHIVE: 'neuroeduca_digital_archive',
  ATTENDANCE: 'neuroeduca_attendance',
  FINANCIAL_NOTIFICATIONS: 'neuroeduca_financial_notifications',
  ANNOUNCEMENTS: 'neuroeduca_announcements',
  PSYCHOPEDAGOGICAL_PROTOCOLS: 'neuroeduca_psychopedagogical_protocols',
  PSYCHOPEDAGOGICAL_CASES: 'neuroeduca_psychopedagogical_cases',
  SUPABASE_CONFIG: 'neuroeduca_supabase_config',
  LAST_SYNC: 'neuroeduca_last_sync_timestamp',
  STORAGE_VERSION: 'neuroeduca_storage_version'
};

const LEGACY_ACCOUNTS_KEY = 'neuroeduca_accounts';
const CURRENT_STORAGE_VERSION = '2.2';

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

class StorageService {
  /**
   * Lê item do LocalStorage com fallback seguro
   */
  private getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Erro ao ler chave ${key} do LocalStorage:`, e);
      return fallback;
    }
  }

  /**
   * Grava item no LocalStorage com tratamento de quota
   */
  private setItem<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      return true;
    } catch (e) {
      console.error(`Erro ao guardar chave ${key} no LocalStorage:`, e);
      return false;
    }
  }

  /**
   * Garante fusão de contas legadas (`neuroeduca_accounts`) e padrão com as contas registadas
   */
  private loadNormalizedAccounts(): StoredCredential[] {
    const stored = this.getItem<StoredCredential[]>(STORAGE_KEYS.AUTH_ACCOUNTS, []);
    const legacy = this.getItem<StoredCredential[]>(LEGACY_ACCOUNTS_KEY, []);

    const byEmail = new Map<string, StoredCredential>();

    // Primeiro semear contas padrão caso ainda não existam
    DEFAULT_ACCOUNTS.forEach((acc) => {
      byEmail.set(acc.email.toLowerCase(), { status: 'activo', ...acc });
    });

    // Aplicar contas do armazenamento legado (caso tenham sido criadas antes da v2.1)
    if (Array.isArray(legacy)) {
      legacy.forEach((acc) => {
        if (acc?.email) {
          byEmail.set(acc.email.toLowerCase(), {
            status: 'activo',
            ...acc,
            password: acc.password || '123'
          });
        }
      });
    }

    // Por último aplicar as contas mais recentes da chave oficial
    if (Array.isArray(stored)) {
      stored.forEach((acc) => {
        if (acc?.email) {
          byEmail.set(acc.email.toLowerCase(), {
            status: 'activo',
            ...acc,
            password: acc.password || '123'
          });
        }
      });
    }

    const merged = Array.from(byEmail.values());
    if (legacy.length > 0) {
      try {
        localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
      } catch {
        // Ignorar erro de limpeza
      }
    }
    return merged;
  }

  /**
   * Inicializa e carrega todos os dados do LocalStorage.
   * Se for a primeira execução, hidrata com os dados padrão e grava no LocalStorage.
   */
  public initializeStorage(): StorageDataBundle {
    if (typeof window === 'undefined') {
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
        psychopedagogicalCases: INITIAL_PSYCHOPEDAGOGICAL_CASES
      };
    }

    const savedVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);

    // Carregar ou inicializar cada colecção
    let institutions = this.getItem<Institution[]>(STORAGE_KEYS.INSTITUTIONS, []);
    let classes = this.getItem<ClassRoom[]>(STORAGE_KEYS.CLASSES, []);
    let subjects = this.getItem<SchoolSubject[]>(STORAGE_KEYS.SUBJECTS, []);
    let students = this.getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
    let teachers = this.getItem<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
    let grades = this.getItem<GradeRecord[]>(STORAGE_KEYS.GRADES, []);
    let invoices = this.getItem<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    let auditLogs = this.getItem<AuditLogItem[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    let schoolUsers = this.getItem<SchoolUser[]>(STORAGE_KEYS.SCHOOL_USERS, []);
    let accounts = this.loadNormalizedAccounts();
    let subscriptionPlans = this.getItem<SubscriptionPlan[]>(STORAGE_KEYS.SUBSCRIPTION_PLANS, []);
    let digitalArchive = this.getItem<DigitalArchiveDocument[]>(STORAGE_KEYS.DIGITAL_ARCHIVE, []);
    let attendance = this.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    let financialNotifications = this.getItem<FinancialNotification[]>(
      STORAGE_KEYS.FINANCIAL_NOTIFICATIONS,
      []
    );
    let announcements = this.getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, []);
    let psychopedagogicalProtocols = this.getItem<PsychopedagogicalProtocol[]>(
      STORAGE_KEYS.PSYCHOPEDAGOGICAL_PROTOCOLS,
      []
    );
    let psychopedagogicalCases = this.getItem<PsychopedagogicalCase[]>(
      STORAGE_KEYS.PSYCHOPEDAGOGICAL_CASES,
      []
    );

    const isFirstRun = institutions.length === 0;

    if (isFirstRun) {
      institutions = INITIAL_INSTITUTIONS;
      classes = INITIAL_CLASSES;
      subjects = [];
      students = INITIAL_STUDENTS;
      teachers = INITIAL_TEACHERS;
      grades = INITIAL_GRADES;
      invoices = INITIAL_INVOICES;
      auditLogs = INITIAL_AUDIT_LOGS;
      schoolUsers = INITIAL_SCHOOL_USERS;
      accounts = DEFAULT_ACCOUNTS;
      subscriptionPlans = INITIAL_SUBSCRIPTION_PLANS;
      digitalArchive = INITIAL_DIGITAL_ARCHIVE;
      attendance = INITIAL_ATTENDANCE;
      financialNotifications = INITIAL_FINANCIAL_NOTIFICATIONS;
      announcements = INITIAL_ANNOUNCEMENTS;
      psychopedagogicalProtocols = INITIAL_PSYCHOPEDAGOGICAL_PROTOCOLS;
      psychopedagogicalCases = INITIAL_PSYCHOPEDAGOGICAL_CASES;

      this.saveAll(
        {
          institutions,
          classes,
          subjects,
          students,
          teachers,
          grades,
          invoices,
          auditLogs,
          schoolUsers,
          accounts,
          subscriptionPlans,
          digitalArchive,
          attendance,
          financialNotifications,
          announcements,
          psychopedagogicalProtocols,
          psychopedagogicalCases
        },
        { preserveUpdatedAt: '1970-01-01T00:00:00.000Z' }
      );
      localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
    } else {
      // Garantir que schoolUsers, accounts, digitalArchive, attendance, notificações, comunicados e psicopedagogia estão inicializados e persistidos
      if (schoolUsers.length === 0) {
        schoolUsers = INITIAL_SCHOOL_USERS;
        this.saveSchoolUsers(schoolUsers);
      }
      if (digitalArchive.length === 0 && !localStorage.getItem(STORAGE_KEYS.DIGITAL_ARCHIVE)) {
        digitalArchive = INITIAL_DIGITAL_ARCHIVE;
        this.saveDigitalArchive(digitalArchive);
      }
      if (attendance.length === 0 && !localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
        attendance = INITIAL_ATTENDANCE;
        this.saveAttendance(attendance);
      }
      if (
        financialNotifications.length === 0 &&
        !localStorage.getItem(STORAGE_KEYS.FINANCIAL_NOTIFICATIONS)
      ) {
        financialNotifications = INITIAL_FINANCIAL_NOTIFICATIONS;
        this.saveFinancialNotifications(financialNotifications);
      }
      if (
        announcements.length === 0 &&
        !localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)
      ) {
        announcements = INITIAL_ANNOUNCEMENTS;
        this.saveAnnouncements(announcements);
      }
      if (
        psychopedagogicalProtocols.length === 0 &&
        !localStorage.getItem(STORAGE_KEYS.PSYCHOPEDAGOGICAL_PROTOCOLS)
      ) {
        psychopedagogicalProtocols = INITIAL_PSYCHOPEDAGOGICAL_PROTOCOLS;
        this.savePsychopedagogicalProtocols(psychopedagogicalProtocols);
      }
      if (
        psychopedagogicalCases.length === 0 &&
        !localStorage.getItem(STORAGE_KEYS.PSYCHOPEDAGOGICAL_CASES)
      ) {
        psychopedagogicalCases = INITIAL_PSYCHOPEDAGOGICAL_CASES;
        this.savePsychopedagogicalCases(psychopedagogicalCases);
      }
      this.saveAccounts(accounts);
      if (savedVersion !== CURRENT_STORAGE_VERSION) {
        const initialById = new Map(INITIAL_GRADES.map((g) => [g.id, g]));
        const primaryClassIds = new Set(
          classes.filter((c) => c.subsystemCode === 'primario_geral').map((c) => c.id)
        );
        let gradesChanged = false;
        grades = grades.map((g) => {
          const seedMatch = initialById.get(g.id);
          if (seedMatch && g.ac1 === undefined) {
            gradesChanged = true;
            return seedMatch;
          }
          if (primaryClassIds.has(g.classId) && g.ac1 === undefined && ((g.mt ?? 0) > 10 || (g.mac ?? 0) > 10)) {
            gradesChanged = true;
            const scaleHalf = (v?: number) => (v !== undefined ? Math.round((v / 2) * 10) / 10 : undefined);
            const mac = scaleHalf(g.mac);
            const npt = scaleHalf(g.npt);
            const mt = scaleHalf(g.mt);
            return {
              ...g,
              ac1: mac,
              ac2: mac,
              ac3: mac,
              mac,
              npt,
              mt,
              finalGrade: mt,
              resultStatus: mt !== undefined ? (mt >= 5.0 ? 'Transita' : mt >= 3.5 ? 'Recurso' : 'Não Transita') : 'Pendente'
            };
          }
          return g;
        });
        if (gradesChanged) {
          this.saveGrades(grades);
        }
        localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
      }
    }

    return {
      institutions,
      classes,
      subjects,
      students,
      teachers,
      grades,
      invoices,
      auditLogs,
      schoolUsers,
      accounts,
      subscriptionPlans,
      digitalArchive,
      attendance,
      financialNotifications,
      announcements,
      psychopedagogicalProtocols,
      psychopedagogicalCases,
      version: CURRENT_STORAGE_VERSION,
      updatedAt: localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || undefined
    };
  }

  public hasPersistedData(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION));
  }

  public getLastUpdatedTimestamp(): number {
    if (typeof window === 'undefined') return 0;
    const ts = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return ts ? Date.parse(ts) || 0 : 0;
  }

  // Métodos de Persistência Unitária
  public saveInstitutions(institutions: Institution[]): void {
    this.setItem(STORAGE_KEYS.INSTITUTIONS, institutions);
  }

  public saveClasses(classes: ClassRoom[]): void {
    this.setItem(STORAGE_KEYS.CLASSES, classes);
  }

  public saveSubjects(subjects: SchoolSubject[]): void {
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects);
  }

  public saveStudents(students: Student[]): void {
    this.setItem(STORAGE_KEYS.STUDENTS, students);
  }

  public saveTeachers(teachers: Teacher[]): void {
    this.setItem(STORAGE_KEYS.TEACHERS, teachers);
  }

  public saveGrades(grades: GradeRecord[]): void {
    this.setItem(STORAGE_KEYS.GRADES, grades);
  }

  public saveInvoices(invoices: Invoice[]): void {
    this.setItem(STORAGE_KEYS.INVOICES, invoices);
  }

  public saveAuditLogs(auditLogs: AuditLogItem[]): void {
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, auditLogs);
  }

  public saveSchoolUsers(schoolUsers: SchoolUser[]): void {
    this.setItem(STORAGE_KEYS.SCHOOL_USERS, schoolUsers);
  }

  public saveSubscriptionPlans(plans: SubscriptionPlan[]): void {
    this.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, plans);
  }

  public saveDigitalArchive(items: DigitalArchiveDocument[]): void {
    // Evita exceder quota do LocalStorage se o ficheiro já estiver guardado no servidor
    const sanitized = items.map((doc) =>
      doc.fileUrl && doc.fileUrl.startsWith('/api/archive/')
        ? { ...doc, dataUrl: undefined }
        : doc
    );
    this.setItem(STORAGE_KEYS.DIGITAL_ARCHIVE, sanitized);
  }

  public saveAttendance(records: AttendanceRecord[]): void {
    this.setItem(STORAGE_KEYS.ATTENDANCE, records);
  }

  public saveFinancialNotifications(items: FinancialNotification[]): void {
    this.setItem(STORAGE_KEYS.FINANCIAL_NOTIFICATIONS, items);
  }

  public saveAnnouncements(items: Announcement[]): void {
    this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, items);
  }

  public savePsychopedagogicalProtocols(items: PsychopedagogicalProtocol[]): void {
    this.setItem(STORAGE_KEYS.PSYCHOPEDAGOGICAL_PROTOCOLS, items);
  }

  public savePsychopedagogicalCases(items: PsychopedagogicalCase[]): void {
    this.setItem(STORAGE_KEYS.PSYCHOPEDAGOGICAL_CASES, items);
  }

  // Gestão Unificada de Credenciais & Permissões (Login/Cadastro)
  public getAccounts(): StoredCredential[] {
    if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
    const existing = this.getItem<StoredCredential[]>(STORAGE_KEYS.AUTH_ACCOUNTS, []);
    if (existing.length === 0) {
      const normalized = this.loadNormalizedAccounts();
      this.saveAccounts(normalized);
      return normalized;
    }
    return existing;
  }

  public saveAccounts(accounts: StoredCredential[]): void {
    this.setItem(STORAGE_KEYS.AUTH_ACCOUNTS, accounts);
  }

  public upsertAccount(cred: StoredCredential): StoredCredential[] {
    const current = this.getAccounts();
    const cleanEmail = cred.email.trim().toLowerCase();
    const normalized: StoredCredential = {
      ...cred,
      email: cleanEmail,
      password: cred.password || '123',
      status: cred.status || 'activo'
    };
    const next = [
      normalized,
      ...current.filter((a) => a.email.toLowerCase() !== cleanEmail)
    ];
    this.saveAccounts(next);
    return next;
  }

  public updateAccountStatus(email: string, status: 'activo' | 'inactivo'): StoredCredential[] {
    const cleanEmail = email.trim().toLowerCase();
    const current = this.getAccounts();
    const next = current.map((a) =>
      a.email.toLowerCase() === cleanEmail ? { ...a, status } : a
    );
    this.saveAccounts(next);
    return next;
  }

  public updateAccountPassword(email: string, newPassword: string): StoredCredential[] {
    const cleanEmail = email.trim().toLowerCase();
    const current = this.getAccounts();
    const next = current.map((a) =>
      a.email.toLowerCase() === cleanEmail ? { ...a, password: newPassword } : a
    );
    this.saveAccounts(next);
    return next;
  }

  public deleteAccountByEmail(email: string): StoredCredential[] {
    const cleanEmail = email.trim().toLowerCase();
    const current = this.getAccounts();
    const next = current.filter((a) => a.email.toLowerCase() !== cleanEmail);
    this.saveAccounts(next);
    return next;
  }

  /**
   * Guarda todo o conjunto de dados simultaneamente
   */
  public saveAll(
    data: Partial<StorageDataBundle>,
    options?: { preserveUpdatedAt?: string }
  ): void {
    if (data.institutions) this.saveInstitutions(data.institutions);
    if (data.classes) this.saveClasses(data.classes);
    if (data.subjects) this.saveSubjects(data.subjects);
    if (data.students) this.saveStudents(data.students);
    if (data.teachers) this.saveTeachers(data.teachers);
    if (data.grades) this.saveGrades(data.grades);
    if (data.invoices) this.saveInvoices(data.invoices);
    if (data.auditLogs) this.saveAuditLogs(data.auditLogs);
    if (data.schoolUsers) this.saveSchoolUsers(data.schoolUsers);
    if (data.accounts) this.saveAccounts(data.accounts);
    if (data.subscriptionPlans) this.saveSubscriptionPlans(data.subscriptionPlans);
    if (data.digitalArchive) this.saveDigitalArchive(data.digitalArchive);
    if (data.attendance) this.saveAttendance(data.attendance);
    if (data.financialNotifications) this.saveFinancialNotifications(data.financialNotifications);
    if (data.announcements) this.saveAnnouncements(data.announcements);
    if (data.psychopedagogicalProtocols) {
      this.savePsychopedagogicalProtocols(data.psychopedagogicalProtocols);
    }
    if (data.psychopedagogicalCases) {
      this.savePsychopedagogicalCases(data.psychopedagogicalCases);
    }
    if (typeof window !== 'undefined') {
      const targetTs =
        options?.preserveUpdatedAt && !Number.isNaN(Date.parse(options.preserveUpdatedAt))
          ? options.preserveUpdatedAt
          : new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, targetTs);
      localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
    }
  }

  /**
   * Obtém estatísticas do armazenamento local para visualização de métricas
   */
  public getStorageStats(): StorageStats {
    const bundle = this.initializeStorage();
    let totalLength = 0;

    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach((k) => {
        const item = localStorage.getItem(k);
        if (item) totalLength += item.length * 2;
      });
    }

    return {
      institutionsCount: bundle.institutions.length,
      classesCount: bundle.classes.length,
      subjectsCount: (bundle.subjects || []).length,
      studentsCount: bundle.students.length,
      teachersCount: bundle.teachers.length,
      gradesCount: bundle.grades.length,
      invoicesCount: bundle.invoices.length,
      auditLogsCount: bundle.auditLogs.length,
      schoolUsersCount: bundle.schoolUsers.length,
      accountsCount: bundle.accounts.length,
      approxSizeKb: Number((totalLength / 1024).toFixed(2)),
      lastUpdated:
        (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.LAST_SYNC)) ||
        new Date().toISOString()
    };
  }

  /**
   * Exporta todo o banco local para ficheiro JSON de backup
   */
  public exportBackupJson(): string {
    const bundle = this.initializeStorage();
    const exportObject: StorageDataBundle = {
      ...bundle,
      version: CURRENT_STORAGE_VERSION,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(exportObject, null, 2);
  }

  /**
   * Restaura dados de um ficheiro JSON
   */
  public importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as StorageDataBundle;
      if (!parsed || !Array.isArray(parsed.institutions)) {
        throw new Error('Ficheiro de backup inválido: não contém instituições.');
      }
      this.saveAll(parsed);
      return true;
    } catch (e) {
      console.error('Erro ao importar backup JSON:', e);
      return false;
    }
  }

  /**
   * Restaura o sistema para o estado padrão de demonstração
   */
  public resetToDefaults(): StorageDataBundle {
    const defaultBundle: StorageDataBundle = {
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
      version: CURRENT_STORAGE_VERSION,
      exportedAt: new Date().toISOString()
    };
    this.saveAll(defaultBundle);
    return defaultBundle;
  }

  /**
   * Gera comandos SQL INSERT prontos para carregar directamente no PostgreSQL / Supabase
   * alinhados com o esquema oficial de supabase-schema.sql
   */
  public generateSupabaseSqlInserts(bundle?: StorageDataBundle): string {
    const data = bundle || this.initializeStorage();
    const lines: string[] = [];

    lines.push('-- =====================================================================');
    lines.push('-- NEUROEDUCA - SCRIPT DE POVOAMENTO DE DADOS LOCAIS PARA O SUPABASE');
    lines.push(`-- Gerado em: ${new Date().toISOString()}`);
    lines.push('-- Tabelas: institutions, classes, students, teachers, invoices, users');
    lines.push('-- =====================================================================\n');

    // 1. Instituições
    lines.push('-- 1. INSTITUIÇÕES');
    data.institutions.forEach((inst) => {
      const code = inst.code || inst.id;
      const name = inst.name.replace(/'/g, "''");
      const province = inst.province.replace(/'/g, "''");
      const acronym = (inst.acronym || '').replace(/'/g, "''");
      const maxClasses = inst.maxClasses || 20;

      lines.push(
        `INSERT INTO public.institutions (id, code, name, acronym, province, institution_type, category, max_classes, status) ` +
        `VALUES ('${inst.id}', '${code}', '${name}', '${acronym}', '${province}', '${inst.institutionType || 'privada'}', '${inst.category || 'complexo_escolar'}', ${maxClasses}, '${inst.status || 'active'}') ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, max_classes = EXCLUDED.max_classes;`
      );
    });
    lines.push('');

    // 2. Utilizadores & Permissões
    lines.push('-- 2. UTILIZADORES E PERMISSÕES (USERS)');
    (data.schoolUsers || []).forEach((usr) => {
      const name = usr.fullName.replace(/'/g, "''");
      const email = usr.email.replace(/'/g, "''");
      const instValue =
        usr.institutionId && usr.institutionId !== 'municipal'
          ? `'${usr.institutionId}'`
          : 'NULL';
      lines.push(
        `INSERT INTO public.users (id, institution_id, full_name, email, role, status) ` +
        `VALUES ('${usr.id}', ${instValue}, '${name}', '${email}', '${usr.role}', '${usr.status}') ` +
        `ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;`
      );
    });
    lines.push('');

    // 3. Turmas
    lines.push('-- 3. TURMAS (CLASSES)');
    data.classes.forEach((cls) => {
      const name = cls.name.replace(/'/g, "''");
      const code = cls.code.replace(/'/g, "''");
      const room = cls.room.replace(/'/g, "''");
      lines.push(
        `INSERT INTO public.classes (id, institution_id, name, code, room, shift, academic_year, max_capacity) ` +
        `VALUES ('${cls.id}', '${cls.institutionId}', '${name}', '${code}', '${room}', '${cls.shift}', '${cls.academicYear}', ${cls.maxCapacity}) ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    });
    lines.push('');

    // 4. Alunos
    lines.push('-- 4. ESTUDANTES (STUDENTS)');
    data.students.forEach((stu) => {
      const name = stu.fullName.replace(/'/g, "''");
      const proc = stu.processNumber.replace(/'/g, "''");
      const guardian = (stu.guardianName || '').replace(/'/g, "''");
      const bi = (stu.identityCardNumber || '').replace(/'/g, "''");

      lines.push(
        `INSERT INTO public.students (id, institution_id, class_id, full_name, process_number, identity_card_number, guardian_name, guardian_phone, academic_status) ` +
        `VALUES ('${stu.id}', '${stu.institutionId}', '${stu.classId}', '${name}', '${proc}', '${bi}', '${guardian}', '${stu.guardianPhone || ''}', '${stu.academicStatus}') ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    });
    lines.push('');

    // 5. Docentes
    lines.push('-- 5. DOCENTES / PROFESSORES (TEACHERS)');
    data.teachers.forEach((t) => {
      const name = t.fullName.replace(/'/g, "''");
      const spec = t.specialization.replace(/'/g, "''");
      lines.push(
        `INSERT INTO public.teachers (id, institution_id, staff_code, full_name, specialization, email, phone) ` +
        `VALUES ('${t.id}', '${t.institutionId}', '${t.staffCode}', '${name}', '${spec}', '${t.email}', '${t.phone}') ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    });
    lines.push('');

    // 6. Facturas
    lines.push('-- 6. FACTURAS E PROPINAS (INVOICES)');
    data.invoices.forEach((inv) => {
      const num = inv.invoiceNumber.replace(/'/g, "''");
      const desc = inv.description.replace(/'/g, "''");
      const ref = (inv.multicaixaReference || '').replace(/'/g, "''");

      lines.push(
        `INSERT INTO public.invoices (id, institution_id, student_id, invoice_number, description, total_aoa, amount_paid_aoa, balance_aoa, status, multicaixa_reference) ` +
        `VALUES ('${inv.id}', '${inv.institutionId}', '${inv.studentId}', '${num}', '${desc}', ${inv.totalAoa}, ${inv.amountPaidAoa}, ${inv.balanceAoa}, '${inv.status}', '${ref}') ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    });
    lines.push('');

    lines.push('-- FIM DO SCRIPT DE MIGRAÇÃO');
    return lines.join('\n');
  }
}

export const storageService = new StorageService();
