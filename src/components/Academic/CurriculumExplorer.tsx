/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Motor Curricular Inteligente de Angola
 * Carrega automaticamente disciplinas oficiais de acordo com Subsistema, Classe e Curso
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Award,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet
} from 'lucide-react';
import { Institution, EducationSubsystemCode } from '../../types';
import {
  ANGOLA_EDUCATION_SUBSYSTEMS,
  getCurriculumForGrade
} from '../../data/angolaCurriculum';

interface CurriculumExplorerProps {
  currentInstitution: Institution;
  initialSubsystemCode?: EducationSubsystemCode;
  navigationKey?: number;
}

export const CurriculumExplorer: React.FC<CurriculumExplorerProps> = ({
  currentInstitution,
  initialSubsystemCode,
  navigationKey
}) => {
  // Subsistemas disponíveis nesta instituição específica
  const availableSubsystems = ANGOLA_EDUCATION_SUBSYSTEMS.filter((s) =>
    currentInstitution.subsystems.includes(s.code)
  );

  const [selectedSubsystemCode, setSelectedSubsystemCode] = useState<EducationSubsystemCode>(
    initialSubsystemCode || availableSubsystems[0]?.code || 'primario_geral'
  );

  const currentSubMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find(
    (s) => s.code === selectedSubsystemCode
  )!;

  const [selectedGrade, setSelectedGrade] = useState<string>(
    currentSubMeta?.gradesOrYears[0] || '1.ª Classe'
  );

  const [selectedCourse, setSelectedCourse] = useState<string>(
    currentSubMeta?.coursesAvailable ? currentSubMeta.coursesAvailable[0] : ''
  );

  useEffect(() => {
    if (!initialSubsystemCode) return;
    const meta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === initialSubsystemCode);
    if (meta) {
      setSelectedSubsystemCode(initialSubsystemCode);
      setSelectedGrade(meta.gradesOrYears[0] || '1.ª Classe');
      setSelectedCourse(meta.coursesAvailable ? meta.coursesAvailable[0] : '');
    }
  }, [initialSubsystemCode, navigationKey]);

  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  // Consulta ao Motor Curricular Oficial
  const activePlan = getCurriculumForGrade(
    selectedSubsystemCode,
    selectedGrade,
    selectedCourse || undefined
  );

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            MOTOR CURRICULAR OFICIAL DE ANGOLA
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5 font-medium">
            Planos Curriculares Aprovados pelo INIDE/MED · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>
      </div>

      {linkNotice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center justify-between gap-2 shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
          <div className="flex items-center space-x-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span>{linkNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setLinkNotice(null)}
            className="text-[#055827] hover:text-[#064e26] font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. AS 4 CAIXAS MÉTRICAS (Circular Badges) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Ensino em Angola</p>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#064e26] mt-0.5">11 Subsistemas</div>
            <p className="text-[11px] text-[#16a34a] font-semibold mt-0.5">Legislação Oficial</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Disciplinas Desta Classe</p>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-0.5">
              {activePlan?.subjects.length || 0} Matérias
            </div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-0.5">Carga Horária Definida</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Nível Curricular</p>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight text-[#064e26] truncate mt-0.5">
              {selectedGrade}
            </div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-0.5 truncate">{currentSubMeta?.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#4b6755]">Carga Semanal Total</p>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-0.5">
              {activePlan?.subjects.reduce((sum, s) => sum + s.weeklyHours, 0) || 28} Horas
            </div>
            <p className="text-[11px] text-[#16a34a] font-semibold mt-0.5">Tempos Lectivos Oficiais</p>
          </div>
        </div>
      </div>

      {/* 3. Selecção de Subsistema da Instituição */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4">
        <span className="text-xs font-bold text-[#064e26] uppercase tracking-wider block mb-2.5">
          Subsistemas Integrados Nesta Instituição:
        </span>
        <div className="flex flex-wrap gap-2">
          {availableSubsystems.map((sub) => {
            const isSelected = sub.code === selectedSubsystemCode;
            return (
              <button
                key={sub.code}
                onClick={() => {
                  setSelectedSubsystemCode(sub.code);
                  setSelectedGrade(sub.gradesOrYears[0]);
                  setSelectedCourse(sub.coursesAvailable ? sub.coursesAvailable[0] : '');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                    : 'bg-[#eaf6ee] text-[#055827] hover:bg-[#d7efe0] border border-[#cde6d5]'
                }`}
              >
                <span>{sub.name}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectores de Nível / Classe e Curso */}
      <div className="bg-white rounded-2xl p-5 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-[#064e26] uppercase tracking-wider block mb-1.5">
            1. Classe / Ano Curricular *
          </label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full bg-[#f7fbf8] text-[#064e26] text-sm rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            {currentSubMeta?.gradesOrYears.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {currentSubMeta?.coursesAvailable && (
          <div>
            <label className="text-xs font-bold text-[#064e26] uppercase tracking-wider block mb-1.5">
              2. Curso / Área de Especialização *
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-[#f7fbf8] text-[#064e26] text-sm rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
            >
              {currentSubMeta.coursesAvailable.map((crs) => (
                <option key={crs} value={crs}>
                  {crs}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col justify-end">
          <div className="bg-[#f7fbf8] p-3 rounded-xl border border-[#dce7df] text-xs text-[#4b6755]">
            <span className="font-bold text-[#064e26] block">Norma Regulamentar:</span>
            <span className="truncate block">{currentSubMeta?.officialNorm}</span>
          </div>
        </div>
      </div>

      {/* Resultado do Motor Curricular */}
      {activePlan ? (
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-[#067836] to-[#149a45] text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-extrabold text-white">
                  {activePlan.name}
                </span>
                <span className="bg-white/15 text-white text-xs font-bold px-2.5 py-0.5 rounded-lg border border-white/25 flex items-center space-x-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Matriz INIDE Homologada</span>
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                {activePlan.gradeLevel} {activePlan.courseName ? `• ${activePlan.courseName}` : ''} • Ref: {activePlan.legalReference}
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-xs p-2.5 rounded-xl border border-white/25 text-xs text-white">
              <span className="font-semibold text-emerald-100 block">Critério Oficial de Avaliação:</span>
              <span className="font-mono text-white font-bold">{activePlan.evaluationFormula}</span>
            </div>
          </div>

          {activePlan.observationNote && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{activePlan.observationNote}</span>
            </div>
          )}

          {/* Tabela de Disciplinas Carregadas */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Disciplina Oficial</th>
                  <th className="py-3 px-4">Grupo Curricular</th>
                  <th className="py-3 px-4 text-center">Carga Horária Semanal</th>
                  <th className="py-3 px-4 text-center">Coeficiente</th>
                  <th className="py-3 px-4 text-center">Avaliação Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaf1ec] text-slate-700">
                {activePlan.subjects.map((subj) => (
                  <tr key={subj.id} className="hover:bg-[#f7fbf8] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#055827]">
                      {subj.code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm block">{subj.name}</span>
                      <span className="text-[11px] text-[#4b6755]">Designação curta: {subj.shortName}</span>
                    </td>
                    <td className="py-3 px-4 capitalize">
                      <span className="bg-[#eaf6ee] px-2.5 py-0.5 rounded-lg text-[#055827] font-semibold">
                        {subj.group.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 tabular-nums">
                      {subj.weeklyHours} horas / semana
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      {subj.coefficient}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {subj.isTerminalExam ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-200">
                          Exame Nacional / Provincial
                        </span>
                      ) : (
                        <span className="text-[#4b6755]">Avaliação Contínua</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-[#f7fbf8] border-t border-[#dce7df] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4b6755]">
            <span>
              Total de Disciplinas:{' '}
              <strong className="text-[#064e26]">{activePlan.subjects.length}</strong> | Carga
              Horária Total:{' '}
              <strong className="text-[#064e26]">
                {activePlan.subjects.reduce((sum, s) => sum + s.weeklyHours, 0)}h / semana
              </strong>
            </span>

            <button
              type="button"
              onClick={() => {
                setLinkNotice(`Plano "${activePlan.name}" associado com sucesso às turmas de ${activePlan.gradeLevel}!`);
                setTimeout(() => setLinkNotice(null), 4500);
              }}
              className="bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
            >
              Vincular a Novas Turmas
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900 shadow-xs">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h4 className="text-base font-bold">Plano curricular pendente de configuração e validação.</h4>
          <p className="text-xs text-amber-700 mt-1 max-w-lg mx-auto">
            Conforme a directriz do sistema NEUROEDUCA, não são inventadas disciplinas nem cargas horárias
            para a combinação seleccionada ({selectedGrade} - {selectedCourse || currentSubMeta.name}).
            A instituição pode cadastrar a matriz manual ou aguardar validação do Ministério da Educação.
          </p>
        </div>
      )}
    </div>
  );
};
