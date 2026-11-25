/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Controlo de Acesso e Encaminhamento de Comunicados
 * Isolamento estrito por Canal (Super Admin -> Escolas | Admin Escolar -> Membros da Escola)
 */

import {
  Announcement,
  AnnouncementTargetGroup,
  ClassRoom,
  Institution,
  Student,
  Teacher,
  UserProfile,
  UserRole
} from '../types';

export interface AnnouncementAccessContext {
  currentUser: UserProfile | null;
  activeRole: UserRole;
  currentInstitution: Institution | null;
  authorizedStudents?: Student[];
  currentTeacher?: Teacher | null;
  classes?: ClassRoom[];
}

export function getUserAnnouncementReadKey(user?: UserProfile | null): string {
  if (!user) return '';
  return (user.email || user.id || '').trim().toLowerCase();
}

export function isAnnouncementReadByUser(
  announcement: Announcement,
  user?: UserProfile | null
): boolean {
  const key = getUserAnnouncementReadKey(user);
  if (!key) return false;
  return (announcement.readByUserKeys || []).some(
    (k) => k.trim().toLowerCase() === key
  );
}

export function isSuperAdminRoleActive(
  user?: UserProfile | null,
  activeRole?: UserRole
): boolean {
  return user?.role === 'super_admin' || activeRole === 'super_admin';
}

export function isTreasurerRoleActive(user?: UserProfile | null): boolean {
  return user?.role === 'funcionario_financeiro';
}

export function isSchoolAdminSenderAllowed(
  user?: UserProfile | null,
  activeRole?: UserRole
): boolean {
  if (!user) return false;
  if (
    user.role === 'super_admin' ||
    user.role === 'director_municipal' ||
    user.role === 'professor' ||
    user.role === 'director_turma' ||
    user.role === 'aluno' ||
    user.role === 'encarregado_educacao' ||
    user.role === 'funcionario_financeiro'
  ) {
    return false;
  }
  const effectiveRole = activeRole || user.role;
  return (
    effectiveRole === 'director_geral' ||
    effectiveRole === 'admin_institucional' ||
    effectiveRole === 'subdirector_pedagogico' ||
    effectiveRole === 'secretario_geral' ||
    effectiveRole === 'coordenador_curso'
  );
}

export function isSchoolAdminOrTreasurerRole(
  user?: UserProfile | null
): boolean {
  if (!user) return false;
  return (
    user.role !== 'super_admin' &&
    user.role !== 'director_municipal' &&
    user.role !== 'professor' &&
    user.role !== 'director_turma' &&
    user.role !== 'aluno' &&
    user.role !== 'encarregado_educacao'
  );
}

/**
 * Filtra estritamente os comunicados visíveis para o utilizador autenticado.
 * - Super Admin: vê comunicados enviados no canal 'super_to_schools'.
 * - Admin Escolar (não Tesoureiro): vê comunicados 'super_to_schools' destinados à sua escola
 *   + comunicados 'school_to_members' da sua escola.
 * - Tesoureiro (funcionario_financeiro): vê apenas comunicados 'school_to_members' da sua escola
 *   destinados a 'financeiro' ou 'utilizadores'.
 * - Professor / Director de Turma: vê apenas comunicados 'school_to_members' da sua escola
 *   destinados a 'professores' ou 'utilizadores' (respeitando filtro opcional de turma/utilizador).
 * - Aluno: vê apenas comunicados 'school_to_members' da sua escola destinados a 'alunos'
 *   (respeitando filtro opcional de turma e aluno autorizado).
 * - Encarregado: vê apenas comunicados 'school_to_members' da sua escola destinados a 'encarregados'
 *   (respeitando filtro opcional de turma e educandos autorizados).
 */
export function filterAnnouncementsForUser(
  announcements: Announcement[],
  ctx: AnnouncementAccessContext
): Announcement[] {
  const {
    currentUser,
    activeRole,
    currentInstitution,
    authorizedStudents = [],
    currentTeacher = null,
    classes = []
  } = ctx;

  if (!currentUser) return [];

  const userKey = getUserAnnouncementReadKey(currentUser);
  const effectiveRole = currentUser.role;

  if (effectiveRole === 'super_admin') {
    return announcements.filter(
      (a) => !a.archived && a.channel === 'super_to_schools'
    );
  }

  if (effectiveRole === 'director_municipal') {
    return [];
  }

  if (!currentInstitution) return [];

  const instId = currentInstitution.id;

  // Aluno ou Encarregado de Educação (isolamento estrito)
  if (effectiveRole === 'aluno' || effectiveRole === 'encarregado_educacao') {
    const requiredGroup: AnnouncementTargetGroup =
      effectiveRole === 'aluno' ? 'alunos' : 'encarregados';

    const authStudentIds = new Set(authorizedStudents.map((s) => s.id));
    const authClassIds = new Set(authorizedStudents.map((s) => s.classId));

    return announcements.filter((a) => {
      if (a.archived) return false;
      if (a.channel !== 'school_to_members') return false;
      if (a.institutionId !== instId) return false;
      const groups = a.targetGroups || [];
      if (!groups.includes(requiredGroup)) return false;

      if (a.targetStudentIds && a.targetStudentIds.length > 0) {
        const matchesStudent = a.targetStudentIds.some((id) => authStudentIds.has(id));
        if (!matchesStudent) return false;
      }

      if (a.targetClassIds && a.targetClassIds.length > 0) {
        const matchesClass = a.targetClassIds.some((cid) => authClassIds.has(cid));
        if (!matchesClass) return false;
      }

      return true;
    });
  }

  // Professor / Director de Turma
  if (effectiveRole === 'professor' || effectiveRole === 'director_turma') {
    const teacherClassIds = new Set<string>([
      ...(currentTeacher?.assignedClasses?.map((a) => a.classId) || []),
      ...classes
        .filter((c) => c.institutionId === instId && c.classDirectorId === currentTeacher?.id)
        .map((c) => c.id)
    ]);

    return announcements.filter((a) => {
      if (a.archived) return false;
      if (a.channel !== 'school_to_members') return false;
      if (a.institutionId !== instId) return false;

      const groups = a.targetGroups || [];
      if (!groups.includes('professores') && !groups.includes('utilizadores')) {
        return false;
      }

      if (a.targetUserIds && a.targetUserIds.length > 0) {
        const matchesUser =
          a.targetUserIds.includes(currentUser.id) ||
          (currentTeacher ? a.targetUserIds.includes(currentTeacher.id) : false) ||
          a.targetUserIds.some((u) => u.trim().toLowerCase() === userKey);
        if (!matchesUser) return false;
      }

      if (a.targetClassIds && a.targetClassIds.length > 0 && teacherClassIds.size > 0) {
        const matchesClass = a.targetClassIds.some((cid) => teacherClassIds.has(cid));
        if (!matchesClass) return false;
      }

      return true;
    });
  }

  // Financeiro / Tesoureiro
  if (effectiveRole === 'funcionario_financeiro') {
    return announcements.filter((a) => {
      if (a.archived) return false;
      if (a.channel !== 'school_to_members') return false;
      if (a.institutionId !== instId) return false;

      const groups = a.targetGroups || [];
      if (!groups.includes('financeiro') && !groups.includes('utilizadores')) {
        return false;
      }

      if (a.targetUserIds && a.targetUserIds.length > 0) {
        const matchesUser =
          a.targetUserIds.includes(currentUser.id) ||
          a.targetUserIds.some((u) => u.trim().toLowerCase() === userKey);
        if (!matchesUser) return false;
      }

      return true;
    });
  }

  // Administrador Escolar (Director Geral, Admin Institucional, Subdirector Pedagógico, Secretário Geral, Coordenador)
  if (isSchoolAdminSenderAllowed(currentUser, activeRole) || isSchoolAdminOrTreasurerRole(currentUser)) {
    return announcements.filter((a) => {
      if (a.archived) return false;
      if (a.channel === 'super_to_schools') {
        return (
          a.targetScope === 'all_schools' ||
          (a.targetInstitutionIds || []).includes(instId)
        );
      }
      if (a.channel === 'school_to_members') {
        return a.institutionId === instId;
      }
      return false;
    });
  }

  return [];
}

export const ANNOUNCEMENT_TARGET_GROUP_LABELS: Record<
  AnnouncementTargetGroup,
  string
> = {
  utilizadores: 'Utilizadores & Secretaria',
  professores: 'Professores',
  financeiro: 'Financeiro / Tesouraria',
  alunos: 'Alunos',
  encarregados: 'Encarregados de Educação'
};

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<
  Announcement['category'],
  string
> = {
  geral: 'Geral',
  pedagogico: 'Pedagógico',
  financeiro: 'Financeiro',
  administrativo: 'Administrativo',
  urgente: 'Urgente'
};
