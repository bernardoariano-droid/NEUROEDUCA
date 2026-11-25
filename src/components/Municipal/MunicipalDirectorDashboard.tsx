/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Painel do Director Municipal da Educação
 * Acompanhamento consolidado das escolas do município: aproveitamento escolar por escola,
 * estatística de alunos matriculados por género, classe, turma, escola e consolidado municipal.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Award,
  School,
  BarChart3,
  Search,
  Eye,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Layers,
  X,
  ClipboardList
} from 'lucide-react';
import {
  Institution,
  ClassRoom,
  Student,
  Teacher,
  GradeRecord,
  SchoolSubject,
  UserProfile
} from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS } from '../../data/angolaCurriculum';
import { resolveSubjectsForClass } from '../../utils/evaluationEngine';
import {
  buildConsolidatedPautaRows,
  ConsolidatedPautaView,
  ConsolidatedPautaPeriod
} from '../Evaluation/ConsolidatedPautaView';
import { formatAngolaDate } from '../../utils/currency';

export type MunicipalSection =
  | 'municipal_dashboard'
  | 'municipal_schools'
  | 'municipal_enrollment'
  | 'municipal_performance';

interface MunicipalDirectorDashboardProps {
  currentUser: UserProfile;
  institutions: Institution[];
  classes: ClassRoom[];
  students: Student[];
  teachers: Teacher[];
  grades: GradeRecord[];
  subjects: SchoolSubject[];
  activeSection: MunicipalSection;
  onSelectSection: (tab: string) => void;
  initialSelectedSchoolId?: string;
  initialSearchTerm?: string;
  navigationKey?: number;
}

interface ClassPerformanceSummary {
  classRoom: ClassRoom;
  institution: Institution;
  matriculados: number;
  male: number;
  female: number;
  avaliados: number;
  aprovados: number;
  aprovadosM: number;
  aprovadosF: number;
  recurso: number;
  reprovados: number;
  emCurso: number;
  taxaAproveitamento: number;
  mediaMfd: number | null;
}

interface SchoolSummary {
  institution: Institution;
  classesCount: number;
  teachersCount: number;
  matriculados: number;
  male: number;
  female: number;
  totalCapacity: number;
  avaliados: number;
  aprovados: number;
  aprovadosM: number;
  aprovadosF: number;
  recurso: number;
  reprovados: number;
  emCurso: number;
  taxaAproveitamento: number;
  mediaMfd: number | null;
  classBreakdown: ClassPerformanceSummary[];
}

const normalizeText = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const MunicipalDirectorDashboard: React.FC<MunicipalDirectorDashboardProps> = ({
  currentUser,
  institutions,
  classes,
  students,
  teachers,
  grades,
  subjects,
  activeSection,
  onSelectSection,
  initialSelectedSchoolId,
  initialSearchTerm = '',
  navigationKey
}) => {
  const municipalityName = currentUser.municipality || 'Município';
  const provinceName = currentUser.province || '';

  const [searchQuery, setSearchQuery] = useState(initialSearchTerm);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>(
    initialSelectedSchoolId || 'todas'
  );
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('todas');
  const [enrollmentGroupTab, setEnrollmentGroupTab] = useState<
    'consolidado' | 'escola' | 'classe' | 'turma'
  >('escola');

  // Drill-down modal para inspecionar uma escola ou consultar pauta de turma
  const [inspectedSchoolId, setInspectedSchoolId] = useState<string | null>(
    initialSelectedSchoolId || null
  );
  const [pautaClassId, setPautaClassId] = useState<string | null>(null);
  const [pautaPeriod, setPautaPeriod] = useState<ConsolidatedPautaPeriod>('anual');

  useEffect(() => {
    if (navigationKey !== undefined && initialSelectedSchoolId) {
      setInspectedSchoolId(initialSelectedSchoolId);
      setSelectedSchoolFilter(initialSelectedSchoolId);
    }
  }, [initialSelectedSchoolId, navigationKey]);

  // Escolas pertencentes exclusivamente ao Município do Director Municipal
  const municipalityInstitutions = useMemo(() => {
    const targetMun = normalizeText(municipalityName);
    if (!targetMun) return institutions;
    return institutions.filter((inst) => normalizeText(inst.municipality) === targetMun);
  }, [institutions, municipalityName]);

  const municipalityInstIds = useMemo(
    () => new Set(municipalityInstitutions.map((i) => i.id)),
    [municipalityInstitutions]
  );

  const munClasses = useMemo(
    () => classes.filter((c) => municipalityInstIds.has(c.institutionId)),
    [classes, municipalityInstIds]
  );

  const munStudents = useMemo(
    () => students.filter((s) => municipalityInstIds.has(s.institutionId)),
    [students, municipalityInstIds]
  );

  const munTeachers = useMemo(
    () => teachers.filter((t) => municipalityInstIds.has(t.institutionId)),
    [teachers, municipalityInstIds]
  );

  // Cálculo rigoroso de matrículas e aproveitamento por escola e turma (usando o motor oficial MED)
  const schoolSummaries = useMemo<SchoolSummary[]>(() => {
    return municipalityInstitutions.map((inst) => {
      const instClasses = munClasses.filter((c) => c.institutionId === inst.id);
      const instStudents = munStudents.filter((s) => s.institutionId === inst.id);
      const instTeachers = munTeachers.filter((t) => t.institutionId === inst.id);
      const instSubjects = subjects.filter((s) => s.institutionId === inst.id);
      const instGrades = grades.filter((g) => g.institutionId === inst.id);

      const classBreakdown: ClassPerformanceSummary[] = instClasses.map((cls) => {
        const clsStudents = instStudents.filter((s) => s.classId === cls.id);
        const clsSubjects = resolveSubjectsForClass(
          cls.subsystemCode,
          cls.gradeLevel,
          cls.courseName,
          instSubjects,
          cls.subjects
        );
        const rows = buildConsolidatedPautaRows(cls, clsStudents, clsSubjects, instGrades);

        const male = clsStudents.filter((s) => s.gender === 'M').length;
        const female = clsStudents.filter((s) => s.gender === 'F').length;

        let avaliados = 0;
        let aprovados = 0;
        let aprovadosM = 0;
        let aprovadosF = 0;
        let recurso = 0;
        let reprovados = 0;
        let emCurso = 0;
        const mfdValues: number[] = [];

        rows.forEach((row) => {
          const hasEvaluated = row.resumo.evaluatedCount > 0;
          if (hasEvaluated) {
            avaliados += 1;
            if (row.resumo.estado === 'Aprovado') {
              aprovados += 1;
              if (row.student.gender === 'M') aprovadosM += 1;
              else aprovadosF += 1;
            } else if (row.resumo.estado === 'Recurso') {
              recurso += 1;
            } else if (row.resumo.estado === 'Reprovado') {
              reprovados += 1;
            } else {
              emCurso += 1;
            }
          } else {
            emCurso += 1;
          }

          row.subjectSummaries.forEach((sub) => {
            if (sub.mfd !== undefined && !isNaN(sub.mfd)) {
              mfdValues.push(sub.mfd);
            }
          });
        });

        const taxaAproveitamento =
          avaliados > 0 ? Math.round((aprovados / avaliados) * 100) : 0;
        const mediaMfd =
          mfdValues.length > 0
            ? Number(
                (mfdValues.reduce((acc, v) => acc + v, 0) / mfdValues.length).toFixed(1)
              )
            : null;

        return {
          classRoom: cls,
          institution: inst,
          matriculados: clsStudents.length,
          male,
          female,
          avaliados,
          aprovados,
          aprovadosM,
          aprovadosF,
          recurso,
          reprovados,
          emCurso,
          taxaAproveitamento,
          mediaMfd
        };
      });

      // Alunos que possam estar vinculados à instituição mas sem turma correspondente na lista
      const studentsWithClass = new Set(instClasses.map((c) => c.id));
      const orphanStudents = instStudents.filter((s) => !studentsWithClass.has(s.classId));

      const male = instStudents.filter((s) => s.gender === 'M').length;
      const female = instStudents.filter((s) => s.gender === 'F').length;
      const totalCapacity = instClasses.reduce((sum, c) => sum + c.maxCapacity, 0);

      const avaliados = classBreakdown.reduce((sum, c) => sum + c.avaliados, 0);
      const aprovados = classBreakdown.reduce((sum, c) => sum + c.aprovados, 0);
      const aprovadosM = classBreakdown.reduce((sum, c) => sum + c.aprovadosM, 0);
      const aprovadosF = classBreakdown.reduce((sum, c) => sum + c.aprovadosF, 0);
      const recurso = classBreakdown.reduce((sum, c) => sum + c.recurso, 0);
      const reprovados = classBreakdown.reduce((sum, c) => sum + c.reprovados, 0);
      const emCurso =
        classBreakdown.reduce((sum, c) => sum + c.emCurso, 0) + orphanStudents.length;

      const taxaAproveitamento =
        avaliados > 0 ? Math.round((aprovados / avaliados) * 100) : 0;

      const validMedias = classBreakdown
        .map((c) => c.mediaMfd)
        .filter((v): v is number => v !== null);
      const mediaMfd =
        validMedias.length > 0
          ? Number(
              (validMedias.reduce((acc, v) => acc + v, 0) / validMedias.length).toFixed(1)
            )
          : null;

      return {
        institution: inst,
        classesCount: instClasses.length,
        teachersCount: instTeachers.length,
        matriculados: instStudents.length,
        male,
        female,
        totalCapacity,
        avaliados,
        aprovados,
        aprovadosM,
        aprovadosF,
        recurso,
        reprovados,
        emCurso,
        taxaAproveitamento,
        mediaMfd,
        classBreakdown
      };
    });
  }, [municipalityInstitutions, munClasses, munStudents, munTeachers, subjects, grades]);

  // Consolidado Geral do Município
  const municipalTotals = useMemo(() => {
    const schoolsCount = schoolSummaries.length;
    const activeSchoolsCount = schoolSummaries.filter(
      (s) => s.institution.status === 'active'
    ).length;
    const classesCount = schoolSummaries.reduce((sum, s) => sum + s.classesCount, 0);
    const teachersCount = schoolSummaries.reduce((sum, s) => sum + s.teachersCount, 0);
    const matriculados = schoolSummaries.reduce((sum, s) => sum + s.matriculados, 0);
    const male = schoolSummaries.reduce((sum, s) => sum + s.male, 0);
    const female = schoolSummaries.reduce((sum, s) => sum + s.female, 0);
    const totalCapacity = schoolSummaries.reduce((sum, s) => sum + s.totalCapacity, 0);

    const avaliados = schoolSummaries.reduce((sum, s) => sum + s.avaliados, 0);
    const aprovados = schoolSummaries.reduce((sum, s) => sum + s.aprovados, 0);
    const aprovadosM = schoolSummaries.reduce((sum, s) => sum + s.aprovadosM, 0);
    const aprovadosF = schoolSummaries.reduce((sum, s) => sum + s.aprovadosF, 0);
    const recurso = schoolSummaries.reduce((sum, s) => sum + s.recurso, 0);
    const reprovados = schoolSummaries.reduce((sum, s) => sum + s.reprovados, 0);
    const emCurso = schoolSummaries.reduce((sum, s) => sum + s.emCurso, 0);

    const taxaAproveitamento =
      avaliados > 0 ? Math.round((aprovados / avaliados) * 100) : 0;

    return {
      schoolsCount,
      activeSchoolsCount,
      classesCount,
      teachersCount,
      matriculados,
      male,
      female,
      malePct: matriculados > 0 ? Math.round((male / matriculados) * 100) : 0,
      femalePct: matriculados > 0 ? Math.round((female / matriculados) * 100) : 0,
      totalCapacity,
      occupancyPct:
        totalCapacity > 0 ? Math.min(100, Math.round((matriculados / totalCapacity) * 100)) : 0,
      avaliados,
      aprovados,
      aprovadosM,
      aprovadosF,
      recurso,
      reprovados,
      emCurso,
      taxaAproveitamento
    };
  }, [schoolSummaries]);

  // Lista única de Classes disponíveis para filtros
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    munClasses.forEach((c) => set.add(c.gradeLevel));
    munStudents.forEach((s) => set.add(s.gradeLevel));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [munClasses, munStudents]);

  // Todas as turmas do município filtradas
  const filteredClassPerformances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schoolSummaries
      .flatMap((s) => s.classBreakdown)
      .filter((item) => {
        if (selectedSchoolFilter !== 'todas' && item.institution.id !== selectedSchoolFilter) {
          return false;
        }
        if (
          selectedGradeFilter !== 'todas' &&
          item.classRoom.gradeLevel !== selectedGradeFilter
        ) {
          return false;
        }
        if (!q) return true;
        return (
          item.institution.name.toLowerCase().includes(q) ||
          item.classRoom.name.toLowerCase().includes(q) ||
          item.classRoom.code.toLowerCase().includes(q) ||
          item.classRoom.gradeLevel.toLowerCase().includes(q)
        );
      });
  }, [schoolSummaries, selectedSchoolFilter, selectedGradeFilter, searchQuery]);

  // Estatística agrupada por Classe (no Município ou Escola seleccionada)
  const gradeEnrollmentStats = useMemo(() => {
    const map = new Map<
      string,
      {
        gradeLevel: string;
        schoolsCount: Set<string>;
        classesCount: number;
        male: number;
        female: number;
        total: number;
        capacity: number;
        avaliados: number;
        aprovados: number;
        recurso: number;
        reprovados: number;
      }
    >();

    filteredClassPerformances.forEach((item) => {
      const key = item.classRoom.gradeLevel;
      const existing = map.get(key) || {
        gradeLevel: key,
        schoolsCount: new Set<string>(),
        classesCount: 0,
        male: 0,
        female: 0,
        total: 0,
        capacity: 0,
        avaliados: 0,
        aprovados: 0,
        recurso: 0,
        reprovados: 0
      };
      existing.schoolsCount.add(item.institution.id);
      existing.classesCount += 1;
      existing.male += item.male;
      existing.female += item.female;
      existing.total += item.matriculados;
      existing.capacity += item.classRoom.maxCapacity;
      existing.avaliados += item.avaliados;
      existing.aprovados += item.aprovados;
      existing.recurso += item.recurso;
      existing.reprovados += item.reprovados;
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.gradeLevel.localeCompare(b.gradeLevel, 'pt')
    );
  }, [filteredClassPerformances]);

  // Filtragem de escolas
  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schoolSummaries.filter((s) => {
      if (selectedSchoolFilter !== 'todas' && s.institution.id !== selectedSchoolFilter) {
        return false;
      }
      if (!q) return true;
      return (
        s.institution.name.toLowerCase().includes(q) ||
        s.institution.acronym.toLowerCase().includes(q) ||
        s.institution.code.toLowerCase().includes(q) ||
        s.institution.directorName.toLowerCase().includes(q) ||
        (s.institution.commune || '').toLowerCase().includes(q)
      );
    });
  }, [schoolSummaries, selectedSchoolFilter, searchQuery]);

  // Modal de Pauta Geral de uma turma seleccionada
  const activePautaData = useMemo(() => {
    if (!pautaClassId) return null;
    const cls = munClasses.find((c) => c.id === pautaClassId);
    if (!cls) return null;
    const inst = municipalityInstitutions.find((i) => i.id === cls.institutionId);
    if (!inst) return null;
    const clsStudents = munStudents.filter((s) => s.classId === cls.id);
    const instSubjects = subjects.filter((s) => s.institutionId === inst.id);
    const clsSubjects = resolveSubjectsForClass(
      cls.subsystemCode,
      cls.gradeLevel,
      cls.courseName,
      instSubjects,
      cls.subjects
    );
    const instGrades = grades.filter((g) => g.institutionId === inst.id);
    return { cls, inst, clsStudents, clsSubjects, instGrades };
  }, [pautaClassId, munClasses, municipalityInstitutions, munStudents, subjects, grades]);

  const inspectedSchool = useMemo(
    () => schoolSummaries.find((s) => s.institution.id === inspectedSchoolId) || null,
    [schoolSummaries, inspectedSchoolId]
  );

  // Exportação CSV do Consolidado Municipal
  const handleExportMunicipalCsv = () => {
    const headers = [
      'Escola',
      'Código',
      'Comuna / Bairro',
      'Tipo',
      'Turmas',
      'Professores',
      'Matriculados (M)',
      'Matriculados (F)',
      'Total Matriculados',
      'Avaliados',
      'Aprovados',
      'Recurso',
      'Reprovados',
      'Aproveitamento (%)'
    ];
    const rows = schoolSummaries.map((s) =>
      [
        `"${s.institution.name}"`,
        `"${s.institution.code}"`,
        `"${s.institution.commune || s.institution.neighborhood || s.institution.municipality}"`,
        `"${s.institution.institutionType}"`,
        s.classesCount,
        s.teachersCount,
        s.male,
        s.female,
        s.matriculados,
        s.avaliados,
        s.aprovados,
        s.recurso,
        s.reprovados,
        `${s.taxaAproveitamento}%`
      ].join(';')
    );

    const totalsRow = [
      `"CONSOLIDADO DO MUNICÍPIO (${municipalityName.toUpperCase()})"`,
      `"${municipalTotals.schoolsCount} escolas"`,
      `"${provinceName || 'Angola'}"`,
      `""`,
      municipalTotals.classesCount,
      municipalTotals.teachersCount,
      municipalTotals.male,
      municipalTotals.female,
      municipalTotals.matriculados,
      municipalTotals.avaliados,
      municipalTotals.aprovados,
      municipalTotals.recurso,
      municipalTotals.reprovados,
      `${municipalTotals.taxaAproveitamento}%`
    ].join(';');

    const csv = [
      `"REPÚBLICA DE ANGOLA - DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${municipalityName.toUpperCase()}"`,
      `"RELATÓRIO CONSOLIDADO DE MATRÍCULAS E APROVEITAMENTO ESCOLAR (${formatAngolaDate(new Date())})"`,
      headers.join(';'),
      ...rows,
      totalsRow
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Consolidado_Municipal_${municipalityName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Barra de filtros partilhada nas secções analíticas
  const renderFiltersBar = () => (
    <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 flex flex-col lg:flex-row gap-3 justify-between print:hidden">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Pesquisar escola, director, turma ou classe no município..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={selectedSchoolFilter}
          onChange={(e) => setSelectedSchoolFilter(e.target.value)}
          className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
        >
          <option value="todas">Todas as Escolas do Município ({municipalityInstitutions.length})</option>
          {municipalityInstitutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.acronym} — {inst.name}
            </option>
          ))}
        </select>

        {activeSection !== 'municipal_schools' && (
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            <option value="todas">Todas as Classes ({availableGrades.length})</option>
            {availableGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={handleExportMunicipalCsv}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] text-xs font-bold transition cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#067836]" />
          <span>Exportar CSV</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir</span>
        </button>
      </div>
    </div>
  );

  // Estado vazio se não houver escolas atribuídas ao município
  if (municipalityInstitutions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#046d31] via-[#0b843d] to-[#17a24c] rounded-2xl p-6 text-white shadow-sm">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Direcção Municipal da Educação de {municipalityName}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-50/90 mt-1">
            {provinceName ? `Província de ${provinceName} · ` : ''}Supervisão Municipal de Escolas, Matrículas e Aproveitamento Escolar
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-10 text-center space-y-2 shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
          <Building2 className="w-10 h-10 text-[#067836] mx-auto opacity-80" />
          <h2 className="text-base font-bold text-[#064e26]">
            Nenhuma escola registada no Município de {municipalityName}
          </h2>
          <p className="text-xs text-[#4b6755] max-w-md mx-auto">
            Quando o Super Administrador cadastrar ou associar instituições ao município de{' '}
            <strong>{municipalityName}</strong>, os indicadores consolidados surgirão aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Institucional Municipal */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#046d31] via-[#0b843d] to-[#17a24c] text-white px-5 sm:px-7 py-5 shadow-[0_10px_28px_rgba(3,94,41,0.16)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/90 block">
              Direcção Municipal da Educação {provinceName ? `· ${provinceName}` : ''}
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
              Município de {municipalityName}
            </h1>
            <p className="text-xs text-emerald-50/90 mt-0.5">
              Acompanhamento de {municipalTotals.schoolsCount} escola(s),{' '}
              <span className="tabular-nums font-bold">{municipalTotals.matriculados}</span> alunos
              matriculados e aproveitamento escolar consolidado
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          {[
            { id: 'municipal_dashboard', label: 'Consolidado', icon: BarChart3 },
            { id: 'municipal_schools', label: 'Escolas', icon: School },
            { id: 'municipal_enrollment', label: 'Matriculados M/F', icon: Users },
            { id: 'municipal_performance', label: 'Aproveitamento', icon: Award }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#064e26] shadow-sm'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 KPIs Consolidados do Município */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Escolas no Município</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">
              {municipalTotals.schoolsCount}
            </div>
            <p className="text-[11px] text-[#055827] font-semibold mt-1 tabular-nums">
              {municipalTotals.activeSchoolsCount} activa(s) · {municipalTotals.classesCount} turma(s)
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <School className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Alunos Matriculados</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">
              {municipalTotals.matriculados.toLocaleString('pt-AO')}
            </div>
            <p className="text-[11px] text-[#055827] font-semibold mt-1 tabular-nums">
              M: {municipalTotals.male} ({municipalTotals.malePct}%) · F: {municipalTotals.female} ({municipalTotals.femalePct}%)
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Aproveitamento Escolar</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">
              {municipalTotals.taxaAproveitamento}%
            </div>
            <p className="text-[11px] text-[#055827] font-semibold mt-1 tabular-nums">
              {municipalTotals.aprovados}/{municipalTotals.avaliados} aprovado(s) · {municipalTotals.recurso} recurso
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-5 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Docentes &amp; Ocupação</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">
              {municipalTotals.teachersCount}
            </div>
            <p className="text-[11px] text-[#4b6755] font-semibold mt-1 tabular-nums">
              Lotação Turmas: {municipalTotals.occupancyPct}% ({municipalTotals.matriculados}/{municipalTotals.totalCapacity})
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>
      </section>

      {renderFiltersBar()}

      {/* =====================================================================
          SECÇÃO 1: VISÃO CONSOLIDADA DO MUNICÍPIO
         ===================================================================== */}
      {activeSection === 'municipal_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Cartão: Distribuição por Género (M/F) Consolidada */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Consolidado por Género (M / F)
                </span>
                <span className="text-[11px] text-white/85 tabular-nums">
                  {municipalTotals.matriculados} alunos
                </span>
              </div>

              <div className="p-5 flex flex-col sm:flex-row items-center gap-5">
                {/* Donut SVG limpo */}
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#eaf2ec"
                      strokeWidth="16"
                    />
                    {municipalTotals.matriculados > 0 && (
                      <>
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="#1d8cf8"
                          strokeWidth="16"
                          strokeDasharray={`${
                            (municipalTotals.male / municipalTotals.matriculados) * 289.03
                          } 289.03`}
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="#16a34a"
                          strokeWidth="16"
                          strokeDasharray={`${
                            (municipalTotals.female / municipalTotals.matriculados) * 289.03
                          } 289.03`}
                          strokeDashoffset={
                            -(municipalTotals.male / municipalTotals.matriculados) * 289.03
                          }
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-[#064e26] tabular-nums">
                      {municipalTotals.matriculados}
                    </span>
                    <span className="text-[10px] font-semibold text-[#4b6755]">Matriculados</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#f7fbf8] border border-[#dce7df] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#1d8cf8] shrink-0" />
                      <span className="font-bold text-[#064e26]">Masculino (M)</span>
                    </div>
                    <span className="font-extrabold text-[#064e26] tabular-nums">
                      {municipalTotals.male} ({municipalTotals.malePct}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f7fbf8] border border-[#dce7df] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#16a34a] shrink-0" />
                      <span className="font-bold text-[#064e26]">Feminino (F)</span>
                    </div>
                    <span className="font-extrabold text-[#064e26] tabular-nums">
                      {municipalTotals.female} ({municipalTotals.femalePct}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#eaf6ee] border border-[#cde6d5] flex items-center justify-between">
                    <span className="font-semibold text-[#055827]">Aprovados (M / F)</span>
                    <span className="font-bold text-[#055827] tabular-nums">
                      M: {municipalTotals.aprovadosM} · F: {municipalTotals.aprovadosF}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cartão: Aproveitamento Escolar por Escola (Barras Comparativas) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Aproveitamento Escolar por Escola
                </span>
                <button
                  type="button"
                  onClick={() => onSelectSection('municipal_performance')}
                  className="text-[11px] font-bold text-white hover:underline cursor-pointer"
                >
                  Ver Detalhe Completo →
                </button>
              </div>

              <div className="p-5 space-y-3.5">
                {filteredSchools.map((s) => (
                  <div
                    key={s.institution.id}
                    className="p-3 rounded-xl bg-[#f7fbf8] border border-[#dce7df] space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-[#064e26] truncate">
                          {s.institution.name}
                        </span>
                        <span className="text-[11px] font-mono text-[#4b6755]">
                          ({s.institution.acronym})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] tabular-nums">
                        <span className="text-[#4b6755]">
                          Matr.: <strong className="text-[#064e26]">{s.matriculados}</strong> (M:{' '}
                          {s.male} · F: {s.female})
                        </span>
                        <span className="font-extrabold text-[#067836]">
                          {s.taxaAproveitamento}% aprov.
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-[#eaf2ec] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          s.taxaAproveitamento >= 70
                            ? 'bg-[#16a34a]'
                            : s.taxaAproveitamento >= 50
                            ? 'bg-[#f5a623]'
                            : 'bg-[#ef4444]'
                        }`}
                        style={{ width: `${s.avaliados > 0 ? s.taxaAproveitamento : 0}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4b6755] tabular-nums">
                      <span>
                        Avaliados: <strong>{s.avaliados}</strong> · Aprovados:{' '}
                        <strong className="text-[#055827]">{s.aprovados}</strong> · Recurso:{' '}
                        <strong className="text-amber-700">{s.recurso}</strong> · Reprovados:{' '}
                        <strong className="text-red-600">{s.reprovados}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setInspectedSchoolId(s.institution.id)}
                        className="text-[#067836] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspecionar Escola</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela Resumo por Classe no Município */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Consolidado de Matriculados por Classe, Género e Aproveitamento ({municipalityName})
              </span>
              <span className="text-[11px] text-white/85 tabular-nums">
                {gradeEnrollmentStats.length} classe(s)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[740px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Classe / Nível</th>
                    <th className="py-3 px-4 text-center">Escolas</th>
                    <th className="py-3 px-4 text-center">Turmas</th>
                    <th className="py-3 px-4 text-center">Masculino (M)</th>
                    <th className="py-3 px-4 text-center">Feminino (F)</th>
                    <th className="py-3 px-4 text-center">Total Matriculados</th>
                    <th className="py-3 px-4 text-center">Avaliados</th>
                    <th className="py-3 px-4 text-center">Aprovados</th>
                    <th className="py-3 px-4 text-right">Aproveitamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                  {gradeEnrollmentStats.map((g) => {
                    const rate = g.avaliados > 0 ? Math.round((g.aprovados / g.avaliados) * 100) : 0;
                    return (
                      <tr key={g.gradeLevel} className="hover:bg-[#f7fbf8]">
                        <td className="py-3 px-4 font-bold">{g.gradeLevel}</td>
                        <td className="py-3 px-4 text-center">{g.schoolsCount.size}</td>
                        <td className="py-3 px-4 text-center">{g.classesCount}</td>
                        <td className="py-3 px-4 text-center">{g.male}</td>
                        <td className="py-3 px-4 text-center">{g.female}</td>
                        <td className="py-3 px-4 text-center font-extrabold">{g.total}</td>
                        <td className="py-3 px-4 text-center">{g.avaliados}</td>
                        <td className="py-3 px-4 text-center font-bold text-[#055827]">
                          {g.aprovados}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-[#067836]">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#eaf6ee] font-extrabold text-[#055827] border-t-2 border-[#cde6d5]">
                    <td className="py-3 px-4">CONSOLIDADO DO MUNICÍPIO</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.schoolsCount}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.classesCount}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.male}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.female}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.matriculados}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.avaliados}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.aprovados}</td>
                    <td className="py-3 px-4 text-right">{municipalTotals.taxaAproveitamento}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECÇÃO 2: TODAS AS ESCOLAS DO MUNICÍPIO
         ===================================================================== */}
      {activeSection === 'municipal_schools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSchools.map((s) => {
            const inst = s.institution;
            const subsystemLabels = inst.subsystems
              .map(
                (code) =>
                  ANGOLA_EDUCATION_SUBSYSTEMS.find((sub) => sub.code === code)?.shortName || code
              )
              .join(' · ');

            return (
              <div
                key={inst.id}
                className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-[#067836] bg-[#eaf6ee] border border-[#cde6d5] px-2 py-0.5 rounded-lg">
                          {inst.code}
                        </span>
                        <span className="text-[11px] font-semibold text-[#4b6755] uppercase">
                          {inst.institutionType}
                        </span>
                      </div>
                      <h2 className="font-display text-base font-extrabold text-[#064e26] mt-1.5">
                        {inst.name}
                      </h2>
                      <p className="text-xs text-[#4b6755] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#067836] shrink-0" />
                        <span>
                          {inst.commune || inst.neighborhood || inst.municipality}, {inst.province}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border shrink-0 ${
                        inst.status === 'active'
                          ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {inst.status === 'active' ? 'Activa' : 'Suspensa'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center bg-[#f7fbf8] border border-[#dce7df] rounded-xl p-3 tabular-nums">
                    <div>
                      <span className="text-[10px] font-semibold text-[#4b6755] block">Turmas</span>
                      <strong className="text-sm font-extrabold text-[#064e26]">
                        {s.classesCount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#4b6755] block">
                        Matriculados
                      </span>
                      <strong className="text-sm font-extrabold text-[#064e26]">
                        {s.matriculados}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#4b6755] block">M / F</span>
                      <strong className="text-sm font-extrabold text-[#064e26]">
                        {s.male} / {s.female}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#4b6755] block">Aprov.</span>
                      <strong className="text-sm font-extrabold text-[#067836]">
                        {s.taxaAproveitamento}%
                      </strong>
                    </div>
                  </div>

                  <div className="text-xs text-[#4b6755] space-y-1">
                    <div>
                      <strong className="text-[#064e26]">Director Geral:</strong> {inst.directorName}
                    </div>
                    <div>
                      <strong className="text-[#064e26]">Subsistemas:</strong> {subsystemLabels}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#067836]" />
                        {inst.phone}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#067836]" />
                        {inst.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-[#f7fbf8] border-t border-[#dce7df] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#4b6755] tabular-nums">
                    {s.teachersCount} docente(s) · Lotação {s.totalCapacity > 0 ? Math.round((s.matriculados / s.totalCapacity) * 100) : 0}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectedSchoolId(inst.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspecionar Escola</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          SECÇÃO 3: ESTATÍSTICA DE MATRICULADOS (GÉNERO, CLASSE, TURMA, ESCOLA E CONSOLIDADO)
         ===================================================================== */}
      {activeSection === 'municipal_enrollment' && (
        <div className="space-y-5">
          {/* Sub-abas de agrupamento */}
          <div className="bg-white rounded-2xl border border-[#dce7df] p-2 flex flex-wrap gap-1.5 print:hidden">
            {[
              { id: 'consolidado', label: 'Consolidado do Município' },
              { id: 'escola', label: 'Por Escola' },
              { id: 'classe', label: 'Por Classe' },
              { id: 'turma', label: 'Por Turma' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEnrollmentGroupTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  enrollmentGroupTab === t.id
                    ? 'bg-[#067836] text-white shadow-xs'
                    : 'text-[#064e26] hover:bg-[#eaf6ee]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Consolidado do Município */}
          {enrollmentGroupTab === 'consolidado' && (
            <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#dce7df]">
                <div>
                  <h2 className="text-base font-extrabold text-[#064e26]">
                    Estatística Consolidada de Alunos Matriculados — {municipalityName}
                  </h2>
                  <p className="text-xs text-[#4b6755]">
                    Total agregado de todas as escolas, classes e turmas do município por género (M / F)
                  </p>
                </div>
                <span className="text-xs font-bold text-[#055827] bg-[#eaf6ee] border border-[#cde6d5] px-3 py-1 rounded-xl tabular-nums">
                  {municipalTotals.matriculados} Matriculado(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
                <div className="p-4 rounded-xl bg-[#f7fbf8] border border-[#dce7df]">
                  <span className="text-xs font-semibold text-[#4b6755]">Género Masculino (M)</span>
                  <div className="text-2xl font-extrabold text-[#1d8cf8] mt-1">
                    {municipalTotals.male}{' '}
                    <span className="text-xs font-bold text-[#4b6755]">({municipalTotals.malePct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#eaf2ec] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#1d8cf8]" style={{ width: `${municipalTotals.malePct}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#f7fbf8] border border-[#dce7df]">
                  <span className="text-xs font-semibold text-[#4b6755]">Género Feminino (F)</span>
                  <div className="text-2xl font-extrabold text-[#16a34a] mt-1">
                    {municipalTotals.female}{' '}
                    <span className="text-xs font-bold text-[#4b6755]">({municipalTotals.femalePct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#eaf2ec] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#16a34a]" style={{ width: `${municipalTotals.femalePct}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#eaf6ee] border border-[#cde6d5]">
                  <span className="text-xs font-semibold text-[#055827]">Capacidade &amp; Lotação Global</span>
                  <div className="text-2xl font-extrabold text-[#064e26] mt-1">
                    {municipalTotals.occupancyPct}%{' '}
                    <span className="text-xs font-bold text-[#055827]">
                      ({municipalTotals.matriculados}/{municipalTotals.totalCapacity} vagas)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#067836]" style={{ width: `${municipalTotals.occupancyPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Por Escola */}
          {(enrollmentGroupTab === 'escola' || enrollmentGroupTab === 'consolidado') && (
            <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Matriculados por Escola e Género ({filteredSchools.length})
                </span>
                <span className="text-[11px] text-white/85">Município de {municipalityName}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                      <th className="py-3 px-4">Escola</th>
                      <th className="py-3 px-4 text-center">Turmas</th>
                      <th className="py-3 px-4 text-center">Masculino (M)</th>
                      <th className="py-3 px-4 text-center">Feminino (F)</th>
                      <th className="py-3 px-4 text-center">Total Matriculados</th>
                      <th className="py-3 px-4 text-center">% Feminino</th>
                      <th className="py-3 px-4 text-center">Capacidade</th>
                      <th className="py-3 px-4 text-right">Ocupação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                    {filteredSchools.map((s) => {
                      const fPct = s.matriculados > 0 ? Math.round((s.female / s.matriculados) * 100) : 0;
                      const occ =
                        s.totalCapacity > 0
                          ? Math.min(100, Math.round((s.matriculados / s.totalCapacity) * 100))
                          : 0;
                      return (
                        <tr key={s.institution.id} className="hover:bg-[#f7fbf8]">
                          <td className="py-3 px-4">
                            <div className="font-bold">{s.institution.name}</div>
                            <div className="text-[11px] text-[#4b6755]">
                              {s.institution.commune || s.institution.municipality} · {s.institution.institutionType}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">{s.classesCount}</td>
                          <td className="py-3 px-4 text-center font-semibold text-[#1d8cf8]">{s.male}</td>
                          <td className="py-3 px-4 text-center font-semibold text-[#16a34a]">{s.female}</td>
                          <td className="py-3 px-4 text-center font-extrabold">{s.matriculados}</td>
                          <td className="py-3 px-4 text-center">{fPct}%</td>
                          <td className="py-3 px-4 text-center">{s.totalCapacity}</td>
                          <td className="py-3 px-4 text-right font-bold">{occ}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[#eaf6ee] font-extrabold text-[#055827] border-t-2 border-[#cde6d5]">
                      <td className="py-3 px-4">CONSOLIDADO DO MUNICÍPIO</td>
                      <td className="py-3 px-4 text-center">{municipalTotals.classesCount}</td>
                      <td className="py-3 px-4 text-center">{municipalTotals.male}</td>
                      <td className="py-3 px-4 text-center">{municipalTotals.female}</td>
                      <td className="py-3 px-4 text-center">{municipalTotals.matriculados}</td>
                      <td className="py-3 px-4 text-center">{municipalTotals.femalePct}%</td>
                      <td className="py-3 px-4 text-center">{municipalTotals.totalCapacity}</td>
                      <td className="py-3 px-4 text-right">{municipalTotals.occupancyPct}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Por Classe */}
          {enrollmentGroupTab === 'classe' && (
            <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Matriculados por Classe e Género ({gradeEnrollmentStats.length})
                </span>
                <span className="text-[11px] text-white/85">Consolidado Filtrado</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                  <thead>
                    <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                      <th className="py-3 px-4">Classe</th>
                      <th className="py-3 px-4 text-center">Escolas</th>
                      <th className="py-3 px-4 text-center">Turmas</th>
                      <th className="py-3 px-4 text-center">Masculino (M)</th>
                      <th className="py-3 px-4 text-center">Feminino (F)</th>
                      <th className="py-3 px-4 text-center">Total</th>
                      <th className="py-3 px-4 text-right">Ocupação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                    {gradeEnrollmentStats.map((g) => {
                      const occ = g.capacity > 0 ? Math.min(100, Math.round((g.total / g.capacity) * 100)) : 0;
                      return (
                        <tr key={g.gradeLevel} className="hover:bg-[#f7fbf8]">
                          <td className="py-3 px-4 font-bold">{g.gradeLevel}</td>
                          <td className="py-3 px-4 text-center">{g.schoolsCount.size}</td>
                          <td className="py-3 px-4 text-center">{g.classesCount}</td>
                          <td className="py-3 px-4 text-center text-[#1d8cf8] font-semibold">{g.male}</td>
                          <td className="py-3 px-4 text-center text-[#16a34a] font-semibold">{g.female}</td>
                          <td className="py-3 px-4 text-center font-extrabold">{g.total}</td>
                          <td className="py-3 px-4 text-right font-bold">{occ}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Por Turma */}
          {enrollmentGroupTab === 'turma' && (
            <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Matriculados por Turma e Género ({filteredClassPerformances.length})
                </span>
                <span className="text-[11px] text-white/85">Detalhe Completo</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                      <th className="py-3 px-4">Escola</th>
                      <th className="py-3 px-4">Classe</th>
                      <th className="py-3 px-4">Turma</th>
                      <th className="py-3 px-4 text-center">Turno / Sala</th>
                      <th className="py-3 px-4 text-center">Masculino (M)</th>
                      <th className="py-3 px-4 text-center">Feminino (F)</th>
                      <th className="py-3 px-4 text-center">Total / Cap.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                    {filteredClassPerformances.map((c) => (
                      <tr key={c.classRoom.id} className="hover:bg-[#f7fbf8]">
                        <td className="py-3 px-4 font-semibold">{c.institution.acronym} — {c.institution.name}</td>
                        <td className="py-3 px-4">{c.classRoom.gradeLevel}</td>
                        <td className="py-3 px-4 font-bold">{c.classRoom.name} ({c.classRoom.code})</td>
                        <td className="py-3 px-4 text-center capitalize text-[#4b6755]">
                          {c.classRoom.shift} · {c.classRoom.room}
                        </td>
                        <td className="py-3 px-4 text-center text-[#1d8cf8] font-semibold">{c.male}</td>
                        <td className="py-3 px-4 text-center text-[#16a34a] font-semibold">{c.female}</td>
                        <td className="py-3 px-4 text-center font-extrabold">
                          {c.matriculados} / {c.classRoom.maxCapacity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SECÇÃO 4: APROVEITAMENTO ESCOLAR POR ESCOLA E TURMA
         ===================================================================== */}
      {activeSection === 'municipal_performance' && (
        <div className="space-y-6">
          {/* Tabela de Aproveitamento por Escola */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Aproveitamento Escolar por Escola ({filteredSchools.length})
              </span>
              <span className="text-[11px] text-white/85">Apuramento pelas Pautas Gerais</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Escola</th>
                    <th className="py-3 px-4 text-center">Matriculados</th>
                    <th className="py-3 px-4 text-center">Avaliados</th>
                    <th className="py-3 px-4 text-center">Aprovados (M/F)</th>
                    <th className="py-3 px-4 text-center">Recurso</th>
                    <th className="py-3 px-4 text-center">Reprovados</th>
                    <th className="py-3 px-4 text-center">Média MFD</th>
                    <th className="py-3 px-4 text-right">Taxa Aprov.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                  {filteredSchools.map((s) => (
                    <tr key={s.institution.id} className="hover:bg-[#f7fbf8]">
                      <td className="py-3 px-4">
                        <div className="font-bold">{s.institution.name}</div>
                        <div className="text-[11px] text-[#4b6755]">
                          {s.classesCount} turma(s) · Director: {s.institution.directorName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{s.matriculados}</td>
                      <td className="py-3 px-4 text-center">{s.avaliados}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#055827]">
                        {s.aprovados} ({s.aprovadosM}M · {s.aprovadosF}F)
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-700">{s.recurso}</td>
                      <td className="py-3 px-4 text-center font-bold text-red-600">{s.reprovados}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        {s.mediaMfd !== null ? s.mediaMfd.toFixed(1) : '--'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-extrabold text-[#067836]">{s.taxaAproveitamento}%</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#eaf6ee] font-extrabold text-[#055827] border-t-2 border-[#cde6d5]">
                    <td className="py-3 px-4">CONSOLIDADO DO MUNICÍPIO</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.matriculados}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.avaliados}</td>
                    <td className="py-3 px-4 text-center">
                      {municipalTotals.aprovados} ({municipalTotals.aprovadosM}M · {municipalTotals.aprovadosF}F)
                    </td>
                    <td className="py-3 px-4 text-center">{municipalTotals.recurso}</td>
                    <td className="py-3 px-4 text-center">{municipalTotals.reprovados}</td>
                    <td className="py-3 px-4 text-center">--</td>
                    <td className="py-3 px-4 text-right">{municipalTotals.taxaAproveitamento}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Aproveitamento Detalhado por Classe e Turma (com consulta de Pauta Geral) */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Aproveitamento por Turma &amp; Consulta de Pauta Geral ({filteredClassPerformances.length})
              </span>
              <span className="text-[11px] text-white/85">Supervisão Pedagógica</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Escola</th>
                    <th className="py-3 px-4">Classe / Turma</th>
                    <th className="py-3 px-4 text-center">Matric. (M/F)</th>
                    <th className="py-3 px-4 text-center">Avaliados</th>
                    <th className="py-3 px-4 text-center">Aprovados</th>
                    <th className="py-3 px-4 text-center">Recurso</th>
                    <th className="py-3 px-4 text-center">Reprovados</th>
                    <th className="py-3 px-4 text-center">Aproveit.</th>
                    <th className="py-3 px-4 text-right">Pauta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                  {filteredClassPerformances.map((item) => (
                    <tr key={item.classRoom.id} className="hover:bg-[#f7fbf8]">
                      <td className="py-3 px-4 font-semibold">{item.institution.acronym}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold">
                          {item.classRoom.gradeLevel} — {item.classRoom.name}
                        </div>
                        <div className="text-[11px] text-[#4b6755]">{item.institution.name}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.matriculados} ({item.male}/{item.female})
                      </td>
                      <td className="py-3 px-4 text-center">{item.avaliados}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#055827]">
                        {item.aprovados}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-700">
                        {item.recurso}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-red-600">
                        {item.reprovados}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-[#067836]">
                        {item.taxaAproveitamento}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setPautaClassId(item.classRoom.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] font-bold transition cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>Pauta Geral</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DRILL-DOWN: INSPECIONAR ESCOLA DO MUNICÍPIO
         ===================================================================== */}
      {inspectedSchool && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{inspectedSchool.institution.name}</h3>
                <p className="text-[11px] text-emerald-100">
                  Município de {inspectedSchool.institution.municipality} · Director:{' '}
                  {inspectedSchool.institution.directorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedSchoolId(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                <div className="p-3 rounded-xl bg-[#f7fbf8] border border-[#dce7df]">
                  <span className="text-[11px] text-[#4b6755] block">Matriculados</span>
                  <strong className="text-lg font-extrabold text-[#064e26]">
                    {inspectedSchool.matriculados}
                  </strong>
                  <span className="text-[11px] text-[#4b6755] block">
                    M: {inspectedSchool.male} · F: {inspectedSchool.female}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#f7fbf8] border border-[#dce7df]">
                  <span className="text-[11px] text-[#4b6755] block">Turmas Activas</span>
                  <strong className="text-lg font-extrabold text-[#064e26]">
                    {inspectedSchool.classesCount}
                  </strong>
                  <span className="text-[11px] text-[#4b6755] block">
                    Cap.: {inspectedSchool.totalCapacity} alunos
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#eaf6ee] border border-[#cde6d5]">
                  <span className="text-[11px] text-[#055827] block">Aproveitamento</span>
                  <strong className="text-lg font-extrabold text-[#067836]">
                    {inspectedSchool.taxaAproveitamento}%
                  </strong>
                  <span className="text-[11px] text-[#055827] block">
                    {inspectedSchool.aprovados} aprovado(s)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#f7fbf8] border border-[#dce7df]">
                  <span className="text-[11px] text-[#4b6755] block">Recurso / Reprov.</span>
                  <strong className="text-lg font-extrabold text-[#064e26]">
                    {inspectedSchool.recurso} / {inspectedSchool.reprovados}
                  </strong>
                  <span className="text-[11px] text-[#4b6755] block">
                    {inspectedSchool.teachersCount} docente(s)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#dce7df] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                      <th className="py-2.5 px-3">Classe / Turma</th>
                      <th className="py-2.5 px-3 text-center">M / F</th>
                      <th className="py-2.5 px-3 text-center">Total</th>
                      <th className="py-2.5 px-3 text-center">Aprovados</th>
                      <th className="py-2.5 px-3 text-center">Recurso</th>
                      <th className="py-2.5 px-3 text-center">Reprovados</th>
                      <th className="py-2.5 px-3 text-right">Consulta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf2ec] text-[#064e26] tabular-nums">
                    {inspectedSchool.classBreakdown.map((c) => (
                      <tr key={c.classRoom.id} className="hover:bg-[#f7fbf8]">
                        <td className="py-2.5 px-3 font-bold">
                          {c.classRoom.gradeLevel} — {c.classRoom.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {c.male} / {c.female}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{c.matriculados}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#055827]">
                          {c.aprovados}
                        </td>
                        <td className="py-2.5 px-3 text-center text-amber-700 font-bold">
                          {c.recurso}
                        </td>
                        <td className="py-2.5 px-3 text-center text-red-600 font-bold">
                          {c.reprovados}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectedSchoolId(null);
                              setPautaClassId(c.classRoom.id);
                            }}
                            className="inline-flex items-center gap-1 text-[#067836] font-bold hover:underline cursor-pointer"
                          >
                            <span>Abrir Pauta</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inspectedSchool.classBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-[#4b6755]">
                          Esta escola ainda não possui turmas registadas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CONSULTA READ-ONLY: PAUTA GERAL DA TURMA
         ===================================================================== */}
      {activePautaData && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-bold">
                  Consulta Municipal · Pauta Geral — {activePautaData.inst.name} (
                  {activePautaData.cls.name})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pautaPeriod}
                  onChange={(e) => setPautaPeriod(e.target.value as ConsolidatedPautaPeriod)}
                  className="bg-white/15 text-white text-xs rounded-lg px-2.5 py-1 border border-white/25 font-semibold focus:outline-none"
                >
                  <option value="anual" className="text-[#064e26]">
                    Anual Consolidado
                  </option>
                  <option value="1_trimestre" className="text-[#064e26]">
                    1.º Trimestre
                  </option>
                  <option value="2_trimestre" className="text-[#064e26]">
                    2.º Trimestre
                  </option>
                  <option value="3_trimestre" className="text-[#064e26]">
                    3.º Trimestre
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 rounded-lg bg-white text-[#064e26] text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPautaClassId(null)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto">
              <ConsolidatedPautaView
                currentInstitution={activePautaData.inst}
                selectedClass={activePautaData.cls}
                students={activePautaData.clsStudents}
                subjects={activePautaData.clsSubjects}
                grades={activePautaData.instGrades}
                selectedPeriod={pautaPeriod}
                showStatsFooter={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
