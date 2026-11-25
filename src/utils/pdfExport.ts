/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Utilitário Oficial de Exportação PDF e Impressão (A4 & A5)
 */

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export type PaperFormat = 'A4' | 'A5';
export type PaperOrientation = 'portrait' | 'landscape';

let cachedInsigniaDataUrl: string | null = null;
let insigniaFetchPromise: Promise<string | null> | null = null;

/**
 * Carrega a Insígnia da República de Angola via endpoint same-origin (/api/insignia)
 * como Data URL Base64, evitando qualquer erro de CORS ("Tainted canvas") ao gerar o PDF.
 */
async function getInsigniaDataUrl(): Promise<string | null> {
  if (cachedInsigniaDataUrl) return cachedInsigniaDataUrl;
  if (insigniaFetchPromise) return insigniaFetchPromise;

  insigniaFetchPromise = (async () => {
    try {
      const response = await fetch('/api/insignia');
      if (!response.ok) return null;
      const blob = await response.blob();
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        cachedInsigniaDataUrl = dataUrl;
      }
      return dataUrl;
    } catch {
      return null;
    } finally {
      insigniaFetchPromise = null;
    }
  })();

  return insigniaFetchPromise;
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'Documento_NEUROEDUCA';
}

/**
 * Normaliza o clone DOM para impressão ou captura PDF:
 * - Oculta elementos .print:hidden e [data-pdf-hide="true"]
 * - Converte inputs/selects/textareas editáveis (ex: notas da Mini-Pauta) em texto nítido
 * - Expande contentores com scroll horizontal/vertical (ex: tabelas largas de Pautas)
 * - Substitui a Insígnia externa pelo Data URL Base64 sem bloqueios CORS
 */
function prepareClonedDocumentNode(
  rootClone: HTMLElement,
  insigniaDataUrl: string | null,
  forPdf: boolean
) {
  const isPautaGeral =
    rootClone.classList.contains('pauta-geral-sheet') ||
    Boolean(rootClone.querySelector('.pauta-geral-sheet'));

  rootClone.classList.add('official-document-sheet');
  rootClone.style.backgroundColor = '#ffffff';
  rootClone.style.color = '#000000';
  rootClone.style.fontFamily = 'Arial, Helvetica, sans-serif';
  rootClone.style.fontSize = isPautaGeral ? '8pt' : '12pt';
  rootClone.style.lineHeight = isPautaGeral ? '1.25' : '1.5';
  rootClone.style.boxShadow = 'none';
  rootClone.style.borderRadius = '0';
  rootClone.style.maxHeight = 'none';
  rootClone.style.overflow = 'visible';

  const scopeId = `neuroeduca-sheet-${Date.now()}`;
  rootClone.setAttribute('data-official-sheet', scopeId);
  const styleOverride = document.createElement('style');

  if (isPautaGeral) {
    // Na Pauta Geral, reduzimos o tamanho das letras para todas as disciplinas, notas e Resultado caberem inteiros no PDF
    styleOverride.textContent = `
      [data-official-sheet="${scopeId}"],
      [data-official-sheet="${scopeId}"] * {
        font-family: Arial, Helvetica, sans-serif !important;
      }
      [data-official-sheet="${scopeId}"] *:not(svg):not(path):not(circle):not(rect):not(line):not(polygon):not(polyline):not(img) {
        background-color: #ffffff !important;
        line-height: 1.2 !important;
      }
      [data-official-sheet="${scopeId}"] {
        font-size: 8pt !important;
      }
      [data-official-sheet="${scopeId}"] .pauta-title {
        font-size: 10.5pt !important;
        line-height: 1.3 !important;
      }
      [data-official-sheet="${scopeId}"] .pauta-meta,
      [data-official-sheet="${scopeId}"] .pauta-meta *,
      [data-official-sheet="${scopeId}"] .pauta-signatures,
      [data-official-sheet="${scopeId}"] .pauta-signatures * {
        font-size: 7.5pt !important;
        line-height: 1.25 !important;
      }
      [data-official-sheet="${scopeId}"] table {
        width: 100% !important;
        table-layout: auto !important;
      }
      [data-official-sheet="${scopeId}"] table,
      [data-official-sheet="${scopeId}"] th,
      [data-official-sheet="${scopeId}"] td {
        font-size: 6.5pt !important;
        line-height: 1.15 !important;
        padding: 1.5px 2px !important;
        border-color: #000000 !important;
      }
      [data-official-sheet="${scopeId}"] th,
      [data-official-sheet="${scopeId}"] h1,
      [data-official-sheet="${scopeId}"] h2,
      [data-official-sheet="${scopeId}"] h3,
      [data-official-sheet="${scopeId}"] h4,
      [data-official-sheet="${scopeId}"] p,
      [data-official-sheet="${scopeId}"] dt,
      [data-official-sheet="${scopeId}"] dd,
      [data-official-sheet="${scopeId}"] li {
        color: #000000 !important;
      }
    `;
  } else {
    // Garantir folha branca (#ffffff) e letra Arial tamanho 12pt nos restantes documentos oficiais
    styleOverride.textContent = `
      [data-official-sheet="${scopeId}"],
      [data-official-sheet="${scopeId}"] * {
        font-family: Arial, Helvetica, sans-serif !important;
      }
      [data-official-sheet="${scopeId}"],
      [data-official-sheet="${scopeId}"] *:not(svg):not(path):not(circle):not(rect):not(line):not(polygon):not(polyline):not(img) {
        font-size: 12pt !important;
        line-height: 1.5 !important;
        background-color: #ffffff !important;
      }
      [data-official-sheet="${scopeId}"] th,
      [data-official-sheet="${scopeId}"] h1,
      [data-official-sheet="${scopeId}"] h2,
      [data-official-sheet="${scopeId}"] h3,
      [data-official-sheet="${scopeId}"] h4,
      [data-official-sheet="${scopeId}"] p,
      [data-official-sheet="${scopeId}"] dt,
      [data-official-sheet="${scopeId}"] dd,
      [data-official-sheet="${scopeId}"] li {
        color: #000000 !important;
      }
      [data-official-sheet="${scopeId}"] table,
      [data-official-sheet="${scopeId}"] th,
      [data-official-sheet="${scopeId}"] td {
        border-color: #000000 !important;
      }
    `;
  }
  rootClone.prepend(styleOverride);

  // Ocultar controlos não imprimíveis
  const hiddenSelectors = '.print\\:hidden, [data-pdf-hide="true"]';
  rootClone.querySelectorAll<HTMLElement>(hiddenSelectors).forEach((el) => {
    el.style.display = 'none';
  });

  // Expandir contentores scrolláveis para que tabelas largas (Pauta Geral) apareçam completas
  rootClone
    .querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-y-auto, .overflow-hidden')
    .forEach((el) => {
      el.style.overflow = 'visible';
      el.style.maxHeight = 'none';
      el.style.width = 'auto';
    });

  // Converter inputs editáveis (Mini-Pauta) em texto limpo no documento final
  rootClone.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    const span = document.createElement('span');
    const val = input.value?.trim();
    span.textContent = val ? Number(val).toFixed(1) : '--';
    span.style.fontFamily = 'Arial, Helvetica, sans-serif';
    span.style.fontSize = isPautaGeral ? '7pt' : '12pt';
    span.style.lineHeight = isPautaGeral ? '1.2' : '1.5';
    span.style.fontWeight = '700';
    span.style.color = '#000000';
    span.style.backgroundColor = '#ffffff';
    input.parentNode?.replaceChild(span, input);
  });

  if (forPdf) {
    // Garantir que todas as imagens no clone não contaminam o canvas
    rootClone.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (img.dataset.angolaInsignia === 'true' && insigniaDataUrl) {
        img.src = insigniaDataUrl;
        img.removeAttribute('crossorigin');
      } else if (img.src.startsWith('http') && !img.src.startsWith(window.location.origin)) {
        if (insigniaDataUrl && img.alt.toLowerCase().includes('insígnia')) {
          img.src = insigniaDataUrl;
        }
      }
    });
  }
}

export interface ExportPdfOptions {
  filename: string;
  format: PaperFormat;
  orientation: PaperOrientation;
}

/**
 * Exporta qualquer elemento de documento oficial para arquivo .pdf real nos formatos A4 ou A5.
 */
export async function exportElementToPdf(
  element: HTMLElement | null,
  { filename, format, orientation }: ExportPdfOptions
): Promise<void> {
  if (!element) {
    throw new Error('Documento não encontrado para exportação PDF.');
  }

  const insigniaDataUrl = await getInsigniaDataUrl();
  const isPautaGeral =
    element.classList.contains('pauta-geral-sheet') ||
    Boolean(element.querySelector('.pauta-geral-sheet'));

  // Largura base mínima de renderização conforme formato e largura natural do documento (incluindo tabelas largas)
  const defaultMinWidth =
    orientation === 'landscape'
      ? format === 'A5'
        ? 980
        : 1120
      : format === 'A5'
      ? 620
      : 794;

  let maxContentWidth = Math.max(element.scrollWidth, element.offsetWidth, defaultMinWidth);
  element.querySelectorAll<HTMLElement>('.overflow-x-auto, table').forEach((child) => {
    maxContentWidth = Math.max(maxContentWidth, child.scrollWidth + 32);
  });
  const targetRenderWidth = maxContentWidth;

  const cloneId = `neuroeduca-pdf-target-${Date.now()}`;
  element.setAttribute('data-pdf-capture-id', cloneId);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: Math.max(targetRenderWidth + 200, 1600),
      onclone: (_clonedDoc, clonedEl) => {
        prepareClonedDocumentNode(clonedEl, insigniaDataUrl, true);
        if (isPautaGeral) {
          clonedEl.style.minWidth = `${defaultMinWidth}px`;
          clonedEl.style.width = 'max-content';
          clonedEl.style.maxWidth = 'none';
        } else {
          clonedEl.style.width = `${targetRenderWidth}px`;
          clonedEl.style.maxWidth = 'none';
        }
        clonedEl.style.margin = '0';
      },
    });
  } finally {
    element.removeAttribute('data-pdf-capture-id');
  }

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: format.toLowerCase() as 'a4' | 'a5',
    compress: true,
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const marginMm = format === 'A5' ? 6 : 10;
  const contentWidthMm = pageWidthMm - marginMm * 2;
  const contentHeightMm = pageHeightMm - marginMm * 2;

  const totalImageHeightMm = (canvas.height * contentWidthMm) / canvas.width;

  if (totalImageHeightMm <= contentHeightMm + 1) {
    // Cabe perfeitamente numa única página A4 ou A5
    const finalHeightMm = Math.min(totalImageHeightMm, contentHeightMm);
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWidthMm, finalHeightMm, undefined, 'FAST');
  } else {
    // Paginação automática em múltiplas páginas A4 ou A5 sem cortes bruscos
    const pxPerMm = canvas.width / contentWidthMm;
    const pageSliceHeightPx = Math.floor(contentHeightMm * pxPerMm);
    let currentY = 0;
    let pageIndex = 0;

    while (currentY < canvas.height) {
      const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - currentY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );
      }

      const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
      const sliceHeightMm = (sliceHeightPx * contentWidthMm) / canvas.width;

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(sliceImgData, 'PNG', marginMm, marginMm, contentWidthMm, sliceHeightMm, undefined, 'FAST');

      currentY += sliceHeightPx;
      pageIndex += 1;
    }
  }

  const safeName = sanitizeFilename(filename);
  pdf.save(`${safeName}_${format}.pdf`);
}

export interface PrintDocumentOptions {
  format: PaperFormat;
  orientation: PaperOrientation;
  title?: string;
}

/**
 * Imprime exclusivamente o elemento de documento seleccionado com regra @page A4 ou A5 exacta.
 */
export function printElementWithFormat(
  element: HTMLElement | null,
  { format, orientation, title }: PrintDocumentOptions
): void {
  const prevRoot = document.getElementById('neuroeduca-print-root');
  if (prevRoot) prevRoot.remove();

  const prevStyle = document.getElementById('neuroeduca-dynamic-print-style');
  if (prevStyle) prevStyle.remove();

  const styleEl = document.createElement('style');
  styleEl.id = 'neuroeduca-dynamic-print-style';
  const margin = format === 'A5' ? '6mm' : '10mm';
  styleEl.textContent = `
    @media print {
      @page {
        size: ${format} ${orientation};
        margin: ${margin};
      }
    }
  `;
  document.head.appendChild(styleEl);

  const originalTitle = document.title;
  if (title) {
    document.title = `${title} (${format})`;
  }

  const cleanup = () => {
    document.body.classList.remove(
      'neuroeduca-print-isolated',
      'neuroeduca-print-a4',
      'neuroeduca-print-a5',
      'neuroeduca-print-portrait',
      'neuroeduca-print-landscape'
    );
    document.getElementById('neuroeduca-print-root')?.remove();
    document.getElementById('neuroeduca-dynamic-print-style')?.remove();
    document.title = originalTitle;
  };

  if (element) {
    const printRoot = document.createElement('div');
    printRoot.id = 'neuroeduca-print-root';

    const cloned = element.cloneNode(true) as HTMLElement;
    // Copiar valores actuais de inputs editáveis antes de converter
    const origInputs = element.querySelectorAll('input');
    const clonedInputs = cloned.querySelectorAll('input');
    origInputs.forEach((inp, idx) => {
      if (clonedInputs[idx]) {
        clonedInputs[idx].value = inp.value;
      }
    });

    prepareClonedDocumentNode(cloned, null, false);
    cloned.style.width = '100%';
    cloned.style.maxWidth = '100%';
    cloned.style.margin = '0 auto';

    printRoot.appendChild(cloned);
    document.body.appendChild(printRoot);

    document.body.classList.add(
      'neuroeduca-print-isolated',
      format === 'A5' ? 'neuroeduca-print-a5' : 'neuroeduca-print-a4',
      orientation === 'landscape' ? 'neuroeduca-print-landscape' : 'neuroeduca-print-portrait'
    );
  } else {
    document.body.classList.add(
      format === 'A5' ? 'neuroeduca-print-a5' : 'neuroeduca-print-a4',
      orientation === 'landscape' ? 'neuroeduca-print-landscape' : 'neuroeduca-print-portrait'
    );
  }

  window.addEventListener('afterprint', cleanup, { once: true });

  // Pequeno atraso para garantir aplicação da folha de estilos @page e pintura do clone
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
    }, 80);
  });
}
