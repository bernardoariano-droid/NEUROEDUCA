/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Modal de Backup JSON & Estado na Nuvem Supabase
 * Visualização, exportação/restauro JSON e sincronização directa com o Supabase PostgreSQL
 */

import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  X,
  Database,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  computeBundleStats,
  exportBackupJson,
  parseBackupJson,
  StorageDataBundle
} from '../../services/storageService';

interface LocalhostMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: StorageDataBundle;
  onPullFromCloud?: () => Promise<void> | void;
  onDataRestored?: (bundle: StorageDataBundle) => Promise<void> | void;
  onSeedDemoData?: () => Promise<void> | void;
  onForceSyncCloud?: () => Promise<void> | void;
}

export const LocalhostMemoryModal: React.FC<LocalhostMemoryModalProps> = ({
  isOpen,
  onClose,
  bundle,
  onPullFromCloud,
  onDataRestored,
  onSeedDemoData,
  onForceSyncCloud
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  if (!isOpen) return null;

  const stats = computeBundleStats(bundle);

  const handleSyncCloudNow = async () => {
    setErrorNotice(null);
    setNotice(null);
    setIsBusy(true);
    try {
      if (onForceSyncCloud) {
        await onForceSyncCloud();
      }
      setNotice('Todos os dados, turmas e utilizadores foram sincronizados com o Supabase!');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Erro ao sincronizar com o Supabase.');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePullNow = async () => {
    setErrorNotice(null);
    setNotice(null);
    setIsBusy(true);
    try {
      if (onPullFromCloud) {
        await onPullFromCloud();
      }
      setNotice('Dados actualizados directamente a partir do Supabase PostgreSQL!');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Erro ao carregar dados do Supabase.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownloadBackup = () => {
    setErrorNotice(null);
    const json = exportBackupJson(bundle);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroeduca_supabase_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Cópia de segurança (JSON) descarregada com sucesso!');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorNotice(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const parsed = parseBackupJson(content);
      if (parsed) {
        setIsBusy(true);
        try {
          if (onDataRestored) {
            await onDataRestored(parsed);
          }
          setNotice('Ficheiro JSON importado e sincronizado com o Supabase com sucesso!');
          setTimeout(() => setNotice(null), 3500);
        } catch (err: any) {
          setErrorNotice(err?.message || 'Erro ao enviar dados restaurados para o Supabase.');
        } finally {
          setIsBusy(false);
        }
      } else {
        setErrorNotice('Erro ao importar: ficheiro JSON inválido ou incompatível.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmSeed = async () => {
    setConfirmSeed(false);
    setErrorNotice(null);
    setIsBusy(true);
    try {
      if (onSeedDemoData) {
        await onSeedDemoData();
      }
      setNotice('Dados padrão de demonstração carregados e sincronizados no Supabase!');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Erro ao repor dados de demonstração no Supabase.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-[#dce7df] text-slate-800 my-4">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-white/15 rounded-xl border border-white/25 shrink-0">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase flex items-center space-x-2">
                <span className="truncate">NUVEM SUPABASE &amp; BACKUP JSON</span>
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0">
                  100% Cloud
                </span>
              </h2>
              <p className="text-[11px] text-emerald-100 truncate">
                Persistência directa no Supabase PostgreSQL · Sem armazenamento local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {notice && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {errorNotice && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-900 font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Card de Estado */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-[#067836]" />
                <span>Arquitectura 100% Base de Dados Supabase:</span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Sincronização Imediata
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <strong className="block text-slate-900">Supabase PostgreSQL</strong>
                  <span className="text-[10px] text-slate-500">{stats.approxSizeKb} KB em sessão</span>
                </div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <strong className="block text-slate-900">Inserção, Edição e Remoção</strong>
                  <span className="text-[10px] text-slate-500">Reflectidas de imediato na nuvem</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo de Registos em Sessão */}
          <div>
            <h3 className="font-bold mb-2 uppercase text-[11px] tracking-wider text-slate-500">
              Registos Sincronizados na Sessão Actual:
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-base font-black text-slate-900 block tabular-nums">{stats.institutionsCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Escolas</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-base font-black text-slate-900 block tabular-nums">{stats.accountsCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Contas</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-base font-black text-slate-900 block tabular-nums">{stats.classesCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Turmas</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-base font-black text-slate-900 block tabular-nums">{stats.studentsCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Alunos</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-base font-black text-slate-900 block tabular-nums">{stats.teachersCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Docentes</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-base font-black text-slate-900 block tabular-nums">{stats.invoicesCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Propinas</span>
              </div>
            </div>
          </div>

          {/* Confirmação Inline de Reposição */}
          {confirmSeed && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
              <p className="text-rose-900 font-semibold">
                Confirmar reposição dos dados de demonstração no Supabase? Os registos actuais serão substituídos na base de dados.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setConfirmSeed(false)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSeed}
                  disabled={isBusy}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold cursor-pointer"
                >
                  Sim, Repor no Supabase
                </button>
              </div>
            </div>
          )}

          {/* Botões de Acção Rápida */}
          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handlePullNow}
              disabled={isBusy}
              className="min-h-[44px] flex items-center justify-center space-x-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] disabled:opacity-60 text-white py-2.5 px-3 rounded-xl font-bold shadow-2xs transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-100 ${isBusy ? 'animate-spin' : ''}`} />
              <span>Actualizar do Supabase</span>
            </button>

            <button
              onClick={handleDownloadBackup}
              className="min-h-[44px] flex items-center justify-center space-x-2 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] py-2.5 px-3 rounded-xl font-bold shadow-2xs transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#067836]" />
              <span>Descarregar Backup JSON</span>
            </button>

            {onDataRestored && (
              <label className="min-h-[44px] flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 rounded-xl font-bold border border-slate-300 transition cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Importar Backup JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {onForceSyncCloud ? (
              <button
                onClick={handleSyncCloudNow}
                disabled={isBusy}
                className="min-h-[44px] flex items-center justify-center space-x-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 py-2.5 px-3 rounded-xl font-bold transition cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Reconciliar com Nuvem</span>
              </button>
            ) : null}

            {onSeedDemoData && (
              <button
                onClick={() => setConfirmSeed(true)}
                disabled={isBusy}
                className="min-h-[44px] sm:col-span-2 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 py-2.5 px-3 rounded-xl font-bold border border-slate-300 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Repor Dados de Demonstração na Nuvem</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Actualizado às {new Date(stats.lastUpdated).toLocaleTimeString('pt-AO')}</span>
            </span>
            <button
              onClick={onClose}
              className="min-h-[38px] px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
