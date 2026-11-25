/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Pesquisa em Cascata & Filtro Suspenso Profissional
 * Fluxo Sequencial em Cascata:
 * 1. Subsistema -> 2. Classe -> 3. Turma -> 4. Aluno -> 5. Filtro Suspenso (Disciplinas, Mini-Pautas, Pautas, Boletins e Outros Documentos)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Building2,
  Users,
  Layers,
  GraduationCap,
  FileText,
  ClipboardList,
  BookOpen,
  ShieldCheck,
  Sparkles,
  DollarSign,
  BarChart3,
  Settings,
  Sliders,
  CornerDownLeft,
  History,
  CreditCard,
  Award,
  Receipt,
  HardDrive,
  Filter,
  FolderArchive,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Megaphone,
  HeartHandshake
} from 'lucide-react';
import {
  Institution,
  Student,
  ClassRoom,
  Teacher,
  SchoolUser,
  UserProfile,
  UserRole,
  EducationSubsystemCode,
  SchoolSubject
} from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS, OFFICIAL_CURRICULUM_PLANS } from '../../data/angolaCurriculum';
import { isExamAndRecourseEligible, resolveSubjectsForClass } from '../../utils/evaluationEngine';
import { FunctionalDropdownFilter, FunctionalDropdownOption } from './FunctionalDropdownFilter';
import { resolveAuthorizedStudentsForUser } from '../../utils/studentAccess';

export interface NavDeepLinkPayload {
  tab: string;
  institutionId?: string;
  openInstitutionModal?: boolean;
  subsystemCode?: EducationSubsystemCode;
  gradeLevel?: string;
  classId?: string;
  classSearch?: string;
  openRosterClassId?: string;
  studentId?: string;
  studentSearch?: string;
  openStudentProfileId?: string;
  evalTab?: 'mini_pauta' | 'pauta_geral' | 'boletim_aluno';
  subjectId?: string;
  period?: '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual';
  docType?: string;
  userSearch?: string;
  subjectSearch?: string;
  openMemoryModal?: boolean;
}

interface NavigationFilterDropdownProps {
  currentInstitution: Institution | null;
  institutions: Institution[];
  students: Student[];
  classes: ClassRoom[];
  teachers: Teacher[];
  subjects?: SchoolSubject[];
  schoolUsers: SchoolUser[];
  currentUser?: UserProfile | null;
  activeRole: UserRole;
  currentTeacher?: Teacher | null;
  onNavigate: (payload: NavDeepLinkPayload) => void;
}

interface FunctionalityDef {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
}

interface FilterOption {
  id: string;
  functionalityId: string;
  sectionLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  icon: React.ReactNode;
  keywords: string;
  payload: NavDeepLinkPayload;
}

type CascadeDocCategory =
  | 'tudo'
  | 'disciplinas'
  | 'mini_pautas'
  | 'pautas'
  | 'boletins'
  | 'outros_documentos';

interface CascadeActionOption {
  id: string;
  category: Exclude<CascadeDocCategory, 'tudo'>;
  groupLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  icon: React.ReactNode;
  payload: NavDeepLinkPayload;
}

const BADGE_STYLES: Record<NonNullable<FilterOption['badgeTone']>, string> = {
  blue: 'bg-sky-50 text-[#0073b7] border-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200'
};

export const NavigationFilterDropdown: React.FC<NavigationFilterDropdownProps> = ({
  currentInstitution,
  institutions,
  students,
  classes,
  teachers,
  subjects = [],
  schoolUsers,
  currentUser,
  activeRole,
  currentTeacher,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cascata' | 'modulos'>('cascata');
  const [selectedFuncId, setSelectedFuncId] = useState<string>('tudo');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Estados da Pesquisa em Cascata: Subsistema -> Classe -> Turma -> Aluno -> Filtro Suspenso
  const [cascadeSubsystem, setCascadeSubsystem] = useState<EducationSubsystemCode | ''>('');
  const [cascadeGradeLevel, setCascadeGradeLevel] = useState<string>('');
  const [cascadeClassId, setCascadeClassId] = useState<string>('');
  const [cascadeStudentId, setCascadeStudentId] = useState<string>('');
  const [cascadeDocCategory, setCascadeDocCategory] = useState<CascadeDocCategory>('tudo');
  const [cascadeSelectedActionId, setCascadeSelectedActionId] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

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

  const isModuleOnlyMode = isSuperAdminMode || isMunicipalDirectorMode;

  const isSchoolAdminMode =
    !isStudentMode && !isProfessorMode && !isSuperAdminMode && !isMunicipalDirectorMode;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => {
          if (window.innerWidth >= 768) {
            inputRef.current?.focus();
          } else {
            mobileInputRef.current?.focus();
          }
        }, 40);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen]);

  useEffect(() => {
    setSelectedFuncId('tudo');
    setQuery('');
    setHighlightedIndex(0);
    setCascadeSubsystem('');
    setCascadeGradeLevel('');
    setCascadeClassId('');
    setCascadeStudentId('');
    setCascadeDocCategory('tudo');
    setCascadeSelectedActionId('');
    setViewMode(isModuleOnlyMode ? 'modulos' : 'cascata');
  }, [activeRole, currentUser?.role, isModuleOnlyMode]);

  // Dados institucionais filtrados por escola e perfil
  const instStudents = useMemo(
    () =>
      students.filter(
        (s) => !currentInstitution || s.institutionId === currentInstitution.id
      ),
    [students, currentInstitution]
  );

  const instClasses = useMemo(
    () =>
      classes.filter(
        (c) => !currentInstitution || c.institutionId === currentInstitution.id
      ),
    [classes, currentInstitution]
  );

  const instTeachers = useMemo(
    () =>
      teachers.filter(
        (t) => !currentInstitution || t.institutionId === currentInstitution.id
      ),
    [teachers, currentInstitution]
  );

  const instCustomSubjects = useMemo(
    () =>
      subjects.filter(
        (s) => !currentInstitution || s.institutionId === currentInstitution.id
      ),
    [subjects, currentInstitution]
  );

  const authorizedStudentList = useMemo(() => {
    if (!isStudentMode) return [];
    return resolveAuthorizedStudentsForUser(
      students,
      currentInstitution?.id,
      currentUser,
      activeRole
    );
  }, [isStudentMode, students, currentInstitution?.id, currentUser, activeRole]);

  const loggedInStudent = authorizedStudentList[0] || null;

  // Turmas visíveis na cascata segundo o perfil (nunca expõe turmas de outros alunos ao aluno/encarregado)
  const cascadeAllowedClasses = useMemo(() => {
    if (isStudentMode) {
      const allowedClsIds = new Set(authorizedStudentList.map((s) => s.classId));
      return instClasses.filter((c) => allowedClsIds.has(c.id));
    }
    if (isProfessorMode) {
      const teacherClassIds = new Set([
        ...(currentTeacher?.assignedClasses?.map((a) => a.classId) || []),
        ...instClasses
          .filter((c) => c.classDirectorId === currentTeacher?.id)
          .map((c) => c.id)
      ]);
      const profClasses = instClasses.filter((c) => teacherClassIds.has(c.id));
      return profClasses.length > 0 ? profClasses : instClasses.slice(0, 1);
    }
    return instClasses;
  }, [isStudentMode, authorizedStudentList, isProfessorMode, currentTeacher, instClasses]);

  // Pré-preencher automaticamente a cascata no perfil Aluno/Encarregado
  useEffect(() => {
    if (isStudentMode) {
      if (loggedInStudent) {
        setCascadeSubsystem(loggedInStudent.subsystemCode);
        setCascadeGradeLevel(loggedInStudent.gradeLevel);
        setCascadeClassId(loggedInStudent.classId);
        setCascadeStudentId(loggedInStudent.id);
      } else {
        setCascadeSubsystem('');
        setCascadeGradeLevel('');
        setCascadeClassId('');
        setCascadeStudentId('');
      }
    }
  }, [isStudentMode, loggedInStudent]);

  // PASSO 1: Subsistemas disponíveis
  const cascadeSubsystemOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const allowedCodes = new Set<EducationSubsystemCode>();
    if (isStudentMode) {
      authorizedStudentList.forEach((s) => allowedCodes.add(s.subsystemCode));
    } else if (isProfessorMode) {
      cascadeAllowedClasses.forEach((c) => allowedCodes.add(c.subsystemCode));
    } else {
      currentInstitution?.subsystems.forEach((code) => allowedCodes.add(code));
      cascadeAllowedClasses.forEach((c) => allowedCodes.add(c.subsystemCode));
    }

    const countPool = isStudentMode ? authorizedStudentList : instStudents;

    return ANGOLA_EDUCATION_SUBSYSTEMS.filter((sub) => allowedCodes.has(sub.code)).map((sub) => {
      const subClasses = cascadeAllowedClasses.filter((c) => c.subsystemCode === sub.code);
      const subStudentsCount = countPool.filter((s) =>
        subClasses.some((c) => c.id === s.classId)
      ).length;
      return {
        value: sub.code,
        label: sub.name,
        description: `${subClasses.length} turma(s) · ${subStudentsCount} aluno(s)`,
        group: '1.º Passo · Subsistemas de Ensino',
        badge: sub.shortName,
        badgeTone: 'blue'
      };
    });
  }, [isStudentMode, authorizedStudentList, isProfessorMode, currentInstitution, cascadeAllowedClasses, instStudents]);

  // PASSO 2: Classes filtradas pelo Subsistema seleccionado
  const cascadeGradeOptions = useMemo<FunctionalDropdownOption[]>(() => {
    if (!cascadeSubsystem) return [];
    const subMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === cascadeSubsystem);
    const subClasses = cascadeAllowedClasses.filter((c) => c.subsystemCode === cascadeSubsystem);

    const gradeSet = new Set<string>();
    if (isSchoolAdminMode && subMeta) {
      subMeta.gradesOrYears.forEach((g) => gradeSet.add(g));
    }
    subClasses.forEach((c) => gradeSet.add(c.gradeLevel));

    const countPool = isStudentMode ? authorizedStudentList : instStudents;

    return Array.from(gradeSet).map((grade) => {
      const matchingClasses = subClasses.filter((c) => c.gradeLevel === grade);
      const matchingStudents = countPool.filter((s) =>
        matchingClasses.some((c) => c.id === s.classId)
      );
      const hasExams = isExamAndRecourseEligible(cascadeSubsystem, grade);
      return {
        value: grade,
        label: grade,
        description:
          matchingClasses.length > 0
            ? `${matchingClasses.length} turma(s) · ${matchingStudents.length} aluno(s)`
            : 'Sem turmas abertas nesta escola',
        group: `2.º Passo · Classes (${subMeta?.shortName || cascadeSubsystem})`,
        badge: hasExams ? 'EN / REC' : `${matchingClasses.length} Turma(s)`,
        badgeTone: hasExams ? 'amber' : matchingClasses.length > 0 ? 'emerald' : 'slate'
      };
    });
  }, [cascadeSubsystem, cascadeAllowedClasses, isSchoolAdminMode, isStudentMode, authorizedStudentList, instStudents]);

  // PASSO 3: Turmas filtradas pelo Subsistema + Classe
  const cascadeClassOptions = useMemo<FunctionalDropdownOption[]>(() => {
    if (!cascadeSubsystem || !cascadeGradeLevel) return [];
    const matching = cascadeAllowedClasses.filter(
      (c) => c.subsystemCode === cascadeSubsystem && c.gradeLevel === cascadeGradeLevel
    );
    const countPool = isStudentMode ? authorizedStudentList : instStudents;
    return matching.map((cls) => {
      const realStudents = countPool.filter((s) => s.classId === cls.id).length;
      const hasExams = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);
      return {
        value: cls.id,
        label: `${cls.name} (${cls.code})`,
        description: `${cls.courseName ? `${cls.courseName} · ` : ''}Sala ${cls.room} · Turno ${cls.shift} · ${realStudents} aluno(s)`,
        group: `3.º Passo · Turmas da ${cascadeGradeLevel}`,
        badge: hasExams ? 'EN / REC' : `${realStudents} Alunos`,
        badgeTone: hasExams ? 'amber' : 'blue'
      };
    });
  }, [cascadeSubsystem, cascadeGradeLevel, cascadeAllowedClasses, isStudentMode, authorizedStudentList, instStudents]);

  // PASSO 4: Alunos filtrados pela Turma seleccionada
  const cascadeStudentOptions = useMemo<FunctionalDropdownOption[]>(() => {
    if (!cascadeClassId) return [];
    const clsStudents = isStudentMode
      ? authorizedStudentList.filter((s) => s.classId === cascadeClassId)
      : instStudents.filter((s) => s.classId === cascadeClassId);
    return clsStudents.map((stu) => ({
      value: stu.id,
      label: stu.fullName,
      description: `Proc. ${stu.processNumber} · Encarregado: ${stu.guardianName}`,
      group: '4.º Passo · Alunos da Turma Seleccionada',
      badge: stu.academicStatus === 'confirmado' ? 'Confirmado' : stu.academicStatus,
      badgeTone: stu.academicStatus === 'confirmado' ? 'emerald' : 'slate'
    }));
  }, [cascadeClassId, isStudentMode, authorizedStudentList, instStudents]);

  const selectedCascadeClass = useMemo(
    () => cascadeAllowedClasses.find((c) => c.id === cascadeClassId) || null,
    [cascadeAllowedClasses, cascadeClassId]
  );

  const selectedCascadeStudent = useMemo(
    () =>
      (isStudentMode ? authorizedStudentList : instStudents).find(
        (s) => s.id === cascadeStudentId
      ) || null,
    [isStudentMode, authorizedStudentList, instStudents, cascadeStudentId]
  );

  // PASSO 5: Opções do Filtro Suspenso que SURGE APENAS APÓS SELECCIONAR O ALUNO
  // Organizado em: Disciplinas, Mini-Pautas, Pautas, Boletins e Outros Documentos
  const cascadeActionOptions: CascadeActionOption[] = useMemo(() => {
    if (!selectedCascadeStudent || !selectedCascadeClass) return [];

    const items: CascadeActionOption[] = [];
    const cls = selectedCascadeClass;
    const stu = selectedCascadeStudent;
    const hasExams = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);

    const allClassSubjects = resolveSubjectsForClass(
      cls.subsystemCode,
      cls.gradeLevel,
      cls.courseName,
      instCustomSubjects,
      cls.subjects
    );

    const teacherAssignedForClass = isProfessorMode
      ? currentTeacher?.assignedClasses?.filter((a) => a.classId === cls.id) || []
      : [];

    const activeSubjects =
      isProfessorMode && teacherAssignedForClass.length > 0
        ? allClassSubjects.filter((sub) =>
            teacherAssignedForClass.some(
              (a) => a.subjectId === sub.id || a.subjectName.toLowerCase() === sub.name.toLowerCase()
            )
          )
        : allClassSubjects;

    const finalSubjects = activeSubjects.length > 0 ? activeSubjects : allClassSubjects;

    // 5A. DISCIPLINAS
    if (!isStudentMode) {
      finalSubjects.forEach((sub) => {
        items.push({
          id: `csc-disc-${sub.id}`,
          category: 'disciplinas',
          groupLabel: '1. Disciplinas da Turma',
          title: `${sub.name} (${sub.shortName})`,
          subtitle: `Abrir disciplina na Mini-Pauta · ${cls.name} · ${sub.weeklyHours}h/sem · Coef. ${sub.coefficient}`,
          badge: `${sub.weeklyHours}h`,
          badgeTone: 'emerald',
          icon: <BookOpen className="w-4 h-4 text-emerald-600" />,
          payload: {
            tab: 'evaluations',
            evalTab: 'mini_pauta',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            subjectId: sub.id,
            studentId: stu.id,
            period: '1_trimestre'
          }
        });
      });
    } else {
      finalSubjects.forEach((sub) => {
        items.push({
          id: `csc-stu-disc-${sub.id}`,
          category: 'disciplinas',
          groupLabel: '1. Disciplinas do Estudante',
          title: `${sub.name} (${sub.shortName})`,
          subtitle: `Ver notas desta disciplina no Portal do Aluno · ${sub.weeklyHours}h/sem`,
          badge: `${sub.weeklyHours}h`,
          badgeTone: 'emerald',
          icon: <BookOpen className="w-4 h-4 text-emerald-600" />,
          payload: {
            tab: 'student_grades',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            subjectId: sub.id,
            studentId: stu.id
          }
        });
      });
    }

    // 5B. MINI-PAUTAS (por Trimestre e Exames EN/REC + por Disciplina)
    if (!isStudentMode) {
      const periods: Array<{
        period: '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual';
        title: string;
        subtitle: string;
        badge: string;
        tone: 'blue' | 'amber';
      }> = [
        {
          period: '1_trimestre',
          title: 'Mini-Pauta — 1.º Trimestre',
          subtitle: 'AC1, AC2, AC3, MAC, NPT e MT1 por disciplina',
          badge: '1.º Trim.',
          tone: 'blue'
        },
        {
          period: '2_trimestre',
          title: 'Mini-Pauta — 2.º Trimestre',
          subtitle: 'AC1, AC2, AC3, MAC, NPT e MT2 por disciplina',
          badge: '2.º Trim.',
          tone: 'blue'
        },
        {
          period: '3_trimestre',
          title: 'Mini-Pauta — 3.º Trimestre',
          subtitle: 'AC1, AC2, AC3, MAC, NPT e MT3 por disciplina',
          badge: '3.º Trim.',
          tone: 'blue'
        },
        {
          period: 'anual',
          title: hasExams
            ? 'Mini-Pauta Anual & Exames (EN / REC)'
            : 'Mini-Pauta Anual Consolidada (CAP)',
          subtitle: hasExams
            ? `Consolidação MT1–MT3, Exame Normal (EN) e Recurso (REC) · ${cls.gradeLevel}`
            : `Consolidação dos 3 trimestres (Média CAP) · ${cls.gradeLevel}`,
          badge: hasExams ? 'EN / REC' : 'Anual',
          tone: hasExams ? 'amber' : 'blue'
        }
      ];

      periods.forEach((p) => {
        items.push({
          id: `csc-mini-${p.period}`,
          category: 'mini_pautas',
          groupLabel: '2. Mini-Pautas por Período',
          title: `${p.title} · ${finalSubjects[0]?.shortName || cls.name}`,
          subtitle: p.subtitle,
          badge: p.badge,
          badgeTone: p.tone,
          icon: <ClipboardList className="w-4 h-4 text-[#0073b7]" />,
          payload: {
            tab: 'evaluations',
            evalTab: 'mini_pauta',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            subjectId: finalSubjects[0]?.id,
            studentId: stu.id,
            period: p.period
          }
        });
      });
    } else {
      items.push({
        id: 'csc-stu-mini',
        category: 'mini_pautas',
        groupLabel: '2. Notas & Mini-Pautas Trimestrais',
        title: hasExams
          ? 'Notas Trimestrais, Exame (EN) & Recurso (REC)'
          : 'Médias Trimestrais (AC1, AC2, AC3, MAC, NPT, MT)',
        subtitle: `Consultar aproveitamento de ${stu.fullName} na turma ${cls.name}`,
        badge: hasExams ? 'EN / REC' : 'Notas',
        badgeTone: hasExams ? 'amber' : 'blue',
        icon: <ClipboardList className="w-4 h-4 text-[#0073b7]" />,
        payload: { tab: 'student_grades', studentId: stu.id, classId: cls.id }
      });
    }

    // 5C. PAUTAS GERAIS DA TURMA
    if (!isStudentMode) {
      [
        {
          period: 'anual' as const,
          title: `Pauta Geral Anual Consolidada — ${cls.name}`,
          subtitle: hasExams
            ? 'Matriz completa MT1–MT3, CAP, EN, REC & MFD (Exportar PDF A4/A5)'
            : 'Matriz completa MT1–MT3, CAP & MFD (Exportar PDF A4/A5)',
          badge: hasExams ? 'Pauta + EN/REC' : 'Pauta Anual',
          tone: (hasExams ? 'amber' : 'emerald') as 'amber' | 'emerald'
        },
        {
          period: '1_trimestre' as const,
          title: `Pauta Geral — 1.º Trimestre (${cls.name})`,
          subtitle: 'Todas as disciplinas do 1.º Trimestre (AC1–AC3, MAC, NPT, MT)',
          badge: '1.º Trim.',
          tone: 'blue' as const
        },
        {
          period: '2_trimestre' as const,
          title: `Pauta Geral — 2.º Trimestre (${cls.name})`,
          subtitle: 'Todas as disciplinas do 2.º Trimestre (AC1–AC3, MAC, NPT, MT)',
          badge: '2.º Trim.',
          tone: 'blue' as const
        },
        {
          period: '3_trimestre' as const,
          title: `Pauta Geral — 3.º Trimestre (${cls.name})`,
          subtitle: 'Todas as disciplinas do 3.º Trimestre (AC1–AC3, MAC, NPT, MT)',
          badge: '3.º Trim.',
          tone: 'blue' as const
        }
      ].forEach((pg) => {
        items.push({
          id: `csc-pauta-${pg.period}`,
          category: 'pautas',
          groupLabel: '3. Pautas Gerais da Turma',
          title: pg.title,
          subtitle: pg.subtitle,
          badge: pg.badge,
          badgeTone: pg.tone,
          icon: <Award className="w-4 h-4 text-emerald-600" />,
          payload: {
            tab: 'evaluations',
            evalTab: 'pauta_geral',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            studentId: stu.id,
            period: pg.period
          }
        });
      });
    } else {
      items.push({
        id: 'csc-stu-pauta',
        category: 'pautas',
        groupLabel: '3. Pauta & Situação Anual',
        title: `Pauta Anual & Decisão Final — ${stu.fullName}`,
        subtitle: `${cls.gradeLevel} · ${cls.name}`,
        badge: 'Pauta',
        badgeTone: 'emerald',
        icon: <Award className="w-4 h-4 text-emerald-600" />,
        payload: { tab: 'student_grades', studentId: stu.id, classId: cls.id }
      });
    }

    // 5D. BOLETINS DO ALUNO
    if (!isStudentMode) {
      [
        {
          period: 'anual' as const,
          title: `Boletim Individual MED (Anual) — ${stu.fullName}`,
          subtitle: `3 Trimestres separados + Consolidação Anual · Proc. ${stu.processNumber}`,
          badge: 'Boletim Anual',
          tone: 'amber' as const
        },
        {
          period: '1_trimestre' as const,
          title: `Boletim 1.º Trimestre — ${stu.fullName}`,
          subtitle: `AC1, AC2, AC3, MAC, NPT e MT1 · ${cls.name}`,
          badge: '1.º Trim.',
          tone: 'blue' as const
        },
        {
          period: '2_trimestre' as const,
          title: `Boletim 2.º Trimestre — ${stu.fullName}`,
          subtitle: `AC1, AC2, AC3, MAC, NPT e MT2 · ${cls.name}`,
          badge: '2.º Trim.',
          tone: 'blue' as const
        },
        {
          period: '3_trimestre' as const,
          title: `Boletim 3.º Trimestre — ${stu.fullName}`,
          subtitle: `AC1, AC2, AC3, MAC, NPT e MT3 · ${cls.name}`,
          badge: '3.º Trim.',
          tone: 'blue' as const
        }
      ].forEach((b) => {
        items.push({
          id: `csc-bol-${b.period}`,
          category: 'boletins',
          groupLabel: '4. Boletins Individuais do Aluno',
          title: b.title,
          subtitle: b.subtitle,
          badge: b.badge,
          badgeTone: b.tone,
          icon: <FileText className="w-4 h-4 text-amber-600" />,
          payload: {
            tab: 'evaluations',
            evalTab: 'boletim_aluno',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            studentId: stu.id,
            period: b.period
          }
        });
      });
    }

    if (isSchoolAdminMode || isStudentMode) {
      items.push({
        id: 'csc-bol-doc-qr',
        category: 'boletins',
        groupLabel: '4. Boletins Individuais do Aluno',
        title: `Boletim Oficial MED c/ Código QR — ${stu.fullName}`,
        subtitle: 'Emissão oficial com cabeçalho do MED, assinatura e exportação PDF A4/A5',
        badge: 'PDF + QR',
        badgeTone: 'emerald',
        icon: <FileText className="w-4 h-4 text-emerald-600" />,
        payload: {
          tab: 'documents',
          subsystemCode: cls.subsystemCode,
          gradeLevel: cls.gradeLevel,
          classId: cls.id,
          studentId: stu.id,
          docType: 'boletim_trimestral',
          period: 'anual'
        }
      });
    }

    // 5E. OUTROS DOCUMENTOS
    if (isSchoolAdminMode || isStudentMode) {
      [
        {
          docType: 'declaracao_matricula',
          title: `Declaração de Matrícula — ${stu.fullName}`,
          subtitle: `Comprovativo oficial de frequência em ${cls.gradeLevel} (${cls.name})`,
          badge: 'Declaração'
        },
        {
          docType: 'declaracao_notas',
          title: `Declaração com Discriminação de Notas — ${stu.fullName}`,
          subtitle: 'Documento formal com médias por disciplina e validação QR Code',
          badge: 'Notas'
        },
        {
          docType: 'certificado',
          title: `Certificado de Habilitações — ${stu.fullName}`,
          subtitle: `Certificado final de conclusão · ${cls.gradeLevel}`,
          badge: 'Certificado'
        },
        {
          docType: 'recibo_propina',
          title: `Recibo Oficial de Propinas — ${stu.fullName}`,
          subtitle: 'Comprovativo financeiro de liquidação emitida pela Tesouraria',
          badge: 'Recibo'
        }
      ].forEach((d) => {
        items.push({
          id: `csc-doc-${d.docType}`,
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos Oficiais',
          title: d.title,
          subtitle: d.subtitle,
          badge: d.badge,
          badgeTone: 'purple',
          icon: <Receipt className="w-4 h-4 text-purple-600" />,
          payload: {
            tab: 'documents',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            studentId: stu.id,
            docType: d.docType,
            period: 'anual'
          }
        });
      });
    }

    if (!isStudentMode) {
      items.push(
        {
          id: 'csc-other-profile',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Processos',
          title: `Ficha Individual do Aluno — ${stu.fullName}`,
          subtitle: `Processo ${stu.processNumber} · Dados biográficos, encarregado e histórico`,
          badge: 'Ficha',
          badgeTone: 'slate',
          icon: <GraduationCap className="w-4 h-4 text-[#0073b7]" />,
          payload: {
            tab: 'students',
            studentId: stu.id,
            studentSearch: stu.processNumber,
            openStudentProfileId: stu.id
          }
        },
        {
          id: 'csc-other-archive',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Processos',
          title: `Arquivo Digital do Aluno — ${stu.fullName}`,
          subtitle: 'BI, certidões, atestados e comprovativos enviados para o processo',
          badge: 'Arquivo Digital',
          badgeTone: 'emerald',
          icon: <FolderArchive className="w-4 h-4 text-emerald-600" />,
          payload: {
            tab: 'digital_archive',
            studentId: stu.id,
            studentSearch: stu.processNumber
          }
        },
        {
          id: 'csc-other-att',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Processos',
          title: `Frequência & Mapa de Faltas — ${cls.name}`,
          subtitle: isProfessorMode
            ? `Registar chamada diária e validar justificações de ${stu.fullName}`
            : `Consultar faltas justificadas e injustificadas de ${stu.fullName}`,
          badge: 'Frequência',
          badgeTone: 'blue',
          icon: <Users className="w-4 h-4 text-[#0073b7]" />,
          payload: {
            tab: 'attendance',
            classId: cls.id,
            studentId: stu.id
          }
        },
        {
          id: 'csc-other-roster',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Processos',
          title: `Lista Nominal / Folha de Chamada — ${cls.name}`,
          subtitle: `Folha oficial da turma ${cls.code} (${cls.gradeLevel}) · PDF A4/A5`,
          badge: 'Lista Nominal',
          badgeTone: 'slate',
          icon: <ClipboardList className="w-4 h-4 text-slate-600" />,
          payload: {
            tab: 'classes',
            openRosterClassId: cls.id
          }
        }
      );
    } else {
      items.push(
        {
          id: 'csc-stu-archive',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Serviços',
          title: 'Arquivo Digital (Enviar Documentos Escolares)',
          subtitle: 'Carregar BI, atestado, certificado ou comprovativo para a escola',
          badge: 'Arquivo',
          badgeTone: 'emerald',
          icon: <FolderArchive className="w-4 h-4 text-emerald-600" />,
          payload: { tab: 'digital_archive', studentId: stu.id }
        },
        {
          id: 'csc-stu-att',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Serviços',
          title: 'Frequência às Aulas & Status das Faltas',
          subtitle: 'Ver presenças, faltas e enviar justificação ao professor',
          badge: 'Frequência',
          badgeTone: 'blue',
          icon: <Users className="w-4 h-4 text-[#0073b7]" />,
          payload: { tab: 'student_attendance', studentId: stu.id }
        },
        {
          id: 'csc-stu-tuit',
          category: 'outros_documentos',
          groupLabel: '5. Outros Documentos & Serviços',
          title: 'Propinas, Matrícula & Referência Multicaixa',
          subtitle: 'Consultar situação financeira e notificações da Tesouraria',
          badge: 'Finanças',
          badgeTone: 'amber',
          icon: <DollarSign className="w-4 h-4 text-amber-600" />,
          payload: { tab: 'student_tuition', studentId: stu.id }
        }
      );
    }

    return items;
  }, [
    selectedCascadeStudent,
    selectedCascadeClass,
    instCustomSubjects,
    isProfessorMode,
    currentTeacher,
    isStudentMode,
    isSchoolAdminMode
  ]);

  const cascadeDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      cascadeActionOptions.map((item) => ({
        value: item.id,
        label: item.title,
        description: item.subtitle,
        group: item.groupLabel,
        badge: item.badge,
        badgeTone: item.badgeTone
      })),
    [cascadeActionOptions]
  );

  const filteredCascadeActionOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cascadeActionOptions.filter((item) => {
      const matchCat = cascadeDocCategory === 'tudo' || item.category === cascadeDocCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.groupLabel.toLowerCase().includes(q)
      );
    });
  }, [cascadeActionOptions, cascadeDocCategory, query]);

  const cascadeCategoryCounts = useMemo(() => {
    const counts: Record<CascadeDocCategory, number> = {
      tudo: cascadeActionOptions.length,
      disciplinas: 0,
      mini_pautas: 0,
      pautas: 0,
      boletins: 0,
      outros_documentos: 0
    };
    cascadeActionOptions.forEach((o) => {
      counts[o.category] += 1;
    });
    return counts;
  }, [cascadeActionOptions]);

  const handleResetCascade = () => {
    if (isStudentMode) {
      setCascadeDocCategory('tudo');
      setCascadeSelectedActionId('');
      return;
    }
    setCascadeSubsystem('');
    setCascadeGradeLevel('');
    setCascadeClassId('');
    setCascadeStudentId('');
    setCascadeDocCategory('tudo');
    setCascadeSelectedActionId('');
  };

  // Carregar um aluno directamente para a cascata (usado na pesquisa por texto)
  const loadStudentIntoCascade = (stu: Student) => {
    setCascadeSubsystem(stu.subsystemCode);
    setCascadeGradeLevel(stu.gradeLevel);
    setCascadeClassId(stu.classId);
    setCascadeStudentId(stu.id);
    setCascadeDocCategory('tudo');
    setCascadeSelectedActionId('');
    setQuery('');
    setViewMode('cascata');
  };

  // 1. Definição das Funcionalidades por Perfil (para a aba "Todos os Módulos / Pesquisa Livre")
  const functionalities: FunctionalityDef[] = useMemo(() => {
    if (isSuperAdminMode) {
      return [
        {
          id: 'tudo',
          label: 'Todas as Funcionalidades',
          shortLabel: 'Todas',
          description: 'Visão completa do ecossistema SaaS',
          icon: <Filter className="w-3.5 h-3.5" />
        },
        {
          id: 'escolas_subsistemas',
          label: 'Escolas & Feature Flags',
          shortLabel: 'Escolas',
          description: 'Instituições, cotas e módulos activos',
          icon: <Building2 className="w-3.5 h-3.5" />
        },
        {
          id: 'utilizadores_acessos',
          label: 'Utilizadores & Acessos',
          shortLabel: 'Utilizadores',
          description: 'Administradores, docentes e contas',
          icon: <Users className="w-3.5 h-3.5" />
        },
        {
          id: 'planos_faturacao',
          label: 'Subscrições & Planos (Kz)',
          shortLabel: 'Subscrições',
          description: 'Facturação SaaS e ciclos anuais',
          icon: <CreditCard className="w-3.5 h-3.5" />
        },
        {
          id: 'curriculo_sistema',
          label: 'Currículo INIDE, SQL & Auditoria',
          shortLabel: 'Sistema',
          description: 'Matrizes nacionais, base de dados e logs',
          icon: <Settings className="w-3.5 h-3.5" />
        }
      ];
    }

    if (isMunicipalDirectorMode) {
      return [
        {
          id: 'tudo',
          label: 'Todas as Vistas Municipais',
          shortLabel: 'Todas',
          description: `Município de ${currentUser?.municipality || 'Educação'}`,
          icon: <Filter className="w-3.5 h-3.5" />
        },
        {
          id: 'mun_consolidado',
          label: 'Consolidado & Aproveitamento',
          shortLabel: 'Consolidado',
          description: 'Visão global e rendimento escolar',
          icon: <BarChart3 className="w-3.5 h-3.5" />
        },
        {
          id: 'mun_escolas',
          label: 'Escolas do Município',
          shortLabel: 'Escolas',
          description: 'Unidades escolares sob tutela municipal',
          icon: <Building2 className="w-3.5 h-3.5" />
        },
        {
          id: 'mun_matriculados',
          label: 'Matriculados (Género, Classe, Turma)',
          shortLabel: 'Matriculados',
          description: 'Estatística M/F por turma e escola',
          icon: <Users className="w-3.5 h-3.5" />
        }
      ];
    }

    if (isSchoolAdminMode) {
      return [
        {
          id: 'tudo',
          label: 'Todas as Funcionalidades',
          shortLabel: 'Todas',
          description: 'Acesso global ao catálogo da escola',
          icon: <Filter className="w-3.5 h-3.5" />
        },
        {
          id: 'estrutura_academica',
          label: 'Subsistemas, Classes, Turmas & Disciplinas',
          shortLabel: 'Académico',
          description: 'Estrutura curricular, vagas e disciplinas',
          icon: <Layers className="w-3.5 h-3.5" />
        },
        {
          id: 'avaliacoes_exames',
          label: 'Pautas, Mini-Pautas & Exames (EN / REC)',
          shortLabel: 'Pautas & Exames',
          description: 'Pautas consolidadas, EN e Recursos',
          icon: <ClipboardList className="w-3.5 h-3.5" />
        },
        {
          id: 'alunos_listas',
          label: 'Alunos, Matrículas & Listas Nominais',
          shortLabel: 'Alunos & Listas',
          description: 'Processos, chamadas e matrículas',
          icon: <GraduationCap className="w-3.5 h-3.5" />
        },
        {
          id: 'documentos_med',
          label: 'Documentos Oficiais, Boletins & Certificados',
          shortLabel: 'Documentos',
          description: 'Declarações, boletins MED e QR Code',
          icon: <FileText className="w-3.5 h-3.5" />
        },
        {
          id: 'financas_propinas',
          label: 'Finanças, Propinas & Cobranças (Kz)',
          shortLabel: 'Finanças',
          description: 'Facturas, Multicaixa e recibos',
          icon: <DollarSign className="w-3.5 h-3.5" />
        },
        {
          id: 'docentes_gestao',
          label: 'Docentes, Utilizadores, IA & Sistema',
          shortLabel: 'Docentes & Admin',
          description: 'Corpo docente, contas, relatórios e IA',
          icon: <Settings className="w-3.5 h-3.5" />
        }
      ];
    }

    if (isProfessorMode) {
      return [
        {
          id: 'tudo',
          label: 'Todas as Funcionalidades',
          shortLabel: 'Todas',
          description: 'Área completa do docente',
          icon: <Filter className="w-3.5 h-3.5" />
        },
        {
          id: 'minhas_turmas',
          label: 'Turmas Atribuídas & Listas Nominais',
          shortLabel: 'Turmas & Listas',
          description: 'Disciplinas atribuídas e chamada',
          icon: <Layers className="w-3.5 h-3.5" />
        },
        {
          id: 'pautas_exames',
          label: 'Mini-Pautas, Pautas & Exames (EN / REC)',
          shortLabel: 'Pautas & Exames',
          description: 'Lançamento de notas, EN e Recurso',
          icon: <ClipboardList className="w-3.5 h-3.5" />
        },
        {
          id: 'alunos_boletins',
          label: 'Estudantes & Boletins Individuais (MED)',
          shortLabel: 'Alunos & Boletins',
          description: 'Fichas de alunos e boletins anuais',
          icon: <GraduationCap className="w-3.5 h-3.5" />
        },
        {
          id: 'ia_pedagogica',
          label: 'Planos de Aula & IA Pedagógica',
          shortLabel: 'IA INIDE',
          description: 'Planificação e provas trimestrais',
          icon: <Sparkles className="w-3.5 h-3.5" />
        }
      ];
    }

    return [
      {
        id: 'tudo',
        label: 'Todas as Funcionalidades',
        shortLabel: 'Todas',
        description: 'Portal completo do estudante',
        icon: <Filter className="w-3.5 h-3.5" />
      },
      {
        id: 'notas_exames',
        label: 'Notas, Exames (EN/REC) & Boletins',
        shortLabel: 'Notas & Exames',
        description: 'Médias trimestrais e pauta anual',
        icon: <Award className="w-3.5 h-3.5" />
      },
      {
        id: 'frequencias',
        label: 'Frequências & Assiduidade',
        shortLabel: 'Frequências',
        description: 'Presenças, faltas e justificações',
        icon: <Users className="w-3.5 h-3.5" />
      },
      {
        id: 'propinas_matricula',
        label: 'Propinas & Pagamento de Matrícula',
        shortLabel: 'Propinas',
        description: 'Referências Multicaixa e recibos',
        icon: <DollarSign className="w-3.5 h-3.5" />
      },
      {
        id: 'meus_documentos',
        label: 'Meus Documentos Oficiais (PDF A4/A5)',
        shortLabel: 'Documentos',
        description: 'Declarações, boletins e certificados',
        icon: <FileText className="w-3.5 h-3.5" />
      }
    ];
  }, [isSuperAdminMode, isMunicipalDirectorMode, isSchoolAdminMode, isProfessorMode, currentUser?.municipality]);

  // 2. Opções completas para pesquisa livre e módulos
  const allOptions: FilterOption[] = useMemo(() => {
    const list: FilterOption[] = [];

    if (isSuperAdminMode) {
      list.push(
        {
          id: 'sa-feat-inst',
          functionalityId: 'escolas_subsistemas',
          sectionLabel: 'Gestão de Escolas & Subsistemas',
          title: 'Gerir Escolas & Administradores',
          subtitle: 'Cadastrar escolas, limites de turmas e subsistemas autorizados',
          badge: 'Módulo Principal',
          badgeTone: 'purple',
          icon: <Building2 className="w-4 h-4 text-purple-600" />,
          keywords: 'gerir escolas instituicoes administradores cadastrar',
          payload: { tab: 'super_institutions' }
        },
        {
          id: 'sa-feat-users',
          functionalityId: 'utilizadores_acessos',
          sectionLabel: 'Utilizadores & Controlo de Acesso',
          title: 'Gerir Utilizadores & Contas SaaS',
          subtitle: 'Pesquisar contas, activar/suspender acessos e redefinir senhas',
          badge: 'Módulo Principal',
          badgeTone: 'blue',
          icon: <Users className="w-4 h-4 text-sky-600" />,
          keywords: 'gerir utilizadores usuarios contas senhas acessos',
          payload: { tab: 'super_users' }
        },
        {
          id: 'sa-feat-plans',
          functionalityId: 'planos_faturacao',
          sectionLabel: 'Subscrições & Facturação SaaS',
          title: 'Planos de Subscrição SaaS (Kz)',
          subtitle: 'Configurar planos, ciclos de facturação e receita da rede',
          badge: 'Financeiro SaaS',
          badgeTone: 'emerald',
          icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
          keywords: 'planos subscricoes facturacao kwanza receita',
          payload: { tab: 'super_subscriptions' }
        },
        {
          id: 'sa-feat-comm',
          functionalityId: 'utilizadores_acessos',
          sectionLabel: 'Comunicação Institucional',
          title: 'Comunicações & Comunicados às Escolas',
          subtitle: 'Enviar circulares e directivas para os administradores escolares',
          badge: 'Comunicados',
          badgeTone: 'emerald',
          icon: <Megaphone className="w-4 h-4 text-emerald-600" />,
          keywords: 'comunicados comunicacoes avisos circulares escolas',
          payload: { tab: 'super_communications' }
        },
        {
          id: 'sa-feat-psycho',
          functionalityId: 'instituicoes_escolas',
          sectionLabel: 'Acompanhamento Psicopedagógico & Inclusão',
          title: 'Acompanhamento Psicopedagógico & Activação de Escolas',
          subtitle: 'Configurar protocolos INEE/MED, casos e activar o módulo por escola',
          badge: 'Psicopedagogia',
          badgeTone: 'emerald',
          icon: <HeartHandshake className="w-4 h-4 text-emerald-600" />,
          keywords: 'psicopedagogico psicopedagogia nee pei inclusao activar escolas',
          payload: { tab: 'super_psychopedagogical' }
        },
        {
          id: 'sa-feat-curr',
          functionalityId: 'curriculo_sistema',
          sectionLabel: 'Currículo INIDE, Base de Dados & Auditoria',
          title: '11 Subsistemas Oficiais de Angola',
          subtitle: 'Consultar matriz curricular nacional do INIDE / MED',
          badge: 'INIDE / MED',
          badgeTone: 'amber',
          icon: <BookOpen className="w-4 h-4 text-amber-600" />,
          keywords: 'subsistemas curriculo inide med matriz nacional',
          payload: { tab: 'super_curriculum' }
        },
        {
          id: 'sa-feat-sql',
          functionalityId: 'curriculo_sistema',
          sectionLabel: 'Currículo INIDE, Base de Dados & Auditoria',
          title: 'Configurações, Supabase PostgreSQL & RLS',
          subtitle: 'Esquema relacional multi-inquilino e backup de dados',
          badge: 'Base de Dados',
          badgeTone: 'slate',
          icon: <Settings className="w-4 h-4 text-slate-600" />,
          keywords: 'supabase sql postgres rls configuracoes backup',
          payload: { tab: 'super_supabase_sql' }
        },
        {
          id: 'sa-feat-audit',
          functionalityId: 'curriculo_sistema',
          sectionLabel: 'Currículo INIDE, Base de Dados & Auditoria',
          title: 'Registo Global de Auditoria',
          subtitle: 'Histórico de operações e segurança da plataforma',
          badge: 'Auditoria',
          badgeTone: 'slate',
          icon: <History className="w-4 h-4 text-rose-600" />,
          keywords: 'auditoria logs seguranca historico',
          payload: { tab: 'super_audit' }
        },
        {
          id: 'sa-feat-mem',
          functionalityId: 'curriculo_sistema',
          sectionLabel: 'Currículo INIDE, Base de Dados & Auditoria',
          title: 'Memória Localhost (Backup & Restauro)',
          subtitle: 'Exportar ou restaurar dados guardados localmente',
          badge: 'Localhost',
          badgeTone: 'emerald',
          icon: <HardDrive className="w-4 h-4 text-emerald-600" />,
          keywords: 'memoria localhost backup restauro exportar',
          payload: { tab: 'super_institutions', openMemoryModal: true }
        }
      );

      institutions.forEach((inst) => {
        list.push({
          id: `sa-inst-${inst.id}`,
          functionalityId: 'escolas_subsistemas',
          sectionLabel: 'Escolas Registadas',
          title: inst.name,
          subtitle: `${inst.province} · ${inst.currentClassesCount}/${inst.maxClasses} turmas · Admin: ${inst.adminName || inst.directorName}`,
          badge: inst.status === 'active' ? 'Activa' : 'Suspensa',
          badgeTone: inst.status === 'active' ? 'emerald' : 'amber',
          icon: <Building2 className="w-4 h-4 text-purple-600" />,
          keywords: `${inst.name} ${inst.acronym} ${inst.code} ${inst.province} ${inst.municipality} ${inst.adminName || ''} ${inst.adminEmail || ''}`,
          payload: {
            tab: 'super_institutions',
            institutionId: inst.id,
            openInstitutionModal: true
          }
        });
      });

      const userMap = new Map<
        string,
        { id: string; name: string; email: string; role: string; instName: string }
      >();
      schoolUsers.forEach((u) => {
        const inst = institutions.find((i) => i.id === u.institutionId);
        userMap.set(u.email.toLowerCase(), {
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: u.role.replace(/_/g, ' '),
          instName: inst?.acronym || inst?.name || 'Escola'
        });
      });

      Array.from(userMap.values()).forEach((u) => {
        list.push({
          id: `sa-usr-${u.id}`,
          functionalityId: 'utilizadores_acessos',
          sectionLabel: 'Contas de Utilizadores',
          title: u.name,
          subtitle: `${u.email} · ${u.instName} (${u.role})`,
          badge: 'Utilizador',
          badgeTone: 'blue',
          icon: <Users className="w-4 h-4 text-sky-600" />,
          keywords: `${u.name} ${u.email} ${u.instName} ${u.role}`,
          payload: {
            tab: 'super_users',
            userSearch: u.email
          }
        });
      });

      return list;
    }

    if (isMunicipalDirectorMode) {
      const munName = currentUser?.municipality || 'Município';
      const munInsts = institutions.filter(
        (inst) =>
          !currentUser?.municipality ||
          inst.municipality.trim().toLowerCase() ===
            currentUser.municipality.trim().toLowerCase()
      );

      list.push(
        {
          id: 'mun-dash',
          functionalityId: 'mun_consolidado',
          sectionLabel: 'Supervisão Municipal',
          title: `Consolidado do Município (${munName})`,
          subtitle: 'Resumo geral de escolas, género M/F e aproveitamento escolar',
          badge: 'Consolidado',
          badgeTone: 'emerald',
          icon: <BarChart3 className="w-4 h-4 text-emerald-600" />,
          keywords: 'consolidado municipio visao geral estatistica',
          payload: { tab: 'municipal_dashboard' }
        },
        {
          id: 'mun-schools',
          functionalityId: 'mun_escolas',
          sectionLabel: 'Supervisão Municipal',
          title: `Escolas do Município (${munInsts.length})`,
          subtitle: 'Visualizar todas as escolas e inspecionar dados pedagógicos',
          badge: 'Escolas',
          badgeTone: 'blue',
          icon: <Building2 className="w-4 h-4 text-sky-600" />,
          keywords: 'escolas instituicoes unidades municipio',
          payload: { tab: 'municipal_schools' }
        },
        {
          id: 'mun-enroll',
          functionalityId: 'mun_matriculados',
          sectionLabel: 'Estatísticas de Matrículas',
          title: 'Matriculados por Género (M/F), Classe, Turma e Escola',
          subtitle: 'Desagregação completa e consolidado municipal',
          badge: 'Género M/F',
          badgeTone: 'blue',
          icon: <Users className="w-4 h-4 text-sky-600" />,
          keywords: 'matriculados genero masculino feminino classe turma escola',
          payload: { tab: 'municipal_enrollment' }
        },
        {
          id: 'mun-perf',
          functionalityId: 'mun_consolidado',
          sectionLabel: 'Aproveitamento Escolar',
          title: 'Aproveitamento Escolar por Escola e Pautas Gerais',
          subtitle: 'Taxa de aprovação, recurso, reprovação e consulta de pautas',
          badge: 'Aproveitamento',
          badgeTone: 'amber',
          icon: <Award className="w-4 h-4 text-amber-600" />,
          keywords: 'aproveitamento pauta aprovados recurso reprovados notas',
          payload: { tab: 'municipal_performance' }
        }
      );

      munInsts.forEach((inst) => {
        const instStuds = students.filter((s) => s.institutionId === inst.id).length;
        list.push({
          id: `mun-inst-${inst.id}`,
          functionalityId: 'mun_escolas',
          sectionLabel: `Escolas de ${munName}`,
          title: inst.name,
          subtitle: `${inst.commune || inst.municipality} · ${instStuds} aluno(s) matriculado(s) · Dir.: ${inst.directorName}`,
          badge: inst.acronym,
          badgeTone: 'emerald',
          icon: <Building2 className="w-4 h-4 text-emerald-600" />,
          keywords: `${inst.name} ${inst.acronym} ${inst.code} ${inst.directorName}`,
          payload: {
            tab: 'municipal_schools',
            institutionId: inst.id
          }
        });
      });

      return list;
    }

    if (isSchoolAdminMode && currentInstitution) {
      const registeredSubsystems = ANGOLA_EDUCATION_SUBSYSTEMS.filter((sub) =>
        currentInstitution.subsystems.includes(sub.code)
      );

      registeredSubsystems.forEach((sub) => {
        const subClassesCount = instClasses.filter((c) => c.subsystemCode === sub.code).length;
        list.push({
          id: `adm-sub-${sub.code}`,
          functionalityId: 'estrutura_academica',
          sectionLabel: 'Subsistemas Cadastrados',
          title: sub.name,
          subtitle: `${sub.gradesOrYears.join(', ')} · ${subClassesCount} turma(s)`,
          badge: sub.shortName,
          badgeTone: 'purple',
          icon: <BookOpen className="w-4 h-4 text-purple-600" />,
          keywords: `subsistema ${sub.name} ${sub.shortName} ${sub.code}`,
          payload: {
            tab: 'curriculum_explorer',
            subsystemCode: sub.code
          }
        });
      });

      instClasses.forEach((cls) => {
        const realCount = instStudents.filter((s) => s.classId === cls.id).length;
        const hasExams = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);
        list.push({
          id: `adm-cls-${cls.id}`,
          functionalityId: 'estrutura_academica',
          sectionLabel: 'Turmas & Disciplinas',
          title: `${cls.name} (${cls.code})`,
          subtitle: `${cls.gradeLevel} · Turno ${cls.shift} · ${cls.room} · ${realCount}/${cls.maxCapacity} alunos`,
          badge: hasExams ? 'Exames EN/REC' : 'Turma',
          badgeTone: hasExams ? 'amber' : 'emerald',
          icon: <Layers className="w-4 h-4 text-emerald-600" />,
          keywords: `turma ${cls.name} ${cls.code} ${cls.gradeLevel} ${cls.shift} ${cls.room}`,
          payload: {
            tab: 'classes',
            classId: cls.id,
            classSearch: cls.code
          }
        });

        list.push({
          id: `adm-list-pauta-${cls.id}`,
          functionalityId: 'avaliacoes_exames',
          sectionLabel: 'Pautas & Mini-Pautas',
          title: `Pauta Geral Consolidada — ${cls.name}`,
          subtitle: hasExams
            ? `MT1, MT2, MT3, EN, REC & MFD (${cls.gradeLevel})`
            : `Matriz MT1, MT2, MT3 & MFD (${cls.gradeLevel})`,
          badge: hasExams ? 'Pauta + EN/REC' : 'Pauta Geral',
          badgeTone: hasExams ? 'amber' : 'emerald',
          icon: <Award className="w-4 h-4 text-emerald-600" />,
          keywords: `pauta geral ${cls.name} ${cls.code} ${cls.gradeLevel}`,
          payload: {
            tab: 'evaluations',
            evalTab: 'pauta_geral',
            subsystemCode: cls.subsystemCode,
            gradeLevel: cls.gradeLevel,
            classId: cls.id
          }
        });
      });

      instStudents.forEach((stu) => {
        list.push({
          id: `adm-stu-${stu.id}`,
          functionalityId: 'alunos_listas',
          sectionLabel: 'Alunos Matriculados',
          title: stu.fullName,
          subtitle: `Proc. ${stu.processNumber} · ${stu.gradeLevel} · ${stu.className}`,
          badge: 'Aluno',
          badgeTone: 'slate',
          icon: <GraduationCap className="w-4 h-4 text-sky-600" />,
          keywords: `aluno ${stu.fullName} ${stu.processNumber} ${stu.className} ${stu.gradeLevel}`,
          payload: {
            tab: 'students',
            studentId: stu.id,
            studentSearch: stu.processNumber,
            openStudentProfileId: stu.id
          }
        });
      });

      list.push(
        {
          id: 'adm-mod-subjects',
          functionalityId: 'estrutura_academica',
          sectionLabel: 'Catálogo de Disciplinas',
          title: 'Catálogo & Cadastramento de Disciplinas',
          subtitle: 'Criar ou editar disciplinas curriculares, carga horária e matriz INIDE',
          badge: 'Disciplinas',
          badgeTone: 'emerald',
          icon: <BookOpen className="w-4 h-4 text-[#00a65a]" />,
          keywords: 'disciplinas cadastrar catalogo carga horaria',
          payload: { tab: 'subjects' }
        },
        {
          id: 'adm-mod-eval',
          functionalityId: 'avaliacoes_exames',
          sectionLabel: 'Centro de Avaliações & Exames (MED)',
          title: 'Centro de Pautas, Mini-Pautas & Boletins',
          subtitle: 'Exames EN & Recursos REC para 6.ª, Módulo 3, Etapa 3, 9.ª, 12.ª e Superior',
          badge: 'Módulo MED',
          badgeTone: 'blue',
          icon: <ClipboardList className="w-4 h-4 text-[#0073b7]" />,
          keywords: 'pautas mini-pautas exames en recurso rec avaliacoes',
          payload: { tab: 'evaluations' }
        },
        {
          id: 'adm-mod-docs',
          functionalityId: 'documentos_med',
          sectionLabel: 'Emissor de Documentos Oficiais',
          title: 'Centro de Documentos, Boletins & Certificados',
          subtitle: 'Declarações, boletins, recibos e certificados com QR Code (PDF A4/A5)',
          badge: 'QR Code',
          badgeTone: 'amber',
          icon: <FileText className="w-4 h-4 text-amber-600" />,
          keywords: 'centro documentos certificados declaracoes qr code',
          payload: { tab: 'documents' }
        },
        {
          id: 'adm-mod-archive',
          functionalityId: 'documentos_med',
          sectionLabel: 'Arquivo Digital de Documentos Enviados',
          title: 'Arquivo Digital (Envios de Alunos & Encarregados)',
          subtitle: 'Visualizar, descarregar e validar BI, certificados e atestados',
          badge: 'Arquivo Digital',
          badgeTone: 'emerald',
          icon: <FolderArchive className="w-4 h-4 text-[#0073b7]" />,
          keywords: 'arquivo digital envios alunos encarregados',
          payload: { tab: 'digital_archive' }
        },
        {
          id: 'adm-mod-comm',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Comunicação Institucional',
          title: 'Comunicações & Comunicados Oficiais',
          subtitle: 'Enviar comunicados a utilizadores, professores, financeiro, alunos e encarregados',
          badge: 'Comunicados',
          badgeTone: 'emerald',
          icon: <Megaphone className="w-4 h-4 text-[#067836]" />,
          keywords: 'comunicados comunicacoes avisos circulares enviar',
          payload: { tab: 'communications' }
        },
        {
          id: 'adm-mod-attendance',
          functionalityId: 'alunos_listas',
          sectionLabel: 'Assiduidade & Faltas (Consulta)',
          title: 'Faltas por Aluno (Justificadas e Não Justificadas)',
          subtitle: 'Visualizar o número de faltas justificadas e injustificadas por estudante',
          badge: 'Consulta',
          badgeTone: 'amber',
          icon: <ClipboardList className="w-4 h-4 text-[#0073b7]" />,
          keywords: 'faltas assiduidade frequencia justificadas injustificadas',
          payload: { tab: 'attendance' }
        },
        {
          id: 'adm-list-financial',
          functionalityId: 'financas_propinas',
          sectionLabel: 'Finanças & Tesouraria Escolar',
          title: 'Propinas, Matrículas, Outros & Notificações (Kz)',
          subtitle: 'Gestão exclusiva do Tesoureiro e consulta de cobranças',
          badge: 'Tesouraria',
          badgeTone: 'emerald',
          icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
          keywords: 'financas propinas matriculas cobrancas tesoureiro notificacoes',
          payload: { tab: 'financial' }
        },
        {
          id: 'adm-list-teachers',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Corpo Docente & Utilizadores',
          title: `Corpo Docente & Atribuição de Turmas (${instTeachers.length})`,
          subtitle: 'Cadastrar docentes e atribuir 1 ou mais disciplinas por turma',
          badge: 'Docentes',
          badgeTone: 'emerald',
          icon: <Users className="w-4 h-4 text-teal-600" />,
          keywords: 'docentes professores atribuicao disciplinas',
          payload: { tab: 'teachers' }
        },
        {
          id: 'adm-mod-users',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Corpo Docente & Utilizadores',
          title: 'Gestão de Utilizadores da Escola',
          subtitle: 'Contas de professores, secretaria, tesouraria, alunos e encarregados',
          badge: 'Acessos',
          badgeTone: 'blue',
          icon: <Users className="w-4 h-4 text-indigo-600" />,
          keywords: 'utilizadores contas senhas acessos',
          payload: { tab: 'school_users' }
        },
        {
          id: 'adm-mod-rep',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Administração, Relatórios & Ferramentas',
          title: 'Estatísticas & Relatórios Oficiais',
          subtitle: 'Pauta geral consolidada, rácios M/F e cobrança em Kwanzas',
          badge: 'Relatórios',
          badgeTone: 'slate',
          icon: <BarChart3 className="w-4 h-4 text-teal-600" />,
          keywords: 'estatisticas relatorios graficos',
          payload: { tab: 'reports' }
        },
        {
          id: 'adm-mod-ai',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Administração, Relatórios & Ferramentas',
          title: 'Assistente Pedagógico IA (INIDE)',
          subtitle: 'Planos de aula, exercícios e provas trimestrais',
          badge: 'IA INIDE',
          badgeTone: 'purple',
          icon: <Sparkles className="w-4 h-4 text-purple-600" />,
          keywords: 'assistente ia planos aula exercicios',
          payload: { tab: 'pedagogical_ai' }
        },
        {
          id: 'adm-mod-settings',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Administração, Relatórios & Ferramentas',
          title: 'Configurações da Escola',
          subtitle: 'Dados institucionais, NIF, direcção e cabeçalho MED',
          badge: 'Configuração',
          badgeTone: 'slate',
          icon: <Settings className="w-4 h-4 text-slate-600" />,
          keywords: 'configuracoes escola nif cabecalho',
          payload: { tab: 'school_settings' }
        },
        {
          id: 'adm-mod-mem',
          functionalityId: 'docentes_gestao',
          sectionLabel: 'Administração, Relatórios & Ferramentas',
          title: 'Memória Localhost (Backup & Restauro)',
          subtitle: 'Gerir armazenamento local dos dados escolares',
          badge: 'Localhost',
          badgeTone: 'emerald',
          icon: <HardDrive className="w-4 h-4 text-emerald-600" />,
          keywords: 'memoria localhost backup restauro',
          payload: { tab: 'dashboard', openMemoryModal: true }
        }
      );

      // Incluir disciplinas oficiais para pesquisa rápida
      const seenOfficialSubj = new Set<string>();
      OFFICIAL_CURRICULUM_PLANS.filter((plan) =>
        currentInstitution.subsystems.includes(plan.subsystemCode)
      ).forEach((plan) => {
        plan.subjects.forEach((subj) => {
          const uniq = `${subj.code}::${plan.gradeLevel}`;
          if (seenOfficialSubj.has(uniq)) return;
          seenOfficialSubj.add(uniq);
          list.push({
            id: `adm-disc-off-${plan.id}-${subj.id}`,
            functionalityId: 'estrutura_academica',
            sectionLabel: 'Disciplinas Curriculares (INIDE)',
            title: `${subj.name} (${subj.code})`,
            subtitle: `${plan.gradeLevel} · ${subj.weeklyHours}h/sem`,
            badge: 'Disciplina',
            badgeTone: 'blue',
            icon: <BookOpen className="w-4 h-4 text-[#0073b7]" />,
            keywords: `disciplina ${subj.name} ${subj.shortName} ${subj.code} ${plan.gradeLevel}`,
            payload: {
              tab: 'subjects',
              subsystemCode: plan.subsystemCode,
              subjectSearch: subj.code
            }
          });
        });
      });

      return list;
    }

    if (isProfessorMode) {
      cascadeAllowedClasses.forEach((cls) => {
        const hasExams = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);
        list.push(
          {
            id: `prof-cls-${cls.id}`,
            functionalityId: 'minhas_turmas',
            sectionLabel: 'Minhas Turmas Atribuídas',
            title: `Minha Turma: ${cls.name} (${cls.code})`,
            subtitle: `${cls.gradeLevel} · ${cls.room} · Turno ${cls.shift}`,
            badge: hasExams ? 'EN / REC' : 'Turma',
            badgeTone: hasExams ? 'amber' : 'emerald',
            icon: <Layers className="w-4 h-4 text-emerald-600" />,
            keywords: `turma ${cls.name} ${cls.code} ${cls.gradeLevel}`,
            payload: { tab: 'classes', classId: cls.id, classSearch: cls.code }
          },
          {
            id: `prof-att-${cls.id}`,
            functionalityId: 'minhas_turmas',
            sectionLabel: 'Frequência Diária & Justificações',
            title: `Frequência Diária & Faltas — ${cls.name}`,
            subtitle: 'Registar presenças/faltas diárias e validar justificações',
            badge: 'Chamada Diária',
            badgeTone: 'emerald',
            icon: <Users className="w-4 h-4 text-emerald-600" />,
            keywords: `frequencia diaria chamada faltas ${cls.name}`,
            payload: { tab: 'attendance', classId: cls.id }
          },
          {
            id: `prof-mini-${cls.id}`,
            functionalityId: 'pautas_exames',
            sectionLabel: 'Mini-Pautas & Pautas Gerais',
            title: `Mini-Pautas & Notas — ${cls.name}`,
            subtitle: `Lançamento de AC1, AC2, AC3, MAC, NPT${hasExams ? ', EN e REC' : ''}`,
            badge: 'Mini-Pauta',
            badgeTone: 'blue',
            icon: <ClipboardList className="w-4 h-4 text-[#0073b7]" />,
            keywords: `mini-pauta notas ${cls.name}`,
            payload: {
              tab: 'evaluations',
              evalTab: 'mini_pauta',
              subsystemCode: cls.subsystemCode,
              gradeLevel: cls.gradeLevel,
              classId: cls.id
            }
          }
        );
      });

      const profStudents = instStudents.filter((s) =>
        cascadeAllowedClasses.some((c) => c.id === s.classId)
      );
      profStudents.forEach((stu) => {
        list.push({
          id: `prof-stu-${stu.id}`,
          functionalityId: 'alunos_boletins',
          sectionLabel: 'Estudantes das Minhas Turmas',
          title: stu.fullName,
          subtitle: `Proc. ${stu.processNumber} · ${stu.className}`,
          badge: 'Aluno',
          badgeTone: 'slate',
          icon: <GraduationCap className="w-4 h-4 text-sky-600" />,
          keywords: `${stu.fullName} ${stu.processNumber} ${stu.className}`,
          payload: { tab: 'students', studentSearch: stu.processNumber, openStudentProfileId: stu.id }
        });
      });

      list.push(
        {
          id: 'prof-archive',
          functionalityId: 'alunos_boletins',
          sectionLabel: 'Arquivo Digital',
          title: 'Arquivo Digital das Minhas Turmas',
          subtitle: 'Visualizar documentos escolares enviados pelos alunos',
          badge: 'Arquivo Digital',
          badgeTone: 'emerald',
          icon: <FolderArchive className="w-4 h-4 text-[#0073b7]" />,
          keywords: 'arquivo digital documentos enviados',
          payload: { tab: 'digital_archive' }
        },
        {
          id: 'prof-ai',
          functionalityId: 'ia_pedagogica',
          sectionLabel: 'Planificação Docente',
          title: 'Planos de Aula & IA Pedagógica (INIDE)',
          subtitle: 'Gerar planos de aula, exercícios e provas trimestrais',
          badge: 'IA INIDE',
          badgeTone: 'purple',
          icon: <Sparkles className="w-4 h-4 text-purple-600" />,
          keywords: 'ia planos aula exercicios',
          payload: { tab: 'pedagogical_ai' }
        },
        {
          id: 'prof-comm',
          functionalityId: 'alunos_boletins',
          sectionLabel: 'Comunicações',
          title: 'Comunicações & Comunicados da Direcção',
          subtitle: 'Consultar circulares e avisos escolares dirigidos a docentes',
          badge: 'Comunicados',
          badgeTone: 'emerald',
          icon: <Megaphone className="w-4 h-4 text-[#067836]" />,
          keywords: 'comunicados comunicacoes avisos direcao',
          payload: { tab: 'communications' }
        }
      );

      return list;
    }

    // MODO ALUNO / ENCARREGADO
    list.push(
      {
        id: 'stu-nav-grades',
        functionalityId: 'notas_exames',
        sectionLabel: 'Aproveitamento Académico',
        title: 'Médias Trimestrais, Exames & Boletins',
        subtitle: 'Consultar AC1, AC2, AC3, MAC, NPT, MT e boletim anual',
        badge: 'Notas',
        badgeTone: 'blue',
        icon: <Award className="w-4 h-4 text-amber-600" />,
        keywords: 'notas medias trimestre boletim',
        payload: { tab: 'student_grades' }
      },
      {
        id: 'stu-nav-att',
        functionalityId: 'frequencias',
        sectionLabel: 'Assiduidade',
        title: 'Frequências às Aulas & Status das Faltas',
        subtitle: 'Consultar presenças, faltas e enviar justificações',
        badge: 'Frequência',
        badgeTone: 'emerald',
        icon: <Users className="w-4 h-4 text-emerald-600" />,
        keywords: 'frequencias faltas presencas justificacoes',
        payload: { tab: 'student_attendance' }
      },
      {
        id: 'stu-nav-tuit',
        functionalityId: 'propinas_matricula',
        sectionLabel: 'Tesouraria & Pagamentos',
        title: 'Propinas, Matrícula & Referência Multicaixa',
        subtitle: 'Consultar situação financeira e notificações do Tesoureiro',
        badge: 'Propinas',
        badgeTone: 'blue',
        icon: <DollarSign className="w-4 h-4 text-sky-600" />,
        keywords: 'propina mensalidade matricula multicaixa',
        payload: { tab: 'student_tuition' }
      },
      {
        id: 'stu-nav-archive',
        functionalityId: 'meus_documentos',
        sectionLabel: 'Documentos & Arquivo Digital',
        title: 'Arquivo Digital — Enviar Documentos',
        subtitle: 'Enviar BI, certidão, certificados e atestados',
        badge: 'Arquivo',
        badgeTone: 'emerald',
        icon: <FolderArchive className="w-4 h-4 text-[#0073b7]" />,
        keywords: 'arquivo digital enviar bi certidao',
        payload: { tab: 'digital_archive' }
      },
      {
        id: 'stu-nav-comm',
        functionalityId: 'meus_documentos',
        sectionLabel: 'Comunicações',
        title: 'Comunicações & Comunicados Escolares',
        subtitle: 'Consultar avisos e circulares da Direcção Escolar',
        badge: 'Comunicados',
        badgeTone: 'emerald',
        icon: <Megaphone className="w-4 h-4 text-[#067836]" />,
        keywords: 'comunicados comunicacoes avisos direcao escola',
        payload: { tab: 'communications' }
      }
    );

    authorizedStudentList.forEach((stu) => {
      [
        { docType: 'boletim_trimestral', title: 'Boletim de Notas (MED)' },
        { docType: 'declaracao_matricula', title: 'Declaração de Matrícula' },
        { docType: 'declaracao_notas', title: 'Declaração com Notas' },
        { docType: 'recibo_propina', title: 'Recibo Oficial de Propinas' },
        { docType: 'certificado', title: 'Certificado de Habilitações' }
      ].forEach((d) => {
        list.push({
          id: `stu-doc-${stu.id}-${d.docType}`,
          functionalityId: 'meus_documentos',
          sectionLabel: 'Documentos Oficiais',
          title: d.title,
          subtitle: `${stu.fullName} · Exportar PDF A4/A5`,
          badge: 'Documento',
          badgeTone: 'slate',
          icon: <FileText className="w-4 h-4 text-amber-600" />,
          keywords: `${d.title} ${stu.fullName} documento pdf`,
          payload: { tab: 'documents', studentId: stu.id, docType: d.docType }
        });
      });
    });

    return list;
  }, [
    isSuperAdminMode,
    isMunicipalDirectorMode,
    isSchoolAdminMode,
    isProfessorMode,
    institutions,
    schoolUsers,
    students,
    currentUser?.municipality,
    currentInstitution,
    instStudents,
    instClasses,
    instTeachers,
    cascadeAllowedClasses,
    authorizedStudentList
  ]);

  const funcCounts = useMemo(() => {
    const counts: Record<string, number> = { tudo: allOptions.length };
    allOptions.forEach((opt) => {
      counts[opt.functionalityId] = (counts[opt.functionalityId] || 0) + 1;
    });
    return counts;
  }, [allOptions]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allOptions
      .filter((opt) => {
        const matchFunc = selectedFuncId === 'tudo' || opt.functionalityId === selectedFuncId;
        if (!matchFunc) return false;
        if (!q) return true;
        return (
          opt.title.toLowerCase().includes(q) ||
          opt.subtitle.toLowerCase().includes(q) ||
          opt.sectionLabel.toLowerCase().includes(q) ||
          opt.keywords.toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 45 : 30);
  }, [allOptions, selectedFuncId, query]);

  const groupedSections = useMemo(() => {
    const sections = new Map<string, Array<{ option: FilterOption; flatIndex: number }>>();
    filteredOptions.forEach((option, flatIndex) => {
      const arr = sections.get(option.sectionLabel) || [];
      arr.push({ option, flatIndex });
      sections.set(option.sectionLabel, arr);
    });
    return Array.from(sections.entries());
  }, [filteredOptions]);

  // Alunos correspondentes à pesquisa de texto rápida dentro da aba Cascata
  const quickSearchMatchedStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || isModuleOnlyMode) return [];
    const pool = isStudentMode
      ? authorizedStudentList
      : isProfessorMode
      ? instStudents.filter((s) => cascadeAllowedClasses.some((c) => c.id === s.classId))
      : instStudents;
    return pool
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.processNumber.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          s.gradeLevel.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, isModuleOnlyMode, isStudentMode, authorizedStudentList, isProfessorMode, instStudents, cascadeAllowedClasses]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, selectedFuncId]);

  const handleSelectOption = (option: FilterOption) => {
    setIsOpen(false);
    onNavigate(option.payload);
  };

  const handleSelectCascadeAction = (action: CascadeActionOption) => {
    setCascadeSelectedActionId(action.id);
    setIsOpen(false);
    onNavigate(action.payload);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || viewMode !== 'modulos') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + Math.max(1, filteredOptions.length)) % Math.max(1, filteredOptions.length)
      );
    } else if (e.key === 'Enter' && filteredOptions[highlightedIndex]) {
      e.preventDefault();
      handleSelectOption(filteredOptions[highlightedIndex]);
    }
  };

  const activeFuncMeta = functionalities.find((f) => f.id === selectedFuncId) || functionalities[0];

  const placeholderText = isSuperAdminMode
    ? 'Pesquisar escolas, utilizadores, planos SaaS...'
    : isMunicipalDirectorMode
    ? `Pesquisar escolas de ${currentUser?.municipality || 'Educação'}, estatísticas M/F e aproveitamento...`
    : 'Pesquisa em Cascata: Subsistema → Classe → Turma → Aluno → Disciplinas/Pautas/Boletins...';

  const currentCascadeStep = !cascadeSubsystem
    ? 1
    : !cascadeGradeLevel
    ? 2
    : !cascadeClassId
    ? 3
    : !cascadeStudentId
    ? 4
    : 5;

  const selectedSubsystemMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === cascadeSubsystem);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl">
      {/* Gatilho Executivo da Pesquisa em Cascata */}
      <div className="hidden md:flex items-center">
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 30);
          }}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs transition cursor-text ${
            isOpen
              ? 'bg-white border-[#067836] ring-2 ring-[#16a34a]/20 text-slate-900 shadow-sm'
              : 'bg-[#f3f7f4] hover:bg-white border-[#dce7df] text-slate-600'
          }`}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Search className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-[#067836]' : 'text-[#067836]/70'}`} />
            {selectedCascadeStudent && !isModuleOnlyMode ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#eaf6ee] border border-[#cde6d5] text-[#067836] font-bold text-[10px] shrink-0 max-w-[230px] truncate">
                <span className="truncate">
                  {selectedCascadeStudent.fullName.split(' ')[0]} · {selectedCascadeClass?.name}
                </span>
                {!isStudentMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetCascade();
                    }}
                    className="hover:text-emerald-950 cursor-pointer shrink-0"
                    aria-label="Limpar pesquisa em cascata"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ) : null}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
              aria-label="Pesquisa em cascata por subsistemas, classes, turmas, aluno e documentos"
            />
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            {query && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                aria-label="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[10px] bg-white rounded border border-[#dce7df] text-slate-400 font-mono">
              ⌘K
            </kbd>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen((prev) => !prev);
                if (!isOpen) setTimeout(() => inputRef.current?.focus(), 30);
              }}
              className="text-slate-400 hover:text-[#067836] p-0.5 rounded cursor-pointer"
              aria-label="Abrir ou fechar pesquisa em cascata"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[#067836]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Gatilho Compacto Mobile (< md) */}
      <div className="flex md:hidden justify-end">
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setTimeout(() => mobileInputRef.current?.focus(), 40);
          }}
          className="inline-flex items-center space-x-1.5 min-h-[40px] px-2.5 py-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] rounded-xl text-xs font-bold text-[#055827] cursor-pointer"
          aria-label="Abrir Pesquisa em Cascata"
        >
          <Search className="w-3.5 h-3.5 text-[#067836]" />
          <span className="hidden xs:inline">Pesquisa</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#067836] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* PAINEL SUSPENSO PRINCIPAL */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 md:absolute md:inset-x-auto md:left-0 md:top-full md:mt-2 bg-white rounded-2xl border border-[#dce7df] shadow-2xl z-50 overflow-hidden flex flex-col max-h-[84vh] md:max-h-[620px] md:w-[760px] lg:w-[820px]">
          {/* Barra Mobile de Pesquisa */}
          <div className="md:hidden p-3 border-b border-[#dce7df] bg-[#f3f7f4] flex items-center space-x-2">
            <Search className="w-4 h-4 text-[#067836] shrink-0" />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Procurar aluno ou filtrar..."
              className="w-full bg-white text-slate-800 text-xs rounded-lg px-2.5 py-2 border border-[#cde6d5] focus:outline-none focus:ring-2 focus:ring-[#067836]"
            />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Barra Superior de Alternância de Modo (Cascata vs Módulos) */}
          {!isModuleOnlyMode && (
            <div className="px-3.5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode('cascata')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
                    viewMode === 'cascata'
                      ? 'bg-white text-[#067836] shadow-2xs'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pesquisa em Cascata</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('modulos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
                    viewMode === 'modulos'
                      ? 'bg-white text-[#067836] shadow-2xs'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Módulos &amp; Pesquisa Livre</span>
                </button>
              </div>

              {viewMode === 'cascata' && cascadeSubsystem && !isStudentMode && (
                <button
                  type="button"
                  onClick={handleResetCascade}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white hover:bg-white/20 bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reiniciar Cascata</span>
                </button>
              )}
            </div>
          )}

          {/* ==============================================================
              MODO 1: PESQUISA EM CASCATA
              1. Subsistema -> 2. Classe -> 3. Turma -> 4. Aluno -> 5. Filtro Suspenso
             ============================================================== */}
          {viewMode === 'cascata' && !isModuleOnlyMode ? (
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
              {/* Atalho de Pesquisa Directa por Nome/Processo do Aluno para Preencher a Cascata */}
              {query.trim().length > 0 && quickSearchMatchedStudents.length > 0 && (
                <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#067836] uppercase tracking-wider">
                      Alunos Encontrados para &ldquo;{query}&rdquo; — Clique para preencher a cascata
                    </span>
                    <span className="text-slate-600 font-semibold">
                      {quickSearchMatchedStudents.length} resultado(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {quickSearchMatchedStudents.map((stu) => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => loadStudentIntoCascade(stu)}
                        className="text-left p-2 rounded-lg bg-white hover:bg-[#f3f7f4] border border-[#cde6d5] hover:border-[#067836] flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{stu.fullName}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {stu.gradeLevel} · {stu.className} · Proc. {stu.processNumber}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#067836] shrink-0">Carregar →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicador Visual dos 5 Passos da Cascata */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f3f7f4] border border-[#dce7df] rounded-xl px-3 py-2 text-[11px]">
                {[
                  { step: 1, label: '1. Subsistema', done: Boolean(cascadeSubsystem) },
                  { step: 2, label: '2. Classe', done: Boolean(cascadeGradeLevel) },
                  { step: 3, label: '3. Turma', done: Boolean(cascadeClassId) },
                  { step: 4, label: '4. Aluno', done: Boolean(cascadeStudentId) },
                  { step: 5, label: '5. Filtro Suspenso', done: Boolean(cascadeStudentId) }
                ].map((st, idx) => {
                  const isCurrent = currentCascadeStep === st.step;
                  return (
                    <React.Fragment key={st.step}>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                          st.done
                            ? 'bg-[#eaf6ee] text-[#067836] border border-[#cde6d5]'
                            : isCurrent
                            ? 'bg-sky-50 text-[#1d8cf8] border border-sky-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.done && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        <span>{st.label}</span>
                      </span>
                      {idx < 4 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* 4 Selectores Sequenciais em Cascata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FunctionalDropdownFilter
                  label="1. Subsistema de Ensino:"
                  value={cascadeSubsystem}
                  onChange={(val) => {
                    setCascadeSubsystem(val as EducationSubsystemCode);
                    setCascadeGradeLevel('');
                    setCascadeClassId('');
                    setCascadeStudentId('');
                    setCascadeDocCategory('tudo');
                    setCascadeSelectedActionId('');
                  }}
                  options={cascadeSubsystemOptions}
                  disabled={isStudentMode}
                  icon={<BookOpen className="w-4 h-4 text-[#067836]" />}
                  placeholder="Seleccionar subsistema..."
                  searchable
                />

                <FunctionalDropdownFilter
                  label="2. Classe / Ano:"
                  value={cascadeGradeLevel}
                  onChange={(val) => {
                    setCascadeGradeLevel(val);
                    setCascadeClassId('');
                    setCascadeStudentId('');
                    setCascadeDocCategory('tudo');
                    setCascadeSelectedActionId('');
                  }}
                  options={cascadeGradeOptions}
                  disabled={isStudentMode || !cascadeSubsystem}
                  icon={<GraduationCap className="w-4 h-4 text-[#067836]" />}
                  placeholder={
                    cascadeSubsystem
                      ? 'Seleccionar classe...'
                      : '1.º seleccione o Subsistema...'
                  }
                  searchable
                />

                <FunctionalDropdownFilter
                  label="3. Turma:"
                  value={cascadeClassId}
                  onChange={(val) => {
                    setCascadeClassId(val);
                    setCascadeStudentId('');
                    setCascadeDocCategory('tudo');
                    setCascadeSelectedActionId('');
                  }}
                  options={cascadeClassOptions}
                  disabled={isStudentMode || !cascadeGradeLevel}
                  icon={<Layers className="w-4 h-4 text-[#067836]" />}
                  placeholder={
                    !cascadeGradeLevel
                      ? '2.º seleccione a Classe...'
                      : cascadeClassOptions.length === 0
                      ? 'Sem turmas abertas nesta classe'
                      : 'Seleccionar turma...'
                  }
                  searchable
                />

                <FunctionalDropdownFilter
                  label="4. Aluno:"
                  value={cascadeStudentId}
                  onChange={(val) => {
                    setCascadeStudentId(val);
                    setCascadeDocCategory('tudo');
                    setCascadeSelectedActionId('');
                  }}
                  options={cascadeStudentOptions}
                  disabled={isStudentMode || !cascadeClassId}
                  icon={<Users className="w-4 h-4 text-[#067836]" />}
                  placeholder={
                    !cascadeClassId
                      ? '3.º seleccione a Turma...'
                      : cascadeStudentOptions.length === 0
                      ? 'Sem alunos matriculados nesta turma'
                      : 'Seleccionar aluno...'
                  }
                  searchable
                />
              </div>

              {/* PASSO 5: FILTRO SUSPENSO — SURGE APENAS DEPOIS DE SELECCIONAR SUBSISTEMA -> CLASSE -> TURMA -> ALUNO */}
              {!selectedCascadeStudent ? (
                <div className="p-5 bg-[#f3f7f4] border border-dashed border-[#cde6d5] rounded-xl text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-[#eaf6ee] text-[#067836] flex items-center justify-center mx-auto border border-[#cde6d5]">
                    <Filter className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    5.º Passo — Filtro Suspenso (Disciplinas, Mini-Pautas, Pautas, Boletins e Outros Documentos)
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                    {!cascadeSubsystem
                      ? 'Comece por seleccionar o Subsistema de Ensino no 1.º passo acima.'
                      : !cascadeGradeLevel
                      ? `Subsistema "${selectedSubsystemMeta?.shortName}" seleccionado. Escolha agora a Classe.`
                      : !cascadeClassId
                      ? `Classe "${cascadeGradeLevel}" seleccionada. Escolha agora a Turma.`
                      : 'Turma seleccionada. Escolha agora o Aluno para surgir o filtro suspenso completo.'}
                  </p>
                </div>
              ) : (
                <div className="bg-[#eaf6ee]/50 border border-[#cde6d5] rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#cde6d5]">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#067836] block">
                        5.º Passo Desbloqueado · Aluno em Contexto
                      </span>
                      <div className="text-xs font-bold text-slate-900">
                        {selectedCascadeStudent.fullName}{' '}
                        <span className="font-mono text-slate-500 font-normal">
                          (Proc. {selectedCascadeStudent.processNumber})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {selectedSubsystemMeta?.shortName} · {selectedCascadeClass?.gradeLevel} ·{' '}
                        {selectedCascadeClass?.name}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#cde6d5] text-[#067836] text-[10px] font-bold">
                      {cascadeActionOptions.length} acções disponíveis
                    </span>
                  </div>

                  {/* Filtro Suspenso Principal (Dropdown pesquisável com todas as categorias) */}
                  <FunctionalDropdownFilter
                    label="Filtro Suspenso: Disciplinas, Mini-Pautas, Pautas, Boletins e Outros Documentos"
                    value={cascadeSelectedActionId}
                    onChange={(val) => {
                      const found = cascadeActionOptions.find((a) => a.id === val);
                      if (found) handleSelectCascadeAction(found);
                    }}
                    options={cascadeDropdownOptions}
                    icon={<ClipboardList className="w-4 h-4 text-[#067836]" />}
                    placeholder="Abrir filtro suspenso (Disciplinas, Mini-Pautas, Pautas, Boletins, Documentos)..."
                    searchable
                  />

                  {/* Separadores Rápidos por Tipo de Documento / Funcionalidade */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {(
                      [
                        { id: 'tudo', label: 'Tudo' },
                        { id: 'disciplinas', label: 'Disciplinas' },
                        { id: 'mini_pautas', label: 'Mini-Pautas' },
                        { id: 'pautas', label: 'Pautas' },
                        { id: 'boletins', label: 'Boletins' },
                        { id: 'outros_documentos', label: 'Outros Documentos' }
                      ] as Array<{ id: CascadeDocCategory; label: string }>
                    ).map((cat) => {
                      const isActive = cascadeDocCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCascadeDocCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-[#067836] text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-[#dce7df] hover:bg-[#eaf6ee]'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`text-[10px] px-1 rounded ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {cascadeCategoryCounts[cat.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista Directa Filtrada */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCascadeActionOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCascadeAction(item)}
                        className="w-full text-left bg-white hover:bg-[#eaf6ee] border border-[#dce7df] hover:border-[#067836] rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-[#f3f7f4] shrink-0">{item.icon}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {item.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                  BADGE_STYLES[item.badgeTone]
                                }`}
                              >
                                {item.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#067836] shrink-0 inline-flex items-center gap-1">
                          <span className="hidden sm:inline">Abrir</span>
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ==============================================================
               MODO 2: TODOS OS MÓDULOS & PESQUISA LIVRE (INCLUINDO SUPER ADMIN)
               ============================================================== */
            <>
              {/* Tabs de Funcionalidades no Mobile (< md) */}
              <div className="md:hidden px-3 py-2 bg-[#f3f7f4] border-b border-[#dce7df] flex items-center gap-1.5 overflow-x-auto">
                {functionalities.map((fn) => {
                  const isActive = selectedFuncId === fn.id;
                  return (
                    <button
                      key={fn.id}
                      type="button"
                      onClick={() => setSelectedFuncId(fn.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer inline-flex items-center space-x-1.5 ${
                        isActive
                          ? 'bg-[#067836] text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-[#dce7df] hover:bg-[#eaf6ee]'
                      }`}
                    >
                      {fn.icon}
                      <span>{fn.shortLabel}</span>
                      <span
                        className={`text-[10px] px-1 rounded ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {funcCounts[fn.id] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-1 min-h-0 overflow-hidden">
                <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#f3f7f4] border-r border-[#dce7df] p-2.5 overflow-y-auto">
                  <div className="px-2 pb-2 mb-1.5 border-b border-[#dce7df] flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Filtrar por Funcionalidade
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {functionalities.length - 1} mód.
                    </span>
                  </div>

                  <div className="space-y-1">
                    {functionalities.map((fn) => {
                      const isActive = selectedFuncId === fn.id;
                      const count = funcCounts[fn.id] || 0;
                      return (
                        <button
                          key={fn.id}
                          type="button"
                          onClick={() => setSelectedFuncId(fn.id)}
                          className={`w-full text-left p-2 rounded-xl transition cursor-pointer flex items-start justify-between gap-2 ${
                            isActive
                              ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                              : 'text-slate-700 hover:bg-white hover:shadow-2xs border border-transparent hover:border-[#cde6d5]'
                          }`}
                        >
                          <div className="flex items-start space-x-2 min-w-0">
                            <span
                              className={`mt-0.5 shrink-0 ${
                                isActive ? 'text-white' : 'text-[#067836]'
                              }`}
                            >
                              {fn.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold leading-snug line-clamp-2">
                                {fn.label}
                              </div>
                              <div
                                className={`text-[10px] truncate mt-0.5 ${
                                  isActive ? 'text-emerald-100' : 'text-slate-400'
                                }`}
                              >
                                {fn.description}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <div className="px-3.5 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 text-slate-700 font-bold truncate">
                      <span className="text-[#067836]">{activeFuncMeta?.icon}</span>
                      <span className="truncate">{activeFuncMeta?.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {filteredOptions.length} resultado(s)
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    {groupedSections.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-600">
                          Nenhum resultado encontrado para &ldquo;{query}&rdquo;
                        </p>
                      </div>
                    ) : (
                      groupedSections.map(([sectionTitle, sectionItems]) => (
                        <div key={sectionTitle}>
                          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>{sectionTitle}</span>
                            <span className="font-mono text-[9px]">{sectionItems.length}</span>
                          </div>

                          <div className="space-y-0.5 mt-0.5">
                            {sectionItems.map(({ option, flatIndex }) => {
                              const isHighlighted = flatIndex === highlightedIndex;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => handleSelectOption(option)}
                                  onMouseEnter={() => setHighlightedIndex(flatIndex)}
                                  className={`w-full text-left flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl transition cursor-pointer ${
                                    isHighlighted
                                      ? 'bg-[#eaf6ee] border border-[#cde6d5] shadow-2xs'
                                      : 'hover:bg-[#f3f7f4] border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-[#f3f7f4] shrink-0">
                                      {option.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-slate-900 truncate">
                                          {option.title}
                                        </span>
                                        {option.badge && (
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                              BADGE_STYLES[option.badgeTone || 'slate']
                                            }`}
                                          >
                                            {option.badge}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                        {option.subtitle}
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={`text-[10px] font-bold shrink-0 inline-flex items-center space-x-1 ${
                                      isHighlighted ? 'text-[#067836]' : 'text-slate-400'
                                    }`}
                                  >
                                    <span className="hidden sm:inline">Abrir</span>
                                    <CornerDownLeft className="w-3.5 h-3.5" />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Rodapé Executivo */}
          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>
              {isSuperAdminMode
                ? 'Super Admin · Navegação por Funcionalidades SaaS'
                : isMunicipalDirectorMode
                ? `Direcção Municipal de ${currentUser?.municipality || 'Educação'} · Escolas e Estatísticas`
                : 'Pesquisa em Cascata: Subsistema → Classe → Turma → Aluno → Filtro Suspenso'}
            </span>
            <span className="hidden sm:inline font-mono">Esc Fechar</span>
          </div>
        </div>
      )}
    </div>
  );
};
