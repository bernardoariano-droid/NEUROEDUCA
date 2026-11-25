/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Paleta de Comandos Executiva (⌘K / Ctrl+K)
 * Pesquisa universal rápida e acções inteligentes em toda a plataforma
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  GraduationCap,
  Layers,
  Users,
  DollarSign,
  ClipboardList,
  Sparkles,
  FileText,
  ShieldCheck,
  Building2,
  BookOpen,
  ArrowRight,
  CornerDownLeft,
  ChevronRight,
  Award,
  FolderArchive,
  Megaphone
} from 'lucide-react';
import { Institution, Student, ClassRoom, Teacher, Invoice, UserProfile, UserRole } from '../types';
import { formatKwanza } from '../utils/currency';
import { resolveAuthorizedStudentsForUser } from '../utils/studentAccess';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstitution: Institution | null;
  institutions: Institution[];
  students: Student[];
  classes: ClassRoom[];
  teachers: Teacher[];
  invoices: Invoice[];
  onNavigateTab: (tab: string) => void;
  onSelectInstitution?: (inst: Institution) => void;
  onOpenNewStudent?: () => void;
  onOpenNewClass?: () => void;
  onOpenNewInvoice?: () => void;
  currentUser?: UserProfile | null;
  activeRole?: UserRole;
  currentTeacher?: Teacher | null;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  currentInstitution,
  institutions,
  students,
  classes,
  teachers,
  invoices,
  onNavigateTab,
  onOpenNewStudent,
  onOpenNewClass,
  onOpenNewInvoice,
  currentUser,
  activeRole,
  currentTeacher
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Listener para teclado Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Filtragem dos dados contextuais
  const currentInstStudents = students.filter(
    (s) => !currentInstitution || s.institutionId === currentInstitution.id
  );
  const currentInstClasses = classes.filter(
    (c) => !currentInstitution || c.institutionId === currentInstitution.id
  );
  const currentInstTeachers = teachers.filter(
    (t) => !currentInstitution || t.institutionId === currentInstitution.id
  );
  const currentInstInvoices = invoices.filter(
    (i) => !currentInstitution || i.institutionId === currentInstitution.id
  );

  const isStudentMode =
    currentUser?.role === 'aluno' ||
    currentUser?.role === 'encarregado_educacao' ||
    activeRole === 'aluno' ||
    activeRole === 'encarregado_educacao';

  const isProfessorMode =
    !isStudentMode &&
    (currentUser?.role === 'professor' ||
      currentUser?.role === 'director_turma' ||
      activeRole === 'professor' ||
      activeRole === 'director_turma');

  const isSuperAdminMode =
    !isStudentMode &&
    !isProfessorMode &&
    (currentUser?.role === 'super_admin' || activeRole === 'super_admin');

  const isMunicipalDirectorMode =
    !isStudentMode &&
    !isProfessorMode &&
    !isSuperAdminMode &&
    (currentUser?.role === 'director_municipal' || activeRole === 'director_municipal');

  const isSchoolAdminMode =
    !isStudentMode && !isProfessorMode && !isSuperAdminMode && !isMunicipalDirectorMode;

  // Identificar estritamente o(s) aluno(s) autorizado(s) na sessão se for modo estudante/encarregado
  const authorizedStudents = isStudentMode
    ? resolveAuthorizedStudentsForUser(
        students,
        currentInstitution?.id,
        currentUser,
        activeRole
      )
    : [];
  const authorizedStudentIds = new Set(authorizedStudents.map((s) => s.id));

  // Turmas e alunos permitidos ao professor
  const teacherClassIds = isProfessorMode
    ? currentTeacher?.assignedClasses?.map((a) => a.classId) ||
      currentInstClasses.filter((c) => c.classDirectorId === currentTeacher?.id).map((c) => c.id)
    : [];
  const professorClasses = isProfessorMode
    ? currentInstClasses.filter((c) => teacherClassIds.includes(c.id))
    : [];
  const allowedClassesForUser = isProfessorMode
    ? (professorClasses.length > 0 ? professorClasses : currentInstClasses.slice(0, 1))
    : isSchoolAdminMode
    ? currentInstClasses
    : [];

  // Filtragem dos dados contextuais com respeito rigoroso às permissões
  const filteredStudents = isStudentMode
    ? authorizedStudents
    : isProfessorMode
    ? currentInstStudents.filter((s) => allowedClassesForUser.some((c) => c.id === s.classId))
    : isSchoolAdminMode
    ? currentInstStudents
    : [];

  const filteredInvoices = isStudentMode
    ? currentInstInvoices.filter((i) => authorizedStudentIds.has(i.studentId))
    : isSchoolAdminMode
    ? currentInstInvoices
    : [];

  // Lista de resultados organizados
  interface SearchItem {
    id: string;
    category: 'Acções Rápidas' | 'Estudantes' | 'Turmas' | 'Docentes' | 'Facturas' | 'Módulos' | 'Instituições';
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    action: () => void;
  }

  const items: SearchItem[] = [];

  // 1. Acções rápidas estritamente por perfil
  if (isStudentMode) {
    if (q === '' || 'notas médias trimestre boletim pauta'.includes(q)) {
      items.push({
        id: 'act-student-grades',
        category: 'Acções Rápidas',
        title: 'Consultar Minhas Notas & Médias',
        subtitle: 'Visualizar boletim trimestral, avaliações (AC1, AC2, AC3, MAC, NPT)',
        icon: <Award className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          onNavigateTab('student_grades');
        }
      });
    }

    if (q === '' || 'frequências faltas presenças assiduidade aulas'.includes(q)) {
      items.push({
        id: 'act-student-attendance',
        category: 'Acções Rápidas',
        title: 'Verificar Frequências & Faltas',
        subtitle: 'Consultar histórico de assiduidade escolar e justificar faltas',
        icon: <Users className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          onNavigateTab('student_attendance');
        }
      });
    }

    if (q === '' || 'propina mensalidade pagamento multicaixa kwanza'.includes(q)) {
      items.push({
        id: 'act-student-tuition',
        category: 'Acções Rápidas',
        title: 'Propinas & Referências Multicaixa',
        subtitle: 'Consultar mensalidades e gerar dados para pagamento no Express',
        icon: <DollarSign className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onNavigateTab('student_tuition');
        }
      });
    }

    if (q === '' || 'matrícula confirmação recibo processo ano lectivo'.includes(q)) {
      items.push({
        id: 'act-student-enrollment',
        category: 'Acções Rápidas',
        title: 'Comprovativo de Matrícula',
        subtitle: 'Visualizar confirmação e recibo da taxa de matrícula 2026/2027',
        icon: <FileText className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          onNavigateTab('student_enrollment');
        }
      });
    }

    if (q === '' || 'declaração certificado documento guia transferências'.includes(q)) {
      items.push({
        id: 'act-student-docs',
        category: 'Acções Rápidas',
        title: 'Minhas Declarações & Certificados',
        subtitle: 'Emitir comprovativo escolar oficial com autenticação por QR Code',
        icon: <FileText className="w-4 h-4 text-teal-400" />,
        action: () => {
          onClose();
          onNavigateTab('documents');
        }
      });
    }

    if (q === '' || 'arquivo digital enviar upload bi certificado atestado'.includes(q)) {
      items.push({
        id: 'act-student-archive',
        category: 'Acções Rápidas',
        title: 'Arquivo Digital (Enviar Documentos)',
        subtitle: 'Carregar BI, certidão, certificados ou atestados para o professor e escola',
        icon: <FolderArchive className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onNavigateTab('digital_archive');
        }
      });
    }
  } else if (isProfessorMode) {
    if (q === '' || 'lançar notas pauta avaliação trimestre ac1 ac2 ac3 mac npt'.includes(q)) {
      items.push({
        id: 'act-prof-grades',
        category: 'Acções Rápidas',
        title: 'Lançamento de Notas (Mini-Pauta)',
        subtitle: 'Inserir AC1, AC2, AC3, MAC automático e NPT para a sua turma atribuída',
        icon: <ClipboardList className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          onNavigateTab('evaluations');
        }
      });
    }

    if (q === '' || 'minha turma pauta alunos sala'.includes(q)) {
      items.push({
        id: 'act-prof-class',
        category: 'Acções Rápidas',
        title: 'Minha Turma Atribuída',
        subtitle: 'Consultar sala, horário e lista de alunos da sua turma',
        icon: <Layers className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          onNavigateTab('classes');
        }
      });
    }

    if (q === '' || 'frequencia diaria chamada faltas justificacoes validar presencial'.includes(q)) {
      items.push({
        id: 'act-prof-attendance',
        category: 'Acções Rápidas',
        title: 'Frequência Diária & Validar Justificações',
        subtitle: 'Registar presenças/faltas do dia e validar justificações (sistema ou presencial)',
        icon: <Users className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          onNavigateTab('attendance');
        }
      });
    }

    if (q === '' || 'arquivo digital documentos enviados alunos encarregados'.includes(q)) {
      items.push({
        id: 'act-prof-archive',
        category: 'Acções Rápidas',
        title: 'Arquivo Digital dos Alunos',
        subtitle: 'Visualizar e validar documentos escolares enviados pelos alunos da sua turma',
        icon: <FolderArchive className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onNavigateTab('digital_archive');
        }
      });
    }

    if (q === '' || 'ia pedagógica plano de aula exercícios prova exame'.includes(q)) {
      items.push({
        id: 'act-prof-ai',
        category: 'Acções Rápidas',
        title: 'Planos de Aula & IA (INIDE)',
        subtitle: 'Elaborar planos de aula e fichas de avaliação segundo currículo nacional',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          onNavigateTab('pedagogical_ai');
        }
      });
    }
  } else if (isSuperAdminMode) {
    if (q === '' || 'escolas instituições cadastrar limite turmas'.includes(q)) {
      items.push({
        id: 'act-super-inst',
        category: 'Acções Rápidas',
        title: 'Gerir Instituições & Administradores',
        subtitle: 'Cadastrar escolas, definir limites de turmas e subsistemas',
        icon: <Building2 className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          onNavigateTab('super_institutions');
        }
      });
    }

    if (q === '' || 'subscrições planos licença saas'.includes(q)) {
      items.push({
        id: 'act-super-plans',
        category: 'Acções Rápidas',
        title: 'Planos de Subscrição SaaS',
        subtitle: 'Gerir níveis de subscrição e quotas das escolas',
        icon: <ShieldCheck className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          onNavigateTab('super_subscriptions');
        }
      });
    }

    if (q === '' || 'auditoria logs segurança'.includes(q)) {
      items.push({
        id: 'act-super-audit',
        category: 'Acções Rápidas',
        title: 'Registo Global de Auditoria',
        subtitle: 'Monitorizar eventos críticos de segurança da plataforma',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          onNavigateTab('super_audit');
        }
      });
    }
  } else if (isMunicipalDirectorMode) {
    if (q === '' || 'consolidado municipio estatisticas resumo'.includes(q)) {
      items.push({
        id: 'act-mun-dash',
        category: 'Acções Rápidas',
        title: `Consolidado do Município (${currentUser?.municipality || 'Educação'})`,
        subtitle: 'Visão agregada das escolas, género M/F, turmas e aproveitamento',
        icon: <Building2 className="w-4 h-4 text-emerald-500" />,
        action: () => {
          onClose();
          onNavigateTab('municipal_dashboard');
        }
      });
    }
    if (q === '' || 'escolas municipio unidades'.includes(q)) {
      items.push({
        id: 'act-mun-schools',
        category: 'Acções Rápidas',
        title: 'Escolas do Município',
        subtitle: 'Consultar todas as escolas sob jurisdição municipal',
        icon: <Building2 className="w-4 h-4 text-sky-500" />,
        action: () => {
          onClose();
          onNavigateTab('municipal_schools');
        }
      });
    }
    if (q === '' || 'matriculados genero classe turma alunos'.includes(q)) {
      items.push({
        id: 'act-mun-enrollment',
        category: 'Acções Rápidas',
        title: 'Matriculados (Género M/F, Classe, Turma, Escola)',
        subtitle: 'Estatística detalhada e consolidada de matrículas municipais',
        icon: <Users className="w-4 h-4 text-sky-500" />,
        action: () => {
          onClose();
          onNavigateTab('municipal_enrollment');
        }
      });
    }
    if (q === '' || 'aproveitamento pauta notas aprovados reprovados'.includes(q)) {
      items.push({
        id: 'act-mun-perf',
        category: 'Acções Rápidas',
        title: 'Aproveitamento Escolar por Escola',
        subtitle: 'Acompanhar aprovações, recursos, reprovações e pautas gerais',
        icon: <Award className="w-4 h-4 text-amber-500" />,
        action: () => {
          onClose();
          onNavigateTab('municipal_performance');
        }
      });
    }
  } else {
    // Acções Exclusivas do Administrador Escolar
    if (q === '' || 'matricular aluno estudante novo'.includes(q)) {
      items.push({
        id: 'act-new-student',
        category: 'Acções Rápidas',
        title: 'Matricular Novo Aluno',
        subtitle: 'Adicionar ficha cadastral e gerar processo com propina inicial',
        icon: <GraduationCap className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          if (onOpenNewStudent) onOpenNewStudent();
          else onNavigateTab('students');
        }
      });
    }

    if (q === '' || 'criar turma sala classe nova'.includes(q)) {
      items.push({
        id: 'act-new-class',
        category: 'Acções Rápidas',
        title: 'Criar Nova Turma',
        subtitle: 'Definir classe, turno, sala e limite máximo regulamentar',
        icon: <Layers className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          if (onOpenNewClass) onOpenNewClass();
          else onNavigateTab('classes');
        }
      });
    }

    if (currentUser?.role === 'funcionario_financeiro' && (q === '' || 'propina factura matrícula outros pagamento cobrança emitir tesoureiro'.includes(q))) {
      items.push({
        id: 'act-new-invoice',
        category: 'Acções Rápidas',
        title: 'Registar Finança (Propina / Matrícula / Outros)',
        subtitle: 'Registo exclusivo do Tesoureiro com referência Multicaixa e notificação',
        icon: <DollarSign className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          if (onOpenNewInvoice) onOpenNewInvoice();
          else onNavigateTab('financial');
        }
      });
    }

    if (q === '' || 'pautas mini-pautas boletim boletins notas avaliação med'.includes(q)) {
      items.push({
        id: 'act-admin-evaluations',
        category: 'Acções Rápidas',
        title: 'Pautas, Mini-Pautas & Boletins (MED)',
        subtitle: 'Consultar, exportar CSV e imprimir pautas, mini-pautas e boletins dos alunos',
        icon: <ClipboardList className="w-4 h-4 text-[#16a34a]" />,
        action: () => {
          onClose();
          onNavigateTab('evaluations');
        }
      });
    }

    if (q === '' || 'faltas assiduidade justificadas injustificadas frequencia aluno'.includes(q)) {
      items.push({
        id: 'act-admin-attendance',
        category: 'Acções Rápidas',
        title: 'Consultar Faltas por Aluno',
        subtitle: 'Visualizar totais de faltas justificadas e não justificadas por estudante',
        icon: <Users className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          onNavigateTab('attendance');
        }
      });
    }

    if (q === '' || 'ia pedagógica plano de aula exercícios prova exame'.includes(q)) {
      items.push({
        id: 'act-ai',
        category: 'Acções Rápidas',
        title: 'Assistente Pedagógico IA (INIDE)',
        subtitle: 'Elaborar planos de aula e fichas de avaliação segundo currículo nacional',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          onClose();
          onNavigateTab('pedagogical_ai');
        }
      });
    }
  }

  // Pesquisa de Alunos (Respeita RBAC: bloqueada para Super Admin e Director Municipal)
  if (q.length > 0 && !isSuperAdminMode && !isMunicipalDirectorMode) {
    const matchedStudents = filteredStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.processNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        (s.identityCardNumber && s.identityCardNumber.toLowerCase().includes(q))
    );

    matchedStudents.slice(0, 4).forEach((stu) => {
      items.push({
        id: `stu-${stu.id}`,
        category: 'Estudantes',
        title: stu.fullName,
        subtitle: `Proc. ${stu.processNumber} · ${stu.className} · ${stu.academicStatus === 'matriculado' ? 'Matriculado' : stu.academicStatus}`,
        icon: <GraduationCap className="w-4 h-4 text-sky-400" />,
        action: () => {
          onClose();
          onNavigateTab(isStudentMode ? 'student_portal' : 'students');
        }
      });
    });
  }

  // Pesquisa de Turmas (Apenas Administrador Escolar e Professor na sua turma)
  if (q.length > 0 && (isSchoolAdminMode || isProfessorMode)) {
    const matchedClasses = allowedClassesForUser.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.room.toLowerCase().includes(q) ||
        c.shift.toLowerCase().includes(q)
    );

    matchedClasses.slice(0, 3).forEach((cls) => {
      items.push({
        id: `cls-${cls.id}`,
        category: 'Turmas',
        title: `${cls.name} (${cls.code})`,
        subtitle: `${cls.gradeLevel} · Turno ${cls.shift} · ${cls.room} · ${cls.enrolledStudentsCount}/${cls.maxCapacity} alunos`,
        icon: <Layers className="w-4 h-4 text-emerald-400" />,
        action: () => {
          onClose();
          onNavigateTab('classes');
        }
      });
    });
  }

  // Pesquisa de Docentes (Apenas Administrador Escolar)
  if (q.length > 0 && isSchoolAdminMode) {
    const matchedTeachers = currentInstTeachers.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.specialization.toLowerCase().includes(q) ||
        t.staffCode.toLowerCase().includes(q)
    );

    matchedTeachers.slice(0, 3).forEach((tch) => {
      items.push({
        id: `tch-${tch.id}`,
        category: 'Docentes',
        title: tch.fullName,
        subtitle: `${tch.academicDegree} em ${tch.specialization} · Cód. ${tch.staffCode}`,
        icon: <Users className="w-4 h-4 text-teal-400" />,
        action: () => {
          onClose();
          onNavigateTab('teachers');
        }
      });
    });
  }

  // Pesquisa de Facturas (Apenas Administrador Escolar ou Aluno/Encarregado nas suas próprias facturas)
  if (q.length > 0 && (isSchoolAdminMode || isStudentMode)) {
    const matchedInvoices = filteredInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.studentName.toLowerCase().includes(q) ||
        inv.description.toLowerCase().includes(q) ||
        (inv.multicaixaReference && inv.multicaixaReference.includes(q))
    );

    matchedInvoices.slice(0, 3).forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        category: 'Facturas',
        title: `${inv.invoiceNumber} · ${inv.studentName}`,
        subtitle: `${inv.description} · ${formatKwanza(inv.totalAoa)} · Estado: ${inv.status.toUpperCase()}`,
        icon: <DollarSign className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onNavigateTab(isStudentMode ? 'student_tuition' : 'financial');
        }
      });
    });
  }

  // Pesquisa de Instituições (Super Administrador e Director Municipal no seu município)
  if (q.length > 0 && (isSuperAdminMode || isMunicipalDirectorMode)) {
    const baseInstPool = isMunicipalDirectorMode
      ? institutions.filter(
          (inst) =>
            !currentUser?.municipality ||
            inst.municipality.trim().toLowerCase() ===
              currentUser.municipality.trim().toLowerCase()
        )
      : institutions;

    const matchedInstitutions = baseInstPool.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        inst.code.toLowerCase().includes(q) ||
        inst.province.toLowerCase().includes(q) ||
        inst.municipality.toLowerCase().includes(q)
    );

    matchedInstitutions.slice(0, 4).forEach((inst) => {
      items.push({
        id: `inst-${inst.id}`,
        category: 'Instituições',
        title: inst.name,
        subtitle: `${inst.municipality} (${inst.province}) · Estado: ${inst.status}`,
        icon: <Building2 className="w-4 h-4 text-emerald-600" />,
        action: () => {
          onClose();
          onNavigateTab(isMunicipalDirectorMode ? 'municipal_schools' : 'super_institutions');
        }
      });
    });
  }

  // Módulos do Sistema (Estritamente Segregados nos 4 Níveis de Acesso)
  const modules = isStudentMode
    ? [
        { title: 'Visão Geral do Aluno', tab: 'student_portal', desc: 'Acompanhamento global de desempenho e dados escolares', icon: <GraduationCap className="w-4 h-4 text-sky-400" /> },
        { title: 'Médias das Notas por Trimestre', tab: 'student_grades', desc: 'Boletim trimestral com fórmula oficial do MED (AC1, AC2, AC3, MAC, NPT)', icon: <Award className="w-4 h-4 text-amber-400" /> },
        { title: 'Frequências às Aulas & Assiduidade', tab: 'student_attendance', desc: 'Registo mensal de presenças, faltas e justificações', icon: <Users className="w-4 h-4 text-emerald-400" /> },
        { title: 'Propinas & Mensalidades (Multicaixa)', tab: 'student_tuition', desc: 'Consultar mensalidades liquidadas e referências para pagamento', icon: <DollarSign className="w-4 h-4 text-cyan-400" /> },
        { title: 'Pagamento de Matrícula & Confirmação', tab: 'student_enrollment', desc: 'Comprovativo oficial e recibo de matrícula 2026/2027', icon: <FileText className="w-4 h-4 text-amber-400" /> },
        { title: 'Declarações & Certificados Oficiais', tab: 'documents', desc: 'Emissão de declarações com código QR de validação', icon: <FileText className="w-4 h-4 text-purple-400" /> },
        { title: 'Arquivo Digital (Enviar Documentos)', tab: 'digital_archive', desc: 'Envio e acompanhamento de documentos escolares digitais', icon: <FolderArchive className="w-4 h-4 text-amber-400" /> },
        { title: 'Comunicações & Comunicados Oficiais', tab: 'communications', desc: 'Avisos e circulares da direcção escolar', icon: <Megaphone className="w-4 h-4 text-emerald-500" /> }
      ]
    : isProfessorMode
    ? [
        { title: 'Minha Turma Atribuída', tab: 'classes', desc: 'Gestão da turma atribuída ao professor e lista de estudantes', icon: <Layers className="w-4 h-4 text-sky-400" /> },
        { title: 'Estudantes da Turma', tab: 'students', desc: 'Consultar fichas dos alunos da sua turma', icon: <GraduationCap className="w-4 h-4 text-emerald-400" /> },
        { title: 'Frequência Diária & Faltas', tab: 'attendance', desc: 'Chamada diária e validação de justificações (sistema ou presencial)', icon: <Users className="w-4 h-4 text-emerald-400" /> },
        { title: 'Lançamento de Notas (Mini-Pauta)', tab: 'evaluations', desc: 'Lançamento de AC1, AC2, AC3, MAC automático, NPT e MT', icon: <ClipboardList className="w-4 h-4 text-emerald-400" /> },
        { title: 'Arquivo Digital dos Alunos', tab: 'digital_archive', desc: 'Visualizar documentos enviados pelos alunos e encarregados', icon: <FolderArchive className="w-4 h-4 text-amber-400" /> },
        { title: 'Planos de Aula & IA Pedagógica', tab: 'pedagogical_ai', desc: 'Preparação de aulas e fichas segundo currículo INIDE', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
        { title: 'Comunicações & Comunicados', tab: 'communications', desc: 'Avisos e circulares da direcção escolar para docentes', icon: <Megaphone className="w-4 h-4 text-emerald-500" /> }
      ]
    : isSuperAdminMode
    ? [
        { title: 'Instituições & Administradores', tab: 'super_institutions', desc: 'Gestão global das escolas, limites e administradores', icon: <Building2 className="w-4 h-4 text-purple-400" /> },
        { title: 'Planos de Subscrição SaaS', tab: 'super_subscriptions', desc: 'Gestão de licenças e planos institucionais', icon: <ShieldCheck className="w-4 h-4 text-sky-400" /> },
        { title: 'Comunicações às Escolas', tab: 'super_communications', desc: 'Enviar comunicados e circulares aos administradores escolares', icon: <Megaphone className="w-4 h-4 text-emerald-500" /> },
        { title: '11 Subsistemas de Angola', tab: 'super_curriculum', desc: 'Base de dados curricular oficial INIDE/MED', icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
        { title: 'Registo de Auditoria Global', tab: 'super_audit', desc: 'Histórico de operações e segurança da plataforma', icon: <ShieldCheck className="w-4 h-4 text-amber-400" /> },
        { title: 'Estrutura Supabase PostgreSQL & RLS', tab: 'super_supabase_sql', desc: '35+ tabelas relacionais com segurança por instituição', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> }
      ]
    : isMunicipalDirectorMode
    ? [
        { title: 'Consolidado do Município', tab: 'municipal_dashboard', desc: 'Resumo global das escolas, género e aproveitamento', icon: <Building2 className="w-4 h-4 text-emerald-500" /> },
        { title: 'Escolas do Município', tab: 'municipal_schools', desc: 'Lista e inspecção das escolas sob tutela municipal', icon: <Building2 className="w-4 h-4 text-sky-500" /> },
        { title: 'Matriculados por Género, Classe e Turma', tab: 'municipal_enrollment', desc: 'Estatística de matrículas M/F por escola, turma e consolidado', icon: <Users className="w-4 h-4 text-sky-500" /> },
        { title: 'Aproveitamento Escolar por Escola', tab: 'municipal_performance', desc: 'Taxas de aprovação, recurso, reprovação e consulta de pautas', icon: <Award className="w-4 h-4 text-amber-500" /> }
      ]
    : [
        { title: 'Painel Executivo / Dashboard', tab: 'dashboard', desc: 'Métricas em tempo real, capacidade e calendário MED', icon: <Building2 className="w-4 h-4 text-sky-400" /> },
        { title: 'Classes & Turmas', tab: 'classes', desc: 'Gestão de turmas, salas e quota contratada', icon: <Layers className="w-4 h-4 text-emerald-400" /> },
        { title: 'Alunos & Matrículas', tab: 'students', desc: 'Matrículas individuais e em massa por lote', icon: <GraduationCap className="w-4 h-4 text-sky-400" /> },
        { title: 'Faltas por Aluno (Consulta)', tab: 'attendance', desc: 'Visualizar faltas justificadas e não justificadas por estudante', icon: <Users className="w-4 h-4 text-amber-400" /> },
        { title: 'Gestão de Utilizadores da Escola', tab: 'school_users', desc: 'Contas e permissões de professores, alunos e staff', icon: <Users className="w-4 h-4 text-indigo-400" /> },
        { title: 'Pautas, Mini-Pautas & Boletins (MED)', tab: 'evaluations', desc: 'Consulta e impressão de Mini-Pautas, Pautas Gerais e Boletins de Notas', icon: <ClipboardList className="w-4 h-4 text-emerald-400" /> },
        { title: 'Centro de Documentos & Certificados', tab: 'documents', desc: 'Emissão de declarações com código QR oficial', icon: <FileText className="w-4 h-4 text-amber-400" /> },
        { title: 'Arquivo Digital (Envios)', tab: 'digital_archive', desc: 'Visualizar e validar documentos enviados por alunos e encarregados', icon: <FolderArchive className="w-4 h-4 text-amber-400" /> },
        { title: 'Comunicações & Comunicados', tab: 'communications', desc: 'Enviar e consultar comunicados oficiais da escola e do Super Admin', icon: <Megaphone className="w-4 h-4 text-emerald-500" /> },
        { title: 'Gestão Financeira & Cobranças', tab: 'financial', desc: 'Controlo de propinas e referências Multicaixa', icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
        { title: 'Explorador Curricular dos 11 Subsistemas', tab: 'curriculum_explorer', desc: 'Planos curriculares oficiais de Angola', icon: <BookOpen className="w-4 h-4 text-purple-400" /> },
        { title: 'Estatísticas & Relatórios Oficiais', tab: 'reports', desc: 'Rácios de género, aprovação e receitas AOA', icon: <Layers className="w-4 h-4 text-teal-400" /> },
        { title: 'Módulos Especializados (Creche, PEI, Ensino Superior)', tab: 'specialized_subsystems', desc: 'Fichas de creche, PEI e créditos universitários', icon: <GraduationCap className="w-4 h-4 text-indigo-400" /> },
        { title: 'Estrutura Supabase PostgreSQL & RLS', tab: 'super_supabase_sql', desc: '35+ tabelas relacionais com segurança por instituição', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> }
      ];

  modules
    .filter((m) => q === '' || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q))
    .slice(0, q ? 3 : 4)
    .forEach((m) => {
      items.push({
        id: `mod-${m.tab}`,
        category: 'Módulos',
        title: m.title,
        subtitle: m.desc,
        icon: m.icon,
        action: () => {
          onClose();
          onNavigateTab(m.tab);
        }
      });
    });

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-emerald-950/55 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#dce7df] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/15 bg-gradient-to-r from-[#067836] to-[#149a45] text-white gap-3">
          <Search className="w-5 h-5 text-emerald-100 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pesquisar alunos, turmas, facturas, pautas ou acções rápidas..."
            className="w-full bg-transparent text-white placeholder-emerald-100/80 text-sm focus:outline-hidden font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-emerald-100 hover:text-white p-1 rounded-md transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono text-white bg-white/15 border border-white/25 px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Nenhum resultado encontrado para "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">
                Tente pesquisar por nome de aluno, turma, nº de processo ou funcionalidade.
              </p>
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#eaf6ee] text-[#055827] border border-[#cde6d5]'
                      : 'hover:bg-[#f3f7f4] text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-white border border-[#cde6d5]' : 'bg-[#f3f7f4]'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 truncate">{item.title}</span>
                        <span className="text-[10px] font-semibold text-[#067836] bg-[#eaf6ee] px-2 py-0.5 rounded border border-[#cde6d5]">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-3">
                    {isSelected && (
                      <span className="text-[11px] text-[#067836] font-semibold flex items-center space-x-1">
                        <span>Seleccionar</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#f3f7f4] border-t border-[#dce7df] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navegar</span>
            <span>↵ Executar</span>
            <span>ESC Fechar</span>
          </div>
          <div className="text-[#067836] font-sans font-semibold text-[11px]">
            NEUROEDUCA · Gestão Escolar Inteligente
          </div>
        </div>
      </div>
    </div>
  );
};
