/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Controlo Estrito de Isolamento de Dados (Aluno & Encarregado de Educação)
 * Garante que Alunos e Encarregados nunca visualizem ou acedam a dados de outros estudantes.
 */

import { Student, UserProfile, UserRole } from '../types';

export function isStudentOrGuardianRole(
  currentUser?: UserProfile | null,
  activeRole?: UserRole
): boolean {
  const role = activeRole || currentUser?.role;
  return role === 'aluno' || role === 'encarregado_educacao';
}

export function normalizePersonName(rawName?: string): string {
  if (!rawName) return '';
  let normalized = rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\((estudante|encarregado|encarregada|aluno|aluna|encarregado de educacao)\)/gi, ' ')
    .replace(/[.,;:!?()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove honoríficos iniciais (ex.: "Dra.", "Prof.", "Eng.") para não causar falsos positivos ou falhas de correspondência
  const titlePrefixes = ['dra', 'dr', 'prof', 'engª', 'enga', 'eng', 'msc', 'sra', 'sr', 'me'];
  let changed = true;
  while (changed && normalized) {
    changed = false;
    for (const prefix of titlePrefixes) {
      if (normalized.startsWith(`${prefix} `)) {
        normalized = normalized.slice(prefix.length).trim();
        changed = true;
        break;
      }
    }
  }

  return normalized;
}

/**
 * Resolve estritamente a lista de alunos autorizados para a sessão de um Aluno ou Encarregado de Educação.
 * - Para 'aluno': devolve no máximo [próprio aluno] (correspondência exacta por e-mail ou nome completo normalizado).
 * - Para 'encarregado_educacao': devolve apenas os educandos estritamente vinculados pelo e-mail ou nome completo do encarregado.
 * - NUNCA devolve alunos aleatórios nem faz fallback para instStudents[0].
 */
export function resolveAuthorizedStudentsForUser(
  students: Student[],
  institutionId: string | undefined | null,
  currentUser?: UserProfile | null,
  activeRole?: UserRole
): Student[] {
  if (!currentUser) return [];

  const effectiveRole: UserRole | undefined =
    activeRole === 'aluno' || activeRole === 'encarregado_educacao'
      ? activeRole
      : currentUser.role === 'aluno' || currentUser.role === 'encarregado_educacao'
      ? currentUser.role
      : undefined;

  if (!effectiveRole) return [];

  const pool = institutionId
    ? students.filter((s) => s.institutionId === institutionId)
    : students;

  if (pool.length === 0) return [];

  const cleanEmail = (currentUser.email || '').toLowerCase().trim();
  const cleanUserName = normalizePersonName(currentUser.fullName);

  if (effectiveRole === 'aluno') {
    if (cleanEmail) {
      const byEmail = pool.find(
        (s) => s.email && s.email.toLowerCase().trim() === cleanEmail
      );
      if (byEmail) return [byEmail];
    }

    if (cleanUserName) {
      const byExactName = pool.find(
        (s) => normalizePersonName(s.fullName) === cleanUserName
      );
      if (byExactName) return [byExactName];
    }

    return [];
  }

  // Encarregado de Educação: apenas os seus educandos vinculados
  if (cleanEmail) {
    const byGuardianEmail = pool.filter(
      (s) => s.guardianEmail && s.guardianEmail.toLowerCase().trim() === cleanEmail
    );
    if (byGuardianEmail.length > 0) return byGuardianEmail;
  }

  if (cleanUserName) {
    const byGuardianName = pool.filter(
      (s) => normalizePersonName(s.guardianName) === cleanUserName
    );
    if (byGuardianName.length > 0) return byGuardianName;
  }

  return [];
}
