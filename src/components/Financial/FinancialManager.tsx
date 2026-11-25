/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão Financeira Escolar (Exclusivo do Tesoureiro)
 * Registo de Propinas, Matrículas e Outros Emolumentos + Notificações a Alunos e Encarregados
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
  Users
} from 'lucide-react';
import {
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
    return { label: 'Matrícula', classes: 'bg-sky-50 text-sky-700 border-sky-200' };
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
      return { label: 'Matrícula Confirmada', classes: 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]' };
    case 'confirmacao_pagamento':
      return { label: 'Pagamento Confirmado', classes: 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]' };
    case 'emolumento_outros':
      return { label: 'Outros Emolumentos', classes: 'bg-sky-50 text-sky-700 border-sky-200' };
    default:
      return { label: 'Aviso Geral', classes: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

export const FinancialManager: React.FC<FinancialManagerProps> = ({
  currentInstitution,
  invoices,
  students,
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
  const instNotifications = useMemo(
    () => financialNotifications.filter((n) => n.institutionId === currentInstitution.id),
    [financialNotifications, currentInstitution.id]
  );

  const [activeSection, setActiveSection] = useState<'lancamentos' | 'matriculas' | 'notificacoes'>('lancamentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente' | 'vencido'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | FinancialCategory>('todas');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<Invoice | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(initialOpenModal && isTreasurer);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  // Estado do modal de envio de notificação financeira
  const [notifMode, setNotifMode] = useState<'individual' | 'lote_dividas'>('individual');
  const [notifStudentId, setNotifStudentId] = useState(instStudents[0]?.id || '');
  const [notifTarget, setNotifTarget] = useState<FinancialNotificationTarget>('ambos');
  const [notifType, setNotifType] = useState<FinancialNotificationType>('cobranca_pendente');
  const [notifTitle, setNotifTitle] = useState('Situação Financeira na Tesouraria');
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
        'Acesso Restrito: O registo de finanças e o envio de notificações financeiras são da responsabilidade exclusiva do Tesoureiro.'
      );
      return false;
    }
    return true;
  };

  const filteredInvoices = instInvoices.filter((inv) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      inv.studentName.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.studentProcessNumber.toLowerCase().includes(q) ||
      inv.description.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'todos' || inv.status === statusFilter;
    const cat = inferCategory(inv);
    const matchCategory = categoryFilter === 'todas' || cat === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

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
    studentId?: string
  ) => {
    if (!guardTreasurerAction()) return;
    const targetStu = instStudents.find((s) => s.id === (studentId || regStudentId)) || instStudents[0];
    setRegCategory(category);
    if (targetStu) setRegStudentId(targetStu.id);

    if (category === 'propina') {
      setRegDescription(`Propina Mensal${targetStu ? ` - ${targetStu.gradeLevel}` : ''}`);
      setRegMonth('Dezembro/2026');
      setRegAmount(targetStu?.subsystemCode === 'primario_geral' ? 35000 : 48000);
      setRegMarkPaid(false);
    } else if (category === 'matricula') {
      setRegDescription(`Taxa de Matrícula Anual${targetStu ? ` - ${targetStu.gradeLevel}` : ''}`);
      setRegMonth('Ano Lectivo 2026/2027');
      setRegAmount(targetStu?.enrollmentAmountAoa || 15000);
      setRegMarkPaid(true);
    } else {
      setRegDescription('Emolumento: Declaração Escolar c/ Notas');
      setRegMonth('Novembro/2026');
      setRegAmount(5000);
      setRegMarkPaid(false);
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
          paySendNotif ? ' Notificação enviada ao Aluno/Encarregado.' : ''
        }`
      );
    }, 300);
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
        `Registo de Matrícula de ${st.fullName} (${formatKwanza(regAmount)}) gravado com sucesso pelo Tesoureiro.`
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
      status: regMarkPaid ? 'pago' : 'pendente',
      multicaixaReference: mcxRef,
      multicaixaEntity: currentInstitution.bankAccount?.multicaixaEntity || '00142',
      paidAt: regMarkPaid ? new Date().toISOString().split('T')[0] : undefined,
      paymentMethod: regMarkPaid ? regMethod : undefined,
      receiptNumber: regMarkPaid ? `RC-${nowTs.toString().slice(-6)}` : undefined
    };

    onAddInvoice?.(newInvoice, regSendNotif, regNotifTarget);
    setIsRegisterModalOpen(false);
    showToast(
      'success',
      `${categoryBadge(regCategory).label} registada para ${st.fullName}.${
        regSendNotif ? ' Notificação enviada ao Aluno/Encarregado.' : ''
      }`
    );
  };

  const buildDefaultNotifMessage = (
    student: Student | undefined,
    type: FinancialNotificationType,
    inv?: Invoice
  ) => {
    if (!student) return '';
    const entity = currentInstitution.bankAccount?.multicaixaEntity || '00142';
    const stuPending = instInvoices.filter(
      (i) => i.studentId === student.id && i.status !== 'pago'
    );
    const totalPending = stuPending.reduce((sum, i) => sum + i.balanceAoa, 0);

    if (inv) {
      if (inv.status === 'pago') {
        return `Estimado(a) Encarregado(a) ${student.guardianName}, confirmamos a recepção do pagamento de ${formatKwanza(
          inv.amountPaidAoa
        )} referente a "${inv.description}" (${inv.monthReference}) do estudante ${
          student.fullName
        } (Recibo ${inv.receiptNumber || inv.invoiceNumber}).`;
      }
      return `Estimado(a) Encarregado(a) ${student.guardianName}, informamos que se encontra ${
        inv.status === 'vencido' ? 'vencido' : 'pendente'
      } o pagamento de "${inv.description}" (${inv.monthReference}) do estudante ${
        student.fullName
      } no valor de ${formatKwanza(inv.balanceAoa)}. Entidade Multicaixa: ${entity} · Referência: ${
        inv.multicaixaReference || '482 910 230'
      } · Vencimento: ${inv.dueDate}.`;
    }

    if (type === 'confirmacao_matricula') {
      return `Estimado(a) Encarregado(a) ${student.guardianName}, a Tesouraria confirma a regularização da Taxa de Matrícula 2026/2027 do(a) estudante ${student.fullName} (${student.className}).`;
    }

    if (type === 'cobranca_pendente' && !student.enrollmentFeePaid) {
      return `Estimado(a) Encarregado(a) ${student.guardianName}, lembramos que a Taxa de Matrícula (${formatKwanza(
        student.enrollmentAmountAoa || 15000
      )}) do(a) estudante ${student.fullName} (${student.className}) encontra-se pendente de registo na Tesouraria.`;
    }

    if (totalPending > 0) {
      return `Estimado(a) Encarregado(a) ${student.guardianName}, o estudante ${
        student.fullName
      } (Proc. ${student.processNumber}) possui ${
        stuPending.length
      } factura(s) em aberto na Tesouraria totalizando ${formatKwanza(
        totalPending
      )}. Agradecemos a regularização via Multicaixa (Entidade ${entity}) ou presencialmente na Tesouraria.`;
    }

    return `Estimado(a) Encarregado(a) ${student.guardianName}, a situação financeira do(a) estudante ${student.fullName} encontra-se regularizada junto da Tesouraria da ${currentInstitution.name}.`;
  };

  const openNotificationModalFor = (
    student?: Student,
    invoice?: Invoice,
    type: FinancialNotificationType = 'cobranca_pendente'
  ) => {
    if (!guardTreasurerAction()) return;
    const targetStu = student || instStudents[0];
    setNotifMode('individual');
    if (targetStu) setNotifStudentId(targetStu.id);
    setNotifInvoiceId(invoice?.id);
    const resolvedType =
      invoice?.status === 'vencido'
        ? 'aviso_atraso'
        : invoice?.status === 'pago'
        ? 'confirmacao_pagamento'
        : type;
    setNotifType(resolvedType);
    setNotifTarget('ambos');
    setNotifTitle(
      invoice
        ? invoice.status === 'vencido'
          ? `Aviso de Atraso: ${invoice.description}`
          : invoice.status === 'pago'
          ? `Comprovativo de Liquidação: ${invoice.description}`
          : `Lembrete de Pagamento: ${invoice.description}`
        : type === 'confirmacao_matricula'
        ? 'Confirmação da Taxa de Matrícula'
        : 'Comunicação da Situação Financeira'
    );
    setNotifMessage(buildDefaultNotifMessage(targetStu, resolvedType, invoice));
    setIsNotifModalOpen(true);
  };

  const handleSendNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardTreasurerAction() || !onSendFinancialNotification) return;

    if (notifMode === 'lote_dividas') {
      const entity = currentInstitution.bankAccount?.multicaixaEntity || '00142';
      const debtorInvoices = instInvoices.filter((i) => i.status !== 'pago');
      const unpaidEnrollStudents = instStudents.filter((s) => !s.enrollmentFeePaid);
      const items: SendFinancialNotificationInput[] = [];

      const processedStudents = new Set<string>();
      debtorInvoices.forEach((inv) => {
        if (processedStudents.has(inv.studentId)) return;
        const stu = instStudents.find((s) => s.id === inv.studentId);
        if (!stu) return;
        processedStudents.add(stu.id);
        const stuTotal = debtorInvoices
          .filter((d) => d.studentId === stu.id)
          .reduce((sum, d) => sum + d.balanceAoa, 0);
        const hasOverdue = debtorInvoices.some(
          (d) => d.studentId === stu.id && d.status === 'vencido'
        );
        items.push({
          studentId: stu.id,
          recipientTarget: notifTarget,
          type: hasOverdue ? 'aviso_atraso' : 'cobranca_pendente',
          category: inferCategory(inv),
          title: hasOverdue
            ? 'Aviso Urgente de Mensalidades Vencidas'
            : 'Lembrete de Situação Financeira Pendente',
          message: `Estimado(a) Encarregado(a) ${stu.guardianName}, o estudante ${
            stu.fullName
          } possui valores pendentes na Tesouraria no total de ${formatKwanza(
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

      unpaidEnrollStudents.forEach((stu) => {
        if (processedStudents.has(stu.id)) return;
        items.push({
          studentId: stu.id,
          recipientTarget: notifTarget,
          type: 'cobranca_pendente',
          category: 'matricula',
          title: 'Taxa de Matrícula Pendente na Tesouraria',
          message: `Estimado(a) Encarregado(a) ${stu.guardianName}, solicitamos a regularização da Taxa de Matrícula (${formatKwanza(
            stu.enrollmentAmountAoa || 15000
          )}) do(a) estudante ${stu.fullName} junto da Tesouraria.`,
          amountAoa: stu.enrollmentAmountAoa || 15000
        });
      });

      if (items.length === 0) {
        showToast('error', 'Não existem alunos com propinas ou matrículas pendentes neste momento.');
        return;
      }

      onSendFinancialNotification(items);
      setIsNotifModalOpen(false);
      showToast(
        'success',
        `Notificações financeiras enviadas em lote para ${items.length} aluno(s) e encarregado(s).`
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
        title: notifTitle.trim() || 'Notificação Financeira',
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
      `Notificação enviada para ${stu.fullName} e encarregado (${stu.guardianName}).`
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. CABEÇALHO PRINCIPAL */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Tesouraria &amp; Finanças Escolares (AOA)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Propinas, Matrículas, Outros Emolumentos e Notificações Financeiras · {currentInstitution.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!isTreasurer}
            onClick={() => openNotificationModalFor(instStudents[0], undefined, 'cobranca_pendente')}
            className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition ${
              isTreasurer
                ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title={
              isTreasurer
                ? 'Enviar notificação financeira aos alunos ou encarregados'
                : 'Acção exclusiva do Tesoureiro'
            }
          >
            <Bell className="w-4 h-4" />
            <span>Notificar Alunos / Encarregados</span>
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
                ? 'Registar Propina, Matrícula ou Outro Pagamento'
                : 'Registo exclusivo do Tesoureiro'
            }
          >
            {isTreasurer ? <Plus className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Registar Finança</span>
          </button>
        </div>
      </div>

      {/* BANNER RBAC EXCLUSIVO DO TESOUREIRO */}
      {isTreasurer ? (
        <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#064e26]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#067836] shrink-0" />
            <div>
              <strong className="font-bold block sm:inline">
                Perfil Tesoureiro Activo — Registo Financeiro Exclusivo:
              </strong>{' '}
              <span>
                Tem permissão exclusiva para registar propinas, taxas de matrícula, outros emolumentos,
                liquidar facturas e enviar notificações financeiras aos alunos e encarregados.
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-white border border-[#cde6d5] text-[#067836] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap self-start sm:self-auto">
            Responsável Exclusivo
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">Modo de Consulta Apenas:</strong> O registo de
              finanças (propinas, matrículas e outros), liquidação de facturas e envio de
              notificações aos alunos ou encarregados é da responsabilidade exclusiva do{' '}
              <strong>Tesoureiro</strong>.
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
              {countByCat.propina} prop. · {countByCat.matricula} matr. · {countByCat.outros} out.
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

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Valores em Dívida</span>
            <div className="font-display text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5 truncate">
              {formatKwanza(totalOutstanding)}
            </div>
            <span className="text-[11px] text-red-600 font-medium block mt-0.5">
              {instInvoices.filter((i) => i.status === 'vencido').length} vencida(s) ·{' '}
              {instInvoices.filter((i) => i.status === 'pendente').length} pendente(s)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 block">Notificações Enviadas</span>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              {instNotifications.length}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {instNotifications.filter((n) => n.isRead).length} lida(s) ·{' '}
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
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'lancamentos'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Propinas, Matrículas &amp; Outros ({instInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('matriculas')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'matriculas'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>
              Controlo de Matrículas ({instStudents.filter((s) => !s.enrollmentFeePaid).length} pendentes)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('notificacoes')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'notificacoes'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#067836]'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notificações a Alunos &amp; Encarregados ({instNotifications.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          SECÇÃO 1: LANÇAMENTOS (PROPINAS, MATRÍCULAS E OUTROS)
          ========================================================= */}
      {activeSection === 'lancamentos' && (
        <>
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
            <div className="relative w-full xl:w-80">
              <Search className="w-4 h-4 text-[#067836] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por aluno, processo, descrição ou factura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Categoria Financeira */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f3f7f4] border border-[#dce7df] rounded-xl text-xs font-semibold">
                {(
                  [
                    { id: 'todas', label: 'Todas Categorias' },
                    { id: 'propina', label: `Propinas (${countByCat.propina})` },
                    { id: 'matricula', label: `Matrículas (${countByCat.matricula})` },
                    { id: 'outros', label: `Outros (${countByCat.outros})` }
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
                  Vencidos
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-3.5 sm:px-5 flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold flex items-center space-x-2">
                <Receipt className="w-4 h-4" />
                <span>Registos Financeiros da Instituição ({filteredInvoices.length})</span>
              </h2>
              <span className="text-[11px] text-emerald-100 hidden sm:inline">
                Registo exclusivo do Tesoureiro · Referências Multicaixa Express
              </span>
            </div>

            <div className="md:hidden bg-[#eaf6ee] px-3 py-1.5 border-b border-[#cde6d5] flex items-center justify-between text-[11px] text-[#055827]">
              <span>👉 Deslize horizontalmente para ver todas as colunas</span>
              <span className="font-bold">↔</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-slate-500 uppercase font-semibold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Factura Nº</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Aluno / Processo</th>
                    <th className="py-3 px-4">Descrição / Referência</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Em Dívida</th>
                    <th className="py-3 px-4 text-center">Ref. MCX</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.map((inv) => {
                    const cat = inferCategory(inv);
                    const badge = categoryBadge(cat);
                    const stu = instStudents.find((s) => s.id === inv.studentId);
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
                          <div className="font-mono text-[11px] text-slate-400">
                            Proc: {inv.studentProcessNumber}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{inv.description}</span>
                          <span className="text-[11px] text-slate-500">
                            {inv.monthReference}
                            {inv.registeredByName ? ` · Por: ${inv.registeredByName}` : ''}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono">{inv.dueDate}</td>

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
                                : inv.status === 'vencido'
                                ? 'text-red-700'
                                : 'text-amber-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                inv.status === 'pago'
                                  ? 'bg-emerald-500'
                                  : inv.status === 'vencido'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span>
                              {inv.status === 'pago'
                                ? 'Pago'
                                : inv.status === 'vencido'
                                ? 'Vencido'
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
                                title={
                                  isTreasurer
                                    ? 'Registar liquidação da factura'
                                    : 'Liquidação exclusiva do Tesoureiro'
                                }
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

                            <button
                              type="button"
                              disabled={!isTreasurer}
                              onClick={() => openNotificationModalFor(stu, inv)}
                              className={`inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
                                isTreasurer
                                  ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer'
                                  : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                              }`}
                              title={
                                isTreasurer
                                  ? 'Enviar notificação financeira ao aluno/encarregado'
                                  : 'Envio exclusivo do Tesoureiro'
                              }
                            >
                              <Send className="w-3 h-3" />
                              <span>Notificar</span>
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
        </>
      )}

      {/* =========================================================
          SECÇÃO 2: CONTROLO DE MATRÍCULAS E CONFIRMAÇÕES (TESOURARIA)
          ========================================================= */}
      {activeSection === 'matriculas' && (
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>Taxas de Matrícula &amp; Confirmação Anual ({instStudents.length} alunos)</span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                O registo financeiro e confirmação da taxa de matrícula é executado exclusivamente pelo Tesoureiro.
              </p>
            </div>
            {isTreasurer && (
              <button
                type="button"
                onClick={() => openRegisterModal('matricula')}
                className="inline-flex items-center gap-1.5 bg-white text-[#067836] hover:bg-[#eaf6ee] text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registar Taxa de Matrícula</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-[#f7fbf8] text-slate-500 uppercase font-semibold border-b border-[#dce7df]">
                  <th className="py-3 px-4">Aluno / Processo</th>
                  <th className="py-3 px-4">Turma / Classe</th>
                  <th className="py-3 px-4">Encarregado / Telefone</th>
                  <th className="py-3 px-4 text-right">Taxa</th>
                  <th className="py-3 px-4 text-center">Recibo Matrícula</th>
                  <th className="py-3 px-4 text-center">Situação na Tesouraria</th>
                  <th className="py-3 px-4 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {instStudents.map((stu) => {
                  const isPaid = Boolean(stu.enrollmentFeePaid);
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{stu.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          Proc: {stu.processNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{stu.className}</div>
                        <div className="text-[11px] text-slate-500">{stu.gradeLevel}</div>
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
                                isPaid ? 'confirmacao_matricula' : 'cobranca_pendente'
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                              isTreasurer
                                ? 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border-[#cde6d5] cursor-pointer'
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            <span>Notificar</span>
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
      )}

      {/* =========================================================
          SECÇÃO 3: HISTÓRICO & ENVIO DE NOTIFICAÇÕES FINANCEIRAS
          ========================================================= */}
      {activeSection === 'notificacoes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] overflow-hidden shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span>Central de Notificações Financeiras aos Alunos &amp; Encarregados</span>
                </h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Todas as comunicações sobre propinas vencidas, pendentes, matrículas ou confirmação de recibos enviadas pelo Tesoureiro.
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
                    onClick={() => openNotificationModalFor(instStudents[0])}
                    className="inline-flex items-center gap-1.5 bg-white text-[#067836] hover:bg-[#eaf6ee] text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Nova Notificação</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {instNotifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#dce7df] p-8 text-center text-xs text-slate-500">
                Nenhuma notificação financeira enviada até ao momento.
              </div>
            ) : (
              instNotifications.map((notif) => {
                const badge = notifTypeLabel(notif.type);
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
                  Data da Liquidação:{' '}
                  <strong>{formatAngolaDate(viewingReceiptInvoice.paidAt || new Date().toISOString())}</strong>
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
          MODAL REGISTO EXCLUSIVO DO TESOUREIRO (PROPINAS / MATRÍCULAS / OUTROS)
          ========================================================= */}
      {isRegisterModalOpen && isTreasurer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>Registar Finança (Exclusivo do Tesoureiro)</span>
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFinancialRecord} className="mt-4 space-y-3.5 text-xs">
              {/* Selecção de Categoria Financeira */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Categoria Financeira *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'propina', label: 'Propinas' },
                      { id: 'matricula', label: 'Matrículas' },
                      { id: 'outros', label: 'Outros' }
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
                  Seleccione o Aluno *
                </label>
                <select
                  value={regStudentId}
                  onChange={(e) => setRegStudentId(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold"
                >
                  {instStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.processNumber} · {s.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>

              {regCategory === 'outros' && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    Atalhos Rápidos (Outros Emolumentos):
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
                    Tipo de Acto de Matrícula *
                  </label>
                  <select
                    value={regEnrollmentType}
                    onChange={(e) => setRegEnrollmentType(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                  >
                    <option value="matricula_nova">Matrícula Nova (Ingresso)</option>
                    <option value="confirmacao_matricula">Confirmação de Matrícula Anual</option>
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
                  <input
                    type="text"
                    value={regMonth}
                    onChange={(e) => setRegMonth(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
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

              {/* Opção de Notificação Imediata ao Aluno / Encarregado */}
              <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl space-y-2">
                <label className="inline-flex items-center gap-2 font-bold text-[#064e26] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regSendNotif}
                    onChange={(e) => setRegSendNotif(e.target.checked)}
                    className="rounded border-[#8cd0a6] text-[#067836] focus:ring-[#16a34a]"
                  />
                  <span>Enviar notificação automática sobre este registo ao Aluno / Encarregado</span>
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
                  Confirmar Registo Financeiro
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
          MODAL DE ENVIO DE NOTIFICAÇÕES FINANCEIRAS (EXCLUSIVO TESOUREIRO)
          ========================================================= */}
      {isNotifModalOpen && isTreasurer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#dce7df] overflow-hidden my-6">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Enviar Notificação Financeira</span>
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
                  Aluno Individual
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
                  Em Lote (Com Pendentes)
                </button>
              </div>

              {notifMode === 'lote_dividas' ? (
                <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-[#064e26] space-y-1.5">
                  <div className="font-bold">Envio Automático Personalizado em Lote</div>
                  <p>
                    O sistema enviará uma notificação personalizada com o montante exacto em dívida e
                    referência Multicaixa para todos os estudantes com propinas vencidas/pendentes ou
                    taxa de matrícula por liquidar.
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
                        setNotifMessage(buildDefaultNotifMessage(stu, notifType));
                      }}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-semibold"
                    >
                      {instStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} · Enc: {s.guardianName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Tipo de Situação *
                      </label>
                      <select
                        value={notifType}
                        onChange={(e) => {
                          const nextType = e.target.value as FinancialNotificationType;
                          setNotifType(nextType);
                          const stu = instStudents.find((s) => s.id === notifStudentId);
                          setNotifMessage(buildDefaultNotifMessage(stu, nextType));
                        }}
                        className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                      >
                        <option value="cobranca_pendente">Cobrança Pendente</option>
                        <option value="aviso_atraso">Aviso de Atraso / Vencida</option>
                        <option value="confirmacao_matricula">Confirmação de Matrícula</option>
                        <option value="confirmacao_pagamento">Confirmação de Pagamento</option>
                        <option value="emolumento_outros">Outros Emolumentos</option>
                        <option value="aviso_geral">Aviso Financeiro Geral</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Destinatário *
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
                      Mensagem sobre a Situação Financeira *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 leading-relaxed"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Notificação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
