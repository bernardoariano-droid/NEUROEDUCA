/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Portal do Aluno e Encarregado de Educação
 * Permissões: Consultar médias por trimestre, frequências às aulas, propinas e pagamento de matrícula.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Receipt,
  FileText,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Award,
  BookOpen,
  Send,
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  User,
  ExternalLink,
  QrCode,
  DollarSign,
  FolderArchive,
  XCircle,
  Bell,
  MailCheck,
  Copy
} from 'lucide-react';
import {
  Institution,
  Student,
  GradeRecord,
  Invoice,
  ClassRoom,
  UserProfile,
  UserRole,
  DigitalArchiveDocument,
  DigitalArchiveStatus,
  AttendanceRecord,
  FinancialNotification
} from '../../types';
import { formatKwanza, formatAngolaDate } from '../../utils/currency';
import { resolveAuthorizedStudentsForUser } from '../../utils/studentAccess';
import { DocumentExportBar } from '../common/DocumentExportBar';
import {
  resolveSubjectsForClass,
  computeAnnualSubjectSummary,
  evaluateAnnualCouncilDecision,
  isExamAndRecourseEligible,
  getGradeQualitativeText,
  getGradingScaleConfig,
  resolveGradeTrimestralComponents,
  formatRoundedGrade
} from '../../utils/evaluationEngine';
import { QrCodeView } from '../common/QrCodeView';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';
import { DigitalArchiveCenter } from '../Documents/DigitalArchiveCenter';

interface StudentPortalProps {
  currentInstitution: Institution;
  students: Student[];
  grades: GradeRecord[];
  invoices: Invoice[];
  classes: ClassRoom[];
  currentUser?: UserProfile | null;
  activeRole?: UserRole;
  initialTab?: 'grades' | 'attendance' | 'tuition' | 'enrollment' | 'archive';
  onSimulatePayment?: (invoiceId: string) => void;
  onOpenDocument?: (student: Student, docType: string) => void;
  digitalArchive?: DigitalArchiveDocument[];
  onAddArchiveDocument?: (doc: DigitalArchiveDocument, fileDataBase64?: string) => Promise<void> | void;
  onUpdateArchiveStatus?: (docId: string, status: DigitalArchiveStatus, reviewNotes?: string) => void;
  onDeleteArchiveDocument?: (docId: string) => void;
  attendanceRecords?: AttendanceRecord[];
  onSubmitAbsenceJustification?: (payload: {
    student: Student;
    subjectName: string;
    date: string;
    reason: string;
    recordId?: string;
  }) => void;
  financialNotifications?: FinancialNotification[];
  onMarkFinancialNotificationRead?: (notificationId: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentInstitution,
  students,
  grades,
  invoices,
  classes,
  currentUser,
  activeRole,
  initialTab = 'grades',
  onOpenDocument,
  digitalArchive = [],
  onAddArchiveDocument,
  onUpdateArchiveStatus,
  onDeleteArchiveDocument,
  attendanceRecords = [],
  onSubmitAbsenceJustification,
  financialNotifications = [],
  onMarkFinancialNotificationRead
}) => {
  // 1. Identificar estritamente apenas o(s) aluno(s) autorizado(s) da sessão
  const isGuardianRole =
    (activeRole || currentUser?.role) === 'encarregado_educacao';

  const authorizedStudents = useMemo(() => {
    return resolveAuthorizedStudentsForUser(
      students,
      currentInstitution.id,
      currentUser,
      activeRole
    );
  }, [students, currentInstitution.id, currentUser, activeRole]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    authorizedStudents[0]?.id || ''
  );

  React.useEffect(() => {
    if (authorizedStudents.length === 0) {
      if (selectedStudentId !== '') setSelectedStudentId('');
      return;
    }
    if (!authorizedStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(authorizedStudents[0].id);
    }
  }, [authorizedStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    if (authorizedStudents.length === 0) return null;
    if (isGuardianRole) {
      return (
        authorizedStudents.find((s) => s.id === selectedStudentId) ||
        authorizedStudents[0]
      );
    }
    return authorizedStudents[0];
  }, [authorizedStudents, selectedStudentId, isGuardianRole]);

  const studentClass = useMemo(() => {
    if (!selectedStudent) return undefined;
    return classes.find((c) => c.id === selectedStudent.classId);
  }, [selectedStudent, classes]);

  // Separadores Principais solicitados pelo utilizador:
  // 1. Médias das notas por trimestre
  // 2. Frequências às aulas
  // 3. Propina
  // 4. Pagamento de matrícula
  // 5. Arquivo Digital (Envio de Documentos Escolares)
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance' | 'tuition' | 'enrollment' | 'archive'>(
    initialTab
  );

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Filtro de Trimestre / Anual para as Notas (separados via filtro suspenso)
  const [selectedPeriod, setSelectedPeriod] = useState<'1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual'>(
    '1_trimestre'
  );

  // Modal de Simulação de Pagamento Multicaixa
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  // Modal de Justificação de Falta
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [justifyRecordId, setJustifyRecordId] = useState<string | undefined>(undefined);
  const [justifySubject, setJustifySubject] = useState('Língua Portuguesa');
  const [justifyDate, setJustifyDate] = useState(new Date().toISOString().split('T')[0]);
  const [justifyReason, setJustifyReason] = useState('');
  const [justifyNotice, setJustifyNotice] = useState<string | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<
    'todas' | 'faltas' | 'pendentes' | 'justificadas' | 'injustificadas'
  >('todas');

  // Modal do Boletim Oficial
  const [showBulletinModal, setShowBulletinModal] = useState(false);

  // Modal do Comprovativo de Matrícula
  const [showEnrollmentReceiptModal, setShowEnrollmentReceiptModal] = useState(false);

  const gradesExportRef = useRef<HTMLDivElement>(null);
  const bulletinRef = useRef<HTMLDivElement>(null);
  const enrollmentRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // DADOS 1: MÉDIAS DAS NOTAS POR TRIMESTRE & BOLETIM ANUAL MED
  // -------------------------------------------------------------
  const officialSubjects = useMemo(() => {
    if (!selectedStudent) return [];
    return resolveSubjectsForClass(
      selectedStudent.subsystemCode,
      selectedStudent.gradeLevel,
      selectedStudent.courseName
    );
  }, [selectedStudent]);

  const studentAllGrades = useMemo(() => {
    if (!selectedStudent) return [];
    return grades.filter((g) => g.studentId === selectedStudent.id);
  }, [selectedStudent, grades]);

  const hasExamAndRecourse = selectedStudent
    ? isExamAndRecourseEligible(selectedStudent.subsystemCode, selectedStudent.gradeLevel)
    : false;
  const scaleConfig = getGradingScaleConfig(selectedStudent?.subsystemCode);
  const passingThreshold = scaleConfig.passingThreshold;
  const recourseThreshold = scaleConfig.recourseThreshold;

  // Linhas detalhadas do trimestre seleccionado (usando o plano curricular real INIDE)
  const displaySubjectGrades = useMemo(() => {
    const activePeriod = selectedPeriod === 'anual' ? '1_trimestre' : selectedPeriod;
    const periodRecords = studentAllGrades.filter((g) => g.period === activePeriod);

    return officialSubjects.map((sub) => {
      const subGrades = studentAllGrades.filter(
        (g) =>
          g.subjectId === sub.id ||
          g.subjectName.toLowerCase() === sub.name.toLowerCase()
      );
      const rec = periodRecords.find(
        (g) =>
          g.subjectId === sub.id ||
          g.subjectName.toLowerCase() === sub.name.toLowerCase()
      );
      const comp = resolveGradeTrimestralComponents(rec);
      const trimesters = {
        '1_trimestre': resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '1_trimestre')),
        '2_trimestre': resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '2_trimestre')),
        '3_trimestre': resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '3_trimestre'))
      };
      return {
        id: sub.id,
        name: sub.name,
        shortName: sub.shortName,
        weeklyHours: sub.weeklyHours,
        ac1: comp.ac1,
        ac2: comp.ac2,
        ac3: comp.ac3,
        mac: comp.mac,
        npt: comp.npt,
        mt: comp.mt,
        trimesters,
        teacher: studentClass?.classDirectorName || 'Docente da Disciplina'
      };
    });
  }, [officialSubjects, studentAllGrades, selectedPeriod, studentClass?.classDirectorName]);

  // Linhas consolidadas anuais (1.º, 2.º, 3.º Trimestres + CAP + EN/REC quando elegível + MF)
  const annualBulletinRows = useMemo(() => {
    if (!selectedStudent) return [];
    return officialSubjects.map((sub) => {
      const subGrades = studentAllGrades.filter(
        (g) =>
          g.subjectId === sub.id ||
          g.subjectName.toLowerCase() === sub.name.toLowerCase()
      );
      const summary = computeAnnualSubjectSummary(
        subGrades,
        selectedStudent.subsystemCode,
        hasExamAndRecourse
      );
      const trimesters = {
        '1_trimestre': resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '1_trimestre')),
        '2_trimestre': resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '2_trimestre')),
        '3_trimestre': resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '3_trimestre'))
      };
      return {
        subject: sub,
        summary,
        trimesters
      };
    });
  }, [officialSubjects, studentAllGrades, selectedStudent, hasExamAndRecourse]);

  const annualCouncilDecision = useMemo(() => {
    if (!selectedStudent) {
      return {
        overallAverage: undefined,
        positivesCount: 0,
        negativesCount: 0,
        evaluatedCount: 0,
        totalSubjects: 0,
        decision: 'Em Curso' as const
      };
    }
    return evaluateAnnualCouncilDecision(
      annualBulletinRows.map((r) => ({
        mf: r.summary.mf,
        isTerminalExam: r.subject.isTerminalExam
      })),
      hasExamAndRecourse,
      selectedStudent.subsystemCode
    );
  }, [annualBulletinRows, selectedStudent, hasExamAndRecourse]);

  const periodFilterOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: '1_trimestre',
        label: '1.º Trimestre Lectivo',
        description: 'AC1, AC2, AC3, MAC, NPT e MT1',
        group: 'Trimestres Separados',
        badge: '1.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: '2_trimestre',
        label: '2.º Trimestre Lectivo',
        description: 'AC1, AC2, AC3, MAC, NPT e MT2',
        group: 'Trimestres Separados',
        badge: '2.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: '3_trimestre',
        label: '3.º Trimestre Lectivo',
        description: 'AC1, AC2, AC3, MAC, NPT e MT3',
        group: 'Trimestres Separados',
        badge: '3.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: 'anual',
        label: hasExamAndRecourse
          ? 'Boletim Anual Consolidado (+ EN/REC)'
          : 'Boletim Anual Consolidado (1.º–3.º Trim.)',
        description: '3 Trimestres separados + CAP e Média Final',
        group: 'Consolidação Anual',
        badge: hasExamAndRecourse ? 'EN / REC' : 'Anual',
        badgeTone: hasExamAndRecourse ? 'amber' : 'emerald'
      }
    ],
    [hasExamAndRecourse]
  );

  const generalAverage = useMemo(() => {
    const evaluated = displaySubjectGrades.filter((s) => s.mt !== undefined);
    if (evaluated.length === 0) return 0;
    const sum = evaluated.reduce((acc, curr) => acc + (curr.mt || 0), 0);
    return Number((sum / evaluated.length).toFixed(1));
  }, [displaySubjectGrades]);

  const approvedSubjectsCount = useMemo(() => {
    return displaySubjectGrades.filter((s) => s.mt !== undefined && s.mt >= passingThreshold).length;
  }, [displaySubjectGrades, passingThreshold]);

  const evaluatedSubjectsCount = useMemo(() => {
    return displaySubjectGrades.filter((s) => s.mt !== undefined).length;
  }, [displaySubjectGrades]);

  // -------------------------------------------------------------
  // DADOS 2: FREQUÊNCIAS ÀS AULAS (REGISTO REAL DO PROFESSOR)
  // -------------------------------------------------------------
  const studentAttendanceRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return attendanceRecords
      .filter((r) => r.studentId === selectedStudent.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, selectedStudent]);

  const filteredStudentAttendance = useMemo(() => {
    return studentAttendanceRecords.filter((r) => {
      if (attendanceFilter === 'faltas') {
        return r.status === 'falta_justificada' || r.status === 'falta_injustificada';
      }
      if (attendanceFilter === 'pendentes') {
        return r.justificationStatus === 'pendente';
      }
      if (attendanceFilter === 'justificadas') {
        return r.status === 'falta_justificada';
      }
      if (attendanceFilter === 'injustificadas') {
        return r.status === 'falta_injustificada';
      }
      return true;
    });
  }, [studentAttendanceRecords, attendanceFilter]);

  const attendanceSummary = useMemo(() => {
    const totalClasses = studentAttendanceRecords.length;
    const presences = studentAttendanceRecords.filter((r) => r.status === 'presente').length;
    const delays = studentAttendanceRecords.filter((r) => r.status === 'atraso').length;
    const absencesJustified = studentAttendanceRecords.filter(
      (r) => r.status === 'falta_justificada'
    ).length;
    const absencesUnjustified = studentAttendanceRecords.filter(
      (r) => r.status === 'falta_injustificada'
    ).length;
    const pendingJustifications = studentAttendanceRecords.filter(
      (r) => r.justificationStatus === 'pendente'
    ).length;
    const attendanceRate =
      totalClasses > 0
        ? Number((((presences + delays) / totalClasses) * 100).toFixed(1))
        : 100;

    return {
      totalClasses,
      presences,
      delays,
      absencesJustified,
      absencesUnjustified,
      pendingJustifications,
      attendanceRate
    };
  }, [studentAttendanceRecords]);

  const monthlyAttendanceData = useMemo(() => {
    const grouped = new Map<
      string,
      { month: string; classes: number; presences: number; justified: number; unjustified: number }
    >();
    studentAttendanceRecords.forEach((r) => {
      const key = r.month || 'Ano Lectivo';
      const curr = grouped.get(key) || {
        month: key,
        classes: 0,
        presences: 0,
        justified: 0,
        unjustified: 0
      };
      curr.classes += 1;
      if (r.status === 'presente' || r.status === 'atraso') curr.presences += 1;
      if (r.status === 'falta_justificada') curr.justified += 1;
      if (r.status === 'falta_injustificada') curr.unjustified += 1;
      grouped.set(key, curr);
    });
    return Array.from(grouped.values()).map((item) => ({
      ...item,
      rate: item.classes > 0 ? Number(((item.presences / item.classes) * 100).toFixed(1)) : 100
    }));
  }, [studentAttendanceRecords]);

  // -------------------------------------------------------------
  // DADOS 3: PROPINAS E MENSALIDADES (KWANZA AOA)
  // -------------------------------------------------------------
  const studentInvoices = useMemo(() => {
    if (!selectedStudent) return [];
    return invoices.filter((inv) => inv.studentId === selectedStudent.id);
  }, [selectedStudent, invoices]);

  // Se não existirem facturas geradas, criamos o calendário de propinas modelo
  const displayInvoices = useMemo(() => {
    if (studentInvoices.length > 0) return studentInvoices;

    const baseAmount = selectedStudent?.subsystemCode === 'primario_geral' ? 35000 : 45000;
    return [
      {
        id: `inv-sim-1`,
        institutionId: currentInstitution.id,
        studentId: selectedStudent?.id || 'stu-01',
        studentName: selectedStudent?.fullName || 'Aluno',
        studentProcessNumber: selectedStudent?.processNumber || '2026/0148',
        invoiceNumber: `FT-${currentInstitution.acronym || 'ESC'}-2026/0891`,
        monthReference: 'Setembro/2026',
        description: `Propina Mensal - ${selectedStudent?.gradeLevel || 'Ensino Regular'}`,
        amountDueAoa: baseAmount,
        penaltyAoa: 0,
        discountAoa: 0,
        totalAoa: baseAmount,
        amountPaidAoa: baseAmount,
        balanceAoa: 0,
        dueDate: '2026-09-10',
        status: 'pago' as const,
        multicaixaReference: '482 910 101',
        multicaixaEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142',
        paidAt: '2026-09-08'
      },
      {
        id: `inv-sim-2`,
        institutionId: currentInstitution.id,
        studentId: selectedStudent?.id || 'stu-01',
        studentName: selectedStudent?.fullName || 'Aluno',
        studentProcessNumber: selectedStudent?.processNumber || '2026/0148',
        invoiceNumber: `FT-${currentInstitution.acronym || 'ESC'}-2026/0942`,
        monthReference: 'Outubro/2026',
        description: `Propina Mensal - ${selectedStudent?.gradeLevel || 'Ensino Regular'}`,
        amountDueAoa: baseAmount,
        penaltyAoa: 0,
        discountAoa: 0,
        totalAoa: baseAmount,
        amountPaidAoa: baseAmount,
        balanceAoa: 0,
        dueDate: '2026-10-10',
        status: 'pago' as const,
        multicaixaReference: '482 910 102',
        multicaixaEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142',
        paidAt: '2026-10-09'
      },
      {
        id: `inv-sim-3`,
        institutionId: currentInstitution.id,
        studentId: selectedStudent?.id || 'stu-01',
        studentName: selectedStudent?.fullName || 'Aluno',
        studentProcessNumber: selectedStudent?.processNumber || '2026/0148',
        invoiceNumber: `FT-${currentInstitution.acronym || 'ESC'}-2026/1020`,
        monthReference: 'Novembro/2026',
        description: `Propina Mensal - ${selectedStudent?.gradeLevel || 'Ensino Regular'}`,
        amountDueAoa: baseAmount,
        penaltyAoa: 0,
        discountAoa: 0,
        totalAoa: baseAmount,
        amountPaidAoa: 0,
        balanceAoa: baseAmount,
        dueDate: '2026-11-10',
        status: 'pendente' as const,
        multicaixaReference: '482 910 103',
        multicaixaEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142'
      },
      {
        id: `inv-sim-4`,
        institutionId: currentInstitution.id,
        studentId: selectedStudent?.id || 'stu-01',
        studentName: selectedStudent?.fullName || 'Aluno',
        studentProcessNumber: selectedStudent?.processNumber || '2026/0148',
        invoiceNumber: `FT-${currentInstitution.acronym || 'ESC'}-2026/1154`,
        monthReference: 'Dezembro/2026',
        description: `Propina Mensal - ${selectedStudent?.gradeLevel || 'Ensino Regular'}`,
        amountDueAoa: baseAmount,
        penaltyAoa: 0,
        discountAoa: 0,
        totalAoa: baseAmount,
        amountPaidAoa: 0,
        balanceAoa: baseAmount,
        dueDate: '2026-12-10',
        status: 'pendente' as const,
        multicaixaReference: '482 910 104',
        multicaixaEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142'
      }
    ];
  }, [studentInvoices, selectedStudent, currentInstitution]);

  const totalTuitionPaid = useMemo(() => {
    return displayInvoices
      .filter((inv) => inv.status === 'pago')
      .reduce((acc, curr) => acc + curr.amountPaidAoa, 0);
  }, [displayInvoices]);

  const totalTuitionPending = useMemo(() => {
    return displayInvoices
      .filter((inv) => inv.status !== 'pago')
      .reduce((acc, curr) => acc + curr.balanceAoa, 0);
  }, [displayInvoices]);

  const studentFinancialNotifications = useMemo(() => {
    if (!selectedStudent) return [];
    return financialNotifications
      .filter(
        (n) =>
          n.institutionId === currentInstitution.id &&
          n.studentId === selectedStudent.id
      )
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [financialNotifications, currentInstitution.id, selectedStudent]);

  const unreadFinancialNotifications = useMemo(
    () => studentFinancialNotifications.filter((n) => !n.isRead),
    [studentFinancialNotifications]
  );

  // -------------------------------------------------------------
  // DADOS 4: PAGAMENTO DE MATRÍCULA E CONFIRMAÇÃO
  // -------------------------------------------------------------
  const enrollmentFeeData = useMemo(() => {
    const feeAmount = selectedStudent?.enrollmentAmountAoa || 15000;
    const isPaid = Boolean(selectedStudent?.enrollmentFeePaid);
    const receiptNum = isPaid
      ? selectedStudent?.enrollmentReceiptNumber ||
        `REC-MAT-${currentInstitution.acronym || 'ESC'}-2026/${
          selectedStudent?.processNumber.replace('/', '') || '0148'
        }`
      : 'Aguardando Registo na Tesouraria';
    const paymentDate = isPaid ? '2026-08-20' : 'Pendente';
    const validationCode = isPaid
      ? `NEURO-MAT-${selectedStudent?.processNumber?.replace(/[^0-9]/g, '') || '202601'}`
      : 'PENDENTE-TESOURARIA';

    return {
      feeAmount,
      isPaid,
      receiptNum,
      paymentDate,
      validationCode,
      academicYear: selectedStudent?.academicYear || '2026/2027',
      feeType: 'Confirmação e Matrícula Anual',
      paymentMethod: isPaid
        ? 'Multicaixa Express / Tesouraria'
        : 'Aguardando Liquidação na Tesouraria',
      bankEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142',
      multicaixaRef: '482 910 001'
    };
  }, [selectedStudent, currentInstitution]);

  const [copiedRefNotice, setCopiedRefNotice] = useState(false);

  const handleCopyMulticaixaRef = (refValue: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(refValue.replace(/\s+/g, '')).catch(() => {});
    }
    setCopiedRefNotice(true);
    setTimeout(() => setCopiedRefNotice(false), 3000);
  };

  const handleSendJustification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justifyReason.trim() || !selectedStudent) return;

    if (onSubmitAbsenceJustification) {
      onSubmitAbsenceJustification({
        student: selectedStudent,
        subjectName: justifySubject,
        date: justifyDate,
        reason: justifyReason.trim(),
        recordId: justifyRecordId
      });
    }

    setShowJustifyModal(false);
    setJustifyRecordId(undefined);
    setJustifyNotice(
      `Justificação da falta em ${justifySubject} (${justifyDate}) enviada ao Professor no sistema. Estado: Aguardando Validação.`
    );
    setTimeout(() => setJustifyNotice(null), 5000);
    setJustifyReason('');
  };

  if (!selectedStudent) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
        <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">
          Nenhum Processo de Estudante Vinculado a Esta Conta
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Por razões de segurança e privacidade, apenas é possível consultar os dados do próprio aluno ou educando vinculado. Solicite à Secretaria da escola a associação do seu e-mail ({currentUser?.email || 'da conta'}) à ficha de matrícula.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL (Tema NEUROEDUCA Emerald) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight flex items-center space-x-2">
            <span>Portal do Aluno &amp; Encarregado</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Área Exclusiva de Acompanhamento Académico e Financeiro · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        {/* Selector exclusivo para Encarregado com mais de um educando vinculado */}
        {isGuardianRole && authorizedStudents.length > 1 && (
          <div className="flex items-center space-x-2.5 bg-white px-3.5 py-2 rounded-xl border border-[#cde6d5] shadow-2xs self-start sm:self-auto">
            <div className="w-7 h-7 rounded-full bg-[#eaf6ee] text-[#067836] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#067836] font-bold uppercase tracking-wider">Educando em Consulta:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {authorizedStudents.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.fullName} ({stu.processNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Alertas de Notificação */}
      {paymentSuccessNotice && (
        <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
          <span>{paymentSuccessNotice}</span>
        </div>
      )}

      {justifyNotice && (
        <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in">
          <Send className="w-4 h-4 text-[#067836] shrink-0" />
          <span>{justifyNotice}</span>
        </div>
      )}

      {/* Aviso de Notificações Financeiras Não Lidas da Tesouraria */}
      {unreadFinancialNotifications.length > 0 && (
        <div className="bg-[#eaf6ee] border border-[#b8dfc5] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-[#064e26]">
            <Bell className="w-4 h-4 text-[#067836] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">
                {unreadFinancialNotifications.length} notificação(ões) da Tesouraria por ler
              </strong>
              <span className="text-[#055827]">
                {unreadFinancialNotifications[0].title} — {unreadFinancialNotifications[0].message}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('tuition')}
              className="bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
            >
              Ver Notificações
            </button>
          </div>
        </div>
      )}

      {/* 2. CARTÃO DE IDENTIFICAÇÃO DO ESTUDANTE / ENCARREGADO */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#015a29] via-[#067836] to-[#149a45] px-5 py-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center font-display font-bold text-xl text-white shrink-0 shadow-inner">
              {selectedStudent.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base sm:text-lg font-bold text-white">
                  {selectedStudent.fullName}
                </span>
                <span className="text-[11px] font-semibold bg-white/15 px-2 py-0.5 rounded-md text-emerald-100">
                  {selectedStudent.academicStatus === 'matriculado' ? 'Matriculado' : 'Confirmado'}
                </span>
              </div>
              <div className="text-xs text-emerald-100 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                <span className="font-mono">Proc. {selectedStudent.processNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedStudent.className}</span>
                <span aria-hidden="true">·</span>
                <span>Turno {selectedStudent.shift}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{selectedStudent.academicYear}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('archive')}
              className="inline-flex items-center gap-1.5 bg-white text-[#067836] hover:bg-[#eaf6ee] text-xs font-bold px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Enviar Documentos</span>
            </button>
            <button
              onClick={() => setShowBulletinModal(true)}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-white/25 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Boletim</span>
            </button>
            <button
              onClick={() => setShowEnrollmentReceiptModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#24b450] hover:bg-[#1e9e44] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Comprovativo</span>
            </button>
          </div>
        </div>

        {/* Ficha Rápida do Encarregado e Contactos */}
        <div className="px-5 py-2.5 bg-[#f7fbf8] border-t border-[#dce7df] flex flex-wrap items-center justify-between text-xs text-slate-600 gap-y-1">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-slate-700">Encarregado(a):</strong> {selectedStudent.guardianName} ({selectedStudent.guardianRelationship})
            </span>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#067836]" />
              <span className="tabular-nums">{selectedStudent.guardianPhone}</span>
            </span>
          </div>
          <div className="text-xs text-slate-500">
            <strong className="text-slate-700">B.I.:</strong> <span className="font-mono">{selectedStudent.identityCardNumber || '008942150LA042'}</span> · {selectedStudent.birthProvince}
          </div>
        </div>
      </div>

      {/* 3. CARTÕES KPI DO ESTUDANTE (ÍCONES CIRCULARES DO DESIGN SYSTEM) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('grades')}
          className="bg-white hover:border-[#8cd0a6] rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] text-left flex items-center gap-3.5 transition cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">
              {selectedPeriod === 'anual'
                ? 'Média Anual'
                : `Média ${selectedPeriod === '1_trimestre' ? '1.º Trim.' : selectedPeriod === '2_trimestre' ? '2.º Trim.' : '3.º Trim.'}`}
            </span>
            <div className="font-display text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              {selectedPeriod === 'anual'
                ? annualCouncilDecision.overallAverage !== undefined
                  ? annualCouncilDecision.overallAverage.toFixed(1)
                  : '--'
                : generalAverage}{' '}
              <span className="text-xs font-normal text-slate-400">/ {scaleConfig.maxScale}</span>
            </div>
            <span className="text-[11px] text-[#067836] font-semibold block mt-0.5">
              Consultar notas
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className="bg-white hover:border-[#8cd0a6] rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] text-left flex items-center gap-3.5 transition cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Assiduidade Escolar</span>
            <div className="font-display text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              {attendanceSummary.attendanceRate}%
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 tabular-nums truncate">
              {attendanceSummary.presences} presenças ·{' '}
              {attendanceSummary.absencesJustified + attendanceSummary.absencesUnjustified} faltas
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tuition')}
          className="bg-white hover:border-[#8cd0a6] rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] text-left flex items-center gap-3.5 transition cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Propinas Liquidadas</span>
            <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5 truncate">
              {formatKwanza(totalTuitionPaid)}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              {totalTuitionPending > 0
                ? `${formatKwanza(totalTuitionPending)} a pagar`
                : 'Mensalidades em dia'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enrollment')}
          className="bg-white hover:border-[#8cd0a6] rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] text-left flex items-center gap-3.5 transition cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Matrícula 2026/2027</span>
            <div className="font-display text-lg sm:text-xl font-extrabold text-[#067836] mt-0.5">
              {enrollmentFeeData.isPaid ? 'Confirmada' : 'Pendente'}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Ver comprovativo oficial</span>
          </div>
        </button>
      </div>

      {/* 4. SEPARADORES DE NAVEGAÇÃO DOS 5 MÓDULOS DE CONSULTA */}
      <div className="bg-white rounded-2xl border border-[#dce7df] p-2 shadow-2xs">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'grades'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>1. Médias das Notas por Trimestre</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. Frequências às Aulas</span>
          </button>

          <button
            onClick={() => setActiveTab('tuition')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'tuition'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>3. Propinas &amp; Situação Financeira</span>
            {unreadFinancialNotifications.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadFinancialNotifications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('enrollment')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'enrollment'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>4. Pagamento de Matrícula</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'archive'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>5. Arquivo Digital (Enviar Docs)</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          MÓDULO 1: MÉDIAS DAS NOTAS POR TRIMESTRE & BOLETIM MED
          ========================================================= */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          {/* Filtro Suspenso por Período / Trimestres Separados + Exportação PDF A4/A5 */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-end justify-between gap-3 print:hidden">
            <div className="w-full lg:w-96">
              <FunctionalDropdownFilter
                label="Filtrar Período Lectivo (Trimestres Separados)"
                value={selectedPeriod}
                onChange={(val) => setSelectedPeriod(val as any)}
                options={periodFilterOptions}
                icon={<Calendar className="w-4 h-4 text-[#067836]" />}
                placeholder="Seleccionar trimestre..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 text-xs">
              <span className="text-[#055827] font-semibold bg-[#eaf6ee] border border-[#cde6d5] px-3 py-2 rounded-xl">
                {selectedPeriod !== 'anual'
                  ? `${approvedSubjectsCount} de ${evaluatedSubjectsCount || displaySubjectGrades.length} Positivas (≥ ${passingThreshold.toFixed(1)} v.)`
                  : `Média Anual: ${annualCouncilDecision.overallAverage !== undefined ? `${annualCouncilDecision.overallAverage.toFixed(1)} v.` : '--'} · ${annualCouncilDecision.decision}`}
              </span>

              <DocumentExportBar
                targetRef={gradesExportRef}
                filename={`Notas_${selectedPeriod}_${selectedStudent.processNumber}`}
                documentTitle={`Notas ${selectedPeriod === 'anual' ? 'Anual' : selectedPeriod.replace('_trimestre', 'º Trimestre')} - ${selectedStudent.fullName}`}
                defaultFormat="A4"
                defaultOrientation="portrait"
                compact
              />

              <button
                onClick={() => setShowBulletinModal(true)}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold px-3.5 py-2 rounded-xl shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Boletim Oficial MED</span>
              </button>
            </div>
          </div>

          <div ref={gradesExportRef} className="official-document-sheet bg-white p-4 rounded border border-slate-300 space-y-4">
            {/* Cabeçalho Oficial Centralizado e Editável */}
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
              <OfficialDocumentHeader
                institution={currentInstitution}
                insigniaClassName="h-12 w-auto mx-auto mb-1"
                extraMeta={
                  <div className="pt-1 space-y-0.5">
                    <div className="text-xs font-bold uppercase">
                      {selectedPeriod === 'anual'
                        ? 'PAUTA INDIVIDUAL CONSOLIDADA & TRIMESTRES SEPARADOS'
                        : `MINI-PAUTA INDIVIDUAL · ${selectedPeriod.replace('_trimestre', '.º TRIMESTRE').toUpperCase()}`}
                    </div>
                    <div className="text-xs">
                      Aluno(a): <strong>{selectedStudent.fullName}</strong> · Proc.: <strong>{selectedStudent.processNumber}</strong> · {selectedStudent.gradeLevel} ({selectedStudent.className})
                    </div>
                  </div>
                }
              />
            </div>

            {/* Quadro da Pauta (MT1, MT2, MT3, EXAME(EN), RECURSO(REC), MFD) SEMPRE visível e sincronizado com as Mini-Pautas */}
            <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {hasExamAndRecourse
                    ? `RESUMO DA PAUTA (${selectedStudent.academicYear}) · MT1, MT2, MT3, EXAME (EN), RECURSO (REC) E MFD`
                    : `RESUMO DA PAUTA (${selectedStudent.academicYear}) · MT1, MT2, MT3 E MFD`}
                </span>
                <span className={`text-xs font-bold ${annualCouncilDecision.decision === 'Transita' ? 'text-black' : annualCouncilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>
                  Deliberação: {annualCouncilDecision.decision}
                </span>
              </div>

              <div className="md:hidden bg-blue-50/80 px-3 py-1.5 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800 print:hidden">
                <span>Deslize horizontalmente para ver MT1, MT2, MT3 e a MFD</span>
                <span className="font-bold">↔</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px] tabular-nums">
                  <thead>
                    <tr className="bg-white text-slate-600 uppercase font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Disciplina Curricular (INIDE)</th>
                      <th className={`py-3 px-3 text-center ${selectedPeriod === '1_trimestre' ? 'bg-emerald-50 text-[#055827]' : ''}`}>MT1</th>
                      <th className={`py-3 px-3 text-center ${selectedPeriod === '2_trimestre' ? 'bg-emerald-50 text-[#055827]' : ''}`}>MT2</th>
                      <th className={`py-3 px-3 text-center ${selectedPeriod === '3_trimestre' ? 'bg-emerald-50 text-[#055827]' : ''}`}>MT3</th>
                      {hasExamAndRecourse && (
                        <>
                          <th className="py-3 px-3 text-center bg-sky-50/70 text-sky-900">EXAME (EN)</th>
                          <th className="py-3 px-3 text-center bg-amber-50/70 text-amber-900">RECURSO (REC)</th>
                        </>
                      )}
                      <th className="py-3 px-3 text-center bg-sky-50 font-black text-black">MFD</th>
                      <th className="py-3 px-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {annualBulletinRows.map(({ subject, summary }) => (
                      <tr key={`pauta-${subject.id}`} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{subject.name}</td>
                        <td className={`py-3 px-3 text-center font-mono font-bold ${selectedPeriod === '1_trimestre' ? 'bg-emerald-50/40 ' : ''}${summary.mt1 === undefined ? 'text-slate-400 font-normal' : summary.mt1 >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                          {formatRoundedGrade(summary.mt1)}
                        </td>
                        <td className={`py-3 px-3 text-center font-mono font-bold ${selectedPeriod === '2_trimestre' ? 'bg-emerald-50/40 ' : ''}${summary.mt2 === undefined ? 'text-slate-400 font-normal' : summary.mt2 >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                          {formatRoundedGrade(summary.mt2)}
                        </td>
                        <td className={`py-3 px-3 text-center font-mono font-bold ${selectedPeriod === '3_trimestre' ? 'bg-emerald-50/40 ' : ''}${summary.mt3 === undefined ? 'text-slate-400 font-normal' : summary.mt3 >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                          {formatRoundedGrade(summary.mt3)}
                        </td>
                        {hasExamAndRecourse && (
                          <>
                            <td className={`py-3 px-3 text-center font-mono font-bold bg-sky-50/30 ${summary.en === undefined ? 'text-slate-400 font-normal' : summary.en >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                              {summary.en !== undefined ? summary.en.toFixed(1) : '--'}
                            </td>
                            <td className={`py-3 px-3 text-center font-mono font-bold bg-amber-50/30 ${summary.rec === undefined ? 'text-slate-400 font-normal' : summary.rec >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                              {summary.rec !== undefined ? summary.rec.toFixed(1) : '--'}
                            </td>
                          </>
                        )}
                        <td className={`py-3 px-3 text-center font-mono font-black text-sm bg-sky-50/50 ${summary.mf === undefined ? 'text-slate-400 font-normal' : summary.mf >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                          {formatRoundedGrade(summary.mf)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[11px]">
                          <span className={summary.mf === undefined ? 'text-slate-400 font-normal' : summary.isApproved ? 'text-black' : summary.needsRecourse ? 'text-amber-700' : 'text-red-600'}>
                            {summary.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={hasExamAndRecourse ? 6 : 4} className="py-3 px-4 uppercase text-right">
                        Média Geral (MFD) / Deliberação Final:
                      </td>
                      <td className={`py-3 px-3 text-center font-black text-base font-mono ${annualCouncilDecision.overallAverage === undefined ? 'text-slate-400' : annualCouncilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                        {annualCouncilDecision.overallAverage !== undefined ? annualCouncilDecision.overallAverage.toFixed(1) : '--'}
                      </td>
                      <td className={`py-3 px-3 text-center font-black uppercase text-xs ${annualCouncilDecision.decision === 'Transita' ? 'text-black' : annualCouncilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>
                        {annualCouncilDecision.decision}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedPeriod !== 'anual' ? (
              /* Detalhe da Mini-Pauta do Trimestre Seleccionado (AC1, AC2, AC3, MAC, NPT e MT) */
              <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    DETALHE DA MINI-PAUTA · {selectedPeriod.replace('_trimestre', '.º TRIMESTRE').toUpperCase()} · MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Escala MED: {scaleConfig.scaleLabel} (Mín. {passingThreshold.toFixed(1)} Val.)
                  </span>
                </div>

                <div className="md:hidden bg-blue-50/80 px-3 py-1.5 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800 print:hidden">
                  <span>Deslize horizontalmente para ver todas as notas</span>
                  <span className="font-bold">↔</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[780px] tabular-nums">
                    <thead>
                      <tr className="bg-white text-slate-500 uppercase font-bold border-b border-slate-200">
                        <th className="py-3 px-4">Disciplina Curricular (INIDE)</th>
                        <th className="py-3 px-3 text-center">AC1</th>
                        <th className="py-3 px-3 text-center">AC2</th>
                        <th className="py-3 px-3 text-center">AC3</th>
                        <th className="py-3 px-3 text-center bg-sky-50/70 text-sky-900">MAC</th>
                        <th className="py-3 px-3 text-center">NPT</th>
                        <th className="py-3 px-3 text-center font-extrabold text-black bg-slate-50">MT (Média)</th>
                        <th className="py-3 px-3 text-center">Situação MED</th>
                        <th className="py-3 px-4">Docente Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {displaySubjectGrades.map((sub) => {
                        const hasGrade = sub.mt !== undefined;
                        const isPositive = hasGrade && (sub.mt || 0) >= passingThreshold;
                        const isRecourse = hasGrade && !isPositive && (sub.mt || 0) >= recourseThreshold;
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {sub.name}
                            </td>
                            <td className={`py-3 px-3 text-center font-mono ${sub.ac1 === undefined ? 'text-slate-400' : sub.ac1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>
                              {sub.ac1 !== undefined ? sub.ac1.toFixed(1) : '--'}
                            </td>
                            <td className={`py-3 px-3 text-center font-mono ${sub.ac2 === undefined ? 'text-slate-400' : sub.ac2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>
                              {sub.ac2 !== undefined ? sub.ac2.toFixed(1) : '--'}
                            </td>
                            <td className={`py-3 px-3 text-center font-mono ${sub.ac3 === undefined ? 'text-slate-400' : sub.ac3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>
                              {sub.ac3 !== undefined ? sub.ac3.toFixed(1) : '--'}
                            </td>
                            <td className={`py-3 px-3 text-center font-mono font-bold bg-sky-50/40 ${sub.mac === undefined ? 'text-slate-400 font-normal' : sub.mac < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                              {sub.mac !== undefined ? sub.mac.toFixed(1) : '--'}
                            </td>
                            <td className={`py-3 px-3 text-center font-mono ${sub.npt === undefined ? 'text-slate-400' : sub.npt < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>
                              {sub.npt !== undefined ? sub.npt.toFixed(1) : '--'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-sm bg-slate-50">
                              {hasGrade ? (
                                <span className={isPositive ? 'text-black' : 'text-red-600'}>
                                  {formatRoundedGrade(sub.mt)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">--</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-[11px]">
                              {!hasGrade ? (
                                <span className="text-slate-400 font-normal">Aguardando Lançamento</span>
                              ) : isPositive ? (
                                <span className="text-black">Positiva (Transita)</span>
                              ) : isRecourse ? (
                                <span className="text-amber-700">Recurso</span>
                              ) : (
                                <span className="text-red-600">Negativa</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {sub.teacher}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                        <td className="py-3 px-4 uppercase text-slate-900 font-black">
                          MÉDIA GERAL DO TRIMESTRE
                        </td>
                        <td colSpan={5} className="py-3 px-4 text-center text-slate-500 font-normal">
                          Média Aritmética das Disciplinas Avaliadas ({scaleConfig.scaleLabel})
                        </td>
                        <td className={`py-3 px-3 text-center font-black text-base font-mono ${evaluatedSubjectsCount === 0 ? 'text-slate-400' : generalAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                          {evaluatedSubjectsCount > 0 ? generalAverage.toFixed(1) : '--'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {evaluatedSubjectsCount > 0 ? (
                            <span className={generalAverage >= passingThreshold ? 'text-black' : 'text-red-600'}>
                              {generalAverage >= passingThreshold ? 'Aproveitamento Positivo' : 'Atenção Pedagógica'}
                            </span>
                          ) : (
                            <span className="text-slate-400">Em Curso</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-slate-500">
                          Conforme normas INIDE / MED
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* Trimestres Separados (AC1, AC2, AC3, MAC, NPT e MT) */
              <div className="space-y-4">

                {/* 3 Trimestres Separados (cada um com AC1, AC2, AC3, MAC, NPT e MT) */}
                <div className="grid grid-cols-1 gap-4">
                  {(['1_trimestre', '2_trimestre', '3_trimestre'] as const).map((trimKey) => {
                    const trimLabel = trimKey.replace('_trimestre', '.º Trimestre Lectivo');
                    return (
                      <div key={trimKey} className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase text-slate-800">{trimLabel}</span>
                          <span className="text-[11px] font-mono text-slate-500">AC1 · AC2 · AC3 · MAC · NPT · MT</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse min-w-[660px] tabular-nums">
                            <thead>
                              <tr className="bg-white text-slate-500 uppercase font-bold border-b border-slate-200">
                                <th className="py-2 px-4">Disciplina</th>
                                <th className="py-2 px-3 text-center">AC1</th>
                                <th className="py-2 px-3 text-center">AC2</th>
                                <th className="py-2 px-3 text-center">AC3</th>
                                <th className="py-2 px-3 text-center bg-sky-50/60">MAC</th>
                                <th className="py-2 px-3 text-center">NPT</th>
                                <th className="py-2 px-3 text-center bg-slate-50 font-black text-black">MT</th>
                                <th className="py-2 px-3 text-center">Situação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {annualBulletinRows.map(({ subject, trimesters }) => {
                                const t = trimesters[trimKey];
                                return (
                                  <tr key={subject.id}>
                                    <td className="py-2 px-4 font-bold text-slate-900">{subject.name}</td>
                                    <td className={`py-2 px-3 text-center font-mono ${t.ac1 === undefined ? 'text-slate-400' : t.ac1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac1 !== undefined ? t.ac1.toFixed(1) : '--'}</td>
                                    <td className={`py-2 px-3 text-center font-mono ${t.ac2 === undefined ? 'text-slate-400' : t.ac2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac2 !== undefined ? t.ac2.toFixed(1) : '--'}</td>
                                    <td className={`py-2 px-3 text-center font-mono ${t.ac3 === undefined ? 'text-slate-400' : t.ac3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac3 !== undefined ? t.ac3.toFixed(1) : '--'}</td>
                                    <td className={`py-2 px-3 text-center font-mono font-bold bg-sky-50/40 ${t.mac === undefined ? 'text-slate-400 font-normal' : t.mac < passingThreshold ? 'text-red-600' : 'text-black'}`}>{t.mac !== undefined ? t.mac.toFixed(1) : '--'}</td>
                                    <td className={`py-2 px-3 text-center font-mono ${t.npt === undefined ? 'text-slate-400' : t.npt < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.npt !== undefined ? t.npt.toFixed(1) : '--'}</td>
                                    <td className={`py-2 px-3 text-center font-mono font-black bg-slate-50 ${t.mt === undefined ? 'text-slate-400 font-normal' : t.mt < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                                      {formatRoundedGrade(t.mt)}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold text-[11px]">
                                      {t.mt === undefined ? (
                                        <span className="text-slate-400 font-normal">Pendente</span>
                                      ) : t.mt >= passingThreshold ? (
                                        <span className="text-black">Positiva</span>
                                      ) : t.mt >= recourseThreshold ? (
                                        <span className="text-amber-700">Recurso</span>
                                      ) : (
                                        <span className="text-red-600">Negativa</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MÓDULO 2: FREQUÊNCIAS ÀS AULAS & STATUS DAS FALTAS
          ========================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#064e26] uppercase flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[#067836]" />
                <span>Frequência Diária e Status das Faltas</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consulte as presenças registadas pelos professores, o estado de validação das suas faltas e envie justificações directamente no sistema.
              </p>
            </div>

            <button
              onClick={() => {
                setJustifyRecordId(undefined);
                setJustifySubject(displaySubjectGrades[0]?.name || 'Língua Portuguesa');
                setJustifyDate(new Date().toISOString().split('T')[0]);
                setShowJustifyModal(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-2xs transition cursor-pointer self-start md:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Justificação ao Professor</span>
            </button>
          </div>

          {/* Grelha de Indicadores de Faltas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-[#dce7df] shadow-2xs">
              <span className="text-[11px] text-slate-500 block font-semibold">Aulas Registadas</span>
              <span className="text-2xl font-black text-slate-800 tabular-nums">{attendanceSummary.totalClasses}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#dce7df] shadow-2xs">
              <span className="text-[11px] text-[#067836] block font-semibold">Presenças</span>
              <span className="text-2xl font-black text-[#067836] tabular-nums">{attendanceSummary.presences}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#dce7df] shadow-2xs">
              <span className="text-[11px] text-[#1d8cf8] block font-semibold">Faltas Justificadas</span>
              <span className="text-2xl font-black text-[#1d8cf8] tabular-nums">{attendanceSummary.absencesJustified}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#dce7df] shadow-2xs">
              <span className="text-[11px] text-red-600 block font-semibold">Faltas Não Justificadas</span>
              <span className="text-2xl font-black text-red-700 tabular-nums">{attendanceSummary.absencesUnjustified}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#dce7df] shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#f5a623] block font-semibold">Em Validação</span>
              <span className="text-2xl font-black text-amber-700 tabular-nums">{attendanceSummary.pendingJustifications}</span>
            </div>
          </div>

          {/* Tabela Diária de Status das Faltas e Presenças */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Estado Individual das Faltas e Presenças Diárias
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'todas', label: 'Todos os Registos' },
                    { id: 'faltas', label: 'Apenas Faltas' },
                    { id: 'pendentes', label: 'Pendentes' },
                    { id: 'justificadas', label: 'Justificadas' },
                    { id: 'injustificadas', label: 'Não Justificadas' }
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAttendanceFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      attendanceFilter === f.id
                        ? 'bg-white text-[#067836] shadow-2xs'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredStudentAttendance.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum registo encontrado para o filtro seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[740px]">
                  <thead>
                    <tr className="bg-white text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Disciplina</th>
                      <th className="py-3 px-4 text-center">Estado da Frequência</th>
                      <th className="py-3 px-4">Status da Justificação &amp; Parecer</th>
                      <th className="py-3 px-4 text-right">Acção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStudentAttendance.map((rec) => {
                      const canJustify =
                        rec.status === 'falta_injustificada' &&
                        rec.justificationStatus !== 'pendente';
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {rec.date.split('-').reverse().join('/')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{rec.subjectName}</span>
                            {rec.recordedByTeacherName && (
                              <span className="block text-[10px] text-slate-400">
                                Prof. {rec.recordedByTeacherName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                rec.status === 'presente'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'atraso'
                                  ? 'bg-sky-100 text-sky-800'
                                  : rec.status === 'falta_justificada'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {rec.status === 'presente'
                                ? 'Presente'
                                : rec.status === 'atraso'
                                ? 'Atraso'
                                : rec.status === 'falta_justificada'
                                ? 'Falta Justificada'
                                : 'Falta Não Justificada'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {rec.justificationStatus === 'validada' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>
                                    Justificação Validada pelo Professor (
                                    {rec.justificationSource === 'presencial'
                                      ? 'Presencial'
                                      : 'Via Sistema'}
                                    )
                                  </span>
                                </span>
                                {rec.justificationReason && (
                                  <p className="text-[11px] text-slate-600">{rec.justificationReason}</p>
                                )}
                                {rec.validationNotes && (
                                  <p className="text-[10px] text-slate-500 italic">
                                    Parecer: {rec.validationNotes}
                                  </p>
                                )}
                              </div>
                            )}
                            {rec.justificationStatus === 'pendente' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 text-amber-700 font-bold text-[11px]">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Enviada no Sistema · Aguarda Validação do Professor</span>
                                </span>
                                {rec.justificationReason && (
                                  <p className="text-[11px] text-slate-600">{rec.justificationReason}</p>
                                )}
                              </div>
                            )}
                            {rec.justificationStatus === 'rejeitada' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center space-x-1 text-red-700 font-bold text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Justificação Rejeitada pelo Professor</span>
                                </span>
                                {rec.validationNotes && (
                                  <p className="text-[10px] text-red-600">
                                    Motivo: {rec.validationNotes}
                                  </p>
                                )}
                              </div>
                            )}
                            {(!rec.justificationStatus ||
                              rec.justificationStatus === 'nao_solicitada') && (
                              <span className="text-[11px] text-slate-400">
                                {rec.status === 'falta_injustificada'
                                  ? 'Sem justificação enviada'
                                  : rec.notes || 'Assiduidade regular'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {canJustify ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setJustifyRecordId(rec.id);
                                  setJustifySubject(rec.subjectName);
                                  setJustifyDate(rec.date);
                                  setJustifyReason('');
                                  setShowJustifyModal(true);
                                }}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white shadow-xs transition cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Justificar</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabela de Assiduidade Mensal */}
          <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                RESUMO MENSAL DE FREQUÊNCIA (ANO LECTIVO 2026/2027)
              </span>
              <span className="text-xs text-emerald-700 font-bold">
                Taxa Global: {attendanceSummary.attendanceRate}%
              </span>
            </div>

            {monthlyAttendanceData.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Ainda não existem aulas diárias registadas pelo professor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-white text-slate-500 uppercase font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Mês Lectivo</th>
                      <th className="py-3 px-4 text-center">Aulas Registadas</th>
                      <th className="py-3 px-4 text-center">Presenças</th>
                      <th className="py-3 px-4 text-center">Faltas Justificadas</th>
                      <th className="py-3 px-4 text-center">Faltas Injustificadas</th>
                      <th className="py-3 px-4 text-center">Assiduidade (%)</th>
                      <th className="py-3 px-4 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {monthlyAttendanceData.map((item) => (
                      <tr key={item.month} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{item.month}</td>
                        <td className="py-3 px-4 text-center tabular-nums">{item.classes}</td>
                        <td className="py-3 px-4 text-center tabular-nums font-semibold text-emerald-700">
                          {item.presences}
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums text-blue-700 font-semibold">
                          {item.justified}
                        </td>
                        <td className="py-3 px-4 text-center tabular-nums text-red-700 font-semibold">
                          {item.unjustified}
                        </td>
                        <td className="py-3 px-4 text-center font-bold tabular-nums">
                          {item.rate.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.rate >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.rate >= 75 ? 'Regular' : 'Atenção'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MÓDULO 3: PROPINAS & MENSALIDADES (MULTICAIXA EXPRESS)
          ========================================================= */}
      {activeTab === 'tuition' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#064e26] uppercase flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-[#067836]" />
                <span>Pagamento de Propinas e Cobranças Multicaixa</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Emolumentos e Mensalidades Oficiais com Referência Multicaixa Express
              </p>
            </div>

            <div className="text-xs flex items-center space-x-3 bg-[#f7fbf8] border border-[#dce7df] px-3.5 py-2 rounded-xl">
              <span className="text-slate-600">
                Total Pago: <strong className="text-[#067836]">{formatKwanza(totalTuitionPaid)}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                Pendente: <strong className="text-amber-700">{formatKwanza(totalTuitionPending)}</strong>
              </span>
            </div>
          </div>

          {/* Painel de Notificações Financeiras da Tesouraria */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Notificações da Tesouraria ({studentFinancialNotifications.length})</span>
              </span>
              {unreadFinancialNotifications.length > 0 && (
                <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-md">
                  {unreadFinancialNotifications.length} nova(s) por ler
                </span>
              )}
            </div>

            {studentFinancialNotifications.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500">
                Nenhuma comunicação financeira recebida da Tesouraria até ao momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {studentFinancialNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                      !notif.isRead ? 'bg-[#f4fbf6]' : 'bg-white'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
                        )}
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {notif.title}
                        </span>
                        {notif.amountAoa !== undefined && (
                          <span className="font-mono text-xs font-bold text-[#055827] bg-[#eaf6ee] border border-[#cde6d5] px-2 py-0.5 rounded-lg">
                            {formatKwanza(notif.amountAoa)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                        <span>
                          Enviado por: <strong>{notif.sentByName}</strong> ({notif.sentByRole})
                        </span>
                        <span>Data: {new Date(notif.sentAt).toLocaleDateString('pt-AO')}</span>
                        {notif.multicaixaReference && (
                          <span className="font-mono text-slate-700">
                            Ref. MCX: <strong>{notif.multicaixaReference}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!notif.isRead && onMarkFinancialNotificationRead ? (
                        <button
                          type="button"
                          onClick={() => onMarkFinancialNotificationRead(notif.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <MailCheck className="w-3.5 h-3.5" />
                          <span>Marcar como lida</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#055827] bg-[#eaf6ee] border border-[#cde6d5] px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lida</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de Facturas e Referências Multicaixa */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Propinas, Matrículas &amp; Outros Emolumentos Registados na Tesouraria
              </span>
              <span className="text-xs text-emerald-100 font-medium hidden sm:inline">
                Entidade Multicaixa: {currentInstitution.bankAccount?.multicaixaEntity || '00142'}
              </span>
            </div>

            {/* Dica de rolagem horizontal em dispositivos móveis */}
            <div className="md:hidden bg-[#eaf6ee] px-3 py-1.5 border-b border-[#cde6d5] flex items-center justify-between text-[11px] text-[#055827]">
              <span>👉 Deslize horizontalmente para ver todas as colunas de propinas</span>
              <span className="font-bold">↔</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-slate-500 uppercase font-bold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Factura Nº</th>
                    <th className="py-3 px-4">Descrição / Mês</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Vencimento</th>
                    <th className="py-3 px-4 text-center">Referência MCX</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acções / Dados MCX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayInvoices.map((inv) => {
                    const isPaid = inv.status === 'pago';
                    return (
                      <tr key={inv.id} className="hover:bg-[#f7fbf8] transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{inv.monthReference}</span>
                          <span className="block text-[10px] text-slate-400">{inv.description}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          {formatKwanza(inv.totalAoa)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {inv.dueDate}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#067836]">
                          {inv.multicaixaReference || '482 910 101'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isPaid
                                ? 'bg-[#eaf6ee] text-[#055827] border border-[#cde6d5]'
                                : inv.status === 'vencido'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isPaid ? 'Pago' : inv.status === 'vencido' ? 'Vencido' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPaid ? (
                            <button
                              onClick={() => {
                                if (onOpenDocument) {
                                  onOpenDocument(selectedStudent, 'recibo_propina');
                                }
                              }}
                              className="inline-flex items-center space-x-1 text-[#055827] hover:text-[#04411d] font-bold text-xs bg-[#eaf6ee] hover:bg-[#d7efe0] px-2.5 py-1 rounded-lg border border-[#cde6d5] transition cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Ver Recibo</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setPayingInvoice(inv)}
                              className="inline-flex items-center space-x-1 text-white bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Dados Multicaixa</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MÓDULO 4: PAGAMENTO DE MATRÍCULA E CONFIRMAÇÃO
          ========================================================= */}
      {activeTab === 'enrollment' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#064e26] uppercase flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-[#067836]" />
                <span>Pagamento de Matrícula e Confirmação Escolar</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Situação Contratual de Matrícula para o Ano Lectivo 2026/2027
              </p>
            </div>

            <button
              onClick={() => setShowEnrollmentReceiptModal(true)}
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-2xs transition cursor-pointer self-start md:self-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Comprovativo Oficial</span>
            </button>
          </div>

          {/* Cartão de Detalhes da Taxa de Matrícula */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase">Estado da Matrícula</span>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-md ${
                    enrollmentFeeData.isPaid
                      ? 'bg-white text-[#067836]'
                      : 'bg-amber-400 text-slate-900'
                  }`}
                >
                  {enrollmentFeeData.isPaid
                    ? 'TAXA LIQUIDADA / CONFIRMADA'
                    : 'PENDENTE NA TESOURARIA'}
                </span>
              </div>

              <dl className="p-4 divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Valor da Taxa de Matrícula:</dt>
                  <dd className="font-bold text-slate-900">{formatKwanza(enrollmentFeeData.feeAmount)}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">N.º do Recibo de Matrícula:</dt>
                  <dd className="font-mono font-bold text-[#067836]">{enrollmentFeeData.receiptNum}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Data de Liquidação:</dt>
                  <dd className="text-slate-700 font-semibold">{enrollmentFeeData.paymentDate}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Forma de Pagamento:</dt>
                  <dd className="text-slate-700 font-medium">{enrollmentFeeData.paymentMethod}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Código de Validação Digital:</dt>
                  <dd className="font-mono text-[#067836] font-bold">{enrollmentFeeData.validationCode}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase">Processo Escolar e Turma</span>
                <span className="text-xs text-emerald-100 font-semibold">Ano Lectivo 2026/2027</span>
              </div>

              <dl className="p-4 divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Turma Atribuída:</dt>
                  <dd className="font-bold text-slate-900">{selectedStudent.className}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Turno / Horário:</dt>
                  <dd className="text-slate-700 font-medium">{selectedStudent.shift}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Sala de Aulas:</dt>
                  <dd className="text-slate-700 font-medium">{studentClass?.room || 'Sala 03'}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Director(a) de Turma:</dt>
                  <dd className="text-slate-700 font-semibold">{studentClass?.classDirectorName || 'Prof.ª Jandira Manuel'}</dd>
                </div>
                <div className="py-2 flex justify-between">
                  <dt className="text-slate-500">Documentação Apresentada:</dt>
                  <dd className="text-[#067836] font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completa e Homologada</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MÓDULO 5: ARQUIVO DIGITAL (ENVIO DE DOCUMENTOS ESCOLARES)
          ========================================================= */}
      {activeTab === 'archive' && (
        <DigitalArchiveCenter
          currentInstitution={currentInstitution}
          students={students}
          classes={classes}
          documents={digitalArchive}
          onAddDocument={onAddArchiveDocument || (async () => {})}
          onUpdateStatus={onUpdateArchiveStatus || (() => {})}
          onDeleteDocument={onDeleteArchiveDocument || (() => {})}
          currentUser={currentUser}
          activeRole={activeRole}
          lockedStudentId={selectedStudent.id}
          embedded
        />
      )}

      {/* =========================================================
          MODAL: DADOS MULTICAIXA EXPRESS (CONFIRMAÇÃO PELO TESOUREIRO)
          ========================================================= */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-[#dce7df]">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm uppercase">Referência Multicaixa Express</h3>
              </div>
              <button
                onClick={() => setPayingInvoice(null)}
                className="text-white/80 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-xl p-3.5 text-xs text-[#064e26]">
                <div className="font-bold mb-1">Dados para Pagamento de Serviços:</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-[10px] text-[#055827] block uppercase">Entidade:</span>
                    <span className="font-mono font-black text-sm text-[#064e26]">
                      {payingInvoice.multicaixaEntity || '00142'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#055827] block uppercase">Referência:</span>
                    <span className="font-mono font-black text-sm text-[#064e26]">
                      {payingInvoice.multicaixaReference || '482 910 103'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-[#055827] block uppercase">Montante:</span>
                    <span className="font-mono font-black text-base text-[#064e26]">
                      {formatKwanza(payingInvoice.balanceAoa || payingInvoice.totalAoa)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  Efectue o pagamento através da aplicação <strong>Multicaixa Express</strong> ou em qualquer ATM em <strong>"Pagamento de Serviços"</strong> com os códigos acima indicados.
                </p>
                <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <strong>Registo na Tesouraria:</strong> A confirmação definitiva e emissão do recibo oficial são registadas exclusivamente pelo <strong>Tesoureiro</strong> da instituição.
                </p>
              </div>

              {copiedRefNotice && (
                <div className="p-2 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] font-semibold text-center">
                  Referência Multicaixa copiada para a área de transferência!
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyMulticaixaRef(payingInvoice.multicaixaReference || '482 910 103')
                  }
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white shadow-2xs transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Referência</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: SOLICITAR JUSTIFICAÇÃO DE FALTA
          ========================================================= */}
      {showJustifyModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-[#dce7df] animate-scale-up">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm uppercase">JUSTIFICAR FALTA ESCOLAR</h3>
              </div>
              <button
                onClick={() => setShowJustifyModal(false)}
                className="text-white/80 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendJustification} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#064e26] mb-1">
                  Disciplina da Falta:
                </label>
                <select
                  value={justifySubject}
                  onChange={(e) => setJustifySubject(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] text-[#064e26] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                >
                  {displaySubjectGrades.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#064e26] mb-1">
                  Data da Ocorrência da Falta:
                </label>
                <input
                  type="date"
                  value={justifyDate}
                  onChange={(e) => setJustifyDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] text-[#064e26] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#064e26] mb-1">
                  Motivo da Falta (Consulta médica, doença, luto familiar):
                </label>
                <textarea
                  rows={3}
                  value={justifyReason}
                  onChange={(e) => setJustifyReason(e.target.value)}
                  placeholder="Descreva o motivo que impossibilitou o comparecimento do estudante..."
                  className="w-full text-xs p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] text-[#064e26] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#dce7df]">
                <button
                  type="button"
                  onClick={() => setShowJustifyModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#064e26] bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Justificação ao Professor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: BOLETIM OFICIAL DE NOTAS DO ALUNO (MED ANGOLA)
          ========================================================= */}
      {showBulletinModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-[#dce7df] my-4 sm:my-8">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-3.5 flex items-center justify-between print:hidden">
              <span className="font-bold text-xs uppercase">Boletim Individual de Notas Oficial (MED - Angola)</span>
              <button
                onClick={() => setShowBulletinModal(false)}
                className="text-white hover:text-white/80 cursor-pointer font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div
              ref={bulletinRef}
              className="official-document-sheet p-5 sm:p-8 space-y-4 bg-white text-black"
              id="printable-bulletin"
            >
              {/* Cabeçalho Oficial Centralizado e Editável */}
              <div className="text-center space-y-0.5 border-b-2 border-slate-900 pb-3">
                <OfficialDocumentHeader
                  institution={currentInstitution}
                  insigniaClassName="h-14 w-auto mx-auto object-contain"
                  extraMeta={
                    <div className="text-xs font-extrabold uppercase pt-1">
                      BOLETIM INDIVIDUAL DE NOTAS DO ALUNO · ANO LECTIVO {selectedStudent.academicYear}
                    </div>
                  }
                />
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-300 grid grid-cols-1 sm:grid-cols-2 text-xs gap-1.5">
                <div><strong>Aluno(a):</strong> {selectedStudent.fullName}</div>
                <div><strong>N.º de Processo:</strong> <span className="font-mono">{selectedStudent.processNumber}</span></div>
                <div><strong>Classe / Curso:</strong> {selectedStudent.gradeLevel}{selectedStudent.courseName ? ` · ${selectedStudent.courseName}` : ''}</div>
                <div><strong>Turma / Turno:</strong> {selectedStudent.className} ({selectedStudent.shift})</div>
                <div><strong>Bilhete de Identidade:</strong> <span className="font-mono">{selectedStudent.identityCardNumber || 'Constante do Processo'}</span></div>
                <div><strong>Encarregado(a):</strong> {selectedStudent.guardianName} ({selectedStudent.guardianRelationship})</div>
              </div>

              {/* Tabela da Pauta (MT1, MT2, MT3, EXAME(EN), RECURSO(REC), MFD) com notas das Mini-Pautas */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-400 border-collapse tabular-nums">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-black uppercase">
                      <th className="border border-slate-400 p-1.5 text-left">Disciplina Curricular (INIDE)</th>
                      <th className="border border-slate-400 p-1.5 text-center">MT1</th>
                      <th className="border border-slate-400 p-1.5 text-center">MT2</th>
                      <th className="border border-slate-400 p-1.5 text-center">MT3</th>
                      {hasExamAndRecourse && (
                        <>
                          <th className="border border-slate-400 p-1.5 text-center bg-sky-50 text-sky-900">EXAME (EN)</th>
                          <th className="border border-slate-400 p-1.5 text-center bg-amber-50 text-amber-900">RECURSO (REC)</th>
                        </>
                      )}
                      <th className="border border-slate-400 p-1.5 text-center bg-sky-50 text-black">MFD</th>
                      <th className="border border-slate-400 p-1.5 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualBulletinRows.map(({ subject, summary }) => (
                      <tr key={subject.id}>
                        <td className="border border-slate-300 p-1.5 font-bold">{subject.name}</td>
                        <td className={`border border-slate-300 p-1.5 text-center font-mono ${summary.mt1 === undefined ? 'text-slate-400 font-normal' : summary.mt1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                          {formatRoundedGrade(summary.mt1)}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-mono ${summary.mt2 === undefined ? 'text-slate-400 font-normal' : summary.mt2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                          {formatRoundedGrade(summary.mt2)}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center font-mono ${summary.mt3 === undefined ? 'text-slate-400 font-normal' : summary.mt3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                          {formatRoundedGrade(summary.mt3)}
                        </td>
                        {hasExamAndRecourse && (
                          <>
                            <td className={`border border-slate-300 p-1.5 text-center font-mono bg-sky-50/30 ${summary.en === undefined ? 'text-slate-400 font-normal' : summary.en < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                              {summary.en !== undefined ? summary.en.toFixed(1) : '--'}
                            </td>
                            <td className={`border border-slate-300 p-1.5 text-center font-mono bg-amber-50/30 ${summary.rec === undefined ? 'text-slate-400 font-normal' : summary.rec < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                              {summary.rec !== undefined ? summary.rec.toFixed(1) : '--'}
                            </td>
                          </>
                        )}
                        <td className={`border border-slate-300 p-1.5 text-center font-mono font-black ${summary.mf === undefined ? 'text-slate-400 font-normal' : summary.mf < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                          {formatRoundedGrade(summary.mf)}
                        </td>
                        <td className={`border border-slate-300 p-1.5 text-center text-[11px] font-bold ${summary.mf === undefined ? 'text-slate-400 font-normal' : summary.isApproved ? 'text-black' : summary.needsRecourse ? 'text-amber-700' : 'text-red-600'}`}>
                          {summary.statusLabel}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={hasExamAndRecourse ? 6 : 4} className="border border-slate-400 p-1.5 text-right uppercase">
                        Média Geral (MFD) / Qualificação MED:
                      </td>
                      <td className={`border border-slate-400 p-1.5 text-center text-sm font-black ${annualCouncilDecision.overallAverage === undefined ? 'text-slate-400' : annualCouncilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                        {annualCouncilDecision.overallAverage !== undefined ? annualCouncilDecision.overallAverage.toFixed(1) : '--'}
                      </td>
                      <td className={`border border-slate-400 p-1.5 text-center text-[11px] uppercase ${annualCouncilDecision.overallAverage === undefined ? 'text-slate-400' : annualCouncilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                        {annualCouncilDecision.overallAverage !== undefined
                          ? getGradeQualitativeText(annualCouncilDecision.overallAverage, selectedStudent.subsystemCode)
                          : 'Em Curso'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Trimestres Separados no Boletim PDF (AC1, AC2, AC3, MAC, NPT e MT) */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Registo Trimestral Detalhado ({scaleConfig.scaleLabel} · AC1, AC2, AC3, MAC, NPT e MT)
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(['1_trimestre', '2_trimestre', '3_trimestre'] as const).map((trimKey) => (
                    <div key={trimKey} className="border border-slate-300 rounded overflow-hidden">
                      <div className="bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-800 border-b border-slate-300">
                        {trimKey.replace('_trimestre', '.º Trimestre')}
                      </div>
                      <table className="w-full text-[10px] border-collapse tabular-nums">
                        <thead>
                          <tr className="bg-slate-50 font-bold border-b border-slate-300">
                            <th className="p-1 text-left border-r border-slate-200">Disciplina</th>
                            <th className="p-1 text-center border-r border-slate-200">AC1</th>
                            <th className="p-1 text-center border-r border-slate-200">AC2</th>
                            <th className="p-1 text-center border-r border-slate-200">AC3</th>
                            <th className="p-1 text-center border-r border-slate-200 bg-sky-50/70">MAC</th>
                            <th className="p-1 text-center border-r border-slate-200">NPT</th>
                            <th className="p-1 text-center bg-slate-100 font-black">MT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {annualBulletinRows.map(({ subject, trimesters }) => {
                            const t = trimesters[trimKey];
                            return (
                              <tr key={subject.id} className="border-t border-slate-200">
                                <td className="p-1 font-semibold border-r border-slate-200">{subject.name}</td>
                                <td className={`p-1 text-center font-mono border-r border-slate-200 ${t.ac1 === undefined ? 'text-slate-400' : t.ac1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac1 !== undefined ? t.ac1.toFixed(1) : '--'}</td>
                                <td className={`p-1 text-center font-mono border-r border-slate-200 ${t.ac2 === undefined ? 'text-slate-400' : t.ac2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac2 !== undefined ? t.ac2.toFixed(1) : '--'}</td>
                                <td className={`p-1 text-center font-mono border-r border-slate-200 ${t.ac3 === undefined ? 'text-slate-400' : t.ac3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac3 !== undefined ? t.ac3.toFixed(1) : '--'}</td>
                                <td className={`p-1 text-center font-mono font-bold bg-sky-50/40 border-r border-slate-200 ${t.mac === undefined ? 'text-slate-400 font-normal' : t.mac < passingThreshold ? 'text-red-600' : 'text-black'}`}>{t.mac !== undefined ? t.mac.toFixed(1) : '--'}</td>
                                <td className={`p-1 text-center font-mono border-r border-slate-200 ${t.npt === undefined ? 'text-slate-400' : t.npt < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.npt !== undefined ? t.npt.toFixed(1) : '--'}</td>
                                <td className={`p-1 text-center font-mono font-black bg-slate-50 ${t.mt === undefined ? 'text-slate-400 font-normal' : t.mt < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                                  {formatRoundedGrade(t.mt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assiduidade + Deliberação + QR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded">
                  <div className="font-bold uppercase text-[10px] text-slate-600">Assiduidade Escolar</div>
                  <div>
                    Assiduidade Global: <strong>{attendanceSummary.attendanceRate}%</strong> · Presenças:{' '}
                    <strong>{attendanceSummary.presences}</strong> · Faltas:{' '}
                    <strong>{attendanceSummary.absencesJustified + attendanceSummary.absencesUnjustified}</strong>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded">
                  <div className="font-bold uppercase text-[10px] text-slate-600">Deliberação do Conselho de Notas</div>
                  <div>
                    Positivas: <strong>{annualCouncilDecision.positivesCount}</strong> · Negativas:{' '}
                    <strong className={annualCouncilDecision.negativesCount > 0 ? 'text-red-600' : 'text-black'}>{annualCouncilDecision.negativesCount}</strong> · Resultado:{' '}
                    <strong className={`uppercase ${annualCouncilDecision.decision === 'Transita' ? 'text-black' : annualCouncilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>{annualCouncilDecision.decision}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                <div className="flex items-center space-x-2.5">
                  <QrCodeView value={`https://neuroeduca.gov.ao/boletim/${selectedStudent.processNumber}`} size={58} />
                  <div>
                    <div className="font-bold text-slate-700">Código QR de Autenticidade</div>
                    <div className="font-mono">Proc: {selectedStudent.processNumber}</div>
                  </div>
                </div>
                <div>{currentInstitution.municipality}, aos {formatAngolaDate(new Date())}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-[11px] text-center">
                <div>
                  <div className="w-40 border-t border-slate-500 mx-auto pt-1 font-bold">
                    {studentClass?.classDirectorName || 'O(A) Director(a) de Turma'}
                  </div>
                  <div className="text-[10px] text-slate-500">Director(a) de Turma</div>
                </div>
                <div>
                  <div className="w-40 border-t border-slate-500 mx-auto pt-1 font-bold">
                    {currentInstitution.subdirectorPedagogico || 'O(A) Subdirector(a) Pedagógico(a)'}
                  </div>
                  <div className="text-[10px] text-slate-500">Subdirecção Pedagógica</div>
                </div>
                <div>
                  <div className="w-40 border-t border-slate-500 mx-auto pt-1 font-bold">
                    {selectedStudent.guardianName}
                  </div>
                  <div className="text-[10px] text-slate-500">Encarregado(a) de Educação</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <button
                onClick={() => setShowBulletinModal(false)}
                className="px-3 py-1.5 rounded text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Fechar
              </button>
              <DocumentExportBar
                targetRef={bulletinRef}
                filename={`Boletim_${selectedStudent.processNumber}`}
                documentTitle={`Boletim Oficial - ${selectedStudent.fullName}`}
                defaultFormat="A4"
                defaultOrientation="portrait"
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: COMPROVATIVO DE MATRÍCULA E CONFIRMAÇÃO (IMPRESSÃO)
          ========================================================= */}
      {showEnrollmentReceiptModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-[#dce7df] my-8">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-3.5 flex items-center justify-between print:hidden">
              <span className="font-bold text-xs uppercase">Comprovativo Oficial de Matrícula</span>
              <button
                onClick={() => setShowEnrollmentReceiptModal(false)}
                className="text-white hover:text-white/80 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div
              ref={enrollmentRef}
              className="official-document-sheet p-6 space-y-4 bg-white text-black"
              id="printable-enrollment"
            >
              <div className="text-center space-y-1 border-b-2 border-slate-800 pb-3">
                <OfficialDocumentHeader
                  institution={currentInstitution}
                  insigniaClassName="h-14 w-auto mx-auto object-contain"
                  extraMeta={
                    <div className="text-xs font-bold uppercase pt-1">
                      RECIBO E COMPROVATIVO OFICIAL DE MATRÍCULA · ANO LECTIVO 2026/2027
                    </div>
                  }
                />
              </div>

              <div className="border border-slate-300 rounded p-4 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Estudante:</strong> {selectedStudent.fullName}</div>
                  <div><strong>N.º Processo:</strong> {selectedStudent.processNumber}</div>
                  <div><strong>Classe / Curso:</strong> {selectedStudent.gradeLevel} {selectedStudent.courseName ? `- ${selectedStudent.courseName}` : ''}</div>
                  <div><strong>Turma / Turno:</strong> {selectedStudent.className} ({selectedStudent.shift})</div>
                  <div><strong>Encarregado(a):</strong> {selectedStudent.guardianName}</div>
                  <div><strong>Telefone:</strong> {selectedStudent.guardianPhone}</div>
                  <div><strong>Recibo N.º:</strong> <span className="font-mono text-[#0073b7] font-bold">{enrollmentFeeData.receiptNum}</span></div>
                  <div><strong>Taxa de Matrícula:</strong> <span className="font-bold">{formatKwanza(enrollmentFeeData.feeAmount)}</span></div>
                  <div>
                    <strong>Estado do Pagamento:</strong>{' '}
                    <span className={enrollmentFeeData.isPaid ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
                      {enrollmentFeeData.isPaid ? 'LIQUIDADO' : 'PENDENTE NA TESOURARIA'}
                    </span>
                  </div>
                  <div><strong>Data de Confirmação:</strong> {enrollmentFeeData.paymentDate}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-600">
                <div className="font-mono font-bold text-slate-800">CÓDIGO DE AUTENTICIDADE: {enrollmentFeeData.validationCode}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Documento processado pelo Sistema de Gestão Escolar NEUROEDUCA. Válido sem emendas ou rasuras.
                </div>
              </div>

              <div className="flex justify-between pt-6 text-[11px] text-center">
                <div className="w-48 border-t border-slate-400 pt-1">
                  A Secretaria Geral
                </div>
                <div className="w-48 border-t border-slate-400 pt-1">
                  O Director Geral
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <button
                onClick={() => setShowEnrollmentReceiptModal(false)}
                className="px-3 py-1.5 rounded text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Fechar
              </button>
              <DocumentExportBar
                targetRef={enrollmentRef}
                filename={`Comprovativo_Matricula_${selectedStudent.processNumber}`}
                documentTitle={`Comprovativo Matrícula - ${selectedStudent.fullName}`}
                defaultFormat="A5"
                defaultOrientation="portrait"
                compact
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
