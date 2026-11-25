/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Cadastramento de Disciplinas e Matriz Curricular da Escola
 * Competência exclusiva do Administrador Escolar · Guardado na Memória Localhost
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Edit2,
  Trash2,
  Power,
  X,
  UserCheck,
  Sparkles
} from 'lucide-react';
import {
  Institution,
  SchoolSubject,
  Teacher,
  EducationSubsystemCode,
  CurriculumSubject
} from '../../types';
import {
  ANGOLA_EDUCATION_SUBSYSTEMS,
  OFFICIAL_CURRICULUM_PLANS
} from '../../data/angolaCurriculum';
import { isExamAndRecourseEligible } from '../../utils/evaluationEngine';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';

interface SubjectsManagerProps {
  currentInstitution: Institution;
  subjects: SchoolSubject[];
  teachers: Teacher[];
  onAddSubject: (subject: SchoolSubject) => void;
  onUpdateSubject: (subject: SchoolSubject) => void;
  onDeleteSubject: (subjectId: string) => void;
  onNavigateTab?: (tab: string) => void;
  initialSearchTerm?: string;
  initialSubsystemCode?: EducationSubsystemCode;
  initialOpenModal?: boolean;
  navigationKey?: number;
}

const GROUP_LABELS: Record<CurriculumSubject['group'], string> = {
  geral: 'Formação Geral',
  especifica: 'Formação Específica',
  socio_cultural: 'Sócio-Cultural',
  tecnica_tecnologica: 'Técnica & Tecnológica',
  pratica: 'Prática / Oficina'
};

export const SubjectsManager: React.FC<SubjectsManagerProps> = ({
  currentInstitution,
  subjects,
  teachers,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onNavigateTab,
  initialSearchTerm = '',
  initialSubsystemCode,
  initialOpenModal = false,
  navigationKey
}) => {
  const availableSubsystems = useMemo(
    () =>
      ANGOLA_EDUCATION_SUBSYSTEMS.filter((s) =>
        currentInstitution.subsystems.includes(s.code)
      ),
    [currentInstitution.subsystems]
  );

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [subsystemFilter, setSubsystemFilter] = useState<string>(
    initialSubsystemCode || 'todos'
  );
  const [originFilter, setOriginFilter] = useState<'todas' | 'escola' | 'oficial'>('todas');
  const [isModalOpen, setIsModalOpen] = useState(initialOpenModal);
  const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states
  const defaultSubsystem = availableSubsystems[0]?.code || 'primario_geral';
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formSubsystem, setFormSubsystem] = useState<EducationSubsystemCode>(defaultSubsystem);
  const [formGradeLevel, setFormGradeLevel] = useState<string>('10.ª Classe');
  const [formCourseName, setFormCourseName] = useState<string>('');
  const [formGroup, setFormGroup] = useState<CurriculumSubject['group']>('geral');
  const [formWeeklyHours, setFormWeeklyHours] = useState<number>(4);
  const [formCoefficient, setFormCoefficient] = useState<number>(1.0);
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formIsTerminalExam, setFormIsTerminalExam] = useState<boolean>(false);

  useEffect(() => {
    if (navigationKey === undefined) return;
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
    if (initialSubsystemCode) {
      setSubsystemFilter(initialSubsystemCode);
    }
  }, [navigationKey, initialSearchTerm, initialSubsystemCode]);

  const instCustomSubjects = useMemo(
    () => subjects.filter((s) => s.institutionId === currentInstitution.id),
    [subjects, currentInstitution.id]
  );

  const instTeachers = useMemo(
    () => teachers.filter((t) => t.institutionId === currentInstitution.id),
    [teachers, currentInstitution.id]
  );

  // Combinar disciplinas cadastradas pela escola + matriz oficial INIDE/MED para os subsistemas da escola
  const combinedSubjects = useMemo(() => {
    const items: Array<{
      key: string;
      code: string;
      name: string;
      shortName: string;
      subsystemCode: EducationSubsystemCode;
      subsystemName: string;
      gradeLevel: string;
      courseName?: string;
      group: CurriculumSubject['group'];
      weeklyHours: number;
      coefficient: number;
      isTerminalExam?: boolean;
      teacherName?: string;
      status: 'activa' | 'inactiva';
      isCustom: boolean;
      customRecord?: SchoolSubject;
    }> = [];

    const customLookup = new Set<string>();
    instCustomSubjects.forEach((cs) => {
      const subMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === cs.subsystemCode);
      customLookup.add(`${cs.subsystemCode}::${cs.gradeLevel}::${cs.code.toLowerCase()}`);
      items.push({
        key: `custom-${cs.id}`,
        code: cs.code,
        name: cs.name,
        shortName: cs.shortName,
        subsystemCode: cs.subsystemCode,
        subsystemName: subMeta?.shortName || cs.subsystemCode,
        gradeLevel: cs.gradeLevel,
        courseName: cs.courseName,
        group: cs.group,
        weeklyHours: cs.weeklyHours,
        coefficient: cs.coefficient,
        isTerminalExam: cs.isTerminalExam,
        teacherName: cs.teacherName,
        status: cs.status,
        isCustom: true,
        customRecord: cs
      });
    });

    OFFICIAL_CURRICULUM_PLANS.filter((plan) =>
      currentInstitution.subsystems.includes(plan.subsystemCode)
    ).forEach((plan) => {
      const subMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === plan.subsystemCode);
      plan.subjects.forEach((subj) => {
        const lookupKey = `${plan.subsystemCode}::${plan.gradeLevel}::${subj.code.toLowerCase()}`;
        if (customLookup.has(lookupKey)) return;

        items.push({
          key: `official-${plan.id}-${subj.id}`,
          code: subj.code,
          name: subj.name,
          shortName: subj.shortName,
          subsystemCode: plan.subsystemCode,
          subsystemName: subMeta?.shortName || plan.subsystemCode,
          gradeLevel: plan.gradeLevel,
          courseName: plan.courseName,
          group: subj.group,
          weeklyHours: subj.weeklyHours,
          coefficient: subj.coefficient,
          isTerminalExam: subj.isTerminalExam,
          status: 'activa',
          isCustom: false
        });
      });
    });

    return items;
  }, [instCustomSubjects, currentInstitution.subsystems]);

  const filteredSubjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return combinedSubjects.filter((item) => {
      if (subsystemFilter !== 'todos') {
        if (subsystemFilter === 'exames_en_rec') {
          if (!isExamAndRecourseEligible(item.subsystemCode, item.gradeLevel)) return false;
        } else if (item.subsystemCode !== subsystemFilter) {
          return false;
        }
      }
      if (originFilter === 'escola' && !item.isCustom) return false;
      if (originFilter === 'oficial' && item.isCustom) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.shortName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.gradeLevel.toLowerCase().includes(q) ||
        item.subsystemName.toLowerCase().includes(q) ||
        (item.courseName || '').toLowerCase().includes(q) ||
        (item.teacherName || '').toLowerCase().includes(q)
      );
    });
  }, [combinedSubjects, searchTerm, subsystemFilter, originFilter]);

  const subsystemDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'todos',
        label: 'Todos os Subsistemas da Escola',
        description: 'Mostrar matriz completa de disciplinas',
        group: 'Filtro Curricular Global',
        badge: `${combinedSubjects.length}`,
        badgeTone: 'slate'
      },
      {
        value: 'exames_en_rec',
        label: 'Disciplinas com Exames (EN) & Recurso (REC)',
        description: '6.ª, Módulo 3, Etapa 3, 9.ª, 12.ª e Ensino Superior',
        group: 'Regime de Avaliação',
        badge: 'EN / REC',
        badgeTone: 'amber'
      },
      ...availableSubsystems.map((s) => ({
        value: s.code,
        label: s.name,
        description: s.shortName,
        group: 'Subsistemas Cadastrados',
        badge: s.shortName,
        badgeTone: 'emerald' as const
      }))
    ],
    [combinedSubjects.length, availableSubsystems]
  );

  const originDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'todas',
        label: 'Todas as Origens',
        description: 'Disciplinas cadastradas e matriz oficial',
        group: 'Origem da Disciplina',
        badge: `${combinedSubjects.length}`,
        badgeTone: 'slate'
      },
      {
        value: 'escola',
        label: `Cadastradas pela Escola (${instCustomSubjects.length})`,
        description: 'Disciplinas criadas pelo Administrador Escolar',
        group: 'Origem da Disciplina',
        badge: 'Escola',
        badgeTone: 'emerald'
      },
      {
        value: 'oficial',
        label: 'Matriz Oficial INIDE / MED',
        description: 'Plano curricular nacional padrão',
        group: 'Origem da Disciplina',
        badge: 'INIDE',
        badgeTone: 'emerald'
      }
    ],
    [combinedSubjects.length, instCustomSubjects.length]
  );

  const selectedSubMeta =
    ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === formSubsystem) || availableSubsystems[0];

  const openNewModal = () => {
    const initialSub =
      subsystemFilter !== 'todos'
        ? (subsystemFilter as EducationSubsystemCode)
        : availableSubsystems[0]?.code || 'primario_geral';
    const meta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === initialSub);

    setEditingSubject(null);
    setFormCode('');
    setFormName('');
    setFormShortName('');
    setFormSubsystem(initialSub);
    setFormGradeLevel(meta?.gradesOrYears[0] || 'Todas');
    setFormCourseName(meta?.coursesAvailable?.[0] || '');
    setFormGroup('geral');
    setFormWeeklyHours(4);
    setFormCoefficient(1.0);
    setFormTeacherId('');
    setFormIsTerminalExam(false);
    setIsModalOpen(true);
  };

  const openEditModal = (subj: SchoolSubject) => {
    setEditingSubject(subj);
    setFormCode(subj.code);
    setFormName(subj.name);
    setFormShortName(subj.shortName);
    setFormSubsystem(subj.subsystemCode);
    setFormGradeLevel(subj.gradeLevel);
    setFormCourseName(subj.courseName || '');
    setFormGroup(subj.group);
    setFormWeeklyHours(subj.weeklyHours);
    setFormCoefficient(subj.coefficient);
    setFormTeacherId(subj.teacherId || '');
    setFormIsTerminalExam(Boolean(subj.isTerminalExam));
    setIsModalOpen(true);
  };

  const handlePersonalizeOfficial = (item: (typeof combinedSubjects)[number]) => {
    setEditingSubject(null);
    setFormCode(item.code);
    setFormName(item.name);
    setFormShortName(item.shortName);
    setFormSubsystem(item.subsystemCode);
    setFormGradeLevel(item.gradeLevel);
    setFormCourseName(item.courseName || '');
    setFormGroup(item.group);
    setFormWeeklyHours(item.weeklyHours);
    setFormCoefficient(item.coefficient);
    setFormTeacherId('');
    setFormIsTerminalExam(Boolean(item.isTerminalExam));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    const teacher = instTeachers.find((t) => t.id === formTeacherId);
    const shortAuto =
      formShortName.trim() ||
      formName
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((w) => w.slice(0, 4).toUpperCase())
        .join('.');

    if (editingSubject) {
      const updated: SchoolSubject = {
        ...editingSubject,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        shortName: shortAuto,
        subsystemCode: formSubsystem,
        gradeLevel: formGradeLevel || 'Todas',
        courseName: formCourseName.trim() || undefined,
        group: formGroup,
        weeklyHours: Number(formWeeklyHours) || 2,
        coefficient: Number(formCoefficient) || 1,
        teacherId: teacher?.id,
        teacherName: teacher?.fullName,
        isTerminalExam: formIsTerminalExam
      };
      onUpdateSubject(updated);
      setIsModalOpen(false);
      setEditingSubject(null);
      setNotice(`Disciplina "${updated.name}" actualizada na memória Localhost!`);
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const newSubject: SchoolSubject = {
      id: `disc-${Date.now()}`,
      institutionId: currentInstitution.id,
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      shortName: shortAuto,
      subsystemCode: formSubsystem,
      gradeLevel: formGradeLevel || 'Todas',
      courseName: formCourseName.trim() || undefined,
      group: formGroup,
      weeklyHours: Number(formWeeklyHours) || 2,
      coefficient: Number(formCoefficient) || 1,
      teacherId: teacher?.id,
      teacherName: teacher?.fullName,
      isTerminalExam: formIsTerminalExam,
      status: 'activa',
      isCustom: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddSubject(newSubject);
    setIsModalOpen(false);
    setNotice(
      `Disciplina "${newSubject.name}" cadastrada e integrada às Pautas, Mini-Pautas e Boletins!`
    );
    setTimeout(() => setNotice(null), 4500);
  };

  const activeCount = combinedSubjects.filter((s) => s.status === 'activa').length;
  const terminalCount = combinedSubjects.filter((s) => s.isTerminalExam).length;
  const avgHours =
    combinedSubjects.length > 0
      ? (
          combinedSubjects.reduce((sum, s) => sum + s.weeklyHours, 0) / combinedSubjects.length
        ).toFixed(1)
      : '0';

  return (
    <div className="space-y-5">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            CADASTRAMENTO DE DISCIPLINAS &amp; CURRÍCULO
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5 font-medium">
            Gestão exclusiva do Administrador Escolar · {currentInstitution.name} · Integradas às Pautas e Mini-Pautas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('curriculum_explorer')}
              className="inline-flex items-center space-x-1.5 min-h-[42px] bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#067836]" />
              <span>Explorador INIDE</span>
            </button>
          )}
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center space-x-1.5 min-h-[42px] bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Disciplina</span>
          </button>
        </div>
      </div>

      {/* Aviso de feedback */}
      {notice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span className="font-semibold">{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[#055827] hover:text-[#064e26] font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Caixas Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Disciplinas Activas</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-0.5">{activeCount}</div>
            <p className="text-[11px] text-[#16a34a] font-semibold mt-0.5">Oficiais + Cadastradas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Cadastradas</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-0.5">
              {instCustomSubjects.length}
            </div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-0.5">Base Institucional</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Carga Média</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-0.5">{avgHours}h</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-0.5">Tempos Semanais</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Exame Terminal</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-0.5">{terminalCount}</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-0.5 truncate">6.ª, Mód. 3, Etp. 3, 9.ª, 12.ª, Sup.</p>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros Suspensos por Funcionalidade */}
      <div className="bg-white rounded-2xl p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar disciplina, código, classe ou docente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[42px] bg-[#f7fbf8] text-slate-800 text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto lg:min-w-[480px]">
            <FunctionalDropdownFilter
              value={subsystemFilter}
              onChange={(val) => setSubsystemFilter(val)}
              options={subsystemDropdownOptions}
              icon={<Layers className="w-4 h-4 text-[#067836]" />}
              placeholder="Filtrar por subsistema / regime..."
              searchable
            />

            <FunctionalDropdownFilter
              value={originFilter}
              onChange={(val) => setOriginFilter(val as any)}
              options={originDropdownOptions}
              icon={<BookOpen className="w-4 h-4 text-[#067836]" />}
              placeholder="Filtrar por origem..."
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Tabela Responsiva de Disciplinas */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-[#067836] to-[#149a45] text-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider">
            Mostrando {filteredSubjects.length} disciplina(s)
          </span>
          <span className="text-[11px] text-emerald-100">
            Integrado automaticamente nas Mini-Pautas e Pautas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                <th className="py-3 px-4">Código / Sigla</th>
                <th className="py-3 px-4">Disciplina</th>
                <th className="py-3 px-4">Subsistema &amp; Classe</th>
                <th className="py-3 px-4">Grupo / Docente</th>
                <th className="py-3 px-4 text-center">Carga / Coef.</th>
                <th className="py-3 px-4 text-center">Origem / Estado</th>
                <th className="py-3 px-4 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf1ec] text-slate-700">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#4b6755]">
                    <BookOpen className="w-8 h-8 text-[#cde6d5] mx-auto mb-2" />
                    <p className="font-semibold text-[#064e26]">
                      Nenhuma disciplina encontrada com este filtro.
                    </p>
                    <button
                      type="button"
                      onClick={openNewModal}
                      className="mt-3 px-4 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      + Cadastrar Primeira Disciplina
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((item) => (
                  <tr key={item.key} className="hover:bg-[#f7fbf8] transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#055827] bg-[#eaf6ee] px-2 py-0.5 rounded-lg border border-[#cde6d5] block w-fit">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-[#4b6755] font-semibold mt-0.5 block">
                        Pauta: {item.shortName}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm block">{item.name}</span>
                      {item.isTerminalExam && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Exame Terminal
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{item.gradeLevel}</span>
                      <span className="text-[11px] text-[#4b6755] block">
                        {item.subsystemName}
                        {item.courseName ? ` · ${item.courseName}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-[#f7fbf8] border border-[#dce7df] px-2 py-0.5 rounded-lg text-[#064e26] font-medium inline-block">
                        {GROUP_LABELS[item.group]}
                      </span>
                      {item.teacherName && (
                        <span className="flex items-center space-x-1 text-[11px] text-[#16a34a] font-semibold mt-1">
                          <UserCheck className="w-3 h-3" />
                          <span>{item.teacherName}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 block">
                        {item.weeklyHours}h/sem
                      </span>
                      <span className="text-[11px] text-[#4b6755]">Coef. {item.coefficient}</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.isCustom ? (
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                            item.status === 'activa'
                              ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          <span>
                            {item.status === 'activa' ? 'Escola · Activa' : 'Escola · Inactiva'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          Matriz INIDE/MED
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.isCustom && item.customRecord ? (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item.customRecord!)}
                            className="p-2 rounded-xl bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] cursor-pointer transition"
                            title="Editar disciplina"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSubject({
                                ...item.customRecord!,
                                status:
                                  item.customRecord!.status === 'activa' ? 'inactiva' : 'activa'
                              })
                            }
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer transition"
                            title={
                              item.customRecord.status === 'activa' ? 'Desactivar' : 'Activar'
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSubject(item.customRecord!.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer transition"
                            title="Remover disciplina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePersonalizeOfficial(item)}
                          className="px-3 py-1.5 rounded-xl bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] font-bold text-[11px] cursor-pointer transition"
                          title="Personalizar carga horária ou atribuir docente"
                        >
                          Personalizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastrar / Editar Disciplina */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#dce7df] max-h-[92vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-200" />
                <span>
                  {editingSubject
                    ? `Editar Disciplina: ${editingSubject.name}`
                    : 'Cadastrar Nova Disciplina Escolar'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSubject(null);
                }}
                className="p-1.5 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: EMP-10"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nome Completo da Disciplina *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Empreendedorismo e Gestão"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Sigla / Nome Curto (Pautas)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: EMP (Opcional)"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Grupo Curricular *
                  </label>
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value as CurriculumSubject['group'])}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    <option value="geral">Formação Geral</option>
                    <option value="especifica">Formação Específica</option>
                    <option value="socio_cultural">Sócio-Cultural</option>
                    <option value="tecnica_tecnologica">Técnica &amp; Tecnológica</option>
                    <option value="pratica">Prática / Oficina</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Subsistema de Ensino *
                  </label>
                  <select
                    value={formSubsystem}
                    onChange={(e) => {
                      const nextSub = e.target.value as EducationSubsystemCode;
                      setFormSubsystem(nextSub);
                      const meta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === nextSub);
                      setFormGradeLevel(meta?.gradesOrYears[0] || 'Todas');
                      setFormCourseName(meta?.coursesAvailable?.[0] || '');
                    }}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    {availableSubsystems.map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Classe / Ano Curricular *
                  </label>
                  <select
                    value={formGradeLevel}
                    onChange={(e) => setFormGradeLevel(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    <option value="Todas">Todas as Classes do Subsistema</option>
                    {(selectedSubMeta?.gradesOrYears || []).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSubMeta?.coursesAvailable && selectedSubMeta.coursesAvailable.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Curso / Área de Especialização
                  </label>
                  <select
                    value={formCourseName}
                    onChange={(e) => setFormCourseName(e.target.value)}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    <option value="">Todos os Cursos do Subsistema</option>
                    {selectedSubMeta.coursesAvailable.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Horas Semanais
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formWeeklyHours}
                    onChange={(e) => setFormWeeklyHours(Number(e.target.value))}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Coeficiente</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="5"
                    value={formCoefficient}
                    onChange={(e) => setFormCoefficient(Number(e.target.value))}
                    className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-bold"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-end pb-1.5">
                  <label className="inline-flex items-center space-x-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsTerminalExam}
                      onChange={(e) => setFormIsTerminalExam(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>Exame Terminal</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Docente Responsável (Opcional)
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full min-h-[40px] bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                >
                  <option value="">-- Por atribuir --</option>
                  {instTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSubject(null);
                  }}
                  className="min-h-[42px] px-4 py-2 border border-[#cde6d5] rounded-xl text-[#4b6755] hover:bg-[#f7fbf8] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingSubject ? 'Guardar Alterações' : 'Confirmar Disciplina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
