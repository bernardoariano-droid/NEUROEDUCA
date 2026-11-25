/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Explorador da Base de Dados Curricular Oficial de Angola
 * 11 Subsistemas Oficiais, Matrizes do INIDE, MED e MESCTI
 */

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Award,
  ChevronRight,
  Info,
  Search,
  Filter
} from 'lucide-react';
import {
  ANGOLA_EDUCATION_SUBSYSTEMS,
  OFFICIAL_CURRICULUM_PLANS
} from '../../data/angolaCurriculum';
import { EducationSubsystemCode } from '../../types';

export const CurriculumDatabaseViewer: React.FC = () => {
  const [selectedSubsystemCode, setSelectedSubsystemCode] = useState<EducationSubsystemCode>('primario_geral');
  const [searchSubject, setSearchSubject] = useState('');

  const activeSubsystem = ANGOLA_EDUCATION_SUBSYSTEMS.find(
    (s) => s.code === selectedSubsystemCode
  )!;

  const relevantPlans = OFFICIAL_CURRICULUM_PLANS.filter(
    (p) => p.subsystemCode === selectedSubsystemCode
  );

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Base Curricular Oficial de Angola
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Plataforma Multi-institucional NEUROEDUCA · 11 Subsistemas Oficiais homologados pelo MED, INIDE e MESCTI
          </p>
        </div>
      </div>

      {/* 2. AS 4 CAIXAS MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Subsistemas Oficiais</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">11</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Lei de Bases 17/16</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Planos Curriculares</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">
              {relevantPlans.length} Matrizes
            </div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Homologados pelo INIDE</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Classes em {activeSubsystem.shortName}</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">
              {activeSubsystem.gradesOrYears.length} Níveis
            </div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Subsistema Activo</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Conformidade Ministerial</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">100% Oficial</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">República de Angola</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. NAVEGAÇÃO DOS SUBSISTEMAS */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider">
            Seleccionar Subsistema de Ensino de Angola
          </span>
          <span className="text-xs text-white/85 font-medium">11 Subsistemas Oficiais</span>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {ANGOLA_EDUCATION_SUBSYSTEMS.map((sub) => {
            const isSelected = sub.code === selectedSubsystemCode;
            return (
              <button
                key={sub.code}
                onClick={() => setSelectedSubsystemCode(sub.code)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                    : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
                }`}
              >
                <span>{sub.shortName}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. DETALHE DO SUBSISTEMA ACTIVO */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-[#f7fbf8] px-5 py-3 border-b border-[#dce7df] flex items-center justify-between">
          <span className="text-xs font-bold text-[#064e26] uppercase tracking-wider">
            Especificações do Subsistema: {activeSubsystem.shortName}
          </span>
          <span className="text-xs text-[#055827] font-mono font-semibold">Código: {activeSubsystem.code}</span>
        </div>
        <div className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#eaf2ec]">
            <div>
              <h2 className="text-xl font-bold text-[#064e26]">{activeSubsystem.name}</h2>
              <p className="text-xs text-[#4b6755] mt-0.5">{activeSubsystem.description}</p>
            </div>
            <div className="bg-[#f7fbf8] p-3 rounded-xl border border-[#cde6d5] text-xs text-[#064e26] shrink-0">
              <span className="font-bold block text-[#064e26]">Norma Legal:</span>
              <span className="text-[#4b6755] italic">{activeSubsystem.officialNorm}</span>
            </div>
          </div>

          {/* Especificidades e Classes do Subsistema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-2">
            <div>
              <span className="text-xs font-bold text-[#064e26] uppercase block mb-1.5">
                Classes / Níveis Autorizados
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeSubsystem.gradesOrYears.map((grade, idx) => (
                  <span
                    key={idx}
                    className="bg-[#f7fbf8] text-[#064e26] text-xs px-2.5 py-1 rounded-lg font-medium border border-[#cde6d5]"
                  >
                    {grade}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-[#064e26] uppercase block mb-1.5">
                Características &amp; Modelo de Avaliação
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeSubsystem.featuresSpecialized.map((feat, idx) => (
                  <span
                    key={idx}
                    className="bg-[#eaf6ee] text-[#055827] text-xs px-2.5 py-1 rounded-lg font-medium border border-[#cde6d5]"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planos Curriculares Validados vs Pendentes */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#064e26] flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#067836]" />
            <span>
              Planos Curriculares Cadastrados ({relevantPlans.length})
            </span>
          </h3>
          <span className="text-xs text-[#4b6755]">
            Regra Fundamental: Nunca aplicar o mesmo plano a todos os subsistemas
          </span>
        </div>

        {relevantPlans.length > 0 ? (
          <div className="space-y-4">
            {relevantPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden"
              >
                <div className="p-4 bg-[#f7fbf8] border-b border-[#dce7df] flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-[#064e26] text-sm">
                        {plan.name}
                      </span>
                      <span className="bg-[#eaf6ee] text-[#055827] text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#cde6d5]">
                        INIDE Validado
                      </span>
                    </div>
                    <div className="text-xs text-[#4b6755] mt-0.5">
                      {plan.gradeLevel} {plan.courseName ? `• Curso: ${plan.courseName}` : ''} • Versão: {plan.version} • {plan.effectiveYear}
                    </div>
                  </div>

                  <div className="text-xs text-right text-[#4b6755]">
                    <span className="font-medium text-[#064e26] block">Fórmula de Avaliação:</span>
                    <span className="text-[11px] font-mono bg-white px-2.5 py-0.5 rounded-lg border border-[#cde6d5] text-[#064e26] inline-block mt-0.5">
                      {plan.evaluationFormula}
                    </span>
                  </div>
                </div>

                {/* Tabela de Disciplinas do Plano */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white text-[#4b6755] uppercase font-semibold border-b border-[#dce7df]">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Disciplina Oficial</th>
                        <th className="py-3 px-4">Grupo Curricular</th>
                        <th className="py-3 px-4 text-center">Carga Horária Semanal</th>
                        <th className="py-3 px-4 text-center">Coeficiente</th>
                        <th className="py-3 px-4 text-center">Exame Terminal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
                      {plan.subjects.map((subj) => (
                        <tr key={subj.id} className="hover:bg-[#f7fbf8] transition">
                          <td className="py-2.5 px-4 font-mono font-semibold text-[#067836]">
                            {subj.code}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[#064e26]">
                            {subj.name}
                          </td>
                          <td className="py-2.5 px-4 capitalize text-[#4b6755]">
                            {subj.group.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-[#064e26] tabular-nums">
                            {subj.weeklyHours}h / semana
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono tabular-nums">
                            {subj.coefficient}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {subj.isTerminalExam ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                Sim (Exame)
                              </span>
                            ) : (
                              <span className="text-[#4b6755]/70 text-[11px]">Não</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-900">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h4 className="font-bold text-sm">Plano curricular pendente de configuração e validação.</h4>
            <p className="text-xs text-amber-700 mt-1 max-w-lg mx-auto">
              Conforme a directriz do sistema, não são inventadas disciplinas nem fórmulas para ofertas
              sem homologação ministerial expressa. As instituições podem cadastrar e submeter para validação.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
