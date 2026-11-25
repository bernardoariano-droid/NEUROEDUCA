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
  isCustomized?: boolean;
}

function normalizeLocationKey(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function formatProvinceGovernmentLine(province?: string): string {
  const clean = String(province || '').trim();
  if (!clean) return 'Governo Provincial';
  if (/^(governo|prov[ií]ncia)\b/i.test(clean)) return clean;

  const key = normalizeLocationKey(clean);
  const feminineProvinces = new Set([
    'huila',
    'lunda norte',
    'lunda-norte',
    'lunda sul',
    'lunda-sul'
  ]);
  const masculineProvinces = new Set([
    'bengo',
    'bie',
    'cuando',
    'cuando cubango',
    'cuando-cubango',
    'cubango',
    'cuanza norte',
    'cuanza-norte',
    'cuanza sul',
    'cuanza-sul',
    'cunene',
    'huambo',
    'moxico',
    'moxico leste',
    'moxico-leste',
    'namibe',
    'uige',
    'zaire'
  ]);

  const prep = feminineProvinces.has(key)
    ? 'da'
    : masculineProvinces.has(key)
    ? 'do'
    : 'de';

  return `Governo da Província ${prep} ${clean}`;
}

export function formatMunicipalityLine(municipality?: string): string {
  const clean = String(municipality || '').trim();
  if (!clean) return 'Município Sede';
  if (/^(munic[ií]pio|administra[cç][aã]o municipal)\b/i.test(clean)) return clean;

  const key = normalizeLocationKey(clean);
  const feminineMunicipalities = new Set([
    'baia farta',
    'bibala',
    'caala',
    'cahama',
    'catumbela',
    'cela',
    'chibia',
    'conda',
    'gabela',
    'ganda',
    'huila',
    'humpata',
    'jamba',
    'quibala'
  ]);
  const masculineMunicipalities = new Set([
    'ambriz',
    'bailundo',
    'bengo',
    'buco-zau',
    'buco zau',
    'cazengo',
    'conde',
    'cuito',
    'dundo',
    'huambo',
    'kuito',
    'libolo',
    'lobito',
    'lubango',
    'moxico',
    'namibe',
    'saurimo',
    'soyo',
    'sumbe',
    'tombwa',
    'uige',
    'waku-kungo',
    'waku kungo'
  ]);

  const prep = feminineMunicipalities.has(key)
    ? 'da'
    : masculineMunicipalities.has(key)
    ? 'do'
    : 'de';

  return `Município ${prep} ${clean}`;
}

export function buildDocumentHeaderForInstitution(
  institution?: Institution | null
): DocumentHeaderConfig {
  const isHigherEdOnly =
    Array.isArray(institution?.subsystems) &&
    institution.subsystems.length === 1 &&
    institution.subsystems[0] === 'superior';

  return {
    line1: 'República de Angola',
    line2: isHigherEdOnly
      ? 'Ministério do Ensino Superior, Ciência, Tecnologia e Inovação'
      : 'Ministério da Educação',
    line3: formatProvinceGovernmentLine(institution?.province),
    line4: formatMunicipalityLine(institution?.municipality),
    line5: institution?.name?.trim() || 'Instituição de Ensino',
    isCustomized: false
  };
}

export const DEFAULT_DOCUMENT_HEADER: DocumentHeaderConfig = buildDocumentHeaderForInstitution(null);

const HEADER_STORAGE_PREFIX = 'neuroeduca_doc_header_v1_';
const HEADER_EVENT_NAME = 'neuroeduca-document-header-updated';

function getStorageKey(institutionId?: string): string {
  return `${HEADER_STORAGE_PREFIX}${institutionId || 'default'}`;
}

export function loadDocumentHeaderConfig(
  institutionOrId?: Institution | string | null
): DocumentHeaderConfig {
  const institution =
    institutionOrId && typeof institutionOrId === 'object' ? institutionOrId : null;
  const institutionId =
    typeof institutionOrId === 'string' ? institutionOrId : institution?.id;

  const schoolDefaults = buildDocumentHeaderForInstitution(institution);
  if (typeof window === 'undefined') return schoolDefaults;

  try {
    const raw = localStorage.getItem(getStorageKey(institutionId));
    if (!raw) return schoolDefaults;
    const parsed = JSON.parse(raw) as Partial<DocumentHeaderConfig>;
    if (!parsed.isCustomized) {
      return schoolDefaults;
    }
    return {
      line1: parsed.line1 ?? schoolDefaults.line1,
      line2: parsed.line2 ?? schoolDefaults.line2,
      line3: parsed.line3 ?? schoolDefaults.line3,
      line4: parsed.line4 ?? schoolDefaults.line4,
      line5: parsed.line5 ?? schoolDefaults.line5,
      isCustomized: true
    };
  } catch {
    return schoolDefaults;
  }
}

export function saveDocumentHeaderConfig(
  institutionId: string | undefined,
  config: DocumentHeaderConfig
): void {
  if (typeof window === 'undefined') return;
  try {
    if (!config.isCustomized) {
      localStorage.removeItem(getStorageKey(institutionId));
    } else {
      localStorage.setItem(getStorageKey(institutionId), JSON.stringify(config));
    }
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
    loadDocumentHeaderConfig(institution)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DocumentHeaderConfig>(header);

  const subsystemsSig = Array.isArray(institution?.subsystems)
    ? institution.subsystems.join(',')
    : '';

  useEffect(() => {
    const loaded = loadDocumentHeaderConfig(institution);
    setHeader(loaded);
    setDraft(loaded);
  }, [
    instKey,
    institution?.name,
    institution?.province,
    institution?.municipality,
    subsystemsSig
  ]);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const custom = event as CustomEvent<{
        institutionId: string;
        config: DocumentHeaderConfig;
      }>;
      if (custom.detail?.institutionId === instKey && custom.detail?.config) {
        const next = custom.detail.config.isCustomized
          ? custom.detail.config
          : buildDocumentHeaderForInstitution(institution);
        setHeader(next);
        setDraft(next);
      }
    };
    window.addEventListener(HEADER_EVENT_NAME, handleSync);
    return () => window.removeEventListener(HEADER_EVENT_NAME, handleSync);
  }, [
    instKey,
    institution?.name,
    institution?.province,
    institution?.municipality,
    subsystemsSig
  ]);

  const schoolDefaults = buildDocumentHeaderForInstitution(institution);

  const handleOpenEdit = () => {
    setDraft(header);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: DocumentHeaderConfig = {
      line1: draft.line1.trim() || schoolDefaults.line1,
      line2: draft.line2.trim() || schoolDefaults.line2,
      line3: draft.line3.trim() || schoolDefaults.line3,
      line4: draft.line4.trim() || schoolDefaults.line4,
      line5: draft.line5.trim() || schoolDefaults.line5,
      isCustomized: true
    };
    setHeader(cleaned);
    setDraft(cleaned);
    saveDocumentHeaderConfig(instKey, cleaned);
    setIsEditing(false);
  };

  const handleResetDefault = () => {
    const freshDefaults = buildDocumentHeaderForInstitution(institution);
    setDraft(freshDefaults);
    setHeader(freshDefaults);
    saveDocumentHeaderConfig(instKey, freshDefaults);
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
              placeholder={schoolDefaults.line1}
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line2}
              onChange={(e) => setDraft({ ...draft, line2: e.target.value })}
              placeholder={schoolDefaults.line2}
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line3}
              onChange={(e) => setDraft({ ...draft, line3: e.target.value })}
              placeholder={schoolDefaults.line3}
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line4}
              onChange={(e) => setDraft({ ...draft, line4: e.target.value })}
              placeholder={schoolDefaults.line4}
              className="w-full text-center font-semibold px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900"
            />
            <input
              type="text"
              value={draft.line5}
              onChange={(e) => setDraft({ ...draft, line5: e.target.value })}
              placeholder={schoolDefaults.line5}
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
              <span>Repor Dados da Escola</span>
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
