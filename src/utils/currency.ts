/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Utilitários de Moeda (Kwanza - AOA) e Localização de Angola
 */

/**
 * Formata um valor numérico para a moeda de Angola (Kwanza - Kz / AOA)
 * Exemplo: 25000 -> "25.000,00 Kz"
 */
export function formatKwanza(amount: number, showSymbol: boolean = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? '0,00 Kz' : '0,00';
  }

  const parts = amount.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1];

  const formatted = `${integerPart},${decimalPart}`;
  return showSymbol ? `${formatted} Kz` : formatted;
}

/**
 * Formata data no formato comum em documentos de Angola
 * Exemplo: "2026-10-31" -> "31 de Outubro de 2026"
 */
export function formatAngolaDate(dateInput: string | Date): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = d.getDate();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${day} de ${month} de ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Gera uma referência Multicaixa de 9 dígitos no padrão da EMIS / Bancos de Angola
 */
export function generateMulticaixaReference(seed: string | number): string {
  const hash = Math.abs(
    String(seed)
      .split('')
      .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  );
  const baseNum = String(100000000 + (hash % 899999999));
  // Format as "XXX XXX XXX"
  return `${baseNum.slice(0, 3)} ${baseNum.slice(3, 6)} ${baseNum.slice(6, 9)}`;
}

/**
 * Províncias Oficiais de Angola
 */
export const ANGOLA_PROVINCES = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire'
];
