/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Tipos Globais do Sistema de Gestão Escolar (Angola)
 */

export type EducationSubsystemCode =
  | 'pre_escolar'
  | 'primario_geral'
  | 'adultos'
  | 'secundario_geral_1'
  | 'secundario_geral_2'
  | 'tecnico_1'
  | 'tecnico_2'
  | 'pedagogico'
  | 'especial'
  | 'centro_infantil'
  | 'superior';

export interface EducationSubsystem {
  id: string;
  code: EducationSubsystemCode;
  name: string;
  shortName: string;
  description: string;
  officialNorm: string;
  defaultGradingType: 'qualitativa' | 'numerica_0_10' | 'numerica_0_20' | 'modular' | 'creditos_ects';
  gradesOrYears: string[];
  coursesAvailable?: string[];
  featuresSpecialized: string[];
}

export type InstitutionType = 'publica' | 'privada' | 'comparticipada';
export type InstitutionStatus = 'active' | 'suspended' | 'trial' | 'pending_validation';

export interface InstitutionFeatures {
  financialManagement: boolean;       // Gestão Financeira e Propinas Multicaixa
  evaluationCenter: boolean;          // Centro de Avaliações e Mini-Pautas INIDE
  aiAssistant: boolean;               // Assistente Pedagógico com IA Gemini
  officialDocuments: boolean;         // Emissão de Documentos Oficiais com QR Code
  massEnrollment: boolean;            // Matrícula em Massa (Importação CSV/Lote)
  specializedModules: boolean;        // Módulos Especializados (Pré-escolar, PEI, Superior)
  reportsAndAnalytics: boolean;       // Relatórios Estatísticos e Gráficos
  psychopedagogicalSupport?: boolean; // Acompanhamento Psicopedagógico e NEE (activado pelo Super Admin)
}

export const DEFAULT_INSTITUTION_FEATURES: InstitutionFeatures = {
  financialManagement: true,
  evaluationCenter: true,
  aiAssistant: true,
  officialDocuments: true,
  massEnrollment: true,
  specializedModules: true,
  reportsAndAnalytics: true,
  psychopedagogicalSupport: false,
};

export interface PsychopedagogicalInstitutionConfig {
  activatedAt?: string;
  activatedBy?: string;
  specialistName?: string;
  specialistEmail?: string;
  specialistPhone?: string;
  enabledProtocolIds?: string[];
  notes?: string;
}

export interface Institution {
  id: string;
  code: string;
  name: string;
  acronym: string;
  nif: string;
  licenseNumber: string;
  institutionType: InstitutionType;
  category: 'infantil' | 'geral' | 'tecnico' | 'pedagogico' | 'superior' | 'complexo_escolar';
  province: string;
  municipality: string;
  commune?: string;
  neighborhood?: string;
  address: string;
  phone: string;
  email: string;
  directorName: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminPassword?: string;
  logoUrl?: string;
  subsystems: EducationSubsystemCode[];
  features?: InstitutionFeatures;
  psychopedagogicalConfig?: PsychopedagogicalInstitutionConfig;
  status: InstitutionStatus;
  maxClasses: number;
  currentClassesCount: number;
  currentStudentsCount: number;
  currentTeachersCount: number;
  pedagogicalMotto?: string;
  subdirectorPedagogico?: string;
  secretarioGeral?: string;
  bankAccount?: {
    bankName: string;
    iban: string;
    multicaixaEntity: string;
  };
  createdAt: string;
}

export interface SchoolUser {
  id: string;
  institutionId: string;
  fullName: string;
  email: string;
  phone?: string;
  role:
    | 'professor'
    | 'funcionario_financeiro'
    | 'aluno'
    | 'encarregado_educacao'
    | 'director_geral'
    | 'subdirector_pedagogico'
    | 'secretario_geral'
    | 'director_municipal';
  municipality?: string;
  province?: string;
  identityCardNumber?: string;
  status: 'activo' | 'inactivo';
  departmentOrClass?: string;
  createdAt: string;
}

export interface StoredCredential {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  institutionId?: string;
  institutionName?: string;
  municipality?: string;
  province?: string;
  status?: 'activo' | 'inactivo';
}

export type SubscriptionCycle = 'mensal' | 'trimestral' | 'anual';
export type SubscriptionStatus = 'active' | 'expired' | 'grace_period' | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  name: string;
  cycle: SubscriptionCycle;
  priceAoa: number;
  pricePerClassAoa: number;
  maxClasses: number;
  features: string[];
  isActive: boolean;
}

export interface InstitutionSubscription {
  id: string;
  institutionId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  expirationDate: string;
  contractedClasses: number;
  amountPaidAoa: number;
  paymentReference?: string;
}

export type UserRole =
  | 'super_admin'
  | 'director_municipal'
  | 'admin_institucional'
  | 'director_geral'
  | 'subdirector_pedagogico'
  | 'secretario_geral'
  | 'coordenador_curso'
  | 'director_turma'
  | 'professor'
  | 'funcionario_financeiro'
  | 'aluno'
  | 'encarregado_educacao'
  | 'supervisor_estagio';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  institutionId?: string; // null for super_admin and director_municipal
  institutionName?: string;
  municipality?: string;
  province?: string;
  identityCardNumber?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CurriculumSubject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  group: 'geral' | 'especifica' | 'socio_cultural' | 'tecnica_tecnologica' | 'pratica';
  weeklyHours: number;
  coefficient: number;
  academicCredits?: number; // Para Ensino Superior
  isTerminalExam?: boolean; // Se tem exame no final do ciclo/classe
}

export interface SchoolSubject extends CurriculumSubject {
  institutionId: string;
  subsystemCode: EducationSubsystemCode;
  gradeLevel: string; // Ex: "10.ª Classe" ou "Todas"
  courseName?: string;
  teacherId?: string;
  teacherName?: string;
  status: 'activa' | 'inactiva';
  isCustom?: boolean;
  createdAt: string;
}

export interface CurriculumPlan {
  id: string;
  subsystemCode: EducationSubsystemCode;
  gradeLevel: string; // Ex: "1.ª Classe", "10.ª Classe", "Módulo I"
  courseName?: string; // Para ensino técnico, pedagógico ou secundário (Ex: "Informática", "Ciências Físicas e Biológicas")
  area?: string;
  name: string;
  version: string;
  effectiveYear: string;
  legalReference: string;
  validationStatus: 'validated' | 'pending_validation' | 'deprecated';
  evaluationFormula: string;
  subjects: CurriculumSubject[];
  observationNote?: string;
}

export interface ClassRoom {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  subsystemCode: EducationSubsystemCode;
  gradeLevel: string;
  courseName?: string;
  curriculumPlanId: string;
  subjects?: CurriculumSubject[];
  shift: 'manha' | 'tarde' | 'noite' | 'integral';
  room: string;
  academicYear: string;
  classDirectorId?: string;
  classDirectorName?: string;
  maxCapacity: number; // Ex: 45
  enrolledStudentsCount: number;
  status: 'aberta' | 'fechada' | 'arquivada';
}

export interface Student {
  id: string;
  institutionId: string;
  processNumber: string;
  fullName: string;
  birthDate: string;
  gender: 'M' | 'F';
  identityCardNumber?: string;
  birthCertificateNumber?: string;
  birthProvince: string;
  birthMunicipality: string;
  birthCommune?: string;
  residentialAddress: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
  email?: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  guardianEmail?: string;
  portalPassword?: string;
  enrollmentFeePaid?: boolean;
  enrollmentReceiptNumber?: string;
  enrollmentAmountAoa?: number;
  subsystemCode: EducationSubsystemCode;
  gradeLevel: string;
  courseName?: string;
  classId: string;
  className: string;
  shift: string;
  academicYear: string;
  academicStatus: 'matriculado' | 'confirmado' | 'transferido' | 'desistente' | 'concluido';
  specialNeedsNotes?: string; // Educação Especial
  authorizedPickups?: { name: string; phone: string; relationship: string; idDoc?: string }[]; // Centro Infantil
  photoUrl?: string;
}

export interface Teacher {
  id: string;
  institutionId: string;
  staffCode: string;
  fullName: string;
  academicDegree: 'Doutor' | 'Mestre' | 'Licenciado' | 'Bacharel' | 'Médio Pedagógico' | 'Técnico Médio';
  specialization: string;
  phone: string;
  email: string;
  contractType: 'tempo_integral' | 'tempo_parcial' | 'colaborador';
  assignedClasses: {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    weeklyHours: number;
  }[];
  isActive: boolean;
}

export interface GradeRecord {
  id: string;
  institutionId: string;
  studentId: string;
  studentName: string;
  studentProcessNumber: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  period: '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual' | '1_semestre' | '2_semestre';
  ac1?: number; // Avaliação Contínua 1 (0-10 Primário / 0-20 Secundário-Superior)
  ac2?: number; // Avaliação Contínua 2 (0-10 Primário / 0-20 Secundário-Superior)
  ac3?: number; // Avaliação Contínua 3 (0-10 Primário / 0-20 Secundário-Superior)
  mac?: number; // Média de Avaliação Contínua calculada: (AC1 + AC2 + AC3) / 3
  npp?: number; // Nota de Prova do Professor (compatibilidade legada)
  npt?: number; // Nota de Prova Trimestral
  mt?: number; // Média Trimestral calculada: (MAC + NPT) / 2
  examScore?: number; // Exame Final / Compatibilidade
  examNormal?: number; // Exame Normal (EN) - exclusivo 6ª, Módulo 3, Etapa 3, 9ª, 12ª e Ensino Superior
  examRecourse?: number; // Exame de Recurso (REC) - exclusivo 6ª, Módulo 3, Etapa 3, 9ª, 12ª e Ensino Superior
  finalGrade?: number; // Média Final
  qualitativeAssessment?: string; // Para pré-escolar ou parecer descritivo
  developmentStatus?: 'Excelente' | 'Muito Bom' | 'Bom' | 'Suficiente' | 'Em Desenvolvimento';
  resultStatus?: 'Aprovado' | 'Reprovado' | 'Recurso' | 'Transita' | 'Não Transita' | 'Pendente';
  updatedAt: string;
}

export type PaymentMethod = 'multicaixa_express' | 'tpa_multicaixa' | 'transferencia_bancaria' | 'deposito_bancario' | 'numerario';

export type FinancialCategory = 'propina' | 'matricula' | 'outros';

export interface Invoice {
  id: string;
  institutionId: string;
  studentId: string;
  studentName: string;
  studentProcessNumber: string;
  invoiceNumber: string;
  category?: FinancialCategory;
  monthReference: string;
  description: string;
  amountDueAoa: number;
  penaltyAoa: number;
  discountAoa: number;
  totalAoa: number;
  amountPaidAoa: number;
  balanceAoa: number;
  dueDate: string;
  status: 'pendente' | 'pago' | 'parcial' | 'vencido';
  multicaixaReference?: string;
  multicaixaEntity?: string;
  receiptNumber?: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  registeredByUserId?: string;
  registeredByName?: string;
  registeredByRole?: string;
}

export type FinancialNotificationType =
  | 'cobranca_pendente'
  | 'aviso_atraso'
  | 'confirmacao_matricula'
  | 'confirmacao_pagamento'
  | 'emolumento_outros'
  | 'aviso_geral';

export type FinancialNotificationTarget = 'aluno' | 'encarregado' | 'ambos';

export interface FinancialNotification {
  id: string;
  institutionId: string;
  studentId: string;
  studentName: string;
  studentProcessNumber: string;
  guardianName?: string;
  guardianPhone?: string;
  recipientTarget: FinancialNotificationTarget;
  type: FinancialNotificationType;
  category?: FinancialCategory;
  title: string;
  message: string;
  amountAoa?: number;
  invoiceId?: string;
  invoiceNumber?: string;
  multicaixaReference?: string;
  dueDate?: string;
  sentByUserId: string;
  sentByName: string;
  sentByRole: 'Tesoureiro';
  sentAt: string;
  isRead: boolean;
  readAt?: string;
}

export interface OfficialDocument {
  id: string;
  institutionId: string;
  institutionName: string;
  studentId: string;
  studentName: string;
  studentProcessNumber: string;
  documentType:
    | 'declaracao_matricula'
    | 'declaracao_notas'
    | 'certificado_habilitacoes'
    | 'boletim_trimestral'
    | 'mini_pauta'
    | 'recibo_propina';
  documentNumber: string;
  verificationCode: string;
  qrCodePayload: string;
  issueDate: string;
  issuedByName: string;
  academicYear: string;
  metadata: Record<string, any>;
}

export interface LessonPlanRequest {
  subsystemCode: EducationSubsystemCode;
  gradeLevel: string;
  subjectName: string;
  topic: string;
  subtopic?: string;
  learningObjectives?: string;
  lessonDurationMinutes: number;
  specialNeedsAdaptation?: boolean;
}

export interface LessonPlanResult {
  lessonPlanId?: string;
  subsystem: string;
  gradeLevel: string;
  subject: string;
  topic: string;
  subtopic?: string;
  generalObjectives: string[];
  specificObjectives: string[];
  didacticResources: string[];
  methodology: string;
  teachingStages: {
    stage: 'Introdução e Motivação' | 'Mediação e Assimilação' | 'Domínio e Consolidação' | 'Controlo e Avaliação';
    duration: string;
    teacherActivity: string;
    studentActivity: string;
  }[];
  evaluationRubric: string;
  homeworkTask: string;
  pedagogicalValidationNotice?: string;
}

export interface AuditLogItem {
  id: string;
  institutionId?: string;
  institutionName?: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export type AttendanceStatus =
  | 'presente'
  | 'falta_justificada'
  | 'falta_injustificada'
  | 'atraso';

export type JustificationSource = 'sistema' | 'presencial';

export type JustificationValidationStatus =
  | 'nao_solicitada'
  | 'pendente'
  | 'validada'
  | 'rejeitada';

export interface AttendanceRecord {
  id: string;
  institutionId?: string;
  studentId: string;
  studentName: string;
  studentProcessNumber?: string;
  classId: string;
  className?: string;
  subjectId?: string;
  subjectName: string;
  date: string; // YYYY-MM-DD
  month: string;
  status: AttendanceStatus;
  notes?: string;
  recordedByTeacherId?: string;
  recordedByTeacherName?: string;
  recordedAt?: string;
  justificationStatus?: JustificationValidationStatus;
  justificationSource?: JustificationSource;
  justificationReason?: string;
  justificationSubmittedAt?: string;
  justificationSubmittedBy?: string;
  justificationAttachmentName?: string;
  validatedByTeacherId?: string;
  validatedByTeacherName?: string;
  validatedAt?: string;
  validationNotes?: string;
}

export interface StudentEnrollmentPayment {
  id: string;
  studentId: string;
  studentName: string;
  studentProcessNumber: string;
  institutionId: string;
  academicYear: string;
  feeType: 'matricula_nova' | 'confirmacao_matricula';
  amountAoa: number;
  status: 'liquidado' | 'pendente' | 'isento';
  paymentDate?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  multicaixaReference?: string;
  multicaixaEntity?: string;
}

export type DigitalArchiveCategory =
  | 'bilhete_identidade'
  | 'certidao_nascimento'
  | 'certificado_habilitacoes'
  | 'boletim_anterior'
  | 'atestado_medico'
  | 'cartao_vacinas'
  | 'comprovativo_pagamento'
  | 'fotografia_passe'
  | 'declaracao_transferencia'
  | 'outro';

export type DigitalArchiveStatus = 'pendente' | 'validado' | 'rejeitado';

export interface DigitalArchiveDocument {
  id: string;
  institutionId: string;
  studentId: string;
  studentName: string;
  studentProcessNumber: string;
  classId: string;
  className: string;
  gradeLevel: string;
  category: DigitalArchiveCategory;
  title: string;
  description?: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileUrl?: string;
  storageBucket?: string;
  storagePath?: string;
  dataUrl?: string;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedByRole: UserRole;
  uploadedAt: string;
  status: DigitalArchiveStatus;
  reviewedByName?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export type AnnouncementChannel = 'super_to_schools' | 'school_to_members';

export type AnnouncementPriority = 'normal' | 'importante' | 'urgente';

export type AnnouncementCategory =
  | 'geral'
  | 'pedagogico'
  | 'financeiro'
  | 'administrativo'
  | 'urgente';

export type AnnouncementTargetGroup =
  | 'utilizadores'
  | 'professores'
  | 'alunos'
  | 'encarregados'
  | 'financeiro';

export interface Announcement {
  id: string;
  channel: AnnouncementChannel;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  createdAt: string;
  senderUserId: string;
  senderName: string;
  senderRole: UserRole;
  senderRoleLabel: string;
  senderEmail?: string;
  institutionId?: string;
  institutionName?: string;
  targetScope?: 'all_schools' | 'selected_schools';
  targetInstitutionIds?: string[];
  targetGroups?: AnnouncementTargetGroup[];
  targetClassIds?: string[];
  targetStudentIds?: string[];
  targetUserIds?: string[];
  readByUserKeys: string[];
  archived?: boolean;
}

export type PsychopedagogicalCategory =
  | 'nee_inclusao'
  | 'dificuldade_aprendizagem'
  | 'apoio_emocional'
  | 'comportamento_assiduidade'
  | 'altas_habilidades'
  | 'orientacao_vocacional';

export type PsychopedagogicalPriority = 'baixo' | 'moderado' | 'elevado' | 'critico';

export type PsychopedagogicalStatus =
  | 'em_triagem'
  | 'em_acompanhamento'
  | 'pei_activo'
  | 'encaminhado'
  | 'alta_pedagogica';

export interface PsychopedagogicalProtocol {
  id: string;
  code: string;
  title: string;
  category: PsychopedagogicalCategory;
  targetSubsystems: string[];
  description: string;
  screeningCriteria: string[];
  interventionSteps: string[];
  normativeReference: string;
  isActive: boolean;
  updatedAt: string;
}

export interface PsychopedagogicalSession {
  id: string;
  date: string;
  specialistName: string;
  sessionType:
    | 'triagem_inicial'
    | 'sessao_individual'
    | 'reuniao_familia'
    | 'observacao_turma'
    | 'revisao_pei';
  summary: string;
  recommendations: string;
  nextFollowUpDate?: string;
}

export interface PsychopedagogicalCase {
  id: string;
  caseCode: string;
  institutionId: string;
  institutionName: string;
  studentId?: string;
  studentName: string;
  studentProcessNumber?: string;
  gradeLevel: string;
  className?: string;
  category: PsychopedagogicalCategory;
  priority: PsychopedagogicalPriority;
  status: PsychopedagogicalStatus;
  referralSource: 'direccao' | 'professor' | 'encarregado' | 'super_admin';
  specialistAssigned: string;
  guardianConsent: boolean;
  guardianName?: string;
  summaryNotes: string;
  peiObjectives: string;
  protocolId?: string;
  openedAt: string;
  updatedAt: string;
  sessions: PsychopedagogicalSession[];
}


