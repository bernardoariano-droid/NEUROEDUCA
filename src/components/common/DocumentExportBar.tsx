/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Barra Reutilizável de Exportação PDF e Impressão (A4 & A5)
 */

import React, { useState, useEffect } from 'react';
import { FileDown, Printer, Loader2 } from 'lucide-react';
import {
  PaperFormat,
  PaperOrientation,
  exportElementToPdf,
  printElementWithFormat,
} from '../../utils/pdfExport';

interface DocumentExportBarProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  documentTitle?: string;
  defaultFormat?: PaperFormat;
  defaultOrientation?: PaperOrientation;
  allowOrientationToggle?: boolean;
  compact?: boolean;
}

export const DocumentExportBar: React.FC<DocumentExportBarProps> = ({
  targetRef,
  filename,
  documentTitle,
  defaultFormat = 'A4',
  defaultOrientation = 'portrait',
  allowOrientationToggle = true,
  compact = false,
}) => {
  const [paperFormat, setPaperFormat] = useState<PaperFormat>(defaultFormat);
  const [orientation, setOrientation] = useState<PaperOrientation>(defaultOrientation);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setOrientation(defaultOrientation);
  }, [defaultOrientation]);

  const handleExportPdf = async () => {
    if (!targetRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportElementToPdf(targetRef.current, {
        filename,
        format: paperFormat,
        orientation,
      });
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printElementWithFormat(targetRef.current, {
      format: paperFormat,
      orientation,
      title: documentTitle || filename,
    });
  };

  return (
    <div
      data-pdf-hide="true"
      className="flex flex-wrap items-center gap-2 print:hidden"
    >
      {/* Selector A4 / A5 */}
      <div
        className="inline-flex items-center bg-[#eaf6ee] border border-[#cde6d5] rounded-lg p-0.5"
        role="group"
        aria-label="Formato do papel"
      >
        <button
          type="button"
          onClick={() => setPaperFormat('A4')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
            paperFormat === 'A4'
              ? 'bg-[#067836] text-white shadow-2xs'
              : 'text-[#055827] hover:bg-white/70'
          }`}
          title="Formato A4 (210 × 297 mm)"
        >
          A4
        </button>
        <button
          type="button"
          onClick={() => setPaperFormat('A5')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
            paperFormat === 'A5'
              ? 'bg-[#067836] text-white shadow-2xs'
              : 'text-[#055827] hover:bg-white/70'
          }`}
          title="Formato A5 (148 × 210 mm)"
        >
          A5
        </button>
      </div>

      {/* Selector Orientação (Retrato / Paisagem) */}
      {allowOrientationToggle && !compact && (
        <div
          className="inline-flex items-center bg-[#f3f7f4] border border-[#dce7df] rounded-lg p-0.5"
          role="group"
          aria-label="Orientação da página"
        >
          <button
            type="button"
            onClick={() => setOrientation('portrait')}
            className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              orientation === 'portrait'
                ? 'bg-[#00441e] text-white'
                : 'text-slate-600 hover:bg-white/70'
            }`}
            title="Orientação Vertical (Retrato)"
          >
            Vertical
          </button>
          <button
            type="button"
            onClick={() => setOrientation('landscape')}
            className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              orientation === 'landscape'
                ? 'bg-[#00441e] text-white'
                : 'text-slate-600 hover:bg-white/70'
            }`}
            title="Orientação Horizontal (Paisagem)"
          >
            Horizontal
          </button>
        </div>
      )}

      {/* Botão Exportar PDF */}
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={isExporting}
        className={`inline-flex items-center space-x-1.5 bg-[#067836] hover:bg-[#005e2c] disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-2xs transition cursor-pointer ${
          compact ? 'px-3 py-1.5 min-h-[36px]' : 'px-3.5 py-2 min-h-[40px]'
        }`}
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileDown className="w-3.5 h-3.5" />
        )}
        <span>{isExporting ? 'A gerar...' : `PDF (${paperFormat})`}</span>
      </button>

      {/* Botão Imprimir A4/A5 */}
      <button
        type="button"
        onClick={handlePrint}
        className={`inline-flex items-center space-x-1.5 bg-[#149a45] hover:bg-[#0e7c36] text-white font-semibold text-xs rounded-xl shadow-2xs transition cursor-pointer ${
          compact ? 'px-3 py-1.5 min-h-[36px]' : 'px-3.5 py-2 min-h-[40px]'
        }`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Imprimir ({paperFormat})</span>
      </button>
    </div>
  );
};
