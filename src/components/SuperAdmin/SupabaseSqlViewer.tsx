/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Centro de Gestão de Dados: Armazenamento Local & Supabase
 * Gerencia persistência local no navegador, backups e sincronização bidireccional na nuvem
 */

import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  Zap,
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  EyeOff
} from 'lucide-react';
import { storageService, StorageStats, StorageDataBundle } from '../../services/storageService';
import {
  fetchServerSupabaseStatus,
  getSupabaseConfig,
  normalizeSupabaseUrlSafe,
  pullSupabaseDataToLocal,
  saveSupabaseConfig,
  ServerSupabaseStatus,
  SupabaseConfig,
  SupabaseHealthResult,
  SupabaseSyncPullResult,
  SupabaseSyncPushResult,
  syncLocalDataToSupabase,
  testSupabaseConnection
} from '../../lib/supabaseClient';
import { NEUROEDUCA_SUPABASE_SYNC_SQL } from '../../lib/supabaseSchemaSql';
import { NEUROEDUCA_ENTITY_TABLES } from '../../lib/supabaseSyncCore';

interface SupabaseSqlViewerProps {
  onDataReset?: () => void;
  onDataRestored?: (bundle: StorageDataBundle) => void;
}

export const SupabaseSqlViewer: React.FC<SupabaseSqlViewerProps> = ({
  onDataReset,
  onDataRestored
}) => {
  const [activeTab, setActiveTab] = useState<'storage' | 'supabase_sync' | 'ddl_schema' | 'sql_inserts'>('supabase_sync');

  // Estado das Estatísticas de Armazenamento Local
  const [stats, setStats] = useState<StorageStats>(() => storageService.getStorageStats());
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedInserts, setCopiedInserts] = useState(false);

  // Estado de Configuração do Supabase
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getSupabaseConfig());
  const [serverStatus, setServerStatus] = useState<ServerSupabaseStatus>({
    serverConfigured: false,
    urlHost: null,
    normalizedUrl: ''
  });
  const [showKey, setShowKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<SupabaseHealthResult | null>(null);

  // Estado de Sincronização Bidireccional (Push & Pull)
  const [isSyncingPush, setIsSyncingPush] = useState(false);
  const [isSyncingPull, setIsSyncingPull] = useState(false);
  const [pushResult, setPushResult] = useState<SupabaseSyncPushResult | null>(null);
  const [pullResult, setPullResult] = useState<SupabaseSyncPullResult | null>(null);

  // Notificações locais
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const refreshStats = () => {
    setStats(storageService.getStorageStats());
  };

  useEffect(() => {
    refreshStats();
    fetchServerSupabaseStatus().then((status) => {
      setServerStatus(status);
    });
  }, []);

  const generatedSqlInserts = storageService.generateSupabaseSqlInserts();

  const hasAnyCredentials = Boolean(
    (supabaseConfig.url && supabaseConfig.anonKey) || serverStatus.serverConfigured
  );

  // Testar Conexão e Verificar Tabelas no Supabase
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    setActionError(null);

    const normalizedUrl = normalizeSupabaseUrlSafe(supabaseConfig.url);
    if (normalizedUrl !== supabaseConfig.url) {
      const updated = saveSupabaseConfig({ ...supabaseConfig, url: normalizedUrl });
      setSupabaseConfig(updated);
    }

    const result = await testSupabaseConnection(normalizedUrl, supabaseConfig.anonKey);
    setIsTestingConnection(false);
    setConnectionResult(result);

    if (result.success) {
      const updatedConfig = saveSupabaseConfig({
        ...supabaseConfig,
        url: result.normalizedUrl || normalizedUrl,
        isConnected: true,
        syncStatusMessage: result.message
      });
      setSupabaseConfig(updatedConfig);
    }
  };

  // Guardar Configuração
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = saveSupabaseConfig(supabaseConfig);
    setSupabaseConfig(saved);
    setActionNotice(
      'Credenciais do Supabase normalizadas e guardadas com sucesso neste navegador!'
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleToggleAutoSync = () => {
    const nextValue = !supabaseConfig.autoSync;
    const saved = saveSupabaseConfig({
      ...supabaseConfig,
      autoSync: nextValue
    });
    setSupabaseConfig(saved);
    setActionNotice(
      nextValue
        ? 'Sincronização automática activada: alterações locais serão enviadas para o Supabase em tempo real.'
        : 'Sincronização automática desactivada. Utilize os botões manuais Push / Pull quando desejar.'
    );
    setTimeout(() => setActionNotice(null), 4500);
  };

  // Enviar dados locais para o Supabase (Push)
  const handleSyncToSupabase = async () => {
    setIsSyncingPush(true);
    setPushResult(null);
    setPullResult(null);
    setActionError(null);

    const normalizedUrl = normalizeSupabaseUrlSafe(supabaseConfig.url);
    if (normalizedUrl && normalizedUrl !== supabaseConfig.url) {
      const saved = saveSupabaseConfig({ ...supabaseConfig, url: normalizedUrl });
      setSupabaseConfig(saved);
    } else {
      saveSupabaseConfig(supabaseConfig);
    }

    const currentBundle = storageService.initializeStorage();
    const result = await syncLocalDataToSupabase(currentBundle);
    setIsSyncingPush(false);
    setPushResult(result);
    setSupabaseConfig(getSupabaseConfig());

    // Actualizar diagnóstico de tabelas após push
    if (result.success) {
      const health = await testSupabaseConnection(
        supabaseConfig.url,
        supabaseConfig.anonKey
      );
      setConnectionResult(health);
    }
  };

  // Importar dados do Supabase para o dispositivo local (Pull)
  const handlePullFromSupabase = async () => {
    setIsSyncingPull(true);
    setPullResult(null);
    setPushResult(null);
    setActionError(null);

    saveSupabaseConfig(supabaseConfig);
    const result = await pullSupabaseDataToLocal();
    setIsSyncingPull(false);
    setPullResult(result);
    setSupabaseConfig(getSupabaseConfig());

    if (result.success && result.bundle) {
      const currentLocal = storageService.initializeStorage();
      const mergedBundle: StorageDataBundle = {
        ...currentLocal,
        institutions:
          Array.isArray(result.bundle.institutions) && result.bundle.institutions.length > 0
            ? result.bundle.institutions
            : currentLocal.institutions,
        classes: Array.isArray(result.bundle.classes)
          ? result.bundle.classes
          : currentLocal.classes,
        subjects: Array.isArray(result.bundle.subjects)
          ? result.bundle.subjects
          : currentLocal.subjects,
        students: Array.isArray(result.bundle.students)
          ? result.bundle.students
          : currentLocal.students,
        teachers: Array.isArray(result.bundle.teachers)
          ? result.bundle.teachers
          : currentLocal.teachers,
        grades: Array.isArray(result.bundle.grades)
          ? result.bundle.grades
          : currentLocal.grades,
        invoices: Array.isArray(result.bundle.invoices)
          ? result.bundle.invoices
          : currentLocal.invoices,
        attendance: Array.isArray(result.bundle.attendance)
          ? result.bundle.attendance
          : currentLocal.attendance,
        digitalArchive: Array.isArray(result.bundle.digitalArchive)
          ? result.bundle.digitalArchive
          : currentLocal.digitalArchive,
        financialNotifications: Array.isArray(result.bundle.financialNotifications)
          ? result.bundle.financialNotifications
          : currentLocal.financialNotifications,
        announcements: Array.isArray(result.bundle.announcements)
          ? result.bundle.announcements
          : currentLocal.announcements,
        schoolUsers:
          Array.isArray(result.bundle.schoolUsers) && result.bundle.schoolUsers.length > 0
            ? result.bundle.schoolUsers
            : currentLocal.schoolUsers,
        accounts:
          Array.isArray(result.bundle.accounts) && result.bundle.accounts.length > 0
            ? result.bundle.accounts
            : currentLocal.accounts,
        subscriptionPlans:
          Array.isArray(result.bundle.subscriptionPlans) &&
          result.bundle.subscriptionPlans.length > 0
            ? result.bundle.subscriptionPlans
            : currentLocal.subscriptionPlans,
        auditLogs: Array.isArray(result.bundle.auditLogs)
          ? result.bundle.auditLogs
          : currentLocal.auditLogs
      };

      storageService.saveAll(mergedBundle);
      refreshStats();
      if (onDataRestored) {
        onDataRestored(mergedBundle);
      }
      setActionNotice(
        `Sincronização concluída: ${result.pulledCount} registos carregados do Supabase para a aplicação!`
      );
      setTimeout(() => setActionNotice(null), 5000);
    } else if (result.success && !result.bundle) {
      setActionNotice(
        'As tabelas do Supabase estão prontas mas ainda vazias. Utilize "Enviar Dados para Supabase (Push)" para enviar os dados iniciais.'
      );
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Descarregar Backup JSON
  const handleDownloadBackup = () => {
    const json = storageService.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroeduca_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionNotice('Backup JSON descarregado com sucesso!');
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Importar Backup JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storageService.importBackupJson(content);
      if (success) {
        refreshStats();
        setActionNotice('Dados restaurados com sucesso a partir do ficheiro de backup!');
        const updatedBundle = storageService.initializeStorage();
        if (onDataRestored) {
          onDataRestored(updatedBundle);
        }
      } else {
        setActionError('Erro ao importar backup: formato de ficheiro JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  // Restaurar dados padrão de demonstração
  const handleConfirmResetToDefaults = () => {
    storageService.resetToDefaults();
    refreshStats();
    setConfirmReset(false);
    setActionNotice('Dados de demonstração restaurados com sucesso!');
    if (onDataReset) {
      onDataReset();
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(NEUROEDUCA_SUPABASE_SYNC_SQL);
    setCopiedSql(true);
    setActionNotice('Script SQL completo (16 tabelas + RLS) copiado para a área de transferência!');
    setTimeout(() => {
      setCopiedSql(false);
      setActionNotice(null);
    }, 3000);
  };

  const handleCopyInserts = () => {
    navigator.clipboard.writeText(generatedSqlInserts);
    setCopiedInserts(true);
    setTimeout(() => setCopiedInserts(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight flex items-center space-x-2">
            <span>Integração Supabase PostgreSQL &amp; Armazenamento</span>
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Sincronização bidireccional com a nuvem Supabase (15 módulos + auditoria), persistência local e cópias de segurança
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {serverStatus.serverConfigured && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
              <Cloud className="w-3.5 h-3.5 text-sky-600" />
              <span>Servidor Ligado: {serverStatus.urlHost}</span>
            </span>
          )}
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-[#067836]" />
            <span>Armazenamento Local Activo</span>
          </span>
        </div>
      </div>

      {/* Alerta de Acções */}
      {actionNotice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#067836] shrink-0" />
          <span className="font-semibold">{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2 animate-fade-in shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold">{actionError}</span>
        </div>
      )}

      {/* 2. AS 4 CAIXAS MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Caixa 1: Volume de Dados Locais */}
        <div
          onClick={() => setActiveTab('storage')}
          className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#16a34a] transition"
        >
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Armazenamento Local</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">
              {stats.approxSizeKb} <span className="text-sm font-normal text-[#4b6755]">KB</span>
            </div>
            <p className="text-[11px] text-[#055827] font-medium mt-1 truncate">
              {stats.studentsCount + stats.classesCount + stats.invoicesCount} Registos Principais
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Caixa 2: Supabase PostgreSQL */}
        <div
          onClick={() => setActiveTab('supabase_sync')}
          className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#16a34a] transition"
        >
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Nuvem Supabase</p>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">
              {supabaseConfig.isConnected || serverStatus.serverConfigured ? 'CONECTADO' : 'CONFIGURAR'}
            </div>
            <p className="text-[11px] text-[#055827] font-medium mt-1 truncate">
              {supabaseConfig.autoSync ? 'Auto-Sync Activo' : 'Sincronização Manual'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Cloud className="w-5 h-5" />
          </div>
        </div>

        {/* Caixa 3: 16 Tabelas SQL */}
        <div
          onClick={() => setActiveTab('ddl_schema')}
          className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#16a34a] transition"
        >
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Tabelas de Sincronização</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">
              {connectionResult ? `${connectionResult.tablesReady}/15` : '16'}
            </div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Ver Script SQL DDL</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Caixa 4: INSERTs SQL */}
        <div
          onClick={() => setActiveTab('sql_inserts')}
          className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#16a34a] transition"
        >
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Exportar SQL</p>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#064e26] mt-1">SQL INSERT</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Gerar Comandos</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <FileCode className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEPARADORES DE NAVEGAÇÃO DO CENTRO DE DADOS */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('supabase_sync')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'supabase_sync'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] border border-[#cde6d5] hover:bg-[#eaf6ee]'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>1. Conexão &amp; Sincronização Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('ddl_schema')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'ddl_schema'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] border border-[#cde6d5] hover:bg-[#eaf6ee]'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>2. Script SQL de Criação (16 Tabelas)</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] border border-[#cde6d5] hover:bg-[#eaf6ee]'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>3. Gestão do Armazenamento Local</span>
          </button>

          <button
            onClick={() => setActiveTab('sql_inserts')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === 'sql_inserts'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'bg-[#f7fbf8] text-[#064e26] border border-[#cde6d5] hover:bg-[#eaf6ee]'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>4. Gerador de INSERTs SQL</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          ABA 1: CONEXÃO & SINCRONIZAÇÃO SUPABASE
          ========================================================= */}
      {activeTab === 'supabase_sync' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <Cloud className="w-5 h-5 text-white shrink-0" />
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider">
                    Conexão em Tempo Real com Projecto Supabase
                  </h2>
                  <p className="text-xs text-white/85">
                    Aceita URL do projecto (com ou sem <code>/rest/v1/</code>) e chaves <code>sb_publishable_...</code> ou JWT <code>anon</code>.
                  </p>
                </div>
              </div>

              {supabaseConfig.lastSyncAt && (
                <span className="text-[11px] bg-white/15 px-3 py-1 rounded-lg font-semibold">
                  Última sincronização: {new Date(supabaseConfig.lastSyncAt).toLocaleString('pt-AO')}
                </span>
              )}
            </div>

            <div className="p-5 space-y-5">
              {serverStatus.serverConfigured && (
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Credenciais Supabase Detectadas nas Variáveis do Servidor ({serverStatus.urlHost})
                    </span>
                    <span>
                      A aplicação já consegue testar, enviar (Push) e importar (Pull) dados directamente pelo servidor seguro mesmo sem preencher os campos abaixo.
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#064e26] mb-1">
                      URL do Projecto Supabase (SUPABASE_URL):
                    </label>
                    <input
                      type="text"
                      placeholder="https://seuprojecto.supabase.co"
                      value={supabaseConfig.url}
                      onChange={(e) =>
                        setSupabaseConfig({ ...supabaseConfig, url: e.target.value })
                      }
                      onBlur={() =>
                        setSupabaseConfig((prev) => ({
                          ...prev,
                          url: normalizeSupabaseUrlSafe(prev.url)
                        }))
                      }
                      className="w-full bg-[#f7fbf8] border border-[#cde6d5] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#064e26] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                    />
                    <span className="text-[11px] text-[#4b6755] mt-1 block">
                      Se colar com <code>/rest/v1/</code>, o sistema normaliza automaticamente.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#064e26] mb-1">
                      Chave Pública (SUPABASE_ANON_KEY / Publishable):
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        placeholder="sb_publishable_... ou eyJ..."
                        value={supabaseConfig.anonKey}
                        onChange={(e) =>
                          setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value.trim() })
                        }
                        className="w-full bg-[#f7fbf8] border border-[#cde6d5] rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono text-[#064e26] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4b6755] hover:text-[#064e26] cursor-pointer"
                        title={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-[#4b6755] mt-1 block">
                      Project Settings &gt; API &gt; Publishable / Anon Public Key.
                    </span>
                  </div>
                </div>

                {/* Toggle Auto-Sync */}
                <div className="p-3.5 bg-[#f7fbf8] border border-[#cde6d5] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#064e26]">
                      Sincronização Automática em Background (Auto-Sync)
                    </p>
                    <p className="text-[11px] text-[#4b6755]">
                      Quando activa, novas matrículas, notas, facturas e comunicados são sincronizados automaticamente para o Supabase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoSync}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      supabaseConfig.autoSync
                        ? 'bg-[#067836] text-white shadow-sm'
                        : 'bg-white border border-[#cde6d5] text-[#064e26] hover:bg-[#eaf6ee]'
                    }`}
                  >
                    {supabaseConfig.autoSync ? 'Auto-Sync: ACTIVO' : 'Auto-Sync: Desactivado'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="submit"
                    className="bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Guardar Credenciais
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !hasAnyCredentials}
                    className="bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer flex items-center space-x-1.5"
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>A verificar conexão &amp; tabelas...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Testar Conexão &amp; Tabelas</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={isSyncingPush || !hasAnyCredentials}
                    className="bg-[#1d8cf8] hover:bg-[#1474d4] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer flex items-center space-x-1.5"
                  >
                    {isSyncingPush ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>A enviar para o Supabase...</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                        <span>Enviar Dados para Supabase (Push)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSupabase}
                    disabled={isSyncingPull || !hasAnyCredentials}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer flex items-center space-x-1.5"
                  >
                    {isSyncingPull ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>A importar do Supabase...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Importar Dados do Supabase (Pull)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Feedback do Teste de Conexão & Diagnóstico das 15 Tabelas */}
              {connectionResult && (
                <div className="space-y-3">
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 animate-fade-in ${
                      connectionResult.success
                        ? connectionResult.missingTables.length > 0
                          ? 'bg-amber-50 border-amber-200 text-amber-950'
                          : 'bg-[#eaf6ee] border-[#cde6d5] text-[#064e26]'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {connectionResult.success ? (
                        connectionResult.missingTables.length > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                        )
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold block">
                          {connectionResult.success
                            ? connectionResult.missingTables.length > 0
                              ? 'Ligação Verificada — Falta Criar Tabelas no Supabase'
                              : 'Conexão Supabase Verificada!'
                            : 'Erro na Conexão Supabase:'}
                        </span>
                        <span>{connectionResult.message}</span>
                      </div>
                    </div>

                    {connectionResult.missingTables.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Script SQL (16 Tabelas)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('ddl_schema')}
                          className="bg-white border border-amber-300 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Abrir SQL
                        </button>
                      </div>
                    )}
                  </div>

                  {connectionResult.tableDetails.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {connectionResult.tableDetails.map((tbl) => (
                          <div
                            key={tbl.table}
                            className={`p-2.5 rounded-xl border text-[11px] ${
                              tbl.exists
                                ? 'bg-[#f7fbf8] border-[#cde6d5] text-[#064e26]'
                                : 'bg-amber-50/70 border-amber-200 text-amber-900'
                            }`}
                          >
                            <div className="font-bold truncate">{tbl.label}</div>
                            <div className="font-mono text-[10px] opacity-75 truncate">{tbl.table}</div>
                            <div className="mt-1 font-extrabold tabular-nums">
                              {tbl.exists ? `${tbl.rowCount} registo(s)` : 'Tabela pendente'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                          connectionResult.storageBucketReady
                            ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#064e26]'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Cloud className="w-4 h-4 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold block truncate">
                              Supabase Storage — Bucket: {connectionResult.storageBucketName || 'neuroeduca-student-docs'}
                            </span>
                            <span className="text-[10px] opacity-80 block">
                              Armazena Fotografias, BI, Certidões de Nascimento e Cartões de Vacinas dos alunos
                            </span>
                          </div>
                        </div>
                        <span className="font-extrabold shrink-0">
                          {connectionResult.storageBucketReady ? 'Bucket activo' : 'Bucket pendente (execute SQL)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback da Sincronização Push */}
              {pushResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 animate-fade-in ${
                    pushResult.success
                      ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#064e26]'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between gap-2 tabular-nums">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                      <span>
                        Push Supabase: {pushResult.syncedCount} registos enviados com sucesso!
                      </span>
                    </div>
                    {pushResult.missingTables.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg cursor-pointer"
                      >
                        Copiar SQL das Tabelas
                      </button>
                    )}
                  </div>
                  {pushResult.errors.length > 0 && (
                    <div className="text-red-700 text-[11px]">
                      <ul className="list-disc list-inside space-y-0.5">
                        {pushResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback da Sincronização Pull */}
              {pullResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fade-in ${
                    pullResult.success
                      ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#064e26]'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5 tabular-nums">
                    <CheckCircle2 className="w-4 h-4 text-[#7c3aed]" />
                    <span>
                      Pull Supabase: {pullResult.pulledCount} registos lidos da nuvem!
                    </span>
                  </div>
                  {pullResult.errors.length > 0 && (
                    <div className="text-red-700 text-[11px]">
                      <ul className="list-disc list-inside space-y-0.5">
                        {pullResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Guia rápido de activação */}
              <div className="p-4 bg-[#f7fbf8] border border-[#cde6d5] rounded-xl text-xs text-[#064e26] space-y-1.5">
                <p className="font-bold text-[#055827]">
                  Passos para concluir a integração no seu projecto Supabase:
                </p>
                <p>
                  1. Copie o script completo na aba <strong>2. Script SQL de Criação (16 Tabelas)</strong> e execute-o no <strong>SQL Editor</strong> do seu painel Supabase.
                </p>
                <p>
                  2. Cole o <strong>URL</strong> e a <strong>Chave Pública</strong> acima (ou defina <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> em Settings &gt; Secrets) e clique em <strong>Testar Conexão &amp; Tabelas</strong>.
                </p>
                <p>
                  3. Clique em <strong>Enviar Dados para Supabase (Push)</strong> para gravar todas as escolas, turmas, alunos, notas, facturas e comunicados na nuvem, e active o <strong>Auto-Sync</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          ABA 2: SCRIPT SQL DE CRIAÇÃO COMPLETO (16 TABELAS)
          ========================================================= */}
      {activeTab === 'ddl_schema' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#064e26] uppercase flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[#067836]" />
                <span>Script SQL Oficial de Sincronização (16 Tabelas + RLS)</span>
              </h2>
              <p className="text-xs text-[#4b6755] mt-0.5">
                Copie e execute este script no <strong>SQL Editor</strong> do Supabase para activar todas as {NEUROEDUCA_ENTITY_TABLES.length} colecções da plataforma.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                onClick={handleCopySql}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition cursor-pointer"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Script SQL Copiado!' : 'Copiar Script SQL Completo'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-slate-400 ml-2">/supabase-neuroeduca-sync.sql (PostgreSQL 15+)</span>
              </div>
              <span className="text-emerald-400 font-mono">RLS &amp; PostgREST Reload Incluídos</span>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[540px]">
              <code>{NEUROEDUCA_SUPABASE_SYNC_SQL}</code>
            </pre>
          </div>
        </div>
      )}

      {/* =========================================================
          ABA 3: GESTÃO DO ARMAZENAMENTO LOCAL
          ========================================================= */}
      {activeTab === 'storage' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold uppercase flex items-center space-x-2">
                  <HardDrive className="w-4 h-4" />
                  <span>Estado da Base de Dados Local (LocalStorage)</span>
                </h2>
                <p className="text-xs text-white/85 mt-0.5">
                  Os dados operam em tempo real no seu dispositivo, com cópia de segurança JSON e sincronização Supabase.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center space-x-1.5 bg-white text-[#064e26] hover:bg-[#eaf6ee] text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition cursor-pointer"
                  title="Fazer backup de todos os dados em ficheiro JSON"
                >
                  <Download className="w-3.5 h-3.5 text-[#067836]" />
                  <span>Descarregar Backup JSON</span>
                </button>

                <label className="inline-flex items-center space-x-1.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restaurar Ficheiro JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center space-x-1.5 min-h-[36px] bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                  title="Restaurar dados iniciais de demonstração"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Dados Demo</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {confirmReset && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-900">
                  <span className="font-semibold">
                    Tem a certeza que deseja restaurar os dados padrão de demonstração?
                  </span>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResetToDefaults}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Confirmar Reposição
                    </button>
                  </div>
                </div>
              )}

              {/* Grelha de Contadores Detalhados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Instituições Registadas</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.institutionsCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Complexos e Escolas</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Turmas Criadas</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.classesCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Classes e Turnos</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Alunos Matriculados</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.studentsCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Processos Activos</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Docentes / Professores</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.teachersCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Corpo Pedagógico</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Notas &amp; Mini-Pautas</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.gradesCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Lançamentos INIDE</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Facturas &amp; Propinas</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.invoicesCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Multicaixa Express</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Utilizadores do Sistema</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.schoolUsersCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Direcção e Secretaria</span>
                </div>

                <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#cde6d5] text-[#064e26]">
                  <span className="text-[10px] uppercase font-bold text-[#4b6755] block">Registos de Auditoria</span>
                  <span className="text-xl font-black text-[#064e26] tabular-nums">{stats.auditLogsCount}</span>
                  <span className="text-[10px] text-[#4b6755] block mt-0.5">Trilhas de Segurança</span>
                </div>
              </div>

              <div className="p-4 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#064e26] space-y-2">
                <div className="flex items-center space-x-2 font-bold text-[#055827]">
                  <Sparkles className="w-4 h-4 text-[#067836]" />
                  <span>Arquitectura Híbrida (Offline-First + Nuvem Supabase):</span>
                </div>
                <p className="leading-relaxed text-[#064e26]/90">
                  1. <strong>Operação Instantânea:</strong> Todas as operações gravam em <code>LocalStorage</code> e no servidor Express local (<code>.neuroeduca_store.json</code>).
                </p>
                <p className="leading-relaxed text-[#064e26]/90">
                  2. <strong>Sincronização Bidireccional Supabase:</strong> Utilize Push, Pull ou Auto-Sync na Aba 1 para manter todas as 15 colecções sincronizadas na nuvem PostgreSQL.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          ABA 4: GERADOR DE INSERTS SQL DINÂMICOS
          ========================================================= */}
      {activeTab === 'sql_inserts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#064e26] uppercase flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-[#067836]" />
                <span>Comandos SQL INSERT Gerados a partir do LocalStorage</span>
              </h2>
              <p className="text-xs text-[#4b6755] mt-0.5">
                Exportação opcional em SQL puro para carga manual no PostgreSQL.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                onClick={handleCopyInserts}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition cursor-pointer"
              >
                {copiedInserts ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedInserts ? 'INSERTs Copiados!' : 'Copiar INSERTs SQL'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-slate-400 ml-2">Dados Actuais &gt; SQL INSERT</span>
              </div>
              <span className="text-amber-400 font-mono">Gerado a partir do LocalStorage</span>
            </div>

            <pre className="p-4 text-xs font-mono text-amber-200/90 overflow-x-auto leading-relaxed max-h-[500px]">
              <code>{generatedSqlInserts}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
