/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Barra Superior Executiva (Branco, Verde Esmeralda & Notificações)
 * Fiel ao Design de Referência mantendo Pesquisa em Cascata, Notificações e Controlo de Perfis
 */

import React, { useState } from 'react';
import {
  School,
  Calendar,
  ChevronDown,
  Bell,
  Menu,
  Grid,
  Smartphone,
  ShieldCheck,
  Database,
  HardDrive,
  UserCheck
} from 'lucide-react';
import {
  Institution,
  UserRole,
  UserProfile,
  Student,
  ClassRoom,
  Teacher,
  SchoolUser,
  SchoolSubject,
  FinancialNotification,
  Announcement
} from '../types';
import {
  NavigationFilterDropdown,
  NavDeepLinkPayload
} from './common/NavigationFilterDropdown';
import { resolveAuthorizedStudentsForUser } from '../utils/studentAccess';
import { isAnnouncementReadByUser } from '../utils/announcementAccess';

interface HeaderProps {
  currentInstitution: Institution | null;
  institutions: Institution[];
  onSelectInstitution: (inst: Institution | null) => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  academicYear: string;
  currentTab: string;
  onOpenSearch?: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  onOpenInstallPWA?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenMemoryModal?: () => void;
  students?: Student[];
  classes?: ClassRoom[];
  teachers?: Teacher[];
  subjects?: SchoolSubject[];
  schoolUsers?: SchoolUser[];
  currentTeacher?: Teacher | null;
  onDeepNavigate?: (payload: NavDeepLinkPayload) => void;
  financialNotifications?: FinancialNotification[];
  onMarkFinancialNotificationRead?: (notificationId: string) => void;
  announcements?: Announcement[];
  onMarkAnnouncementRead?: (announcementId: string) => void;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_admin: 'Super Admin SaaS',
  director_municipal: 'Director Municipal',
  director_geral: 'Administrador',
  admin_institucional: 'Administrador',
  subdirector_pedagogico: 'Subdirector Pedagógico',
  secretario_geral: 'Secretário Geral',
  coordenador_curso: 'Coordenador de Curso',
  funcionario_financeiro: 'Tesoureiro',
  professor: 'Professor',
  director_turma: 'Director de Turma',
  aluno: 'Aluno',
  encarregado_educacao: 'Encarregado'
};

export const Header: React.FC<HeaderProps> = ({
  currentInstitution,
  institutions,
  activeRole,
  onChangeRole,
  academicYear,
  onOpenSearch,
  currentUser,
  onLogout,
  onToggleSidebar,
  onOpenInstallPWA,
  onNavigateTab,
  onOpenMemoryModal,
  students = [],
  classes = [],
  teachers = [],
  subjects = [],
  schoolUsers = [],
  currentTeacher = null,
  onDeepNavigate,
  financialNotifications = [],
  onMarkFinancialNotificationRead,
  announcements = [],
  onMarkAnnouncementRead
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isStudentOrGuardian =
    currentUser?.role === 'aluno' || currentUser?.role === 'encarregado_educacao';
  const isTreasurer = currentUser?.role === 'funcionario_financeiro';
  const isProfessor =
    currentUser?.role === 'professor' || currentUser?.role === 'director_turma';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isMunicipalDirector = currentUser?.role === 'director_municipal';
  const isDirectorLevel =
    !isStudentOrGuardian && !isTreasurer && !isProfessor && !isSuperAdmin && !isMunicipalDirector;

  const matchedStudentIds = isStudentOrGuardian
    ? resolveAuthorizedStudentsForUser(
        students,
        currentInstitution?.id,
        currentUser,
        activeRole
      ).map((s) => s.id)
    : [];

  const relevantFinancialNotifications = financialNotifications.filter((n) => {
    if (currentInstitution && n.institutionId !== currentInstitution.id) return false;
    if (isStudentOrGuardian) {
      return matchedStudentIds.includes(n.studentId);
    }
    return isTreasurer;
  });

  const unreadFinCount = isStudentOrGuardian
    ? relevantFinancialNotifications.filter((n) => !n.isRead).length
    : 0;

  const recentAnnouncements = [...announcements]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);

  const unreadAnnouncementCount = recentAnnouncements.filter(
    (a) => a.senderUserId !== currentUser?.id && !isAnnouncementReadByUser(a, currentUser)
  ).length;

  const totalUnreadBadgeCount = unreadFinCount + unreadAnnouncementCount;

  const fallbackNotifications = isStudentOrGuardian
    ? [
        {
          id: 'stu-notif-1',
          title: 'Portal Académico Activo',
          desc: 'Consulte exclusivamente as suas notas trimestrais, frequências, propinas e documentos.',
          time: 'Hoje',
          isUnread: false,
          notificationId: undefined as string | undefined,
          announcementId: undefined as string | undefined
        }
      ]
    : [
        {
          id: 'notif-1',
          title: 'Lançamento do 1.º Trimestre',
          desc: 'Mini-pautas e pautas trimestrais disponíveis para consulta e validação.',
          time: 'Hoje',
          isUnread: false,
          notificationId: undefined as string | undefined,
          announcementId: undefined as string | undefined
        }
      ];

  const announcementNotifications = recentAnnouncements.map((a) => ({
    id: `ann-${a.id}`,
    title: `Comunicado: ${a.title}`,
    desc: `${a.senderName} · ${a.content}`,
    time: new Date(a.createdAt).toLocaleDateString('pt-AO'),
    isUnread: a.senderUserId !== currentUser?.id && !isAnnouncementReadByUser(a, currentUser),
    notificationId: undefined as string | undefined,
    announcementId: a.id
  }));

  const finNotificationItems = relevantFinancialNotifications.slice(0, 4).map((n) => ({
    id: n.id,
    title: n.title,
    desc: `${n.studentName} · ${n.message}`,
    time: new Date(n.sentAt).toLocaleDateString('pt-AO'),
    isUnread: !n.isRead,
    notificationId: n.id,
    announcementId: undefined as string | undefined
  }));

  const combinedNotifications = [...announcementNotifications, ...finNotificationItems];
  const notifications =
    combinedNotifications.length > 0 ? combinedNotifications.slice(0, 6) : fallbackNotifications;

  const institutionTitle = isSuperAdmin
    ? 'NEUROEDUCA SaaS'
    : isMunicipalDirector
    ? `Direcção Municipal de ${currentUser?.municipality || 'Educação'}`
    : currentInstitution?.name || 'Instituição de Ensino';

  const institutionSubtitle = isSuperAdmin
    ? 'Painel de Administração Multi-institucional'
    : isMunicipalDirector
    ? `Supervisão Municipal · ${currentUser?.province || 'Angola'}`
    : currentInstitution?.municipality && currentInstitution?.province
    ? `${currentInstitution.municipality} · Província de ${currentInstitution.province}`
    : currentInstitution?.municipality
    ? `Município de ${currentInstitution.municipality}`
    : `${currentInstitution?.province || 'Angola'} · República de Angola`;

  const formattedAcademicYear = academicYear.includes('/')
    ? academicYear.replace('/', ' / ')
    : academicYear;

  const displayName = currentUser?.fullName || 'Administrador Escolar';
  const displayRole =
    ROLE_DISPLAY_NAMES[activeRole] ||
    ROLE_DISPLAY_NAMES[currentUser?.role || ''] ||
    'Administrador';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <header className="bg-white border-b border-[#dce7df] text-slate-800 sticky top-0 z-40">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* ZONA ESQUERDA: Menu Mobile + Escola + Ano Lectivo */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#067836] hover:bg-[#eaf6ee] transition cursor-pointer"
              title="Abrir/Fechar Menu Lateral"
              aria-label="Abrir/Fechar Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Identificação da Escola com Ícone Verde */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#eaf6ee] border border-[#cde6d5] flex items-center justify-center shrink-0">
                <School className="w-5 h-5 text-[#067836]" />
              </div>
              <div className="min-w-0">
                <span className="font-display text-sm sm:text-[15px] font-extrabold text-slate-900 block truncate max-w-[160px] sm:max-w-[260px]">
                  {institutionTitle}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[160px] sm:max-w-[260px]">
                  {institutionSubtitle}
                </span>
              </div>
            </div>

            {/* Separador Vertical + Ano Lectivo */}
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#067836] shrink-0" />
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block leading-none">
                    Ano Lectivo
                  </span>
                  <span className="font-display text-xs sm:text-[13px] font-extrabold text-slate-900 tabular-nums mt-0.5 block">
                    {formattedAcademicYear}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ZONA CENTRO: Pesquisa em Cascata */}
          <div className="flex items-center flex-1 justify-end md:justify-center mx-1 sm:mx-2 min-w-0">
            <NavigationFilterDropdown
              currentInstitution={currentInstitution}
              institutions={institutions}
              students={students}
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              schoolUsers={schoolUsers}
              currentUser={currentUser}
              activeRole={activeRole}
              currentTeacher={currentTeacher}
              onNavigate={(payload) => {
                if (onDeepNavigate) {
                  onDeepNavigate(payload);
                } else {
                  onNavigateTab?.(payload.tab);
                }
              }}
            />
          </div>

          {/* ZONA DIREITA: Ações Rápidas + Sino + Perfil do Utilizador */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de Cargo (apenas para Direcção Escolar) */}
            {isDirectorLevel && (
              <div className="hidden 2xl:flex items-center relative">
                <UserCheck className="w-3.5 h-3.5 text-[#067836] absolute left-2.5 pointer-events-none" />
                <select
                  value={activeRole}
                  onChange={(e) => onChangeRole(e.target.value as UserRole)}
                  className="bg-[#eaf6ee]/70 hover:bg-[#eaf6ee] text-[#055827] text-xs rounded-xl pl-8 pr-7 py-1.5 border border-[#cde6d5] focus:outline-none focus:border-[#067836] font-semibold appearance-none cursor-pointer transition"
                  title="Cargo da Direcção Escolar"
                >
                  <option value="director_geral">Director Geral</option>
                  <option value="subdirector_pedagogico">Subdirector Pedagógico</option>
                  <option value="secretario_geral">Secretário Geral</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#067836] absolute right-2 pointer-events-none" />
              </div>
            )}

            {/* Pesquisa Rápida ⌘K */}
            <button
              onClick={onOpenSearch}
              className="hidden lg:inline-flex p-2 min-h-[38px] min-w-[38px] items-center justify-center text-[#067836] hover:bg-[#eaf6ee] rounded-xl transition cursor-pointer"
              title="Pesquisa Rápida (⌘K)"
              aria-label="Pesquisa Rápida"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Notificações */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#067836] hover:bg-[#eaf6ee] rounded-xl transition cursor-pointer"
                title="Notificações"
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5 fill-[#067836]/15 text-[#067836]" />
                {totalUnreadBadgeCount > 0 ? (
                  <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white tabular-nums">
                    {totalUnreadBadgeCount}
                  </span>
                ) : (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[#067836] text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white tabular-nums">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#dce7df] text-slate-800 z-50 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold">
                      {announcementNotifications.length > 0
                        ? 'Comunicados & Notificações'
                        : relevantFinancialNotifications.length > 0
                        ? 'Notificações da Tesouraria'
                        : 'Notificações Recentes'}
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-emerald-100 hover:text-white text-xs font-semibold cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 p-3 max-h-72 overflow-y-auto">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`py-2.5 text-xs ${
                          item.isUnread ? 'bg-[#eaf6ee]/70 -mx-1 px-2 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {item.isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0" />
                            )}
                            <span className="line-clamp-1">{item.title}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                          {item.desc}
                        </p>
                        {item.notificationId &&
                          isStudentOrGuardian &&
                          item.isUnread &&
                          onMarkFinancialNotificationRead && (
                            <button
                              type="button"
                              onClick={() => onMarkFinancialNotificationRead(item.notificationId!)}
                              className="mt-1.5 text-[11px] font-semibold text-[#067836] hover:underline cursor-pointer"
                            >
                              Marcar como lida
                            </button>
                          )}
                        {item.announcementId && onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => {
                              if (item.isUnread && onMarkAnnouncementRead) {
                                onMarkAnnouncementRead(item.announcementId!);
                              }
                              setShowNotifications(false);
                              onNavigateTab(isSuperAdmin ? 'super_communications' : 'communications');
                            }}
                            className="mt-1.5 text-[11px] font-semibold text-[#067836] hover:underline cursor-pointer"
                          >
                            Abrir Comunicado →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {onNavigateTab && !isMunicipalDirector && (
                    <div className="px-4 py-2.5 bg-[#f3f7f4] border-t border-[#dce7df] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNotifications(false);
                          onNavigateTab(isSuperAdmin ? 'super_communications' : 'communications');
                        }}
                        className="text-xs font-bold text-[#067836] hover:underline cursor-pointer"
                      >
                        Centro de Comunicados →
                      </button>

                      {(isStudentOrGuardian || isTreasurer) && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            onNavigateTab(isStudentOrGuardian ? 'student_tuition' : 'financial');
                          }}
                          className="text-xs font-bold text-slate-600 hover:text-[#067836] hover:underline cursor-pointer"
                        >
                          {isStudentOrGuardian ? 'Finanças →' : 'Tesouraria →'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Separador + Perfil do Utilizador (conforme imagem de referência) */}
            <div className="relative pl-2 sm:pl-3 border-l border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl hover:bg-[#f3f7f4] transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#067836] to-[#149a45] text-white flex items-center justify-center font-display text-xs font-extrabold shrink-0 shadow-xs ring-2 ring-[#eaf6ee]">
                  {initials || 'NE'}
                </div>
                <div className="hidden sm:block min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-[140px]">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[140px]">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#dce7df] z-50 overflow-hidden text-xs">
                  <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-3.5">
                    <span className="font-bold block truncate">{displayName}</span>
                    <span className="text-[11px] text-emerald-100 block truncate">
                      {currentUser?.email}
                    </span>
                  </div>

                  <div className="p-2 space-y-1">
                    {isDirectorLevel && (
                      <div className="px-2 py-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Cargo Activo da Direcção
                        </label>
                        <select
                          value={activeRole}
                          onChange={(e) => {
                            onChangeRole(e.target.value as UserRole);
                            setShowUserMenu(false);
                          }}
                          className="w-full bg-[#f3f7f4] text-slate-800 rounded-lg px-2.5 py-1.5 border border-[#dce7df] text-xs font-semibold focus:outline-none focus:border-[#067836]"
                        >
                          <option value="director_geral">Director Geral</option>
                          <option value="subdirector_pedagogico">Subdirector Pedagógico</option>
                          <option value="secretario_geral">Secretário Geral</option>
                        </select>
                      </div>
                    )}

                    {onOpenMemoryModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenMemoryModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eaf6ee] text-slate-700 hover:text-[#067836] font-semibold transition cursor-pointer"
                      >
                        <HardDrive className="w-4 h-4 text-[#067836]" />
                        <span>Memória Localhost &amp; Backup</span>
                      </button>
                    )}

                    {onOpenInstallPWA && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenInstallPWA();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eaf6ee] text-slate-700 hover:text-[#067836] font-semibold transition cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4 text-[#067836]" />
                        <span>Instalar Aplicativo (APK)</span>
                      </button>
                    )}

                    {currentUser?.role !== 'aluno' &&
                      currentUser?.role !== 'encarregado_educacao' &&
                      currentUser?.role !== 'professor' &&
                      currentUser?.role !== 'director_turma' &&
                      currentUser?.role !== 'director_municipal' &&
                      onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onNavigateTab('super_supabase_sql');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eaf6ee] text-slate-700 hover:text-[#067836] font-semibold transition cursor-pointer"
                        >
                          <Database className="w-4 h-4 text-[#067836]" />
                          <span>Base de Dados &amp; SQL</span>
                        </button>
                      )}

                    {isTreasurer && (
                      <div className="px-3 py-2 rounded-xl bg-[#eaf6ee] text-[#055827] flex items-center gap-2 font-semibold">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Perfil Tesoureiro Exclusivo</span>
                      </div>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold transition cursor-pointer"
                      >
                        Terminar Sessão
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
