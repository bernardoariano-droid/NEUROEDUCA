/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Barra de Navegação Inferior Móvel (Design Branco, Azul e Verde)
 */

import React from 'react';
import {
  LayoutDashboard,
  School,
  GraduationCap,
  ClipboardList,
  Building2,
  CreditCard,
  BookOpen,
  Menu,
  Users,
  Award,
  UserCheck,
  Receipt,
  HardDrive,
  BarChart3,
  Megaphone
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeRole: UserRole;
  currentUser?: UserProfile | null;
  onOpenSidebar: () => void;
  onOpenInstallPWA?: () => void;
  onOpenMemoryModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  activeRole,
  currentUser,
  onOpenSidebar,
  onOpenMemoryModal
}) => {
  const isSuperAdmin =
    currentUser?.role === 'super_admin' || activeRole === 'super_admin';
  const isMunicipalDirector =
    currentUser?.role === 'director_municipal' || activeRole === 'director_municipal';
  const isProfessor =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma' ||
    activeRole === 'professor' ||
    activeRole === 'director_turma';
  const isStudent =
    currentUser?.role === 'aluno' ||
    currentUser?.role === 'encarregado_educacao' ||
    activeRole === 'aluno' ||
    activeRole === 'encarregado_educacao';
  const isTreasurer = currentUser?.role === 'funcionario_financeiro';

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center py-1.5 px-2 min-w-[56px] min-h-[44px] rounded-xl transition cursor-pointer ${
      active
        ? 'text-[#067836] bg-[#eaf6ee] font-semibold'
        : 'text-slate-500 hover:text-[#067836] font-medium'
    }`;

  return (
    <nav
      aria-label="Navegação Rápida no Telemóvel"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#dce7df] z-30 px-1.5 py-1 shadow-[0_-4px_20px_rgba(2,44,22,0.08)] safe-area-bottom"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {isSuperAdmin ? (
          <>
            <button
              onClick={() => onSelectTab('super_institutions')}
              className={tabClass(currentTab === 'super_institutions')}
            >
              <Building2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Escolas</span>
            </button>

            <button
              onClick={() => onSelectTab('super_subscriptions')}
              className={tabClass(currentTab === 'super_subscriptions')}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Planos</span>
            </button>

            <button
              onClick={() => onSelectTab('super_curriculum')}
              className={tabClass(currentTab === 'super_curriculum')}
            >
              <BookOpen className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Currículo</span>
            </button>

            {onOpenMemoryModal && (
              <button
                onClick={onOpenMemoryModal}
                className={tabClass(false)}
                title="Memória Localhost"
              >
                <HardDrive className="w-5 h-5 mb-0.5 text-emerald-600" />
                <span className="text-[10px] leading-tight">Memória</span>
              </button>
            )}
          </>
        ) : isMunicipalDirector ? (
          <>
            <button
              onClick={() => onSelectTab('municipal_dashboard')}
              className={tabClass(currentTab === 'municipal_dashboard')}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Consolidado</span>
            </button>

            <button
              onClick={() => onSelectTab('municipal_schools')}
              className={tabClass(currentTab === 'municipal_schools')}
            >
              <Building2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Escolas</span>
            </button>

            <button
              onClick={() => onSelectTab('municipal_enrollment')}
              className={tabClass(currentTab === 'municipal_enrollment')}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Matriculados</span>
            </button>

            <button
              onClick={() => onSelectTab('municipal_performance')}
              className={tabClass(currentTab === 'municipal_performance')}
            >
              <BarChart3 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Aproveit.</span>
            </button>
          </>
        ) : isProfessor ? (
          <>
            <button
              onClick={() => onSelectTab('classes')}
              className={tabClass(currentTab === 'classes')}
            >
              <School className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Turmas</span>
            </button>

            <button
              onClick={() => onSelectTab('students')}
              className={tabClass(currentTab === 'students')}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Alunos</span>
            </button>

            <button
              onClick={() => onSelectTab('attendance')}
              className={tabClass(currentTab === 'attendance')}
            >
              <UserCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Chamada</span>
            </button>

            <button
              onClick={() => onSelectTab('evaluations')}
              className={tabClass(currentTab === 'evaluations')}
            >
              <ClipboardList className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Pautas</span>
            </button>
          </>
        ) : isStudent ? (
          <>
            <button
              onClick={() => onSelectTab('student_grades')}
              className={tabClass(
                currentTab === 'student_grades' || currentTab === 'student_portal'
              )}
            >
              <Award className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Notas</span>
            </button>

            <button
              onClick={() => onSelectTab('student_attendance')}
              className={tabClass(currentTab === 'student_attendance')}
            >
              <UserCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Faltas</span>
            </button>

            <button
              onClick={() => onSelectTab('student_tuition')}
              className={tabClass(currentTab === 'student_tuition')}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Propinas</span>
            </button>

            <button
              onClick={() => onSelectTab('student_enrollment')}
              className={tabClass(currentTab === 'student_enrollment')}
            >
              <Receipt className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Matrícula</span>
            </button>
          </>
        ) : isTreasurer ? (
          <>
            <button
              onClick={() => onSelectTab('financial')}
              className={tabClass(currentTab === 'financial')}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Tesouraria</span>
            </button>

            <button
              onClick={() => onSelectTab('documents')}
              className={tabClass(currentTab === 'documents')}
            >
              <Receipt className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Recibos</span>
            </button>

            <button
              onClick={() => onSelectTab('communications')}
              className={tabClass(currentTab === 'communications')}
            >
              <Megaphone className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Comunic.</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={tabClass(currentTab === 'dashboard')}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Início</span>
            </button>

            <button
              onClick={() => onSelectTab('classes')}
              className={tabClass(currentTab === 'classes')}
            >
              <School className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Turmas</span>
            </button>

            <button
              onClick={() => onSelectTab('students')}
              className={tabClass(currentTab === 'students')}
            >
              <GraduationCap className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Alunos</span>
            </button>

            <button
              onClick={() => onSelectTab('financial')}
              className={tabClass(currentTab === 'financial')}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Propinas</span>
            </button>
          </>
        )}

        <button
          onClick={onOpenSidebar}
          className={tabClass(false)}
          title="Abrir Menu Completo"
        >
          <Menu className="w-5 h-5 mb-0.5 text-slate-600" />
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};
