/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Planos de Subscrição SaaS da Plataforma (Moeda: Kwanza - AOA)
 */

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Building2,
  Check
} from 'lucide-react';
import { SubscriptionPlan, Institution } from '../../types';
import { formatKwanza } from '../../utils/currency';

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[];
  institutions: Institution[];
  onUpdatePlanPrice?: (planId: string, newPrice: number) => void;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  plans,
  institutions
}) => {
  const [selectedCycle, setSelectedCycle] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');

  // Cálculo de receita estimada anual da plataforma em Kwanza
  const estimatedMonthlyRevenue = institutions.reduce((total, inst) => {
    // Estimativa com base no número de turmas
    return total + (inst.maxClasses * 4000);
  }, 0);

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Planos e Subscrições da Plataforma
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Modelo Comercial SaaS Multi-Institucional NEUROEDUCA · Moeda Oficial Kwanza (AOA/Kz)
          </p>
        </div>
      </div>

      {/* 2. AS 4 CAIXAS MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Receita Mensal Est.</p>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">
              {formatKwanza(estimatedMonthlyRevenue)}
            </div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Rede Multi-institucional</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Planos Activos</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{plans.length} Modelos</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Essencial, Pro e Rede</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Preço Médio / Turma</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">4.000 Kz</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Escala Escalável SaaS</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Ciclos Disponíveis</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">3 Ciclos</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Até 20% Desconto Anual</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Selector de Ciclo de Facturação */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#064e26] uppercase tracking-wider">
          Seleccionar Ciclo de Facturação:
        </span>
        <div className="bg-[#f7fbf8] p-1 rounded-xl border border-[#cde6d5] flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCycle('mensal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedCycle === 'mensal'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'text-[#4b6755] hover:text-[#064e26]'
            }`}
          >
            Mensalidade
          </button>
          <button
            onClick={() => setSelectedCycle('trimestral')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedCycle === 'trimestral'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'text-[#4b6755] hover:text-[#064e26]'
            }`}
          >
            Trimestralidade (-10%)
          </button>
          <button
            onClick={() => setSelectedCycle('anual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedCycle === 'anual'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'text-[#4b6755] hover:text-[#064e26]'
            }`}
          >
            Anualidade (-20%)
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          let multiplier = 1;
          if (selectedCycle === 'trimestral') multiplier = 3 * 0.9;
          if (selectedCycle === 'anual') multiplier = 12 * 0.8;

          const calculatedPrice = plan.priceAoa * multiplier;
          const isHighlighted = plan.id.includes('pro') || plan.id.includes('trimestral');

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border shadow-[0_2px_10px_rgba(2,44,22,0.04)] relative flex flex-col justify-between ${
                isHighlighted
                  ? 'border-[#16a34a] ring-2 ring-[#16a34a]/20'
                  : 'border-[#dce7df]'
              }`}
            >
              {plan.id.includes('pro') && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#067836] to-[#149a45] text-white text-[10px] font-extrabold uppercase px-3.5 py-0.5 rounded-full shadow-sm">
                  Mais Popular em Angola
                </span>
              )}

              <div>
                <h3 className="text-lg font-extrabold text-[#064e26]">{plan.name}</h3>
                <p className="text-xs text-[#4b6755] mt-1">
                  Ideal para escolas com até {plan.maxClasses} turmas em funcionamento
                </p>

                <div className="mt-4 mb-6 pb-6 border-b border-[#eaf2ec]">
                  <div className="text-3xl font-black text-[#064e26] tabular-nums">
                    {formatKwanza(calculatedPrice)}
                  </div>
                  <div className="text-xs text-[#4b6755] mt-0.5">
                    Cobrado no ciclo {selectedCycle} ({formatKwanza(plan.pricePerClassAoa)} / turma adicional)
                  </div>
                </div>

                <div className="space-y-2.5 mb-6 text-xs text-[#064e26]">
                  <span className="font-bold text-[#064e26] block text-xs mb-2">
                    Funcionalidades incluídas:
                  </span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#eaf2ec]">
                <div className="text-[11px] text-[#4b6755] flex items-center justify-between mb-2">
                  <span>Limite de Turmas</span>
                  <span className="font-bold text-[#064e26] tabular-nums">{plan.maxClasses} turmas</span>
                </div>
                <div className="text-[11px] text-[#4b6755] flex items-center justify-between">
                  <span>Isolamento RLS</span>
                  <span className="font-bold text-[#067836]">Garantido por Supabase</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de Monitorização de Subscrições Activas */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Estado das Subscrições Institucionais em Angola</span>
            </h3>
            <p className="text-xs text-white/85 mt-0.5">
              Acompanhamento de turmas contratadas vs. turmas utilizadas e prazos de validade
            </p>
          </div>
          <span className="text-xs bg-white/15 text-white font-semibold px-3 py-1 rounded-lg border border-white/25 self-start sm:self-auto tabular-nums">
            {institutions.length} Contratos Registados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-semibold border-b border-[#dce7df]">
                <th className="py-3 px-4">Instituição</th>
                <th className="py-3 px-4">Província</th>
                <th className="py-3 px-4">Plano Contratado</th>
                <th className="py-3 px-4 text-center">Turmas Contratadas</th>
                <th className="py-3 px-4 text-center">Ciclo / Vencimento</th>
                <th className="py-3 px-4 text-center">Valor Mensal</th>
                <th className="py-3 px-4 text-center">Estado da Subscrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
              {institutions.map((inst) => {
                const isOverLimit = inst.currentClassesCount > inst.maxClasses;
                const monthlyValue = inst.maxClasses * 4000;
                return (
                  <tr key={inst.id} className="hover:bg-[#f7fbf8] transition">
                    <td className="py-3 px-4 font-bold text-[#064e26]">
                      {inst.name}
                      <span className="block text-[11px] font-mono text-[#4b6755] font-normal">
                        {inst.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#4b6755]">{inst.province}</td>
                    <td className="py-3 px-4 font-medium text-[#064e26]">
                      {inst.maxClasses > 30 ? 'Plano Anual Rede' : 'Plano Institucional'}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      <span className={`font-bold ${isOverLimit ? 'text-red-600' : 'text-[#064e26]'}`}>
                        {inst.currentClassesCount} / {inst.maxClasses}
                      </span>
                      {isOverLimit && (
                        <span className="block text-[10px] text-red-500 font-semibold">Excedeu Limite</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-[#4b6755] tabular-nums">
                      <div>31/12/2026</div>
                      <span className="text-[10px] text-[#4b6755]/80">Renovação Automática</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#064e26] tabular-nums">
                      {formatKwanza(monthlyValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                          inst.status === 'active'
                            ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {inst.status === 'active' ? 'Subscrição Regular' : 'Suspensa'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
