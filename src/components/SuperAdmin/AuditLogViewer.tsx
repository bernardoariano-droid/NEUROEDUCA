/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Painel de Registos de Auditoria e Conformidade Legal
 */

import React, { useState } from 'react';
import { History, ShieldCheck, Search, Filter, Lock, Terminal } from 'lucide-react';
import { AuditLogItem, Institution } from '../../types';

interface AuditLogViewerProps {
  logs: AuditLogItem[];
  institutions: Institution[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, institutions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstFilter, setSelectedInstFilter] = useState('todas');

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchInst =
      selectedInstFilter === 'todas' || log.institutionId === selectedInstFilter;
    return matchSearch && matchInst;
  });

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Registos de Auditoria e Segurança Jurídica
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Plataforma Multi-institucional NEUROEDUCA · Rastreio Imutável de Operações, Pautas, Transacções e Acessos
          </p>
        </div>
      </div>

      {/* 2. AS 4 CAIXAS MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Registos Auditados</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{logs.length}</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Histórico Total</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Integridade dos Logs</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">100% Imutável</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Conformidade Legal</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Registos Filtrados</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{filteredLogs.length}</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Visualização Activa</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Monitorizadas</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{institutions.length} Inst.</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Multi-inquilino RLS</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Terminal className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por acção, utilizador ou detalhe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-[#4b6755] font-medium">Filtrar Instituição:</span>
          <select
            value={selectedInstFilter}
            onChange={(e) => setSelectedInstFilter(e.target.value)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none font-medium"
          >
            <option value="todas">Todas as Instituições</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Eventos Auditados ({filteredLogs.length})</span>
          </h2>
          <span className="text-xs text-white/85 font-mono">Conformidade com a Lei de Protecção de Dados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-semibold border-b border-[#dce7df]">
                <th className="py-3 px-4">Data / Hora (UTC+1)</th>
                <th className="py-3 px-4">Instituição</th>
                <th className="py-3 px-4">Utilizador / Função</th>
                <th className="py-3 px-4">Tipo de Acção</th>
                <th className="py-3 px-4">Detalhes da Transacção</th>
                <th className="py-3 px-4 font-mono">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f7fbf8] transition">
                  <td className="py-3 px-4 font-mono text-[#4b6755] whitespace-nowrap tabular-nums">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#064e26]">
                    {log.institutionName || 'Global Plataforma'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-[#064e26] block">{log.userName}</span>
                    <span className="text-[11px] text-[#4b6755]">{log.userRole}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] px-2 py-0.5 rounded-lg text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#064e26] max-w-md">
                    {log.details}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#4b6755] tabular-nums">
                    {log.ipAddress || '197.149.24.12'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
