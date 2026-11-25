/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão de Turmas e Validação de Limites de Capacidade (45 Alunos)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Plus,
  Users,
  AlertTriangle,
  Clock,
  DoorOpen,
  GraduationCap,
  CheckCircle,
  X,
  Search,
  Filter,
  Eye,
  Edit2,
  BookOpen,
  Trash2,
  RotateCcw,
  Check,
  ClipboardList,
  Award
} from 'lucide-react';
import {
  ClassRoom,
  Institution,
  Teacher,
  Student,
  UserRole,
  UserProfile,
  EducationSubsystemCode,
  CurriculumSubject,
  SchoolSubject
} from '../../types';
import {
  ANGOLA_EDUCATION_SUBSYSTEMS,
  OFFICIAL_CURRICULUM_PLANS
} from '../../data/angolaCurriculum';
import { resolveSubjectsForClass, isExamAndRecourseEligible } from '../../utils/evaluationEngine';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import { DocumentExportBar } from '../common/DocumentExportBar';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';

interface ClassesManagerProps {
  currentInstitution: Institution;
  classes: ClassRoom[];
  teachers: Teacher[];
  students?: Student[];
  customSubjects?: SchoolSubject[];
  onAddSubject?: (subject: SchoolSubject) => void;
  onAddClass: (newClass: ClassRoom) => void;
  onUpdateClass?: (updatedClass: ClassRoom) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenClassEvaluations?: (classId: string, evalTab: 'mini_pauta' | 'pauta_geral') => void;
  initialOpenModal?: boolean;
  activeRole?: UserRole;
  currentUser?: UserProfile | null;
  currentTeacher?: Teacher | null;
  initialSearchTerm?: string;
  initialOpenRosterClassId?: string;
  navigationKey?: number;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({
  currentInstitution,
  classes,
  teachers,
  students = [],
  customSubjects = [],
  onAddSubject,
  onAddClass,
  onUpdateClass,
  onNavigateTab,
  onOpenClassEvaluations,
  initialOpenModal = false,
  activeRole,
  currentUser,
  currentTeacher,
  initialSearchTerm,
  initialOpenRosterClassId,
  navigationKey
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(initialOpenModal);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [selectedClassRoster, setSelectedClassRoster] = useState<ClassRoom | null>(null);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const rosterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigationKey === undefined) return;
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
    if (initialOpenRosterClassId) {
      const targetClass = classes.find((c) => c.id === initialOpenRosterClassId);
      if (targetClass) {
        setSelectedClassRoster(targetClass);
      }
    }
  }, [navigationKey, initialSearchTerm, initialOpenRosterClassId, classes]);

  const isSuperAdmin = currentUser?.role === 'super_admin' || activeRole === 'super_admin';
  const isProfessor =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma' ||
    activeRole === 'professor' ||
    activeRole === 'director_turma';
  const isSchoolAdmin = !isSuperAdmin && !isProfessor;

  const availableSubsystems = ANGOLA_EDUCATION_SUBSYSTEMS.filter((s) =>
    currentInstitution.subsystems.includes(s.code)
  );

  // Form states
  const defaultSubsystemObj = availableSubsystems[0];
  const initialSubsystemCode: EducationSubsystemCode =
    defaultSubsystemObj?.code || currentInstitution.subsystems[0] || 'primario_geral';
  const initialGrade = defaultSubsystemObj?.gradesOrYears[0] || '10.ª Classe';
  const initialCourse = defaultSubsystemObj?.coursesAvailable?.[0] || '';

  const buildSuggestedSubjects = (
    subCode: EducationSubsystemCode,
    grade: string,
    course?: string
  ): CurriculumSubject[] => {
    const resolved = resolveSubjectsForClass(subCode, grade, course, customSubjects);
    if (resolved.length > 0) {
      return resolved.map((s) => ({ ...s }));
    }
    return [
      {
        id: `sub-${Date.now()}-lp`,
        code: 'LP',
        name: 'Língua Portuguesa',
        shortName: 'LP',
        group: 'geral',
        weeklyHours: 4,
        coefficient: 1
      }
    ];
  };

  const [formSubsystem, setFormSubsystem] = useState<EducationSubsystemCode>(initialSubsystemCode);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formGrade, setFormGrade] = useState(initialGrade);
  const [formCourse, setFormCourse] = useState(initialCourse);
  const [formShift, setFormShift] = useState<ClassRoom['shift']>('manha');
  const [formRoom, setFormRoom] = useState('Sala 01');
  const [formDirectorId, setFormDirectorId] = useState('');
  const [formCapacity, setFormCapacity] = useState(45); // Padrão 45 alunos em Angola

  // Disciplinas integradas na turma (>= 1 obrigatória, editáveis na criação e edição)
  const [formSubjects, setFormSubjects] = useState<CurriculumSubject[]>(() =>
    buildSuggestedSubjects(initialSubsystemCode, initialGrade, initialCourse)
  );
  const [hasEditedSubjects, setHasEditedSubjects] = useState(false);
  const [subjectFormError, setSubjectFormError] = useState<string | null>(null);
  const [catalogPickKey, setCatalogPickKey] = useState('');
  const [showInlineNewSubject, setShowInlineNewSubject] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubShort, setNewSubShort] = useState('');
  const [newSubHours, setNewSubHours] = useState(4);
  const [newSubGroup, setNewSubGroup] = useState<CurriculumSubject['group']>('geral');
  const [newSubExam, setNewSubExam] = useState(false);
  const [saveNewSubToCatalog, setSaveNewSubToCatalog] = useState(true);

  const instClasses = classes.filter((c) => c.institutionId === currentInstitution.id);
  const instCustomSubjects = customSubjects.filter(
    (s) => s.institutionId === currentInstitution.id && s.status === 'activa'
  );

  // Catálogo combinado (escola + planos oficiais) para inclusão rápida na turma
  const catalogOptions: CurriculumSubject[] = (() => {
    const map = new Map<string, CurriculumSubject>();
    instCustomSubjects.forEach((s) => {
      map.set(s.name.toLowerCase(), {
        id: s.id,
        code: s.code,
        name: s.name,
        shortName: s.shortName,
        group: s.group,
        weeklyHours: s.weeklyHours,
        coefficient: s.coefficient,
        isTerminalExam: s.isTerminalExam
      });
    });
    OFFICIAL_CURRICULUM_PLANS.forEach((plan) => {
      plan.subjects.forEach((s) => {
        if (!map.has(s.name.toLowerCase())) {
          map.set(s.name.toLowerCase(), { ...s });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // Se for professor, restringe estritamente à turma atribuída
  const teacherClassIds = currentTeacher?.assignedClasses?.map((a) => a.classId) ||
    instClasses.filter((c) => c.classDirectorId === currentTeacher?.id).map((c) => c.id);
  const professorClasses = instClasses.filter((c) => teacherClassIds.includes(c.id));
  const baseClasses = isProfessor
    ? (professorClasses.length > 0 ? professorClasses : (instClasses.length > 0 ? [instClasses[0]] : []))
    : instClasses;

  const filteredClasses = baseClasses.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.room.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'exames_en_rec') {
      return isExamAndRecourseEligible(c.subsystemCode, c.gradeLevel);
    }
    if (statusFilter === 'trimestral_sem_exame') {
      return !isExamAndRecourseEligible(c.subsystemCode, c.gradeLevel);
    }
    if (statusFilter === 'abertas') return c.status === 'aberta' && c.enrolledStudentsCount < c.maxCapacity;
    if (statusFilter === 'lotadas') return c.enrolledStudentsCount >= c.maxCapacity;
    if (statusFilter === 'manha') return c.shift === 'manha';
    if (statusFilter === 'tarde') return c.shift === 'tarde';
    if (statusFilter.startsWith('sub:')) {
      return c.subsystemCode === statusFilter.replace('sub:', '');
    }
    return true;
  });

  const classFunctionalFilterOptions: FunctionalDropdownOption[] = [
    {
      value: 'todas',
      label: `Todas as Turmas (${baseClasses.length})`,
      description: 'Listar todas as turmas da instituição',
      group: 'Visão Geral',
      badge: `${baseClasses.length}`,
      badgeTone: 'slate'
    },
    {
      value: 'exames_en_rec',
      label: 'Com Exames (EN) & Recurso (REC)',
      description: '6.ª, Módulo 3, Etapa 3, 9.ª, 12.ª e Ensino Superior',
      group: 'Regime de Avaliação',
      badge: 'EN / REC',
      badgeTone: 'amber'
    },
    {
      value: 'trimestral_sem_exame',
      label: 'Regime Puramente Trimestral',
      description: 'Classes sem Exames EN nem Recursos REC',
      group: 'Regime de Avaliação',
      badge: 'CAP',
      badgeTone: 'emerald'
    },
    {
      value: 'abertas',
      label: 'Com Vagas Disponíveis',
      description: 'Turmas abertas abaixo de 45 alunos',
      group: 'Ocupação & Turno',
      badge: 'Abertas',
      badgeTone: 'emerald'
    },
    {
      value: 'lotadas',
      label: 'Turmas Lotadas',
      description: 'Capacidade máxima atingida',
      group: 'Ocupação & Turno',
      badge: 'Lotadas',
      badgeTone: 'rose'
    },
    {
      value: 'manha',
      label: 'Turno da Manhã',
      group: 'Ocupação & Turno',
      badge: 'Manhã',
      badgeTone: 'amber'
    },
    {
      value: 'tarde',
      label: 'Turno da Tarde',
      group: 'Ocupação & Turno',
      badge: 'Tarde',
      badgeTone: 'emerald'
    },
    ...availableSubsystems.map((sub) => ({
      value: `sub:${sub.code}`,
      label: sub.name,
      description: sub.shortName,
      group: 'Subsistemas Cadastrados',
      badge: sub.shortName,
      badgeTone: 'purple' as const
    }))
  ];

  const openEditClassModal = (cls: ClassRoom) => {
    if (!isSchoolAdmin) {
      setLimitNotice(
        'Restrição de Perfil: A criação e edição de turmas é da inteira responsabilidade do Administrador Escolar.'
      );
      return;
    }
    const existingSubjects =
      cls.subjects && cls.subjects.length > 0
        ? cls.subjects.map((s) => ({ ...s }))
        : buildSuggestedSubjects(cls.subsystemCode, cls.gradeLevel, cls.courseName);

    setEditingClass(cls);
    setFormSubsystem(cls.subsystemCode || availableSubsystems[0]?.code || 'primario_geral');
    setFormName(cls.name);
    setFormCode(cls.code);
    setFormGrade(cls.gradeLevel);
    setFormCourse(cls.courseName || '');
    setFormShift(cls.shift);
    setFormRoom(cls.room);
    setFormDirectorId(cls.classDirectorId || '');
    setFormCapacity(cls.maxCapacity);
    setFormSubjects(existingSubjects);
    setHasEditedSubjects(true);
    setSubjectFormError(null);
    setShowInlineNewSubject(false);
    setCatalogPickKey('');
    setIsModalOpen(true);
  };

  const openNewClassModal = () => {
    if (!isSchoolAdmin) {
      setLimitNotice(
        'Restrição de Perfil: A criação de turmas é da inteira responsabilidade do Administrador Escolar.'
      );
      return;
    }
    const defaultSub = availableSubsystems[0];
    const nextSubCode = defaultSub?.code || 'primario_geral';
    const nextGrade = defaultSub?.gradesOrYears[0] || '10.ª Classe';
    const nextCourse = defaultSub?.coursesAvailable?.[0] || '';

    setEditingClass(null);
    setFormSubsystem(nextSubCode);
    setFormName('');
    setFormCode('');
    setFormGrade(nextGrade);
    setFormCourse(nextCourse);
    setFormShift('manha');
    setFormRoom('Sala 01');
    setFormDirectorId('');
    setFormCapacity(45);
    setFormSubjects(buildSuggestedSubjects(nextSubCode, nextGrade, nextCourse));
    setHasEditedSubjects(false);
    setSubjectFormError(null);
    setShowInlineNewSubject(false);
    setCatalogPickKey('');
    setIsModalOpen(true);
  };

  const handleUpdateSubjectField = (
    idx: number,
    patch: Partial<CurriculumSubject>
  ) => {
    setHasEditedSubjects(true);
    setSubjectFormError(null);
    setFormSubjects((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveSubjectFromClass = (idx: number) => {
    if (formSubjects.length <= 1) {
      setSubjectFormError(
        'Mínimo obrigatório: A turma deve ter pelo menos 1 disciplina integrada.'
      );
      return;
    }
    setHasEditedSubjects(true);
    setSubjectFormError(null);
    setFormSubjects((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddFromCatalog = (subjectId: string) => {
    if (!subjectId) return;
    const found = catalogOptions.find((o) => o.id === subjectId);
    if (!found) return;
    const alreadyExists = formSubjects.some(
      (s) =>
        s.id === found.id ||
        s.name.toLowerCase() === found.name.toLowerCase()
    );
    if (alreadyExists) {
      setSubjectFormError(`A disciplina "${found.name}" já está integrada nesta turma.`);
      return;
    }
    setHasEditedSubjects(true);
    setSubjectFormError(null);
    setFormSubjects((prev) => [...prev, { ...found }]);
    setCatalogPickKey('');
  };

  const handleCreateInlineSubject = () => {
    const cleanName = newSubName.trim();
    if (!cleanName) {
      setSubjectFormError('Indique o nome da disciplina a adicionar.');
      return;
    }
    const cleanCode = (newSubCode.trim() || cleanName.slice(0, 4)).toUpperCase();
    const cleanShort = (newSubShort.trim() || cleanCode.slice(0, 4)).toUpperCase();
    const newId = `sub-cls-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newSubjectObj: CurriculumSubject = {
      id: newId,
      code: cleanCode,
      name: cleanName,
      shortName: cleanShort,
      group: newSubGroup,
      weeklyHours: Math.max(1, Number(newSubHours) || 4),
      coefficient: 1,
      isTerminalExam: newSubExam
    };

    if (saveNewSubToCatalog && onAddSubject) {
      onAddSubject({
        ...newSubjectObj,
        institutionId: currentInstitution.id,
        subsystemCode: formSubsystem,
        gradeLevel: formGrade || 'Todas',
        courseName: formCourse || undefined,
        status: 'activa',
        isCustom: true,
        createdAt: new Date().toISOString().split('T')[0]
      });
    }

    setHasEditedSubjects(true);
    setSubjectFormError(null);
    setFormSubjects((prev) => [...prev, newSubjectObj]);
    setNewSubName('');
    setNewSubCode('');
    setNewSubShort('');
    setNewSubHours(4);
    setNewSubExam(false);
    setShowInlineNewSubject(false);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSchoolAdmin) {
      setIsModalOpen(false);
      setLimitNotice(
        'Restrição de Perfil: Apenas o Administrador Escolar pode criar ou alterar turmas.'
      );
      return;
    }
    if (!formName.trim() || !formCode.trim()) return;

    const cleanedSubjects: CurriculumSubject[] = formSubjects
      .map((s, idx) => {
        const cleanName = s.name.trim();
        const fallbackCode = `D${idx + 1}`;
        const cleanCode = (s.code.trim() || fallbackCode).toUpperCase();
        return {
          ...s,
          name: cleanName,
          code: cleanCode,
          shortName: (s.shortName.trim() || cleanCode).toUpperCase(),
          weeklyHours: Math.max(1, Number(s.weeklyHours) || 2),
          coefficient: Math.max(0.5, Number(s.coefficient) || 1)
        };
      })
      .filter((s) => s.name.length > 0);

    if (cleanedSubjects.length < 1) {
      setSubjectFormError(
        'Mínimo obrigatório: Registe pelo menos 1 disciplina válida integrada nesta turma.'
      );
      return;
    }

    const director = teachers.find((t) => t.id === formDirectorId);

    if (editingClass && onUpdateClass) {
      onUpdateClass({
        ...editingClass,
        subsystemCode: formSubsystem,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        gradeLevel: formGrade,
        courseName: formCourse || undefined,
        subjects: cleanedSubjects,
        shift: formShift,
        room: formRoom || 'Sala A',
        classDirectorId: director?.id,
        classDirectorName: director?.fullName,
        maxCapacity: Number(formCapacity) || 45
      });
      setIsModalOpen(false);
      setEditingClass(null);
      setLimitNotice(
        `Turma "${formName.trim()}" actualizada com ${cleanedSubjects.length} disciplina(s) e guardada na memória Localhost!`
      );
      setTimeout(() => setLimitNotice(null), 4000);
      return;
    }

    // Verificar se o limite estabelecido pelo Super Administrador foi atingido
    if (instClasses.length >= currentInstitution.maxClasses) {
      setIsModalOpen(false);
      setLimitNotice(
        `Limite de Turmas Atingido: O Super Administrador definiu o tecto desta escola em ${currentInstitution.maxClasses} turmas (${instClasses.length} cadastradas). Contacte o Super Administrador para expandir o plano.`
      );
      return;
    }

    const newClassRoom: ClassRoom = {
      id: `class-${Date.now()}`,
      institutionId: currentInstitution.id,
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      subsystemCode: formSubsystem || currentInstitution.subsystems[0] || 'primario_geral',
      gradeLevel: formGrade,
      courseName: formCourse || undefined,
      curriculumPlanId: 'cur-default',
      subjects: cleanedSubjects,
      shift: formShift,
      room: formRoom || 'Sala A',
      academicYear: '2026/2027',
      classDirectorId: director?.id,
      classDirectorName: director?.fullName,
      maxCapacity: Number(formCapacity) || 45,
      enrolledStudentsCount: 0,
      status: 'aberta'
    };

    onAddClass(newClassRoom);
    setIsModalOpen(false);
    setLimitNotice(
      `Turma "${newClassRoom.name}" criada com ${cleanedSubjects.length} disciplina(s) e guardada na memória Localhost!`
    );
    setTimeout(() => setLimitNotice(null), 4000);

    // Reset
    setFormName('');
    setFormCode('');
  };

  // Alunos da turma seleccionada no modal de Roster
  const rosterStudents = selectedClassRoster
    ? students.filter((s) => s.classId === selectedClassRoster.id)
    : [];

  const isLimitReached = instClasses.length >= currentInstitution.maxClasses;

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL (Tema Dashboard Unificado) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            GESTÃO DE TURMAS E CONTROLO DE VAGAS
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Plataforma Multi-institucional NEUROEDUCA · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        {isSchoolAdmin && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('subjects')}
                className="inline-flex items-center space-x-1.5 min-h-[44px] bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                title="Abrir Cadastramento de Disciplinas"
              >
                <BookOpen className="w-4 h-4 text-[#067836]" />
                <span>Cadastrar Disciplinas</span>
              </button>
            )}
            <button
              onClick={() => {
                if (isLimitReached) {
                  setLimitNotice(
                    `Limite de Turmas Atingido: O Super Administrador definiu o tecto desta escola em ${currentInstitution.maxClasses} turmas (${instClasses.length} cadastradas). Contacte o Super Administrador para aumentar a quota.`
                  );
                  return;
                }
                openNewClassModal();
              }}
              className={`inline-flex items-center space-x-1.5 min-h-[44px] font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer ${
                isLimitReached
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white'
              }`}
              title={isLimitReached ? 'Limite contratado atingido' : 'Criar nova turma (Exclusivo Administrador Escolar)'}
            >
              <Plus className="w-4 h-4" />
              <span>{isLimitReached ? 'Limite Atingido (Quota Cheia)' : '+ Criar Nova Turma'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback / Aviso Inline */}
      {limitNotice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center justify-between gap-2">
          <span className="font-semibold">{limitNotice}</span>
          <button
            type="button"
            onClick={() => setLimitNotice(null)}
            className="text-[#055827] hover:text-[#064e26] font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alerta de Restrição para Super Administrador */}
      {isSuperAdmin && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <div>
            <span className="font-bold">Restrição de Nível de Acesso (Super Administrador):</span>
            <span className="ml-1">
              A criação e gestão de turmas é da inteira responsabilidade do Administrador Escolar. O Super Administrador não tem permissões para criar ou editar turmas.
            </span>
          </div>
        </div>
      )}

      {/* Alerta Informativo para Professor */}
      {isProfessor && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center space-x-2.5">
          <CheckCircle className="w-4 h-4 text-[#16a34a] shrink-0" />
          <div>
            <span className="font-bold">Área do Professor / Docente:</span>
            <span className="ml-1">
              Visualização da(s) turma(s) atribuída(s) ({baseClasses.map((c) => c.name).join(', ') || 'Turma em Exercício'}) com acesso directo às <strong>Mini-Pautas</strong>, <strong>Pautas da Turma</strong> e Lista Nominal.
            </span>
          </div>
        </div>
      )}

      {/* Alerta de Limite de Turmas do Super Administrador */}
      {isLimitReached && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">
              Tecto Regulamentar Atingido:
            </span>
            <span>
              Esta escola atingiu a quota máxima de {currentInstitution.maxClasses} turmas contratadas ({instClasses.length}/{currentInstitution.maxClasses}).
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
            Definido pelo Super Admin
          </span>
        </div>
      )}

      {/* 2. CARTÕES KPI DE TURMAS (ESTILO EXECUTIVO ESMERALDA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Turmas Cadastradas</span>
            <div className="font-display text-2xl font-extrabold text-[#064e26] tabular-nums">
              {instClasses.length} / {currentInstitution.maxClasses}
            </div>
            <span className="text-[11px] text-[#4b6755] block">Limite contratado</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Capacidade / Sala</span>
            <div className="font-display text-2xl font-extrabold text-[#064e26] tabular-nums">
              45 Alunos
            </div>
            <span className="text-[11px] text-[#4b6755] block">Norma oficial MED</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Alunos nas Turmas</span>
            <div className="font-display text-2xl font-extrabold text-[#064e26] tabular-nums">
              {instClasses.reduce((sum, c) => sum + c.enrolledStudentsCount, 0)}
            </div>
            <span className="text-[11px] text-[#4b6755] block">Ocupação total</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Turnos de Ensino</span>
            <div className="font-display text-xl font-extrabold text-[#064e26]">
              Manhã &amp; Tarde
            </div>
            <span className="text-[11px] text-[#4b6755] block">Ano Lectivo 2026/2027</span>
          </div>
        </div>
      </div>

      {/* Search and Functional Dropdown Filters */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar turma, classe ou sala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] bg-[#f7fbf8] text-[#064e26] text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 font-medium"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 lg:justify-end">
          <div className="w-full sm:w-80">
            <FunctionalDropdownFilter
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={classFunctionalFilterOptions}
              icon={<Filter className="w-4 h-4 text-[#067836]" />}
              placeholder="Filtrar turmas por funcionalidade..."
              searchable
              align="right"
            />
          </div>

          <span className="text-xs text-[#4b6755] font-medium whitespace-nowrap">
            Mostrando {filteredClasses.length} de {baseClasses.length} turmas
          </span>
        </div>
      </div>

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClasses.map((cls) => {
          const isFull = cls.enrolledStudentsCount >= cls.maxCapacity;
          const occupancyRate = Math.round((cls.enrolledStudentsCount / cls.maxCapacity) * 100);
          const examEligible = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);

          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl p-5 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] hover:border-[#cde6d5] hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[#055827] bg-[#eaf6ee] px-2.5 py-0.5 rounded-lg border border-[#cde6d5]">
                        {cls.code}
                      </span>
                      {examEligible && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-lg">
                          EN / REC
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-[#064e26] text-base mt-1.5">{cls.name}</h3>
                    <p className="text-xs text-[#4b6755] font-medium">
                      {cls.gradeLevel} {cls.courseName ? `· ${cls.courseName}` : ''}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-lg shrink-0 ${
                      cls.shift === 'manha'
                        ? 'bg-amber-100 text-amber-800'
                        : cls.shift === 'tarde'
                        ? 'bg-[#eaf6ee] text-[#055827]'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {cls.shift}
                  </span>
                </div>

                {/* Progress bar of capacity */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Capacidade:</span>
                    <span
                      className={`font-bold tabular-nums ${
                        isFull
                          ? 'text-red-600'
                          : occupancyRate > 85
                          ? 'text-amber-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {cls.enrolledStudentsCount} / {cls.maxCapacity} alunos ({occupancyRate}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? 'bg-red-500'
                          : occupancyRate > 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                    />
                  </div>

                  {isFull && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-red-600 font-semibold mt-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Turma no Limite Máximo Regulamentar (45)</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <DoorOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Sala de Aulas: <strong>{cls.room}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Director(a) de Turma: <strong>{cls.classDirectorName || 'Por designar'}</strong>
                    </span>
                  </div>
                  {(() => {
                    const clsSubjects =
                      cls.subjects && cls.subjects.length > 0
                        ? cls.subjects
                        : resolveSubjectsForClass(
                            cls.subsystemCode,
                            cls.gradeLevel,
                            cls.courseName,
                            customSubjects
                          );
                    const teacherAssignedHere =
                      isProfessor && currentTeacher?.assignedClasses
                        ? currentTeacher.assignedClasses.filter((a) => a.classId === cls.id)
                        : [];

                    return (
                      <div className="pt-2 space-y-2">
                        {isProfessor && teacherAssignedHere.length > 0 && (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="text-[10px] font-bold uppercase text-emerald-800 mb-1">
                              Suas Disciplinas Atribuídas nesta Turma ({teacherAssignedHere.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {teacherAssignedHere.map((asg, i) => (
                                <span
                                  key={`${asg.subjectId}-${i}`}
                                  className="text-[10px] font-bold bg-white text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300"
                                >
                                  {asg.subjectName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[#4b6755] font-semibold mb-1">
                            <span className="inline-flex items-center space-x-1">
                              <BookOpen className="w-3.5 h-3.5 text-[#067836]" />
                              <span>Disciplinas da Turma ({clsSubjects.length})</span>
                            </span>
                            {cls.subjects && cls.subjects.length > 0 && (
                              <span className="text-[10px] text-[#055827] bg-[#eaf6ee] px-1.5 py-0.5 rounded-lg font-bold">
                                Personalizada
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {clsSubjects.slice(0, 4).map((sub) => (
                              <span
                                key={sub.id}
                                className="text-[10px] font-semibold bg-[#f7fbf8] text-[#064e26] px-1.5 py-0.5 rounded-md border border-[#cde6d5]"
                                title={sub.name}
                              >
                                {sub.shortName || sub.name}
                              </span>
                            ))}
                            {clsSubjects.length > 4 && (
                              <span className="text-[10px] font-bold bg-[#eaf6ee] text-[#055827] px-1.5 py-0.5 rounded-md border border-[#cde6d5]">
                                +{clsSubjects.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#eef4f0] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedClassRoster(cls)}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] inline-flex items-center space-x-1.5 text-[#055827] font-bold cursor-pointer transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lista Nominal</span>
                  </button>

                  {onOpenClassEvaluations && (isProfessor || isSchoolAdmin) && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenClassEvaluations(cls.id, 'mini_pauta')}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] inline-flex items-center space-x-1 text-white font-bold cursor-pointer transition shadow-xs"
                        title="Abrir Mini-Pauta da Turma"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Mini-Pautas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenClassEvaluations(cls.id, 'pauta_geral')}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] inline-flex items-center space-x-1 text-[#1d4ed8] font-bold cursor-pointer transition"
                        title="Abrir Pauta Geral da Turma"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Pautas</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!isSuperAdmin && !isProfessor && onUpdateClass && (
                    <button
                      onClick={() => openEditClassModal(cls)}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#055827] font-bold inline-flex items-center space-x-1 cursor-pointer transition"
                      title="Editar turma"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}

                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#055827] capitalize">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                    <span>{cls.status}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL LISTA NOMINAL DA TURMA (ROSTER) */}
      {selectedClassRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 print:hidden">
              <DocumentExportBar
                targetRef={rosterRef}
                filename={`ListaNominal_${selectedClassRoster.code}`}
                documentTitle={`Lista Nominal - ${selectedClassRoster.name}`}
                defaultFormat="A4"
                defaultOrientation="portrait"
                compact
              />
              <button
                onClick={() => setSelectedClassRoster(null)}
                className="text-slate-400 hover:text-slate-600 p-1 shrink-0 cursor-pointer"
                aria-label="Fechar Lista Nominal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={rosterRef} className="official-document-sheet space-y-4 bg-white p-4">
              <div className="pb-3 border-b border-slate-900 text-center">
                <OfficialDocumentHeader
                  institution={currentInstitution}
                  insigniaClassName="h-12 w-auto mx-auto object-contain"
                  extraMeta={
                    <div className="mt-2 space-y-0.5 text-center">
                      <h3 className="font-black text-black uppercase">
                        LISTA NOMINAL ({selectedClassRoster.code}) · {selectedClassRoster.name}
                      </h3>
                      <p className="text-black">
                        {selectedClassRoster.gradeLevel} · Turno da {selectedClassRoster.shift} · Sala {selectedClassRoster.room}
                      </p>
                    </div>
                  }
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2 font-medium">
                  <span>Total de Alunos Matriculados: <strong>{rosterStudents.length}</strong></span>
                  <span className="text-[11px] text-slate-500">Folha de Chamada Oficial</span>
                </div>

                {rosterStudents.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Nº</th>
                          <th className="py-2.5 px-3">Nº Processo</th>
                          <th className="py-2.5 px-3">Nome Completo</th>
                          <th className="py-2.5 px-3">BI / Identificação</th>
                          <th className="py-2.5 px-3">Encarregado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {rosterStudents.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{s.processNumber}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{s.fullName}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{s.identityCardNumber || 'Cédula'}</td>
                            <td className="py-2 px-3">{s.guardianName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-xs">Nenhum aluno matriculado nesta turma ainda.</p>
                    <button
                      onClick={() => {
                        setSelectedClassRoster(null);
                        if (onNavigateTab) onNavigateTab('students');
                      }}
                      className="mt-3 px-3.5 py-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] text-white font-bold rounded-xl text-xs print:hidden cursor-pointer"
                    >
                      Matricular Alunos Nesta Turma
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Turma com Disciplinas Integradas (Exclusivo Administrador Escolar) */}
      {isModalOpen && isSchoolAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#dce7df] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 my-4">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Layers className="w-5 h-5" />
                <span>
                  {editingClass
                    ? `Editar Turma e Disciplinas: ${editingClass.code}`
                    : 'Criar Turma e Definir Disciplinas (2026/2027)'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClass(null);
                }}
                className="p-2 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#064e26] block mb-1">Subsistema de Ensino *</label>
                  <select
                    value={formSubsystem}
                    onChange={(e) => {
                      const nextCode = e.target.value as EducationSubsystemCode;
                      setFormSubsystem(nextCode);
                      const meta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === nextCode);
                      const nextGrade = meta?.gradesOrYears[0] || formGrade;
                      const nextCourse = meta?.coursesAvailable?.[0] || '';
                      if (meta) {
                        setFormGrade(nextGrade);
                        setFormCourse(nextCourse);
                      }
                      if (!editingClass && !hasEditedSubjects) {
                        setFormSubjects(buildSuggestedSubjects(nextCode, nextGrade, nextCourse));
                      }
                    }}
                    className="w-full bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:outline-none focus:border-[#067836]"
                  >
                    {availableSubsystems.map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#064e26] block mb-1">Código da Turma *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: T-10-CFB-A ou 4ª-A"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] font-mono focus:outline-none focus:border-[#067836]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#064e26] block mb-1">Nome Descritivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 10.ª Classe - Ciências Físicas e Biológicas A"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Classe *</label>
                  <input
                    type="text"
                    required
                    list="angola-grades-suggestions"
                    placeholder="Ex: 4.ª Classe, 10.ª Classe"
                    value={formGrade}
                    onChange={(e) => {
                      const nextGrade = e.target.value;
                      setFormGrade(nextGrade);
                      if (!editingClass && !hasEditedSubjects) {
                        setFormSubjects(buildSuggestedSubjects(formSubsystem, nextGrade, formCourse));
                      }
                    }}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                  <datalist id="angola-grades-suggestions">
                    {(ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === formSubsystem)?.gradesOrYears || []).map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Curso / Área</label>
                  <input
                    type="text"
                    list="angola-courses-suggestions"
                    placeholder="Ex: Informática, CFB"
                    value={formCourse}
                    onChange={(e) => {
                      const nextCourse = e.target.value;
                      setFormCourse(nextCourse);
                      if (!editingClass && !hasEditedSubjects) {
                        setFormSubjects(buildSuggestedSubjects(formSubsystem, formGrade, nextCourse));
                      }
                    }}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                  <datalist id="angola-courses-suggestions">
                    {(ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === formSubsystem)?.coursesAvailable || []).map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Turno</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-2.5 py-2 border border-slate-300"
                  >
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                    <option value="integral">Integral</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sala</label>
                  <input
                    type="text"
                    placeholder="Ex: Sala 05"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-2.5 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Capacidade Máx.
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="55"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-2.5 py-2 border border-slate-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Oficial: 45</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Director(a) de Turma</label>
                <select
                  value={formDirectorId}
                  onChange={(e) => setFormDirectorId(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                >
                  <option value="">-- Seleccionar Professor --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* SECÇÃO INTEGRADA: DISCIPLINAS DA TURMA (>= 1, EDITÁVEIS) */}
              <div className="pt-3 border-t border-[#dce7df] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[#064e26] flex items-center space-x-1.5 text-xs uppercase tracking-wide">
                      <BookOpen className="w-4 h-4 text-[#067836]" />
                      <span>Disciplinas da Turma ({formSubjects.length}) *</span>
                    </h4>
                    <p className="text-[11px] text-[#4b6755]">
                      Mínimo obrigatório de 1 disciplina. Edite os nomes, códigos, cargas horárias ou adicione novas disciplinas.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSubjects(buildSuggestedSubjects(formSubsystem, formGrade, formCourse));
                        setHasEditedSubjects(false);
                        setSubjectFormError(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#055827] font-semibold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                      title="Recarregar disciplinas sugeridas para este subsistema e classe"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Matriz Base</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInlineNewSubject((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nova Disciplina</span>
                    </button>
                  </div>
                </div>

                {subjectFormError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-semibold flex items-center justify-between gap-2">
                    <span>{subjectFormError}</span>
                    <button
                      type="button"
                      onClick={() => setSubjectFormError(null)}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Adicionar do Catálogo (Escola + Plano Oficial) */}
                <div className="flex flex-col sm:flex-row gap-2 bg-[#f7fbf8] p-2.5 rounded-xl border border-[#cde6d5]">
                  <select
                    value={catalogPickKey}
                    onChange={(e) => setCatalogPickKey(e.target.value)}
                    className="flex-1 bg-white text-slate-800 rounded-xl px-2.5 py-1.5 border border-[#cde6d5] text-xs"
                  >
                    <option value="">-- Incluir disciplina existente / catálogo --</option>
                    {catalogOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} ({opt.code} · {opt.weeklyHours}h/sem)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddFromCatalog(catalogPickKey)}
                    disabled={!catalogPickKey}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    + Incluir na Turma
                  </button>
                </div>

                {/* Criador rápido de nova disciplina na turma */}
                {showInlineNewSubject && (
                  <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#064e26] text-xs">
                        Criar e Integrar Nova Disciplina
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInlineNewSubject(false)}
                        className="text-[#055827] hover:text-[#064e26] text-xs font-bold cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Nome da disciplina *"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        className="sm:col-span-2 bg-white border border-[#cde6d5] rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Código (Ex: TIC)"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value)}
                        className="bg-white border border-[#cde6d5] rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 uppercase"
                      />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        placeholder="Horas/sem"
                        value={newSubHours}
                        onChange={(e) => setNewSubHours(Number(e.target.value))}
                        className="bg-white border border-[#cde6d5] rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Sigla (Ex: TIC)"
                        value={newSubShort}
                        onChange={(e) => setNewSubShort(e.target.value)}
                        className="bg-white border border-[#cde6d5] rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 uppercase"
                      />
                      <select
                        value={newSubGroup}
                        onChange={(e) => setNewSubGroup(e.target.value as CurriculumSubject['group'])}
                        className="bg-white border border-[#cde6d5] rounded-xl px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="geral">Formação Geral</option>
                        <option value="especifica">Formação Específica</option>
                        <option value="socio_cultural">Sócio-Cultural</option>
                        <option value="tecnica_tecnologica">Técnica & Tecnológica</option>
                        <option value="pratica">Prática / Oficina</option>
                      </select>
                      <label className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-[#064e26] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSubExam}
                          onChange={(e) => setNewSubExam(e.target.checked)}
                          className="rounded border-[#cde6d5] accent-[#067836]"
                        />
                        <span>Exame Final</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <label className="inline-flex items-center space-x-1.5 text-[11px] text-[#055827] font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveNewSubToCatalog}
                          onChange={(e) => setSaveNewSubToCatalog(e.target.checked)}
                          className="rounded border-[#cde6d5] accent-[#067836]"
                        />
                        <span>Guardar também no Cadastramento de Disciplinas da escola</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleCreateInlineSubject}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Adicionar à Turma</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista Editável das Disciplinas da Turma (>= 1) */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formSubjects.map((sub, idx) => (
                    <div
                      key={`${sub.id}-${idx}`}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label className="text-[10px] text-slate-400 font-semibold block sm:hidden">
                          Disciplina
                        </label>
                        <input
                          type="text"
                          required
                          value={sub.name}
                          onChange={(e) =>
                            handleUpdateSubjectField(idx, { name: e.target.value })
                          }
                          placeholder="Nome da disciplina"
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 font-semibold block sm:hidden">
                          Código
                        </label>
                        <input
                          type="text"
                          value={sub.code}
                          onChange={(e) =>
                            handleUpdateSubjectField(idx, {
                              code: e.target.value.toUpperCase(),
                              shortName: e.target.value.toUpperCase().slice(0, 5)
                            })
                          }
                          placeholder="Cód."
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-700 uppercase"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] text-slate-400 font-semibold block sm:hidden">
                          Horas/Sem
                        </label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={sub.weeklyHours}
                            onChange={(e) =>
                              handleUpdateSubjectField(idx, {
                                weeklyHours: Math.max(1, Number(e.target.value) || 1)
                              })
                            }
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                          />
                          <span className="text-[10px] text-slate-500">h</span>
                        </div>
                      </div>

                      <div className="col-span-3 sm:col-span-2">
                        <label className="inline-flex items-center space-x-1 text-[10px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(sub.isTerminalExam)}
                            onChange={(e) =>
                              handleUpdateSubjectField(idx, { isTerminalExam: e.target.checked })
                            }
                            className="rounded border-slate-300"
                          />
                          <span>Exame</span>
                        </label>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubjectFromClass(idx)}
                          disabled={formSubjects.length <= 1}
                          title={
                            formSubjects.length <= 1
                              ? 'Mínimo obrigatório: 1 disciplina na turma'
                              : 'Remover disciplina da turma'
                          }
                          className={`p-1.5 rounded transition ${
                            formSubjects.length <= 1
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-red-500 hover:bg-red-50 cursor-pointer'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingClass(null);
                  }}
                  className="min-h-[44px] px-4 py-2 border border-[#cde6d5] rounded-xl text-[#055827] bg-[#f7fbf8] hover:bg-[#eaf6ee] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingClass ? 'Guardar Alterações' : 'Confirmar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
