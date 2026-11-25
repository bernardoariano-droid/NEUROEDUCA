/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Painel de Relatórios Estatísticos, Pautas Oficiais (Consulta MED) e Indicadores de Angola
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  DollarSign,
  Award,
  School,
  FileSpreadsheet,
  ClipboardList
} from 'lucide-react';
import { Institution, Student, ClassRoom, Invoice, GradeRecord } from '../../types';
import { formatKwanza } from '../../utils/currency';
import {
  resolveSubjectsForClass,
  getGradingScaleConfig,
  isExamAndRecourseEligible,
  formatRoundedGrade
} from '../../utils/evaluationEngine';
import { DocumentExportBar } from '../common/DocumentExportBar';
import {
  OfficialDocumentHeader,
  loadDocumentHeaderConfig
} from '../common/OfficialDocumentHeader';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';
import {
  ConsolidatedPautaView,
  ConsolidatedPautaPeriod,
  buildConsolidatedPautaRows
} from '../Evaluation/ConsolidatedPautaView';

interface ReportsDashboardProps {
  currentInstitution: Institution | null;
  institutions: Institution[];
  students: Student[];
  classes: ClassRoom[];
  invoices: Invoice[];
  grades: GradeRecord[];
  onNavigateTab?: (tab: string) => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  currentInstitution,
  students,
  classes,
  invoices,
  grades,
  onNavigateTab
}) => {
  const isGlobal = !currentInstitution;

  const relevantStudents = useMemo(
    () => (isGlobal ? students : students.filter((s) => s.institutionId === currentInstitution.id)),
    [isGlobal, students, currentInstitution]
  );

  const relevantClasses = useMemo(
    () => (isGlobal ? classes : classes.filter((c) => c.institutionId === currentInstitution.id)),
    [isGlobal, classes, currentInstitution]
  );

  const relevantInvoices = useMemo(
    () => (isGlobal ? invoices : invoices.filter((i) => i.institutionId === currentInstitution.id)),
    [isGlobal, invoices, currentInstitution]
  );

  const totalMale = relevantStudents.filter((s) => s.gender === 'M').length;
  const totalFemale = relevantStudents.filter((s) => s.gender === 'F').length;

  const totalBilled = relevantInvoices.reduce((sum, inv) => sum + inv.totalAoa, 0);
  const totalCollected = relevantInvoices.reduce((sum, inv) => sum + inv.amountPaidAoa, 0);
  const totalDebt = relevantInvoices.reduce((sum, inv) => sum + inv.balanceAoa, 0);

  // Aproveitamento Escolar Médio
  const relevantGrades = useMemo(
    () =>
      isGlobal
        ? grades
        : grades.filter((g) => g.institutionId === currentInstitution?.id),
    [isGlobal, grades, currentInstitution]
  );
  const approvedGrades = relevantGrades.filter((g) => {
    if (g.mt === undefined) return false;
    const stu = relevantStudents.find((s) => s.id === g.studentId);
    const cls = relevantClasses.find((c) => c.id === g.classId || c.id === stu?.classId);
    const threshold = getGradingScaleConfig(cls?.subsystemCode || stu?.subsystemCode).passingThreshold;
    return g.mt >= threshold;
  }).length;
  const totalGrades = relevantGrades.filter((g) => g.mt !== undefined).length;
  const approvalRate = totalGrades > 0 ? Math.round((approvedGrades / totalGrades) * 100) : 88;

  // Consulta Read-Only de Pautas Oficiais MED (Administração Escolar)
  const [selectedClassId, setSelectedClassId] = useState<string>(relevantClasses[0]?.id || '');
  const [selectedPeriod, setSelectedPeriod] = useState<ConsolidatedPautaPeriod>('anual');
  const pautaReportRef = useRef<HTMLDivElement>(null);
  const summaryReportRef = useRef<HTMLDivElement>(null);

  const selectedClass = useMemo(
    () => relevantClasses.find((c) => c.id === selectedClassId) || relevantClasses[0],
    [relevantClasses, selectedClassId]
  );

  const classSubjects = useMemo(
    () =>
      resolveSubjectsForClass(
        selectedClass?.subsystemCode,
        selectedClass?.gradeLevel,
        selectedClass?.courseName,
        undefined,
        selectedClass?.subjects
      ),
    [selectedClass]
  );

  const classStudents = useMemo(
    () =>
      relevantStudents.filter((s) => s.classId === selectedClass?.id),
    [relevantStudents, selectedClass?.id]
  );

  const periodOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'anual',
        label: 'Pauta Geral Consolidada',
        description: 'MT1, MT2, MT3, MFD e EXAME (EN) / RECURSO (REC)',
        group: 'Consolidação (Mini-Pautas -> Pauta)',
        badge: 'Pauta',
        badgeTone: 'emerald'
      },
      {
        value: '1_trimestre',
        label: 'Foco: 1.º Trimestre (MT1)',
        description: 'MT1 destacado na Pauta · ou detalhe AC1–MT',
        group: 'Trimestres das Mini-Pautas',
        badge: 'MT1',
        badgeTone: 'emerald'
      },
      {
        value: '2_trimestre',
        label: 'Foco: 2.º Trimestre (MT2)',
        description: 'MT2 destacado na Pauta · ou detalhe AC1–MT',
        group: 'Trimestres das Mini-Pautas',
        badge: 'MT2',
        badgeTone: 'emerald'
      },
      {
        value: '3_trimestre',
        label: 'Foco: 3.º Trimestre (MT3)',
        description: 'MT3 destacado na Pauta · ou detalhe AC1–MT',
        group: 'Trimestres das Mini-Pautas',
        badge: 'MT3',
        badgeTone: 'emerald'
      }
    ],
    []
  );

  const consolidatedRows = useMemo(() => {
    if (!selectedClass) return [];
    return buildConsolidatedPautaRows(selectedClass, classStudents, classSubjects, relevantGrades);
  }, [selectedClass, classStudents, classSubjects, relevantGrades]);

  const handleExportPautaCsv = () => {
    if (!selectedClass || !currentInstitution) return;
    const hasExam = isExamAndRecourseEligible(selectedClass.subsystemCode, selectedClass.gradeLevel);
    const headers = [
      'Nº',
      'Nome Completo do Aluno',
      ...classSubjects.flatMap((s) =>
        hasExam
          ? [
              `${s.shortName} MT1`,
              `${s.shortName} MT2`,
              `${s.shortName} MT3`,
              `${s.shortName} EXAME (EN)`,
              `${s.shortName} RECURSO (REC)`,
              `${s.shortName} MFD`
            ]
          : [
              `${s.shortName} MT1`,
              `${s.shortName} MT2`,
              `${s.shortName} MT3`,
              `${s.shortName} MFD`
            ]
      ),
      'Resultado'
    ];
    const rows = consolidatedRows.map((row, idx) =>
      [
        idx + 1,
        `"${row.student.fullName}"`,
        ...row.subjectSummaries.flatMap((s) =>
          hasExam
            ? [
                s.mt1 !== undefined ? formatRoundedGrade(s.mt1) : '',
                s.mt2 !== undefined ? formatRoundedGrade(s.mt2) : '',
                s.mt3 !== undefined ? formatRoundedGrade(s.mt3) : '',
                s.en !== undefined ? s.en.toFixed(1) : '',
                s.rec !== undefined ? s.rec.toFixed(1) : '',
                s.mfd !== undefined ? formatRoundedGrade(s.mfd) : ''
              ]
            : [
                s.mt1 !== undefined ? formatRoundedGrade(s.mt1) : '',
                s.mt2 !== undefined ? formatRoundedGrade(s.mt2) : '',
                s.mt3 !== undefined ? formatRoundedGrade(s.mt3) : '',
                s.mfd !== undefined ? formatRoundedGrade(s.mfd) : ''
              ]
        ),
        `"${row.resumo.estado}"`
      ].join(';')
    );

    const docHeader = loadDocumentHeaderConfig(currentInstitution);
    const csvContent = [
      `"${docHeader.line1.toUpperCase()} - ${docHeader.line2.toUpperCase()}"`,
      `"${docHeader.line3.toUpperCase()} - ${docHeader.line4.toUpperCase()}"`,
      `"PAUTA GERAL CONSOLIDADA DE APROVEITAMENTO - ${docHeader.line5}"`,
      `"TURMA: ${selectedClass.name} | NÍVEL: ${selectedClass.gradeLevel} | ANO LECTIVO: ${selectedClass.academicYear}"`,
      headers.join(';'),
      ...rows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PautaGeralConsolidada_${selectedClass.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasConsolidatedPauta = !isGlobal && Boolean(currentInstitution) && Boolean(selectedClass);

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df] print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Estatísticas, Pautas e Relatórios Escolares
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            {isGlobal
              ? 'Painel Geral de Todas as Instituições · Angola'
              : `NEUROEDUCA · ${currentInstitution.name} · ${currentInstitution.municipality}, ${currentInstitution.province}`}
          </p>
        </div>

        <DocumentExportBar
          targetRef={hasConsolidatedPauta ? pautaReportRef : summaryReportRef}
          filename={
            hasConsolidatedPauta && selectedClass
              ? `PautaGeral_${selectedClass.code}`
              : 'Relatorio_Estatistico_NEUROEDUCA'
          }
          documentTitle={
            hasConsolidatedPauta && selectedClass
              ? `Pauta Geral - ${selectedClass.name}`
              : 'Relatório Estatístico Escolar'
          }
          defaultFormat="A4"
          defaultOrientation={hasConsolidatedPauta ? 'landscape' : 'portrait'}
        />
      </div>

      {/* 2. CARTÕES KPI DE RELATÓRIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-[#4b6755] block">Alunos Registados</span>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">
              {relevantStudents.length}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-1">
              {totalMale} M · {totalFemale} F
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-[#4b6755] block">Aproveitamento Positivo</span>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#055827] tabular-nums mt-1">
              {approvalRate}%
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-1">
              ≥ 5.0 Primário · ≥ 9.5 Sec.–Sup.
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-[#4b6755] block">Turmas em Funcionamento</span>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">
              {relevantClasses.length}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-1">Limite: 45 alunos/sala</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <School className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-[#4b6755] block">Cobrança em Kwanzas</span>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-[#055827] tabular-nums mt-1">
              {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}%
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-1 truncate">
              {formatKwanza(totalCollected)} cobrados
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Detailed Statistical Breakdown */}
      <div
        ref={summaryReportRef}
        className={`space-y-4 ${hasConsolidatedPauta ? 'print:hidden' : ''}`}
      >
        {!isGlobal && currentInstitution && (
          <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
            <OfficialDocumentHeader
              institution={currentInstitution}
              editable={false}
              insigniaClassName="h-12 w-auto mx-auto object-contain"
              extraMeta={
                <p className="text-xs font-extrabold uppercase tracking-wide pt-1">
                  RELATÓRIO ESTATÍSTICO E FINANCEIRO INSTITUCIONAL
                </p>
              }
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <h3 className="font-bold text-sm">Distribuição de Estudantes por Género</h3>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#064e26] mb-1.5">
                  <span>Rapazes (Masculino)</span>
                  <span className="tabular-nums">{totalMale} alunos ({Math.round((totalMale / (relevantStudents.length || 1)) * 100)}%)</span>
                </div>
                <div className="w-full bg-[#eaf6ee] h-3 rounded-full overflow-hidden border border-[#cde6d5]">
                  <div
                    className="bg-[#16a34a] h-full rounded-full"
                    style={{ width: `${Math.round((totalMale / (relevantStudents.length || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-[#064e26] mb-1.5">
                  <span>Raparigas (Feminino)</span>
                  <span className="tabular-nums">{totalFemale} alunas ({Math.round((totalFemale / (relevantStudents.length || 1)) * 100)}%)</span>
                </div>
                <div className="w-full bg-[#eaf6ee] h-3 rounded-full overflow-hidden border border-[#cde6d5]">
                  <div
                    className="bg-[#1d8cf8] h-full rounded-full"
                    style={{ width: `${Math.round((totalFemale / (relevantStudents.length || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-3.5 bg-[#f7fbf8] rounded-xl text-xs text-[#4b6755] border border-[#cde6d5]">
              Paridade de género em conformidade com as metas do Plano Nacional de Desenvolvimento de Angola.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <h3 className="font-bold text-sm">Balanço de Propinas &amp; Emolumentos (Kz)</h3>
          </div>

          <div className="p-5">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-3 bg-[#f7fbf8] rounded-xl border border-[#cde6d5]">
                <span className="text-[#4b6755]">Total Facturado em Propinas:</span>
                <strong className="text-[#064e26] font-bold tabular-nums">{formatKwanza(totalBilled)}</strong>
              </div>

              <div className="flex justify-between p-3 bg-[#eaf6ee] rounded-xl border border-[#cde6d5]">
                <span className="text-[#055827]">Total Liquidado (Multicaixa / Banco):</span>
                <strong className="text-[#067836] font-bold tabular-nums">{formatKwanza(totalCollected)}</strong>
              </div>

              <div className="flex justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="text-red-800">Saldo Pendente / Em Dívida:</span>
                <strong className="text-red-700 font-bold tabular-nums">{formatKwanza(totalDebt)}</strong>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-[#4b6755] italic">
              * Pagamentos conciliados automaticamente com referências EMIS Multicaixa Express.
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* CONSULTA READ-ONLY DE PAUTA GERAL CONSOLIDADA (DIREÇÃO ESCOLAR / MED) */}
      {!isGlobal && currentInstitution && selectedClass && (
        <div className="space-y-3">
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
            <div>
              <h3 className="font-extrabold text-[#064e26] text-sm flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-[#067836]" />
                <span>Pauta Geral</span>
              </h3>
              <p className="text-[11px] text-[#4b6755] mt-0.5">
                Matriz oficial de consulta e homologação da Direcção Escolar (lançamento individual de notas exclusivo do Docente).
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2 text-xs">
              <div className="min-w-[220px]">
                <FunctionalDropdownFilter
                  label="Período / Trimestre:"
                  value={selectedPeriod}
                  onChange={(val) => setSelectedPeriod(val as ConsolidatedPautaPeriod)}
                  options={periodOptions}
                  placeholder="Seleccionar período..."
                />
              </div>

              <select
                value={selectedClass.id}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-[#f7fbf8] border border-[#cde6d5] rounded-xl px-3 py-2.5 font-bold text-[#064e26] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              >
                {relevantClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel})
                  </option>
                ))}
              </select>

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('evaluations')}
                  className="inline-flex items-center space-x-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Mini-Pautas &amp; Boletins</span>
                </button>
              )}

              <button
                onClick={handleExportPautaCsv}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <DocumentExportBar
                targetRef={pautaReportRef}
                filename={`PautaGeral_${selectedClass.code}`}
                documentTitle={`Pauta Geral ${selectedClass.name}`}
                defaultFormat="A4"
                defaultOrientation="landscape"
                compact
              />
            </div>
          </div>

          <div ref={pautaReportRef}>
            <ConsolidatedPautaView
              currentInstitution={currentInstitution}
              selectedClass={selectedClass}
              students={classStudents}
              subjects={classSubjects}
              grades={relevantGrades}
              selectedPeriod={selectedPeriod}
            />
          </div>
        </div>
      )}
    </div>
  );
};
