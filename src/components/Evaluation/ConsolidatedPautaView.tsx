/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Pauta Geral Consolidada de Aproveitamento (Modelo Oficial MED Angola)
 * Matriz Oficial com MT1, MT2, MT3 e MFD por Disciplina + Resumo Geral
 */

import React, { useMemo, useState } from 'react';
import {
  Institution,
  ClassRoom,
  Student,
  GradeRecord,
  CurriculumSubject
} from '../../types';
import {
  computeAnnualSubjectSummary,
  isExamAndRecourseEligible,
  getGradingScaleConfig,
  resolveGradeTrimestralComponents
} from '../../utils/evaluationEngine';
import { formatAngolaDate } from '../../utils/currency';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';

export type ConsolidatedPautaPeriod = '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual';

interface ConsolidatedPautaViewProps {
  currentInstitution: Institution;
  selectedClass: ClassRoom;
  students: Student[];
  subjects: CurriculumSubject[];
  grades: GradeRecord[];
  selectedPeriod?: ConsolidatedPautaPeriod;
  showStatsFooter?: boolean;
}

export interface ConsolidatedPautaRow {
  student: Student;
  subjectSummaries: Array<{
    subjectId: string;
    mt1?: number;
    mt2?: number;
    mt3?: number;
    en?: number;
    rec?: number;
    mfd?: number;
  }>;
  resumo: {
    estado: 'Aprovado' | 'Recurso' | 'Reprovado' | 'Em Curso';
    negativesCount: number;
    evaluatedCount: number;
  };
}

export interface TrimestralPautaRow {
  student: Student;
  subjectComponents: Array<{
    subjectId: string;
    ac1?: number;
    ac2?: number;
    ac3?: number;
    mac?: number;
    npt?: number;
    mt?: number;
  }>;
  resumo: {
    estado: 'Aprovado' | 'Recurso' | 'Reprovado' | 'Em Curso';
    negativesCount: number;
    evaluatedCount: number;
  };
}

const matchesSubjectGrade = (g: GradeRecord, sub: CurriculumSubject) =>
  g.subjectId === sub.id ||
  g.subjectName.trim().toLowerCase() === sub.name.trim().toLowerCase();

const evaluateOutcomeFromScores = (
  scores: Array<number | undefined>,
  passingThreshold: number,
  recourseThreshold: number
): {
  estado: 'Aprovado' | 'Recurso' | 'Reprovado' | 'Em Curso';
  negativesCount: number;
  evaluatedCount: number;
} => {
  const evaluated = scores.filter((v): v is number => v !== undefined && !isNaN(v));
  if (evaluated.length === 0) {
    return { estado: 'Em Curso', negativesCount: 0, evaluatedCount: 0 };
  }
  const negatives = evaluated.filter((v) => v < passingThreshold);
  if (negatives.length === 0) {
    return { estado: 'Aprovado', negativesCount: 0, evaluatedCount: evaluated.length };
  }
  if (negatives.length <= 2 && negatives.every((v) => v >= recourseThreshold)) {
    return {
      estado: 'Recurso',
      negativesCount: negatives.length,
      evaluatedCount: evaluated.length
    };
  }
  return {
    estado: 'Reprovado',
    negativesCount: negatives.length,
    evaluatedCount: evaluated.length
  };
};

export function buildTrimestralPautaRows(
  selectedClass: ClassRoom,
  students: Student[],
  subjects: CurriculumSubject[],
  grades: GradeRecord[],
  period: '1_trimestre' | '2_trimestre' | '3_trimestre'
): TrimestralPautaRow[] {
  const subCode = selectedClass.subsystemCode || 'primario_geral';
  const scaleConfig = getGradingScaleConfig(subCode);

  return students.map((stu) => {
    const subjectComponents = subjects.map((sub) => {
      const rec = grades.find(
        (g) => g.studentId === stu.id && matchesSubjectGrade(g, sub) && g.period === period
      );
      const comp = resolveGradeTrimestralComponents(rec);
      return {
        subjectId: sub.id,
        ac1: comp.ac1,
        ac2: comp.ac2,
        ac3: comp.ac3,
        mac: comp.mac,
        npt: comp.npt,
        mt: comp.mt
      };
    });

    const resumo = evaluateOutcomeFromScores(
      subjectComponents.map((s) => s.mt),
      scaleConfig.passingThreshold,
      scaleConfig.recourseThreshold
    );

    return {
      student: stu,
      subjectComponents,
      resumo
    };
  });
}

export function buildConsolidatedPautaRows(
  selectedClass: ClassRoom,
  students: Student[],
  subjects: CurriculumSubject[],
  grades: GradeRecord[]
): ConsolidatedPautaRow[] {
  const subCode = selectedClass.subsystemCode || 'primario_geral';
  const hasExamAndRecourse = isExamAndRecourseEligible(subCode, selectedClass.gradeLevel);
  const scaleConfig = getGradingScaleConfig(subCode);

  return students.map((stu) => {
    const subjectSummaries = subjects.map((sub) => {
      const stuSubGrades = grades.filter(
        (g) => g.studentId === stu.id && matchesSubjectGrade(g, sub)
      );
      const summary = computeAnnualSubjectSummary(
        stuSubGrades,
        subCode,
        hasExamAndRecourse
      );
      return {
        subjectId: sub.id,
        mt1: summary.mt1,
        mt2: summary.mt2,
        mt3: summary.mt3,
        en: summary.en,
        rec: summary.rec,
        mfd: summary.mf
      };
    });

    // A condição para aprovação, reprovação e recurso depende estritamente de todas as MFD (positivas ou negativas)
    const resumo = evaluateOutcomeFromScores(
      subjectSummaries.map((s) => s.mfd),
      scaleConfig.passingThreshold,
      scaleConfig.recourseThreshold
    );

    return {
      student: stu,
      subjectSummaries,
      resumo
    };
  });
}

export const ConsolidatedPautaView: React.FC<ConsolidatedPautaViewProps> = ({
  currentInstitution,
  selectedClass,
  students,
  subjects,
  grades,
  selectedPeriod = 'anual',
  showStatsFooter = true
}) => {
  const subCode = selectedClass.subsystemCode || 'primario_geral';
  const hasExamAndRecourse = isExamAndRecourseEligible(subCode, selectedClass.gradeLevel);
  const scaleConfig = getGradingScaleConfig(subCode);
  const threshold = scaleConfig.passingThreshold;

  // Por defeito, a Pauta exibe sempre MT1, MT2, MT3 e MFD (ou EXAME (EN), RECURSO (REC), MFD) vindos das Mini-Pautas.
  // Opcionalmente (fora da impressão), permite alternar para o detalhe trimestral (AC1..MT) quando um trimestre estiver seleccionado.
  const [showTrimestralDetail, setShowTrimestralDetail] = useState(false);
  const activeTrimestralDetail = selectedPeriod !== 'anual' && showTrimestralDetail;

  const annualRows = useMemo(
    () => buildConsolidatedPautaRows(selectedClass, students, subjects, grades),
    [selectedClass, students, subjects, grades]
  );

  const trimestralRows = useMemo(
    () =>
      selectedPeriod !== 'anual' && activeTrimestralDetail
        ? buildTrimestralPautaRows(selectedClass, students, subjects, grades, selectedPeriod)
        : [],
    [activeTrimestralDetail, selectedClass, students, subjects, grades, selectedPeriod]
  );

  const formatScore = (val?: number) => {
    if (val === undefined || isNaN(val)) return '--';
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  };

  const scoreColorClass = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'text-slate-300 font-normal';
    return val >= threshold ? 'text-black font-semibold' : 'text-red-600 font-semibold';
  };

  const todayFormatted = formatAngolaDate(new Date());
  const trimesterTitle =
    selectedPeriod === '1_trimestre'
      ? '1.º TRIMESTRE LECTIVO'
      : selectedPeriod === '2_trimestre'
      ? '2.º TRIMESTRE LECTIVO'
      : '3.º TRIMESTRE LECTIVO';

  return (
    <div className="official-document-sheet pauta-geral-sheet bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden print:border-none print:shadow-none">
      {/* CABEÇALHO OFICIAL CENTRALIZADO E EDITÁVEL */}
      <div className="px-3 sm:px-4 pt-3 pb-2 bg-white">
        <OfficialDocumentHeader
          institution={currentInstitution}
          insigniaClassName="h-10 sm:h-11 w-auto mx-auto object-contain"
        />

        <div className="mt-1.5 pt-1.5 border-t-2 border-slate-800 text-center">
          <h3 className="pauta-title text-sm font-extrabold uppercase tracking-wide text-black">
            {activeTrimestralDetail ? `PAUTA GERAL · ${trimesterTitle}` : 'PAUTA GERAL'}
          </h3>
          {!activeTrimestralDetail && hasExamAndRecourse && (
            <div className="pauta-meta mt-0.5 inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[9px] font-bold uppercase tracking-wide">
              Regime de Exames · EXAME (EN) e RECURSO (REC) Activo · {selectedClass.gradeLevel}
            </div>
          )}

          {selectedPeriod !== 'anual' && (
            <div className="mt-2 flex justify-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowTrimestralDetail(false)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  !activeTrimestralDetail
                    ? 'bg-[#067836] text-white border-[#067836] shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {hasExamAndRecourse
                  ? 'Pauta Oficial (MT1, MT2, MT3, EXAME (EN), RECURSO (REC), MFD)'
                  : 'Pauta Oficial (MT1, MT2, MT3, MFD)'}
              </button>
              <button
                type="button"
                onClick={() => setShowTrimestralDetail(true)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  activeTrimestralDetail
                    ? 'bg-[#067836] text-white border-[#067836] shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Detalhe {trimesterTitle.split(' ')[0]} (AC1–AC3, MAC, NPT, MT)
              </button>
            </div>
          )}
        </div>

        <div className="pauta-meta mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-800 font-semibold border-b border-slate-200 pb-1.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>
              TURMA: <strong className="font-bold text-slate-950">{selectedClass.name}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              NÍVEL: <strong className="font-bold text-slate-950">{selectedClass.gradeLevel}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              ESCALA: <strong className="font-bold text-black">{scaleConfig.scaleLabel.toUpperCase()} (MÍN. {threshold.toFixed(1)})</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              ANO LECTIVO: <strong className="font-bold text-slate-950">{selectedClass.academicYear}</strong>
            </span>
          </div>
          <div className="whitespace-nowrap">
            DATA DE EMISSÃO: <strong className="font-bold text-slate-950">{todayFormatted}</strong>
          </div>
        </div>
      </div>

      {/* DICA DE ROLAGEM EM ECRÃS PEQUENOS */}
      <div className="lg:hidden px-3 py-1 bg-[#eaf6ee] border-y border-[#cde6d5] text-[10px] text-[#055827] flex items-center justify-between print:hidden">
        <span>Deslize horizontalmente para ver todas as disciplinas e o resultado final</span>
        <span className="font-bold">↔</span>
      </div>

      {/* MATRIZ OFICIAL */}
      <div className="overflow-x-auto px-2 sm:px-3 pb-2">
        {activeTrimestralDetail ? (
          <table className="w-full text-left border-collapse tabular-nums border border-black text-[10px]">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="bg-white text-black font-bold text-center px-1 py-0.5 border border-black w-6 align-middle"
                >
                  Nº
                </th>
                <th
                  rowSpan={2}
                  className="bg-white text-black font-bold text-left px-1.5 py-0.5 border border-black min-w-[105px] align-middle"
                >
                  Nome Completo do Aluno
                </th>
                {subjects.map((sub) => (
                  <th
                    key={sub.id}
                    colSpan={6}
                    title={sub.name}
                    className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black uppercase leading-tight"
                  >
                    {sub.name}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="bg-white text-black font-bold text-center px-1 py-0.5 border border-black align-middle uppercase whitespace-nowrap"
                >
                  Resultado
                </th>
              </tr>

              <tr>
                {subjects.map((sub) => (
                  <React.Fragment key={`${sub.id}-trim-cols`}>
                    <th className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black">
                      AC1
                    </th>
                    <th className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black">
                      AC2
                    </th>
                    <th className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black">
                      AC3
                    </th>
                    <th className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black">
                      MAC
                    </th>
                    <th className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black">
                      NPT
                    </th>
                    <th className="bg-white text-black font-extrabold text-center px-0.5 py-0.5 border border-black">
                      MT
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 text-slate-800">
              {trimestralRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + subjects.length * 6 + 1}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    Nenhum aluno matriculado nesta turma.
                  </td>
                </tr>
              ) : (
                trimestralRows.map((row, idx) => (
                  <tr key={row.student.id} className="bg-white even:bg-slate-50/75 hover:bg-sky-50/40">
                    <td className="px-1 py-0.5 text-center font-semibold text-slate-600 border border-slate-300">
                      {idx + 1}
                    </td>
                    <td className="px-1.5 py-0.5 font-medium text-slate-900 border border-slate-300">
                      {row.student.fullName}
                    </td>

                    {row.subjectComponents.map((comp) => (
                      <React.Fragment key={`${row.student.id}-${comp.subjectId}`}>
                        <td className={`px-0.5 py-0.5 text-center border border-slate-300 ${scoreColorClass(comp.ac1)}`}>
                          {formatScore(comp.ac1)}
                        </td>
                        <td className={`px-0.5 py-0.5 text-center border border-slate-300 ${scoreColorClass(comp.ac2)}`}>
                          {formatScore(comp.ac2)}
                        </td>
                        <td className={`px-0.5 py-0.5 text-center border border-slate-300 ${scoreColorClass(comp.ac3)}`}>
                          {formatScore(comp.ac3)}
                        </td>
                        <td className={`px-0.5 py-0.5 text-center border border-slate-300 bg-sky-50/40 ${scoreColorClass(comp.mac)}`}>
                          {formatScore(comp.mac)}
                        </td>
                        <td className={`px-0.5 py-0.5 text-center border border-slate-300 ${scoreColorClass(comp.npt)}`}>
                          {formatScore(comp.npt)}
                        </td>
                        <td className={`px-0.5 py-0.5 text-center border border-slate-300 bg-slate-100/70 font-bold ${scoreColorClass(comp.mt)}`}>
                          {formatScore(comp.mt)}
                        </td>
                      </React.Fragment>
                    ))}

                    <td
                      className={`px-1.5 py-0.5 text-center border border-slate-300 font-bold whitespace-nowrap ${
                        row.resumo.estado === 'Aprovado'
                          ? 'text-black'
                          : row.resumo.estado === 'Recurso'
                          ? 'text-amber-700'
                          : row.resumo.estado === 'Reprovado'
                          ? 'text-red-600'
                          : 'text-slate-400 font-normal'
                      }`}
                    >
                      {row.resumo.estado}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse tabular-nums border border-black text-[10px]">
            <thead>
              {/* LINHA 1: DISCIPLINAS + RESULTADO FINAL (SEM RESUMO GERAL) */}
              <tr>
                <th
                  rowSpan={2}
                  className="bg-white text-black font-bold text-center px-1 py-0.5 border border-black w-6 align-middle"
                >
                  Nº
                </th>
                <th
                  rowSpan={2}
                  className="bg-white text-black font-bold text-left px-1.5 py-0.5 border border-black min-w-[105px] align-middle"
                >
                  Nome Completo do Aluno
                </th>
                {subjects.map((sub) => (
                  <th
                    key={sub.id}
                    colSpan={hasExamAndRecourse ? 6 : 4}
                    title={sub.name}
                    className="bg-white text-black font-bold text-center px-0.5 py-0.5 border border-black uppercase leading-tight"
                  >
                    {sub.name}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  title="Aprovação, Reprovação ou Recurso consoante todas as MFD das disciplinas"
                  className="bg-white text-black font-bold text-center px-1 py-0.5 border border-black align-middle uppercase whitespace-nowrap"
                >
                  Resultado
                </th>
              </tr>

              {/* LINHA 2: MT1, MT2, MT3, (EXAME(EN), RECURSO(REC)), MFD */}
              <tr>
                {subjects.map((sub) => (
                  <React.Fragment key={`${sub.id}-subs`}>
                    <th
                      className={`font-bold text-center px-0.5 py-0.5 border border-black ${
                        selectedPeriod === '1_trimestre' ? 'bg-emerald-50 text-[#055827]' : 'bg-white text-black'
                      }`}
                      title="Média do 1.º Trimestre (Mini-Pauta)"
                    >
                      MT1
                    </th>
                    <th
                      className={`font-bold text-center px-0.5 py-0.5 border border-black ${
                        selectedPeriod === '2_trimestre' ? 'bg-emerald-50 text-[#055827]' : 'bg-white text-black'
                      }`}
                      title="Média do 2.º Trimestre (Mini-Pauta)"
                    >
                      MT2
                    </th>
                    <th
                      className={`font-bold text-center px-0.5 py-0.5 border border-black ${
                        selectedPeriod === '3_trimestre' ? 'bg-emerald-50 text-[#055827]' : 'bg-white text-black'
                      }`}
                      title="Média do 3.º Trimestre (Mini-Pauta)"
                    >
                      MT3
                    </th>
                    {hasExamAndRecourse && (
                      <>
                        <th className="bg-sky-50/70 text-black font-bold text-center px-0.5 py-0.5 border border-black leading-tight" title="Exame Normal">
                          EXAME (EN)
                        </th>
                        <th className="bg-amber-50/70 text-black font-bold text-center px-0.5 py-0.5 border border-black leading-tight" title="Exame de Recurso">
                          RECURSO (REC)
                        </th>
                      </>
                    )}
                    <th className="bg-white text-black font-extrabold text-center px-0.5 py-0.5 border border-black" title="Média Final da Disciplina">
                      MFD
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 text-slate-800">
              {annualRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + subjects.length * (hasExamAndRecourse ? 6 : 4) + 1}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    Nenhum aluno matriculado nesta turma.
                  </td>
                </tr>
              ) : (
                annualRows.map((row, idx) => (
                  <tr key={row.student.id} className="bg-white even:bg-slate-50/75 hover:bg-sky-50/40">
                    <td className="px-1 py-0.5 text-center font-semibold text-slate-600 border border-slate-300">
                      {idx + 1}
                    </td>
                    <td className="px-1.5 py-0.5 font-medium text-slate-900 border border-slate-300">
                      {row.student.fullName}
                    </td>

                    {row.subjectSummaries.map((subSum) => (
                      <React.Fragment key={`${row.student.id}-${subSum.subjectId}`}>
                        <td
                          className={`px-0.5 py-0.5 text-center border border-slate-300 ${
                            selectedPeriod === '1_trimestre' ? 'bg-emerald-50/40 ' : ''
                          }${scoreColorClass(subSum.mt1)}`}
                        >
                          {formatScore(subSum.mt1)}
                        </td>
                        <td
                          className={`px-0.5 py-0.5 text-center border border-slate-300 ${
                            selectedPeriod === '2_trimestre' ? 'bg-emerald-50/40 ' : ''
                          }${scoreColorClass(subSum.mt2)}`}
                        >
                          {formatScore(subSum.mt2)}
                        </td>
                        <td
                          className={`px-0.5 py-0.5 text-center border border-slate-300 ${
                            selectedPeriod === '3_trimestre' ? 'bg-emerald-50/40 ' : ''
                          }${scoreColorClass(subSum.mt3)}`}
                        >
                          {formatScore(subSum.mt3)}
                        </td>
                        {hasExamAndRecourse && (
                          <>
                            <td
                              className={`px-0.5 py-0.5 text-center border border-slate-300 bg-sky-50/40 ${scoreColorClass(
                                subSum.en
                              )}`}
                            >
                              {formatScore(subSum.en)}
                            </td>
                            <td
                              className={`px-0.5 py-0.5 text-center border border-slate-300 bg-amber-50/40 ${scoreColorClass(
                                subSum.rec
                              )}`}
                            >
                              {formatScore(subSum.rec)}
                            </td>
                          </>
                        )}
                        <td
                          className={`px-0.5 py-0.5 text-center border border-slate-300 bg-slate-100/70 font-bold ${scoreColorClass(
                            subSum.mfd
                          )}`}
                        >
                          {formatScore(subSum.mfd)}
                        </td>
                      </React.Fragment>
                    ))}

                    <td
                      className={`px-1.5 py-0.5 text-center border border-slate-300 font-bold whitespace-nowrap ${
                        row.resumo.estado === 'Aprovado'
                          ? 'text-black'
                          : row.resumo.estado === 'Recurso'
                          ? 'text-amber-700'
                          : row.resumo.estado === 'Reprovado'
                          ? 'text-red-600'
                          : 'text-slate-400 font-normal'
                      }`}
                    >
                      {row.resumo.estado}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ASSINATURAS OFICIAIS NO RODAPÉ CONFORME MODELO PDF */}
      <div className="pauta-signatures px-4 pt-5 pb-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-[10px] text-slate-800">
        <div>
          <span className="font-bold block text-slate-900 mb-6">O Director de Turma</span>
          <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
          <span className="text-[9px] text-slate-500">
            {selectedClass.classDirectorName || 'Assinatura do Docente'}
          </span>
        </div>
        <div>
          <span className="font-bold block text-slate-900 mb-6">O Subdirector Pedagógico</span>
          <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
          <span className="text-[9px] text-slate-500">
            {currentInstitution.subdirectorPedagogico || 'Conferido / Visto'}
          </span>
        </div>
        <div>
          <span className="font-bold block text-slate-900 mb-6">O Director Geral da Escola</span>
          <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
          <span className="text-[9px] text-slate-500">
            {currentInstitution.directorName}
          </span>
        </div>
      </div>
    </div>
  );
};
