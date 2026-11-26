/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Menu Lateral Executivo (Verde Esmeralda Profundo & Branco)
 * 100% no Idioma Português de Angola · Fiel ao Novo Design System
 */

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  Sparkles,
  DollarSign,
  FileText,
  BarChart3,
  School,
  LogOut,
  Settings,
  UserCheck,
  CreditCard,
  History,
  Activity,
  Award,
  Receipt,
  X,
  HardDrive,
  Smartphone,
  FolderArchive,
  Headphones,
  Megaphone,
  HeartHandshake,
  ListChecks
} from 'lucide-react';
import { Institution, UserRole, UserProfile } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentInstitution: Institution | null;
  activeRole: UserRole;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenMemoryModal?: () => void;
  onOpenInstallPWA?: () => void;
  currentEvalSubTab?: 'mini_pauta' | 'pauta_geral' | 'boletim_aluno';
  onOpenEvaluations?: (evalTab: 'mini_pauta' | 'pauta_geral' | 'boletim_aluno') => void;
  unreadAnnouncementsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentInstitution,
  activeRole,
  currentUser,
  onLogout,
  isOpen = true,
  onClose,
  onOpenMemoryModal,
  onOpenInstallPWA,
  currentEvalSubTab,
  onOpenEvaluations,
  unreadAnnouncementsCount = 0
}) => {
  const isSuperAdminMode =
    currentUser?.role === 'super_admin' || activeRole === 'super_admin';
  const isMunicipalDirectorMode =
    currentUser?.role === 'director_municipal' || activeRole === 'director_municipal';
  const isProfessorMode =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma' ||
    activeRole === 'professor' ||
    activeRole === 'director_turma';
  const isStudentMode =
    currentUser?.role === 'aluno' ||
    currentUser?.role === 'encarregado_educacao' ||
    activeRole === 'aluno' ||
    activeRole === 'encarregado_educacao';
  const isTreasurerMode = currentUser?.role === 'funcionario_financeiro';

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  };

  const navItemClass = (isActive: boolean) => {
    if (isActive) {
      return 'w-full min-h-[42px] flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold rounded-xl bg-gradient-to-r from-[#24b450] to-[#128a38] text-white shadow-[0_3px_10px_rgba(0,0,0,0.18)] border border-white/15 transition-all cursor-pointer';
    }
    return 'w-full min-h-[40px] flex items-center justify-between px-3.5 py-2 text-[13px] font-medium rounded-xl text-emerald-50/90 hover:bg-white/10 hover:text-white border border-transparent transition-all cursor-pointer';
  };

  const iconClass = (isActive: boolean) =>
    `w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-emerald-100/85'}`;

  const SectionLabel = ({ title }: { title: string }) => (
    <div className="px-3.5 pt-3.5 pb-1 first:pt-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
        {title}
      </span>
    </div>
  );

  return (
    <>
      {/* Backdrop para Telefone e Tablet (< lg) */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-emerald-950/50 z-40 backdrop-blur-xs lg:hidden transition-opacity cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Menu Lateral em Verde Esmeralda Profundo conforme o Design de Referência */}
      <aside
        aria-label="Menu Principal"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gradient-to-b from-[#015a29] via-[#047235] to-[#00441e] text-white flex flex-col shadow-2xl lg:shadow-none transition-transform duration-200 ease-out lg:static lg:w-[250px] lg:min-h-screen lg:translate-x-0 select-none shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        {/* 1. Identidade NEUROEDUCA (Capelo Branco + Tipografia Clara) */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10 relative">
          <button
            onClick={onClose}
            className="lg:hidden absolute right-3 top-3 p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar Menu"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-10 flex items-center justify-center mb-1.5">
              <GraduationCap className="w-10 h-10 text-white drop-shadow-sm" strokeWidth={2} />
            </div>
            <span className="font-display text-xl font-extrabold tracking-wider text-white leading-none">
              NEUROEDUCA
            </span>
            <span className="text-[11px] text-emerald-100/85 font-medium mt-1">
              Gestão Escolar Inteligente
            </span>
          </div>
        </div>

        {/* 2. Navegação Organizada por Perfil */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {isSuperAdminMode ? (
            <>
              <SectionLabel title="Administração SaaS" />
              <button
                onClick={() => handleTabClick('super_institutions')}
                className={navItemClass(currentTab === 'super_institutions')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className={iconClass(currentTab === 'super_institutions')} />
                  <span className="truncate">Instituições &amp; Escolas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('super_users')}
                className={navItemClass(currentTab === 'super_users')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className={iconClass(currentTab === 'super_users')} />
                  <span className="truncate">Utilizadores &amp; Gestores</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('super_subscriptions')}
                className={navItemClass(currentTab === 'super_subscriptions')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard className={iconClass(currentTab === 'super_subscriptions')} />
                  <span className="truncate">Planos de Subscrição</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('super_communications')}
                className={navItemClass(currentTab === 'super_communications')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Megaphone className={iconClass(currentTab === 'super_communications')} />
                  <span className="truncate">Comunicações</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('super_psychopedagogical')}
                className={navItemClass(currentTab === 'super_psychopedagogical')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <HeartHandshake className={iconClass(currentTab === 'super_psychopedagogical')} />
                  <span className="truncate">Psicopedagogia &amp; Inclusão</span>
                </div>
              </button>

              <SectionLabel title="Currículo &amp; Auditoria" />
              <button
                onClick={() => handleTabClick('super_curriculum')}
                className={navItemClass(currentTab === 'super_curriculum')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className={iconClass(currentTab === 'super_curriculum')} />
                  <span className="truncate">11 Subsistemas Angola</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('super_supabase_sql')}
                className={navItemClass(currentTab === 'super_supabase_sql')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className={iconClass(currentTab === 'super_supabase_sql')} />
                  <span className="truncate">Configurações &amp; SQL</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('super_audit')}
                className={navItemClass(currentTab === 'super_audit')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <History className={iconClass(currentTab === 'super_audit')} />
                  <span className="truncate">Registo de Auditoria</span>
                </div>
              </button>
            </>
          ) : isMunicipalDirectorMode ? (
            <>
              <SectionLabel title="Direcção Municipal" />
              <button
                onClick={() => handleTabClick('municipal_dashboard')}
                className={navItemClass(currentTab === 'municipal_dashboard')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutDashboard className={iconClass(currentTab === 'municipal_dashboard')} />
                  <span className="truncate">Consolidado do Município</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('municipal_schools')}
                className={navItemClass(currentTab === 'municipal_schools')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className={iconClass(currentTab === 'municipal_schools')} />
                  <span className="truncate">Escolas do Município</span>
                </div>
              </button>

              <SectionLabel title="Estatísticas &amp; Desempenho" />
              <button
                onClick={() => handleTabClick('municipal_enrollment')}
                className={navItemClass(currentTab === 'municipal_enrollment')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className={iconClass(currentTab === 'municipal_enrollment')} />
                  <span className="truncate">Matriculados (M/F)</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('municipal_performance')}
                className={navItemClass(currentTab === 'municipal_performance')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BarChart3 className={iconClass(currentTab === 'municipal_performance')} />
                  <span className="truncate">Aproveitamento Escolar</span>
                </div>
              </button>
            </>
          ) : isProfessorMode ? (
            <>
              <SectionLabel title="Turmas &amp; Alunos" />
              <button
                onClick={() => handleTabClick('classes')}
                className={navItemClass(currentTab === 'classes')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <School className={iconClass(currentTab === 'classes')} />
                  <span className="truncate">Minhas Turmas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('students')}
                className={navItemClass(currentTab === 'students')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className={iconClass(currentTab === 'students')} />
                  <span className="truncate">Alunos da Turma</span>
                </div>
              </button>

              <SectionLabel title="Avaliação &amp; Frequência" />
              <button
                onClick={() => handleTabClick('attendance')}
                className={navItemClass(currentTab === 'attendance')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserCheck className={iconClass(currentTab === 'attendance')} />
                  <span className="truncate">Frequência Diária</span>
                </div>
              </button>

              <button
                onClick={() => {
                  if (onOpenEvaluations) {
                    onOpenEvaluations('mini_pauta');
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose?.();
                    }
                  } else {
                    handleTabClick('evaluations');
                  }
                }}
                className={navItemClass(
                  currentTab === 'evaluations' && (!currentEvalSubTab || currentEvalSubTab === 'mini_pauta')
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ClipboardList
                    className={iconClass(
                      currentTab === 'evaluations' && (!currentEvalSubTab || currentEvalSubTab === 'mini_pauta')
                    )}
                  />
                  <span className="truncate">Mini-Pautas &amp; Notas</span>
                </div>
              </button>

              <button
                onClick={() => {
                  if (onOpenEvaluations) {
                    onOpenEvaluations('pauta_geral');
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose?.();
                    }
                  } else {
                    handleTabClick('evaluations');
                  }
                }}
                className={navItemClass(
                  currentTab === 'evaluations' && currentEvalSubTab === 'pauta_geral'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Award
                    className={iconClass(
                      currentTab === 'evaluations' && currentEvalSubTab === 'pauta_geral'
                    )}
                  />
                  <span className="truncate">Pautas da Turma</span>
                </div>
              </button>

              <button
                onClick={() => {
                  if (onOpenEvaluations) {
                    onOpenEvaluations('boletim_aluno');
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose?.();
                    }
                  } else {
                    handleTabClick('evaluations');
                  }
                }}
                className={navItemClass(
                  currentTab === 'evaluations' && currentEvalSubTab === 'boletim_aluno'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText
                    className={iconClass(
                      currentTab === 'evaluations' && currentEvalSubTab === 'boletim_aluno'
                    )}
                  />
                  <span className="truncate">Boletim de Notas</span>
                </div>
              </button>

              <SectionLabel title="Documentos &amp; Apoio" />
              <button
                onClick={() => handleTabClick('digital_archive')}
                className={navItemClass(currentTab === 'digital_archive')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderArchive className={iconClass(currentTab === 'digital_archive')} />
                  <span className="truncate">Arquivo Digital</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('pedagogical_ai')}
                className={navItemClass(currentTab === 'pedagogical_ai')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className={iconClass(currentTab === 'pedagogical_ai')} />
                  <span className="truncate">Planos de Aula &amp; IA</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('communications')}
                className={navItemClass(currentTab === 'communications')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Megaphone className={iconClass(currentTab === 'communications')} />
                  <span className="truncate">Comunicações</span>
                </div>
                {unreadAnnouncementsCount > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white tabular-nums">
                    {unreadAnnouncementsCount}
                  </span>
                )}
              </button>
            </>
          ) : isStudentMode ? (
            <>
              <SectionLabel title="Área Académica" />
              <button
                onClick={() => handleTabClick('student_portal')}
                className={navItemClass(currentTab === 'student_portal')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutDashboard className={iconClass(currentTab === 'student_portal')} />
                  <span className="truncate">Visão Geral</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('student_grades')}
                className={navItemClass(currentTab === 'student_grades')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Award className={iconClass(currentTab === 'student_grades')} />
                  <span className="truncate">Médias &amp; Trimestres</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('student_attendance')}
                className={navItemClass(currentTab === 'student_attendance')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserCheck className={iconClass(currentTab === 'student_attendance')} />
                  <span className="truncate">Frequências &amp; Faltas</span>
                </div>
              </button>

              <SectionLabel title="Finanças &amp; Documentos" />
              <button
                onClick={() => handleTabClick('student_tuition')}
                className={navItemClass(currentTab === 'student_tuition')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard className={iconClass(currentTab === 'student_tuition')} />
                  <span className="truncate">Propinas &amp; Multicaixa</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('student_enrollment')}
                className={navItemClass(currentTab === 'student_enrollment')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Receipt className={iconClass(currentTab === 'student_enrollment')} />
                  <span className="truncate">Matrícula</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('documents')}
                className={navItemClass(currentTab === 'documents')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className={iconClass(currentTab === 'documents')} />
                  <span className="truncate">Declarações &amp; Certificados</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('digital_archive')}
                className={navItemClass(
                  currentTab === 'digital_archive' || currentTab === 'student_archive'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderArchive
                    className={iconClass(
                      currentTab === 'digital_archive' || currentTab === 'student_archive'
                    )}
                  />
                  <span className="truncate">Arquivo Digital</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('communications')}
                className={navItemClass(currentTab === 'communications')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Megaphone className={iconClass(currentTab === 'communications')} />
                  <span className="truncate">Comunicações</span>
                </div>
                {unreadAnnouncementsCount > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white tabular-nums">
                    {unreadAnnouncementsCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleTabClick('dashboard')}
                className={navItemClass(currentTab === 'dashboard')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutDashboard className={iconClass(currentTab === 'dashboard')} />
                  <span className="truncate">Dashboard</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('students')}
                className={navItemClass(currentTab === 'students')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className={iconClass(currentTab === 'students')} />
                  <span className="truncate">Alunos</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('classes')}
                className={navItemClass(currentTab === 'classes')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <School className={iconClass(currentTab === 'classes')} />
                  <span className="truncate">Turmas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('class_lists')}
                className={navItemClass(currentTab === 'class_lists')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ListChecks className={iconClass(currentTab === 'class_lists')} />
                  <span className="truncate">Listas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('teachers')}
                className={navItemClass(currentTab === 'teachers')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserCheck className={iconClass(currentTab === 'teachers')} />
                  <span className="truncate">Professores</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('evaluations')}
                className={navItemClass(currentTab === 'evaluations')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ClipboardList className={iconClass(currentTab === 'evaluations')} />
                  <span className="truncate">Notas e Pautas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('financial')}
                className={navItemClass(currentTab === 'financial')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DollarSign className={iconClass(currentTab === 'financial')} />
                  <span className="truncate">
                    {isTreasurerMode ? 'Finanças (Tesoureiro)' : 'Finanças'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('reports')}
                className={navItemClass(currentTab === 'reports')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BarChart3 className={iconClass(currentTab === 'reports')} />
                  <span className="truncate">Relatórios</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('documents')}
                className={navItemClass(currentTab === 'documents')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className={iconClass(currentTab === 'documents')} />
                  <span className="truncate">Documentos</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('digital_archive')}
                className={navItemClass(currentTab === 'digital_archive')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderArchive className={iconClass(currentTab === 'digital_archive')} />
                  <span className="truncate">Arquivo Digital</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('communications')}
                className={navItemClass(currentTab === 'communications')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Megaphone className={iconClass(currentTab === 'communications')} />
                  <span className="truncate">Comunicações</span>
                </div>
                {unreadAnnouncementsCount > 0 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white tabular-nums">
                    {unreadAnnouncementsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabClick('attendance')}
                className={navItemClass(currentTab === 'attendance')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Activity className={iconClass(currentTab === 'attendance')} />
                  <span className="truncate">Frequência &amp; Faltas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('subjects')}
                className={navItemClass(currentTab === 'subjects')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className={iconClass(currentTab === 'subjects')} />
                  <span className="truncate">Disciplinas</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('school_users')}
                className={navItemClass(currentTab === 'school_users')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Users className={iconClass(currentTab === 'school_users')} />
                  <span className="truncate">Utilizador</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('school_settings')}
                className={navItemClass(currentTab === 'school_settings')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className={iconClass(currentTab === 'school_settings')} />
                  <span className="truncate">Configurações</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('specialized_subsystems')}
                className={navItemClass(currentTab === 'specialized_subsystems')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Award className={iconClass(currentTab === 'specialized_subsystems')} />
                  <span className="truncate">Módulos Específicos</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('pedagogical_ai')}
                className={navItemClass(currentTab === 'pedagogical_ai')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className={iconClass(currentTab === 'pedagogical_ai')} />
                  <span className="truncate">Assistente Pedagógico</span>
                </div>
              </button>

              {Boolean(currentInstitution?.features?.psychopedagogicalSupport) && (
                <button
                  onClick={() => handleTabClick('psychopedagogical')}
                  className={navItemClass(currentTab === 'psychopedagogical')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <HeartHandshake className={iconClass(currentTab === 'psychopedagogical')} />
                    <span className="truncate">Psicopedagogia &amp; NEE</span>
                  </div>
                </button>
              )}

              {onOpenMemoryModal && (
                <button
                  onClick={() => {
                    onOpenMemoryModal();
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose?.();
                    }
                  }}
                  className={navItemClass(false)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <HardDrive className={iconClass(false)} />
                    <span className="truncate">Backup</span>
                  </div>
                </button>
              )}
            </>
          )}
        </nav>

        {/* 3. Cartão de Suporte Técnico, Lema & Utilitários de Sessão */}
        <div className="px-3.5 pt-2 pb-4 border-t border-white/10 space-y-2.5">
          {/* Bloco Suporte Técnico conforme o Design */}
          <div className="bg-[#00441f]/90 border border-white/15 rounded-xl p-3 flex items-center gap-3 shadow-inner">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block leading-tight">
                Suporte Técnico
              </span>
              <span className="text-[11px] font-mono text-emerald-100/90 block mt-0.5 tabular-nums">
                {currentInstitution?.phone || '+244 923 456 789'}
              </span>
            </div>
          </div>

          {/* Tagline Institucional */}
          <p className="text-center text-[11px] italic font-medium text-emerald-100/90 leading-snug px-2">
            Educar hoje, Transformar amanhã!
          </p>

          {/* Ações Rápidas de Sessão / APK / Memória */}
          <div className="flex items-center gap-1.5 pt-1">
            {onOpenMemoryModal &&
              (isSuperAdminMode || isMunicipalDirectorMode || isProfessorMode || isStudentMode) && (
              <button
                onClick={() => {
                  onOpenMemoryModal();
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onClose?.();
                  }
                }}
                className="flex-1 min-h-[34px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition cursor-pointer"
                title="Backup JSON & Nuvem Supabase"
              >
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Backup</span>
              </button>
            )}

            {onOpenInstallPWA && (
              <button
                onClick={() => {
                  onOpenInstallPWA();
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onClose?.();
                  }
                }}
                className="flex-1 min-h-[34px] flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition cursor-pointer"
                title="Instalar Aplicativo (APK)"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">App</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex-1 min-h-[34px] flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white text-[11px] font-semibold transition cursor-pointer"
                title="Terminar Sessão de Trabalho"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sair</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
