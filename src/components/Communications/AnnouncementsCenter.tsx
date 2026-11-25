/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Centro de Comunicados Oficiais (Super Admin <-> Escolas <-> Utilizadores)
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  CheckCheck,
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  UserCheck,
  Trash2,
  X,
  Send,
  Inbox,
  MailOpen,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementChannel,
  AnnouncementPriority,
  AnnouncementTargetGroup,
  ClassRoom,
  Institution,
  SchoolUser,
  Student,
  Teacher,
  UserProfile,
  UserRole
} from '../../types';
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_TARGET_GROUP_LABELS,
  isAnnouncementReadByUser,
  isSchoolAdminSenderAllowed,
  isSuperAdminRoleActive,
  isTreasurerRoleActive
} from '../../utils/announcementAccess';

export interface CreateAnnouncementInput {
  channel: AnnouncementChannel;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  targetScope?: 'all_schools' | 'selected_schools';
  targetInstitutionIds?: string[];
  targetGroups?: AnnouncementTargetGroup[];
  targetClassIds?: string[];
  targetStudentIds?: string[];
  targetUserIds?: string[];
}

interface AnnouncementsCenterProps {
  announcements: Announcement[];
  currentUser: UserProfile;
  activeRole: UserRole;
  currentInstitution: Institution | null;
  institutions: Institution[];
  classes: ClassRoom[];
  students: Student[];
  teachers: Teacher[];
  schoolUsers: SchoolUser[];
  onSendAnnouncement: (payload: CreateAnnouncementInput) => void;
  onMarkRead: (announcementId: string) => void;
  onDeleteAnnouncement?: (announcementId: string) => void;
}

const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal: 'Normal',
  importante: 'Importante',
  urgente: 'Urgente'
};

const PRIORITY_TEXT_CLASS: Record<AnnouncementPriority, string> = {
  normal: 'text-slate-600',
  importante: 'text-amber-700 font-semibold',
  urgente: 'text-red-700 font-bold'
};

const ALL_TARGET_GROUPS: AnnouncementTargetGroup[] = [
  'utilizadores',
  'professores',
  'financeiro',
  'alunos',
  'encarregados'
];

export const AnnouncementsCenter: React.FC<AnnouncementsCenterProps> = ({
  announcements,
  currentUser,
  activeRole,
  currentInstitution,
  institutions,
  classes,
  students,
  teachers,
  schoolUsers,
  onSendAnnouncement,
  onMarkRead,
  onDeleteAnnouncement
}) => {
  const isSuperAdmin = isSuperAdminRoleActive(currentUser, activeRole);
  const canSendSchool = isSchoolAdminSenderAllowed(currentUser, activeRole);
  const isTreasurer = isTreasurerRoleActive(currentUser);
  const canSend = isSuperAdmin || canSendSchool;

  const [viewFilter, setViewFilter] = useState<'todos' | 'recebidos' | 'enviados' | 'nao_lidos'>(
    'todos'
  );
  const [categoryFilter, setCategoryFilter] = useState<'todas' | AnnouncementCategory>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Composer Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('geral');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');

  // Super Admin Target State
  const [targetScope, setTargetScope] = useState<'all_schools' | 'selected_schools'>('all_schools');
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<string[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');

  // School Admin Target State
  const [selectedGroups, setSelectedGroups] = useState<AnnouncementTargetGroup[]>([
    'professores',
    'utilizadores'
  ]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [useSpecificMembers, setUseSpecificMembers] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const instClasses = useMemo(
    () =>
      currentInstitution
        ? classes.filter((c) => c.institutionId === currentInstitution.id)
        : [],
    [classes, currentInstitution]
  );

  const instStudents = useMemo(
    () =>
      currentInstitution
        ? students.filter((s) => s.institutionId === currentInstitution.id)
        : [],
    [students, currentInstitution]
  );

  const instTeachers = useMemo(
    () =>
      currentInstitution
        ? teachers.filter((t) => t.institutionId === currentInstitution.id)
        : [],
    [teachers, currentInstitution]
  );

  const instSchoolUsers = useMemo(
    () =>
      currentInstitution
        ? schoolUsers.filter((u) => u.institutionId === currentInstitution.id)
        : [],
    [schoolUsers, currentInstitution]
  );

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }, [announcements]);

  const unreadCount = useMemo(
    () =>
      sortedAnnouncements.filter(
        (a) =>
          a.senderUserId !== currentUser.id && !isAnnouncementReadByUser(a, currentUser)
      ).length,
    [sortedAnnouncements, currentUser]
  );

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedAnnouncements.filter((item) => {
      const isRead = isAnnouncementReadByUser(item, currentUser);
      const isSentByMeOrMySchool = isSuperAdmin
        ? item.channel === 'super_to_schools'
        : canSendSchool && item.channel === 'school_to_members';
      const isReceived = isSuperAdmin
        ? false
        : canSendSchool
        ? item.channel === 'super_to_schools'
        : true;

      if (viewFilter === 'recebidos' && !isReceived) return false;
      if (viewFilter === 'enviados' && !isSentByMeOrMySchool) return false;
      if (viewFilter === 'nao_lidos' && (isRead || isSentByMeOrMySchool)) return false;
      if (categoryFilter !== 'todas' && item.category !== categoryFilter) return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.senderName.toLowerCase().includes(q)
      );
    });
  }, [
    sortedAnnouncements,
    currentUser,
    isSuperAdmin,
    canSendSchool,
    viewFilter,
    categoryFilter,
    searchQuery
  ]);

  const activeAnnouncement = useMemo(() => {
    if (selectedId) {
      const found = filteredAnnouncements.find((a) => a.id === selectedId);
      if (found) return found;
    }
    return filteredAnnouncements[0] || null;
  }, [filteredAnnouncements, selectedId]);

  useEffect(() => {
    if (
      activeAnnouncement &&
      activeAnnouncement.senderUserId !== currentUser.id &&
      !isAnnouncementReadByUser(activeAnnouncement, currentUser)
    ) {
      onMarkRead(activeAnnouncement.id);
    }
  }, [activeAnnouncement, currentUser, onMarkRead]);

  const handleOpenComposer = () => {
    setFormError(null);
    setTitle('');
    setContent('');
    setCategory('geral');
    setPriority('normal');
    setTargetScope('all_schools');
    setSelectedInstitutionIds([]);
    setSelectedGroups(['professores', 'utilizadores']);
    setSelectedClassIds([]);
    setSelectedStudentIds([]);
    setSelectedUserIds([]);
    setUseSpecificMembers(false);
    setIsComposeOpen(true);
  };

  const toggleGroup = (group: AnnouncementTargetGroup) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const toggleInstitution = (instId: string) => {
    setSelectedInstitutionIds((prev) =>
      prev.includes(instId) ? prev.filter((id) => id !== instId) : [...prev, instId]
    );
  };

  const toggleStudentTarget = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleUserTarget = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Estimativa de alcance em tempo real para o compositor escolar
  const schoolReachSummary = useMemo(() => {
    if (!canSendSchool) return '';
    const parts: string[] = [];
    if (selectedGroups.includes('utilizadores')) {
      const staffCount = instSchoolUsers.filter(
        (u) =>
          u.role === 'director_geral' ||
          u.role === 'subdirector_pedagogico' ||
          u.role === 'secretario_geral'
      ).length;
      parts.push(`${staffCount} utilizador(es) de direcção/secretaria`);
    }
    if (selectedGroups.includes('professores')) {
      parts.push(`${instTeachers.length} docente(s)`);
    }
    if (selectedGroups.includes('financeiro')) {
      const finCount = instSchoolUsers.filter((u) => u.role === 'funcionario_financeiro').length;
      parts.push(`${finCount} tesoureiro(s)/financeiro`);
    }
    if (selectedGroups.includes('alunos') || selectedGroups.includes('encarregados')) {
      const matchingStu =
        selectedClassIds.length > 0
          ? instStudents.filter((s) => selectedClassIds.includes(s.classId))
          : instStudents;
      const stuCount =
        selectedStudentIds.length > 0 ? selectedStudentIds.length : matchingStu.length;
      if (selectedGroups.includes('alunos')) parts.push(`${stuCount} aluno(s)`);
      if (selectedGroups.includes('encarregados')) parts.push(`${stuCount} encarregado(s)`);
    }
    return parts.join(' · ');
  }, [
    canSendSchool,
    selectedGroups,
    instSchoolUsers,
    instTeachers,
    instStudents,
    selectedClassIds,
    selectedStudentIds
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !content.trim()) {
      setFormError('Indique o assunto e a mensagem do comunicado.');
      return;
    }

    if (isSuperAdmin) {
      if (targetScope === 'selected_schools' && selectedInstitutionIds.length === 0) {
        setFormError('Seleccione pelo menos uma instituição escolar destinatária.');
        return;
      }
      onSendAnnouncement({
        channel: 'super_to_schools',
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        targetScope,
        targetInstitutionIds:
          targetScope === 'selected_schools' ? selectedInstitutionIds : undefined
      });
      setIsComposeOpen(false);
      return;
    }

    if (canSendSchool) {
      if (selectedGroups.length === 0) {
        setFormError('Seleccione pelo menos um grupo destinatário da escola.');
        return;
      }
      onSendAnnouncement({
        channel: 'school_to_members',
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        targetGroups: selectedGroups,
        targetClassIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
        targetStudentIds:
          useSpecificMembers && selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
        targetUserIds:
          useSpecificMembers && selectedUserIds.length > 0 ? selectedUserIds : undefined
      });
      setIsComposeOpen(false);
    }
  };

  const describeTargets = (item: Announcement): string => {
    if (item.channel === 'super_to_schools') {
      if (item.targetScope === 'all_schools') {
        return 'Todas as Escolas (Administradores Escolares)';
      }
      const names = (item.targetInstitutionIds || [])
        .map((id) => institutions.find((i) => i.id === id)?.acronym || institutions.find((i) => i.id === id)?.name)
        .filter(Boolean);
      return names.length > 0
        ? `Escolas: ${names.join(', ')}`
        : 'Escolas Seleccionadas';
    }
    const groupLabels = (item.targetGroups || []).map(
      (g) => ANNOUNCEMENT_TARGET_GROUP_LABELS[g] || g
    );
    const classNames = (item.targetClassIds || [])
      .map((cid) => classes.find((c) => c.id === cid)?.name)
      .filter(Boolean);
    const base = groupLabels.join(', ') || 'Comunidade Escolar';
    return classNames.length > 0 ? `${base} · Turmas: ${classNames.join(', ')}` : base;
  };

  const formatDate = (iso: string) => {
    const parsed = Date.parse(iso);
    if (!parsed) return iso;
    return new Date(parsed).toLocaleString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDeleteItem = (item: Announcement) => {
    if (!onDeleteAnnouncement) return false;
    if (isSuperAdmin && item.channel === 'super_to_schools') return true;
    if (
      canSendSchool &&
      item.channel === 'school_to_members' &&
      currentInstitution &&
      item.institutionId === currentInstitution.id
    ) {
      return true;
    }
    return false;
  };

  const availableSchoolsForFilter = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.province.toLowerCase().includes(q) ||
        i.municipality.toLowerCase().includes(q)
    );
  }, [institutions, schoolSearch]);

  const nonStudentSchoolUsers = useMemo(
    () =>
      instSchoolUsers.filter(
        (u) => u.role !== 'aluno' && u.role !== 'encarregado_educacao'
      ),
    [instSchoolUsers]
  );

  return (
    <div className="space-y-5">
      {/* Cabeçalho do Módulo */}
      <div className="bg-white rounded-2xl border border-[#dce7df] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#eaf6ee] border border-[#cde6d5] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-[#067836]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-extrabold text-slate-900 truncate">
                Comunicações &amp; Comunicados Oficiais
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSuperAdmin
                  ? 'Emissão de circulares e directivas do Super Administrador para os Administradores Escolares'
                  : canSendSchool
                  ? `Comunicação institucional de ${currentInstitution?.name || 'Escola'} e circulares recebidas da Administração Geral`
                  : isTreasurer
                  ? `Comunicados recebidos pela Tesouraria / Financeiro · ${currentInstitution?.name || ''}`
                  : `Comunicados oficiais da Direcção Escolar para ${
                      activeRole === 'professor' || activeRole === 'director_turma'
                        ? 'Docentes'
                        : activeRole === 'encarregado_educacao'
                        ? 'Encarregados de Educação'
                        : 'Estudantes'
                    }`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden md:block">
            <span className="text-[11px] font-medium text-slate-500 block">Por Ler</span>
            <span className="font-display text-lg font-extrabold text-slate-900 tabular-nums">
              {unreadCount}
            </span>
          </div>

          {canSend && (
            <button
              type="button"
              onClick={handleOpenComposer}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#067836] hover:bg-[#055827] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Comunicado</span>
            </button>
          )}
        </div>
      </div>

      {isTreasurer && (
        <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-xl px-4 py-3 flex items-center gap-3 text-xs text-[#055827]">
          <ShieldCheck className="w-4 h-4 text-[#067836] shrink-0" />
          <span>
            Este painel apresenta os comunicados emitidos pela Direcção Escolar para o departamento Financeiro. Para enviar avisos de cobrança ou propinas a alunos e encarregados, utilize o módulo Finanças.
          </span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-[#dce7df] p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewFilter('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              viewFilter === 'todos'
                ? 'bg-[#067836] text-white'
                : 'bg-[#f3f7f4] text-slate-700 hover:bg-[#eaf6ee]'
            }`}
          >
            Todos ({sortedAnnouncements.length})
          </button>

          {!isSuperAdmin && (
            <button
              type="button"
              onClick={() => setViewFilter('recebidos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewFilter === 'recebidos'
                  ? 'bg-[#067836] text-white'
                  : 'bg-[#f3f7f4] text-slate-700 hover:bg-[#eaf6ee]'
              }`}
            >
              {canSendSchool ? 'Do Super Admin' : 'Recebidos'}
            </button>
          )}

          {canSend && (
            <button
              type="button"
              onClick={() => setViewFilter('enviados')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewFilter === 'enviados'
                  ? 'bg-[#067836] text-white'
                  : 'bg-[#f3f7f4] text-slate-700 hover:bg-[#eaf6ee]'
              }`}
            >
              {isSuperAdmin ? 'Enviados às Escolas' : 'Enviados pela Escola'}
            </button>
          )}

          {!isSuperAdmin && (
            <button
              type="button"
              onClick={() => setViewFilter('nao_lidos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewFilter === 'nao_lidos'
                  ? 'bg-[#067836] text-white'
                  : 'bg-[#f3f7f4] text-slate-700 hover:bg-[#eaf6ee]'
              }`}
            >
              Não Lidos ({unreadCount})
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'todas' | AnnouncementCategory)}
            className="bg-[#f3f7f4] border border-[#dce7df] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#067836]"
            aria-label="Filtrar por categoria"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="geral">Geral</option>
            <option value="pedagogico">Pedagógico</option>
            <option value="financeiro">Financeiro</option>
            <option value="administrativo">Administrativo</option>
            <option value="urgente">Urgente</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar assunto, texto ou remetente..."
              className="w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-xl bg-[#f3f7f4] border border-[#dce7df] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#067836]"
            />
          </div>
        </div>
      </div>

      {/* Área Principal: Lista + Leitura */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Lista de Comunicados (5 colunas) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#dce7df] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#dce7df] bg-[#f8fbf9] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#067836]" />
              <span>Lista de Comunicados</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {filteredAnnouncements.length} registo(s)
            </span>
          </div>

          {filteredAnnouncements.length === 0 ? (
            <div className="p-8 text-center">
              <MailOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Nenhum comunicado encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || categoryFilter !== 'todas' || viewFilter !== 'todos'
                  ? 'Ajuste os filtros ou limpe a pesquisa para ver outros comunicados.'
                  : canSend
                  ? 'Clique em "Novo Comunicado" para emitir a primeira circular.'
                  : 'Ainda não existem comunicados dirigidos ao seu perfil.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredAnnouncements.map((item) => {
                const isSelected = activeAnnouncement?.id === item.id;
                const isUnread =
                  item.senderUserId !== currentUser.id && !isAnnouncementReadByUser(item, currentUser);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      if (isUnread) onMarkRead(item.id);
                    }}
                    className={`w-full text-left p-4 transition cursor-pointer block ${
                      isSelected
                        ? 'bg-[#eaf6ee]'
                        : isUnread
                        ? 'bg-[#f6fbf8] hover:bg-[#eaf6ee]/60'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-xs leading-snug line-clamp-2 ${
                          isUnread ? 'font-extrabold text-slate-900' : 'font-bold text-slate-800'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {isUnread && (
                        <span className="text-[10px] font-bold text-[#067836] shrink-0">
                          Novo
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.content}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{item.senderName}</span>
                      <span>·</span>
                      <span>{ANNOUNCEMENT_CATEGORY_LABELS[item.category]}</span>
                      <span>·</span>
                      <span className={PRIORITY_TEXT_CLASS[item.priority]}>
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">{formatDate(item.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel de Leitura (7 colunas) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#dce7df] overflow-hidden">
          {!activeAnnouncement ? (
            <div className="p-12 text-center">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">
                Seleccione um comunicado para leitura
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Os detalhes completos, remetente e destinatários aparecem nesta área.
              </p>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                    <span className="text-[#067836]">
                      {activeAnnouncement.channel === 'super_to_schools'
                        ? 'Super Administração → Escolas'
                        : `${activeAnnouncement.institutionName || 'Administração Escolar'} → Comunidade`}
                    </span>
                    <span>·</span>
                    <span>{ANNOUNCEMENT_CATEGORY_LABELS[activeAnnouncement.category]}</span>
                    <span>·</span>
                    <span className={PRIORITY_TEXT_CLASS[activeAnnouncement.priority]}>
                      Prioridade {PRIORITY_LABELS[activeAnnouncement.priority]}
                    </span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                    {activeAnnouncement.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeAnnouncement.senderUserId !== currentUser.id &&
                    !isAnnouncementReadByUser(activeAnnouncement, currentUser) && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(activeAnnouncement.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] text-xs font-bold transition cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Marcar como lido</span>
                      </button>
                    )}

                  {canDeleteItem(activeAnnouncement) && (
                    <button
                      type="button"
                      onClick={() => onDeleteAnnouncement?.(activeAnnouncement.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition cursor-pointer"
                      title="Arquivar / Remover comunicado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Metadados de Remetente e Destino */}
              <div className="bg-[#f8fbf9] border border-[#dce7df] rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Remetente</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {activeAnnouncement.senderName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {activeAnnouncement.senderRoleLabel}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Destinatários
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {describeTargets(activeAnnouncement)}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Emitido em {formatDate(activeAnnouncement.createdAt)}
                  </span>
                </div>
              </div>

              {/* Corpo do Comunicado */}
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {activeAnnouncement.content}
              </div>

              {/* Confirmação de leitura para emissores */}
              {canSend && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4 text-[#067836]" />
                    <span>
                      Leituras confirmadas:{' '}
                      <strong className="text-slate-800 tabular-nums">
                        {(activeAnnouncement.readByUserKeys || []).length}
                      </strong>{' '}
                      utilizador(es)
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Compositor de Novo Comunicado */}
      {isComposeOpen && canSend && (
        <div
          className="fixed inset-0 z-50 bg-emerald-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsComposeOpen(false)}
        >
          <div
            className="bg-white border border-[#dce7df] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-5 h-5" />
                <div>
                  <h2 className="font-display text-base font-extrabold">
                    {isSuperAdmin
                      ? 'Novo Comunicado para Administradores Escolares'
                      : 'Novo Comunicado Institucional'}
                  </h2>
                  <p className="text-[11px] text-emerald-100">
                    {isSuperAdmin
                      ? 'Canal oficial Super Administrador → Direcções Escolares'
                      : `${currentInstitution?.name || 'Escola'} → Utilizadores, Professores, Financeiro, Alunos & Encarregados`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Destinatários: Super Admin vs Admin Escolar */}
              {isSuperAdmin ? (
                <div className="space-y-3 bg-[#f8fbf9] border border-[#dce7df] rounded-xl p-4">
                  <label className="text-xs font-bold text-slate-800 block">
                    Destinatários (Administradores Escolares)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetScope('all_schools')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                        targetScope === 'all_schools'
                          ? 'bg-[#067836] text-white border-[#067836]'
                          : 'bg-white text-slate-700 border-[#dce7df] hover:bg-[#eaf6ee]'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Todas as Escolas ({institutions.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetScope('selected_schools')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                        targetScope === 'selected_schools'
                          ? 'bg-[#067836] text-white border-[#067836]'
                          : 'bg-white text-slate-700 border-[#dce7df] hover:bg-[#eaf6ee]'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Seleccionar Escolas ({selectedInstitutionIds.length})</span>
                    </button>
                  </div>

                  {targetScope === 'selected_schools' && (
                    <div className="space-y-2 pt-2">
                      <input
                        type="text"
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        placeholder="Filtrar escola por nome, província ou município..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#dce7df] text-xs focus:outline-none focus:border-[#067836]"
                      />
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white border border-[#dce7df] rounded-xl">
                        {availableSchoolsForFilter.map((inst) => {
                          const checked = selectedInstitutionIds.includes(inst.id);
                          return (
                            <label
                              key={inst.id}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[#eaf6ee]/50 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleInstitution(inst.id)}
                                  className="rounded border-slate-300 text-[#067836] focus:ring-[#067836]"
                                />
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 block truncate">
                                    {inst.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {inst.province} · {inst.municipality} · Admin:{' '}
                                    {inst.adminName || inst.directorName}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-[#f8fbf9] border border-[#dce7df] rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800">
                      Grupos Destinatários ({currentInstitution?.acronym || 'Escola'})
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedGroups([...ALL_TARGET_GROUPS])}
                        className="text-[11px] font-semibold text-[#067836] hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedGroups(['utilizadores', 'professores', 'financeiro'])
                        }
                        className="text-[11px] font-semibold text-[#067836] hover:underline cursor-pointer"
                      >
                        Staff &amp; Financeiro
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedGroups(['alunos', 'encarregados'])}
                        className="text-[11px] font-semibold text-[#067836] hover:underline cursor-pointer"
                      >
                        Alunos &amp; Encarregados
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_TARGET_GROUPS.map((grp) => {
                      const active = selectedGroups.includes(grp);
                      const Icon =
                        grp === 'professores'
                          ? UserCheck
                          : grp === 'financeiro'
                          ? DollarSign
                          : grp === 'alunos'
                          ? GraduationCap
                          : Users;
                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => toggleGroup(grp)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                            active
                              ? 'bg-[#eaf6ee] border-[#067836] text-[#055827]'
                              : 'bg-white border-[#dce7df] text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{ANNOUNCEMENT_TARGET_GROUP_LABELS[grp]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {schoolReachSummary && (
                    <p className="text-[11px] text-slate-600">
                      Alcance estimado: <strong className="text-slate-800">{schoolReachSummary}</strong>
                    </p>
                  )}

                  {/* Segmentação opcional por Turmas ou Membros Específicos */}
                  {(selectedGroups.includes('professores') ||
                    selectedGroups.includes('alunos') ||
                    selectedGroups.includes('encarregados')) &&
                    instClasses.length > 0 && (
                      <div className="pt-2 border-t border-[#dce7df]">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          Filtrar por Turmas (opcional — vazio envia para todas as turmas)
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {instClasses.map((cls) => {
                            const active = selectedClassIds.includes(cls.id);
                            return (
                              <button
                                key={cls.id}
                                type="button"
                                onClick={() => toggleClass(cls.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                  active
                                    ? 'bg-[#067836] text-white border-[#067836]'
                                    : 'bg-white text-slate-600 border-[#dce7df] hover:bg-[#eaf6ee]'
                                }`}
                              >
                                {cls.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <div className="pt-1">
                    <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSpecificMembers}
                        onChange={(e) => {
                          setUseSpecificMembers(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedStudentIds([]);
                            setSelectedUserIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-[#067836] focus:ring-[#067836]"
                      />
                      <span>Restringir a utilizadores ou alunos específicos (opcional)</span>
                    </label>

                    {useSpecificMembers && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(selectedGroups.includes('utilizadores') ||
                          selectedGroups.includes('professores') ||
                          selectedGroups.includes('financeiro')) && (
                          <div className="bg-white border border-[#dce7df] rounded-xl p-2 max-h-32 overflow-y-auto">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                              Utilizadores / Docentes / Financeiro
                            </span>
                            {nonStudentSchoolUsers.map((usr) => (
                              <label
                                key={usr.id}
                                className="flex items-center gap-2 py-1 text-[11px] text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUserIds.includes(usr.id)}
                                  onChange={() => toggleUserTarget(usr.id)}
                                  className="rounded border-slate-300 text-[#067836]"
                                />
                                <span className="truncate">{usr.fullName}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {(selectedGroups.includes('alunos') ||
                          selectedGroups.includes('encarregados')) && (
                          <div className="bg-white border border-[#dce7df] rounded-xl p-2 max-h-32 overflow-y-auto">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                              Alunos / Encarregados
                            </span>
                            {instStudents.map((stu) => (
                              <label
                                key={stu.id}
                                className="flex items-center gap-2 py-1 text-[11px] text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIds.includes(stu.id)}
                                  onChange={() => toggleStudentTarget(stu.id)}
                                  className="rounded border-slate-300 text-[#067836]"
                                />
                                <span className="truncate">{stu.fullName}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Categoria & Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f3f7f4] border border-[#dce7df] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#067836]"
                  >
                    <option value="geral">Geral</option>
                    <option value="pedagogico">Pedagógico</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f3f7f4] border border-[#dce7df] text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#067836]"
                  >
                    <option value="normal">Normal</option>
                    <option value="importante">Importante</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Assunto */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Assunto / Título do Comunicado
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Convocatória de Conselho de Turma / Reunião Geral"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f3f7f4] border border-[#dce7df] text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#067836]"
                  required
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mensagem Oficial
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="Redija o comunicado com as orientações, datas ou informações relevantes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f3f7f4] border border-[#dce7df] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#067836] leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#dce7df] text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#067836] hover:bg-[#055827] text-white text-xs font-bold transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar Comunicado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
