/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Módulo de Acompanhamento Psicopedagógico & Inclusão (INEE / MED)
 * Configuração centralizada pelo Super Administrador para posterior activação nas escolas.
 */

import React, { useMemo, useState } from 'react';
import {
  HeartHandshake,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  FileText,
  Users,
  Calendar,
  Sliders,
  Power,
  X,
  ClipboardList,
  BookOpen,
  UserCheck,
  Clock,
  CheckSquare,
  Square,
  Edit3
} from 'lucide-react';
import {
  Institution,
  Student,
  PsychopedagogicalCase,
  PsychopedagogicalProtocol,
  PsychopedagogicalCategory,
  PsychopedagogicalPriority,
  PsychopedagogicalStatus,
  PsychopedagogicalSession,
  PsychopedagogicalInstitutionConfig
} from '../../types';
import { ANGOLA_PROVINCES } from '../../utils/currency';

interface PsychopedagogicalManagerProps {
  mode?: 'super_admin' | 'school';
  institutions: Institution[];
  lockedInstitution?: Institution | null;
  students: Student[];
  protocols: PsychopedagogicalProtocol[];
  cases: PsychopedagogicalCase[];
  currentUserName: string;
  onToggleInstitutionActivation?: (
    institutionId: string,
    activate: boolean,
    config?: PsychopedagogicalInstitutionConfig
  ) => void;
  onBatchToggleActivation?: (institutionIds: string[], activate: boolean) => void;
  onSaveProtocol?: (protocol: PsychopedagogicalProtocol) => void;
  onSaveCase: (caseItem: PsychopedagogicalCase) => void;
  onAddSession: (caseId: string, session: PsychopedagogicalSession) => void;
}

const CATEGORY_LABELS: Record<PsychopedagogicalCategory, string> = {
  nee_inclusao: 'NEE & Educação Inclusiva',
  dificuldade_aprendizagem: 'Dificuldades de Aprendizagem',
  apoio_emocional: 'Apoio Socioemocional',
  comportamento_assiduidade: 'Comportamento & Assiduidade',
  altas_habilidades: 'Altas Habilidades / Sobredotação',
  orientacao_vocacional: 'Orientação Vocacional'
};

const PRIORITY_STYLES: Record<
  PsychopedagogicalPriority,
  { label: string; badge: string }
> = {
  baixo: {
    label: 'Baixa',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  moderado: {
    label: 'Moderada',
    badge: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  elevado: {
    label: 'Elevada',
    badge: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  critico: {
    label: 'Crítica',
    badge: 'bg-red-50 text-red-700 border-red-200'
  }
};

const STATUS_STYLES: Record<
  PsychopedagogicalStatus,
  { label: string; badge: string }
> = {
  em_triagem: {
    label: 'Em Triagem',
    badge: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  em_acompanhamento: {
    label: 'Em Acompanhamento',
    badge: 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
  },
  pei_activo: {
    label: 'PEI Activo',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  encaminhado: {
    label: 'Encaminhado (INEE / Saúde)',
    badge: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  alta_pedagogica: {
    label: 'Alta Pedagógica',
    badge: 'bg-slate-100 text-slate-600 border-slate-200'
  }
};

const SESSION_TYPE_LABELS: Record<PsychopedagogicalSession['sessionType'], string> = {
  triagem_inicial: 'Triagem Inicial',
  sessao_individual: 'Sessão Individual',
  reuniao_familia: 'Reunião com Encarregado',
  observacao_turma: 'Observação em Sala',
  revisao_pei: 'Revisão do PEI'
};

export const PsychopedagogicalManager: React.FC<PsychopedagogicalManagerProps> = ({
  mode = 'super_admin',
  institutions,
  lockedInstitution = null,
  students,
  protocols,
  cases,
  currentUserName,
  onToggleInstitutionActivation,
  onBatchToggleActivation,
  onSaveProtocol,
  onSaveCase,
  onAddSession
}) => {
  const isSuperAdmin = mode === 'super_admin';

  const [activeSubTab, setActiveSubTab] = useState<'activacao_escolas' | 'protocolos' | 'casos'>(
    isSuperAdmin ? 'activacao_escolas' : 'casos'
  );

  // Filtros Aba Activação de Escolas
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolProvinceFilter, setSchoolProvinceFilter] = useState('todas');
  const [schoolActivationFilter, setSchoolActivationFilter] = useState<
    'todas' | 'activas' | 'inactivas'
  >('todas');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);

  // Modal de Configuração de Escola (Pré-activação / Activação)
  const [configModalSchool, setConfigModalSchool] = useState<Institution | null>(null);
  const [cfgSpecialistName, setCfgSpecialistName] = useState('');
  const [cfgSpecialistEmail, setCfgSpecialistEmail] = useState('');
  const [cfgSpecialistPhone, setCfgSpecialistPhone] = useState('');
  const [cfgEnabledProtocols, setCfgEnabledProtocols] = useState<string[]>([]);
  const [cfgNotes, setCfgNotes] = useState('');

  // Filtros Aba Casos
  const [caseSearch, setCaseSearch] = useState('');
  const [caseSchoolFilter, setCaseSchoolFilter] = useState(
    lockedInstitution ? lockedInstitution.id : 'todas'
  );
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('todos');
  const [casePriorityFilter, setCasePriorityFilter] = useState<string>('todas');

  // Modal Novo / Editar Caso
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseInstId, setCaseInstId] = useState<string>(
    lockedInstitution?.id || institutions[0]?.id || ''
  );
  const [caseStudentId, setCaseStudentId] = useState('');
  const [caseStudentName, setCaseStudentName] = useState('');
  const [caseProcessNumber, setCaseProcessNumber] = useState('');
  const [caseGradeLevel, setCaseGradeLevel] = useState('');
  const [caseClassName, setCaseClassName] = useState('');
  const [caseGuardianName, setCaseGuardianName] = useState('');
  const [caseGuardianConsent, setCaseGuardianConsent] = useState(false);
  const [caseCategory, setCaseCategory] = useState<PsychopedagogicalCategory>('dificuldade_aprendizagem');
  const [casePriority, setCasePriority] = useState<PsychopedagogicalPriority>('moderado');
  const [caseStatus, setCaseStatus] = useState<PsychopedagogicalStatus>('em_triagem');
  const [caseProtocolId, setCaseProtocolId] = useState<string>(protocols[0]?.id || '');
  const [caseReferralSource, setCaseReferralSource] =
    useState<PsychopedagogicalCase['referralSource']>('super_admin');
  const [caseSpecialist, setCaseSpecialist] = useState('');
  const [caseSummaryNotes, setCaseSummaryNotes] = useState('');
  const [casePeiObjectives, setCasePeiObjectives] = useState('');

  // Modal Detalhe do Caso & Sessões
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] =
    useState<PsychopedagogicalSession['sessionType']>('sessao_individual');
  const [sessionSpecialist, setSessionSpecialist] = useState(currentUserName);
  const [sessionSummary, setSessionSummary] = useState('');
  const [sessionRecommendations, setSessionRecommendations] = useState('');
  const [sessionNextDate, setSessionNextDate] = useState('');

  // Modal Novo / Editar Protocolo (apenas Super Admin)
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [editingProtocolId, setEditingProtocolId] = useState<string | null>(null);
  const [protCode, setProtCode] = useState('');
  const [protTitle, setProtTitle] = useState('');
  const [protCategory, setProtCategory] = useState<PsychopedagogicalCategory>('nee_inclusao');
  const [protNormative, setProtNormative] = useState('INEE / MED — Lei de Bases 17/16');
  const [protDescription, setProtDescription] = useState('');
  const [protCriteriaText, setProtCriteriaText] = useState('');
  const [protStepsText, setProtStepsText] = useState('');
  const [protIsActive, setProtIsActive] = useState(true);

  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 5000);
  };

  // Escolas activas no módulo
  const activatedInstitutionsCount = useMemo(
    () => institutions.filter((inst) => Boolean(inst.features?.psychopedagogicalSupport)).length,
    [institutions]
  );

  const visibleCases = useMemo(() => {
    return cases.filter((c) => {
      if (!isSuperAdmin && lockedInstitution && c.institutionId !== lockedInstitution.id) {
        return false;
      }
      if (isSuperAdmin && caseSchoolFilter !== 'todas' && c.institutionId !== caseSchoolFilter) {
        return false;
      }
      if (caseStatusFilter !== 'todos' && c.status !== caseStatusFilter) return false;
      if (casePriorityFilter !== 'todas' && c.priority !== casePriorityFilter) return false;
      if (caseSearch.trim()) {
        const q = caseSearch.toLowerCase();
        const match =
          c.studentName.toLowerCase().includes(q) ||
          c.caseCode.toLowerCase().includes(q) ||
          c.institutionName.toLowerCase().includes(q) ||
          (c.specialistAssigned || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    cases,
    isSuperAdmin,
    lockedInstitution,
    caseSchoolFilter,
    caseStatusFilter,
    casePriorityFilter,
    caseSearch
  ]);

  const activeCasesCount = useMemo(
    () =>
      (isSuperAdmin
        ? cases
        : cases.filter((c) => c.institutionId === lockedInstitution?.id)
      ).filter((c) => c.status !== 'alta_pedagogica').length,
    [cases, isSuperAdmin, lockedInstitution]
  );

  const highPriorityCasesCount = useMemo(
    () =>
      (isSuperAdmin
        ? cases
        : cases.filter((c) => c.institutionId === lockedInstitution?.id)
      ).filter(
        (c) =>
          (c.priority === 'elevado' || c.priority === 'critico') &&
          c.status !== 'alta_pedagogica'
      ).length,
    [cases, isSuperAdmin, lockedInstitution]
  );

  const activeProtocolsCount = useMemo(
    () => protocols.filter((p) => p.isActive).length,
    [protocols]
  );

  const filteredSchools = useMemo(() => {
    return institutions.filter((inst) => {
      const isEnabled = Boolean(inst.features?.psychopedagogicalSupport);
      if (schoolActivationFilter === 'activas' && !isEnabled) return false;
      if (schoolActivationFilter === 'inactivas' && isEnabled) return false;
      if (schoolProvinceFilter !== 'todas' && inst.province !== schoolProvinceFilter) return false;
      if (schoolSearch.trim()) {
        const q = schoolSearch.toLowerCase();
        const match =
          inst.name.toLowerCase().includes(q) ||
          (inst.acronym || '').toLowerCase().includes(q) ||
          inst.municipality.toLowerCase().includes(q) ||
          inst.code.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [institutions, schoolSearch, schoolProvinceFilter, schoolActivationFilter]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const availableStudentsForCaseModal = useMemo(
    () => students.filter((s) => s.institutionId === caseInstId),
    [students, caseInstId]
  );

  const toggleSchoolSelection = (instId: string) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(instId) ? prev.filter((id) => id !== instId) : [...prev, instId]
    );
  };

  const toggleSelectAllFilteredSchools = () => {
    const filteredIds = filteredSchools.map((s) => s.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedSchoolIds.includes(id));
    if (allSelected) {
      setSelectedSchoolIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedSchoolIds(Array.from(new Set([...selectedSchoolIds, ...filteredIds])));
    }
  };

  const openSchoolConfigModal = (inst: Institution) => {
    setConfigModalSchool(inst);
    setCfgSpecialistName(inst.psychopedagogicalConfig?.specialistName || '');
    setCfgSpecialistEmail(inst.psychopedagogicalConfig?.specialistEmail || '');
    setCfgSpecialistPhone(inst.psychopedagogicalConfig?.specialistPhone || '');
    setCfgEnabledProtocols(
      inst.psychopedagogicalConfig?.enabledProtocolIds &&
        inst.psychopedagogicalConfig.enabledProtocolIds.length > 0
        ? inst.psychopedagogicalConfig.enabledProtocolIds
        : protocols.filter((p) => p.isActive).map((p) => p.id)
    );
    setCfgNotes(inst.psychopedagogicalConfig?.notes || '');
  };

  const handleSaveSchoolConfig = (activateNow: boolean) => {
    if (!configModalSchool || !onToggleInstitutionActivation) return;
    const configPayload: PsychopedagogicalInstitutionConfig = {
      specialistName: cfgSpecialistName.trim() || undefined,
      specialistEmail: cfgSpecialistEmail.trim() || undefined,
      specialistPhone: cfgSpecialistPhone.trim() || undefined,
      enabledProtocolIds: cfgEnabledProtocols,
      notes: cfgNotes.trim() || undefined,
      activatedAt: activateNow
        ? new Date().toISOString().split('T')[0]
        : configModalSchool.psychopedagogicalConfig?.activatedAt,
      activatedBy: activateNow
        ? currentUserName
        : configModalSchool.psychopedagogicalConfig?.activatedBy
    };
    onToggleInstitutionActivation(configModalSchool.id, activateNow, configPayload);
    showNotice(
      activateNow
        ? `Acompanhamento Psicopedagógico ACTIVADO com sucesso em "${configModalSchool.name}".`
        : `Pré-configuração psicopedagógica guardada para "${configModalSchool.name}" (aguarda activação).`
    );
    setConfigModalSchool(null);
  };

  const openCreateCaseModal = () => {
    const defaultInstId = lockedInstitution?.id || institutions[0]?.id || '';
    const defaultInst = institutions.find((i) => i.id === defaultInstId);
    setEditingCaseId(null);
    setCaseInstId(defaultInstId);
    setCaseStudentId('');
    setCaseStudentName('');
    setCaseProcessNumber('');
    setCaseGradeLevel('');
    setCaseClassName('');
    setCaseGuardianName('');
    setCaseGuardianConsent(false);
    setCaseCategory('dificuldade_aprendizagem');
    setCasePriority('moderado');
    setCaseStatus('em_triagem');
    setCaseProtocolId(protocols.find((p) => p.isActive)?.id || '');
    setCaseReferralSource(isSuperAdmin ? 'super_admin' : 'direccao');
    setCaseSpecialist(defaultInst?.psychopedagogicalConfig?.specialistName || currentUserName);
    setCaseSummaryNotes('');
    setCasePeiObjectives('');
    setIsCaseModalOpen(true);
  };

  const openEditCaseModal = (c: PsychopedagogicalCase) => {
    setEditingCaseId(c.id);
    setCaseInstId(c.institutionId);
    setCaseStudentId(c.studentId || '');
    setCaseStudentName(c.studentName);
    setCaseProcessNumber(c.studentProcessNumber || '');
    setCaseGradeLevel(c.gradeLevel);
    setCaseClassName(c.className || '');
    setCaseGuardianName(c.guardianName || '');
    setCaseGuardianConsent(c.guardianConsent);
    setCaseCategory(c.category);
    setCasePriority(c.priority);
    setCaseStatus(c.status);
    setCaseProtocolId(c.protocolId || '');
    setCaseReferralSource(c.referralSource);
    setCaseSpecialist(c.specialistAssigned);
    setCaseSummaryNotes(c.summaryNotes);
    setCasePeiObjectives(c.peiObjectives);
    setIsCaseModalOpen(true);
  };

  const handleSelectExistingStudent = (stuId: string) => {
    setCaseStudentId(stuId);
    const stu = students.find((s) => s.id === stuId);
    if (stu) {
      setCaseStudentName(stu.fullName);
      setCaseProcessNumber(stu.processNumber);
      setCaseGradeLevel(stu.gradeLevel);
      setCaseClassName(stu.className);
      setCaseGuardianName(stu.guardianName);
    }
  };

  const handleSubmitCase = (e: React.FormEvent) => {
    e.preventDefault();
    const targetInst = institutions.find((i) => i.id === caseInstId);
    if (!targetInst || !caseStudentName.trim()) return;

    const existing = editingCaseId ? cases.find((c) => c.id === editingCaseId) : undefined;
    const today = new Date().toISOString().split('T')[0];

    const payload: PsychopedagogicalCase = {
      id: existing?.id || `psy-case-${Date.now()}`,
      caseCode:
        existing?.caseCode ||
        `PSI-2026-${String(cases.length + 1).padStart(3, '0')}`,
      institutionId: targetInst.id,
      institutionName: targetInst.name,
      studentId: caseStudentId || undefined,
      studentName: caseStudentName.trim(),
      studentProcessNumber: caseProcessNumber.trim() || undefined,
      gradeLevel: caseGradeLevel.trim() || 'Não especificada',
      className: caseClassName.trim() || undefined,
      category: caseCategory,
      priority: casePriority,
      status: caseStatus,
      referralSource: caseReferralSource,
      specialistAssigned: caseSpecialist.trim() || currentUserName,
      guardianConsent: caseGuardianConsent,
      guardianName: caseGuardianName.trim() || undefined,
      summaryNotes: caseSummaryNotes.trim(),
      peiObjectives: casePeiObjectives.trim(),
      protocolId: caseProtocolId || undefined,
      openedAt: existing?.openedAt || today,
      updatedAt: today,
      sessions: existing?.sessions || []
    };

    onSaveCase(payload);
    setIsCaseModalOpen(false);
    showNotice(
      existing
        ? `Dossiê ${payload.caseCode} actualizado com sucesso.`
        : `Registo psicopedagógico ${payload.caseCode} criado para ${payload.studentName}.`
    );
  };

  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !sessionSummary.trim()) return;

    const newSession: PsychopedagogicalSession = {
      id: `sess-${Date.now()}`,
      date: sessionDate,
      specialistName: sessionSpecialist.trim() || currentUserName,
      sessionType: sessionType,
      summary: sessionSummary.trim(),
      recommendations: sessionRecommendations.trim() || 'Manter monitorização regular.',
      nextFollowUpDate: sessionNextDate || undefined
    };

    onAddSession(selectedCase.id, newSession);
    setSessionSummary('');
    setSessionRecommendations('');
    setSessionNextDate('');
    showNotice(`Sessão registada no dossiê ${selectedCase.caseCode}.`);
  };

  const openCreateProtocolModal = () => {
    setEditingProtocolId(null);
    setProtCode(`PROT-INEE-0${protocols.length + 1}`);
    setProtTitle('');
    setProtCategory('nee_inclusao');
    setProtNormative('Directriz MED / INEE — República de Angola');
    setProtDescription('');
    setProtCriteriaText('');
    setProtStepsText('');
    setProtIsActive(true);
    setIsProtocolModalOpen(true);
  };

  const openEditProtocolModal = (p: PsychopedagogicalProtocol) => {
    setEditingProtocolId(p.id);
    setProtCode(p.code);
    setProtTitle(p.title);
    setProtCategory(p.category);
    setProtNormative(p.normativeReference);
    setProtDescription(p.description);
    setProtCriteriaText(p.screeningCriteria.join('\n'));
    setProtStepsText(p.interventionSteps.join('\n'));
    setProtIsActive(p.isActive);
    setIsProtocolModalOpen(true);
  };

  const handleSubmitProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveProtocol || !protTitle.trim()) return;

    const existing = editingProtocolId
      ? protocols.find((p) => p.id === editingProtocolId)
      : undefined;

    const protocolPayload: PsychopedagogicalProtocol = {
      id: existing?.id || `prot-${Date.now()}`,
      code: protCode.trim() || `PROT-${Date.now().toString().slice(-3)}`,
      title: protTitle.trim(),
      category: protCategory,
      targetSubsystems: existing?.targetSubsystems || [
        'pre_escolar',
        'primario_geral',
        'secundario_geral_1'
      ],
      description: protDescription.trim(),
      screeningCriteria: protCriteriaText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      interventionSteps: protStepsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
      normativeReference: protNormative.trim() || 'INEE / MED',
      isActive: protIsActive,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onSaveProtocol(protocolPayload);
    setIsProtocolModalOpen(false);
    showNotice(`Protocolo "${protocolPayload.title}" guardado com sucesso.`);
  };

  const visibleProtocols = useMemo(() => {
    if (isSuperAdmin || !lockedInstitution) return protocols;
    const enabledIds = lockedInstitution.psychopedagogicalConfig?.enabledProtocolIds;
    if (!enabledIds || enabledIds.length === 0) {
      return protocols.filter((p) => p.isActive);
    }
    return protocols.filter((p) => p.isActive && enabledIds.includes(p.id));
  }, [protocols, isSuperAdmin, lockedInstitution]);

  return (
    <div className="space-y-5">
      {/* 1. CABEÇALHO EXECUTIVO */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#067836] to-[#149a45] text-white flex items-center justify-center shadow-xs shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
              ACOMPANHAMENTO PSICOPEDAGÓGICO
            </h1>
            <p className="text-xs text-[#4b6755] mt-0.5 font-medium">
              {isSuperAdmin
                ? 'Gestão central de protocolos INEE/MED, casos e activação progressiva nas escolas da rede NEUROEDUCA'
                : `Gabinete Escolar de Apoio Psicopedagógico & NEE · ${lockedInstitution?.name}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && activeSubTab === 'protocolos' && onSaveProtocol && (
            <button
              type="button"
              onClick={openCreateProtocolModal}
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Protocolo INEE/MED</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateCaseModal}
            className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Triagem / Dossiê</span>
          </button>
        </div>
      </div>

      {/* Aviso de Confirmação */}
      {noticeMessage && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span className="font-semibold">{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-[#055827] hover:text-[#022c16] font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. CARTÕES KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isSuperAdmin ? (
          <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#4b6755] block">
                Escolas Activadas
              </span>
              <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
                {activatedInstitutionsCount}{' '}
                <span className="text-xs font-semibold text-[#4b6755]">
                  / {institutions.length}
                </span>
              </div>
              <span className="text-[11px] text-[#055827] font-medium block mt-0.5">
                {institutions.length - activatedInstitutionsCount} escola(s) por activar
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#4b6755] block">
                Módulo na Escola
              </span>
              <div className="text-lg font-extrabold text-[#16a34a] mt-0.5 truncate">
                Activo &amp; Homologado
              </div>
              <span className="text-[11px] text-[#4b6755] block mt-0.5 truncate">
                {lockedInstitution?.psychopedagogicalConfig?.specialistName || 'Coord. Pedagógica'}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#4b6755] block">
              Casos em Curso
            </span>
            <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {activeCasesCount}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">
              Triagens, PEI e acompanhamentos
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#4b6755] block">
              Prioridade Elevada / Crítica
            </span>
            <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {highPriorityCasesCount}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">
              Requerem atenção prioritária
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#4b6755] block">
              Protocolos INEE / MED
            </span>
            <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {isSuperAdmin ? activeProtocolsCount : visibleProtocols.length}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">
              Directrizes oficiais activas
            </span>
          </div>
        </div>
      </div>

      {/* 3. NAVEGAÇÃO DE SUB-ABAS */}
      <div className="bg-white rounded-2xl border border-[#dce7df] p-1.5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-wrap gap-1.5">
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveSubTab('activacao_escolas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'activacao_escolas'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                : 'text-[#064e26] hover:bg-[#eaf6ee]'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Activação nas Escolas ({activatedInstitutionsCount}/{institutions.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveSubTab('casos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'casos'
              ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
              : 'text-[#064e26] hover:bg-[#eaf6ee]'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Casos, Triagens &amp; PEI ({visibleCases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('protocolos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'protocolos'
              ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
              : 'text-[#064e26] hover:bg-[#eaf6ee]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Protocolos &amp; Directrizes ({visibleProtocols.length})</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* ABA 1: ACTIVACÃO POR ESCOLA (SUPER ADMINISTRADOR)                   */}
      {/* =================================================================== */}
      {isSuperAdmin && activeSubTab === 'activacao_escolas' && (
        <div className="space-y-4">
          {/* Nota de Fluxo para o Super Administrador */}
          <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#067836] shrink-0 mt-0.5" />
              <div className="text-xs text-[#055827]">
                <span className="font-extrabold block text-[#064e26]">
                  Controlo de Activação Progressiva por Escola
                </span>
                Configure o técnico responsável e os protocolos autorizados antes de activar o módulo. As escolas só visualizarão o menu de Acompanhamento Psicopedagógico após activação expressa nesta lista.
              </div>
            </div>
            {selectedSchoolIds.length > 0 && onBatchToggleActivation && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onBatchToggleActivation(selectedSchoolIds, true);
                    showNotice(
                      `Módulo Psicopedagógico activado em ${selectedSchoolIds.length} escola(s).`
                    );
                    setSelectedSchoolIds([]);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#067836] hover:bg-[#055827] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Activar Seleccionadas ({selectedSchoolIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onBatchToggleActivation(selectedSchoolIds, false);
                    showNotice(
                      `Módulo Psicopedagógico desactivado em ${selectedSchoolIds.length} escola(s).`
                    );
                    setSelectedSchoolIds([]);
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                >
                  Desactivar
                </button>
              </div>
            )}
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white rounded-2xl border border-[#dce7df] p-3.5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Pesquisar escola por nome, sigla, código ou município..."
                className="w-full bg-[#f7fbf8] text-xs text-[#064e26] rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#067836]" />
                <select
                  value={schoolProvinceFilter}
                  onChange={(e) => setSchoolProvinceFilter(e.target.value)}
                  className="bg-[#f7fbf8] text-xs text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836]"
                >
                  <option value="todas">Todas as Províncias</option>
                  {ANGOLA_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={schoolActivationFilter}
                onChange={(e) => setSchoolActivationFilter(e.target.value as any)}
                className="bg-[#f7fbf8] text-xs text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836]"
              >
                <option value="todas">Todos os Estados</option>
                <option value="inactivas">Por Activar (Inactivas)</option>
                <option value="activas">Já Activadas</option>
              </select>
            </div>
          </div>

          {/* Tabela de Escolas */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f7fbf8] border-b border-[#dce7df] text-[11px] font-extrabold text-[#4b6755] uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAllFilteredSchools}
                        className="text-[#067836] hover:text-[#055827] cursor-pointer"
                        title="Seleccionar todas visíveis"
                      >
                        {filteredSchools.length > 0 &&
                        filteredSchools.every((s) => selectedSchoolIds.includes(s.id)) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Instituição / Localização</th>
                    <th className="py-3 px-3">Técnico / Ponto Focal</th>
                    <th className="py-3 px-3">Protocolos &amp; Casos</th>
                    <th className="py-3 px-3">Estado do Módulo</th>
                    <th className="py-3 px-4 text-right">Configuração &amp; Activação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7df] text-xs">
                  {filteredSchools.map((inst) => {
                    const isActivated = Boolean(inst.features?.psychopedagogicalSupport);
                    const schoolCasesCount = cases.filter(
                      (c) => c.institutionId === inst.id
                    ).length;
                    const enabledProtCount =
                      inst.psychopedagogicalConfig?.enabledProtocolIds?.length ||
                      activeProtocolsCount;
                    const isChecked = selectedSchoolIds.includes(inst.id);

                    return (
                      <tr
                        key={inst.id}
                        className={`transition ${
                          isChecked ? 'bg-[#eaf6ee]/60' : 'hover:bg-[#f7fbf8]'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSchoolSelection(inst.id)}
                            className="text-[#067836] cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-[#064e26]">{inst.name}</div>
                          <div className="text-[11px] text-[#4b6755] mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold text-[#067836]">
                              {inst.acronym || inst.code}
                            </span>
                            <span>·</span>
                            <span>
                              {inst.municipality}, {inst.province}
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {inst.currentStudentsCount} alunos
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {inst.psychopedagogicalConfig?.specialistName ? (
                            <div>
                              <span className="font-bold text-[#064e26] block">
                                {inst.psychopedagogicalConfig.specialistName}
                              </span>
                              <span className="text-[11px] text-[#4b6755]">
                                {inst.psychopedagogicalConfig.specialistEmail ||
                                  inst.psychopedagogicalConfig.specialistPhone ||
                                  'Ponto focal atribuído'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-slate-400">
                              Por designar (usar Configurar)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-[#064e26] tabular-nums">
                              {enabledProtCount} protocolo(s) autorizado(s)
                            </span>
                            <span className="text-[11px] text-[#4b6755] tabular-nums">
                              {schoolCasesCount} dossiê(s) registado(s)
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {isActivated ? (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                                Activo na Escola
                              </span>
                              {inst.psychopedagogicalConfig?.activatedAt && (
                                <span className="text-[10px] text-[#4b6755] mt-0.5 pl-0.5">
                                  Desde {inst.psychopedagogicalConfig.activatedAt}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Inactivo · Por Activar
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openSchoolConfigModal(inst)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#064e26] font-bold text-[11px] transition cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5 text-[#067836]" />
                              <span>Configurar</span>
                            </button>

                            {onToggleInstitutionActivation && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextState = !isActivated;
                                  onToggleInstitutionActivation(inst.id, nextState, {
                                    ...inst.psychopedagogicalConfig,
                                    activatedAt: nextState
                                      ? new Date().toISOString().split('T')[0]
                                      : inst.psychopedagogicalConfig?.activatedAt,
                                    activatedBy: nextState
                                      ? currentUserName
                                      : inst.psychopedagogicalConfig?.activatedBy
                                  });
                                  showNotice(
                                    nextState
                                      ? `Acompanhamento Psicopedagógico ACTIVADO em "${inst.name}".`
                                      : `Acompanhamento Psicopedagógico DESACTIVADO em "${inst.name}".`
                                  );
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                                  isActivated
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white shadow-xs'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>{isActivated ? 'Desactivar' : 'Activar Escola'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSchools.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-[#4b6755]">
                        Nenhuma instituição corresponde aos filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 2: CASOS, TRIAGENS & PLANOS EDUCATIVOS INDIVIDUAIS (PEI)        */}
      {/* =================================================================== */}
      {activeSubTab === 'casos' && (
        <div className="space-y-4">
          {/* Filtros de Casos */}
          <div className="bg-white rounded-2xl border border-[#dce7df] p-3.5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Pesquisar por código PSI, nome do aluno, escola ou especialista..."
                className="w-full bg-[#f7fbf8] text-xs text-[#064e26] rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isSuperAdmin && (
                <select
                  value={caseSchoolFilter}
                  onChange={(e) => setCaseSchoolFilter(e.target.value)}
                  className="bg-[#f7fbf8] text-xs text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] max-w-[220px]"
                >
                  <option value="todas">Todas as Escolas</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.acronym || inst.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={caseStatusFilter}
                onChange={(e) => setCaseStatusFilter(e.target.value)}
                className="bg-[#f7fbf8] text-xs text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836]"
              >
                <option value="todos">Todos os Estados</option>
                {Object.entries(STATUS_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>

              <select
                value={casePriorityFilter}
                onChange={(e) => setCasePriorityFilter(e.target.value)}
                className="bg-[#f7fbf8] text-xs text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836]"
              >
                <option value="todas">Todas as Prioridades</option>
                {Object.entries(PRIORITY_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Casos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visibleCases.map((c) => {
              const priorityBadge = PRIORITY_STYLES[c.priority];
              const statusBadge = STATUS_STYLES[c.status];
              const linkedInst = institutions.find((i) => i.id === c.institutionId);
              const instEnabled = Boolean(linkedInst?.features?.psychopedagogicalSupport);

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-extrabold text-[#067836] bg-[#eaf6ee] px-2 py-0.5 rounded-md border border-[#cde6d5]">
                            {c.caseCode}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${priorityBadge.badge}`}
                          >
                            Prioridade: {priorityBadge.label}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.badge}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-[#064e26] mt-2">
                          {c.studentName}
                        </h3>
                        <p className="text-[11px] text-[#4b6755] font-medium">
                          {c.gradeLevel} {c.className ? `· ${c.className}` : ''} ·{' '}
                          <span className="font-semibold text-[#064e26]">{c.institutionName}</span>
                        </p>
                      </div>

                      {isSuperAdmin && !instEnabled && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          Escola por Activar
                        </span>
                      )}
                    </div>

                    <div className="bg-[#f7fbf8] rounded-xl p-3 border border-[#dce7df] text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#064e26]">
                          {CATEGORY_LABELS[c.category]}
                        </span>
                        <span className="text-[#4b6755] tabular-nums">
                          Aberto em {c.openedAt}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed line-clamp-2">
                        {c.summaryNotes}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4b6755]">
                      <span className="flex items-center gap-1 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-[#067836]" />
                        {c.specialistAssigned}
                      </span>
                      <span
                        className={`font-semibold ${
                          c.guardianConsent ? 'text-[#16a34a]' : 'text-amber-700'
                        }`}
                      >
                        {c.guardianConsent
                          ? 'Consentimento Familiar Validado'
                          : 'Consentimento Familiar Pendente'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#dce7df] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#4b6755] flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-[#067836]" />
                      {c.sessions.length} sessão(ões) registada(s)
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCaseModal(c)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#064e26] text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCaseId(c.id);
                          setSessionSpecialist(c.specialistAssigned || currentUserName);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] text-white text-[11px] font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Dossiê &amp; Sessões</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleCases.length === 0 && (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[#dce7df] p-10 text-center text-xs text-[#4b6755]">
                Nenhum caso psicopedagógico encontrado para os filtros actuais.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 3: PROTOCOLOS & DIRECTRIZES INEE / MED                          */}
      {/* =================================================================== */}
      {activeSubTab === 'protocolos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleProtocols.map((prot) => (
            <div
              key={prot.id}
              className="bg-white rounded-2xl border border-[#dce7df] p-5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-extrabold text-[#067836] bg-[#eaf6ee] px-2.5 py-0.5 rounded-md border border-[#cde6d5]">
                        {prot.code}
                      </span>
                      <span className="text-[11px] font-bold text-[#4b6755] bg-[#f7fbf8] px-2.5 py-0.5 rounded-md border border-[#dce7df]">
                        {CATEGORY_LABELS[prot.category]}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-[#064e26] mt-2 leading-snug">
                      {prot.title}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      prot.isActive
                        ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {prot.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{prot.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-[#f7fbf8] rounded-xl p-3 border border-[#dce7df]">
                    <span className="font-extrabold text-[#064e26] uppercase block mb-1.5">
                      Critérios de Triagem
                    </span>
                    <ul className="space-y-1 text-slate-700 list-disc pl-4">
                      {prot.screeningCriteria.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#eaf6ee]/60 rounded-xl p-3 border border-[#cde6d5]">
                    <span className="font-extrabold text-[#064e26] uppercase block mb-1.5">
                      Etapas de Intervenção
                    </span>
                    <ul className="space-y-1 text-slate-700 list-decimal pl-4">
                      {prot.interventionSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-[#4b6755] font-semibold">
                  Base Normativa: {prot.normativeReference}
                </span>

                {isSuperAdmin && onSaveProtocol && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditProtocolModal(prot)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#064e26] font-bold transition cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSaveProtocol({
                          ...prot,
                          isActive: !prot.isActive,
                          updatedAt: new Date().toISOString().split('T')[0]
                        });
                        showNotice(
                          `Protocolo "${prot.code}" ${
                            prot.isActive ? 'desactivado' : 'reactivado'
                          }.`
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        prot.isActive
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-[#067836] text-white'
                      }`}
                    >
                      {prot.isActive ? 'Arquivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONFIGURAR & ACTIVAR ESCOLA                                  */}
      {/* =================================================================== */}
      {configModalSchool && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">
                    Configurar Psicopedagogia · {configModalSchool.acronym || configModalSchool.name}
                  </h3>
                  <span className="text-xs text-white/85 block">
                    {configModalSchool.name} ({configModalSchool.province})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalSchool(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="bg-[#f7fbf8] p-4 rounded-xl border border-[#dce7df] space-y-3">
                <span className="font-extrabold text-[#064e26] uppercase block">
                  1. Técnico / Ponto Focal Responsável na Escola
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Nome do Psicopedagogo / Coordenador
                    </label>
                    <input
                      type="text"
                      value={cfgSpecialistName}
                      onChange={(e) => setCfgSpecialistName(e.target.value)}
                      placeholder="Ex: Dra. Beatriz Ngola"
                      className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">E-mail Institucional</label>
                    <input
                      type="email"
                      value={cfgSpecialistEmail}
                      onChange={(e) => setCfgSpecialistEmail(e.target.value)}
                      placeholder="psicopedagogia@escola.ao"
                      className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">Telefone</label>
                    <input
                      type="text"
                      value={cfgSpecialistPhone}
                      onChange={(e) => setCfgSpecialistPhone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-[#064e26] uppercase block">
                  2. Protocolos Habilitados para Esta Instituição
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {protocols
                    .filter((p) => p.isActive)
                    .map((p) => {
                      const checked = cfgEnabledProtocols.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            checked
                              ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]'
                              : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setCfgEnabledProtocols((prev) =>
                                prev.includes(p.id)
                                  ? prev.filter((id) => id !== p.id)
                                  : [...prev, p.id]
                              )
                            }
                            className="mt-0.5 w-4 h-4 accent-[#067836]"
                          />
                          <div>
                            <span className="font-bold block">
                              {p.code} · {p.title}
                            </span>
                            <span className="text-[11px] text-[#4b6755] block mt-0.5">
                              {p.normativeReference}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#064e26] uppercase block mb-1">
                  3. Orientações de Prontidão &amp; Notas do Super Administrador
                </label>
                <textarea
                  rows={3}
                  value={cfgNotes}
                  onChange={(e) => setCfgNotes(e.target.value)}
                  placeholder="Ex: Escola preparada com sala de atendimento; activar após validação da direcção pedagógica..."
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl p-3 border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#dce7df] bg-[#f7fbf8] flex flex-wrap justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfigModalSchool(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#cde6d5] text-[#064e26] text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveSchoolConfig(false)}
                className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
              >
                Gravar Pré-Configuração (Manter Inactivo)
              </button>
              <button
                type="button"
                onClick={() => handleSaveSchoolConfig(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Gravar e Activar Escola Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: DETALHES DO CASO & REGISTO DE SESSÕES                        */}
      {/* =================================================================== */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded-md">
                    {selectedCase.caseCode}
                  </span>
                  <span className="text-xs text-emerald-100">{selectedCase.institutionName}</span>
                </div>
                <h3 className="text-base font-extrabold mt-1">{selectedCase.studentName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseId(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Resumo & PEI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#f7fbf8] p-3.5 rounded-xl border border-[#dce7df] space-y-1.5">
                  <span className="font-extrabold text-[#064e26] uppercase block">
                    Síntese Psicopedagógica
                  </span>
                  <p className="text-slate-700 leading-relaxed">{selectedCase.summaryNotes}</p>
                </div>
                <div className="bg-[#eaf6ee] p-3.5 rounded-xl border border-[#cde6d5] space-y-1.5">
                  <span className="font-extrabold text-[#064e26] uppercase block">
                    Objectivos do PEI / Adaptações
                  </span>
                  <p className="text-[#055827] leading-relaxed">
                    {selectedCase.peiObjectives || 'Ainda sem objectivos definidos.'}
                  </p>
                </div>
              </div>

              {/* Controlo Rápido de Estado */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f7fbf8] p-3.5 rounded-xl border border-[#dce7df]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#064e26]">Estado do Dossiê:</span>
                  <select
                    value={selectedCase.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as PsychopedagogicalStatus;
                      onSaveCase({
                        ...selectedCase,
                        status: nextStatus,
                        updatedAt: new Date().toISOString().split('T')[0]
                      });
                      showNotice(`Estado do dossiê ${selectedCase.caseCode} actualizado.`);
                    }}
                    className="bg-white text-[#064e26] font-bold rounded-lg px-2.5 py-1.5 border border-[#cde6d5]"
                  >
                    {Object.entries(STATUS_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex items-center gap-2 font-bold text-[#064e26] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCase.guardianConsent}
                    onChange={(e) => {
                      onSaveCase({
                        ...selectedCase,
                        guardianConsent: e.target.checked,
                        updatedAt: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="w-4 h-4 accent-[#067836]"
                  />
                  <span>Consentimento do Encarregado Validado</span>
                </label>
              </div>

              {/* Histórico de Sessões */}
              <div className="space-y-2.5">
                <span className="font-extrabold text-[#064e26] uppercase block">
                  Histórico de Sessões &amp; Intervenções ({selectedCase.sessions.length})
                </span>
                {selectedCase.sessions.length === 0 ? (
                  <p className="text-slate-500 italic">
                    Ainda não existem sessões registadas neste dossiê.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCase.sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-xl border border-[#dce7df] bg-white space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#067836]">
                            {SESSION_TYPE_LABELS[sess.sessionType]} · {sess.date}
                          </span>
                          <span className="text-[11px] font-semibold text-[#4b6755]">
                            Técnico: {sess.specialistName}
                          </span>
                        </div>
                        <p className="text-slate-700">{sess.summary}</p>
                        <p className="text-[11px] text-[#055827] bg-[#eaf6ee] px-2.5 py-1.5 rounded-lg">
                          <strong>Recomendações:</strong> {sess.recommendations}
                          {sess.nextFollowUpDate && ` · Próxima revisão: ${sess.nextFollowUpDate}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nova Sessão */}
              <form
                onSubmit={handleSubmitSession}
                className="bg-[#f7fbf8] p-4 rounded-xl border border-[#cde6d5] space-y-3"
              >
                <span className="font-extrabold text-[#064e26] uppercase block">
                  + Registar Nova Sessão de Acompanhamento
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">Tipo de Sessão</label>
                    <select
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value as any)}
                      className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                    >
                      {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">Próxima Revisão</label>
                    <input
                      type="date"
                      value={sessionNextDate}
                      onChange={(e) => setSessionNextDate(e.target.value)}
                      className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Resumo da Observação / Atendimento *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={sessionSummary}
                    onChange={(e) => setSessionSummary(e.target.value)}
                    placeholder="Descreva os progressos, dificuldades observadas ou pontos tratados com o aluno/família..."
                    className="w-full bg-white text-[#064e26] rounded-xl p-2.5 border border-[#cde6d5]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Recomendações Pedagógicas
                  </label>
                  <input
                    type="text"
                    value={sessionRecommendations}
                    onChange={(e) => setSessionRecommendations(e.target.value)}
                    placeholder="Ex: Adaptação de enunciados em sala e acompanhamento familiar semanal"
                    className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Registar Sessão
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: NOVO / EDITAR CASO PSICOPEDAGÓGICO                           */}
      {/* =================================================================== */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-extrabold">
                {editingCaseId
                  ? 'Editar Dossiê Psicopedagógico'
                  : 'Registar Nova Triagem / Caso Psicopedagógico'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCaseModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCase} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isSuperAdmin && (
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#064e26] block mb-1">
                      Instituição Escolar *
                    </label>
                    <select
                      value={caseInstId}
                      onChange={(e) => {
                        setCaseInstId(e.target.value);
                        setCaseStudentId('');
                      }}
                      className="w-full bg-[#f7fbf8] text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5]"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.province})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableStudentsForCaseModal.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#064e26] block mb-1">
                      Seleccionar Aluno Matriculado (Opcional)
                    </label>
                    <select
                      value={caseStudentId}
                      onChange={(e) => handleSelectExistingStudent(e.target.value)}
                      className="w-full bg-[#eaf6ee] text-[#064e26] font-semibold rounded-xl px-3 py-2 border border-[#cde6d5]"
                    >
                      <option value="">-- Preencher manualmente ou escolher aluno --</option>
                      {availableStudentsForCaseModal.map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          {stu.fullName} ({stu.processNumber} · {stu.gradeLevel})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Nome Completo do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    value={caseStudentName}
                    onChange={(e) => setCaseStudentName(e.target.value)}
                    placeholder="Nome do estudante"
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Classe / Ano &amp; Turma *
                  </label>
                  <input
                    type="text"
                    required
                    value={caseGradeLevel}
                    onChange={(e) => setCaseGradeLevel(e.target.value)}
                    placeholder="Ex: 6.ª Classe"
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Área / Categoria</label>
                  <select
                    value={caseCategory}
                    onChange={(e) => setCaseCategory(e.target.value as any)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Nível de Prioridade</label>
                  <select
                    value={casePriority}
                    onChange={(e) => setCasePriority(e.target.value as any)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  >
                    {Object.entries(PRIORITY_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Protocolo Aplicado</label>
                  <select
                    value={caseProtocolId}
                    onChange={(e) => setCaseProtocolId(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  >
                    <option value="">Sem protocolo específico</option>
                    {protocols.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Especialista / Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={caseSpecialist}
                    onChange={(e) => setCaseSpecialist(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Encarregado de Educação
                  </label>
                  <input
                    type="text"
                    value={caseGuardianName}
                    onChange={(e) => setCaseGuardianName(e.target.value)}
                    placeholder="Nome do encarregado"
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 font-bold text-[#064e26] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={caseGuardianConsent}
                      onChange={(e) => setCaseGuardianConsent(e.target.checked)}
                      className="w-4 h-4 accent-[#067836]"
                    />
                    <span>Consentimento Familiar Recolhido</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#064e26] block mb-1">
                  Motivo da Sinalização &amp; Observações Iniciais *
                </label>
                <textarea
                  required
                  rows={3}
                  value={caseSummaryNotes}
                  onChange={(e) => setCaseSummaryNotes(e.target.value)}
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl p-3 border border-[#cde6d5]"
                />
              </div>

              <div>
                <label className="font-bold text-[#064e26] block mb-1">
                  Objectivos do Plano Educativo Individual (PEI)
                </label>
                <textarea
                  rows={2}
                  value={casePeiObjectives}
                  onChange={(e) => setCasePeiObjectives(e.target.value)}
                  placeholder="Metas pedagógicas, adaptações curriculares ou estratégias de apoio..."
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl p-3 border border-[#cde6d5]"
                />
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] text-[#064e26] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] text-white font-bold shadow-xs cursor-pointer"
                >
                  Gravar Dossiê Psicopedagógico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: NOVO / EDITAR PROTOCOLO (SUPER ADMIN)                        */}
      {/* =================================================================== */}
      {isProtocolModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-extrabold">
                {editingProtocolId
                  ? 'Editar Protocolo Psicopedagógico'
                  : 'Criar Protocolo Psicopedagógico INEE / MED'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProtocolModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitProtocol}
              className="p-5 overflow-y-auto space-y-4 text-xs flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={protCode}
                    onChange={(e) => setProtCode(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] font-mono font-bold rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-[#064e26] block mb-1">
                    Título do Protocolo *
                  </label>
                  <input
                    type="text"
                    required
                    value={protTitle}
                    onChange={(e) => setProtTitle(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Categoria</label>
                  <select
                    value={protCategory}
                    onChange={(e) => setProtCategory(e.target.value as any)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Referência Normativa (MED / INEE)
                  </label>
                  <input
                    type="text"
                    value={protNormative}
                    onChange={(e) => setProtNormative(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#064e26] block mb-1">Descrição *</label>
                <textarea
                  required
                  rows={2}
                  value={protDescription}
                  onChange={(e) => setProtDescription(e.target.value)}
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl p-3 border border-[#cde6d5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Critérios de Triagem (1 por linha)
                  </label>
                  <textarea
                    rows={4}
                    value={protCriteriaText}
                    onChange={(e) => setProtCriteriaText(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl p-3 border border-[#cde6d5]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    Etapas de Intervenção (1 por linha)
                  </label>
                  <textarea
                    rows={4}
                    value={protStepsText}
                    onChange={(e) => setProtStepsText(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl p-3 border border-[#cde6d5]"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 font-bold text-[#064e26] cursor-pointer">
                <input
                  type="checkbox"
                  checked={protIsActive}
                  onChange={(e) => setProtIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#067836]"
                />
                <span>Protocolo Activo e Disponível para Activação nas Escolas</span>
              </label>

              <div className="pt-3 border-t border-[#dce7df] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProtocolModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] text-[#064e26] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] text-white font-bold shadow-xs cursor-pointer"
                >
                  Guardar Protocolo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
