/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Módulos Específicos para Pré-Escolar, Educação Especial e Ensino Superior
 * Adapta a gestão pedagógica sem impor modelos genéricos ou pautas inadequadas
 */

import React, { useState } from 'react';
import {
  Baby,
  Activity,
  GraduationCap,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Award,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { Institution } from '../../types';

interface SubsystemSpecificViewsProps {
  currentInstitution: Institution;
}

export const SubsystemSpecificViews: React.FC<SubsystemSpecificViewsProps> = ({
  currentInstitution
}) => {
  const [activeSubsystemTab, setActiveSubsystemTab] = useState<'infantil' | 'especial' | 'superior'>(
    currentInstitution.subsystems.includes('centro_infantil') || currentInstitution.subsystems.includes('pre_escolar')
      ? 'infantil'
      : currentInstitution.subsystems.includes('superior')
      ? 'superior'
      : 'especial'
  );

  // Estado para controlo de recolha de crianças no Centro Infantil
  const [pickupRecords, setPickupRecords] = useState([
    {
      id: 'pk-01',
      childName: 'Ndalu Maria Santos (3 anos)',
      parentName: 'Manuel Santos (Pai)',
      authorizedPerson: 'Teresa Santos (Tia Materna)',
      biAuthorized: '007812903LA040',
      timeIn: '07:45',
      timeOut: '16:30',
      status: 'Entregue com Sucesso',
      meals: 'Pequeno-almoço e Almoço consumidos normalmente'
    },
    {
      id: 'pk-02',
      childName: 'Luena Francisco (2 anos)',
      parentName: 'Francisca Francisco (Mãe)',
      authorizedPerson: 'Avó Maria Helena',
      biAuthorized: '004112999LA030',
      timeIn: '08:00',
      timeOut: 'Pendente',
      status: 'Em Actividades Pedagógicas',
      meals: 'Sesta realizada (13h-15h)'
    }
  ]);

  // Estado para Plano Educativo Individualizado (PEI) na Educação Especial
  const [peiRecords, setPeiRecords] = useState([
    {
      id: 'pei-01',
      studentName: 'Mateus Kiala (7.ª Classe)',
      diagnosis: 'Deficiência Visual Parcial (Baixa Visão)',
      adaptations: 'Textos em fonte ampliada (24pt), iluminação direccional e tempo adicional de 30% nas provas',
      specialist: 'Psicopedagoga Helena Baptista',
      progressReport: 'Evolução notável na leitura e participação autónoma nas aulas de Língua Portuguesa.'
    },
    {
      id: 'pei-02',
      studentName: 'Zola Afonso (4.ª Classe)',
      diagnosis: 'Transtorno do Espectro do Autismo (Nível 1 de Suporte)',
      adaptations: 'Suporte visual por pictogramas, espaço de descompressão sensorial e mediação pedagógica individual',
      specialist: 'Terapeuta Ocupacional Dr. Rui Bento',
      progressReport: 'Excelente socialização nas actividades plásticas e musicais.'
    }
  ]);

  // Estado para Ensino Superior (Cadeiras, Créditos e Recurso)
  const [superiorSubjects, setSuperiorSubjects] = useState([
    {
      code: 'INF-301',
      name: 'Engenharia de Software II',
      faculty: 'Faculdade de Engenharia e Tecnologias',
      credits: 6,
      semester: '5.º Semestre',
      normalExams: '14 de Janeiro de 2027',
      recursoExams: '28 de Janeiro de 2027',
      professor: 'Prof. Doutor Carlos Bengue'
    },
    {
      code: 'INF-302',
      name: 'Sistemas Distribuídos e Redes',
      faculty: 'Faculdade de Engenharia e Tecnologias',
      credits: 6,
      semester: '5.º Semestre',
      normalExams: '18 de Janeiro de 2027',
      recursoExams: '02 de Fevereiro de 2027',
      professor: 'Mestre Neusa Kanza'
    }
  ]);

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Módulos Específicos por Subsistema
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Plataforma Multi-institucional NEUROEDUCA · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>
      </div>

      {/* 2. AS 4 CAIXAS MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Centro Infantil</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">Pré-Escolar</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Avaliação Descritiva Sem Notas</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Baby className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Educação Inclusiva</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">P.E.I.</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Plano Educativo Individualizado</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Universitário &amp; Politécnico</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">Superior</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Cadeiras, Créditos &amp; Recurso</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Formação Profissional</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">Técnico</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Estágios Curriculares &amp; PAP</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Selector de Módulo Específico */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubsystemTab('infantil')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubsystemTab === 'infantil'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>Centro Infantil &amp; Pré-Escolar (Segurança &amp; Recolha)</span>
          </button>

          <button
            onClick={() => setActiveSubsystemTab('especial')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubsystemTab === 'especial'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Educação Especial (PEI &amp; Adaptações)</span>
          </button>

          <button
            onClick={() => setActiveSubsystemTab('superior')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubsystemTab === 'superior'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] hover:bg-[#eaf6ee] border border-[#cde6d5]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Ensino Superior (Créditos &amp; Época de Recurso)</span>
          </button>
        </div>
      </div>

      {/* 1. MÓDULO CENTRO INFANTIL */}
      {activeSubsystemTab === 'infantil' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <Baby className="w-5 h-5" />
                  <span>Controlo de Segurança: Entrada, Saída e Autorizados de Recolha</span>
                </h3>
                <p className="text-xs text-white/85">
                  Protecção reforçada de menores com verificação de documento de identificação da pessoa autorizada
                </p>
              </div>
              <span className="text-xs bg-white/15 text-white font-semibold px-3 py-1 rounded-lg border border-white/25 self-start sm:self-auto">
                Registo Diário Obrigatório
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-semibold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Criança / Idade</th>
                    <th className="py-3 px-4">Encarregado Principal</th>
                    <th className="py-3 px-4">Pessoa Autorizada para Recolha</th>
                    <th className="py-3 px-4">BI da Pessoa Autorizada</th>
                    <th className="py-3 px-4 text-center">Horário (Entrada/Saída)</th>
                    <th className="py-3 px-4">Alimentação &amp; Cuidados</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
                  {pickupRecords.map((pk) => (
                    <tr key={pk.id} className="hover:bg-[#f7fbf8] transition">
                      <td className="py-3 px-4 font-bold text-[#064e26]">{pk.childName}</td>
                      <td className="py-3 px-4 text-[#4b6755]">{pk.parentName}</td>
                      <td className="py-3 px-4 font-semibold text-[#055827] bg-[#eaf6ee]/60">
                        {pk.authorizedPerson}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#064e26]">{pk.biAuthorized}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#064e26] tabular-nums">
                        {pk.timeIn} → {pk.timeOut}
                      </td>
                      <td className="py-3 px-4 text-[#4b6755] text-[11px] max-w-xs">{pk.meals}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            pk.timeOut !== 'Pendente'
                              ? 'bg-[#eaf6ee] text-[#055827] border border-[#cde6d5]'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {pk.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MÓDULO EDUCAÇÃO ESPECIAL */}
      {activeSubsystemTab === 'especial' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>Planos Educativos Individualizados (PEI) &amp; Inclusão Escolar</span>
                </h3>
                <p className="text-xs text-white/85">
                  Acompanhamento de adaptações curriculares, Língua Gestual Angolana (LGA) e Sistema Braille
                </p>
              </div>
              <span className="text-xs bg-white/15 text-white font-semibold px-3 py-1 rounded-lg border border-white/25 self-start sm:self-auto">
                Confidencialidade Médica &amp; Pedagógica
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {peiRecords.map((pei) => (
                <div
                  key={pei.id}
                  className="bg-[#f7fbf8] rounded-xl p-4 border border-[#cde6d5] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-[#064e26] text-sm">{pei.studentName}</strong>
                    <span className="bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                      PEI Activo
                    </span>
                  </div>

                  <div>
                    <span className="text-[#4b6755] block font-semibold">Diagnóstico Pedagógico:</span>
                    <p className="text-[#064e26] font-medium">{pei.diagnosis}</p>
                  </div>

                  <div>
                    <span className="text-[#4b6755] block font-semibold">Adaptações Curriculares Aprovadas:</span>
                    <p className="text-[#064e26] bg-white p-2.5 rounded-xl border border-[#cde6d5] mt-1">
                      {pei.adaptations}
                    </p>
                  </div>

                  <div>
                    <span className="text-[#4b6755] block font-semibold">Relatório de Evolução:</span>
                    <p className="text-[#4b6755] italic">{pei.progressReport}</p>
                  </div>

                  <div className="pt-2 border-t border-[#cde6d5] text-[11px] text-[#4b6755]">
                    Especialista Responsável: <strong className="text-[#064e26]">{pei.specialist}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MÓDULO ENSINO SUPERIOR */}
      {activeSubsystemTab === 'superior' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-base flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5" />
                  <span>Gestão Académica Universitária (MESCTI)</span>
                </h3>
                <p className="text-xs text-white/85">
                  Unidades Curriculares Semestrais, Sistema de Créditos (ECTS) e Gestão de Época de Recurso
                </p>
              </div>
              <span className="text-xs bg-white/15 text-white font-semibold px-3 py-1 rounded-lg border border-white/25 self-start sm:self-auto">
                Lei nº 31/20 - Ensino Superior
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-semibold border-b border-[#dce7df]">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Unidade Curricular</th>
                    <th className="py-3 px-4">Faculdade / Unidade Orgânica</th>
                    <th className="py-3 px-4 text-center">Créditos</th>
                    <th className="py-3 px-4 text-center">Semestre</th>
                    <th className="py-3 px-4">Época Normal</th>
                    <th className="py-3 px-4">Época de Recurso</th>
                    <th className="py-3 px-4">Docente Regente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
                  {superiorSubjects.map((sb) => (
                    <tr key={sb.code} className="hover:bg-[#f7fbf8] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#067836]">{sb.code}</td>
                      <td className="py-3 px-4 font-bold text-[#064e26]">{sb.name}</td>
                      <td className="py-3 px-4 text-[#4b6755]">{sb.faculty}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#064e26] tabular-nums">
                        {sb.credits} ECTS
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{sb.semester}</td>
                      <td className="py-3 px-4 text-[#064e26]">{sb.normalExams}</td>
                      <td className="py-3 px-4 text-amber-800 font-semibold bg-amber-50/50">
                        {sb.recursoExams}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#064e26]">{sb.professor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
