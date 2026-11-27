/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Sistema de Gestão Escolar Multi-institucional de Angola
 * Slogan: Gestão inteligente para uma educação de qualidade
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InstitutionsManager } from './components/SuperAdmin/InstitutionsManager';
import { SuperUsersManager } from './components/SuperAdmin/SuperUsersManager';
import { SubscriptionPlans } from './components/SuperAdmin/SubscriptionPlans';
import { CurriculumDatabaseViewer } from './components/SuperAdmin/CurriculumDatabaseViewer';
import { SupabaseSqlViewer } from './components/SuperAdmin/SupabaseSqlViewer';
import { AuditLogViewer } from './components/SuperAdmin/AuditLogViewer';
import { PsychopedagogicalManager } from './components/SuperAdmin/PsychopedagogicalManager';
import { NavDeepLinkPayload } from './components/common/NavigationFilterDropdown';

import { InstitutionDashboard } from './components/Academic/InstitutionDashboard';
import { CurriculumExplorer } from './components/Academic/CurriculumExplorer';
import { ClassesManager } from './components/Academic/ClassesManager';
import { ClassListsSheet } from './components/Academic/ClassListsSheet';
import { SubjectsManager } from './components/Academic/SubjectsManager';
import { StudentsManager } from './components/Academic/StudentsManager';
import { TeachersManager } from './components/Academic/TeachersManager';
import { AttendanceManager, formatMonthReference } from './components/Academic/AttendanceManager';
import { EvaluationCenter } from './components/Evaluation/EvaluationCenter';
import { SubsystemSpecificViews } from './components/Specialized/SubsystemSpecificViews';
import {
  FinancialManager,
  RegisterEnrollmentFeePayload,
  SendFinancialNotificationInput
} from './components/Financial/FinancialManager';
import { DocumentCenter } from './components/Documents/DocumentCenter';
import { DigitalArchiveCenter } from './components/Documents/DigitalArchiveCenter';
import {
  AnnouncementsCenter,
  CreateAnnouncementInput
} from './components/Communications/AnnouncementsCenter';
import { PedagogicalAssistant } from './components/AI/PedagogicalAssistant';
import { ReportsDashboard } from './components/Reports/ReportsDashboard';
import { CommandPalette } from './components/CommandPalette';
import { AuthPage } from './components/Auth/AuthPage';
import { SchoolSettings } from './components/Academic/SchoolSettings';
import {
  SchoolUsersManager,
  ProfessorClassAssignmentSelection
} from './components/Academic/SchoolUsersManager';
import { MobileBottomNav } from './components/Navigation/MobileBottomNav';
import { StudentPortal } from './components/StudentPortal/StudentPortal';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { LocalhostMemoryModal } from './components/common/LocalhostMemoryModal';
import {
  MunicipalDirectorDashboard,
  MunicipalSection
} from './components/Municipal/MunicipalDirectorDashboard';
import {
  createDemoSeedBundle,
  createEmptyBundle,
  deleteAccountInList,
  StorageDataBundle,
  updateAccountPasswordInList,
  updateAccountStatusInList,
  upsertAccountInList
} from './services/storageService';
import {
  clearSupabaseAuthSession,
  deleteStudentDocumentFromSupabaseStorage,
  fetchServerSupabaseStatus,
  getSupabaseConfig,
  logoutFromSupabase,
  markAnnouncementReadInSupabase,
  pullSupabaseDataToLocal,
  restoreSessionFromSupabase,
  SupabaseMutationBatch,
  syncChangesToSupabaseClient,
  syncLocalDataToSupabase,
  uploadStudentDocumentToSupabaseStorage
} from './lib/supabaseClient';
import { resolveSubjectsForClass } from './utils/evaluationEngine';
import { resolveAuthorizedStudentsForUser } from './utils/studentAccess';
import {
  filterAnnouncementsForUser,
  getUserAnnouncementReadKey,
  isAnnouncementReadByUser,
  isSchoolAdminSenderAllowed
} from './utils/announcementAccess';

import {
  INITIAL_SUBSCRIPTION_PLANS
} from './data/initialData';

import {
  Institution,
  UserRole,
  UserProfile,
  Student,
  ClassRoom,
  Teacher,
  GradeRecord,
  Invoice,
  PaymentMethod,
  AuditLogItem,
  SchoolUser,
  StoredCredential,
  SchoolSubject,
  DigitalArchiveDocument,
  DigitalArchiveStatus,
  AttendanceRecord,
  JustificationSource,
  FinancialNotification,
  FinancialNotificationTarget,
  Announcement,
  DEFAULT_INSTITUTION_FEATURES,
  PsychopedagogicalProtocol,
  PsychopedagogicalCase,
  PsychopedagogicalSession,
  PsychopedagogicalInstitutionConfig
} from './types';

function getDefaultTabForRole(role?: UserRole): string {
  if (role === 'super_admin') return 'super_institutions';
  if (role === 'director_municipal') return 'municipal_dashboard';
  if (role === 'aluno' || role === 'encarregado_educacao') return 'student_portal';
  if (role === 'professor' || role === 'director_turma') return 'classes';
  if (role === 'funcionario_financeiro') return 'financial';
  return 'dashboard';
}

export default function App() {
  const [initialData] = useState<StorageDataBundle>(() => createEmptyBundle());

  const [institutions, setInstitutions] = useState<Institution[]>(initialData.institutions);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Estado de Autenticação (Sessão validada no Supabase via cookie HttpOnly)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [activeRole, setActiveRole] = useState<UserRole>('director_geral');
  const [academicYear] = useState('2026/2027');

  const [classes, setClasses] = useState<ClassRoom[]>(initialData.classes ?? []);
  const [subjects, setSubjects] = useState<SchoolSubject[]>(initialData.subjects ?? []);
  const [students, setStudents] = useState<Student[]>(initialData.students ?? []);
  const [teachers, setTeachers] = useState<Teacher[]>(initialData.teachers ?? []);
  const [grades, setGrades] = useState<GradeRecord[]>(initialData.grades ?? []);
  const [invoices, setInvoices] = useState<Invoice[]>(initialData.invoices ?? []);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialData.auditLogs ?? []);
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>(initialData.schoolUsers ?? []);
  const [accounts, setAccounts] = useState<StoredCredential[]>(initialData.accounts ?? []);
  const [digitalArchive, setDigitalArchive] = useState<DigitalArchiveDocument[]>(
    initialData.digitalArchive ?? []
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    initialData.attendance ?? []
  );
  const [financialNotifications, setFinancialNotifications] = useState<FinancialNotification[]>(
    initialData.financialNotifications ?? []
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    initialData.announcements ?? []
  );
  const [psychopedagogicalProtocols, setPsychopedagogicalProtocols] = useState<
    PsychopedagogicalProtocol[]
  >(initialData.psychopedagogicalProtocols ?? []);
  const [psychopedagogicalCases, setPsychopedagogicalCases] = useState<
    PsychopedagogicalCase[]
  >(initialData.psychopedagogicalCases ?? []);

  const [currentTab, setCurrentTab] = useState<string>(() => getDefaultTabForRole());
  const [currentEvalSubTab, setCurrentEvalSubTab] = useState<
    'mini_pauta' | 'pauta_geral' | 'boletim_aluno'
  >('mini_pauta');

  // Estado para a Paleta de Comandos (⌘K) e Menu Lateral (Fecha por defeito em mobile)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });
  const [openStudentModalKey, setOpenStudentModalKey] = useState<number | undefined>(undefined);
  const [openClassModalKey, setOpenClassModalKey] = useState<number | undefined>(undefined);
  const [openSubjectModalKey, setOpenSubjectModalKey] = useState<number | undefined>(undefined);
  const [openInvoiceModalKey, setOpenInvoiceModalKey] = useState<number | undefined>(undefined);

  // Estado para Instalação de APK (PWA), Backup/Nuvem, Deep-Link e Notificações de Segurança
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);
  const [navDeepLink, setNavDeepLink] = useState<(NavDeepLinkPayload & { key: number }) | null>(null);

  // Isolamento Estrito nos 4 Níveis de Acesso (Sem cruzamento entre painéis)
  const isStudentOrGuardian =
    currentUser?.role === 'aluno' ||
    currentUser?.role === 'encarregado_educacao';

  const isProfessorRole =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma';

  const isSuperAdminRole = currentUser?.role === 'super_admin';

  const isMunicipalDirectorRole = currentUser?.role === 'director_municipal';

  const isSchoolAdminRole = Boolean(
    currentUser &&
      !isStudentOrGuardian &&
      !isProfessorRole &&
      !isSuperAdminRole &&
      !isMunicipalDirectorRole
  );

  // Apenas o Tesoureiro autenticado tem autoridade exclusiva de registo financeiro e envio de notificações financeiras
  const isTreasurerUser = currentUser?.role === 'funcionario_financeiro';

  // Dados estritamente autorizados quando em sessão de Aluno ou Encarregado de Educação (Defesa em profundidade na raiz)
  const authorizedStudentPortalStudents = useMemo(() => {
    if (!isStudentOrGuardian || !currentInstitution) return [];
    return resolveAuthorizedStudentsForUser(
      students,
      currentInstitution.id,
      currentUser,
      activeRole
    );
  }, [isStudentOrGuardian, students, currentInstitution, currentUser, activeRole]);

  const authorizedStudentIds = useMemo(
    () => new Set(authorizedStudentPortalStudents.map((s) => s.id)),
    [authorizedStudentPortalStudents]
  );

  const authorizedClassIds = useMemo(
    () => new Set(authorizedStudentPortalStudents.map((s) => s.classId)),
    [authorizedStudentPortalStudents]
  );

  const scopedStudentClasses = useMemo(
    () => classes.filter((c) => authorizedClassIds.has(c.id)),
    [classes, authorizedClassIds]
  );

  const scopedStudentGrades = useMemo(
    () => grades.filter((g) => authorizedStudentIds.has(g.studentId)),
    [grades, authorizedStudentIds]
  );

  const scopedStudentInvoices = useMemo(
    () => invoices.filter((i) => authorizedStudentIds.has(i.studentId)),
    [invoices, authorizedStudentIds]
  );

  const scopedStudentAttendance = useMemo(
    () => attendanceRecords.filter((a) => authorizedStudentIds.has(a.studentId)),
    [attendanceRecords, authorizedStudentIds]
  );

  const scopedStudentArchive = useMemo(
    () => digitalArchive.filter((d) => authorizedStudentIds.has(d.studentId)),
    [digitalArchive, authorizedStudentIds]
  );

  const scopedStudentFinNotifications = useMemo(
    () => financialNotifications.filter((n) => authorizedStudentIds.has(n.studentId)),
    [financialNotifications, authorizedStudentIds]
  );

  // Interceptador e redirecionador imediato de acessos não autorizados conforme as permissões
  useEffect(() => {
    if (!currentUser) return;

    if (isStudentOrGuardian) {
      const allowedStudentTabs = [
        'student_portal',
        'student_grades',
        'student_attendance',
        'student_tuition',
        'student_enrollment',
        'student_archive',
        'digital_archive',
        'documents',
        'communications'
      ];

      if (!allowedStudentTabs.includes(currentTab)) {
        setCurrentTab('student_portal');
        setAccessDeniedNotice(
          'Restrição de Segurança: Alunos e Encarregados de Educação não têm permissões aos painéis da Administração nem do Professor.'
        );
        const timer = setTimeout(() => setAccessDeniedNotice(null), 6000);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (isProfessorRole) {
      const allowedProfessorTabs = [
        'classes',
        'students',
        'attendance',
        'evaluations',
        'digital_archive',
        'pedagogical_ai',
        'communications'
      ];
      if (!allowedProfessorTabs.includes(currentTab)) {
        setCurrentTab('classes');
        setAccessDeniedNotice(
          'Restrição de Perfil (Docente): O Professor não tem permissão ao painel do Administrador nem ao painel de Alunos/Encarregados.'
        );
        const timer = setTimeout(() => setAccessDeniedNotice(null), 6000);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (isSuperAdminRole) {
      if (currentInstitution !== null) {
        setCurrentInstitution(null);
      }
      const allowedSuperAdminTabs = [
        'super_institutions',
        'super_users',
        'super_subscriptions',
        'super_communications',
        'super_psychopedagogical',
        'super_curriculum',
        'super_supabase_sql',
        'super_audit'
      ];
      if (!allowedSuperAdminTabs.includes(currentTab)) {
        setCurrentTab('super_institutions');
        setAccessDeniedNotice(
          'Restrição de Segurança: O Administrador Geral não tem permissão ao painel do Professor, da Direcção Escolar nem de Alunos/Encarregados.'
        );
        const timer = setTimeout(() => setAccessDeniedNotice(null), 6000);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (isMunicipalDirectorRole) {
      if (currentInstitution !== null) {
        setCurrentInstitution(null);
      }
      const allowedMunicipalTabs = [
        'municipal_dashboard',
        'municipal_schools',
        'municipal_enrollment',
        'municipal_performance'
      ];
      if (!allowedMunicipalTabs.includes(currentTab)) {
        setCurrentTab('municipal_dashboard');
        setAccessDeniedNotice(
          'Restrição de Segurança: O Director Municipal da Educação opera exclusivamente no painel consolidado do seu município.'
        );
        const timer = setTimeout(() => setAccessDeniedNotice(null), 6000);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (isSchoolAdminRole) {
      const allowedSchoolAdminTabs = [
        'dashboard',
        'school_settings',
        'classes',
        'class_lists',
        'subjects',
        'students',
        'attendance',
        'school_users',
        'teachers',
        'evaluations',
        'curriculum_explorer',
        'financial',
        'specialized_subsystems',
        'documents',
        'digital_archive',
        'communications',
        'reports',
        'pedagogical_ai',
        ...(currentInstitution?.features?.psychopedagogicalSupport ? ['psychopedagogical'] : []),
        'super_supabase_sql'
      ];
      if (!allowedSchoolAdminTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
        setAccessDeniedNotice(
          'Restrição de Segurança: O Administrador Escolar não tem acesso ao painel de Alunos/Encarregados nem ao painel do Super Administrador.'
        );
        const timer = setTimeout(() => setAccessDeniedNotice(null), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [
    currentTab,
    isStudentOrGuardian,
    isProfessorRole,
    isSuperAdminRole,
    isMunicipalDirectorRole,
    isSchoolAdminRole,
    currentInstitution,
    currentUser
  ]);

  // Identificação do professor ativo quando a sessão for de Docente (priorizando a escola actual)
  const instTeachers = currentInstitution
    ? teachers.filter((t) => t.institutionId === currentInstitution.id)
    : teachers;
  const currentTeacher = isProfessorRole
    ? (instTeachers.find(
        (t) => t.email.toLowerCase() === (currentUser?.email || '').toLowerCase()
      ) ||
       teachers.find(
         (t) => t.email.toLowerCase() === (currentUser?.email || '').toLowerCase()
       ) ||
       instTeachers.find((t) =>
         t.fullName.toLowerCase().includes(currentUser?.fullName?.toLowerCase().split(' ')[0] || '')
       ) ||
       instTeachers[0] ||
       teachers[0])
    : null;

  const scopedAnnouncements = useMemo(
    () =>
      filterAnnouncementsForUser(announcements, {
        currentUser,
        activeRole,
        currentInstitution,
        authorizedStudents: authorizedStudentPortalStudents,
        currentTeacher,
        classes
      }),
    [
      announcements,
      currentUser,
      activeRole,
      currentInstitution,
      authorizedStudentPortalStudents,
      currentTeacher,
      classes
    ]
  );

  const unreadAnnouncementsCount = useMemo(
    () =>
      scopedAnnouncements.filter(
        (a) => a.senderUserId !== currentUser?.id && !isAnnouncementReadByUser(a, currentUser)
      ).length,
    [scopedAnnouncements, currentUser]
  );

  // O atalho ⌘K / Ctrl+K é gerido directamente pelo Filtro Suspenso Global (NavigationFilterDropdown) no Header

  // Estado para abrir gerador de documentos pré-preenchido
  const [docStudentTarget, setDocStudentTarget] = useState<Student | undefined>(undefined);
  const [docTypeTarget, setDocTypeTarget] = useState<string | undefined>(undefined);

  const buildCurrentBundle = (overrides?: Partial<StorageDataBundle>): StorageDataBundle => ({
    institutions: overrides?.institutions ?? institutions,
    classes: overrides?.classes ?? classes,
    subjects: overrides?.subjects ?? subjects,
    students: overrides?.students ?? students,
    teachers: overrides?.teachers ?? teachers,
    grades: overrides?.grades ?? grades,
    invoices: overrides?.invoices ?? invoices,
    auditLogs: overrides?.auditLogs ?? auditLogs,
    schoolUsers: overrides?.schoolUsers ?? schoolUsers,
    accounts: overrides?.accounts ?? accounts,
    subscriptionPlans: overrides?.subscriptionPlans ?? INITIAL_SUBSCRIPTION_PLANS,
    digitalArchive: overrides?.digitalArchive ?? digitalArchive,
    attendance: overrides?.attendance ?? attendanceRecords,
    financialNotifications: overrides?.financialNotifications ?? financialNotifications,
    announcements: overrides?.announcements ?? announcements,
    psychopedagogicalProtocols:
      overrides?.psychopedagogicalProtocols ?? psychopedagogicalProtocols,
    psychopedagogicalCases: overrides?.psychopedagogicalCases ?? psychopedagogicalCases,
    updatedAt: new Date().toISOString()
  });

  const applyBundleToState = (
    data: Partial<StorageDataBundle>,
    options?: { role?: UserRole; preferredInstitutionId?: string }
  ) => {
    if (Array.isArray(data.institutions)) {
      setInstitutions(data.institutions);
      const targetRole = options?.role ?? currentUser?.role;
      const targetInstId = options?.preferredInstitutionId ?? currentInstitution?.id ?? currentUser?.institutionId;
      if (targetRole === 'super_admin' || targetRole === 'director_municipal') {
        setCurrentInstitution(null);
      } else if (data.institutions.length > 0) {
        const resolved =
          (targetInstId && data.institutions.find((i) => i.id === targetInstId)) ||
          data.institutions[0];
        if (resolved) setCurrentInstitution(resolved);
      } else {
        setCurrentInstitution(null);
      }
    }
    if (Array.isArray(data.classes)) setClasses(data.classes);
    if (Array.isArray(data.subjects)) setSubjects(data.subjects);
    if (Array.isArray(data.students)) setStudents(data.students);
    if (Array.isArray(data.teachers)) setTeachers(data.teachers);
    if (Array.isArray(data.grades)) setGrades(data.grades);
    if (Array.isArray(data.invoices)) setInvoices(data.invoices);
    if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
    if (Array.isArray(data.schoolUsers)) setSchoolUsers(data.schoolUsers);
    if (Array.isArray(data.accounts)) setAccounts(data.accounts);
    if (Array.isArray(data.digitalArchive)) setDigitalArchive(data.digitalArchive);
    if (Array.isArray(data.attendance)) setAttendanceRecords(data.attendance);
    if (Array.isArray(data.financialNotifications)) {
      setFinancialNotifications(data.financialNotifications);
    }
    if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
    if (Array.isArray(data.psychopedagogicalProtocols)) {
      setPsychopedagogicalProtocols(data.psychopedagogicalProtocols);
    }
    if (Array.isArray(data.psychopedagogicalCases)) {
      setPsychopedagogicalCases(data.psychopedagogicalCases);
    }
  };

  const showSyncErrorNotice = (message: string) => {
    setSyncNotice(message);
    setTimeout(() => setSyncNotice(null), 6000);
  };

  const commitCloudChanges = async (batch: SupabaseMutationBatch): Promise<boolean> => {
    try {
      const res = await syncChangesToSupabaseClient(batch);
      if (!res.success) {
        showSyncErrorNotice(
          res.errors?.[0] || 'Erro ao sincronizar alterações com o banco de dados Supabase.'
        );
        return false;
      }
      return true;
    } catch (err: any) {
      showSyncErrorNotice(
        err?.message || 'Falha de ligação ao sincronizar alterações com o Supabase.'
      );
      return false;
    }
  };

  // Restauração de sessão autenticada e dados directamente do Supabase ao carregar a página
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        await fetchServerSupabaseStatus();
        const sessionRes = await restoreSessionFromSupabase();
        if (cancelled) return;

        if (sessionRes.authenticated && sessionRes.account) {
          const acc = sessionRes.account;
          const role = acc.role as UserRole;
          const restoredUser: UserProfile = {
            id: `u-${acc.email}`,
            fullName: acc.fullName,
            email: acc.email,
            phone: '+244 900 000 000',
            role,
            institutionId: acc.institutionId,
            municipality: acc.municipality,
            province: acc.province
          };

          setCurrentUser(restoredUser);
          setActiveRole(role);
          setCurrentTab(getDefaultTabForRole(role));

          const pullRes = await pullSupabaseDataToLocal();
          if (cancelled) return;

          if (pullRes.bundle) {
            applyBundleToState(pullRes.bundle, {
              role,
              preferredInstitutionId: acc.institutionId
            });
          } else if (!pullRes.success && pullRes.errors?.length) {
            showSyncErrorNotice(pullRes.errors[0]);
          }
        }
      } catch (err) {
        console.log('Restauração de sessão Supabase:', err);
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sincronização imediata quando o cabeçalho oficial de uma escola é editado inline
  useEffect(() => {
    const handleHeaderUpdated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === 'default' || !detail.config) return;
      const target = institutions.find((i) => i.id === detail.institutionId);
      if (!target) return;

      const updatedInst: Institution = {
        ...target,
        documentHeader: detail.config
      };
      setInstitutions((prev) =>
        prev.map((inst) => (inst.id === updatedInst.id ? updatedInst : inst))
      );
      if (currentInstitution?.id === updatedInst.id) {
        setCurrentInstitution(updatedInst);
      }
      commitCloudChanges({
        upserts: { institutions: [updatedInst] }
      });
    };

    window.addEventListener('neuroeduca-document-header-updated', handleHeaderUpdated);
    return () => {
      window.removeEventListener('neuroeduca-document-header-updated', handleHeaderUpdated);
    };
  }, [institutions, currentInstitution?.id]);

  const handlePullFromCloud = async () => {
    setIsLoadingCloudData(true);
    try {
      const pullRes = await pullSupabaseDataToLocal();
      if (!pullRes.bundle) {
        throw new Error(pullRes.errors?.[0] || 'Não foi possível carregar dados do Supabase.');
      }
      applyBundleToState(pullRes.bundle, {
        role: currentUser?.role,
        preferredInstitutionId: currentUser?.institutionId || currentInstitution?.id
      });
    } finally {
      setIsLoadingCloudData(false);
    }
  };

  const handleForceSyncCloud = async () => {
    const res = await syncLocalDataToSupabase(buildCurrentBundle(), { pruneMissing: true });
    if (!res.success) {
      throw new Error(res.errors?.[0] || 'Erro ao sincronizar dados com o Supabase.');
    }
  };

  const handleSeedDemoData = async () => {
    const bundle = createDemoSeedBundle();
    applyBundleToState(bundle);
    const res = await syncLocalDataToSupabase(bundle, { pruneMissing: true });
    if (!res.success) {
      showSyncErrorNotice(
        res.errors?.[0] || 'Erro ao enviar dados de demonstração para o Supabase.'
      );
    }
  };

  const handleDataRestored = async (bundle: StorageDataBundle) => {
    applyBundleToState(bundle);
    const res = await syncLocalDataToSupabase(bundle, { pruneMissing: true });
    if (!res.success) {
      showSyncErrorNotice(
        res.errors?.[0] || 'Erro ao sincronizar cópia restaurada com o Supabase.'
      );
    }
  };

  // Handlers para Alunos
  const handleAddStudent = (newStudent: Student) => {
    const updatedStudents = [newStudent, ...students];
    setStudents(updatedStudents);

    const updatedClasses = classes.map((c) =>
      c.id === newStudent.classId
        ? { ...c, enrolledStudentsCount: c.enrolledStudentsCount + 1 }
        : c
    );
    setClasses(updatedClasses);

    const updatedInstitutions = institutions.map((inst) =>
      inst.id === newStudent.institutionId
        ? { ...inst, currentStudentsCount: inst.currentStudentsCount + 1 }
        : inst
    );
    setInstitutions(updatedInstitutions);

    const updatedCurrInst = updatedInstitutions.find((i) => i.id === currentInstitution?.id);
    if (updatedCurrInst) setCurrentInstitution(updatedCurrInst);

    let updatedAccounts = accounts;
    const upsertedAccounts: StoredCredential[] = [];
    if (newStudent.email) {
      updatedAccounts = upsertAccountInList(accounts, {
        email: newStudent.email,
        password: newStudent.portalPassword || '123',
        fullName: `${newStudent.fullName} (Estudante)`,
        role: 'aluno',
        institutionId: newStudent.institutionId,
        institutionName: currentInstitution?.name,
        status: 'activo'
      });
      setAccounts(updatedAccounts);
      const createdAcc = updatedAccounts.find(
        (a) => a.email.toLowerCase() === newStudent.email!.trim().toLowerCase()
      );
      if (createdAcc) upsertedAccounts.push(createdAcc);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: newStudent.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Secretaria Geral',
      userRole: 'Secretário Geral',
      action: 'NOVA_MATRICULA_ALUNO',
      details: `Registo académico do aluno ${newStudent.fullName} (Processo nº ${newStudent.processNumber}) na turma ${newStudent.className}. Taxa de matrícula aguarda registo pelo Tesoureiro.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedClass = updatedClasses.find((c) => c.id === newStudent.classId);
    const changedInst = updatedInstitutions.find((i) => i.id === newStudent.institutionId);

    commitCloudChanges({
      upserts: {
        students: [newStudent],
        ...(changedClass ? { classes: [changedClass] } : {}),
        ...(changedInst ? { institutions: [changedInst] } : {}),
        ...(upsertedAccounts.length > 0 ? { accounts: upsertedAccounts } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions: updatedInstitutions,
        classes: updatedClasses,
        students: updatedStudents,
        teachers
      }
    });
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const prevStudent = students.find((s) => s.id === updatedStudent.id);
    const updatedStudents = students.map((s) =>
      s.id === updatedStudent.id ? updatedStudent : s
    );
    setStudents(updatedStudents);

    const updatedClasses = classes.map((c) => {
      if (c.institutionId !== updatedStudent.institutionId) return c;
      const count = updatedStudents.filter(
        (s) => s.institutionId === c.institutionId && s.classId === c.id
      ).length;
      return { ...c, enrolledStudentsCount: count };
    });
    setClasses(updatedClasses);

    const changedGrades: GradeRecord[] = [];
    const updatedGrades = grades.map((g) => {
      if (g.studentId === updatedStudent.id) {
        const nextGrade = {
          ...g,
          studentName: updatedStudent.fullName,
          studentProcessNumber: updatedStudent.processNumber,
          classId: updatedStudent.classId
        };
        changedGrades.push(nextGrade);
        return nextGrade;
      }
      return g;
    });
    setGrades(updatedGrades);

    const changedInvoices: Invoice[] = [];
    const updatedInvoices = invoices.map((inv) => {
      if (inv.studentId === updatedStudent.id) {
        const nextInv = {
          ...inv,
          studentName: updatedStudent.fullName,
          studentProcessNumber: updatedStudent.processNumber
        };
        changedInvoices.push(nextInv);
        return nextInv;
      }
      return inv;
    });
    setInvoices(updatedInvoices);

    let updatedAccounts = accounts;
    const upsertedAccounts: StoredCredential[] = [];
    const deletedAccountEmails: string[] = [];
    const prevEmail = prevStudent?.email?.trim().toLowerCase();
    const nextEmail = updatedStudent.email?.trim().toLowerCase();
    if (prevEmail && prevEmail !== nextEmail) {
      updatedAccounts = deleteAccountInList(updatedAccounts, prevEmail);
      deletedAccountEmails.push(prevEmail);
    }
    if (nextEmail) {
      updatedAccounts = upsertAccountInList(updatedAccounts, {
        email: nextEmail,
        password: updatedStudent.portalPassword || '123',
        fullName: `${updatedStudent.fullName} (Estudante)`,
        role: 'aluno',
        institutionId: updatedStudent.institutionId,
        institutionName: currentInstitution?.name,
        status: 'activo'
      });
      const accObj = updatedAccounts.find((a) => a.email.toLowerCase() === nextEmail);
      if (accObj) upsertedAccounts.push(accObj);
    }
    setAccounts(updatedAccounts);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: updatedStudent.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Secretaria Geral',
      userRole: currentUser?.role || 'Secretário Geral',
      action: 'ACTUALIZACAO_ALUNO',
      details: `Actualização dos dados do aluno ${updatedStudent.fullName} (Processo nº ${updatedStudent.processNumber}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const affectedClasses = updatedClasses.filter(
      (c) => c.id === updatedStudent.classId || (prevStudent && c.id === prevStudent.classId)
    );

    commitCloudChanges({
      upserts: {
        students: [updatedStudent],
        ...(affectedClasses.length > 0 ? { classes: affectedClasses } : {}),
        ...(changedGrades.length > 0 ? { grades: changedGrades } : {}),
        ...(changedInvoices.length > 0 ? { invoices: changedInvoices } : {}),
        ...(upsertedAccounts.length > 0 ? { accounts: upsertedAccounts } : {}),
        auditLogs: [newLog]
      },
      ...(deletedAccountEmails.length > 0 ? { deletes: { accounts: deletedAccountEmails } } : {}),
      fkContext: {
        institutions,
        classes: updatedClasses,
        students: updatedStudents,
        teachers
      }
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    const updatedStudents = students.filter((s) => s.id !== studentId);
    setStudents(updatedStudents);

    const deletedGradeIds = grades.filter((g) => g.studentId === studentId).map((g) => g.id);
    const deletedInvoiceIds = invoices.filter((i) => i.studentId === studentId).map((i) => i.id);
    const deletedAttendanceIds = attendanceRecords
      .filter((a) => a.studentId === studentId)
      .map((a) => a.id);
    const deletedArchiveIds = digitalArchive
      .filter((d) => d.studentId === studentId)
      .map((d) => d.id);
    const deletedFinNotifIds = financialNotifications
      .filter((n) => n.studentId === studentId)
      .map((n) => n.id);
    const deletedCaseIds = psychopedagogicalCases
      .filter((c) => c.studentId === studentId)
      .map((c) => c.id);

    setGrades((prev) => prev.filter((g) => g.studentId !== studentId));
    setInvoices((prev) => prev.filter((i) => i.studentId !== studentId));
    setAttendanceRecords((prev) => prev.filter((a) => a.studentId !== studentId));
    setDigitalArchive((prev) => prev.filter((d) => d.studentId !== studentId));
    setFinancialNotifications((prev) => prev.filter((n) => n.studentId !== studentId));
    setPsychopedagogicalCases((prev) => prev.filter((c) => c.studentId !== studentId));

    const deletedAccountEmails: string[] = [];
    if (targetStudent.email) {
      const emailLower = targetStudent.email.trim().toLowerCase();
      setAccounts((prev) => deleteAccountInList(prev, emailLower));
      deletedAccountEmails.push(emailLower);
    }

    const updatedClasses = classes.map((c) => {
      if (c.institutionId !== targetStudent.institutionId) return c;
      const count = updatedStudents.filter(
        (s) => s.institutionId === c.institutionId && s.classId === c.id
      ).length;
      return { ...c, enrolledStudentsCount: count };
    });
    setClasses(updatedClasses);

    const updatedInstitutions = institutions.map((inst) => {
      if (inst.id !== targetStudent.institutionId) return inst;
      const instCount = updatedStudents.filter((s) => s.institutionId === inst.id).length;
      return { ...inst, currentStudentsCount: instCount };
    });
    setInstitutions(updatedInstitutions);

    const updatedCurrInst = updatedInstitutions.find((i) => i.id === currentInstitution?.id);
    if (updatedCurrInst) setCurrentInstitution(updatedCurrInst);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetStudent.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Secretaria Geral',
      userRole: currentUser?.role || 'Secretário Geral',
      action: 'REMOCAO_ALUNO',
      details: `Remoção do registo do aluno ${targetStudent.fullName} (Processo nº ${targetStudent.processNumber}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedClass = updatedClasses.find((c) => c.id === targetStudent.classId);
    const changedInst = updatedInstitutions.find((i) => i.id === targetStudent.institutionId);

    commitCloudChanges({
      deletes: {
        students: [studentId],
        ...(deletedGradeIds.length > 0 ? { grades: deletedGradeIds } : {}),
        ...(deletedInvoiceIds.length > 0 ? { invoices: deletedInvoiceIds } : {}),
        ...(deletedAttendanceIds.length > 0 ? { attendance: deletedAttendanceIds } : {}),
        ...(deletedArchiveIds.length > 0 ? { digitalArchive: deletedArchiveIds } : {}),
        ...(deletedFinNotifIds.length > 0 ? { financialNotifications: deletedFinNotifIds } : {}),
        ...(deletedCaseIds.length > 0 ? { psychopedagogicalCases: deletedCaseIds } : {}),
        ...(deletedAccountEmails.length > 0 ? { accounts: deletedAccountEmails } : {})
      },
      upserts: {
        ...(changedClass ? { classes: [changedClass] } : {}),
        ...(changedInst ? { institutions: [changedInst] } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions: updatedInstitutions,
        classes: updatedClasses,
        students: updatedStudents,
        teachers
      }
    });
  };

  // Handlers para Turmas (Responsabilidade Exclusiva do Administrador Escolar)
  const handleAddClass = (newClass: ClassRoom) => {
    if (!isSchoolAdminRole) {
      setAccessDeniedNotice(
        'Restrição de Segurança: A criação de turmas é da inteira responsabilidade do Administrador Escolar.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }
    const updatedClasses = [newClass, ...classes];
    setClasses(updatedClasses);

    const updatedInstitutions = institutions.map((inst) =>
      inst.id === newClass.institutionId
        ? { ...inst, currentClassesCount: inst.currentClassesCount + 1 }
        : inst
    );
    setInstitutions(updatedInstitutions);

    const updatedCurrInst = updatedInstitutions.find((i) => i.id === currentInstitution?.id);
    if (updatedCurrInst) setCurrentInstitution(updatedCurrInst);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: newClass.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Direcção Pedagógica',
      userRole: 'Administrador Escolar',
      action: 'CRIACAO_TURMA',
      details: `Criação da turma ${newClass.name} (Código ${newClass.code}) com limite de ${newClass.maxCapacity} alunos.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedInst = updatedInstitutions.find((i) => i.id === newClass.institutionId);
    commitCloudChanges({
      upserts: {
        classes: [newClass],
        ...(changedInst ? { institutions: [changedInst] } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions: updatedInstitutions,
        classes: updatedClasses,
        students,
        teachers
      }
    });
  };

  const handleUpdateClass = (updatedClass: ClassRoom) => {
    if (!isSchoolAdminRole) {
      setAccessDeniedNotice(
        'Restrição de Segurança: A edição e gestão de turmas é da inteira responsabilidade do Administrador Escolar.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }
    const updatedClasses = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    setClasses(updatedClasses);

    const changedStudents: Student[] = [];
    const updatedStudents = students.map((s) => {
      if (s.classId === updatedClass.id) {
        const nextStudent = {
          ...s,
          className: updatedClass.name,
          gradeLevel: updatedClass.gradeLevel,
          subsystemCode: updatedClass.subsystemCode,
          courseName: updatedClass.courseName,
          shift: updatedClass.shift
        };
        changedStudents.push(nextStudent);
        return nextStudent;
      }
      return s;
    });
    setStudents(updatedStudents);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: updatedClass.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Direcção Pedagógica',
      userRole: 'Administrador Escolar',
      action: 'ACTUALIZACAO_TURMA',
      details: `Actualização da turma ${updatedClass.name} (Sala ${updatedClass.room}, Capacidade ${updatedClass.maxCapacity}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        classes: [updatedClass],
        ...(changedStudents.length > 0 ? { students: changedStudents } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions,
        classes: updatedClasses,
        students: updatedStudents,
        teachers
      }
    });
  };

  const handleDeleteClass = (classId: string) => {
    if (!isSchoolAdminRole) {
      setAccessDeniedNotice(
        'Restrição de Segurança: A remoção de turmas é da inteira responsabilidade do Administrador Escolar.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) return;

    const updatedClasses = classes.filter((c) => c.id !== classId);
    setClasses(updatedClasses);

    const changedStudents: Student[] = [];
    const updatedStudents = students.map((s) => {
      if (s.classId === classId) {
        const nextStudent = { ...s, classId: '', className: 'Sem Turma Atribuída' };
        changedStudents.push(nextStudent);
        return nextStudent;
      }
      return s;
    });
    setStudents(updatedStudents);

    const changedTeachers: Teacher[] = [];
    const updatedTeachers = teachers.map((t) => {
      const hadClass = (t.assignedClasses || []).some((a) => a.classId === classId);
      if (!hadClass) return t;
      const nextTeacher = {
        ...t,
        assignedClasses: (t.assignedClasses || []).filter((a) => a.classId !== classId)
      };
      changedTeachers.push(nextTeacher);
      return nextTeacher;
    });
    setTeachers(updatedTeachers);

    const updatedInstitutions = institutions.map((inst) => {
      if (inst.id !== targetClass.institutionId) return inst;
      const clsCount = updatedClasses.filter((c) => c.institutionId === inst.id).length;
      return { ...inst, currentClassesCount: clsCount };
    });
    setInstitutions(updatedInstitutions);

    const updatedCurrInst = updatedInstitutions.find((i) => i.id === currentInstitution?.id);
    if (updatedCurrInst) setCurrentInstitution(updatedCurrInst);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetClass.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Direcção Pedagógica',
      userRole: 'Administrador Escolar',
      action: 'REMOCAO_TURMA',
      details: `Remoção da turma ${targetClass.name} (Código ${targetClass.code}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedInst = updatedInstitutions.find((i) => i.id === targetClass.institutionId);

    commitCloudChanges({
      deletes: {
        classes: [classId]
      },
      upserts: {
        ...(changedStudents.length > 0 ? { students: changedStudents } : {}),
        ...(changedTeachers.length > 0 ? { teachers: changedTeachers } : {}),
        ...(changedInst ? { institutions: [changedInst] } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions: updatedInstitutions,
        classes: updatedClasses,
        students: updatedStudents,
        teachers: updatedTeachers
      }
    });
  };

  // Handlers para Cadastramento de Disciplinas (Exclusivo Administrador Escolar)
  const handleAddSubject = (newSubject: SchoolSubject) => {
    if (!isSchoolAdminRole) return;
    const updatedSubjects = [newSubject, ...subjects];
    setSubjects(updatedSubjects);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: newSubject.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Direcção Pedagógica',
      userRole: 'Administrador Escolar',
      action: 'CADASTRO_DISCIPLINA',
      details: `Cadastro da disciplina ${newSubject.name} (${newSubject.code}) para ${newSubject.gradeLevel}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: { subjects: [newSubject], auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleUpdateSubject = (updatedSubject: SchoolSubject) => {
    if (!isSchoolAdminRole) return;
    const updatedSubjects = subjects.map((s) =>
      s.id === updatedSubject.id ? updatedSubject : s
    );
    setSubjects(updatedSubjects);
    commitCloudChanges({
      upserts: { subjects: [updatedSubject] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (!isSchoolAdminRole) return;
    const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
    setSubjects(updatedSubjects);
    commitCloudChanges({
      deletes: { subjects: [subjectId] }
    });
  };

  // Handlers para Professores
  const handleAddTeacher = (newTeacher: Teacher) => {
    const updatedTeachers = [newTeacher, ...teachers];
    setTeachers(updatedTeachers);

    const updatedInstitutions = institutions.map((inst) =>
      inst.id === newTeacher.institutionId
        ? { ...inst, currentTeachersCount: inst.currentTeachersCount + 1 }
        : inst
    );
    setInstitutions(updatedInstitutions);

    const updatedCurrInst = updatedInstitutions.find((i) => i.id === currentInstitution?.id);
    if (updatedCurrInst) setCurrentInstitution(updatedCurrInst);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: newTeacher.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Direcção Geral',
      userRole: 'Director Geral',
      action: 'CADASTRO_DOCENTE',
      details: `Cadastro do docente ${newTeacher.fullName} (${newTeacher.academicDegree} em ${newTeacher.specialization}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedInst = updatedInstitutions.find((i) => i.id === newTeacher.institutionId);
    commitCloudChanges({
      upserts: {
        teachers: [newTeacher],
        ...(changedInst ? { institutions: [changedInst] } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions: updatedInstitutions,
        classes,
        students,
        teachers: updatedTeachers
      }
    });
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    if (!isSchoolAdminRole) {
      setAccessDeniedNotice(
        'Restrição de Segurança: A edição de docentes e atribuição de turmas é exclusiva do Administrador Escolar.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const updatedTeachers = teachers.map((t) =>
      t.id === updatedTeacher.id ? updatedTeacher : t
    );
    setTeachers(updatedTeachers);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: updatedTeacher.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Direcção Geral',
      userRole: 'Administrador Escolar',
      action: 'ACTUALIZACAO_DOCENTE',
      details: `Actualização do docente ${updatedTeacher.fullName} com ${updatedTeacher.assignedClasses.length} turma(s) atribuída(s).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: { teachers: [updatedTeacher], auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers: updatedTeachers }
    });
  };

  // Handlers para Notas (Mini-Pautas -> Pautas -> Boletins)
  const upsertGradesIntoList = (prevGrades: GradeRecord[], incomingGrades: GradeRecord[]): GradeRecord[] => {
    let next = [...prevGrades];
    for (const newGrade of incomingGrades) {
      const normalizedSubject = (newGrade.subjectName || '').trim().toLowerCase();
      const existingIndex = next.findIndex(
        (g) =>
          g.id === newGrade.id ||
          (g.studentId === newGrade.studentId &&
            g.period === newGrade.period &&
            (g.subjectId === newGrade.subjectId ||
              (normalizedSubject !== '' &&
                (g.subjectName || '').trim().toLowerCase() === normalizedSubject)))
      );
      if (existingIndex >= 0) {
        next[existingIndex] = { ...next[existingIndex], ...newGrade, id: next[existingIndex].id };
      } else {
        next = [newGrade, ...next];
      }
    }
    return next;
  };

  const handleUpdateGrade = (newGrade: GradeRecord) => {
    const updated = upsertGradesIntoList(grades, [newGrade]);
    setGrades(updated);

    const normalizedSubject = (newGrade.subjectName || '').trim().toLowerCase();
    const persistedGrade =
      updated.find(
        (g) =>
          g.id === newGrade.id ||
          (g.studentId === newGrade.studentId &&
            g.period === newGrade.period &&
            (g.subjectId === newGrade.subjectId ||
              (normalizedSubject !== '' &&
                (g.subjectName || '').trim().toLowerCase() === normalizedSubject)))
      ) || newGrade;

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: newGrade.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentTeacher?.fullName || currentUser?.fullName || 'Professor Responsável',
      userRole: 'Professor',
      action: 'LANCAMENTO_NOTA',
      details: `Lançamento de notas em ${newGrade.subjectName} para o aluno ${newGrade.studentName} (MT: ${newGrade.mt ?? '--'}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: { grades: [persistedGrade], auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleUpdateGradesBatch = (incomingGrades: GradeRecord[]) => {
    if (incomingGrades.length === 0) return;
    const updated = upsertGradesIntoList(grades, incomingGrades);
    setGrades(updated);

    const persistedGrades: GradeRecord[] = incomingGrades.map((ng) => {
      const normalizedSubject = (ng.subjectName || '').trim().toLowerCase();
      return (
        updated.find(
          (g) =>
            g.id === ng.id ||
            (g.studentId === ng.studentId &&
              g.period === ng.period &&
              (g.subjectId === ng.subjectId ||
                (normalizedSubject !== '' &&
                  (g.subjectName || '').trim().toLowerCase() === normalizedSubject)))
        ) || ng
      );
    });

    const sample = incomingGrades[0];
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: sample.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentTeacher?.fullName || currentUser?.fullName || 'Professor Responsável',
      userRole: 'Professor',
      action: 'LANCAMENTO_NOTA',
      details: `Lançamento em lote na Mini-Pauta de ${sample.subjectName} (${incomingGrades.length} aluno(s)).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: { grades: persistedGrades, auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  // Handlers para Pagamentos (Exclusivo do Tesoureiro)
  const handleAddPayment = (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    sendNotification?: boolean
  ) => {
    if (!isTreasurerUser) {
      setAccessDeniedNotice(
        'Restrição Financeira: Apenas o Tesoureiro tem permissão para registar e liquidar pagamentos escolares.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const treasurerName = currentUser?.fullName || 'Tesoureiro';
    const receiptNo = `RC-${Date.now().toString().slice(-6)}`;
    const paidAtDate = new Date().toISOString().split('T')[0];

    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        const newPaid = inv.amountPaidAoa + amount;
        const newBalance = Math.max(0, inv.totalAoa - newPaid);
        return {
          ...inv,
          amountPaidAoa: newPaid,
          balanceAoa: newBalance,
          status: newBalance === 0 ? ('pago' as const) : ('parcial' as const),
          paymentMethod: method,
          paidAt: paidAtDate,
          receiptNumber: receiptNo,
          multicaixaReference: reference || inv.multicaixaReference,
          registeredByUserId: currentUser?.id,
          registeredByName: treasurerName,
          registeredByRole: 'Tesoureiro'
        };
      }
      return inv;
    });

    setInvoices(updated);

    const paidInvoice = updated.find((i) => i.id === invoiceId);
    const targetStudent = paidInvoice ? students.find((s) => s.id === paidInvoice.studentId) : undefined;

    let updatedStudents = students;
    if (paidInvoice && paidInvoice.category === 'matricula' && paidInvoice.status === 'pago' && targetStudent) {
      updatedStudents = students.map((s) =>
        s.id === targetStudent.id
          ? {
              ...s,
              enrollmentFeePaid: true,
              enrollmentAmountAoa: paidInvoice.totalAoa,
              enrollmentReceiptNumber: receiptNo,
              academicStatus: 'confirmado'
            }
          : s
      );
      setStudents(updatedStudents);
    }

    let createdNotification: FinancialNotification | null = null;
    let updatedNotifications = financialNotifications;
    if (sendNotification && paidInvoice && targetStudent) {
      createdNotification = {
        id: `fnotif-${Date.now()}`,
        institutionId: paidInvoice.institutionId,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        studentProcessNumber: targetStudent.processNumber,
        guardianName: targetStudent.guardianName,
        guardianPhone: targetStudent.guardianPhone,
        recipientTarget: 'ambos',
        type: 'confirmacao_pagamento',
        category: paidInvoice.category || 'propina',
        title: `Confirmação de Pagamento (${paidInvoice.invoiceNumber})`,
        message: `Caro(a) Encarregado(a) ${targetStudent.guardianName} e aluno(a) ${targetStudent.fullName}, confirmamos o pagamento de ${amount.toLocaleString('pt-AO')} Kz referente a "${paidInvoice.description}" (${method.replace(/_/g, ' ')}). Recibo nº ${receiptNo}.`,
        amountAoa: amount,
        invoiceId: paidInvoice.id,
        invoiceNumber: paidInvoice.invoiceNumber,
        sentByUserId: currentUser?.id || 'tesoureiro',
        sentByName: treasurerName,
        sentByRole: 'Tesoureiro',
        sentAt: new Date().toISOString(),
        isRead: false
      };
      updatedNotifications = [createdNotification, ...financialNotifications];
      setFinancialNotifications(updatedNotifications);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: treasurerName,
      userRole: 'Tesoureiro',
      action: 'LIQUIDACAO_FINANCEIRA',
      details: `Pagamento de ${amount.toLocaleString('pt-AO')} Kz referente a ${paidInvoice?.description} via ${method} (Recibo ${receiptNo}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedStudent =
      paidInvoice && paidInvoice.category === 'matricula' && paidInvoice.status === 'pago' && targetStudent
        ? updatedStudents.find((s) => s.id === targetStudent.id)
        : undefined;

    commitCloudChanges({
      upserts: {
        ...(paidInvoice ? { invoices: [paidInvoice] } : {}),
        ...(changedStudent ? { students: [changedStudent] } : {}),
        ...(createdNotification ? { financialNotifications: [createdNotification] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students: updatedStudents, teachers }
    });
  };

  // Handlers para Super Admin
  const handleAddInstitution = (newInst: Institution, adminUser?: UserProfile) => {
    const updatedInstitutions = [newInst, ...institutions];
    setInstitutions(updatedInstitutions);

    let updatedSchoolUsers = schoolUsers;
    let updatedAccounts = accounts;
    let createdSchoolUser: SchoolUser | null = null;
    let createdAccount: StoredCredential | null = null;

    if (adminUser) {
      createdSchoolUser = {
        id: adminUser.id,
        institutionId: newInst.id,
        fullName: adminUser.fullName,
        email: adminUser.email,
        phone: adminUser.phone,
        role: 'director_geral',
        status: 'activo',
        departmentOrClass: 'Direcção Geral / Administrador Escolar',
        createdAt: new Date().toISOString().split('T')[0]
      };
      updatedSchoolUsers = [createdSchoolUser, ...schoolUsers];
      setSchoolUsers(updatedSchoolUsers);

      updatedAccounts = upsertAccountInList(accounts, {
        email: adminUser.email,
        password: newInst.adminPassword || '123',
        fullName: adminUser.fullName,
        role: 'director_geral',
        institutionId: newInst.id,
        institutionName: newInst.name,
        status: 'activo'
      });
      setAccounts(updatedAccounts);
      createdAccount =
        updatedAccounts.find((a) => a.email.toLowerCase() === adminUser.email.trim().toLowerCase()) ||
        null;
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: newInst.id,
      institutionName: newInst.name,
      userName: currentUser?.fullName || 'Administrador Geral',
      userRole: 'Super Admin',
      action: 'NOVA_INSTITUICAO_SAAS',
      details: `Cadastramento da instituição ${newInst.name} (${newInst.province}) com limite de ${newInst.maxClasses} turmas e administrador ${newInst.adminName || newInst.directorName}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        institutions: [newInst],
        ...(createdSchoolUser ? { schoolUsers: [createdSchoolUser] } : {}),
        ...(createdAccount ? { accounts: [createdAccount] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions: updatedInstitutions, classes, students, teachers }
    });
  };

  const handleUpdateInstitution = (updatedInst: Institution) => {
    const prevInst = institutions.find((i) => i.id === updatedInst.id);
    const updated = institutions.map((i) => (i.id === updatedInst.id ? updatedInst : i));
    setInstitutions(updated);
    if (currentInstitution && currentInstitution.id === updatedInst.id) {
      setCurrentInstitution(updatedInst);
    }

    let updatedSchoolUsers = schoolUsers;
    let updatedAccounts = accounts;
    const prevAdminEmail = prevInst?.adminEmail?.trim().toLowerCase();
    const nextAdminEmail = updatedInst.adminEmail?.trim().toLowerCase();
    const deletedAccountEmails: string[] = [];
    let upsertedAccount: StoredCredential | null = null;
    let upsertedSchoolUser: SchoolUser | null = null;

    if (nextAdminEmail) {
      if (prevAdminEmail && prevAdminEmail !== nextAdminEmail) {
        updatedAccounts = deleteAccountInList(updatedAccounts, prevAdminEmail);
        deletedAccountEmails.push(prevAdminEmail);
      }
      updatedAccounts = upsertAccountInList(updatedAccounts, {
        email: nextAdminEmail,
        password: updatedInst.adminPassword || '123',
        fullName: updatedInst.adminName || updatedInst.directorName,
        role: 'director_geral',
        institutionId: updatedInst.id,
        institutionName: updatedInst.name,
        status: updatedInst.status === 'active' ? 'activo' : 'inactivo'
      });
      setAccounts(updatedAccounts);
      upsertedAccount =
        updatedAccounts.find((a) => a.email.toLowerCase() === nextAdminEmail) || null;

      const matchIdx = schoolUsers.findIndex(
        (u) =>
          u.institutionId === updatedInst.id &&
          u.role === 'director_geral' &&
          (u.email.toLowerCase() === prevAdminEmail || u.email.toLowerCase() === nextAdminEmail)
      );
      if (matchIdx >= 0) {
        updatedSchoolUsers = schoolUsers.map((u, idx) => {
          if (idx !== matchIdx) return u;
          upsertedSchoolUser = {
            ...u,
            fullName: updatedInst.adminName || updatedInst.directorName,
            email: nextAdminEmail,
            phone: updatedInst.adminPhone || u.phone,
            status: updatedInst.status === 'active' ? 'activo' : 'inactivo'
          };
          return upsertedSchoolUser;
        });
        setSchoolUsers(updatedSchoolUsers);
      }
    }

    commitCloudChanges({
      upserts: {
        institutions: [updatedInst],
        ...(upsertedSchoolUser ? { schoolUsers: [upsertedSchoolUser] } : {}),
        ...(upsertedAccount ? { accounts: [upsertedAccount] } : {})
      },
      ...(deletedAccountEmails.length > 0 ? { deletes: { accounts: deletedAccountEmails } } : {}),
      fkContext: { institutions: updated, classes, students, teachers }
    });
  };

  const handleDeleteInstitution = (institutionId: string) => {
    if (!isSuperAdminRole) return;
    const targetInst = institutions.find((i) => i.id === institutionId);
    if (!targetInst) return;

    const deletedClassIds = classes
      .filter((c) => c.institutionId === institutionId)
      .map((c) => c.id);
    const deletedSubjectIds = subjects
      .filter((s) => s.institutionId === institutionId)
      .map((s) => s.id);
    const deletedStudentIds = students
      .filter((s) => s.institutionId === institutionId)
      .map((s) => s.id);
    const deletedTeacherIds = teachers
      .filter((t) => t.institutionId === institutionId)
      .map((t) => t.id);
    const deletedGradeIds = grades
      .filter((g) => g.institutionId === institutionId)
      .map((g) => g.id);
    const deletedInvoiceIds = invoices
      .filter((inv) => inv.institutionId === institutionId)
      .map((inv) => inv.id);
    const deletedSchoolUserIds = schoolUsers
      .filter((u) => u.institutionId === institutionId)
      .map((u) => u.id);
    const deletedArchiveIds = digitalArchive
      .filter((d) => d.institutionId === institutionId)
      .map((d) => d.id);
    const deletedAttendanceIds = attendanceRecords
      .filter((a) => a.institutionId === institutionId)
      .map((a) => a.id);
    const deletedFinNotifIds = financialNotifications
      .filter((n) => n.institutionId === institutionId)
      .map((n) => n.id);
    const deletedAnnouncementIds = announcements
      .filter((a) => a.institutionId === institutionId)
      .map((a) => a.id);
    const deletedCaseIds = psychopedagogicalCases
      .filter((c) => c.institutionId === institutionId)
      .map((c) => c.id);

    const updatedInstitutions = institutions.filter((i) => i.id !== institutionId);
    const updatedClasses = classes.filter((c) => c.institutionId !== institutionId);
    const updatedSubjects = subjects.filter((s) => s.institutionId !== institutionId);
    const updatedStudents = students.filter((s) => s.institutionId !== institutionId);
    const updatedTeachers = teachers.filter((t) => t.institutionId !== institutionId);
    const updatedGrades = grades.filter((g) => g.institutionId !== institutionId);
    const updatedInvoices = invoices.filter((inv) => inv.institutionId !== institutionId);

    const removedEmails = new Set(
      schoolUsers
        .filter((u) => u.institutionId === institutionId)
        .map((u) => u.email.toLowerCase())
    );
    if (targetInst.adminEmail) {
      removedEmails.add(targetInst.adminEmail.toLowerCase());
    }
    const deletedAccountEmails = accounts
      .filter(
        (acc) =>
          acc.role !== 'super_admin' &&
          (acc.institutionId === institutionId || removedEmails.has(acc.email.toLowerCase()))
      )
      .map((acc) => acc.email.toLowerCase());

    const updatedSchoolUsers = schoolUsers.filter((u) => u.institutionId !== institutionId);
    const updatedArchive = digitalArchive.filter((d) => d.institutionId !== institutionId);
    const updatedAttendance = attendanceRecords.filter((a) => a.institutionId !== institutionId);
    const updatedFinNotifications = financialNotifications.filter(
      (n) => n.institutionId !== institutionId
    );
    const updatedAnnouncements = announcements.filter((a) => a.institutionId !== institutionId);
    const updatedCases = psychopedagogicalCases.filter((c) => c.institutionId !== institutionId);

    const updatedAccounts = accounts.filter(
      (acc) =>
        acc.role === 'super_admin' ||
        (acc.institutionId !== institutionId && !removedEmails.has(acc.email.toLowerCase()))
    );

    setInstitutions(updatedInstitutions);
    setClasses(updatedClasses);
    setSubjects(updatedSubjects);
    setStudents(updatedStudents);
    setTeachers(updatedTeachers);
    setGrades(updatedGrades);
    setInvoices(updatedInvoices);
    setSchoolUsers(updatedSchoolUsers);
    setDigitalArchive(updatedArchive);
    setAttendanceRecords(updatedAttendance);
    setFinancialNotifications(updatedFinNotifications);
    setAnnouncements(updatedAnnouncements);
    setPsychopedagogicalCases(updatedCases);
    setAccounts(updatedAccounts);

    if (currentInstitution?.id === institutionId) {
      setCurrentInstitution(null);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetInst.id,
      institutionName: targetInst.name,
      userName: currentUser?.fullName || 'Super Administrador',
      userRole: 'Super Admin',
      action: 'REMOCAO_INSTITUICAO_SAAS',
      details: `Eliminação da instituição "${targetInst.name}" (${targetInst.code}) e limpeza dos respectivos registos vinculados.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      deletes: {
        ...(deletedCaseIds.length > 0 ? { psychopedagogicalCases: deletedCaseIds } : {}),
        ...(deletedAnnouncementIds.length > 0 ? { announcements: deletedAnnouncementIds } : {}),
        ...(deletedFinNotifIds.length > 0 ? { financialNotifications: deletedFinNotifIds } : {}),
        ...(deletedArchiveIds.length > 0 ? { digitalArchive: deletedArchiveIds } : {}),
        ...(deletedAttendanceIds.length > 0 ? { attendance: deletedAttendanceIds } : {}),
        ...(deletedInvoiceIds.length > 0 ? { invoices: deletedInvoiceIds } : {}),
        ...(deletedGradeIds.length > 0 ? { grades: deletedGradeIds } : {}),
        ...(deletedStudentIds.length > 0 ? { students: deletedStudentIds } : {}),
        ...(deletedSubjectIds.length > 0 ? { subjects: deletedSubjectIds } : {}),
        ...(deletedClassIds.length > 0 ? { classes: deletedClassIds } : {}),
        ...(deletedTeacherIds.length > 0 ? { teachers: deletedTeacherIds } : {}),
        ...(deletedSchoolUserIds.length > 0 ? { schoolUsers: deletedSchoolUserIds } : {}),
        ...(deletedAccountEmails.length > 0 ? { accounts: deletedAccountEmails } : {}),
        institutions: [institutionId]
      },
      upserts: {
        auditLogs: [newLog]
      }
    });
  };

  const handleUpdateInstitutionStatus = (id: string, newStatus: 'active' | 'suspended') => {
    const updated = institutions.map((inst) =>
      inst.id === id ? { ...inst, status: newStatus } : inst
    );
    setInstitutions(updated);
    const changedInst = updated.find((i) => i.id === id);
    if (changedInst) {
      commitCloudChanges({
        upserts: { institutions: [changedInst] }
      });
    }
  };

  // Handlers de Acompanhamento Psicopedagógico & Activação por Escola (Super Admin)
  const handleToggleInstitutionPsychopedagogical = (
    institutionId: string,
    activate: boolean,
    config?: PsychopedagogicalInstitutionConfig
  ) => {
    if (!isSuperAdminRole) return;
    const targetInst = institutions.find((i) => i.id === institutionId);
    if (!targetInst) return;

    const updatedInstitutions = institutions.map((inst) => {
      if (inst.id !== institutionId) return inst;
      const mergedFeatures = {
        ...DEFAULT_INSTITUTION_FEATURES,
        ...(inst.features || {}),
        psychopedagogicalSupport: activate
      };
      const mergedConfig: PsychopedagogicalInstitutionConfig = {
        ...(inst.psychopedagogicalConfig || {}),
        ...(config || {}),
        activatedAt: activate
          ? config?.activatedAt ||
            inst.psychopedagogicalConfig?.activatedAt ||
            new Date().toISOString().split('T')[0]
          : config?.activatedAt ?? inst.psychopedagogicalConfig?.activatedAt,
        activatedBy: activate
          ? config?.activatedBy || currentUser?.fullName || 'Super Administrador'
          : config?.activatedBy ?? inst.psychopedagogicalConfig?.activatedBy
      };
      return {
        ...inst,
        features: mergedFeatures,
        psychopedagogicalConfig: mergedConfig
      };
    });

    setInstitutions(updatedInstitutions);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetInst.id,
      institutionName: targetInst.name,
      userName: currentUser?.fullName || 'Super Administrador',
      userRole: 'Super Admin',
      action: activate
        ? 'ACTIVAR_PSICOPEDAGOGICO_ESCOLA'
        : 'DESACTIVAR_PSICOPEDAGOGICO_ESCOLA',
      details: `${
        activate ? 'Activação' : 'Desactivação/Pré-configuração'
      } do módulo de Acompanhamento Psicopedagógico para "${targetInst.name}".`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedInst = updatedInstitutions.find((i) => i.id === institutionId);
    commitCloudChanges({
      upserts: {
        ...(changedInst ? { institutions: [changedInst] } : {}),
        auditLogs: [newLog]
      }
    });
  };

  const handleBatchTogglePsychopedagogical = (institutionIds: string[], activate: boolean) => {
    if (!isSuperAdminRole || institutionIds.length === 0) return;
    const idSet = new Set(institutionIds);
    const today = new Date().toISOString().split('T')[0];

    const updatedInstitutions = institutions.map((inst) => {
      if (!idSet.has(inst.id)) return inst;
      return {
        ...inst,
        features: {
          ...DEFAULT_INSTITUTION_FEATURES,
          ...(inst.features || {}),
          psychopedagogicalSupport: activate
        },
        psychopedagogicalConfig: {
          ...(inst.psychopedagogicalConfig || {}),
          activatedAt: activate ? today : inst.psychopedagogicalConfig?.activatedAt,
          activatedBy: activate
            ? currentUser?.fullName || 'Super Administrador'
            : inst.psychopedagogicalConfig?.activatedBy
        }
      };
    });

    setInstitutions(updatedInstitutions);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      userName: currentUser?.fullName || 'Super Administrador',
      userRole: 'Super Admin',
      action: activate
        ? 'ACTIVACAO_LOTE_PSICOPEDAGOGICO'
        : 'DESACTIVACAO_LOTE_PSICOPEDAGOGICO',
      details: `${
        activate ? 'Activação' : 'Desactivação'
      } em lote do módulo de Acompanhamento Psicopedagógico em ${institutionIds.length} instituição(ões).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedInstitutions = updatedInstitutions.filter((inst) => idSet.has(inst.id));
    commitCloudChanges({
      upserts: {
        institutions: changedInstitutions,
        auditLogs: [newLog]
      }
    });
  };

  const handleSavePsychopedagogicalProtocol = (protocol: PsychopedagogicalProtocol) => {
    if (!isSuperAdminRole) return;
    const exists = psychopedagogicalProtocols.some((p) => p.id === protocol.id);
    const updatedProtocols = exists
      ? psychopedagogicalProtocols.map((p) => (p.id === protocol.id ? protocol : p))
      : [protocol, ...psychopedagogicalProtocols];
    setPsychopedagogicalProtocols(updatedProtocols);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      userName: currentUser?.fullName || 'Super Administrador',
      userRole: 'Super Admin',
      action: 'PROTOCOLO_PSICOPEDAGOGICO',
      details: `${exists ? 'Actualização' : 'Criação'} do protocolo psicopedagógico ${protocol.code} (${protocol.title}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        psychopedagogicalProtocols: [protocol],
        auditLogs: [newLog]
      }
    });
  };

  const handleSavePsychopedagogicalCase = (caseItem: PsychopedagogicalCase) => {
    if (
      !isSuperAdminRole &&
      (!isSchoolAdminRole ||
        !currentInstitution ||
        !currentInstitution.features?.psychopedagogicalSupport ||
        caseItem.institutionId !== currentInstitution.id)
    ) {
      return;
    }

    const exists = psychopedagogicalCases.some((c) => c.id === caseItem.id);
    const updatedCases = exists
      ? psychopedagogicalCases.map((c) => (c.id === caseItem.id ? caseItem : c))
      : [caseItem, ...psychopedagogicalCases];
    setPsychopedagogicalCases(updatedCases);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: caseItem.institutionId,
      institutionName: caseItem.institutionName,
      userName: currentUser?.fullName || 'Equipa Psicopedagógica',
      userRole: isSuperAdminRole ? 'Super Admin' : 'Administrador Escolar',
      action: exists ? 'ACTUALIZACAO_DOSSIE_PSICOPEDAGOGICO' : 'NOVO_DOSSIE_PSICOPEDAGOGICO',
      details: `Dossiê ${caseItem.caseCode} (${caseItem.studentName}) registado/actualizado em ${caseItem.institutionName}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        psychopedagogicalCases: [caseItem],
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleAddPsychopedagogicalSession = (
    caseId: string,
    session: PsychopedagogicalSession
  ) => {
    const targetCase = psychopedagogicalCases.find((c) => c.id === caseId);
    if (!targetCase) return;
    if (
      !isSuperAdminRole &&
      (!isSchoolAdminRole ||
        !currentInstitution ||
        !currentInstitution.features?.psychopedagogicalSupport ||
        targetCase.institutionId !== currentInstitution.id)
    ) {
      return;
    }

    let updatedCaseObj: PsychopedagogicalCase | null = null;
    const updatedCases = psychopedagogicalCases.map((c) => {
      if (c.id !== caseId) return c;
      updatedCaseObj = {
        ...c,
        updatedAt: session.date,
        sessions: [session, ...c.sessions]
      };
      return updatedCaseObj;
    });
    setPsychopedagogicalCases(updatedCases);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetCase.institutionId,
      institutionName: targetCase.institutionName,
      userName: session.specialistName,
      userRole: isSuperAdminRole ? 'Super Admin' : 'Equipa Psicopedagógica',
      action: 'SESSAO_PSICOPEDAGOGICA',
      details: `Sessão registada no dossiê ${targetCase.caseCode} (${targetCase.studentName}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        ...(updatedCaseObj ? { psychopedagogicalCases: [updatedCaseObj] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  // Handlers para Matrícula em Massa e Utilizadores da Escola
  const handleAddMultipleStudents = (newStudentsList: Student[]) => {
    const updatedStudents = [...newStudentsList, ...students];
    setStudents(updatedStudents);

    const updatedClasses = classes.map((c) => {
      if (currentInstitution && c.institutionId !== currentInstitution.id) return c;
      const count = updatedStudents.filter(
        (s) => s.institutionId === c.institutionId && s.classId === c.id
      ).length;
      return { ...c, enrolledStudentsCount: count };
    });
    setClasses(updatedClasses);

    let updatedInstitutions = institutions;
    if (currentInstitution) {
      updatedInstitutions = institutions.map((inst) =>
        inst.id === currentInstitution.id
          ? {
              ...inst,
              currentStudentsCount: updatedStudents.filter((s) => s.institutionId === inst.id).length
            }
          : inst
      );
      setInstitutions(updatedInstitutions);
      const updatedCurrInst = updatedInstitutions.find((i) => i.id === currentInstitution.id);
      if (updatedCurrInst) setCurrentInstitution(updatedCurrInst);
    }

    let updatedAccounts = accounts;
    const upsertedAccountEmails = new Set<string>();
    newStudentsList.forEach((stu) => {
      if (stu.email) {
        updatedAccounts = upsertAccountInList(updatedAccounts, {
          email: stu.email,
          password: stu.portalPassword || '123',
          fullName: `${stu.fullName} (Estudante)`,
          role: 'aluno',
          institutionId: stu.institutionId,
          institutionName: currentInstitution?.name,
          status: 'activo'
        });
        upsertedAccountEmails.add(stu.email.trim().toLowerCase());
      }
    });
    setAccounts(updatedAccounts);
    const upsertedAccounts = updatedAccounts.filter((a) =>
      upsertedAccountEmails.has(a.email.toLowerCase())
    );

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Secretaria Geral',
      userRole: 'Secretário Geral',
      action: 'MATRICULA_EM_MASSA',
      details: `Matrícula em lote de ${newStudentsList.length} novos alunos efectuada com sucesso.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const affectedClassIds = new Set(newStudentsList.map((s) => s.classId).filter(Boolean));
    const changedClasses = updatedClasses.filter((c) => affectedClassIds.has(c.id));
    const changedInst = currentInstitution
      ? updatedInstitutions.find((i) => i.id === currentInstitution.id)
      : undefined;

    commitCloudChanges({
      upserts: {
        students: newStudentsList,
        ...(changedClasses.length > 0 ? { classes: changedClasses } : {}),
        ...(changedInst ? { institutions: [changedInst] } : {}),
        ...(upsertedAccounts.length > 0 ? { accounts: upsertedAccounts } : {}),
        auditLogs: [newLog]
      },
      fkContext: {
        institutions: updatedInstitutions,
        classes: updatedClasses,
        students: updatedStudents,
        teachers
      }
    });
  };

  const buildTeacherAssignmentsFromSelection = (
    instId: string,
    selections: ProfessorClassAssignmentSelection[],
    existingAssignments: Teacher['assignedClasses'] = []
  ): Teacher['assignedClasses'] => {
    const instSubjects = subjects.filter((s) => s.institutionId === instId);
    const result: Teacher['assignedClasses'] = [];

    selections.forEach((sel) => {
      const cls = classes.find((c) => c.id === sel.classId);
      if (!cls) return;
      const clsSubs = resolveSubjectsForClass(
        cls.subsystemCode,
        cls.gradeLevel,
        cls.courseName,
        instSubjects,
        cls.subjects
      );

      const targetSubIds =
        sel.subjectIds.length > 0
          ? sel.subjectIds
          : clsSubs[0]
          ? [clsSubs[0].id]
          : [];

      if (targetSubIds.length === 0) {
        result.push({
          classId: cls.id,
          className: cls.name,
          subjectId: 'sub-geral',
          subjectName: 'Disciplina Geral',
          weeklyHours: 4
        });
        return;
      }

      targetSubIds.forEach((subId) => {
        const matchedExisting = existingAssignments.find(
          (a) => a.classId === cls.id && a.subjectId === subId
        );
        const subObj = clsSubs.find((s) => s.id === subId);
        result.push({
          classId: cls.id,
          className: cls.name,
          subjectId: subObj?.id || subId,
          subjectName: subObj?.name || matchedExisting?.subjectName || 'Disciplina Curricular',
          weeklyHours: matchedExisting?.weeklyHours || subObj?.weeklyHours || 4
        });
      });
    });

    return result;
  };

  const handleAddSchoolUser = (
    newUser: SchoolUser,
    password = '123',
    assignedByClass?: ProfessorClassAssignmentSelection[]
  ) => {
    const updatedUsers = [newUser, ...schoolUsers];
    setSchoolUsers(updatedUsers);

    const targetInstObj = institutions.find((i) => i.id === newUser.institutionId);
    const isMunDirector = newUser.role === 'director_municipal';
    const updatedAccounts = upsertAccountInList(accounts, {
      email: newUser.email,
      password,
      fullName: newUser.fullName,
      role: newUser.role,
      institutionId: isMunDirector ? undefined : newUser.institutionId,
      institutionName: isMunDirector
        ? `Direcção Municipal da Educação de ${newUser.municipality || 'Angola'}`
        : targetInstObj?.name || currentInstitution?.name,
      municipality: newUser.municipality,
      province: newUser.province,
      status: newUser.status
    });
    setAccounts(updatedAccounts);
    const upsertedAccount = updatedAccounts.find(
      (a) => a.email.toLowerCase() === newUser.email.trim().toLowerCase()
    );

    let updatedTeachers = teachers;
    let changedTeacher: Teacher | null = null;
    if (newUser.role === 'professor') {
      const existingIdx = teachers.findIndex(
        (t) =>
          t.institutionId === newUser.institutionId &&
          t.email.toLowerCase() === newUser.email.toLowerCase()
      );
      const assignedList = buildTeacherAssignmentsFromSelection(
        newUser.institutionId,
        assignedByClass || []
      );
      if (existingIdx >= 0) {
        updatedTeachers = teachers.map((t, idx) => {
          if (idx !== existingIdx) return t;
          changedTeacher = {
            ...t,
            fullName: newUser.fullName,
            phone: newUser.phone || t.phone,
            assignedClasses:
              assignedByClass !== undefined ? assignedList : t.assignedClasses
          };
          return changedTeacher;
        });
      } else {
        changedTeacher = {
          id: `prof-${Date.now()}`,
          institutionId: newUser.institutionId,
          staffCode: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: newUser.fullName,
          academicDegree: 'Licenciado',
          specialization: 'Docência Geral',
          phone: newUser.phone || '+244 923 000 000',
          email: newUser.email,
          contractType: 'tempo_integral',
          assignedClasses: assignedList,
          isActive: newUser.status === 'activo'
        };
        updatedTeachers = [changedTeacher, ...teachers];
      }
      setTeachers(updatedTeachers);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: isMunDirector ? undefined : newUser.institutionId,
      institutionName: isMunDirector
        ? `Direcção Municipal de ${newUser.municipality || 'Educação'}`
        : targetInstObj?.name || currentInstitution?.name,
      userName: currentUser?.fullName || 'Administrador',
      userRole: isSuperAdminRole ? 'Super Admin' : 'Director Geral',
      action: isMunDirector ? 'NOVO_DIRECTOR_MUNICIPAL' : 'NOVO_UTILIZADOR_ESCOLA',
      details: isMunDirector
        ? `Cadastramento do Director Municipal da Educação ${newUser.fullName} para o Município de ${newUser.municipality || 'Angola'}.`
        : `Cadastramento do utilizador ${newUser.fullName} com perfil ${newUser.role.replace(/_/g, ' ')}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        schoolUsers: [newUser],
        ...(upsertedAccount ? { accounts: [upsertedAccount] } : {}),
        ...(changedTeacher ? { teachers: [changedTeacher] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers: updatedTeachers }
    });
  };

  const handleUpdateSchoolUser = (
    updatedUser: SchoolUser,
    assignedByClass?: ProfessorClassAssignmentSelection[]
  ) => {
    const existsInSchoolUsers = schoolUsers.some(
      (u) => u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase()
    );
    const updatedUsers = existsInSchoolUsers
      ? schoolUsers.map((u) =>
          u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase()
            ? updatedUser
            : u
        )
      : [updatedUser, ...schoolUsers];
    setSchoolUsers(updatedUsers);

    const updatedAccounts = updateAccountStatusInList(
      accounts,
      updatedUser.email,
      updatedUser.status
    );
    setAccounts(updatedAccounts);
    const changedAccount = updatedAccounts.find(
      (a) => a.email.toLowerCase() === updatedUser.email.trim().toLowerCase()
    );

    let updatedTeachers = teachers;
    let changedTeacher: Teacher | null = null;
    if (updatedUser.role === 'professor' && assignedByClass !== undefined) {
      const existingIdx = teachers.findIndex(
        (t) =>
          t.institutionId === updatedUser.institutionId &&
          t.email.toLowerCase() === updatedUser.email.toLowerCase()
      );
      if (existingIdx >= 0) {
        const existingTeacher = teachers[existingIdx];
        const nextAssigned = buildTeacherAssignmentsFromSelection(
          updatedUser.institutionId,
          assignedByClass,
          existingTeacher.assignedClasses
        );
        updatedTeachers = teachers.map((t, idx) => {
          if (idx !== existingIdx) return t;
          changedTeacher = {
            ...t,
            fullName: updatedUser.fullName,
            phone: updatedUser.phone || t.phone,
            assignedClasses: nextAssigned,
            isActive: updatedUser.status === 'activo'
          };
          return changedTeacher;
        });
      } else {
        changedTeacher = {
          id: `prof-${Date.now()}`,
          institutionId: updatedUser.institutionId,
          staffCode: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: updatedUser.fullName,
          academicDegree: 'Licenciado',
          specialization: 'Docência Geral',
          phone: updatedUser.phone || '+244 923 000 000',
          email: updatedUser.email,
          contractType: 'tempo_integral',
          assignedClasses: buildTeacherAssignmentsFromSelection(
            updatedUser.institutionId,
            assignedByClass
          ),
          isActive: updatedUser.status === 'activo'
        };
        updatedTeachers = [changedTeacher, ...teachers];
      }
      setTeachers(updatedTeachers);
    }

    commitCloudChanges({
      upserts: {
        schoolUsers: [updatedUser],
        ...(changedAccount ? { accounts: [changedAccount] } : {}),
        ...(changedTeacher ? { teachers: [changedTeacher] } : {})
      },
      fkContext: { institutions, classes, students, teachers: updatedTeachers }
    });
  };

  const handleResetUserPassword = (user: SchoolUser, newPassword: string) => {
    const cleanEmail = user.email.trim().toLowerCase();
    const existingAccount = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    const updatedAccounts = existingAccount
      ? updateAccountPasswordInList(accounts, cleanEmail, newPassword)
      : upsertAccountInList(accounts, {
          email: cleanEmail,
          password: newPassword,
          fullName: user.fullName,
          role: user.role,
          institutionId: user.institutionId,
          status: user.status
        });
    setAccounts(updatedAccounts);
    const changedAccount = updatedAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: user.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Administrador Escolar',
      userRole: 'Director Geral',
      action: 'REDEFINICAO_SENHA',
      details: `Senha do utilizador ${user.fullName} (${user.email}) redefinida no banco de dados Supabase.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        ...(changedAccount ? { accounts: [changedAccount] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleDeleteSchoolUser = (userId: string) => {
    const targetUser = schoolUsers.find((u) => u.id === userId);
    const updatedUsers = schoolUsers.filter((u) => u.id !== userId);
    setSchoolUsers(updatedUsers);

    let updatedAccounts = accounts;
    const deletedAccountEmails: string[] = [];
    if (targetUser) {
      const emailLower = targetUser.email.trim().toLowerCase();
      updatedAccounts = deleteAccountInList(accounts, emailLower);
      setAccounts(updatedAccounts);
      deletedAccountEmails.push(emailLower);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetUser?.institutionId || currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || 'Administrador Escolar',
      userRole: 'Director Geral',
      action: 'REMOCAO_UTILIZADOR',
      details: `Remoção do utilizador ${targetUser?.fullName || userId} da escola.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      deletes: {
        schoolUsers: [userId],
        ...(deletedAccountEmails.length > 0 ? { accounts: deletedAccountEmails } : {})
      },
      upserts: {
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleUpdateSuperUser = (updatedUser: SchoolUser, previousEmail?: string) => {
    if (!isSuperAdminRole) return;
    const oldEmailLower = (previousEmail || updatedUser.email).trim().toLowerCase();
    const newEmailLower = updatedUser.email.trim().toLowerCase();
    const isMunDirector = updatedUser.role === 'director_municipal';

    const normalizedUser: SchoolUser = {
      ...updatedUser,
      id:
        updatedUser.id.startsWith('admin-') || updatedUser.id.startsWith('mun-')
          ? `su-${Date.now()}`
          : updatedUser.id,
      email: newEmailLower
    };

    const existingIdx = schoolUsers.findIndex(
      (u) => u.id === updatedUser.id || u.email.toLowerCase() === oldEmailLower
    );
    const updatedUsers =
      existingIdx >= 0
        ? schoolUsers.map((u, idx) => (idx === existingIdx ? normalizedUser : u))
        : [normalizedUser, ...schoolUsers];
    setSchoolUsers(updatedUsers);

    const existingAccount = accounts.find((a) => a.email.toLowerCase() === oldEmailLower);
    let workingAccounts = accounts;
    const deletedAccountEmails: string[] = [];
    if (oldEmailLower !== newEmailLower) {
      workingAccounts = deleteAccountInList(workingAccounts, oldEmailLower);
      deletedAccountEmails.push(oldEmailLower);
    }
    const targetInstObj = institutions.find((i) => i.id === normalizedUser.institutionId);
    const updatedAccounts = upsertAccountInList(workingAccounts, {
      email: newEmailLower,
      password: existingAccount?.password || '123',
      fullName: normalizedUser.fullName,
      role: normalizedUser.role,
      institutionId: isMunDirector ? undefined : normalizedUser.institutionId,
      institutionName: isMunDirector
        ? `Direcção Municipal da Educação de ${normalizedUser.municipality || 'Angola'}`
        : targetInstObj?.name,
      municipality: normalizedUser.municipality,
      province: normalizedUser.province,
      status: normalizedUser.status
    });
    setAccounts(updatedAccounts);
    const upsertedAccount = updatedAccounts.find((a) => a.email.toLowerCase() === newEmailLower);

    let updatedInstitutions = institutions;
    const changedInstitutions: Institution[] = [];
    if (
      updatedUser.id.startsWith('admin-') ||
      institutions.some((inst) => (inst.adminEmail || '').toLowerCase() === oldEmailLower)
    ) {
      updatedInstitutions = institutions.map((inst) => {
        const matchesInst =
          updatedUser.id === `admin-${inst.id}` ||
          (inst.adminEmail || '').toLowerCase() === oldEmailLower;
        if (!matchesInst) return inst;
        const nextInst = {
          ...inst,
          adminName: normalizedUser.fullName,
          directorName: normalizedUser.fullName,
          adminEmail: newEmailLower,
          adminPhone: normalizedUser.phone || inst.adminPhone
        };
        changedInstitutions.push(nextInst);
        return nextInst;
      });
      setInstitutions(updatedInstitutions);
    }

    const changedTeachers: Teacher[] = [];
    const updatedTeachers = teachers.map((t) => {
      if (t.email.toLowerCase() !== oldEmailLower) return t;
      const nextTeacher = {
        ...t,
        fullName: normalizedUser.fullName,
        email: newEmailLower,
        phone: normalizedUser.phone || t.phone,
        isActive: normalizedUser.status === 'activo'
      };
      changedTeachers.push(nextTeacher);
      return nextTeacher;
    });
    setTeachers(updatedTeachers);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: isMunDirector ? undefined : normalizedUser.institutionId,
      institutionName: isMunDirector
        ? `Direcção Municipal de ${normalizedUser.municipality || 'Educação'}`
        : targetInstObj?.name,
      userName: currentUser?.fullName || 'Super Administrador',
      userRole: 'Super Admin',
      action: 'ACTUALIZACAO_UTILIZADOR_SAAS',
      details: `Actualização dos dados de ${normalizedUser.fullName} (${normalizedUser.email}) — perfil ${normalizedUser.role.replace(/_/g, ' ')}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        schoolUsers: [normalizedUser],
        ...(upsertedAccount ? { accounts: [upsertedAccount] } : {}),
        ...(changedInstitutions.length > 0 ? { institutions: changedInstitutions } : {}),
        ...(changedTeachers.length > 0 ? { teachers: changedTeachers } : {}),
        auditLogs: [newLog]
      },
      ...(deletedAccountEmails.length > 0 ? { deletes: { accounts: deletedAccountEmails } } : {}),
      fkContext: {
        institutions: updatedInstitutions,
        classes,
        students,
        teachers: updatedTeachers
      }
    });
  };

  const handleDeleteSuperUser = (targetUser: SchoolUser) => {
    if (!isSuperAdminRole) return;
    const targetEmailLower = targetUser.email.trim().toLowerCase();
    if (currentUser?.email.toLowerCase() === targetEmailLower) {
      setAccessDeniedNotice('Não é possível apagar a conta do Super Administrador em sessão activa.');
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const deletedSchoolUserIds = schoolUsers
      .filter((u) => u.id === targetUser.id || u.email.toLowerCase() === targetEmailLower)
      .map((u) => u.id);

    const updatedUsers = schoolUsers.filter(
      (u) => u.id !== targetUser.id && u.email.toLowerCase() !== targetEmailLower
    );
    setSchoolUsers(updatedUsers);

    const updatedAccounts = deleteAccountInList(accounts, targetEmailLower);
    setAccounts(updatedAccounts);

    let updatedInstitutions = institutions;
    const changedInstitutions: Institution[] = [];
    const touchesAdmin = institutions.some(
      (inst) =>
        targetUser.id === `admin-${inst.id}` ||
        (inst.adminEmail || '').toLowerCase() === targetEmailLower
    );
    if (touchesAdmin) {
      updatedInstitutions = institutions.map((inst) => {
        if (
          targetUser.id === `admin-${inst.id}` ||
          (inst.adminEmail || '').toLowerCase() === targetEmailLower
        ) {
          const nextInst = {
            ...inst,
            adminEmail: '',
            adminName: ''
          };
          changedInstitutions.push(nextInst);
          return nextInst;
        }
        return inst;
      });
      setInstitutions(updatedInstitutions);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId:
        targetUser.institutionId && targetUser.institutionId !== 'municipal'
          ? targetUser.institutionId
          : undefined,
      userName: currentUser?.fullName || 'Super Administrador',
      userRole: 'Super Admin',
      action: 'REMOCAO_UTILIZADOR_SAAS',
      details: `Eliminação da conta de ${targetUser.fullName} (${targetUser.email}) pelo Super Administrador.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      deletes: {
        ...(deletedSchoolUserIds.length > 0 ? { schoolUsers: deletedSchoolUserIds } : {}),
        accounts: [targetEmailLower]
      },
      upserts: {
        ...(changedInstitutions.length > 0 ? { institutions: changedInstitutions } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions: updatedInstitutions, classes, students, teachers }
    });
  };

  const handleSelectToManage = (_inst: Institution) => {
    setAccessDeniedNotice(
      'Restrição de Segurança: O Administrador Geral não pode entrar no painel interno da escola.'
    );
    setTimeout(() => setAccessDeniedNotice(null), 5000);
  };

  const handleOpenDocFromStudent = (student: Student, docType: string) => {
    if (isStudentOrGuardian && !authorizedStudentIds.has(student.id)) {
      setAccessDeniedNotice(
        'Restrição de Privacidade: Não tem permissão para emitir documentos de outros estudantes.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }
    setDocStudentTarget(student);
    setDocTypeTarget(docType);
    setNavDeepLink({
      tab: 'documents',
      studentId: student.id,
      docType,
      key: Date.now()
    });
    setCurrentTab('documents');
  };

  const handleSelectTab = (tab: string) => {
    setNavDeepLink(null);
    setOpenStudentModalKey(undefined);
    setOpenClassModalKey(undefined);
    setOpenSubjectModalKey(undefined);
    setOpenInvoiceModalKey(undefined);
    setCurrentTab(tab);
  };

  // Navegação inteligente a partir do Filtro Suspenso Global (com deep-link directo por perfil)
  const handleDeepNavigate = (payload: NavDeepLinkPayload) => {
    if (payload.openMemoryModal) {
      setIsMemoryModalOpen(true);
      return;
    }

    if (isStudentOrGuardian && payload.studentId && !authorizedStudentIds.has(payload.studentId)) {
      setAccessDeniedNotice(
        'Restrição de Privacidade: Alunos e Encarregados só podem consultar os seus próprios dados.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const navKey = Date.now();
    setNavDeepLink({ ...payload, key: navKey });

    if (payload.tab === 'evaluations' && payload.evalTab) {
      setCurrentEvalSubTab(payload.evalTab);
    }

    if (payload.tab === 'documents') {
      if (payload.studentId) {
        const pool = isStudentOrGuardian ? authorizedStudentPortalStudents : students;
        const targetStudent = pool.find((s) => s.id === payload.studentId);
        if (targetStudent) {
          setDocStudentTarget(targetStudent);
        }
      }
      if (payload.docType) {
        setDocTypeTarget(payload.docType);
      }
    }

    setCurrentTab(payload.tab);
  };

  // Handler para novas Facturas / Registos Financeiros (Exclusivo do Tesoureiro)
  const handleAddInvoice = (
    newInvoice: Invoice,
    sendNotification?: boolean,
    recipientTarget: FinancialNotificationTarget = 'ambos'
  ) => {
    if (!isTreasurerUser) {
      setAccessDeniedNotice(
        'Restrição Financeira: Apenas o Tesoureiro tem permissão para registar propinas, matrículas ou outros emolumentos.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const treasurerName = currentUser?.fullName || 'Tesoureiro';
    const stampedInvoice: Invoice = {
      ...newInvoice,
      category: newInvoice.category || 'propina',
      registeredByUserId: currentUser?.id,
      registeredByName: treasurerName,
      registeredByRole: 'Tesoureiro'
    };

    const updated = [stampedInvoice, ...invoices];
    setInvoices(updated);

    const targetStudent = students.find((s) => s.id === stampedInvoice.studentId);
    let updatedStudents = students;
    if (stampedInvoice.category === 'matricula' && stampedInvoice.status === 'pago' && targetStudent) {
      updatedStudents = students.map((s) =>
        s.id === targetStudent.id
          ? {
              ...s,
              enrollmentFeePaid: true,
              enrollmentAmountAoa: stampedInvoice.totalAoa,
              enrollmentReceiptNumber: stampedInvoice.receiptNumber,
              academicStatus: 'confirmado'
            }
          : s
      );
      setStudents(updatedStudents);
    }

    let createdNotification: FinancialNotification | null = null;
    let updatedNotifications = financialNotifications;
    if (sendNotification && targetStudent) {
      const isPaid = stampedInvoice.status === 'pago';
      createdNotification = {
        id: `fnotif-${Date.now()}`,
        institutionId: stampedInvoice.institutionId,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        studentProcessNumber: targetStudent.processNumber,
        guardianName: targetStudent.guardianName,
        guardianPhone: targetStudent.guardianPhone,
        recipientTarget,
        type: isPaid
          ? stampedInvoice.category === 'matricula'
            ? 'confirmacao_matricula'
            : 'confirmacao_pagamento'
          : stampedInvoice.category === 'outros'
          ? 'emolumento_outros'
          : 'cobranca_pendente',
        category: stampedInvoice.category,
        title: isPaid
          ? `Registo e Confirmação: ${stampedInvoice.description}`
          : `Aviso de Cobrança: ${stampedInvoice.description}`,
        message: isPaid
          ? `Caro(a) Encarregado(a) ${targetStudent.guardianName} e aluno(a) ${targetStudent.fullName}, registámos a liquidação de ${stampedInvoice.totalAoa.toLocaleString('pt-AO')} Kz referente a "${stampedInvoice.description}". Recibo nº ${stampedInvoice.receiptNumber || stampedInvoice.invoiceNumber}.`
          : `Caro(a) Encarregado(a) ${targetStudent.guardianName} e aluno(a) ${targetStudent.fullName}, foi emitida a nota de cobrança nº ${stampedInvoice.invoiceNumber} referente a "${stampedInvoice.description}" no valor de ${stampedInvoice.balanceAoa.toLocaleString('pt-AO')} Kz com vencimento em ${stampedInvoice.dueDate}. Referência Multicaixa: ${stampedInvoice.multicaixaReference || 'Consultar Tesouraria'}.`,
        amountAoa: isPaid ? stampedInvoice.totalAoa : stampedInvoice.balanceAoa,
        invoiceId: stampedInvoice.id,
        invoiceNumber: stampedInvoice.invoiceNumber,
        multicaixaReference: stampedInvoice.multicaixaReference,
        dueDate: stampedInvoice.dueDate,
        sentByUserId: currentUser?.id || 'tesoureiro',
        sentByName: treasurerName,
        sentByRole: 'Tesoureiro',
        sentAt: new Date().toISOString(),
        isRead: false
      };
      updatedNotifications = [createdNotification, ...financialNotifications];
      setFinancialNotifications(updatedNotifications);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: stampedInvoice.institutionId,
      institutionName: currentInstitution?.name,
      userName: treasurerName,
      userRole: 'Tesoureiro',
      action: 'EMISSAO_REGISTO_FINANCEIRO',
      details: `Registo de ${stampedInvoice.category} (${stampedInvoice.invoiceNumber} - ${stampedInvoice.description}) no valor de ${stampedInvoice.totalAoa.toLocaleString('pt-AO')} Kz para ${stampedInvoice.studentName}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedStudent =
      stampedInvoice.category === 'matricula' && stampedInvoice.status === 'pago' && targetStudent
        ? updatedStudents.find((s) => s.id === targetStudent.id)
        : undefined;

    commitCloudChanges({
      upserts: {
        invoices: [stampedInvoice],
        ...(changedStudent ? { students: [changedStudent] } : {}),
        ...(createdNotification ? { financialNotifications: [createdNotification] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students: updatedStudents, teachers }
    });
  };

  // Registo Exclusivo de Taxa de Matrícula / Confirmação pelo Tesoureiro
  const handleRegisterEnrollmentFee = (payload: RegisterEnrollmentFeePayload) => {
    if (!isTreasurerUser) {
      setAccessDeniedNotice(
        'Restrição Financeira: Apenas o Tesoureiro pode registar e validar o pagamento de matrículas.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const targetStudent = students.find((s) => s.id === payload.studentId);
    if (!targetStudent) return;

    const treasurerName = currentUser?.fullName || 'Tesoureiro';
    const receiptNo = payload.markAsPaid ? `REC-MAT-${Date.now().toString().slice(-5)}` : undefined;
    const invNo = `FT-MAT-${currentInstitution?.acronym || 'ESC'}-${Date.now().toString().slice(-4)}`;
    const feeLabel =
      payload.feeType === 'matricula_nova'
        ? `Taxa de Matrícula Inicial (${targetStudent.gradeLevel})`
        : `Confirmação de Matrícula (${targetStudent.gradeLevel})`;
    const refMcx =
      payload.reference ||
      `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;

    const newInvoice: Invoice = {
      id: `inv-mat-${Date.now()}`,
      institutionId: targetStudent.institutionId,
      studentId: targetStudent.id,
      studentName: targetStudent.fullName,
      studentProcessNumber: targetStudent.processNumber,
      invoiceNumber: invNo,
      category: 'matricula',
      monthReference: 'Ano Lectivo 2026/2027',
      description: feeLabel,
      amountDueAoa: payload.amountAoa,
      penaltyAoa: 0,
      discountAoa: 0,
      totalAoa: payload.amountAoa,
      amountPaidAoa: payload.markAsPaid ? payload.amountAoa : 0,
      balanceAoa: payload.markAsPaid ? 0 : payload.amountAoa,
      dueDate: payload.dueDate,
      status: payload.markAsPaid ? 'pago' : 'pendente',
      paymentMethod: payload.markAsPaid ? payload.method : undefined,
      paidAt: payload.markAsPaid ? new Date().toISOString().split('T')[0] : undefined,
      receiptNumber: receiptNo,
      multicaixaReference: refMcx,
      registeredByUserId: currentUser?.id,
      registeredByName: treasurerName,
      registeredByRole: 'Tesoureiro'
    };

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);

    const updatedStudents = students.map((s) =>
      s.id === targetStudent.id
        ? {
            ...s,
            enrollmentFeePaid: payload.markAsPaid,
            enrollmentAmountAoa: payload.amountAoa,
            enrollmentReceiptNumber: receiptNo || s.enrollmentReceiptNumber,
            academicStatus: payload.markAsPaid ? ('confirmado' as const) : s.academicStatus
          }
        : s
    );
    setStudents(updatedStudents);

    let createdNotification: FinancialNotification | null = null;
    let updatedNotifications = financialNotifications;
    if (payload.sendNotification) {
      createdNotification = {
        id: `fnotif-${Date.now()}`,
        institutionId: targetStudent.institutionId,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        studentProcessNumber: targetStudent.processNumber,
        guardianName: targetStudent.guardianName,
        guardianPhone: targetStudent.guardianPhone,
        recipientTarget: payload.recipientTarget,
        type: payload.markAsPaid ? 'confirmacao_matricula' : 'cobranca_pendente',
        category: 'matricula',
        title: payload.markAsPaid
          ? `Matrícula Regularizada: ${targetStudent.fullName}`
          : `Taxa de Matrícula Pendente: ${targetStudent.fullName}`,
        message: payload.markAsPaid
          ? `Caro(a) Encarregado(a) ${targetStudent.guardianName}, informamos que a ${feeLabel} do(a) aluno(a) ${targetStudent.fullName} no valor de ${payload.amountAoa.toLocaleString('pt-AO')} Kz foi registada como LIQUIDADA pelo Tesoureiro (${receiptNo}).`
          : `Caro(a) Encarregado(a) ${targetStudent.guardianName}, solicita-se a regularização da ${feeLabel} do(a) aluno(a) ${targetStudent.fullName} no valor de ${payload.amountAoa.toLocaleString('pt-AO')} Kz até ${payload.dueDate}. Referência Multicaixa: ${refMcx}.`,
        amountAoa: payload.amountAoa,
        invoiceId: newInvoice.id,
        invoiceNumber: invNo,
        multicaixaReference: refMcx,
        dueDate: payload.dueDate,
        sentByUserId: currentUser?.id || 'tesoureiro',
        sentByName: treasurerName,
        sentByRole: 'Tesoureiro',
        sentAt: new Date().toISOString(),
        isRead: false
      };
      updatedNotifications = [createdNotification, ...financialNotifications];
      setFinancialNotifications(updatedNotifications);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: targetStudent.institutionId,
      institutionName: currentInstitution?.name,
      userName: treasurerName,
      userRole: 'Tesoureiro',
      action: 'REGISTO_TAXA_MATRICULA',
      details: `${feeLabel} de ${targetStudent.fullName} (${payload.amountAoa.toLocaleString('pt-AO')} Kz) registada como ${payload.markAsPaid ? 'PAGA' : 'PENDENTE'}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    const changedStudent = updatedStudents.find((s) => s.id === targetStudent.id);
    commitCloudChanges({
      upserts: {
        invoices: [newInvoice],
        ...(changedStudent ? { students: [changedStudent] } : {}),
        ...(createdNotification ? { financialNotifications: [createdNotification] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students: updatedStudents, teachers }
    });
  };

  // Envio de Notificações Financeiras a Alunos / Encarregados (Exclusivo do Tesoureiro)
  const handleSendFinancialNotification = (items: SendFinancialNotificationInput[]) => {
    if (!isTreasurerUser) {
      setAccessDeniedNotice(
        'Restrição Financeira: Apenas o Tesoureiro pode emitir notificações financeiras aos alunos e encarregados.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const treasurerName = currentUser?.fullName || 'Tesoureiro';
    const nowIso = new Date().toISOString();
    const createdNotifications: FinancialNotification[] = [];

    items.forEach((item, idx) => {
      const stu = students.find((s) => s.id === item.studentId);
      if (!stu) return;
      createdNotifications.push({
        id: `fnotif-${Date.now()}-${idx}`,
        institutionId: stu.institutionId,
        studentId: stu.id,
        studentName: stu.fullName,
        studentProcessNumber: stu.processNumber,
        guardianName: stu.guardianName,
        guardianPhone: stu.guardianPhone,
        recipientTarget: item.recipientTarget,
        type: item.type,
        category: item.category,
        title: item.title,
        message: item.message,
        amountAoa: item.amountAoa,
        invoiceId: item.invoiceId,
        invoiceNumber: item.invoiceNumber,
        multicaixaReference: item.multicaixaReference,
        dueDate: item.dueDate,
        sentByUserId: currentUser?.id || 'tesoureiro',
        sentByName: treasurerName,
        sentByRole: 'Tesoureiro',
        sentAt: nowIso,
        isRead: false
      });
    });

    if (createdNotifications.length === 0) return;

    const updatedNotifications = [...createdNotifications, ...financialNotifications];
    setFinancialNotifications(updatedNotifications);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: treasurerName,
      userRole: 'Tesoureiro',
      action: 'NOTIFICACAO_FINANCEIRA_ENVIADA',
      details: `Envio de ${createdNotifications.length} notificação(ões) financeira(s) para alunos e encarregados de educação.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        financialNotifications: createdNotifications,
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  // Marcação de leitura de notificação financeira pelo Aluno ou Encarregado
  const handleMarkFinancialNotificationRead = (notificationId: string) => {
    if (isStudentOrGuardian) {
      const targetNotif = financialNotifications.find((n) => n.id === notificationId);
      if (!targetNotif || !authorizedStudentIds.has(targetNotif.studentId)) {
        return;
      }
    }
    const nowIso = new Date().toISOString();
    let changedNotif: FinancialNotification | null = null;
    const updatedNotifications = financialNotifications.map((n) => {
      if (n.id === notificationId && !n.isRead) {
        changedNotif = { ...n, isRead: true, readAt: nowIso };
        return changedNotif;
      }
      return n;
    });
    setFinancialNotifications(updatedNotifications);
    if (changedNotif) {
      commitCloudChanges({
        upserts: { financialNotifications: [changedNotif] },
        fkContext: { institutions, classes, students, teachers }
      });
    }
  };

  // Handlers de Comunicados Oficiais (Super Admin -> Escolas | Admin Escolar -> Membros da Escola)
  const handleSendAnnouncement = (input: CreateAnnouncementInput) => {
    if (!currentUser) return;

    if (input.channel === 'super_to_schools') {
      if (!isSuperAdminRole) {
        setAccessDeniedNotice(
          'Restrição de Segurança: Apenas o Super Administrador pode emitir comunicados globais às escolas.'
        );
        setTimeout(() => setAccessDeniedNotice(null), 5000);
        return;
      }

      const created: Announcement = {
        id: `com-${Date.now()}`,
        channel: 'super_to_schools',
        title: input.title,
        content: input.content,
        category: input.category,
        priority: input.priority,
        createdAt: new Date().toISOString(),
        senderUserId: currentUser.id,
        senderName: currentUser.fullName,
        senderRole: 'super_admin',
        senderRoleLabel: 'Super Administrador SaaS',
        senderEmail: currentUser.email,
        targetScope: input.targetScope || 'all_schools',
        targetInstitutionIds:
          input.targetScope === 'selected_schools' ? input.targetInstitutionIds || [] : undefined,
        readByUserKeys: []
      };

      const updatedAnnouncements = [created, ...announcements];
      setAnnouncements(updatedAnnouncements);

      const newLog: AuditLogItem = {
        id: `log-${Date.now()}`,
        userName: currentUser.fullName,
        userRole: 'Super Admin',
        action: 'COMUNICADO_SUPER_ADMIN',
        details: `Emissão do comunicado "${created.title}" para ${
          created.targetScope === 'all_schools'
            ? 'todas as escolas'
            : `${created.targetInstitutionIds?.length || 0} escola(s)`
        }.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      const updatedLogs = [newLog, ...auditLogs];
      setAuditLogs(updatedLogs);

      commitCloudChanges({
        upserts: {
          announcements: [created],
          auditLogs: [newLog]
        }
      });
      return;
    }

    if (input.channel === 'school_to_members') {
      if (!isSchoolAdminSenderAllowed(currentUser, activeRole) || !currentInstitution) {
        setAccessDeniedNotice(
          'Restrição de Segurança: Apenas a Administração Escolar pode emitir comunicados institucionais aos membros da sua escola.'
        );
        setTimeout(() => setAccessDeniedNotice(null), 5000);
        return;
      }

      const validClassIds = (input.targetClassIds || []).filter((cid) =>
        classes.some((c) => c.id === cid && c.institutionId === currentInstitution.id)
      );
      const validStudentIds = (input.targetStudentIds || []).filter((sid) =>
        students.some((s) => s.id === sid && s.institutionId === currentInstitution.id)
      );
      const validUserIds = (input.targetUserIds || []).filter((uid) =>
        schoolUsers.some((u) => u.id === uid && u.institutionId === currentInstitution.id)
      );

      const roleLabelMap: Record<string, string> = {
        director_geral: 'Director Geral',
        admin_institucional: 'Administrador Escolar',
        subdirector_pedagogico: 'Subdirector Pedagógico',
        secretario_geral: 'Secretário Geral',
        coordenador_curso: 'Coordenador de Curso'
      };

      const created: Announcement = {
        id: `com-${Date.now()}`,
        channel: 'school_to_members',
        title: input.title,
        content: input.content,
        category: input.category,
        priority: input.priority,
        createdAt: new Date().toISOString(),
        senderUserId: currentUser.id,
        senderName: currentUser.fullName,
        senderRole: activeRole,
        senderRoleLabel: roleLabelMap[activeRole] || 'Administrador Escolar',
        senderEmail: currentUser.email,
        institutionId: currentInstitution.id,
        institutionName: currentInstitution.name,
        targetGroups: input.targetGroups && input.targetGroups.length > 0 ? input.targetGroups : ['utilizadores'],
        targetClassIds: validClassIds.length > 0 ? validClassIds : undefined,
        targetStudentIds: validStudentIds.length > 0 ? validStudentIds : undefined,
        targetUserIds: validUserIds.length > 0 ? validUserIds : undefined,
        readByUserKeys: []
      };

      const updatedAnnouncements = [created, ...announcements];
      setAnnouncements(updatedAnnouncements);

      const newLog: AuditLogItem = {
        id: `log-${Date.now()}`,
        institutionId: currentInstitution.id,
        institutionName: currentInstitution.name,
        userName: currentUser.fullName,
        userRole: created.senderRoleLabel,
        action: 'COMUNICADO_ESCOLAR',
        details: `Publicação do comunicado "${created.title}" para ${(created.targetGroups || []).join(', ')}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      const updatedLogs = [newLog, ...auditLogs];
      setAuditLogs(updatedLogs);

      commitCloudChanges({
        upserts: {
          announcements: [created],
          auditLogs: [newLog]
        },
        fkContext: { institutions, classes, students, teachers }
      });
    }
  };

  const handleMarkAnnouncementRead = (announcementId: string) => {
    const readKey = getUserAnnouncementReadKey(currentUser);
    if (!readKey) return;
    if (!scopedAnnouncements.some((a) => a.id === announcementId)) return;

    let changedAnnouncement: Announcement | null = null;
    const updated = announcements.map((a) => {
      if (a.id !== announcementId) return a;
      const existing = a.readByUserKeys || [];
      if (existing.some((k) => k.trim().toLowerCase() === readKey)) return a;
      changedAnnouncement = {
        ...a,
        readByUserKeys: [...existing, readKey]
      };
      return changedAnnouncement;
    });

    if (changedAnnouncement) {
      setAnnouncements(updated);
      markAnnouncementReadInSupabase(announcementId, readKey).then((ok) => {
        if (!ok && (isSuperAdminRole || isSchoolAdminRole) && changedAnnouncement) {
          commitCloudChanges({
            upserts: { announcements: [changedAnnouncement] },
            fkContext: { institutions, classes, students, teachers }
          });
        }
      });
    }
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    const target = announcements.find((a) => a.id === announcementId);
    if (!target) return;

    const allowedSuper = isSuperAdminRole && target.channel === 'super_to_schools';
    const allowedSchool =
      isSchoolAdminSenderAllowed(currentUser, activeRole) &&
      target.channel === 'school_to_members' &&
      currentInstitution &&
      target.institutionId === currentInstitution.id;

    if (!allowedSuper && !allowedSchool) {
      setAccessDeniedNotice(
        'Restrição de Segurança: Não tem permissão para remover este comunicado.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const updated = announcements.filter((a) => a.id !== announcementId);
    setAnnouncements(updated);
    commitCloudChanges({
      deletes: { announcements: [announcementId] }
    });
  };

  // Handlers para Arquivo Digital Escolar (com Supabase Storage para documentos pessoais)
  const handleAddArchiveDocument = async (
    newDoc: DigitalArchiveDocument,
    fileDataBase64?: string
  ) => {
    if (isStudentOrGuardian && !authorizedStudentIds.has(newDoc.studentId)) {
      setAccessDeniedNotice(
        'Restrição de Privacidade: Só é permitido enviar documentos para o seu próprio processo.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }
    let savedDoc: DigitalArchiveDocument = { ...newDoc };

    if (fileDataBase64) {
      // 1. Enviar primeiro para o Supabase Storage (bucket neuroeduca-student-docs)
      try {
        const storageRes = await uploadStudentDocumentToSupabaseStorage(savedDoc, fileDataBase64);
        if (storageRes.success && storageRes.storagePath && storageRes.fileUrl) {
          savedDoc = {
            ...savedDoc,
            storageBucket: storageRes.storageBucket,
            storagePath: storageRes.storagePath,
            fileUrl: storageRes.fileUrl,
            dataUrl: undefined
          };
        }
      } catch (err) {
        console.log('Supabase Storage upload fallback:', err);
      }

      // 2. Cópia local no servidor Express (caso Supabase Storage não esteja acessível)
      if (!savedDoc.storagePath) {
        try {
          const resp = await fetch('/api/archive/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: savedDoc, fileDataBase64 })
          });
          const contentType = String(resp.headers.get('content-type') || '').toLowerCase();
          if (resp.ok && contentType.includes('application/json')) {
            const data = await resp.json();
            if (data?.document) {
              savedDoc = data.document;
            }
          }
        } catch (err) {
          console.log('Upload local fallback:', err);
        }
      }
    }

    const updatedArchive = [
      savedDoc,
      ...digitalArchive.filter((d) => d.id !== savedDoc.id)
    ];
    setDigitalArchive(updatedArchive);

    let changedStudent: Student | undefined;
    if (
      savedDoc.category === 'fotografia_passe' &&
      savedDoc.fileUrl &&
      savedDoc.fileUrl.startsWith('https://')
    ) {
      const updatedStudentsList = students.map((stu) => {
        if (stu.id === savedDoc.studentId) {
          changedStudent = { ...stu, photoUrl: savedDoc.fileUrl };
          return changedStudent;
        }
        return stu;
      });
      setStudents(updatedStudentsList);
    }

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: savedDoc.institutionId,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || savedDoc.uploadedByName,
      userRole: savedDoc.uploadedByRole,
      action: 'ENVIO_ARQUIVO_DIGITAL',
      details: `Envio do documento "${savedDoc.title}" (${savedDoc.fileName})${savedDoc.storagePath ? ' para o Supabase Storage' : ''} no processo do aluno ${savedDoc.studentName} (${savedDoc.studentProcessNumber}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        digitalArchive: [savedDoc],
        ...(changedStudent ? { students: [changedStudent] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleUpdateArchiveStatus = (
    docId: string,
    status: DigitalArchiveStatus,
    reviewNotes?: string
  ) => {
    const reviewerRoleLabel = isProfessorRole ? 'Docente / Professor' : 'Administrador Escolar';
    let changedDoc: DigitalArchiveDocument | null = null;
    const updatedArchive = digitalArchive.map((doc) => {
      if (doc.id !== docId) return doc;
      changedDoc = {
        ...doc,
        status,
        reviewedByName: currentUser?.fullName || reviewerRoleLabel,
        reviewedByRole: reviewerRoleLabel,
        reviewedAt: new Date().toISOString(),
        reviewNotes
      };
      return changedDoc;
    });
    setDigitalArchive(updatedArchive);

    const target = digitalArchive.find((d) => d.id === docId);
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: target?.institutionId || currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: currentUser?.fullName || reviewerRoleLabel,
      userRole: reviewerRoleLabel,
      action: status === 'validado' ? 'VALIDACAO_ARQUIVO_DIGITAL' : 'REJEICAO_ARQUIVO_DIGITAL',
      details: `Documento "${target?.title || docId}" de ${target?.studentName || 'Aluno'} marcado como ${status.toUpperCase()}.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: {
        ...(changedDoc ? { digitalArchive: [changedDoc] } : {}),
        auditLogs: [newLog]
      },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleDeleteArchiveDocument = (docId: string) => {
    const targetDoc = digitalArchive.find((d) => d.id === docId);
    if (isStudentOrGuardian) {
      if (!targetDoc || !authorizedStudentIds.has(targetDoc.studentId)) {
        setAccessDeniedNotice(
          'Restrição de Privacidade: Não tem permissão para eliminar documentos de outros estudantes.'
        );
        setTimeout(() => setAccessDeniedNotice(null), 5000);
        return;
      }
    }
    if (targetDoc?.storagePath) {
      deleteStudentDocumentFromSupabaseStorage(
        targetDoc.storagePath,
        targetDoc.storageBucket
      ).catch(() => {});
    }
    fetch(`/api/archive/file/${encodeURIComponent(docId)}`, {
      method: 'DELETE'
    }).catch(() => {});

    const updatedArchive = digitalArchive.filter((d) => d.id !== docId);
    setDigitalArchive(updatedArchive);
    commitCloudChanges({
      deletes: { digitalArchive: [docId] }
    });
  };

  // Handlers para Registo Diário de Frequência e Justificações
  // Registo diário e validação são exclusivos do Professor / Director de Turma
  const handleSaveDailyAttendance = (newRecords: AttendanceRecord[]) => {
    if (!isProfessorRole) {
      setAccessDeniedNotice(
        'Restrição de Segurança: Apenas o Professor pode registar a frequência diária dos estudantes.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const matchKey = (r: AttendanceRecord) =>
      `${r.studentId}__${r.classId}__${r.subjectName.toLowerCase()}__${r.date}`;

    const incomingMap = new Map<string, AttendanceRecord>();
    newRecords.forEach((rec) => incomingMap.set(matchKey(rec), rec));

    const replacedIds = attendanceRecords
      .filter((existing) => incomingMap.has(matchKey(existing)) && !newRecords.some((n) => n.id === existing.id))
      .map((existing) => existing.id);

    const remaining = attendanceRecords.filter(
      (existing) => !incomingMap.has(matchKey(existing)) && !newRecords.some((n) => n.id === existing.id)
    );
    const updatedAttendance = [...newRecords, ...remaining];
    setAttendanceRecords(updatedAttendance);

    const sample = newRecords[0];
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: currentTeacher?.fullName || currentUser?.fullName || 'Professor',
      userRole: 'Docente / Professor',
      action: 'REGISTO_FREQUENCIA_DIARIA',
      details: `Registo diário de frequência (${newRecords.length} alunos) em ${
        sample?.subjectName || 'Disciplina'
      } · ${sample?.className || ''} (${sample?.date || ''}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      ...(replacedIds.length > 0 ? { deletes: { attendance: replacedIds } } : {}),
      upserts: { attendance: newRecords, auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleSubmitAbsenceJustification = (payload: {
    student: Student;
    subjectName: string;
    date: string;
    reason: string;
    recordId?: string;
  }) => {
    if (isStudentOrGuardian && !authorizedStudentIds.has(payload.student.id)) {
      setAccessDeniedNotice(
        'Restrição de Privacidade: Não é permitido justificar faltas de outros estudantes.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }
    const nowIso = new Date().toISOString();
    const submitterName =
      currentUser?.fullName || payload.student.guardianName || payload.student.fullName;

    const existing = attendanceRecords.find(
      (r) =>
        (payload.recordId && r.id === payload.recordId) ||
        (r.studentId === payload.student.id &&
          r.date === payload.date &&
          r.subjectName.toLowerCase() === payload.subjectName.toLowerCase())
    );

    let updatedAttendance: AttendanceRecord[];
    let changedRecord: AttendanceRecord;
    if (existing) {
      changedRecord = {
        ...existing,
        status: existing.status === 'falta_justificada' ? 'falta_justificada' : 'falta_injustificada',
        justificationStatus: 'pendente',
        justificationSource: 'sistema',
        justificationReason: payload.reason,
        justificationSubmittedAt: nowIso,
        justificationSubmittedBy: submitterName
      };
      updatedAttendance = attendanceRecords.map((r) =>
        r.id === existing.id ? changedRecord : r
      );
    } else {
      changedRecord = {
        id: `att-sys-${Date.now()}`,
        institutionId: payload.student.institutionId,
        studentId: payload.student.id,
        studentName: payload.student.fullName,
        studentProcessNumber: payload.student.processNumber,
        classId: payload.student.classId,
        className: payload.student.className,
        subjectName: payload.subjectName,
        date: payload.date,
        month: formatMonthReference(payload.date),
        status: 'falta_injustificada',
        notes: 'Falta reportada com pedido de justificação no sistema.',
        justificationStatus: 'pendente',
        justificationSource: 'sistema',
        justificationReason: payload.reason,
        justificationSubmittedAt: nowIso,
        justificationSubmittedBy: submitterName
      };
      updatedAttendance = [changedRecord, ...attendanceRecords];
    }

    setAttendanceRecords(updatedAttendance);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: payload.student.institutionId,
      institutionName: currentInstitution?.name,
      userName: submitterName,
      userRole: activeRole === 'encarregado_educacao' ? 'Encarregado de Educação' : 'Aluno',
      action: 'PEDIDO_JUSTIFICACAO_FALTA',
      details: `Pedido de justificação via sistema para ${payload.student.fullName} (${payload.subjectName}, ${payload.date}).`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: { attendance: [changedRecord], auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  const handleValidateJustification = (payload: {
    recordId?: string;
    student?: Student;
    classId?: string;
    subjectId?: string;
    subjectName?: string;
    date?: string;
    decision: 'validada' | 'rejeitada';
    source: JustificationSource;
    reason?: string;
    validationNotes?: string;
  }) => {
    if (!isProfessorRole) {
      setAccessDeniedNotice(
        'Restrição de Segurança: Apenas o Professor pode receber e validar justificações de faltas.'
      );
      setTimeout(() => setAccessDeniedNotice(null), 5000);
      return;
    }

    const nowIso = new Date().toISOString();
    const teacherName = currentTeacher?.fullName || currentUser?.fullName || 'Professor';
    const teacherId = currentTeacher?.id || currentUser?.id || 'prof';

    const existing = attendanceRecords.find(
      (r) =>
        (payload.recordId && r.id === payload.recordId) ||
        (payload.student &&
          payload.date &&
          payload.subjectName &&
          r.studentId === payload.student.id &&
          r.date === payload.date &&
          r.subjectName.toLowerCase() === payload.subjectName.toLowerCase())
    );

    let updatedAttendance: AttendanceRecord[];
    let changedRecord: AttendanceRecord;
    const targetStudentName = existing?.studentName || payload.student?.fullName || 'Aluno';

    if (existing) {
      changedRecord = {
        ...existing,
        status: payload.decision === 'validada' ? 'falta_justificada' : 'falta_injustificada',
        justificationStatus: payload.decision,
        justificationSource: payload.source,
        justificationReason: payload.reason || existing.justificationReason,
        validatedByTeacherId: teacherId,
        validatedByTeacherName: teacherName,
        validatedAt: nowIso,
        validationNotes: payload.validationNotes
      };
      updatedAttendance = attendanceRecords.map((r) =>
        r.id === existing.id ? changedRecord : r
      );
    } else if (payload.student && payload.date && payload.subjectName) {
      changedRecord = {
        id: `att-pres-${Date.now()}`,
        institutionId: payload.student.institutionId,
        studentId: payload.student.id,
        studentName: payload.student.fullName,
        studentProcessNumber: payload.student.processNumber,
        classId: payload.classId || payload.student.classId,
        className: payload.student.className,
        subjectId: payload.subjectId,
        subjectName: payload.subjectName,
        date: payload.date,
        month: formatMonthReference(payload.date),
        status: payload.decision === 'validada' ? 'falta_justificada' : 'falta_injustificada',
        recordedByTeacherId: teacherId,
        recordedByTeacherName: teacherName,
        recordedAt: nowIso,
        justificationStatus: payload.decision,
        justificationSource: payload.source,
        justificationReason: payload.reason,
        justificationSubmittedAt: nowIso,
        justificationSubmittedBy: payload.student.guardianName || payload.student.fullName,
        validatedByTeacherId: teacherId,
        validatedByTeacherName: teacherName,
        validatedAt: nowIso,
        validationNotes: payload.validationNotes
      };
      updatedAttendance = [changedRecord, ...attendanceRecords];
    } else {
      return;
    }

    setAttendanceRecords(updatedAttendance);

    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      institutionId: currentInstitution?.id,
      institutionName: currentInstitution?.name,
      userName: teacherName,
      userRole: 'Docente / Professor',
      action:
        payload.decision === 'validada'
          ? 'VALIDACAO_JUSTIFICACAO_FALTA'
          : 'REJEICAO_JUSTIFICACAO_FALTA',
      details: `Justificação (${payload.source}) de ${targetStudentName} ${
        payload.decision === 'validada' ? 'VALIDADA' : 'REJEITADA'
      } pelo professor.`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    const updatedLogs = [newLog, ...auditLogs];
    setAuditLogs(updatedLogs);

    commitCloudChanges({
      upserts: { attendance: [changedRecord], auditLogs: [newLog] },
      fkContext: { institutions, classes, students, teachers }
    });
  };

  // Handlers de Autenticação (Login e Logout 100% Supabase)
  const handleLogin = async (user: UserProfile, inst: Institution | null) => {
    const safeInst =
      user.role === 'super_admin' || user.role === 'director_municipal'
        ? null
        : inst ||
          (user.institutionId ? institutions.find((i) => i.id === user.institutionId) || null : null);
    setDocStudentTarget(undefined);
    setDocTypeTarget(undefined);
    setNavDeepLink(null);
    setAccessDeniedNotice(null);
    setCurrentUser(user);
    setCurrentInstitution(safeInst);
    setActiveRole(user.role);
    setCurrentTab(getDefaultTabForRole(user.role));

    // Sincronizar dados mais recentes directamente do Supabase após autenticação
    setIsLoadingCloudData(true);
    try {
      await fetchServerSupabaseStatus();
      const pullRes = await pullSupabaseDataToLocal();
      if (pullRes.bundle) {
        applyBundleToState(pullRes.bundle, {
          role: user.role,
          preferredInstitutionId: user.institutionId || safeInst?.id
        });
        setCurrentTab(getDefaultTabForRole(user.role));
      } else if (pullRes.errors?.length) {
        showSyncErrorNotice(pullRes.errors[0]);
      }
    } catch {
      // Estado mantém sessão autenticada enquanto a ligação estabiliza
    } finally {
      setIsLoadingCloudData(false);
    }
  };

  const handleLogout = async () => {
    await logoutFromSupabase();
    clearSupabaseAuthSession();
    const empty = createEmptyBundle();
    applyBundleToState(empty, { role: 'director_geral' });
    setDocStudentTarget(undefined);
    setDocTypeTarget(undefined);
    setNavDeepLink(null);
    setAccessDeniedNotice(null);
    setCurrentInstitution(null);
    setCurrentUser(null);
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-[#f3f7f4] flex flex-col items-center justify-center p-6 text-slate-700 font-sans">
        <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm px-8 py-7 flex flex-col items-center gap-3 max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-slate-900">NEUROEDUCA</p>
          <p className="text-xs text-slate-500">
            A validar sessão segura na nuvem Supabase...
          </p>
        </div>
      </div>
    );
  }

  // Se o utilizador não estiver autenticado, exibe a Página de Login
  if (!currentUser) {
    return (
      <AuthPage
        institutions={institutions}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f7f4] flex font-sans antialiased text-slate-800">
      {/* Left Deep-Emerald Sidebar (Full-Height Anchor) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentEvalSubTab={currentEvalSubTab}
        onOpenEvaluations={(evalTab) => handleDeepNavigate({ tab: 'evaluations', evalTab })}
        currentInstitution={currentInstitution}
        activeRole={activeRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
        onOpenInstallPWA={() => setIsPWAInstallModalOpen(true)}
        unreadAnnouncementsCount={unreadAnnouncementsCount}
      />

      {/* Right Workspace Column: White Top Header + Mint-Slate Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentInstitution={currentInstitution}
          institutions={institutions}
          onSelectInstitution={(inst) => {
            if (!isSuperAdminRole) return;
            if (inst === null) {
              setCurrentInstitution(null);
              setCurrentTab('super_institutions');
            }
          }}
          activeRole={activeRole}
          onChangeRole={(role) => {
            if (isTreasurerUser) {
              setAccessDeniedNotice(
                'Perfil Tesoureiro Activo: O Tesoureiro opera exclusivamente no seu perfil financeiro.'
              );
              setTimeout(() => setAccessDeniedNotice(null), 5000);
              return;
            }
            const allowedAdminSubRoles: UserRole[] = [
              'director_geral',
              'admin_institucional',
              'subdirector_pedagogico',
              'secretario_geral',
              'coordenador_curso'
            ];
            if (!isSchoolAdminRole || !allowedAdminSubRoles.includes(role)) {
              setAccessDeniedNotice(
                'Restrição de Segurança: Não é permitido alternar para painéis de outros perfis (Super Admin, Tesoureiro, Professor ou Aluno/Encarregado).'
              );
              setTimeout(() => setAccessDeniedNotice(null), 5000);
              return;
            }
            setActiveRole(role);
          }}
          academicYear={academicYear}
          currentTab={currentTab}
          onOpenSearch={() => setIsSearchOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenInstallPWA={() => setIsPWAInstallModalOpen(true)}
          onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
          onNavigateTab={handleSelectTab}
          students={isStudentOrGuardian ? authorizedStudentPortalStudents : students}
          classes={isStudentOrGuardian ? scopedStudentClasses : classes}
          teachers={isStudentOrGuardian ? [] : teachers}
          subjects={subjects}
          schoolUsers={isStudentOrGuardian ? [] : schoolUsers}
          currentTeacher={currentTeacher}
          onDeepNavigate={handleDeepNavigate}
          financialNotifications={
            isStudentOrGuardian ? scopedStudentFinNotifications : financialNotifications
          }
          onMarkFinancialNotificationRead={handleMarkFinancialNotificationRead}
          announcements={scopedAnnouncements}
          onMarkAnnouncementRead={handleMarkAnnouncementRead}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1440px] mx-auto w-full overflow-y-auto pb-24 lg:pb-10">
          {/* Banner de Erro de Sincronização Supabase */}
          {syncNotice && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-amber-800">Sincronização Supabase:</span>
                <span className="font-medium">{syncNotice}</span>
              </div>
              <button
                onClick={() => setSyncNotice(null)}
                className="text-amber-600 hover:text-amber-900 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          )}

          {/* Banner de Aviso de Acesso Restrito (Rigoroso RBAC) */}
          {accessDeniedNotice && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-red-700">Acesso Restrito:</span>
                <span className="font-medium">{accessDeniedNotice}</span>
              </div>
              <button
                onClick={() => setAccessDeniedNotice(null)}
                className="text-red-500 hover:text-red-800 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          )}

          {/* SUPER ADMIN VIEWS (Exclusivo do Administrador Geral SaaS) */}
          {isSuperAdminRole && currentTab === 'super_institutions' && (
            <InstitutionsManager
              institutions={institutions}
              onAddInstitution={handleAddInstitution}
              onUpdateInstitution={handleUpdateInstitution}
              onDeleteInstitution={handleDeleteInstitution}
              onUpdateStatus={handleUpdateInstitutionStatus}
              onSelectToManage={handleSelectToManage}
              initialSearchTerm={
                navDeepLink?.tab === 'super_institutions'
                  ? navDeepLink.userSearch || navDeepLink.classSearch
                  : undefined
              }
              initialEditInstitutionId={
                navDeepLink?.tab === 'super_institutions' && navDeepLink.openInstitutionModal
                  ? navDeepLink.institutionId
                  : undefined
              }
              navigationKey={navDeepLink?.tab === 'super_institutions' ? navDeepLink.key : undefined}
            />
          )}

          {isSuperAdminRole && currentTab === 'super_users' && (
            <SuperUsersManager
              institutions={institutions}
              schoolUsers={schoolUsers}
              accounts={accounts}
              onAddUser={handleAddSchoolUser}
              onUpdateUser={handleUpdateSuperUser}
              onDeleteUser={handleDeleteSuperUser}
              onResetPassword={handleResetUserPassword}
              onOpenInstitutionConfig={(institutionId) => {
                handleDeepNavigate({
                  tab: 'super_institutions',
                  institutionId,
                  openInstitutionModal: true
                });
              }}
              initialSearchTerm={
                navDeepLink?.tab === 'super_users' ? navDeepLink.userSearch : undefined
              }
              navigationKey={navDeepLink?.tab === 'super_users' ? navDeepLink.key : undefined}
            />
          )}

          {isSuperAdminRole && currentTab === 'super_subscriptions' && (
            <SubscriptionPlans
              plans={INITIAL_SUBSCRIPTION_PLANS}
              institutions={institutions}
            />
          )}

          {isSuperAdminRole && currentTab === 'super_communications' && (
            <AnnouncementsCenter
              announcements={scopedAnnouncements}
              currentUser={currentUser}
              activeRole={activeRole}
              currentInstitution={null}
              institutions={institutions}
              classes={[]}
              students={[]}
              teachers={[]}
              schoolUsers={[]}
              onSendAnnouncement={handleSendAnnouncement}
              onMarkRead={handleMarkAnnouncementRead}
              onDeleteAnnouncement={handleDeleteAnnouncement}
            />
          )}

          {isSuperAdminRole && currentTab === 'super_psychopedagogical' && (
            <PsychopedagogicalManager
              mode="super_admin"
              institutions={institutions}
              students={students}
              protocols={psychopedagogicalProtocols}
              cases={psychopedagogicalCases}
              currentUserName={currentUser?.fullName || 'Super Administrador'}
              onToggleInstitutionActivation={handleToggleInstitutionPsychopedagogical}
              onBatchToggleActivation={handleBatchTogglePsychopedagogical}
              onSaveProtocol={handleSavePsychopedagogicalProtocol}
              onSaveCase={handleSavePsychopedagogicalCase}
              onAddSession={handleAddPsychopedagogicalSession}
            />
          )}

          {isSuperAdminRole && currentTab === 'super_curriculum' && (
            <CurriculumDatabaseViewer />
          )}

          {(isSuperAdminRole || isSchoolAdminRole) && currentTab === 'super_supabase_sql' && (
            <SupabaseSqlViewer
              bundle={buildCurrentBundle()}
              onDataReset={handleSeedDemoData}
              onDataRestored={handleDataRestored}
            />
          )}

          {isSuperAdminRole && currentTab === 'super_audit' && (
            <AuditLogViewer logs={auditLogs} institutions={institutions} />
          )}

          {/* DIRECTOR MUNICIPAL DA EDUCAÇÃO VIEWS (Todas as Escolas do Município) */}
          {isMunicipalDirectorRole &&
            (currentTab === 'municipal_dashboard' ||
              currentTab === 'municipal_schools' ||
              currentTab === 'municipal_enrollment' ||
              currentTab === 'municipal_performance') && (
              <MunicipalDirectorDashboard
                currentUser={currentUser!}
                institutions={institutions}
                classes={classes}
                students={students}
                teachers={teachers}
                grades={grades}
                subjects={subjects}
                activeSection={currentTab as MunicipalSection}
                onSelectSection={handleSelectTab}
                initialSelectedSchoolId={
                  navDeepLink?.tab === 'municipal_schools' ? navDeepLink.institutionId : undefined
                }
                navigationKey={navDeepLink?.key}
              />
            )}

          {/* ESTADO DE CARREGAMENTO OU RECUPERAÇÃO DA ESCOLA DO UTILIZADOR */}
          {!currentInstitution && !isSuperAdminRole && !isMunicipalDirectorRole && (
            <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-8 max-w-lg mx-auto my-8 text-center space-y-4">
              {isLoadingCloudData ? (
                <>
                  <div className="w-10 h-10 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mx-auto" />
                  <h2 className="text-base font-bold text-slate-900">
                    A carregar painel da escola...
                  </h2>
                  <p className="text-xs text-slate-500">
                    A sincronizar dados da instituição e indicadores directamente do Supabase.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold text-slate-900">
                    Dados da escola ainda não carregados
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Não foi possível localizar a instituição escolar associada à sua conta (
                    {currentUser.institutionName || currentUser.institutionId || currentUser.email}).
                    Verifique se o Super Administrador concluiu a sincronização da escola no Supabase.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handlePullFromCloud().catch((err: any) =>
                          showSyncErrorNotice(err?.message || 'Falha ao carregar dados da escola.')
                        );
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Tentar Carregar Novamente
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Terminar Sessão
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* INSTITUTIONAL VIEWS (Bloqueadas para Super Administrador e Director Municipal) */}
          {currentInstitution && !isSuperAdminRole && !isMunicipalDirectorRole && (
            <>
              {/* PAINEL DO ALUNO E ENCARREGADO DE EDUCAÇÃO (Acesso Exclusivo) */}
              {isStudentOrGuardian &&
                (currentTab === 'student_portal' ||
                  currentTab === 'student_grades' ||
                  currentTab === 'student_attendance' ||
                  currentTab === 'student_tuition' ||
                  currentTab === 'student_enrollment' ||
                  currentTab === 'student_archive') && (
                <StudentPortal
                  currentInstitution={currentInstitution}
                  students={authorizedStudentPortalStudents}
                  grades={scopedStudentGrades}
                  invoices={scopedStudentInvoices}
                  classes={scopedStudentClasses}
                  currentUser={currentUser}
                  activeRole={activeRole}
                  initialTab={
                    currentTab === 'student_attendance'
                      ? 'attendance'
                      : currentTab === 'student_tuition'
                      ? 'tuition'
                      : currentTab === 'student_enrollment'
                      ? 'enrollment'
                      : currentTab === 'student_archive'
                      ? 'archive'
                      : 'grades'
                  }
                  onOpenDocument={handleOpenDocFromStudent}
                  digitalArchive={scopedStudentArchive}
                  onAddArchiveDocument={handleAddArchiveDocument}
                  onUpdateArchiveStatus={handleUpdateArchiveStatus}
                  onDeleteArchiveDocument={handleDeleteArchiveDocument}
                  attendanceRecords={scopedStudentAttendance}
                  onSubmitAbsenceJustification={handleSubmitAbsenceJustification}
                  financialNotifications={scopedStudentFinNotifications}
                  onMarkFinancialNotificationRead={handleMarkFinancialNotificationRead}
                />
              )}

              {/* PAINEL DO ADMINISTRADOR ESCOLAR (Bloqueado para Professor e Aluno/Encarregado) */}
              {isSchoolAdminRole && currentTab === 'dashboard' && (
                <InstitutionDashboard
                  currentInstitution={currentInstitution}
                  students={students}
                  classes={classes}
                  teachers={teachers}
                  invoices={invoices}
                  grades={grades}
                  auditLogs={auditLogs}
                  isTreasurer={isTreasurerUser}
                  schoolUsersCount={
                    schoolUsers.filter((u) => u.institutionId === currentInstitution.id).length
                  }
                  subjectsCount={
                    subjects.filter((s) => s.institutionId === currentInstitution.id).length
                  }
                  currentUser={currentUser}
                  onNavigateTab={handleSelectTab}
                  onOpenNewStudent={() => {
                    setCurrentTab('students');
                    setOpenStudentModalKey(Date.now());
                  }}
                  onOpenNewClass={() => {
                    setCurrentTab('classes');
                    setOpenClassModalKey(Date.now());
                  }}
                  onOpenNewSubject={() => {
                    setCurrentTab('subjects');
                    setOpenSubjectModalKey(Date.now());
                  }}
                  onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
                />
              )}

              {isSchoolAdminRole && currentTab === 'school_settings' && (
                <SchoolSettings
                  currentInstitution={currentInstitution}
                  onUpdateInstitution={handleUpdateInstitution}
                />
              )}

              {isSchoolAdminRole && currentTab === 'school_users' && (
                <SchoolUsersManager
                  currentInstitution={currentInstitution}
                  classes={classes}
                  users={schoolUsers}
                  teachers={teachers}
                  customSubjects={subjects.filter((s) => s.institutionId === currentInstitution.id)}
                  onAddUser={handleAddSchoolUser}
                  onUpdateUser={handleUpdateSchoolUser}
                  onDeleteUser={handleDeleteSchoolUser}
                  onResetPassword={handleResetUserPassword}
                />
              )}

              {isSchoolAdminRole && currentTab === 'curriculum_explorer' && (
                <CurriculumExplorer
                  currentInstitution={currentInstitution}
                  initialSubsystemCode={
                    navDeepLink?.tab === 'curriculum_explorer'
                      ? navDeepLink.subsystemCode
                      : undefined
                  }
                  navigationKey={
                    navDeepLink?.tab === 'curriculum_explorer' ? navDeepLink.key : undefined
                  }
                />
              )}

              {(isSchoolAdminRole || isProfessorRole) && currentTab === 'classes' && (
                <ClassesManager
                  key={openClassModalKey}
                  currentInstitution={currentInstitution}
                  classes={classes}
                  teachers={teachers}
                  students={students}
                  customSubjects={subjects.filter((s) => s.institutionId === currentInstitution.id)}
                  onAddSubject={handleAddSubject}
                  onAddClass={handleAddClass}
                  onUpdateClass={handleUpdateClass}
                  onDeleteClass={handleDeleteClass}
                  onNavigateTab={handleSelectTab}
                  onOpenClassEvaluations={(classId, evalTab) =>
                    handleDeepNavigate({ tab: 'evaluations', classId, evalTab })
                  }
                  initialOpenModal={isSchoolAdminRole && Boolean(openClassModalKey)}
                  activeRole={activeRole}
                  currentUser={currentUser}
                  currentTeacher={currentTeacher}
                  initialSearchTerm={
                    navDeepLink?.tab === 'classes'
                      ? navDeepLink.classSearch ?? navDeepLink.gradeLevel
                      : undefined
                  }
                  initialOpenRosterClassId={
                    navDeepLink?.tab === 'classes' ? navDeepLink.openRosterClassId : undefined
                  }
                  navigationKey={navDeepLink?.tab === 'classes' ? navDeepLink.key : undefined}
                />
              )}

              {isSchoolAdminRole && currentTab === 'class_lists' && (
                <ClassListsSheet
                  currentInstitution={currentInstitution}
                  classes={classes}
                  students={students}
                  teachers={teachers}
                  onNavigateTab={handleSelectTab}
                />
              )}

              {isSchoolAdminRole && currentTab === 'subjects' && (
                <SubjectsManager
                  key={openSubjectModalKey}
                  currentInstitution={currentInstitution}
                  subjects={subjects}
                  teachers={teachers}
                  onAddSubject={handleAddSubject}
                  onUpdateSubject={handleUpdateSubject}
                  onDeleteSubject={handleDeleteSubject}
                  onNavigateTab={handleSelectTab}
                  initialOpenModal={Boolean(openSubjectModalKey)}
                  initialSearchTerm={
                    navDeepLink?.tab === 'subjects' ? navDeepLink.subjectSearch : undefined
                  }
                  initialSubsystemCode={
                    navDeepLink?.tab === 'subjects' ? navDeepLink.subsystemCode : undefined
                  }
                  navigationKey={navDeepLink?.tab === 'subjects' ? navDeepLink.key : undefined}
                />
              )}

              {(isSchoolAdminRole || isProfessorRole) && currentTab === 'students' && (
                <StudentsManager
                  key={openStudentModalKey}
                  currentInstitution={currentInstitution}
                  students={students}
                  classes={classes}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onAddMultipleStudents={handleAddMultipleStudents}
                  onOpenDocumentGenerator={handleOpenDocFromStudent}
                  initialOpenModal={Boolean(openStudentModalKey)}
                  activeRole={activeRole}
                  currentUser={currentUser}
                  currentTeacher={currentTeacher}
                  initialSearchTerm={
                    navDeepLink?.tab === 'students' ? navDeepLink.studentSearch : undefined
                  }
                  initialSelectedStudentId={
                    navDeepLink?.tab === 'students' ? navDeepLink.openStudentProfileId : undefined
                  }
                  navigationKey={navDeepLink?.tab === 'students' ? navDeepLink.key : undefined}
                  digitalArchive={digitalArchive}
                  onOpenDigitalArchive={(stu) =>
                    handleDeepNavigate({
                      tab: 'digital_archive',
                      studentId: stu.id
                    })
                  }
                />
              )}

              {(isProfessorRole || isSchoolAdminRole) && currentTab === 'attendance' && (
                <AttendanceManager
                  currentInstitution={currentInstitution}
                  classes={classes}
                  students={students}
                  attendanceRecords={attendanceRecords}
                  customSubjects={subjects.filter((s) => s.institutionId === currentInstitution.id)}
                  currentUser={currentUser}
                  activeRole={activeRole}
                  currentTeacher={currentTeacher}
                  onSaveDailyAttendance={handleSaveDailyAttendance}
                  onValidateJustification={handleValidateJustification}
                  initialClassId={
                    navDeepLink?.tab === 'attendance' ? navDeepLink.classId : undefined
                  }
                  navigationKey={
                    navDeepLink?.tab === 'attendance' ? navDeepLink.key : undefined
                  }
                />
              )}

              {isSchoolAdminRole && currentTab === 'teachers' && (
                <TeachersManager
                  currentInstitution={currentInstitution}
                  teachers={teachers}
                  classes={classes}
                  customSubjects={subjects.filter((s) => s.institutionId === currentInstitution.id)}
                  onAddTeacher={handleAddTeacher}
                  onUpdateTeacher={handleUpdateTeacher}
                />
              )}

              {/* PAUTAS, MINI-PAUTAS E BOLETINS (Lançamento pelo Professor / Consulta e Homologação pelo Administrador Escolar) */}
              {(isProfessorRole || isSchoolAdminRole) && currentTab === 'evaluations' && (
                <EvaluationCenter
                  currentInstitution={currentInstitution}
                  classes={classes}
                  students={students}
                  grades={grades}
                  onUpdateGrade={handleUpdateGrade}
                  onUpdateGradesBatch={handleUpdateGradesBatch}
                  onOpenDocumentGenerator={handleOpenDocFromStudent}
                  activeRole={activeRole}
                  currentUser={currentUser}
                  currentTeacher={currentTeacher}
                  initialTab={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.evalTab : undefined
                  }
                  initialSubsystemCode={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.subsystemCode : undefined
                  }
                  initialGradeLevel={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.gradeLevel : undefined
                  }
                  initialClassId={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.classId : undefined
                  }
                  initialSubjectId={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.subjectId : undefined
                  }
                  initialPeriod={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.period : undefined
                  }
                  initialStudentId={
                    navDeepLink?.tab === 'evaluations' ? navDeepLink.studentId : undefined
                  }
                  navigationKey={navDeepLink?.tab === 'evaluations' ? navDeepLink.key : undefined}
                  customSubjects={subjects.filter((s) => s.institutionId === currentInstitution.id)}
                  onEvalTabChange={setCurrentEvalSubTab}
                />
              )}

              {isSchoolAdminRole && currentTab === 'specialized_subsystems' && (
                <SubsystemSpecificViews currentInstitution={currentInstitution} />
              )}

              {isSchoolAdminRole && currentTab === 'financial' && (
                <FinancialManager
                  key={openInvoiceModalKey}
                  currentInstitution={currentInstitution}
                  invoices={invoices}
                  students={students}
                  isTreasurer={isTreasurerUser}
                  currentUser={currentUser}
                  financialNotifications={financialNotifications}
                  onAddPayment={handleAddPayment}
                  onAddInvoice={handleAddInvoice}
                  onRegisterEnrollmentFee={handleRegisterEnrollmentFee}
                  onSendFinancialNotification={handleSendFinancialNotification}
                  initialOpenModal={Boolean(openInvoiceModalKey) && isTreasurerUser}
                  onOpenReceipt={(inv) => {
                    const found = students.find((s) => s.id === inv.studentId);
                    if (found) {
                      setDocStudentTarget(found);
                      setDocTypeTarget('recibo_propina');
                      setCurrentTab('documents');
                    }
                  }}
                />
              )}

              {(isSchoolAdminRole || isStudentOrGuardian) && currentTab === 'documents' && (
                <DocumentCenter
                  currentInstitution={currentInstitution}
                  students={isStudentOrGuardian ? authorizedStudentPortalStudents : students}
                  classes={isStudentOrGuardian ? scopedStudentClasses : classes}
                  invoices={isStudentOrGuardian ? scopedStudentInvoices : invoices}
                  grades={isStudentOrGuardian ? scopedStudentGrades : grades}
                  initialStudent={
                    isStudentOrGuardian
                      ? docStudentTarget && authorizedStudentIds.has(docStudentTarget.id)
                        ? docStudentTarget
                        : authorizedStudentPortalStudents[0]
                      : docStudentTarget
                  }
                  initialDocType={docTypeTarget}
                  initialPeriod={
                    navDeepLink?.tab === 'documents' ? navDeepLink.period : undefined
                  }
                  currentUser={currentUser}
                  activeRole={activeRole}
                  navigationKey={navDeepLink?.tab === 'documents' ? navDeepLink.key : undefined}
                  customSubjects={subjects.filter((s) => s.institutionId === currentInstitution.id)}
                />
              )}

              {(isSchoolAdminRole || isProfessorRole || isStudentOrGuardian) &&
                currentTab === 'digital_archive' && (
                  <DigitalArchiveCenter
                    currentInstitution={currentInstitution}
                    students={isStudentOrGuardian ? authorizedStudentPortalStudents : students}
                    classes={isStudentOrGuardian ? scopedStudentClasses : classes}
                    documents={isStudentOrGuardian ? scopedStudentArchive : digitalArchive}
                    onAddDocument={handleAddArchiveDocument}
                    onUpdateStatus={handleUpdateArchiveStatus}
                    onDeleteDocument={handleDeleteArchiveDocument}
                    currentUser={currentUser}
                    activeRole={activeRole}
                    currentTeacher={currentTeacher}
                    initialStudentId={
                      navDeepLink?.tab === 'digital_archive'
                        ? isStudentOrGuardian &&
                          navDeepLink.studentId &&
                          !authorizedStudentIds.has(navDeepLink.studentId)
                          ? undefined
                          : navDeepLink.studentId
                        : undefined
                    }
                    initialSearchTerm={
                      navDeepLink?.tab === 'digital_archive' ? navDeepLink.studentSearch : undefined
                    }
                    navigationKey={
                      navDeepLink?.tab === 'digital_archive' ? navDeepLink.key : undefined
                    }
                  />
                )}

              {(isSchoolAdminRole || isProfessorRole || isStudentOrGuardian) &&
                currentTab === 'communications' && (
                  <AnnouncementsCenter
                    announcements={scopedAnnouncements}
                    currentUser={currentUser}
                    activeRole={activeRole}
                    currentInstitution={currentInstitution}
                    institutions={isStudentOrGuardian ? [] : institutions}
                    classes={isStudentOrGuardian ? scopedStudentClasses : classes}
                    students={isStudentOrGuardian ? authorizedStudentPortalStudents : students}
                    teachers={isStudentOrGuardian ? [] : teachers}
                    schoolUsers={isStudentOrGuardian ? [] : schoolUsers}
                    onSendAnnouncement={handleSendAnnouncement}
                    onMarkRead={handleMarkAnnouncementRead}
                    onDeleteAnnouncement={handleDeleteAnnouncement}
                  />
                )}

              {(isSchoolAdminRole || isProfessorRole) && currentTab === 'pedagogical_ai' && (
                <PedagogicalAssistant currentInstitution={currentInstitution} />
              )}

              {isSchoolAdminRole &&
                currentTab === 'psychopedagogical' &&
                Boolean(currentInstitution.features?.psychopedagogicalSupport) && (
                  <PsychopedagogicalManager
                    mode="school"
                    institutions={institutions}
                    lockedInstitution={currentInstitution}
                    students={students}
                    protocols={psychopedagogicalProtocols}
                    cases={psychopedagogicalCases}
                    currentUserName={currentUser?.fullName || 'Direcção Pedagógica'}
                    onSaveCase={handleSavePsychopedagogicalCase}
                    onAddSession={handleAddPsychopedagogicalSession}
                  />
                )}

              {isSchoolAdminRole && currentTab === 'reports' && (
                <ReportsDashboard
                  currentInstitution={currentInstitution}
                  institutions={institutions}
                  students={students}
                  classes={classes}
                  invoices={invoices}
                  grades={grades}
                  onNavigateTab={handleSelectTab}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Paleta de Comandos Executiva ⌘K */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentInstitution={currentInstitution}
        institutions={isStudentOrGuardian ? [] : institutions}
        students={isStudentOrGuardian ? authorizedStudentPortalStudents : students}
        classes={isStudentOrGuardian ? scopedStudentClasses : classes}
        teachers={isStudentOrGuardian ? [] : teachers}
        invoices={isStudentOrGuardian ? scopedStudentInvoices : invoices}
        currentUser={currentUser}
        activeRole={activeRole}
        currentTeacher={currentTeacher}
        onNavigateTab={(tab) => {
          handleSelectTab(tab);
          setIsSearchOpen(false);
        }}
        onSelectInstitution={() => {
          setIsSearchOpen(false);
        }}
        onOpenNewStudent={() => {
          if (!isSchoolAdminRole) return;
          handleSelectTab('students');
          setOpenStudentModalKey(Date.now());
          setIsSearchOpen(false);
        }}
        onOpenNewClass={() => {
          if (!isSchoolAdminRole) return;
          handleSelectTab('classes');
          setOpenClassModalKey(Date.now());
          setIsSearchOpen(false);
        }}
        onOpenNewInvoice={() => {
          if (!isTreasurerUser) return;
          handleSelectTab('financial');
          setOpenInvoiceModalKey(Date.now());
          setIsSearchOpen(false);
        }}
      />

      {/* Barra de Navegação Inferior Móvel para Smartphones e Tablets */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeRole={activeRole}
        currentUser={currentUser}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenInstallPWA={() => setIsPWAInstallModalOpen(true)}
        onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
      />

      {/* Modal Interativo para Instalação de APK (WebAPK / PWA) */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
      />

      {/* Modal de Backup JSON & Estado na Nuvem Supabase */}
      <LocalhostMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        bundle={buildCurrentBundle()}
        onPullFromCloud={handlePullFromCloud}
        onDataRestored={handleDataRestored}
        onSeedDemoData={handleSeedDemoData}
        onForceSyncCloud={handleForceSyncCloud}
      />
    </div>
  );
}
