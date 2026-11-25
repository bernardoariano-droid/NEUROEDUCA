/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão de Utilizadores da Escola (Acesso do Administrador da Escola)
 * Cadastramento de Professores, Financeiro, Direcção, Alunos e Encarregados conforme Permissões
 */

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  GraduationCap,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  X,
  Key,
  Mail,
  Phone,
  Trash2,
  UserCheck,
  AlertCircle,
  Edit2,
  Layers
} from 'lucide-react';
import { Institution, SchoolUser, ClassRoom, Teacher, SchoolSubject } from '../../types';
import {
  resolveSubjectsForClass,
  isMultidisciplinarySubsystem
} from '../../utils/evaluationEngine';

export interface ProfessorClassAssignmentSelection {
  classId: string;
  subjectIds: string[];
}

interface SchoolUsersManagerProps {
  currentInstitution: Institution;
  classes: ClassRoom[];
  users: SchoolUser[];
  teachers?: Teacher[];
  customSubjects?: SchoolSubject[];
  onAddUser: (
    user: SchoolUser,
    password?: string,
    assignedByClass?: ProfessorClassAssignmentSelection[]
  ) => void;
  onUpdateUser: (
    user: SchoolUser,
    assignedByClass?: ProfessorClassAssignmentSelection[]
  ) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword?: (user: SchoolUser, newPassword: string) => void;
}

export const SchoolUsersManager: React.FC<SchoolUsersManagerProps> = ({
  currentInstitution,
  classes,
  users,
  teachers = [],
  customSubjects = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SchoolUser | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Modais seguros para iframe / APK WebView (substituem prompt/confirm/alert)
  const [passwordModalUser, setPasswordModalUser] = useState<SchoolUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('123456');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<SchoolUser | null>(null);

  // Form State para Novo / Editar Utilizador
  const [formRole, setFormRole] = useState<SchoolUser['role']>('professor');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('123');
  const [formPhone, setFormPhone] = useState('');
  const [formBi, setFormBi] = useState('');
  const [formDepartmentOrClass, setFormDepartmentOrClass] = useState('');
  const [formAssignedMap, setFormAssignedMap] = useState<Record<string, string[]>>({});

  const instUsers = users.filter((u) => u.institutionId === currentInstitution.id);
  const instClasses = classes.filter((c) => c.institutionId === currentInstitution.id);
  const instCustomSubjects = customSubjects.filter(
    (s) => s.institutionId === currentInstitution.id
  );

  const filteredUsers = instUsers.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.identityCardNumber && u.identityCardNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.departmentOrClass && u.departmentOrClass.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole =
      selectedRoleFilter === 'todos' ||
      u.role === selectedRoleFilter ||
      (selectedRoleFilter === 'aluno_encarregado' &&
        (u.role === 'aluno' || u.role === 'encarregado_educacao')) ||
      (selectedRoleFilter === 'direcao' &&
        (u.role === 'director_geral' ||
          u.role === 'subdirector_pedagogico' ||
          u.role === 'secretario_geral'));

    return matchSearch && matchRole;
  });

  const totalProfessors = instUsers.filter((u) => u.role === 'professor').length;
  const totalFinance = instUsers.filter((u) => u.role === 'funcionario_financeiro').length;
  const totalStudents = instUsers.filter(
    (u) => u.role === 'aluno' || u.role === 'encarregado_educacao'
  ).length;

  const getSubjectsForClass = (cls: ClassRoom) =>
    resolveSubjectsForClass(
      cls.subsystemCode,
      cls.gradeLevel,
      cls.courseName,
      instCustomSubjects,
      cls.subjects
    );

  const openCreateModal = () => {
    setEditingUser(null);
    setFormError(null);
    setFormRole('professor');
    setFormFullName('');
    setFormEmail('');
    setFormPassword('123');
    setFormPhone('');
    setFormBi('');
    setFormDepartmentOrClass('');
    setFormAssignedMap({});
    setIsModalOpen(true);
  };

  const openEditUserModal = (user: SchoolUser) => {
    setEditingUser(user);
    setFormError(null);
    setFormRole(user.role);
    setFormFullName(user.fullName);
    setFormEmail(user.email);
    setFormPassword('123');
    setFormPhone(user.phone || '');
    setFormBi(user.identityCardNumber || '');
    setFormDepartmentOrClass(user.departmentOrClass || '');
    const matchingTeacher = teachers.find(
      (t) =>
        t.institutionId === currentInstitution.id &&
        t.email.toLowerCase() === user.email.toLowerCase()
    );
    const nextMap: Record<string, string[]> = {};
    (matchingTeacher?.assignedClasses || []).forEach((ac) => {
      if (!nextMap[ac.classId]) nextMap[ac.classId] = [];
      if (!nextMap[ac.classId].includes(ac.subjectId)) {
        nextMap[ac.classId].push(ac.subjectId);
      }
    });
    setFormAssignedMap(nextMap);
    setIsModalOpen(true);
  };

  const toggleClassAssignment = (cls: ClassRoom) => {
    setFormError(null);
    setFormAssignedMap((prev) => {
      if (prev[cls.id]) {
        const next = { ...prev };
        delete next[cls.id];
        return next;
      }
      const clsSubs = getSubjectsForClass(cls);
      const defaultSubjectIds = clsSubs[0] ? [clsSubs[0].id] : [];
      return { ...prev, [cls.id]: defaultSubjectIds };
    });
  };

  const toggleSubjectForClass = (cls: ClassRoom, subjectId: string) => {
    setFormError(null);
    setFormAssignedMap((prev) => {
      const current = prev[cls.id] || [];
      if (current.includes(subjectId)) {
        if (current.length <= 1) {
          setFormError(
            `A turma ${cls.name} deve ter pelo menos 1 disciplina atribuída ao professor.`
          );
          return prev;
        }
        return { ...prev, [cls.id]: current.filter((id) => id !== subjectId) };
      }
      return { ...prev, [cls.id]: [...current, subjectId] };
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formFullName.trim() || !formEmail.trim()) return;

    const cleanEmail = formEmail.trim().toLowerCase();

    const assignedSelections: ProfessorClassAssignmentSelection[] = Object.entries(
      formAssignedMap
    ).map(([classId, subjectIds]) => ({ classId, subjectIds }));

    if (formRole === 'professor') {
      const emptyClass = assignedSelections.find((sel) => sel.subjectIds.length < 1);
      if (emptyClass) {
        const clsObj = instClasses.find((c) => c.id === emptyClass.classId);
        setFormError(
          `Seleccione pelo menos 1 disciplina para a turma ${clsObj?.name || ''}.`
        );
        return;
      }
    }

    const assignedSummaryParts = assignedSelections
      .map((sel) => {
        const clsObj = instClasses.find((c) => c.id === sel.classId);
        if (!clsObj) return null;
        const clsSubs = getSubjectsForClass(clsObj);
        const subNames = clsSubs
          .filter((s) => sel.subjectIds.includes(s.id))
          .map((s) => s.shortName || s.name);
        return subNames.length > 0 ? `${clsObj.code} (${subNames.join(', ')})` : clsObj.name;
      })
      .filter(Boolean);

    const computedDept =
      formRole === 'professor' && assignedSummaryParts.length > 0
        ? assignedSummaryParts.join(' · ')
        : formDepartmentOrClass.trim() || undefined;

    if (editingUser) {
      const updatedUser: SchoolUser = {
        ...editingUser,
        fullName: formFullName.trim(),
        email: cleanEmail,
        phone: formPhone.trim() || editingUser.phone,
        role: formRole,
        identityCardNumber: formBi.trim() || undefined,
        departmentOrClass: computedDept
      };
      onUpdateUser(updatedUser, formRole === 'professor' ? assignedSelections : undefined);
      setIsModalOpen(false);
      setEditingUser(null);
      setSuccessNotice(
        `Utilizador ${updatedUser.fullName} actualizado na memória Localhost!`
      );
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }

    if (instUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setFormError(`O e-mail "${cleanEmail}" já está registado nesta instituição.`);
      return;
    }

    if (formPassword.trim().length < 3) {
      setFormError('A senha inicial deve ter pelo menos 3 caracteres.');
      return;
    }

    const newUser: SchoolUser = {
      id: `usr-${Date.now()}`,
      institutionId: currentInstitution.id,
      fullName: formFullName.trim(),
      email: cleanEmail,
      phone: formPhone.trim() || '+244 923 000 000',
      role: formRole,
      identityCardNumber: formBi.trim() || undefined,
      status: 'activo',
      departmentOrClass: computedDept,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddUser(
      newUser,
      formPassword.trim(),
      formRole === 'professor' ? assignedSelections : undefined
    );

    setIsModalOpen(false);
    setSuccessNotice(
      `Utilizador ${newUser.fullName} (${newUser.role.replace(/_/g, ' ')}) guardado na memória Localhost!`
    );
    setTimeout(() => setSuccessNotice(null), 4000);

    setFormFullName('');
    setFormEmail('');
    setFormPassword('123');
    setFormPhone('');
    setFormBi('');
    setFormDepartmentOrClass('');
    setFormAssignedMap({});
  };

  const handleToggleStatus = (user: SchoolUser) => {
    const updated: SchoolUser = {
      ...user,
      status: user.status === 'activo' ? 'inactivo' : 'activo'
    };
    onUpdateUser(updated);
    setSuccessNotice(`Estado de ${user.fullName} alterado para "${updated.status}" e guardado no Localhost.`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || newPasswordInput.trim().length < 3) return;
    if (onResetPassword) {
      onResetPassword(passwordModalUser, newPasswordInput.trim());
    }
    setSuccessNotice(`Senha de ${passwordModalUser.fullName} redefinida na memória Localhost!`);
    setPasswordModalUser(null);
    setNewPasswordInput('123456');
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmUser) return;
    onDeleteUser(deleteConfirmUser.id);
    setSuccessNotice(`Utilizador ${deleteConfirmUser.fullName} removido da memória Localhost.`);
    setDeleteConfirmUser(null);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    director_geral: { label: 'Director Geral', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    subdirector_pedagogico: { label: 'Subdirector Pedagógico', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    secretario_geral: { label: 'Secretário Geral', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    professor: { label: 'Professor / Docente', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    funcionario_financeiro: { label: 'Finanças / Tesouraria', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    aluno: { label: 'Aluno / Estudante', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    encarregado_educacao: { label: 'Encarregado de Educação', color: 'bg-teal-100 text-teal-800 border-teal-200' }
  };

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            CADASTRO E GESTÃO DE UTILIZADORES
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Perfis com permissões guardadas no Localhost · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center space-x-1.5 min-h-[44px] bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Cadastrar Utilizador</span>
        </button>
      </div>

      {/* Alerta de Feedback */}
      {successNotice && (
        <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
          <span className="font-medium">{successNotice}</span>
        </div>
      )}

      {/* 2. AS 4 CAIXAS MÉTRICAS (Estilo SaaS Unificado) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b6755]">Total Utilizadores</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums">{instUsers.length}</div>
            <p className="text-[11px] text-[#4b6755] font-medium truncate">Base Institucional</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b6755]">Professores</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums">{totalProfessors}</div>
            <p className="text-[11px] text-[#4b6755] font-medium truncate">Turmas &amp; Notas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b6755]">Equipa Financeira</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums">{totalFinance}</div>
            <p className="text-[11px] text-[#4b6755] font-medium truncate">Propinas &amp; Recibos</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b6755]">Alunos &amp; Famílias</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums">{totalStudents}</div>
            <p className="text-[11px] text-[#4b6755] font-medium truncate">Portal Académico</p>
          </div>
        </div>
      </div>

      {/* 3. FILTROS E PESQUISA */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail, BI ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] bg-[#f7fbf8] text-[#064e26] text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'professor', label: 'Professores' },
            { id: 'funcionario_financeiro', label: 'Financeiro' },
            { id: 'aluno_encarregado', label: 'Alunos / Encarregados' },
            { id: 'direcao', label: 'Direcção' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedRoleFilter === tab.id
                  ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                  : 'bg-[#f7fbf8] text-[#4b6755] border border-[#dce7df] hover:bg-[#eaf6ee] hover:text-[#055827]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. LISTA DE UTILIZADORES (CARTÕES NO ANDROID/TELEMÓVEL + TABELA NO TABLET/DESKTOP) */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider">
            UTILIZADORES REGISTADOS ({filteredUsers.length})
          </span>
          <span className="text-xs text-white/85 font-medium hidden sm:inline">Permissões Sincronizadas</span>
        </div>

        {/* Vista em Cartões para Android / Telemóvel (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const roleMeta = roleLabelMap[user.role] || {
                label: user.role,
                color: 'bg-slate-100 text-slate-800 border-slate-200'
              };
              return (
                <div key={user.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{user.fullName}</div>
                      <div className="text-xs text-slate-600 flex items-center space-x-1 mt-0.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-bold border ${roleMeta.color}`}>
                      {roleMeta.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{user.departmentOrClass || 'Sem atribuição'}</span>
                    <span className="font-mono">{user.identityCardNumber || 'S/BI'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                        user.status === 'activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      Estado: <span className="capitalize">{user.status}</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditUserModal(user)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          setPasswordModalUser(user);
                          setNewPasswordInput('123456');
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Senha</span>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmUser(user)}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhum utilizador encontrado para os filtros selecionados.
            </div>
          )}
        </div>

        {/* Vista em Tabela para Tablet & Computador (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white text-slate-500 uppercase font-bold border-b border-slate-200">
                <th className="py-3 px-4">Utilizador / Nome Completo</th>
                <th className="py-3 px-4">Função / Perfil</th>
                <th className="py-3 px-4">Contactos (E-mail / Tel.)</th>
                <th className="py-3 px-4">Atribuição / Departamento</th>
                <th className="py-3 px-4 text-center">N.º BI</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const roleMeta = roleLabelMap[user.role] || {
                    label: user.role,
                    color: 'bg-slate-100 text-slate-800 border-slate-200'
                  };

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{user.fullName}</div>
                        <span className="text-[10px] text-slate-400">ID: {user.id}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${roleMeta.color}`}>
                          {roleMeta.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        {user.departmentOrClass || '--'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-600">
                        {user.identityCardNumber || 'S/BI'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                            user.status === 'activo'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          <span className="capitalize">{user.status}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => openEditUserModal(user)}
                          title="Editar Utilizador / Turmas"
                          className="p-2 rounded text-slate-500 hover:text-sky-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setPasswordModalUser(user);
                            setNewPasswordInput('123456');
                          }}
                          title="Redefinir Senha"
                          className="p-2 rounded text-slate-500 hover:text-amber-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          title="Remover Utilizador"
                          className="p-2 rounded text-slate-500 hover:text-red-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum utilizador encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CADASTRAR NOVO UTILIZADOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up my-4">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingUser ? `EDITAR UTILIZADOR: ${editingUser.fullName}` : 'CADASTRAR NOVO UTILIZADOR'}
                </h3>
                <span className="text-xs text-white/85">
                  {currentInstitution.name} ({currentInstitution.acronym})
                </span>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#064e26] mb-1.5">
                  1. Perfil / Permissões de Acesso *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'professor', label: 'Professor', defaultDept: 'Língua Portuguesa' },
                    { id: 'funcionario_financeiro', label: 'Financeiro', defaultDept: 'Tesouraria & Propinas' },
                    { id: 'aluno', label: 'Aluno', defaultDept: instClasses[0]?.name || 'Turma Geral' },
                    { id: 'encarregado_educacao', label: 'Encarregado', defaultDept: instClasses[0]?.name || 'Portal Encarregado' },
                    { id: 'subdirector_pedagogico', label: 'Pedagógico', defaultDept: 'Subdirecção Pedagógica' },
                    { id: 'secretario_geral', label: 'Secretário', defaultDept: 'Secretaria Geral' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFormRole(item.id as SchoolUser['role']);
                        setFormDepartmentOrClass(item.defaultDept);
                      }}
                      className={`min-h-[42px] py-2 px-2.5 rounded-xl text-center border font-bold transition cursor-pointer ${
                        formRole === item.id
                          ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white border-[#067836]'
                          : 'bg-[#f7fbf8] text-[#055827] border-[#cde6d5] hover:bg-[#eaf6ee]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#064e26] mb-1">
                  2. Nome Completo do Utilizador *
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ex: João Baptista da Silva"
                  className="w-full min-h-[44px] bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              {!editingUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#064e26] mb-1">
                      3. E-mail de Acesso (Login) *
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="utilizador@escola.ao"
                      className="w-full min-h-[44px] bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#064e26] mb-1">
                      4. Senha Inicial de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full min-h-[44px] bg-[#f7fbf8] text-slate-800 font-mono font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#064e26] mb-1">
                    {editingUser ? '3.' : '5.'} Telefone de Contacto (Angola)
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+244 923 000 000"
                    className="w-full min-h-[44px] bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#064e26] mb-1">
                    {editingUser ? '4.' : '6.'} Bilhete de Identidade (BI)
                  </label>
                  <input
                    type="text"
                    value={formBi}
                    onChange={(e) => setFormBi(e.target.value)}
                    placeholder="000000000LA000"
                    className="w-full min-h-[44px] bg-[#f7fbf8] text-slate-800 font-mono uppercase rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>
              </div>

              {formRole === 'professor' ? (
                <div className="space-y-2">
                  <label className="block font-bold text-[#064e26]">
                    {editingUser ? '5.' : '7.'} Atribuição de Turmas e Disciplinas ({Object.keys(formAssignedMap).length} turma(s) seleccionada(s))
                  </label>
                  <p className="text-[11px] text-[#4b6755]">
                    Ao marcar uma turma (especialmente do Secundário ao Superior), seleccione 1 ou mais disciplinas leccionadas pelo professor.
                  </p>
                  {instClasses.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto p-2 bg-[#f7fbf8] border border-[#dce7df] rounded-xl">
                      {instClasses.map((cls) => {
                        const selectedSubs = formAssignedMap[cls.id] || [];
                        const checked = Boolean(formAssignedMap[cls.id]);
                        const clsSubs = getSubjectsForClass(cls);
                        const isMulti = isMultidisciplinarySubsystem(
                          cls.subsystemCode,
                          cls.gradeLevel
                        );
                        return (
                          <div
                            key={cls.id}
                            className={`p-2.5 rounded-xl border text-xs transition ${
                              checked
                                ? 'bg-[#eaf6ee] border-[#067836] text-[#064e26]'
                                : 'bg-white border-[#dce7df] text-slate-700 hover:bg-[#f7fbf8]'
                            }`}
                          >
                            <label className="flex items-center justify-between gap-2 cursor-pointer">
                              <span className="flex items-center space-x-2 min-w-0 font-bold">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleClassAssignment(cls)}
                                  className="rounded border-[#cde6d5] accent-[#067836]"
                                />
                                <span className="truncate">
                                  <Layers className="w-3 h-3 inline mr-1 text-[#067836]" />
                                  {cls.code} — {cls.name}
                                </span>
                              </span>
                              {isMulti && (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded shrink-0">
                                  Multidisciplinar (1+)
                                </span>
                              )}
                            </label>

                            {checked && (
                              <div className="mt-2 pt-2 border-t border-[#cde6d5]">
                                <span className="text-[10px] font-bold uppercase text-[#055827] block mb-1.5">
                                  Disciplinas atribuídas ({selectedSubs.length} — mínimo 1):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {clsSubs.map((sub) => {
                                    const subChecked = selectedSubs.includes(sub.id);
                                    return (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => toggleSubjectForClass(cls, sub.id)}
                                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                          subChecked
                                            ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white border-[#067836]'
                                            : 'bg-white text-slate-700 border-[#cde6d5] hover:bg-[#eaf6ee]'
                                        }`}
                                      >
                                        {subChecked ? '✓ ' : '+ '}
                                        {sub.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2">
                      Nenhuma turma criada ainda. Crie turmas em Gestão de Turmas para atribuir ao professor.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-[#064e26] mb-1">
                    {editingUser ? '5.' : '7.'}{' '}
                    {formRole === 'funcionario_financeiro'
                      ? 'Sector ou Função na Tesouraria'
                      : 'Turma, Processo ou Departamento'}
                  </label>
                  <input
                    type="text"
                    value={formDepartmentOrClass}
                    onChange={(e) => setFormDepartmentOrClass(e.target.value)}
                    placeholder={
                      formRole === 'funcionario_financeiro'
                        ? 'Ex: Responsável Multicaixa / Cobranças'
                        : 'Ex: 10.ª Classe A (Proc: 2026/0410)'
                    }
                    className="w-full min-h-[44px] bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>
              )}

              {(formRole === 'aluno' || formRole === 'encarregado_educacao') && (
                <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5 text-[#064e26]">
                    <ShieldCheck className="w-4 h-4 text-[#067836]" />
                    <span>Permissões Exclusivas (Sem Acesso Administrativo):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-medium text-[#055827]">
                    <span>• Médias das notas por trimestre</span>
                    <span>• Frequências às aulas</span>
                    <span>• Propinas e Multicaixa Express</span>
                    <span>• Pagamento de matrícula e recibos</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#dce7df] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-[#055827] bg-[#f7fbf8] border border-[#cde6d5] hover:bg-[#eaf6ee] font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl text-white bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] font-bold shadow-xs transition cursor-pointer"
                >
                  Guardar no Localhost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REDEFINIR SENHA */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmResetPassword}
            className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-sm overflow-hidden text-xs"
          >
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center space-x-1.5">
                <Key className="w-4 h-4" />
                <span>Redefinir Senha de Acesso</span>
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[#4b6755] mb-2">
                  Utilizador: <strong className="text-[#064e26]">{passwordModalUser.fullName}</strong> ({passwordModalUser.email})
                </p>
                <label className="block font-bold text-[#064e26] mb-1">Nova Senha *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full min-h-[44px] bg-[#f7fbf8] border border-[#cde6d5] rounded-xl px-3 py-2 font-mono text-[#064e26] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] hover:bg-[#eaf6ee] font-bold text-[#055827] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] font-bold text-white cursor-pointer"
                >
                  Confirmar Senha
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CONFIRMAR REMOÇÃO */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-sm overflow-hidden text-xs">
            <div className="bg-red-600 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Remover Utilizador</h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-slate-600">
                Tem a certeza que deseja remover <strong className="text-[#064e26]">{deleteConfirmUser.fullName}</strong> da memória local? As credenciais de login serão igualmente revogadas.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] hover:bg-[#eaf6ee] font-bold text-[#055827] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white cursor-pointer"
                >
                  Sim, Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
