/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Cabeçalho Oficial Centralizado e Editável para Todos os Documentos
 */

import React, { useState, useEffect } from 'react';
import { Pencil, Check, RotateCcw, X } from 'lucide-react';
import { Institution } from '../../types';
import { AngolaInsignia } from './AngolaInsignia';

export interface DocumentHeaderConfig {
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  line5: string;
}

export const DEFAULT_DOCUMENT_HEADER: DocumentHeaderConfig = {
  line1: 'República de Angola',
  line2: 'Ministério da Educação',
  line3: 'Governo da Província do Cuanza-Sul',
  line4: 'Município do Waku-Kungo',
  line5: 'Escola Primária nº 8050 CSU - Waku-Kungo'
};

const HEADER_STORAGE_PREFIX = 'neuroeduca_doc_header_v1_';
const HEADER_EVENT_NAME = 'neuroeduca-document-header-updated';

function getStorageKey(institutionId?: string): string {
  return `${HEADER_STORAGE_PREFIX}${institutionId || 'default'}`;
}

export function loadDocumentHeaderConfig(institutionId?: string): DocumentHeaderConfig {
  if (typeof window === 'undefined') return DEFAULT_DOCUMENT_HEADER;
  try {
    const raw = localStorage.getItem(getStorageKey(institutionId));
    if (!raw) return DEFAULT_DOCUMENT_HEADER;
    const parsed = JSON.parse(raw) as Partial<DocumentHeaderConfig>;
    return {
      line1: parsed.line1 ?? DEFAULT_DOCUMENT_HEADER.line1,
      line2: parsed.line2 ?? DEFAULT_DOCUMENT_HEADER.line2,
      line3: parsed.line3 ?? DEFAULT_DOCUMENT_HEADER.line3,
      line4: parsed.line4 ?? DEFAULT_DOCUMENT_HEADER.line4,
      line5: parsed.line5 ?? DEFAULT_DOCUMENT_HEADER.line5
    };
  } catch {
    return DEFAULT_DOCUMENT_HEADER;
  }
}

export function saveDocumentHeaderConfig(
  institutionId: string | undefined,
  config: DocumentHeaderConfig
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(institutionId), JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent(HEADER_EVENT_NAME, {
        detail: { institutionId: institutionId || 'default', config }
      })
    );
  } catch {
    // Ignorar falha de armazenamento
  }
}

interface OfficialDocumentHeaderProps {
  institution?: Institution | null;
  editable?: boolean;
  insigniaClassName?: string;
  extraMeta?: React.ReactNode;
  className?: string;
}

export const OfficialDocumentHeader: React.FC<OfficialDocumentHeaderProps> = ({
  institution,
  editable = true,
  insigniaClassName = 'h-14 w-auto mx-auto object-contain',
  extraMeta,
  className = ''
}) => {
  const instKey = institution?.id || 'default';
  const [header, setHeader] = useState<DocumentHeaderConfig>(() =>
    loadDocumentHeaderConfig(instKey)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DocumentHeaderConfig>(header);

  useEffect(() => {
    const loaded = loadDocumentHeaderConfig(instKey);
    setHeader(loaded);
    setDraft(loaded);
  }, [instKey]);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const custom = event as CustomEvent<{
        institutionId: string;
        config: DocumentHeaderConfig;
      }>;
      if (custom.detail?.institutionId === instKey && custom.detail?.config) {
        setHeader(custom.detail.config);
        setDraft(custom.detail.config);
      }
    };
    window.addEventListener(HEADER_EVENT_NAME, handleSync);
    return () => window.removeEventListener(HEADER_EVENT_NAME, handleSync);
  }, [instKey]);

  const handleOpenEdit = () => {
    setDraft(header);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: DocumentHeaderConfig = {
      line1: draft.line1.trim() || DEFAULT_DOCUMENT_HEADER.line1,
      line2: draft.line2.trim() || DEFAULT_DOCUMENT_HEADER.line2,
      line3: draft.line3.trim() || DEFAULT_DOCUMENT_HEADER.line3,
      line4: draft.line4.trim() || DEFAULT_DOCUMENT_HEADER.line4,
      line5: draft.line5.trim() || DEFAULT_DOCUMENT_HEADER.line5
    };
    setHeader(cleaned);
    setDraft(cleaned);
    saveDocumentHeaderConfig(instKey, cleaned);
    setIsEditing(false);
  };

  const handleResetDefault = () => {
    setDraft(DEFAULT_DOCUMENT_HEADER);
    setHeader(DEFAULT_DOCUMENT_HEADER);
    saveDocumentHeaderConfig(instKey, DEFAULT_DOCUMENT_HEADER);
  };

  return (
    <div className={`relative text-center bg-white ${className}`}>
      {editable && !isEditing && (
        <div
          data-pdf-hide="true"
          className="print:hidden flex justify-end mb-1"
        >
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[#cde6d5] bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] text-[11px] font-semibold transition cursor-pointer"
            title="Editar texto do cabeçalho oficial dos documentos"
          >
            <Pencil className="w-3 h-3 text-[#067836]" />
            <span>Editar Cabeçalho</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-center mb-2">
        <AngolaInsignia className={insigniaClassName} />
      </div>

      {isEditing ? (
        <form
          onSubmit={handleSave}
          data-pdf-hide="true"
          className="print:hidden max-w-xl mx-auto my-2 p-3.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] space-y-2 text-left"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#dce7df]">
            <span className="text-xs font-bold text-[#064e26] uppercase">
              Editar Cabeçalho Oficial (Aplicado a Todos os Documentos)
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer"
              aria-label="Cancelar edição do cabeçalho"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            <input
              type="text"
              value={draft.line1}
              onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
              placeholder="República de Angola"
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line2}
              onChange={(e) => setDraft({ ...draft, line2: e.target.value })}
              placeholder="Ministério da Educação"
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line3}
              onChange={(e) => setDraft({ ...draft, line3: e.target.value })}
              placeholder="Governo da Província do Cuanza-Sul"
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line4}
              onChange={(e) => setDraft({ ...draft, line4: e.target.value })}
              placeholder="Município do Waku-Kungo"
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line5}
              onChange={(e) => setDraft({ ...draft, line5: e.target.value })}
              placeholder="Escola Primária nº 8050 CSU - Waku-Kungo"
              className="w-full text-center font-bold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Repor Padrão</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 text-[11px] font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-[11px] font-bold cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center space-y-0.5 text-black">
          <div className="font-bold text-center">{header.line1}</div>
          <div className="font-bold text-center">{header.line2}</div>
          <div className="font-semibold text-center">{header.line3}</div>
          <div className="font-semibold text-center">{header.line4}</div>
          <div className="font-bold text-center pt-0.5">{header.line5}</div>
        </div>
      )}

      {extraMeta && <div className="mt-1 text-center">{extraMeta}</div>}
    </div>
  );
};
