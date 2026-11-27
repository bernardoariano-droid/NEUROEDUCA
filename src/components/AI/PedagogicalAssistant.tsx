/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Assistente Pedagógico Inteligente com IA Gemini para Professores de Angola
 */

import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Copy,
  Printer,
  AlertTriangle,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { Institution, EducationSubsystemCode } from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS, OFFICIAL_CURRICULUM_PLANS } from '../../data/angolaCurriculum';

interface PedagogicalAssistantProps {
  currentInstitution: Institution;
}

export const PedagogicalAssistant: React.FC<PedagogicalAssistantProps> = ({
  currentInstitution
}) => {
  const availableSubsystems = ANGOLA_EDUCATION_SUBSYSTEMS.filter((s) =>
    currentInstitution.subsystems.includes(s.code)
  );

  const [selectedSubsystem, setSelectedSubsystem] = useState<EducationSubsystemCode>(
    availableSubsystems[0]?.code || 'primario_geral'
  );

  const activeSubMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find(
    (s) => s.code === selectedSubsystem
  )!;

  const [gradeLevel, setGradeLevel] = useState<string>(activeSubMeta?.gradesOrYears[0] || '4.ª Classe');
  const [subjectName, setSubjectName] = useState('Língua Portuguesa');
  const [topic, setTopic] = useState('Estrutura do Texto Narrativo e Contos Tradicionais Angolanos');
  const [subtopic, setSubtopic] = useState('Identificação de Personagens, Espaço e Tempo');
  const [lessonDuration, setLessonDuration] = useState(45);
  const [assistantTask, setAssistantTask] = useState<'plano_aula' | 'exercicios' | 'avaliacao' | 'recuperacao'>('plano_aula');

  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/gemini/pedagogical-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subsystemCode: selectedSubsystem,
          gradeLevel,
          subjectName,
          topic,
          subtopic,
          lessonDurationMinutes: lessonDuration,
          assistantTask,
        }),
      });

      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const data = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok || !data) {
        throw new Error(data?.error || `Erro HTTP ${response.status} ao comunicar com o servidor`);
      }

      setGeneratedResult(data.resultText);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao gerar proposta pedagógica.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Assistente Pedagógico com IA (Gemini)
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Planos de Aula, Fichas de Exercícios e Matrizes Alinhadas ao INIDE/MED · República de Angola
          </p>
        </div>
      </div>

      {/* 2. AS 4 CAIXAS MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Planos de Aula</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">Planos</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Directrizes INIDE/MED</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Chave de Correcção</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">Fichas</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Contextualizado a Angola</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Matrizes de Avaliação</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">10 / 20 Val.</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Provas NPP e NPT</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Assistente Pedagógico</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">Gemini</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Geração Instantânea</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Selector de Tarefa Pedagógica */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAssistantTask('plano_aula')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              assistantTask === 'plano_aula'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Plano de Aula Oficial (MED/INIDE)</span>
          </button>

          <button
            onClick={() => setAssistantTask('exercicios')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              assistantTask === 'exercicios'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ficha de Exercícios &amp; Chave de Correcção</span>
          </button>

          <button
            onClick={() => setAssistantTask('avaliacao')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              assistantTask === 'avaliacao'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Prova de Avaliação (Escala 0 a 20 Valores)</span>
          </button>

          <button
            onClick={() => setAssistantTask('recuperacao')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              assistantTask === 'recuperacao'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Guia de Recuperação Pedagógica</span>
          </button>
        </div>
      </div>

      {/* Form and Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de Entrada */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <h2 className="text-sm font-bold">Parâmetros Curriculares da Aula</h2>
          </div>

          <div className="p-5 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#064e26] block mb-1">
                  Subsistema de Ensino *
                </label>
                <select
                  value={selectedSubsystem}
                  onChange={(e) => {
                    const code = e.target.value as EducationSubsystemCode;
                    setSelectedSubsystem(code);
                    const meta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === code);
                    if (meta) setGradeLevel(meta.gradesOrYears[0]);
                  }}
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                >
                  {availableSubsystems.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#064e26] block mb-1">Classe / Nível *</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  >
                    {activeSubMeta?.gradesOrYears.map((grd) => (
                      <option key={grd} value={grd}>
                        {grd}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#064e26] block mb-1">Duração da Aula</label>
                  <select
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  >
                    <option value={45}>45 Minutos (1 Tempo)</option>
                    <option value={90}>90 Minutos (2 Tempos)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#064e26] block mb-1">Disciplina *</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Ex: Língua Portuguesa, Matemática, História"
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#064e26] block mb-1">Tema Principal da Aula *</label>
                <textarea
                  required
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Operações com fracções e problemas práticos do comércio informal"
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#064e26] block mb-1">Subtema / Foco Específico</label>
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  placeholder="Ex: Resolução de exercícios em grupo"
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold py-2.5 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A Estruturar Proposta Pedagógica...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar com IA Gemini</span>
                  </>
                )}
              </button>
            </form>

            <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[11px] text-[#4b6755] space-y-1">
              <span className="font-bold text-[#064e26] block">Norma de Salvaguarda Pedagógica:</span>
              <p>
                Toda proposta gerada pelo Assistente Inteligente deve ser submetida à validação do
                Subdirector Pedagógico e Coordenador de Disciplina antes de ser ministrada em sala de aula.
              </p>
            </div>
          </div>
        </div>

        {/* Painel de Saída da Proposta Pedagógica */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col min-h-[500px] overflow-hidden">
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">Resultado Pedagógico</span>
              <span className="bg-white/15 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-white/20">
                {assistantTask === 'plano_aula'
                  ? 'Plano de Aula INIDE'
                  : assistantTask === 'exercicios'
                  ? 'Ficha de Actividades'
                  : assistantTask === 'avaliacao'
                  ? 'Matriz de Prova'
                  : 'Recuperação'}
              </span>
            </div>

            {generatedResult && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center space-x-1 text-xs font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-1 rounded-lg transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            )}
          </div>

          <div className="p-5 flex-1">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 mb-3 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#067836] animate-spin mx-auto" />
                <p className="text-xs text-[#4b6755] font-medium">
                  A consultar matrizes do INIDE e a redigir o plano de aula...
                </p>
              </div>
            ) : generatedResult ? (
              <div className="p-4 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-xs leading-relaxed text-[#064e26] whitespace-pre-wrap font-sans max-h-[550px] overflow-y-auto">
                {generatedResult}
              </div>
            ) : (
              <div className="py-24 text-center space-y-2 text-[#4b6755]">
                <Sparkles className="w-10 h-10 text-[#16a34a]/40 mx-auto" />
                <p className="text-sm font-semibold text-[#064e26]">
                  Pronto para planificar a sua próxima aula
                </p>
                <p className="text-xs max-w-sm mx-auto">
                  Preencha o tema e clique em "Gerar com IA Gemini" para obter um plano detalhado com introdução, mediação, consolidação e avaliação.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
