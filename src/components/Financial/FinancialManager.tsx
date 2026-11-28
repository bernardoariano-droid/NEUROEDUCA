/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão Financeira Escolar (Exclusivo do Tesoureiro)
 * Registo de Propinas e Outros Pagamentos · Controlo Mensal (Aluno/Turma/Subsistema) ·
 * Visualização de Alunos em Atraso · Comunicados Pré-Elaborados com Redireccionamento Manual WhatsApp / SMS
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  DollarSign,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  X,
  Send,
  Bell,
  Lock,
  ShieldCheck,
  GraduationCap,
  Layers,
  MailCheck,
  Clock,
  Users,
  CalendarDays,
  MessageCircle,
  MessageSquare,
  Filter,
  RotateCcw,
  ExternalLink,
  PhoneOff
} from 'lucide-react';
import {
  ClassRoom,
  EducationSubsystemCode,
  FinancialCategory,
  FinancialNotification,
  FinancialNotificationTarget,
  FinancialNotificationType,
  Institution,
  Invoice,
  PaymentMethod,
  Student,
  UserProfile
} from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS } from '../../data/angolaCurriculum';
import { formatKwanza, generateMulticaixaReference, formatAngolaDate } from '../../utils/currency';
import { QrCodeView } from '../common/QrCodeView';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import { DocumentExportBar } from '../common/DocumentExportBar';

export interface RegisterEnrollmentFeePayload {
  studentId: string;
  amountAoa: number;
  feeType: 'matricula_nova' | 'confirmacao_matricula';
  method: PaymentMethod;
  reference?: string;
  markAsPaid: boolean;
  dueDate: string;
  sendNotification: boolean;
  recipientTarget: FinancialNotificationTarget;
}

export interface SendFinancialNotificationInput {
  studentId: string;
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
}

interface FinancialManagerProps {
  currentInstitution: Institution;
  invoices: Invoice[];
  students: Student[];
  classes?: ClassRoom[];
  isTreasurer: boolean;
  currentUser?: UserProfile | null;
  financialNotifications?: FinancialNotification[];
  onAddPayment: (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    sendNotification?: boolean
  ) => void;
  onAddInvoice?: (
    newInvoice: Invoice,
    sendNotification?: boolean,
    recipientTarget?: FinancialNotificationTarget
  ) => void;
  onRegisterEnrollmentFee?: (payload: RegisterEnrollmentFeePayload) => void;
  onSendFinancialNotification?: (items: SendFinancialNotificationInput[]) => void;
  onOpenReceipt?: (invoice: Invoice) => void;
  initialOpenModal?: boolean;
}

const OTHER_FEE_PRESETS = [
  { label: 'Declaração Escolar c/ Notas', amount: 5000 },
  { label: 'Certificado de Habilitações', amount: 12000 },
  { label: 'Taxa de Exame / Recurso', amount: 6000 },
  { label: 'Cartão de Estudante', amount: 2500 },
  { label: 'Uniforme Escolar Completo', amount: 18500 },
  { label: 'Transporte Escolar Mensal', amount: 25000 }
];

const ACADEMIC_MONTHS = [
  { key: 'setembro', label: 'Setembro/2026', short: 'Set', defaultDue: '2026-09-10' },
  { key: 'outubro', label: 'Outubro/2026', short: 'Out', defaultDue: '2026-10-10' },
  { key: 'novembro', label: 'Novembro/2026', short: 'Nov', defaultDue: '2026-11-10' },
  { key: 'dezembro', label: 'Dezembro/2026', short: 'Dez', defaultDue: '2026-12-10' },
  { key: 'janeiro', label: 'Janeiro/2027', short: 'Jan', defaultDue: '2027-01-10' },
  { key: 'fevereiro', label: 'Fevereiro/2027', short: 'Fev', defaultDue: '2027-02-10' },
  { key: 'marco', label: 'Março/2027', short: 'Mar', defaultDue: '2027-03-10' },
  { key: 'abril', label: 'Abril/2027', short: 'Abr', defaultDue: '2027-04-10' },
  { key: 'maio', label: 'Maio/2027', short: 'Mai', defaultDue: '2027-05-10' },
  { key: 'junho', label: 'Junho/2027', short: 'Jun', defaultDue: '2027-06-10' },
  { key: 'julho', label: 'Julho/2027', short: 'Jul', defaultDue: '2027-07-10' }
];

interface MessageTemplateOption {
  id: 'atraso_urgente' | 'lembrete_amigavel' | 'outros_emolumentos' | 'confirmacao_recibo';
  label: string;
  badge: string;
  notifType: FinancialNotificationType;
  description: string;
}

const COLLECTION_TEMPLATES: MessageTemplateOption[] = [
  {
    id: 'atraso_urgente',
    label: 'Aviso de Propina em Atraso',
    badge: 'Atraso',
    notifType: 'aviso_atraso',
    description: 'Comunica propinas vencidas com montante em dívida e referência Multicaixa.'
  },
  {
    id: 'lembrete_amigavel',
    label: 'Lembrete Amigável Mensal',
    badge: 'Lembrete',
    notifType: 'cobranca_pendente',
    description: 'Recorda o prazo de vencimento da propina mensal ou taxa pendente.'
  },
  {
    id: 'outros_emolumentos',
    label: 'Cobrança de Outros Pagamentos',
    badge: 'Outros',
    notifType: 'emolumento_outros',
    description: 'Para declarações, certificados, exames, uniformes, transporte ou matrícula.'
  },
  {
    id: 'confirmacao_recibo',
    label: 'Confirmação de Pagamento',
    badge: 'Recibo',
    notifType: 'confirmacao_pagamento',
    description: 'Confirma a liquidação recebida pela Tesouraria e nº de recibo.'
  }
];

const normalizeText = (value?: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const matchAcademicMonthKey = (monthReference?: string): string | null => {
  const norm = normalizeText(monthReference);
  if (!norm) return null;
  const found = ACADEMIC_MONTHS.find((m) => norm.includes(m.key));
  return found ? found.key : null;
};

const normalizeAngolaPhone = (
  raw?: string
): { waDigits: string; smsTarget: string; display: string } | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 7) return null;
  let waDigits = digitsOnly;
  if (digitsOnly.startsWith('00244')) {
    waDigits = digitsOnly.slice(2);
  } else if (digitsOnly.length === 9 && digitsOnly.startsWith('9')) {
    waDigits = `244${digitsOnly}`;
  }
  return {
    waDigits,
    smsTarget: `+${waDigits}`,
    display: trimmed
  };
};

const buildWhatsAppHref = (waDigits: string, text: string): string =>
  `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;

const buildSmsHref = (smsTarget: string, text: string): string =>
  `sms:${smsTarget}?body=${encodeURIComponent(text)}`;

const inferCategory = (inv: Invoice): FinancialCategory => {
  if (inv.category) return inv.category;
  const d = inv.description.toLowerCase();
  if (d.includes('matríc') || d.includes('matric') || d.includes('confirma')) return 'matricula';
  if (d.includes('propina') || d.includes('mensal')) return 'propina';
  return 'outros';
};

const categoryBadge = (cat: FinancialCategory) => {
  if (cat === 'propina') {
    return { label: 'Propina', classes: 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]' };
  }
  if (cat === 'matricula') {
    return { label: 'Taxa Matrícula', classes: 'bg-sky-50 text-sky-700 border-sky-200' };
  }
  return { label: 'Outros', classes: 'bg-slate-100 text-slate-700 border-slate-200' };
};

const notifTypeLabel = (type: FinancialNotificationType) => {
  switch (type) {
    case 'aviso_atraso':
      return { label: 'Aviso de Atraso', classes: 'bg-red-50 text-red-700 border-red-200' };
    case 'cobranca_pendente':
      return { label: 'Cobrança Pendente', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'confirmacao_matricula':
      return { label: 'Taxa Matrícula Confirmada', classes: 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]' };
    case 'confirmacao_pagamento':
      return { label: 'Pagamento Confirmado', classes: 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]' };
    case 'emolumento_outros':
      return { label: 'Outros Emolumentos', classes: 'bg-sky-50 text-sky-700 border-sky-200' };
    default:
      return { label: 'Comunicado de Cobrança', classes: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const FinancialManager: React.FC<FinancialManagerProps> = ({
  currentInstitution,
  invoices,
  students,
  classes = [],
  isTreasurer,
  financialNotifications = [],
  onAddPayment,
  onAddInvoice,
  onRegisterEnrollmentFee,
  onSendFinancialNotification,
  initialOpenModal = false
}) => {
  const instInvoices = useMemo(
    () => invoices.filter((inv) => inv.institutionId === currentInstitution.id),
    [invoices, currentInstitution.id]
  );
  const instStudents = useMemo(
    () => students.filter((s) => s.institutionId === currentInstitution.id),
    [students, currentInstitution.id]
  );
  const instClasses = useMemo(
    () => classes.filter((c) => c.institutionId === currentInstitution.id),
    [classes, currentInstitution.id]
  );
  const instNotifications = useMemo(
    () => financialNotifications.filter((n) => n.institutionId === currentInstitution.id),
    [financialNotifications, currentInstitution.id]
  );

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const isInvoiceOverdue = (inv: Invoice): boolean => {
    if (inv.status === 'pago' || inv.balanceAoa <= 0) return false;
    if (inv.status === 'vencido') return true;
    return Boolean(inv.dueDate && inv.dueDate < todayIso);
  };

  const getDaysOverdue = (dueDate?: string): number => {
    if (!dueDate) return 0;
    const dueMs = Date.parse(`${dueDate}T00:00:00`);
    const todayMs = Date.parse(`${todayIso}T00:00:00`);
    if (Number.isNaN(dueMs) || Number.isNaN(todayMs)) return 0;
    return Math.max(0, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
  };

  // Mapas para cruzamento Subsistema -> Turma -> Aluno
  const classById = useMemo(
    () => new Map(instClasses.map((c) => [c.id, c])),
    [instClasses]
  );
  const studentById = useMemo(
    () => new Map(instStudents.map((s) => [s.id, s])),
    [instStudents]
  );

  const resolveSubsystemMeta = (code?: EducationSubsystemCode) =>
    ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === code);

  const resolveStudentHierarchy = (stu?: Student) => {
    const cls = stu?.classId ? classById.get(stu.classId) : undefined;
    const subsystemCode = cls?.subsystemCode || stu?.subsystemCode;
    const subMeta = resolveSubsystemMeta(subsystemCode);
    return {
      subsystemCode: subsystemCode || ('' as EducationSubsystemCode | ''),
      subsystemLabel: subMeta?.shortName || subMeta?.name || 'Sem Subsistema',
      classId: cls?.id || stu?.classId || '',
      className: cls?.name || stu?.className || 'Sem Turma',
      gradeLevel: cls?.gradeLevel || stu?.gradeLevel || ''
    };
  };

  // Subsistemas presentes nesta escola
  const availableSubsystems = useMemo(() => {
    const codes = new Set<EducationSubsystemCode>();
    (currentInstitution.subsystems || []).forEach((c) => codes.add(c));
    instClasses.forEach((c) => codes.add(c.subsystemCode));
    instStudents.forEach((s) => {
      if (s.subsystemCode) codes.add(s.subsystemCode);
    });
    return ANGOLA_EDUCATION_SUBSYSTEMS.filter((sub) => codes.has(sub.code));
  }, [currentInstitution.subsystems, instClasses, instStudents]);

  // Estados de navegação & filtros hierárquicos (Subsistema -> Turma -> Aluno -> Mês)
  const [activeSection, setActiveSection] = useState<
    'lancamentos' | 'controlo_mensal' | 'atrasos' | 'matriculas' | 'notificacoes'
  >('lancamentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [subsystemFilter, setSubsystemFilter] = useState<'todos' | EducationSubsystemCode>('todos');
  const [classFilter, setClassFilter] = useState<string>('todas');
  const [studentFilter, setStudentFilter] = useState<string>('todos');
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente' | 'vencido'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | FinancialCategory>('todas');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<Invoice | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(initialOpenModal && isTreasurer);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Turmas filtradas pelo Subsistema seleccionado
  const filteredClassOptions = useMemo(() => {
    if (subsystemFilter === 'todos') return instClasses;
    return instClasses.filter((c) => c.subsystemCode === subsystemFilter);
  }, [instClasses, subsystemFilter]);

  // Alunos filtrados por Subsistema + Turma (para o selector Aluno por Aluno)
  const filteredStudentOptions = useMemo(() => {
    return instStudents.filter((stu) => {
      const meta = resolveStudentHierarchy(stu);
      if (subsystemFilter !== 'todos' && meta.subsystemCode !== subsystemFilter) return false;
      if (classFilter !== 'todas' && meta.classId !== classFilter) return false;
      return true;
    });
  }, [instStudents, subsystemFilter, classFilter, classById]);

  const studentMatchesHierarchy = (stu?: Student): boolean => {
    if (!stu) return subsystemFilter === 'todos' && classFilter === 'todas' && studentFilter === 'todos';
    const meta = resolveStudentHierarchy(stu);
    if (subsystemFilter !== 'todos' && meta.subsystemCode !== subsystemFilter) return false;
    if (classFilter !== 'todas' && meta.classId !== classFilter) return false;
    if (studentFilter !== 'todos' && stu.id !== studentFilter) return false;
    return true;
  };

  const resetHierarchyFilters = () => {
    setSubsystemFilter('todos');
    setClassFilter('todas');
    setStudentFilter('todos');
    setMonthFilter('todos');
    setSearchTerm('');
    setStatusFilter('todos');
    setCategoryFilter('todas');
  };

  // Estado do formulário de registo financeiro (Exclusivo do Tesoureiro)
  const [regCategory, setRegCategory] = useState<FinancialCategory>('propina');
  const [regStudentId, setRegStudentId] = useState(instStudents[0]?.id || '');
  const [regDescription, setRegDescription] = useState('Propina Mensal');
  const [regMonth, setRegMonth] = useState('Dezembro/2026');
  const [regAmount, setRegAmount] = useState(35000);
  const [regDueDate, setRegDueDate] = useState('2026-12-10');
  const [regMarkPaid, setRegMarkPaid] = useState(false);
  const [regMethod, setRegMethod] = useState<PaymentMethod>('multicaixa_express');
  const [regRef, setRegRef] = useState('');
  const [regEnrollmentType, setRegEnrollmentType] = useState<'matricula_nova' | 'confirmacao_matricula'>(
    'matricula_nova'
  );
  const [regSendNotif, setRegSendNotif] = useState(true);
  const [regNotifTarget, setRegNotifTarget] = useState<FinancialNotificationTarget>('ambos');

  // Estado do modal de liquidação
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('multicaixa_express');
  const [payRef, setPayRef] = useState('');
  const [paySendNotif, setPaySendNotif] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado do modal de envio de comunicado/notificação financeira (+ redireccionamento WhatsApp / SMS)
  const [notifMode, setNotifMode] = useState<'individual' | 'lote_dividas'>('individual');
  const [notifStudentId, setNotifStudentId] = useState(instStudents[0]?.id || '');
  const [notifTarget, setNotifTarget] = useState<FinancialNotificationTarget>('ambos');
  const [notifType, setNotifType] = useState<FinancialNotificationType>('aviso_atraso');
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<MessageTemplateOption['id']>('atraso_urgente');
  const [notifTitle, setNotifTitle] = useState('Aviso de Propina em Atraso');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifInvoiceId, setNotifInvoiceId] = useState<string | undefined>(undefined);

  const showToast = (type: 'success' | 'error', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const guardTreasurerAction = (): boolean => {
    if (!isTreasurer) {
      showToast(
        'error',
        'Acesso Restrito: O registo de pagamentos e envio de cobranças é responsabilidade exclusiva do Tesoureiro.'
      );
      return false;
    }
    return true;
  };

  // Facturas filtradas por hierarquia + pesquisa + mês + categoria + estado
  const filteredInvoices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return instInvoices.filter((inv) => {
      const stu = studentById.get(inv.studentId);
      if (!studentMatchesHierarchy(stu)) return false;

      if (monthFilter !== 'todos') {
        const mKey = matchAcademicMonthKey(inv.monthReference);
        if (mKey !== monthFilter) return false;
      }

      if (q) {
        const meta = resolveStudentHierarchy(stu);
        const matchSearch =
          inv.studentName.toLowerCase().includes(q) ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.studentProcessNumber.toLowerCase().includes(q) ||
          inv.description.toLowerCase().includes(q) ||
          inv.monthReference.toLowerCase().includes(q) ||
          meta.className.toLowerCase().includes(q) ||
          meta.subsystemLabel.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      const overdue = isInvoiceOverdue(inv);
      const matchStatus =
        statusFilter === 'todos'
          ? true
          : statusFilter === 'vencido'
          ? overdue
          : statusFilter === 'pendente'
          ? inv.status !== 'pago' && !overdue
          : inv.status === statusFilter;

      const cat = inferCategory(inv);
      const matchCategory = categoryFilter === 'todas' || cat === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [
    instInvoices,
    studentById,
    subsystemFilter,
    classFilter,
    studentFilter,
    monthFilter,
    searchTerm,
    statusFilter,
    categoryFilter,
    todayIso
  ]);

  // Alunos para a vista "Controlo Mensal" e "Taxas de Matrícula"
  const filteredMatrixStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return instStudents.filter((stu) => {
      if (!studentMatchesHierarchy(stu)) return false;
      if (!q) return true;
      const meta = resolveStudentHierarchy(stu);
      return (
        stu.fullName.toLowerCase().includes(q) ||
        stu.processNumber.toLowerCase().includes(q) ||
        stu.guardianName.toLowerCase().includes(q) ||
        meta.className.toLowerCase().includes(q) ||
        meta.subsystemLabel.toLowerCase().includes(q)
      );
    });
  }, [instStudents, subsystemFilter, classFilter, studentFilter, searchTerm, classById]);

  // Agrupamento de Alunos em Atraso (aluno por aluno)
  const overdueStudentsList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const grouped = new Map<
      string,
      {
        student: Student;
        overdueInvoices: Invoice[];
        totalOverdueAoa: number;
        oldestDueDate: string;
        maxDaysOverdue: number;
      }
    >();

    instInvoices.forEach((inv) => {
      if (!isInvoiceOverdue(inv)) return;
      if (monthFilter !== 'todos') {
        const mKey = matchAcademicMonthKey(inv.monthReference);
        if (mKey !== monthFilter) return;
      }
      const stu = studentById.get(inv.studentId);
      if (!stu) return;

      const current = grouped.get(stu.id);
      const days = getDaysOverdue(inv.dueDate);
      if (!current) {
        grouped.set(stu.id, {
          student: stu,
          overdueInvoices: [inv],
          totalOverdueAoa: inv.balanceAoa,
          oldestDueDate: inv.dueDate,
          maxDaysOverdue: days
        });
      } else {
        current.overdueInvoices.push(inv);
        current.totalOverdueAoa += inv.balanceAoa;
        if (inv.dueDate && (!current.oldestDueDate || inv.dueDate < current.oldestDueDate)) {
          current.oldestDueDate = inv.dueDate;
        }
        if (days > current.maxDaysOverdue) current.maxDaysOverdue = days;
      }
    });

    return Array.from(grouped.values())
      .filter((entry) => {
        if (!studentMatchesHierarchy(entry.student)) return false;
        if (!q) return true;
        const meta = resolveStudentHierarchy(entry.student);
        return (
          entry.student.fullName.toLowerCase().includes(q) ||
          entry.student.processNumber.toLowerCase().includes(q) ||
          entry.student.guardianName.toLowerCase().includes(q) ||
          meta.className.toLowerCase().includes(q) ||
          meta.subsystemLabel.toLowerCase().includes(q) ||
          entry.overdueInvoices.some((i) => i.monthReference.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.totalOverdueAoa - a.totalOverdueAoa);
  }, [instInvoices, studentById, subsystemFilter, classFilter, studentFilter, monthFilter, searchTerm, todayIso]);

  const totalOverdueStudentsCount = useMemo(() => {
    const ids = new Set<string>();
    instInvoices.forEach((inv) => {
      if (isInvoiceOverdue(inv)) ids.add(inv.studentId);
    });
    return ids.size;
  }, [instInvoices, todayIso]);

  const totalBilled = instInvoices.reduce((sum, inv) => sum + inv.totalAoa, 0);
  const totalPaid = instInvoices.reduce((sum, inv) => sum + inv.amountPaidAoa, 0);
  const totalOutstanding = instInvoices.reduce((sum, inv) => sum + inv.balanceAoa, 0);

  const countByCat = useMemo(() => {
    return {
      propina: instInvoices.filter((i) => inferCategory(i) === 'propina').length,
      matricula: instInvoices.filter((i) => inferCategory(i) === 'matricula').length,
      outros: instInvoices.filter((i) => inferCategory(i) === 'outros').length
    };
  }, [instInvoices]);

  const openRegisterModal = (
    category: FinancialCategory = 'propina',
    studentId?: string,
    presetMonth?: { label: string; defaultDue: string; markPaid?: boolean }
  ) => {
    if (!guardTreasurerAction()) return;
    const targetStu =
      instStudents.find((s) => s.id === (studentId || (studentFilter !== 'todos' ? studentFilter : regStudentId))) ||
      instStudents[0];
    setRegCategory(category);
    if (targetStu) setRegStudentId(targetStu.id);

    if (category === 'propina') {
      setRegDescription(`Propina Mensal${targetStu ? ` - ${targetStu.gradeLevel}` : ''}`);
      setRegMonth(presetMonth?.label || 'Dezembro/2026');
      setRegDueDate(presetMonth?.defaultDue || '2026-12-10');
      setRegAmount(targetStu?.subsystemCode === 'primario_geral' ? 35000 : 48000);
      setRegMarkPaid(Boolean(presetMonth?.markPaid));
    } else if (category === 'matricula') {
      setRegDescription(`Taxa de Matrícula Anual${targetStu ? ` - ${targetStu.gradeLevel}` : ''}`);
      setRegMonth('Ano Lectivo 2026/2027');
      setRegDueDate('2026-09-15');
      setRegAmount(targetStu?.enrollmentAmountAoa || 15000);
      setRegMarkPaid(true);
    } else {
      setRegDescription('Emolumento: Declaração Escolar c/ Notas');
      setRegMonth(presetMonth?.label || 'Novembro/2026');
      setRegDueDate(presetMonth?.defaultDue || todayIso);
      setRegAmount(5000);
      setRegMarkPaid(Boolean(presetMonth?.markPaid));
    }
    setRegRef(`MCX-${Math.floor(100000 + Math.random() * 900000)}`);
    setRegSendNotif(true);
    setIsRegisterModalOpen(true);
  };

  const handleOpenPaymentModal = (inv: Invoice) => {
    if (!guardTreasurerAction()) return;
    setSelectedInvoiceForPay(inv);
    setPayAmount(inv.balanceAoa);
    setPayRef(`MCX-${Math.floor(100000 + Math.random() * 900000)}`);
    setPaySendNotif(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardTreasurerAction()) return;
    if (!selectedInvoiceForPay || payAmount <= 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      onAddPayment(selectedInvoiceForPay.id, payAmount, payMethod, payRef, paySendNotif);
      setIsProcessing(false);
      setSelectedInvoiceForPay(null);
      showToast(
        'success',
        `Pagamento de ${formatKwanza(payAmount)} registado pelo Tesoureiro.${
          paySendNotif ? ' Notificação registada para Aluno/Encarregado.' : ''
        }`
      );
    }, 250);
  };

  const handleCreateFinancialRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardTreasurerAction()) return;
    const st = instStudents.find((s) => s.id === regStudentId) || instStudents[0];
    if (!st) return;

    if (regCategory === 'matricula' && onRegisterEnrollmentFee) {
      onRegisterEnrollmentFee({
        studentId: st.id,
        amountAoa: Number(regAmount),
        feeType: regEnrollmentType,
        method: regMethod,
        reference: regRef,
        markAsPaid: regMarkPaid,
        dueDate: regDueDate,
        sendNotification: regSendNotif,
        recipientTarget: regNotifTarget
      });
      setIsRegisterModalOpen(false);
      showToast(
        'success',
        `Pagamento da Taxa de Matrícula de ${st.fullName} (${formatKwanza(regAmount)}) gravado com sucesso.`
      );
      return;
    }

    const nowTs = Date.now();
    const mcxRef = generateMulticaixaReference(nowTs);
    const amountNum = Number(regAmount);
    const newInvoice: Invoice = {
      id: `inv-${nowTs}`,
      institutionId: currentInstitution.id,
      studentId: st.id,
      studentName: st.fullName,
      studentProcessNumber: st.processNumber,
      invoiceNumber: `FT-${currentInstitution.acronym || 'ESC'}-2026/${Math.floor(1000 + Math.random() * 9000)}`,
      category: regCategory,
      monthReference: regMonth,
      description: regDescription,
      amountDueAoa: amountNum,
      penaltyAoa: 0,
      discountAoa: 0,
      totalAoa: amountNum,
      amountPaidAoa: regMarkPaid ? amountNum : 0,
      balanceAoa: regMarkPaid ? 0 : amountNum,
      dueDate: regDueDate,
      status: regMarkPaid ? 'pago' : regDueDate < todayIso ? 'vencido' : 'pendente',
      multicaixaReference: mcxRef,
      multicaixaEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142',
      paidAt: regMarkPaid ? todayIso : undefined,
      paymentMethod: regMarkPaid ? regMethod : undefined,
      receiptNumber: regMarkPaid ? `RC-${nowTs.toString().slice(-6)}` : undefined
    };

    onAddInvoice?.(newInvoice, regSendNotif, regNotifTarget);
    setIsRegisterModalOpen(false);
    showToast(
      'success',
      `${categoryBadge(regCategory).label} (${regMonth}) registada para ${st.fullName}.${
        regSendNotif ? ' Comunicado registado para Aluno/Encarregado.' : ''
      }`
    );
  };

  // Gerador de Mensagens Pré-Elaboradas para Cobranças (com dados reais do aluno/turma/subsistema)
  const buildTemplateMessage = (
    templateId: MessageTemplateOption['id'],
    student: Student | undefined,
    inv?: Invoice
  ): { title: string; message: string; notifType: FinancialNotificationType } => {
    if (!student) {
      return {
        title: 'Comunicado de Tesouraria',
        message: '',
        notifType: 'cobranca_pendente'
      };
    }

    const meta = resolveStudentHierarchy(student);
    const entity = currentInstitution.bankAccount?.multicaixaEntity || '00142';
    const stuPending = instInvoices.filter(
      (i) => i.studentId === student.id && i.status !== 'pago' && i.balanceAoa > 0
    );
    const stuOverdue = stuPending.filter((i) => isInvoiceOverdue(i));
    const totalPending = stuPending.reduce((sum, i) => sum + i.balanceAoa, 0);
    const totalOverdue = stuOverdue.reduce((sum, i) => sum + i.balanceAoa, 0);
    const targetRef =
      inv?.multicaixaReference ||
      stuOverdue[0]?.multicaixaReference ||
      stuPending[0]?.multicaixaReference ||
      '482 910 230';

    if (templateId === 'confirmacao_recibo') {
      const paidInv =
        inv && inv.status === 'pago'
          ? inv
          : instInvoices.find((i) => i.studentId === student.id && i.status === 'pago');
      return {
        title: `Confirmação de Pagamento (${paidInv?.receiptNumber || 'Tesouraria'})`,
        notifType: 'confirmacao_pagamento',
        message: paidInv
          ? `Caro(a) Encarregado(a) ${student.guardianName}, a Tesouraria da ${currentInstitution.name} confirma a recepção de ${formatKwanza(
              paidInv.amountPaidAoa
            )} referente a "${paidInv.description}" (${paidInv.monthReference}) do(a) estudante ${
              student.fullName
            } (${meta.className} · ${meta.subsystemLabel}). Recibo Nº: ${
              paidInv.receiptNumber || paidInv.invoiceNumber
            }. Obrigado pela colaboração.`
          : `Caro(a) Encarregado(a) ${student.guardianName}, a situação financeira do(a) estudante ${student.fullName} (${meta.className} · ${meta.subsystemLabel}) encontra-se regularizada na Tesouraria da ${currentInstitution.name}.`
      };
    }

    if (templateId === 'outros_emolumentos') {
      const otherInv =
        inv ||
        stuPending.find((i) => inferCategory(i) === 'outros') ||
        stuPending[0];
      return {
        title: otherInv
          ? `Cobrança de Emolumento: ${otherInv.description}`
          : 'Aviso de Emolumentos / Taxas Escolares',
        notifType: 'emolumento_outros',
        message: otherInv
          ? `Estimado(a) Encarregado(a) ${student.guardianName}, informamos que se encontra em aberto na Tesouraria da ${currentInstitution.name} o pagamento de "${otherInv.description}" (${otherInv.monthReference}) do(a) aluno(a) ${student.fullName} (${meta.className}), no valor de ${formatKwanza(
              otherInv.balanceAoa
            )}. Entidade Multicaixa: ${entity} · Referência: ${
              otherInv.multicaixaReference || targetRef
            } · Vencimento: ${otherInv.dueDate}.`
          : `Estimado(a) Encarregado(a) ${student.guardianName}, solicitamos a regularização da Taxa/Emolumento escolar (${formatKwanza(
              student.enrollmentAmountAoa || 15000
            )}) do(a) estudante ${student.fullName} (${meta.className} · ${meta.subsystemLabel}) junto da Tesouraria da ${currentInstitution.name}.`
      };
    }

    if (templateId === 'atraso_urgente') {
      const targetInvoices = stuOverdue.length > 0 ? stuOverdue : stuPending;
      const monthsText =
        inv && inv.status !== 'pago'
          ? `${inv.description} (${inv.monthReference})`
          : targetInvoices.length > 0
          ? targetInvoices.map((i) => i.monthReference).join(', ')
          : 'Mensalidades em atraso';
      const amountDue =
        inv && inv.status !== 'pago'
          ? inv.balanceAoa
          : totalOverdue > 0
          ? totalOverdue
          : totalPending;
      const days = getDaysOverdue(inv?.dueDate || stuOverdue[0]?.dueDate);

      return {
        title: `Aviso de Propina em Atraso — ${student.fullName}`,
        notifType: 'aviso_atraso',
        message: `Estimado(a) Encarregado(a) ${student.guardianName}, a Tesouraria da ${currentInstitution.name} comunica que o(a) estudante ${student.fullName} (Proc. ${student.processNumber} · ${meta.className} · ${meta.subsystemLabel}) possui valores vencidos em atraso${
          days > 0 ? ` há ${days} dia(s)` : ''
        }, referente a: ${monthsText}, no montante total de ${formatKwanza(
          amountDue
        )}. Solicitamos a regularização urgente via Multicaixa (Entidade: ${entity} · Ref.: ${targetRef}) ou presencialmente na Tesouraria.`
      };
    }

    // lembrete_amigavel
    const dueInv = inv || stuPending[0];
    return {
      title: dueInv
        ? `Lembrete de Pagamento: ${dueInv.monthReference}`
        : `Lembrete de Propina — ${student.fullName}`,
      notifType: 'cobranca_pendente',
      message: dueInv
        ? `Estimado(a) Encarregado(a) ${student.guardianName}, lembramos que a "${dueInv.description}" (${dueInv.monthReference}) do(a) estudante ${student.fullName} (${meta.className} · ${meta.subsystemLabel}) no valor de ${formatKwanza(
            dueInv.balanceAoa
          )} vence em ${dueInv.dueDate}. Pagamento via Multicaixa: Entidade ${entity} · Referência: ${
            dueInv.multicaixaReference || targetRef
          }.`
        : `Estimado(a) Encarregado(a) ${student.guardianName}, este é um lembrete amigável da Tesouraria da ${currentInstitution.name} referente às propinas do(a) estudante ${student.fullName} (${meta.className}).`
    };
  };

  const openNotificationModalFor = (
    student?: Student,
    invoice?: Invoice,
    preferredTemplate?: MessageTemplateOption['id']
  ) => {
    if (!guardTreasurerAction()) return;
    const targetStu =
      student ||
      (studentFilter !== 'todos' ? instStudents.find((s) => s.id === studentFilter) : undefined) ||
      instStudents[0];

    const autoTemplate: MessageTemplateOption['id'] =
      preferredTemplate ||
      (invoice?.status === 'pago'
        ? 'confirmacao_recibo'
        : invoice && isInvoiceOverdue(invoice)
        ? 'atraso_urgente'
        : invoice && inferCategory(invoice) === 'outros'
        ? 'outros_emolumentos'
        : targetStu && instInvoices.some((i) => i.studentId === targetStu.id && isInvoiceOverdue(i))
        ? 'atraso_urgente'
        : 'lembrete_amigavel');

    const built = buildTemplateMessage(autoTemplate, targetStu, invoice);

    setNotifMode('individual');
    if (targetStu) setNotifStudentId(targetStu.id);
    setNotifInvoiceId(invoice?.id);
    setSelectedTemplateId(autoTemplate);
    setNotifType(built.notifType);
    setNotifTarget('ambos');
    setNotifTitle(built.title);
    setNotifMessage(built.message);
    setIsNotifModalOpen(true);
  };

  const handleSendNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardTreasurerAction() || !onSendFinancialNotification) return;

    if (notifMode === 'lote_dividas') {
      const entity = currentInstitution.bankAccount?.multicaixaEntity || '00142';
      const debtorInvoices = instInvoices.filter(
        (i) => i.status !== 'pago' && i.balanceAoa > 0 && studentMatchesHierarchy(studentById.get(i.studentId))
      );
      const items: SendFinancialNotificationInput[] = [];
      const processedStudents = new Set<string>();

      debtorInvoices.forEach((inv) => {
        if (processedStudents.has(inv.studentId)) return;
        const stu = studentById.get(inv.studentId);
        if (!stu) return;
        processedStudents.add(stu.id);
        const meta = resolveStudentHierarchy(stu);
        const stuTotal = debtorInvoices
          .filter((d) => d.studentId === stu.id)
          .reduce((sum, d) => sum + d.balanceAoa, 0);
        const hasOverdue = debtorInvoices.some(
          (d) => d.studentId === stu.id && isInvoiceOverdue(d)
        );
        items.push({
          studentId: stu.id,
          recipientTarget: notifTarget,
          type: hasOverdue ? 'aviso_atraso' : 'cobranca_pendente',
          category: inferCategory(inv),
          title: hasOverdue
            ? 'Aviso Urgente de Propinas em Atraso'
            : 'Lembrete de Pagamento Pendente',
          message: `Estimado(a) Encarregado(a) ${stu.guardianName}, o estudante ${
            stu.fullName
          } (${meta.className} · ${meta.subsystemLabel}) possui valores em aberto na Tesouraria totalizando ${formatKwanza(
            stuTotal
          )}. Entidade Multicaixa: ${entity} · Ref. principal: ${
            inv.multicaixaReference || '482 910 230'
          }.`,
          amountAoa: stuTotal,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          multicaixaReference: inv.multicaixaReference,
          dueDate: inv.dueDate
        });
      });

      if (items.length === 0) {
        showToast('error', 'Não existem alunos com valores pendentes ou em atraso para o filtro actual.');
        return;
      }

      onSendFinancialNotification(items);
      setIsNotifModalOpen(false);
      showToast(
        'success',
        `Comunicados de cobrança registados para ${items.length} aluno(s) e encarregado(s).`
      );
      return;
    }

    const stu = instStudents.find((s) => s.id === notifStudentId) || instStudents[0];
    if (!stu || !notifMessage.trim()) return;
    const inv = notifInvoiceId ? instInvoices.find((i) => i.id === notifInvoiceId) : undefined;

    onSendFinancialNotification([
      {
        studentId: stu.id,
        recipientTarget: notifTarget,
        type: notifType,
        category: inv ? inferCategory(inv) : undefined,
        title: notifTitle.trim() || 'Comunicado de Cobrança',
        message: notifMessage.trim(),
        amountAoa: inv?.balanceAoa || inv?.totalAoa,
        invoiceId: inv?.id,
        invoiceNumber: inv?.invoiceNumber,
        multicaixaReference: inv?.multicaixaReference,
        dueDate: inv?.dueDate
      }
    ]);
    setIsNotifModalOpen(false);
    showToast(
      'success',
      `Comunicado registado no sistema para ${stu.fullName} e encarregado (${stu.guardianName}).`
    );
  };

  // Telefones do estudante seleccionado no modal de comunicado/cobrança
  const activeModalStudent = useMemo(
    () => instStudents.find((s) => s.id === notifStudentId) || instStudents[0],
    [instStudents, notifStudentId]
  );
  const guardianPhoneMeta = normalizeAngolaPhone(activeModalStudent?.guardianPhone);
  const studentPhoneMeta = normalizeAngolaPhone(activeModalStudent?.phone);

  // Barra reutilizável de Filtros Hierárquicos (Subsistema -> Turma -> Aluno -> Mês)
  const renderHierarchyFilterBar = (showMonthSelect = true) => (
    <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#064e26]">
          <Filter className="w-4 h-4 text-[#067836]" />
          <span>Controlo por Subsistema · Turma · Aluno · Mês</span>
        </div>
        {(subsystemFilter !== 'todos' ||
          classFilter !== 'todas' ||
          studentFilter !== 'todos' ||
          monthFilter !== 'todos' ||
          searchTerm !== '') && (
          <button
            type="button"
            onClick={resetHierarchyFilters}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#067836] hover:bg-[#eaf6ee] px-2.5 py-1 rounded-lg border border-[#cde6d5] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
        {/* Pesquisa livre */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#067836] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar aluno, proc., factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f7fbf8] text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-medium"
          />
        </div>

        {/* Subsistema por Subsistema */}
        <select
          aria-label="Filtrar por Subsistema"
          value={subsystemFilter}
          onChange={(e) => {
            setSubsystemFilter(e.target.value as 'todos' | EducationSubsystemCode);
            setClassFilter('todas');
            setStudentFilter('todos');
          }}
          className="bg-[#f7fbf8] text-slate-800 text-xs rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-semibold"
        >
          <option value="todos">Todos os Subsistemas ({availableSubsystems.length})</option>
          {availableSubsystems.map((sub) => (
            <option key={sub.code} value={sub.code}>
              {sub.shortName} · {sub.name}
            </option>
          ))}
        </select>

        {/* Turma por Turma */}
        <select
          aria-label="Filtrar por Turma"
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setStudentFilter('todos');
          }}
          className="bg-[#f7fbf8] text-slate-800 text-xs rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-semibold"
        >
          <option value="todas">Todas as Turmas ({filteredClassOptions.length})</option>
          {filteredClassOptions.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.gradeLevel})
            </option>
          ))}
        </select>

        {/* Aluno por Aluno */}
        <select
          aria-label="Filtrar Aluno por Aluno"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="bg-[#f7fbf8] text-slate-800 text-xs rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-semibold"
        >
          <option value="todos">Todos os Alunos ({filteredStudentOptions.length})</option>
          {filteredStudentOptions.map((stu) => (
            <option key={stu.id} value={stu.id}>
              {stu.fullName} ({stu.processNumber})
            </option>
          ))}
        </select>

        {/* Mês de Referência */}
        {showMonthSelect && (
          <select
            aria-label="Filtrar por Mês"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-[#f7fbf8] text-slate-800 text-xs rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-semibold"
          >
            <option value="todos">Todos os Meses</option>
            {ACADEMIC_MONTHS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 1. CABEÇALHO PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Tesouraria &amp; Controlo Financeiro Escolar (AOA)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Propinas, Outros Pagamentos, Controlo Mensal, Alunos em Atraso &amp; Cobranças WhatsApp/SMS ·{' '}
            {currentInstitution.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!isTreasurer}
            onClick={() => openNotificationModalFor(undefined, undefined, 'atraso_urgente')}
            className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition ${
              isTreasurer
                ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title={
              isTreasurer
                ? 'Enviar comunicado pré-elaborado com redireccionamento WhatsApp / SMS'
                : 'Acção exclusiva do Tesoureiro'
            }
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comunicados &amp; WhatsApp/SMS</span>
          </button>

          <button
            type="button"
            disabled={!isTreasurer}
            onClick={() => openRegisterModal('propina')}
            className={`inline-flex items-center space-x-1.5 font-bold text-xs px-4 py-2 rounded-xl shadow-2xs transition ${
              isTreasurer
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white cursor-pointer'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
            title={
              isTreasurer
                ? 'Registar Pagamento de Propina ou Outros Emolumentos'
                : 'Registo exclusivo do Tesoureiro'
            }
          >
            {isTreasurer ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Registar Pagamento</span>
          </button>
        </div>
      </div>

      {/* BANNER RBAC DO TESOUREIRO */}
      {isTreasurer ? (
        <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#064e26]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#067836] shrink-0" />
            <div>
              <strong className="font-bold block sm:inline">
                Perfil Tesoureiro Activo — Controlo Financeiro &amp; Cobranças:
              </strong>{' '}
              <span>
                Pode registar propinas e outros pagamentos, controlar mensalidades por aluno, turma e
                subsistema, acompanhar atrasos e enviar comunicados via WhatsApp ou SMS. Criação de
                turmas, matrículas e cadastro de utilizadores permanecem exclusivos da Administração.
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-white border border-[#cde6d5] text-[#067836] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap self-start sm:self-auto">
            Tesouraria Exclusiva
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">Modo de Consulta Apenas:</strong> O registo de pagamentos
              (propinas e outros), liquidação de facturas e envio de cobranças aos alunos ou
              encarregados é responsabilidade exclusiva do <strong>Tesoureiro</strong>.
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-800 font-semibold px-2.5 py-1 rounded-xl whitespace-nowrap self-start sm:self-auto">
            Somente Leitura
          </span>
        </div>
      )}

      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="font-bold px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. CARTÕES KPI FINANCEIROS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Total Facturado</span>
            <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5 truncate">
              {formatKwanza(totalBilled)}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              {countByCat.propina} prop. · {countByCat.matricula} tax. · {countByCat.outros} out.
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Valores Cobrados</span>
            <div className="font-display text-lg sm:text-xl font-extrabold text-[#067836] tabular-nums mt-0.5 truncate">
              {formatKwanza(totalPaid)}
            </div>
            <span className="text-[11px] text-[#067836] font-medium block mt-0.5">
              {totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0}% liquidado
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveSection('atrasos')}
          className="bg-white rounded-2xl border border-[#dce7df] hover:border-red-300 p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5 cursor-pointer transition"
          title="Clique para visualizar os alunos em atraso"
        >
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Valores em Atraso / Dívida</span>
            <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5 truncate">
              {formatKwanza(totalOutstanding)}
            </div>
            <span className="text-[11px] text-red-600 font-bold block mt-0.5">
              {totalOverdueStudentsCount} aluno(s) em atraso · Ver lista →
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Comunicados Enviados</span>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              {instNotifications.length}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {instNotifications.filter((n) => n.isRead).length} lido(s) ·{' '}
              {instNotifications.filter((n) => !n.isRead).length} por ler
            </span>
          </div>
        </div>
      </div>

      {/* 3. SEPARADORES FUNCIONAIS DA TESOURARIA */}
      <div className="bg-white rounded-2xl border border-[#dce7df] p-2 shadow-2xs">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSection('lancamentos')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'lancamentos'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Propinas &amp; Outros ({instInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('controlo_mensal')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'controlo_mensal'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Controlo Mensal ({instStudents.length} alunos)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('atrasos')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'atrasos'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-red-700 bg-red-50/70 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Alunos em Atraso ({totalOverdueStudentsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('matriculas')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'matriculas'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>
              Taxas de Matrícula ({instStudents.filter((s) => !s.enrollmentFeePaid).length} pendentes)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('notificacoes')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'notificacoes'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comunicados &amp; Cobranças ({instNotifications.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          SECÇÃO 1: PROPINAS & OUTROS PAGAMENTOS (FILTRADO POR SUBSISTEMA / TURMA / ALUNO / MÊS)
          ========================================================= */}
      {activeSection === 'lancamentos' && (
        <>
          {renderHierarchyFilterBar(true)}

          <div className="bg-white rounded-2xl p-3 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-wrap items-center justify-between gap-2">
            {/* Filtro por Categoria Financeira */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f3f7f4] border border-[#dce7df] rounded-xl text-xs font-semibold">
              {(
                [
                  { id: 'todas', label: 'Todas Categorias' },
                  { id: 'propina', label: `Propinas (${countByCat.propina})` },
                  { id: 'outros', label: `Outros (${countByCat.outros})` },
                  { id: 'matricula', label: `Taxas Matrícula (${countByCat.matricula})` }
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-white text-[#067836] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filtro por Estado */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f3f7f4] border border-[#dce7df] rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('todos')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Todos ({instInvoices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pago')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'pago' ? 'bg-white text-[#067836] shadow-2xs' : 'text-slate-600'
                }`}
              >
                Pagos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pendente')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'pendente' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('vencido')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'vencido' ? 'bg-white text-red-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Em Atraso
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs sm:text-sm font-bold flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>Registos Financeiros da Instituição ({filteredInvoices.length})</span>
              </h2>
              {isTreasurer && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openRegisterModal('propina')}
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    + Propina
                  </button>
                  <button
                    type="button"
                    onClick={() => openRegisterModal('outros')}
                    className="bg-white text-[#067836] hover:bg-[#eaf6ee] text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    + Outros Pagamentos
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-slate-500 uppercase font-semibold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Factura Nº</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Aluno / Turma / Subsistema</th>
                    <th className="py-3 px-4">Descrição / Mês</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Em Dívida</th>
                    <th className="py-3 px-4 text-center">Ref. MCX</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-500">
                        Nenhum registo financeiro encontrado para os filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const cat = inferCategory(inv);
                      const badge = categoryBadge(cat);
                      const stu = studentById.get(inv.studentId);
                      const meta = resolveStudentHierarchy(stu);
                      const overdue = isInvoiceOverdue(inv);
                      const gPhone = normalizeAngolaPhone(stu?.guardianPhone);
                      const quickMsg = buildTemplateMessage(
                        overdue ? 'atraso_urgente' : 'lembrete_amigavel',
                        stu,
                        inv
                      ).message;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${badge.classes}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{inv.studentName}</div>
                            <div className="text-[11px] text-slate-500">
                              <span className="font-mono">Proc: {inv.studentProcessNumber}</span> ·{' '}
                              <span className="font-semibold text-slate-700">{meta.className}</span> ·{' '}
                              <span className="text-[#067836] font-semibold">{meta.subsystemLabel}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{inv.description}</span>
                            <span className="text-[11px] text-slate-500">
                              {inv.monthReference}
                              {inv.registeredByName ? ` · Por: ${inv.registeredByName}` : ''}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600 font-mono">
                            <div>{inv.dueDate}</div>
                            {overdue && (
                              <span className="text-[10px] font-bold text-red-600">
                                {getDaysOverdue(inv.dueDate)}d atraso
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                            {formatKwanza(inv.totalAoa)}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-red-600 tabular-nums">
                            {formatKwanza(inv.balanceAoa)}
                          </td>

                          <td className="py-3 px-4 text-center font-mono">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-800">
                              {inv.multicaixaReference || generateMulticaixaReference(inv.id)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 text-xs font-semibold ${
                                inv.status === 'pago'
                                  ? 'text-emerald-700'
                                  : overdue
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  inv.status === 'pago'
                                    ? 'bg-emerald-500'
                                    : overdue
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span>
                                {inv.status === 'pago'
                                  ? 'Pago'
                                  : overdue
                                  ? 'Em Atraso'
                                  : 'Pendente'}
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {inv.status !== 'pago' ? (
                                <button
                                  type="button"
                                  disabled={!isTreasurer}
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition ${
                                    isTreasurer
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs cursor-pointer'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  }`}
                                >
                                  {isTreasurer ? (
                                    <CreditCard className="w-3.5 h-3.5" />
                                  ) : (
                                    <Lock className="w-3 h-3" />
                                  )}
                                  <span>Liquidar</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewingReceiptInvoice(inv)}
                                  className="inline-flex items-center space-x-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
                                  title="Ver Recibo Oficial com QR Code"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Recibo</span>
                                </button>
                              )}

                              {isTreasurer && gPhone && inv.status !== 'pago' && (
                                <a
                                  href={buildWhatsAppHref(gPhone.waDigits, quickMsg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                                  title={`Enviar cobrança via WhatsApp para Encarregado (${gPhone.display})`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                type="button"
                                disabled={!isTreasurer}
                                onClick={() => openNotificationModalFor(stu, inv)}
                                className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
                                  isTreasurer
                                    ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer'
                                    : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                }`}
                                title="Abrir comunicado pré-elaborado (Sistema / WhatsApp / SMS)"
                              >
                                <Send className="w-3 h-3" />
                                <span>Cobrar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =========================================================
          SECÇÃO 2: CONTROLO MENSAL (ALUNO POR ALUNO · TURMA POR TURMA · SUBSISTEMA POR SUBSISTEMA)
          ========================================================= */}
      {activeSection === 'controlo_mensal' && (
        <div className="space-y-4">
          {renderHierarchyFilterBar(false)}

          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    Controlo Mensal de Propinas ({filteredMatrixStudents.length} estudante(s))
                  </span>
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Clique num mês pago para ver o recibo, num mês em atraso/pendente para liquidar, ou
                  em &ldquo;+&rdquo; para registar o pagamento mensal do aluno.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-white/15 border border-white/25">✓ Pago</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/80">Pendente</span>
                <span className="px-2 py-0.5 rounded bg-red-600">Em Atraso</span>
                <span className="px-2 py-0.5 rounded bg-white/10">+ Registar</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1120px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-slate-600 uppercase font-bold border-b border-[#dce7df]">
                    <th className="py-3 px-3.5 sticky left-0 bg-[#f7fbf8] z-10 min-w-[220px]">
                      Aluno / Turma / Subsistema
                    </th>
                    {ACADEMIC_MONTHS.map((m) => (
                      <th key={m.key} className="py-3 px-2 text-center whitespace-nowrap">
                        {m.short}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right whitespace-nowrap">Em Dívida</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMatrixStudents.length === 0 ? (
                    <tr>
                      <td colSpan={ACADEMIC_MONTHS.length + 3} className="py-10 text-center text-slate-500">
                        Nenhum aluno encontrado para este subsistema ou turma.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrixStudents.map((stu) => {
                      const meta = resolveStudentHierarchy(stu);
                      const stuPropinas = instInvoices.filter(
                        (i) => i.studentId === stu.id && inferCategory(i) === 'propina'
                      );
                      const stuTotalDebt = instInvoices
                        .filter((i) => i.studentId === stu.id && i.status !== 'pago')
                        .reduce((s, i) => s + i.balanceAoa, 0);

                      return (
                        <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3.5 sticky left-0 bg-white z-10 border-r border-slate-100">
                            <div className="font-bold text-slate-900 truncate max-w-[210px]">
                              {stu.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[210px]">
                              <span className="font-mono">{stu.processNumber}</span> ·{' '}
                              <strong className="text-slate-700">{meta.className}</strong> ·{' '}
                              <span className="text-[#067836] font-semibold">{meta.subsystemLabel}</span>
                            </div>
                          </td>

                          {ACADEMIC_MONTHS.map((m) => {
                            const matched = stuPropinas.find(
                              (inv) => matchAcademicMonthKey(inv.monthReference) === m.key
                            );

                            if (!matched) {
                              return (
                                <td key={m.key} className="py-2 px-1 text-center">
                                  <button
                                    type="button"
                                    disabled={!isTreasurer}
                                    onClick={() =>
                                      openRegisterModal('propina', stu.id, {
                                        label: m.label,
                                        defaultDue: m.defaultDue,
                                        markPaid: true
                                      })
                                    }
                                    className={`w-8 h-7 rounded-lg text-[11px] font-bold border border-dashed transition inline-flex items-center justify-center ${
                                      isTreasurer
                                        ? 'border-slate-300 text-slate-400 hover:border-[#067836] hover:text-[#067836] hover:bg-[#eaf6ee] cursor-pointer'
                                        : 'border-slate-200 text-slate-300 cursor-not-allowed'
                                    }`}
                                    title={`Registar propina de ${m.label} para ${stu.fullName}`}
                                  >
                                    +
                                  </button>
                                </td>
                              );
                            }

                            const overdue = isInvoiceOverdue(matched);
                            if (matched.status === 'pago') {
                              return (
                                <td key={m.key} className="py-2 px-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setViewingReceiptInvoice(matched)}
                                    className="w-8 h-7 rounded-lg bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] text-[11px] font-bold inline-flex items-center justify-center cursor-pointer"
                                    title={`${m.label} Pago (${formatKwanza(matched.amountPaidAoa)}) · Ver recibo`}
                                  >
                                    ✓
                                  </button>
                                </td>
                              );
                            }

                            return (
                              <td key={m.key} className="py-2 px-1 text-center">
                                <button
                                  type="button"
                                  disabled={!isTreasurer}
                                  onClick={() => handleOpenPaymentModal(matched)}
                                  className={`w-8 h-7 rounded-lg text-[10px] font-extrabold border inline-flex items-center justify-center transition ${
                                    overdue
                                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                  } ${isTreasurer ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                                  title={`${m.label} ${overdue ? 'EM ATRASO' : 'Pendente'} (${formatKwanza(
                                    matched.balanceAoa
                                  )}) · Clique para liquidar`}
                                >
                                  {overdue ? '!' : '•'}
                                </button>
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap">
                            {stuTotalDebt > 0 ? (
                              <span className="text-red-600">{formatKwanza(stuTotalDebt)}</span>
                            ) : (
                              <span className="text-[#067836]">Em Dia</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={!isTreasurer}
                              onClick={() =>
                                openNotificationModalFor(
                                  stu,
                                  undefined,
                                  stuTotalDebt > 0 ? 'atraso_urgente' : 'confirmacao_recibo'
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                isTreasurer
                                  ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <Send className="w-3 h-3" />
                              <span>Cobrar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SECÇÃO 3: ALUNOS EM ATRASO (COBRANÇA & REDIRECCIONAMENTO WHATSAPP / SMS)
          ========================================================= */}
      {activeSection === 'atrasos' && (
        <div className="space-y-4">
          {renderHierarchyFilterBar(true)}

          <div className="bg-white rounded-2xl border border-red-200 shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Alunos com Propinas ou Taxas em Atraso ({overdueStudentsList.length} estudante(s))
                  </span>
                </h2>
                <p className="text-xs text-red-100 mt-0.5">
                  Acompanhe valores vencidos por subsistema, turma e mês e envie comunicados manuais
                  pelo WhatsApp ou SMS do aluno ou do encarregado.
                </p>
              </div>
              {isTreasurer && overdueStudentsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setNotifMode('lote_dividas');
                    setNotifTarget('ambos');
                    setIsNotifModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Notificar Todos no Sistema</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {overdueStudentsList.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-700">
                    Nenhum aluno com atrasos encontrado para os filtros actuais.
                  </p>
                </div>
              ) : (
                overdueStudentsList.map((entry) => {
                  const { student: stu, overdueInvoices, totalOverdueAoa, oldestDueDate, maxDaysOverdue } = entry;
                  const meta = resolveStudentHierarchy(stu);
                  const gPhone = normalizeAngolaPhone(stu.guardianPhone);
                  const sPhone = normalizeAngolaPhone(stu.phone);
                  const draftMsg = buildTemplateMessage('atraso_urgente', stu, overdueInvoices[0]).message;

                  return (
                    <div
                      key={stu.id}
                      className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-red-50/25 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{stu.fullName}</span>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            Proc. {stu.processNumber}
                          </span>
                          <span className="text-[11px] font-bold bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] px-2 py-0.5 rounded">
                            {meta.subsystemLabel} · {meta.className}
                          </span>
                          <span className="text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded">
                            {maxDaysOverdue > 0 ? `${maxDaysOverdue} dia(s) em atraso` : 'Vencido'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>
                            <strong>Encarregado:</strong> {stu.guardianName}
                            {gPhone ? ` (${gPhone.display})` : ' (Sem telefone)'}
                          </span>
                          {sPhone && (
                            <span>
                              · <strong>Tel. Aluno:</strong> {sPhone.display}
                            </span>
                          )}
                          <span>
                            · <strong>Vencimento mais antigo:</strong>{' '}
                            <span className="font-mono">{oldestDueDate}</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {overdueInvoices.map((inv) => (
                            <span
                              key={inv.id}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-red-200 text-red-800 px-2 py-0.5 rounded-md"
                            >
                              <span>{inv.monthReference}</span>
                              <span className="font-bold tabular-nums">
                                ({formatKwanza(inv.balanceAoa)})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end gap-2.5 shrink-0">
                        <div className="text-left xl:text-right">
                          <span className="text-[11px] text-slate-500 block">Total em Atraso</span>
                          <span className="font-display text-lg font-extrabold text-red-700 tabular-nums">
                            {formatKwanza(totalOverdueAoa)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!isTreasurer}
                            onClick={() => handleOpenPaymentModal(overdueInvoices[0])}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              isTreasurer
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Liquidar</span>
                          </button>

                          {isTreasurer && gPhone && (
                            <>
                              <a
                                href={buildWhatsAppHref(gPhone.waDigits, draftMsg)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] transition"
                                title={`Abrir WhatsApp do Encarregado (${gPhone.display})`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Enc.</span>
                              </a>
                              <a
                                href={buildSmsHref(gPhone.smsTarget, draftMsg)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition"
                                title={`Abrir SMS do Encarregado (${gPhone.display})`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>SMS Enc.</span>
                              </a>
                            </>
                          )}

                          {isTreasurer && sPhone && (
                            <a
                              href={buildWhatsAppHref(sPhone.waDigits, draftMsg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                              title={`Abrir WhatsApp do Aluno (${sPhone.display})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Aluno</span>
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={!isTreasurer}
                            onClick={() =>
                              openNotificationModalFor(stu, overdueInvoices[0], 'atraso_urgente')
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                              isTreasurer
                                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer'
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            <span>Editar / Enviar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SECÇÃO 4: TAXAS DE MATRÍCULA (APENAS REGISTO DE PAGAMENTO PELO TESOUREIRO)
          ========================================================= */}
      {activeSection === 'matriculas' && (
        <div className="space-y-4">
          {renderHierarchyFilterBar(false)}

          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    Pagamentos de Taxas de Matrícula ({filteredMatrixStudents.length} aluno(s))
                  </span>
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Registo exclusivo de pagamento/confirmação da taxa de matrícula. A matrícula
                  académica dos alunos e criação de turmas é exclusiva da Administração Escolar.
                </p>
              </div>
              {isTreasurer && (
                <button
                  type="button"
                  onClick={() => openRegisterModal('matricula')}
                  className="inline-flex items-center gap-1.5 bg-white text-[#067836] hover:bg-[#eaf6ee] text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registar Pagamento de Taxa</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-slate-500 uppercase font-semibold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Aluno / Processo</th>
                    <th className="py-3 px-4">Subsistema / Turma / Classe</th>
                    <th className="py-3 px-4">Encarregado / Telefone</th>
                    <th className="py-3 px-4 text-right">Taxa</th>
                    <th className="py-3 px-4 text-center">Recibo Matrícula</th>
                    <th className="py-3 px-4 text-center">Situação na Tesouraria</th>
                    <th className="py-3 px-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMatrixStudents.map((stu) => {
                    const isPaid = Boolean(stu.enrollmentFeePaid);
                    const meta = resolveStudentHierarchy(stu);
                    return (
                      <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{stu.fullName}</div>
                          <div className="font-mono text-[11px] text-slate-400">
                            Proc: {stu.processNumber}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{meta.className}</div>
                          <div className="text-[11px] text-slate-500">
                            {meta.gradeLevel} · <span className="text-[#067836] font-semibold">{meta.subsystemLabel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{stu.guardianName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{stu.guardianPhone}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">
                          {formatKwanza(stu.enrollmentAmountAoa || 15000)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px]">
                          {stu.enrollmentReceiptNumber || 'Aguardando Tesouraria'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isPaid ? 'Liquidada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {!isPaid && (
                              <button
                                type="button"
                                disabled={!isTreasurer}
                                onClick={() => openRegisterModal('matricula', stu.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                  isTreasurer
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {isTreasurer ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3 h-3" />
                                )}
                                <span>Registar Pagamento</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!isTreasurer}
                              onClick={() =>
                                openNotificationModalFor(
                                  stu,
                                  undefined,
                                  isPaid ? 'confirmacao_recibo' : 'outros_emolumentos'
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                                isTreasurer
                                  ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer'
                                  : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <Send className="w-3 h-3" />
                              <span>Cobrar</span>
                            </button>
                          </div>
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
          SECÇÃO 5: COMUNICADOS PRÉ-ELABORADOS & REDIRECCIONAMENTO WHATSAPP / SMS
          ========================================================= */}
      {activeSection === 'notificacoes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] overflow-hidden shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Sistema de Cobranças: Mensagens Pré-Elaboradas · WhatsApp &amp; SMS</span>
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Escolha um modelo pré-elaborado abaixo ou redija uma cobrança com redireccionamento
                  manual directo para o WhatsApp ou SMS do Aluno ou Encarregado.
                </p>
              </div>

              {isTreasurer && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotifMode('lote_dividas');
                      setNotifTarget('ambos');
                      setIsNotifModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Notificar Todos com Dívidas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openNotificationModalFor(undefined, undefined, 'atraso_urgente')}
                    className="inline-flex items-center gap-1.5 bg-white text-[#067836] hover:bg-[#eaf6ee] text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Novo Comunicado / WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cartões de Modelos Pré-Elaborados */}
            {isTreasurer && (
              <div className="p-4 bg-[#f7fbf8] border-b border-[#dce7df] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {COLLECTION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => openNotificationModalFor(undefined, undefined, tpl.id)}
                    className="text-left p-3 rounded-xl bg-white border border-[#cde6d5] hover:border-[#067836] hover:shadow-xs transition cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#064e26]">{tpl.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eaf6ee] text-[#055827]">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{tpl.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {instNotifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#dce7df] p-8 text-center text-xs text-slate-500">
                Nenhum comunicado de cobrança registado até ao momento.
              </div>
            ) : (
              instNotifications.map((notif) => {
                const badge = notifTypeLabel(notif.type);
                const stu = studentById.get(notif.studentId);
                const gPhone = normalizeAngolaPhone(notif.guardianPhone || stu?.guardianPhone);
                const sPhone = normalizeAngolaPhone(stu?.phone);

                return (
                  <div
                    key={notif.id}
                    className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col md:flex-row md:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {notif.title}
                        </span>
                        {notif.amountAoa !== undefined && (
                          <span className="font-mono text-xs font-bold text-[#055827] bg-[#eaf6ee] border border-[#cde6d5] px-2 py-0.5 rounded-md">
                            {formatKwanza(notif.amountAoa)}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 leading-relaxed">{notif.message}</div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                        <span>
                          <strong>Estudante:</strong> {notif.studentName} ({notif.studentProcessNumber})
                        </span>
                        {notif.guardianName && (
                          <span>
                            <strong>Encarregado:</strong> {notif.guardianName}
                          </span>
                        )}
                        <span>
                          <strong>Destinatário:</strong>{' '}
                          {notif.recipientTarget === 'ambos'
                            ? 'Aluno e Encarregado'
                            : notif.recipientTarget === 'encarregado'
                            ? 'Encarregado'
                            : 'Aluno'}
                        </span>
                        <span>
                          <strong>Enviado por:</strong> {notif.sentByName} ({notif.sentByRole})
                        </span>
                      </div>

                      {isTreasurer && (gPhone || sPhone) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {gPhone && (
                            <>
                              <a
                                href={buildWhatsAppHref(gPhone.waDigits, notif.message)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] transition"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Encarregado</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <a
                                href={buildSmsHref(gPhone.smsTarget, notif.message)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>SMS Encarregado</span>
                              </a>
                            </>
                          )}
                          {sPhone && (
                            <>
                              <a
                                href={buildWhatsAppHref(sPhone.waDigits, notif.message)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp Aluno</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <a
                                href={buildSmsHref(sPhone.smsTarget, notif.message)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>SMS Aluno</span>
                              </a>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          notif.isRead
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {notif.isRead ? (
                          <>
                            <MailCheck className="w-3.5 h-3.5" />
                            <span>Lida no Portal</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Aguardando Leitura</span>
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(notif.sentAt).toLocaleDateString('pt-AO')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL RECIBO OFICIAL COM QR CODE
          ========================================================= */}
      {viewingReceiptInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Recibo Oficial de Pagamento (Angola)</span>
              </h3>
              <button
                onClick={() => setViewingReceiptInvoice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={receiptRef}
              className="official-document-sheet mt-4 p-5 bg-white rounded-xl border border-slate-300 space-y-3 text-black"
            >
              <div className="text-center pb-2 border-b border-slate-900">
                <OfficialDocumentHeader
                  institution={currentInstitution}
                  insigniaClassName="h-12 w-auto mx-auto object-contain"
                  extraMeta={
                    <span className="font-bold block pt-1">
                      Recibo N.º {viewingReceiptInvoice.receiptNumber || 'RC-2026/0742'}
                    </span>
                  }
                />
              </div>

              <div className="space-y-1">
                <div>
                  Recebemos de: <strong className="text-slate-900">{viewingReceiptInvoice.studentName}</strong>
                </div>
                <div>
                  Nº de Processo:{' '}
                  <strong className="font-mono">{viewingReceiptInvoice.studentProcessNumber}</strong>
                </div>
                <div>
                  A quantia de:{' '}
                  <strong className="text-emerald-700 text-sm tabular-nums">
                    {formatKwanza(viewingReceiptInvoice.amountPaidAoa)}
                  </strong>
                </div>
                <div>
                  Referente a: <strong>{viewingReceiptInvoice.description}</strong> (
                  {viewingReceiptInvoice.monthReference})
                </div>
                <div>
                  Método de Pagamento:{' '}
                  <strong className="capitalize">
                    {viewingReceiptInvoice.paymentMethod?.replace('_', ' ') || 'Multicaixa Express'}
                  </strong>
                </div>
                <div>
                  Referência da Transacção:{' '}
                  <strong className="font-mono">
                    {viewingReceiptInvoice.multicaixaReference || 'MCX-2026-9041'}
                  </strong>
                </div>
                <div>
                  Local e Data da Liquidação:{' '}
                  <strong>
                    {currentInstitution?.municipality || 'Angola'}
                    {currentInstitution?.province ? `, ${currentInstitution.province}` : ''} ·{' '}
                    {formatAngolaDate(viewingReceiptInvoice.paidAt || new Date().toISOString())}
                  </strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <QrCodeView
                    value={`RECIBO-${viewingReceiptInvoice.invoiceNumber}-${viewingReceiptInvoice.amountPaidAoa}Kz`}
                    size={65}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">Autenticação Digital</span>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-600 font-medium">
                    O Tesoureiro ({viewingReceiptInvoice.registeredByName || 'Tesouraria'})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <button
                onClick={() => setViewingReceiptInvoice(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
              <DocumentExportBar
                targetRef={receiptRef}
                filename={`Recibo_${viewingReceiptInvoice.receiptNumber || viewingReceiptInvoice.invoiceNumber}`}
                documentTitle={`Recibo Oficial ${viewingReceiptInvoice.receiptNumber || viewingReceiptInvoice.invoiceNumber}`}
                defaultFormat="A5"
                defaultOrientation="portrait"
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL REGISTO EXCLUSIVO DO TESOUREIRO (PROPINAS / OUTROS / TAXA MATRÍCULA)
          ========================================================= */}
      {isRegisterModalOpen && isTreasurer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>Registar Pagamento (Tesouraria)</span>
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFinancialRecord} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Categoria do Pagamento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'propina', label: 'Propinas' },
                      { id: 'outros', label: 'Outros' },
                      { id: 'matricula', label: 'Taxa Matrícula' }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setRegCategory(cat.id);
                        if (cat.id === 'propina') {
                          setRegDescription('Propina Mensal');
                          setRegAmount(35000);
                          setRegMarkPaid(false);
                        } else if (cat.id === 'matricula') {
                          setRegDescription('Taxa de Matrícula Anual 2026/2027');
                          setRegMonth('Ano Lectivo 2026/2027');
                          setRegAmount(15000);
                          setRegMarkPaid(true);
                        } else {
                          setRegDescription('Emolumento: Declaração Escolar c/ Notas');
                          setRegAmount(5000);
                          setRegMarkPaid(false);
                        }
                      }}
                      className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                        regCategory === cat.id
                          ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white border-[#067836]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#eaf6ee]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Seleccione o Aluno (já matriculado pela Administração) *
                </label>
                <select
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold"
                >
                  {instStudents.map((s) => {
                    const meta = resolveStudentHierarchy(s);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.processNumber} · {meta.className} · {meta.subsystemLabel})
                      </option>
                    );
                  })}
                </select>
              </div>

              {regCategory === 'outros' && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    Atalhos Rápidos (Outros Pagamentos / Emolumentos):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {OTHER_FEE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setRegDescription(`Emolumento: ${preset.label}`);
                          setRegAmount(preset.amount);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#f3f7f4] hover:bg-[#eaf6ee] hover:text-[#067836] border border-[#dce7df] text-[11px] font-medium cursor-pointer"
                      >
                        {preset.label} ({formatKwanza(preset.amount)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {regCategory === 'matricula' ? (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tipo de Taxa de Matrícula *
                  </label>
                  <select
                    value={regEnrollmentType}
                    onChange={(e) => setRegEnrollmentType(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                  >
                    <option value="matricula_nova">Taxa de Matrícula Inicial</option>
                    <option value="confirmacao_matricula">Taxa de Confirmação Anual</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Descrição do Registo Financeiro *
                  </label>
                  <input
                    type="text"
                    required
                    value={regDescription}
                    onChange={(e) => setRegDescription(e.target.value)}
                    placeholder="Ex: Propina Mensal, Declaração, Certificado, Exame..."
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Referência / Mês
                  </label>
                  {regCategory === 'propina' ? (
                    <select
                      value={regMonth}
                      onChange={(e) => {
                        const found = ACADEMIC_MONTHS.find((m) => m.label === e.target.value);
                        setRegMonth(e.target.value);
                        if (found) setRegDueDate(found.defaultDue);
                      }}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                    >
                      {ACADEMIC_MONTHS.map((m) => (
                        <option key={m.key} value={m.label}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={regMonth}
                      onChange={(e) => setRegMonth(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                    />
                  )}
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Valor (Kz) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={regAmount}
                    onChange={(e) => setRegAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-900 font-bold rounded-lg px-3 py-2 border border-slate-300 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={regDueDate}
                    onChange={(e) => setRegDueDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regMarkPaid}
                      onChange={(e) => setRegMarkPaid(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Liquidado no acto</span>
                  </label>
                </div>
              </div>

              {regMarkPaid && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <label className="font-semibold text-emerald-900 block mb-1">
                      Método de Pagamento
                    </label>
                    <select
                      value={regMethod}
                      onChange={(e) => setRegMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-white text-slate-800 rounded-lg px-2.5 py-1.5 border border-emerald-200"
                    >
                      <option value="multicaixa_express">Multicaixa Express</option>
                      <option value="tpa_multicaixa">TPA Multicaixa</option>
                      <option value="transferencia_bancaria">Transferência Bancária</option>
                      <option value="deposito_bancario">Depósito Bancário</option>
                      <option value="numerario">Numerário na Tesouraria</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-emerald-900 block mb-1">
                      Referência / Talão
                    </label>
                    <input
                      type="text"
                      value={regRef}
                      onChange={(e) => setRegRef(e.target.value)}
                      className="w-full bg-white text-slate-800 font-mono rounded-lg px-2.5 py-1.5 border border-emerald-200"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl space-y-2">
                <label className="inline-flex items-center gap-2 font-bold text-[#064e26] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regSendNotif}
                    onChange={(e) => setRegSendNotif(e.target.checked)}
                    className="rounded border-[#8cd0a6] text-[#067836] focus:ring-[#16a34a]"
                  />
                  <span>Registar notificação automática para o Aluno / Encarregado</span>
                </label>

                {regSendNotif && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-[#055827]">Destinatário:</span>
                    <select
                      value={regNotifTarget}
                      onChange={(e) => setRegNotifTarget(e.target.value as FinancialNotificationTarget)}
                      className="bg-white border border-[#cde6d5] rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-800"
                    >
                      <option value="ambos">Aluno e Encarregado de Educação</option>
                      <option value="encarregado">Apenas Encarregado de Educação</option>
                      <option value="aluno">Apenas Aluno</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Confirmar Pagamento / Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE LIQUIDAÇÃO (EXCLUSIVO DO TESOUREIRO)
          ========================================================= */}
      {selectedInvoiceForPay && isTreasurer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Liquidar em Kwanza (AOA) · Tesoureiro</span>
              </h3>
              <button
                onClick={() => setSelectedInvoiceForPay(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="mt-4 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500">Estudante:</div>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedInvoiceForPay.studentName}
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1">
                  <span>
                    Factura: <strong>{selectedInvoiceForPay.invoiceNumber}</strong>
                  </span>
                  <span>
                    Ref: <strong>{selectedInvoiceForPay.monthReference}</strong>
                  </span>
                </div>
                <div className="text-right pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Valor em Dívida: </span>
                  <strong className="text-red-600 text-sm tabular-nums">
                    {formatKwanza(selectedInvoiceForPay.balanceAoa)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Valor a Pagar (Kz) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoiceForPay.balanceAoa}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 text-slate-900 font-bold text-base rounded-lg px-3 py-2 border border-slate-300 focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Método de Pagamento *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-50 text-slate-800 font-medium rounded-lg px-3 py-2 border border-slate-300"
                >
                  <option value="multicaixa_express">Multicaixa Express (EMIS)</option>
                  <option value="tpa_multicaixa">Terminal de Pagamento Automático (TPA)</option>
                  <option value="transferencia_bancaria">Transferência Bancária (IBAN)</option>
                  <option value="deposito_bancario">Depósito no Banco (BFA, BAI, BIC)</option>
                  <option value="numerario">Numerário na Tesouraria</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Referência da Transacção / Nº do Comprovativo *
                </label>
                <input
                  type="text"
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 font-mono rounded-lg px-3 py-2 border border-slate-300"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl font-semibold text-[#064e26] cursor-pointer">
                <input
                  type="checkbox"
                  checked={paySendNotif}
                  onChange={(e) => setPaySendNotif(e.target.checked)}
                  className="rounded border-[#8cd0a6] text-[#067836]"
                />
                <span>Notificar Aluno/Encarregado da confirmação do pagamento</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {isProcessing ? 'A Processar...' : 'Confirmar & Emitir Recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE COMUNICADOS PRÉ-ELABORADOS & REDIRECCIONAMENTO MANUAL WHATSAPP / SMS
          ========================================================= */}
      {isNotifModalOpen && isTreasurer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#dce7df] overflow-hidden my-6">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>Comunicados de Cobrança · WhatsApp &amp; SMS</span>
              </h3>
              <button
                onClick={() => setIsNotifModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotificationSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNotifMode('individual')}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                    notifMode === 'individual'
                      ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white border-[#067836]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#eaf6ee]'
                  }`}
                >
                  Aluno Individual (WhatsApp / SMS)
                </button>
                <button
                  type="button"
                  onClick={() => setNotifMode('lote_dividas')}
                  className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                    notifMode === 'lote_dividas'
                      ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white border-[#067836]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#eaf6ee]'
                  }`}
                >
                  Em Lote no Sistema (Dívidas)
                </button>
              </div>

              {notifMode === 'lote_dividas' ? (
                <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-[#064e26] space-y-1.5">
                  <div className="font-bold">Registo Automático Personalizado em Lote</div>
                  <p>
                    O sistema registará uma notificação personalizada no portal com o montante em
                    dívida e referência Multicaixa para todos os estudantes com propinas em atraso
                    ou pendentes segundo os filtros seleccionados.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Estudante / Encarregado *
                    </label>
                    <select
                      value={notifStudentId}
                      onChange={(e) => {
                        const stu = instStudents.find((s) => s.id === e.target.value);
                        setNotifStudentId(e.target.value);
                        setNotifInvoiceId(undefined);
                        const built = buildTemplateMessage(selectedTemplateId, stu);
                        setNotifTitle(built.title);
                        setNotifMessage(built.message);
                        setNotifType(built.notifType);
                      }}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-semibold"
                    >
                      {instStudents.map((s) => {
                        const meta = resolveStudentHierarchy(s);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({meta.className}) · Enc: {s.guardianName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Modelos Pré-Elaborados */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5">
                      Modelo Pré-Elaborado de Cobrança *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {COLLECTION_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(tpl.id);
                            const inv = notifInvoiceId
                              ? instInvoices.find((i) => i.id === notifInvoiceId)
                              : undefined;
                            const built = buildTemplateMessage(tpl.id, activeModalStudent, inv);
                            setNotifType(built.notifType);
                            setNotifTitle(built.title);
                            setNotifMessage(built.message);
                          }}
                          className={`text-left px-2.5 py-2 rounded-xl border transition cursor-pointer ${
                            selectedTemplateId === tpl.id
                              ? 'bg-[#eaf6ee] border-[#067836] text-[#055827] font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{tpl.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                              {tpl.badge}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Assunto *</label>
                      <input
                        type="text"
                        required
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Destinatário no Sistema *
                      </label>
                      <select
                        value={notifTarget}
                        onChange={(e) =>
                          setNotifTarget(e.target.value as FinancialNotificationTarget)
                        }
                        className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                      >
                        <option value="ambos">Aluno e Encarregado</option>
                        <option value="encarregado">Encarregado de Educação</option>
                        <option value="aluno">Apenas Aluno</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Mensagem Pré-Elaborada (Editável) *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 leading-relaxed"
                    />
                  </div>

                  {/* Painel de Redireccionamento Manual WhatsApp / SMS */}
                  <div className="p-3.5 bg-[#f7fbf8] border border-[#cde6d5] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#064e26]">
                        Redireccionamento Manual por WhatsApp ou SMS
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Abre com a mensagem preenchida
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Contactos do Encarregado */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-800 truncate">
                          Encarregado: {activeModalStudent?.guardianName || '—'}
                        </div>
                        {guardianPhoneMeta ? (
                          <>
                            <div className="font-mono text-[10px] text-slate-500">
                              Tel: {guardianPhoneMeta.display}
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <a
                                href={buildWhatsAppHref(guardianPhoneMeta.waDigits, notifMessage)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#067836] hover:bg-[#055827] text-white font-bold text-[11px] transition"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={buildSmsHref(guardianPhoneMeta.smsTarget, notifMessage)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>SMS</span>
                              </a>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 py-1">
                            <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                            <span>Telefone do encarregado não registado na ficha.</span>
                          </div>
                        )}
                      </div>

                      {/* Contactos do Aluno */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-800 truncate">
                          Aluno: {activeModalStudent?.fullName || '—'}
                        </div>
                        {studentPhoneMeta ? (
                          <>
                            <div className="font-mono text-[10px] text-slate-500">
                              Tel: {studentPhoneMeta.display}
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <a
                                href={buildWhatsAppHref(studentPhoneMeta.waDigits, notifMessage)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#067836] hover:bg-[#055827] text-white font-bold text-[11px] transition"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={buildSmsHref(studentPhoneMeta.smsTarget, notifMessage)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>SMS</span>
                              </a>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 py-1">
                            <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                            <span>Telefone directo do aluno não registado.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar Comunicado no Sistema</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
