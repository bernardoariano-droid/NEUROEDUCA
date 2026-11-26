/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão Global de Utilizadores e Administradores (Super Administrador)
 * Permite pesquisar, filtrar por escola/perfil, cadastrar gestores, activar/suspender e redefinir senhas
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  Building2,
  Key,
  Power,
  CheckCircle2,
  X,
  AlertCircle,
  Mail,
  Sliders,
  MapPin,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Institution, SchoolUser, StoredCredential, UserRole } from '../../types';

interface SuperUsersManagerProps {
  institutions: Institution[];
  schoolUsers: SchoolUser[];
  accounts: StoredCredential[];
  onAddUser: (user: SchoolUser, password?: string) => void;
  onUpdateUser: (user: SchoolUser, previousEmail?: string) => void;
  onDeleteUser?: (user: SchoolUser) => void;
  onResetPassword: (user: SchoolUser, newPassword: string) => void;
  onOpenInstitutionConfig?: (institutionId: string) => void;
  initialSearchTerm?: string;
  navigationKey?: number;
}

export const SuperUsersManager: React.FC<SuperUsersManagerProps> = ({
  institutions,
  schoolUsers,
  accounts,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onOpenInstitutionConfig,
  initialSearchTerm = '',
  navigationKey
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [institutionFilter, setInstitutionFilter] = useState<string>('todas');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(SchoolUser & { originalEmail?: string }) | null>(null);
  const [userToDelete, setUserToDelete] = useState<(SchoolUser & { institutionName?: string }) | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<SchoolUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('123456');
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states para novo gestor escolar / Director Municipal ou edição
  const [formInstId, setFormInstId] = useState(institutions[0]?.id || '');
  const [formMunicipality, setFormMunicipality] = useState(
    institutions[0]?.municipality || 'Kilamba Kiaxi'
  );
  const [formCustomMunicipality, setFormCustomMunicipality] = useState('');
  const [formProvince, setFormProvince] = useState(institutions[0]?.province || 'Luanda');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('+244 923 000 000');
  const [formRole, setFormRole] = useState<SchoolUser['role']>('director_geral');
  const [formPassword, setFormPassword] = useState('123');
  const [formStatus, setFormStatus] = useState<'activo' | 'inactivo'>('activo');

  const availableMunicipalities = React.useMemo(() => {
    const map = new Map<string, string>();
    institutions.forEach((inst) => {
      if (inst.municipality?.trim()) {
        map.set(inst.municipality.trim(), inst.province || 'Angola');
      }
    });
    const defaults: Array<[string, string]> = [
      ['Kilamba Kiaxi', 'Luanda'],
      ['Luanda', 'Luanda'],
      ['Talatona', 'Luanda'],
      ['Viana', 'Luanda'],
      ['Cazenga', 'Luanda'],
      ['Belas', 'Luanda'],
      ['Lobito', 'Benguela'],
      ['Benguela', 'Benguela'],
      ['Lubango', 'Huíla'],
      ['Huambo', 'Huambo']
    ];
    defaults.forEach(([mun, prov]) => {
      if (!map.has(mun)) map.set(mun, prov);
    });
    return Array.from(map.entries()).map(([municipality, province]) => ({
      municipality,
      province,
      schoolsCount: institutions.filter(
        (i) => i.municipality.trim().toLowerCase() === municipality.toLowerCase()
      ).length
    }));
  }, [institutions]);

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm, navigationKey]);

  // Consolidar utilizadores de todas as instituições + directores municipais + administradores designados
  const allManagedUsers = React.useMemo(() => {
    const map = new Map<string, SchoolUser & { institutionName: string }>();

    schoolUsers.forEach((u) => {
      const inst = institutions.find((i) => i.id === u.institutionId);
      const isMun = u.role === 'director_municipal';
      map.set(u.email.toLowerCase(), {
        ...u,
        institutionName: isMun
          ? `Município de ${u.municipality || 'Angola'}${u.province ? ` (${u.province})` : ''}`
          : inst?.name || 'Instituição Registada'
      });
    });

    // Garantir que Directores Municipais presentes nas contas autenticáveis apareçam na tabela
    accounts.forEach((acc) => {
      if (acc.role === 'director_municipal') {
        const key = acc.email.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `mun-${key}`,
            institutionId: 'municipal',
            municipality: acc.municipality || 'Kilamba Kiaxi',
            province: acc.province || 'Luanda',
            fullName: acc.fullName,
            email: acc.email,
            phone: '+244 923 000 000',
            role: 'director_municipal',
            status: acc.status === 'inactivo' ? 'inactivo' : 'activo',
            departmentOrClass: `Direcção Municipal da Educação de ${acc.municipality || 'Kilamba Kiaxi'}`,
            createdAt: '2026-01-01',
            institutionName: `Município de ${acc.municipality || 'Kilamba Kiaxi'}${
              acc.province ? ` (${acc.province})` : ''
            }`
          });
        }
      }
    });

    // Garantir que administradores principais das escolas estejam visíveis (excepto se explicitamente removidos)
    institutions.forEach((inst) => {
      if (inst.adminEmail === '') return;
      const email = (inst.adminEmail || inst.email || '').toLowerCase();
      if (email && !map.has(email)) {
        map.set(email, {
          id: `admin-${inst.id}`,
          institutionId: inst.id,
          fullName: inst.adminName || inst.directorName,
          email: inst.adminEmail || inst.email,
          phone: inst.adminPhone || inst.phone,
          role: 'director_geral',
          status: inst.status === 'active' ? 'activo' : 'inactivo',
          departmentOrClass: 'Administrador Principal da Escola',
          createdAt: inst.createdAt,
          institutionName: inst.name
        });
      }
    });

    return Array.from(map.values());
  }, [schoolUsers, institutions, accounts]);

  const filteredUsers = allManagedUsers.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.institutionName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);

    const matchInst = institutionFilter === 'todas' || u.institutionId === institutionFilter;
    const matchRole = roleFilter === 'todos' || u.role === roleFilter;
    const matchStatus = statusFilter === 'todos' || u.status === statusFilter;

    return matchSearch && matchInst && matchRole && matchStatus;
  });

  const activeCount = allManagedUsers.filter((u) => u.status === 'activo').length;
  const adminCount = allManagedUsers.filter(
    (u) =>
      u.role === 'director_municipal' ||
      u.role === 'director_geral' ||
      u.role === 'subdirector_pedagogico' ||
      u.role === 'secretario_geral'
  ).length;
  const suspendedCount = allManagedUsers.filter((u) => u.status === 'inactivo').length;

  const getRoleLabel = (role: UserRole | SchoolUser['role']) => {
    switch (role) {
      case 'director_municipal':
        return 'Director Municipal da Educação';
      case 'director_geral':
        return 'Director Geral / Admin Escola';
      case 'subdirector_pedagogico':
        return 'Subdirector Pedagógico';
      case 'secretario_geral':
        return 'Secretário Geral';
      case 'funcionario_financeiro':
        return 'Tesouraria / Financeiro';
      case 'professor':
        return 'Professor / Docente';
      case 'aluno':
        return 'Aluno';
      case 'encarregado_educacao':
        return 'Encarregado de Educação';
      default:
        return role.replace(/_/g, ' ');
    }
  };

  const handleToggleStatus = (user: SchoolUser) => {
    const nextStatus = user.status === 'activo' ? 'inactivo' : 'activo';
    onUpdateUser({ ...user, status: nextStatus });
    setNotice(
      `Conta de ${user.fullName} marcada como ${nextStatus === 'activo' ? 'ACTIVA' : 'SUSPENSA'} na memória local.`
    );
    setTimeout(() => setNotice(null), 4500);
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;
    onResetPassword(passwordModalUser, newPasswordInput.trim());
    setNotice(`Senha de ${passwordModalUser.fullName} actualizada com sucesso.`);
    setPasswordModalUser(null);
    setNewPasswordInput('123456');
    setTimeout(() => setNotice(null), 4500);
  };

  const openCreateModal = () => {
    setFormError(null);
    setEditingUser(null);
    setFormRole('director_geral');
    setFormInstId(institutions[0]?.id || '');
    setFormMunicipality(institutions[0]?.municipality || 'Kilamba Kiaxi');
    setFormCustomMunicipality('');
    setFormProvince(institutions[0]?.province || 'Luanda');
    setFormFullName('');
    setFormEmail('');
    setFormPhone('+244 923 000 000');
    setFormPassword('123');
    setFormStatus('activo');
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: SchoolUser) => {
    setFormError(null);
    setEditingUser({ ...user, originalEmail: user.email });
    setFormRole(user.role);
    setFormInstId(
      user.institutionId && user.institutionId !== 'municipal'
        ? user.institutionId
        : institutions[0]?.id || ''
    );

    const userMun = (user.municipality || '').trim();
    const matchesPreset = availableMunicipalities.some(
      (m) => m.municipality.toLowerCase() === userMun.toLowerCase()
    );
    if (user.role === 'director_municipal') {
      if (userMun && !matchesPreset) {
        setFormMunicipality('__custom__');
        setFormCustomMunicipality(userMun);
      } else {
        setFormMunicipality(userMun || availableMunicipalities[0]?.municipality || 'Kilamba Kiaxi');
        setFormCustomMunicipality('');
      }
      setFormProvince(user.province || 'Luanda');
    } else {
      setFormMunicipality(institutions[0]?.municipality || 'Kilamba Kiaxi');
      setFormCustomMunicipality('');
      setFormProvince(institutions[0]?.province || 'Luanda');
    }

    setFormFullName(user.fullName);
    setFormEmail(user.email);
    setFormPhone(user.phone || '+244 923 000 000');
    setFormPassword('');
    setFormStatus(user.status || 'activo');
    setIsAddModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const isMunDirector = formRole === 'director_municipal';
    const resolvedMunicipality =
      formMunicipality === '__custom__' ? formCustomMunicipality.trim() : formMunicipality.trim();

    if (!formFullName.trim() || !formEmail.trim()) {
      setFormError('Preencha o nome completo e o e-mail de acesso.');
      return;
    }

    if (isMunDirector && !resolvedMunicipality) {
      setFormError('Informe o município de jurisdição do Director Municipal da Educação.');
      return;
    }

    if (!isMunDirector && !formInstId) {
      setFormError('Seleccione a instituição escolar para este utilizador.');
      return;
    }

    const cleanEmail = formEmail.trim().toLowerCase();
    const originalEmailLower = editingUser?.originalEmail?.trim().toLowerCase();
    const exists = allManagedUsers.some(
      (u) =>
        u.email.toLowerCase() === cleanEmail &&
        (!editingUser || u.email.toLowerCase() !== originalEmailLower)
    );
    if (exists) {
      setFormError('Já existe uma conta registada com este e-mail.');
      return;
    }

    if (editingUser) {
      const updatedUser: SchoolUser = {
        ...editingUser,
        institutionId: isMunDirector ? 'municipal' : formInstId,
        municipality: isMunDirector ? resolvedMunicipality : undefined,
        province: isMunDirector ? formProvince.trim() || 'Luanda' : undefined,
        fullName: formFullName.trim(),
        email: cleanEmail,
        phone: formPhone.trim() || '+244 923 000 000',
        role: formRole,
        status: formStatus,
        departmentOrClass: isMunDirector
          ? `Direcção Municipal da Educação de ${resolvedMunicipality}`
          : getRoleLabel(formRole)
      };

      onUpdateUser(updatedUser, editingUser.originalEmail);
      if (formPassword.trim()) {
        onResetPassword(updatedUser, formPassword.trim());
      }
      setIsAddModalOpen(false);
      setEditingUser(null);
      setNotice(`Dados de ${updatedUser.fullName} actualizados com sucesso!`);
      setTimeout(() => setNotice(null), 5000);
      return;
    }

    const newUser: SchoolUser = {
      id: `su-${Date.now()}`,
      institutionId: isMunDirector ? 'municipal' : formInstId,
      municipality: isMunDirector ? resolvedMunicipality : undefined,
      province: isMunDirector ? formProvince.trim() || 'Luanda' : undefined,
      fullName: formFullName.trim(),
      email: cleanEmail,
      phone: formPhone.trim() || '+244 923 000 000',
      role: formRole,
      status: formStatus,
      departmentOrClass: isMunDirector
        ? `Direcção Municipal da Educação de ${resolvedMunicipality}`
        : getRoleLabel(formRole),
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddUser(newUser, formPassword.trim() || '123');
    setIsAddModalOpen(false);
    setFormFullName('');
    setFormEmail('');
    setFormCustomMunicipality('');
    setFormPassword('123');
    setNotice(
      isMunDirector
        ? `Director Municipal ${newUser.fullName} (Município de ${resolvedMunicipality}) cadastrado com sucesso!`
        : `Utilizador ${newUser.fullName} cadastrado com sucesso na plataforma!`
    );
    setTimeout(() => setNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Gestão Global de Utilizadores (SaaS)
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Administração Central de Contas, Directores e Gestores das Escolas ({accounts.length} credenciais na memória local)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer self-start sm:self-auto min-h-[40px]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Gestor / Utilizador</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#067836] shrink-0" />
          <span className="font-semibold">{notice}</span>
        </div>
      )}

      {/* 4 Cartões de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Utilizadores na Rede</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">{allManagedUsers.length}</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Total Global SaaS</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Direcção &amp; Admins</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">{adminCount}</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Gestores Escolares</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Contas Activas</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">{activeCount}</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Acesso Autorizado</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Contas Suspensas</p>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#064e26] tabular-nums mt-1">{suspendedCount}</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Bloqueio Preventivo</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Power className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 flex flex-col lg:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar utilizador por nome, e-mail, escola ou perfil..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={institutionFilter}
            onChange={(e) => setInstitutionFilter(e.target.value)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            <option value="todas">Todas as Escolas ({institutions.length})</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.acronym} — {inst.name}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            <option value="todos">Todos os Perfis</option>
            <option value="director_municipal">Director Municipal da Educação</option>
            <option value="director_geral">Director Geral / Admin</option>
            <option value="subdirector_pedagogico">Subdirector Pedagógico</option>
            <option value="secretario_geral">Secretário Geral</option>
            <option value="funcionario_financeiro">Tesouraria / Financeiro</option>
            <option value="professor">Professor / Docente</option>
            <option value="aluno">Aluno</option>
            <option value="encarregado_educacao">Encarregado</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            <option value="todos">Todos os Estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Suspensos</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider">
            Utilizadores e Gestores Cadastrados ({filteredUsers.length})
          </span>
          <span className="text-[11px] text-white/85">Controlo Centralizado SaaS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                <th className="py-3 px-4">Utilizador / E-mail</th>
                <th className="py-3 px-4">Instituição Escolar</th>
                <th className="py-3 px-4">Perfil / Permissão</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#f7fbf8] transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#064e26]">{u.fullName}</div>
                    <div className="text-[11px] text-[#4b6755] font-mono flex items-center space-x-1 mt-0.5">
                      <Mail className="w-3 h-3 text-[#4b6755]" />
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#064e26] flex items-center space-x-1.5">
                      {u.role === 'director_municipal' ? (
                        <MapPin className="w-3.5 h-3.5 text-[#1d8cf8] shrink-0" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-[#067836] shrink-0" />
                      )}
                      <span className="truncate max-w-[230px]">{u.institutionName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#f7fbf8] border border-[#cde6d5] text-[#064e26] font-bold text-[11px]">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                        u.status === 'activo'
                          ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {u.status === 'activo' ? 'Activo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(u)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] font-bold transition cursor-pointer"
                      title="Editar dados, perfil e escola do administrador/utilizador"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#067836]" />
                      <span>Editar</span>
                    </button>
                    {onOpenInstitutionConfig && u.role !== 'director_municipal' && (
                      <button
                        onClick={() => onOpenInstitutionConfig(u.institutionId)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#064e26] font-bold transition cursor-pointer"
                        title="Configurar escola e funcionalidades"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#067836]" />
                        <span>Escola</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setPasswordModalUser(u);
                        setNewPasswordInput('123456');
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] text-[#055827] font-bold transition cursor-pointer"
                      title="Redefinir senha"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Senha</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center p-1.5 rounded-lg transition cursor-pointer ${
                        u.status === 'activo'
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-[#067836] hover:bg-[#eaf6ee]'
                      }`}
                      title={u.status === 'activo' ? 'Suspender acesso' : 'Reactivar acesso'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {onDeleteUser && (
                      <button
                        onClick={() => setUserToDelete(u)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold transition cursor-pointer"
                        title="Apagar administrador / utilizador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Apagar</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#4b6755]">
                    Nenhum utilizador encontrado para os critérios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Cadastrar / Editar Gestor / Utilizador */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wide">
                {editingUser
                  ? 'Editar Administrador / Utilizador'
                  : 'Cadastrar Administrador / Utilizador'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/15 rounded-lg p-1 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-[#064e26] block mb-1">Perfil de Acesso *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as SchoolUser['role'])}
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                >
                  <option value="director_municipal">Director Municipal da Educação (Todas as Escolas do Município)</option>
                  <option value="director_geral">Director Geral / Administrador Escolar</option>
                  <option value="subdirector_pedagogico">Subdirector Pedagógico</option>
                  <option value="secretario_geral">Secretário Geral</option>
                  <option value="funcionario_financeiro">Funcionário Financeiro (Tesoureiro)</option>
                  <option value="professor">Professor / Docente</option>
                </select>
              </div>

              {formRole === 'director_municipal' ? (
                <div className="p-3 bg-[#eaf6ee]/60 border border-[#cde6d5] rounded-xl space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-[#064e26] block mb-1">
                        Município de Jurisdição *
                      </label>
                      <select
                        value={formMunicipality}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormMunicipality(val);
                          const found = availableMunicipalities.find((m) => m.municipality === val);
                          if (found) setFormProvince(found.province);
                        }}
                        className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                      >
                        {availableMunicipalities.map((m) => (
                          <option key={m.municipality} value={m.municipality}>
                            {m.municipality} ({m.schoolsCount} escola{m.schoolsCount === 1 ? '' : 's'})
                          </option>
                        ))}
                        <option value="__custom__">+ Outro Município...</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-[#064e26] block mb-1">Província</label>
                      <input
                        type="text"
                        value={formProvince}
                        onChange={(e) => setFormProvince(e.target.value)}
                        placeholder="Ex: Luanda"
                        className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                      />
                    </div>
                  </div>

                  {formMunicipality === '__custom__' && (
                    <div>
                      <label className="font-bold text-[#064e26] block mb-1">
                        Nome do Município *
                      </label>
                      <input
                        type="text"
                        required
                        value={formCustomMunicipality}
                        onChange={(e) => setFormCustomMunicipality(e.target.value)}
                        placeholder="Ex: Icolo e Bengo"
                        className="w-full bg-white text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-[#055827] font-medium">
                    O Director Municipal terá acesso consolidado a todas as escolas do município seleccionado (aproveitamento escolar e matriculados por género, classe e turma).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Instituição *</label>
                  <select
                    value={formInstId}
                    onChange={(e) => setFormInstId(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.province})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-[#064e26] block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ex: Dr. Manuel António"
                  className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">E-mail de Login *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="gestor@escola.ao"
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">
                    {editingUser ? 'Nova Senha (opcional)' : 'Senha Inicial *'}
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? 'Deixe vazio para manter' : '123'}
                    className="w-full bg-[#f7fbf8] text-[#064e26] font-mono rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#064e26] block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>
                {editingUser && (
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">Estado da Conta</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'activo' | 'inactivo')}
                      className="w-full bg-[#f7fbf8] text-[#064e26] rounded-xl px-3 py-2 border border-[#cde6d5] font-semibold focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Suspenso</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] text-[#064e26] hover:bg-[#eaf6ee] font-bold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold shadow-sm cursor-pointer transition"
                >
                  {editingUser ? 'Guardar Alterações' : 'Guardar Utilizador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Redefinir Senha */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide">Redefinir Senha de Acesso</h3>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-white/80 hover:text-white hover:bg-white/15 rounded-lg p-1 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="p-5 space-y-3 text-xs">
              <p className="text-[#4b6755]">
                Definir nova palavra-passe para <strong className="text-[#064e26]">{passwordModalUser.fullName}</strong> ({passwordModalUser.email}):
              </p>
              <input
                type="text"
                required
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-[#f7fbf8] text-[#064e26] font-mono font-bold rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] text-[#064e26] hover:bg-[#eaf6ee] font-bold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold shadow-sm cursor-pointer transition"
                >
                  Confirmar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Confirmar Eliminação de Utilizador / Administrador */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-600 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wide">
                  Confirmar Eliminação de Administrador / Utilizador
                </h3>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-white/80 hover:text-white hover:bg-white/15 rounded-lg p-1 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-[#064e26]">
              <p className="leading-relaxed">
                Tem a certeza que pretende apagar a conta de{' '}
                <strong className="text-red-700">{userToDelete.fullName}</strong>?
              </p>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-800">
                <p>
                  • E-mail: <strong className="font-mono">{userToDelete.email}</strong>
                </p>
                <p>
                  • Perfil: <strong>{getRoleLabel(userToDelete.role)}</strong>
                </p>
                <p>
                  • Vinculação: <strong>{userToDelete.institutionName || 'Rede NEUROEDUCA'}</strong>
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-[#f7fbf8] border border-[#cde6d5] text-[#064e26] hover:bg-[#eaf6ee] font-bold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = userToDelete;
                    setUserToDelete(null);
                    onDeleteUser?.(target);
                    setNotice(`Conta de ${target.fullName} (${target.email}) removida com sucesso.`);
                    setTimeout(() => setNotice(null), 4500);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm cursor-pointer transition inline-flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Apagar Utilizador</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
