/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Painel do Super Administrador: Gestão Multi-institucional de Angola
 * Cadastra Escolas e respectivos Administradores, definindo limite de turmas, subsistemas e funcionalidades
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Power,
  Shield,
  ShieldCheck,
  Layers,
  GraduationCap,
  Users,
  MapPin,
  ExternalLink,
  Edit3,
  X,
  UserCheck,
  Key,
  Sliders,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Sparkles,
  BarChart3,
  Mail,
  Phone
} from 'lucide-react';
import {
  Institution,
  EducationSubsystemCode,
  InstitutionType,
  InstitutionFeatures,
  DEFAULT_INSTITUTION_FEATURES,
  UserProfile
} from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS } from '../../data/angolaCurriculum';
import { ANGOLA_PROVINCES } from '../../utils/currency';

interface InstitutionsManagerProps {
  institutions: Institution[];
  onAddInstitution: (inst: Institution, adminUser?: UserProfile) => void;
  onUpdateInstitution?: (inst: Institution) => void;
  onUpdateStatus: (id: string, newStatus: 'active' | 'suspended') => void;
  onSelectToManage?: (inst: Institution) => void;
  initialSearchTerm?: string;
  initialEditInstitutionId?: string;
  navigationKey?: number;
}

export const InstitutionsManager: React.FC<InstitutionsManagerProps> = ({
  institutions,
  onAddInstitution,
  onUpdateInstitution,
  onUpdateStatus,
  initialSearchTerm = '',
  initialEditInstitutionId,
  navigationKey
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstId, setEditingInstId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State para Escola
  const [formName, setFormName] = useState('');
  const [formAcronym, setFormAcronym] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formNif, setFormNif] = useState('');
  const [formLicense, setFormLicense] = useState('');
  const [formType, setFormType] = useState<InstitutionType>('privada');
  const [formCategory, setFormCategory] = useState<Institution['category']>('complexo_escolar');
  const [formProvince, setFormProvince] = useState('Luanda');
  const [formMunicipality, setFormMunicipality] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Form State para Administrador da Escola (Exigido pelo utilizador)
  const [formAdminName, setFormAdminName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminPhone, setFormAdminPhone] = useState('');
  const [formAdminPassword, setFormAdminPassword] = useState('123');

  // Limite de Turmas
  const [formMaxClasses, setFormMaxClasses] = useState(20);

  // Subsistemas de Ensino Autorizados
  const [selectedSubsystems, setSelectedSubsystems] = useState<EducationSubsystemCode[]>([
    'primario_geral',
    'secundario_geral_1'
  ]);

  // Funcionalidades Autorizadas (Feature Flags)
  const [features, setFeatures] = useState<InstitutionFeatures>({
    ...DEFAULT_INSTITUTION_FEATURES
  });

  const toggleSubsystem = (code: EducationSubsystemCode) => {
    if (selectedSubsystems.includes(code)) {
      if (selectedSubsystems.length > 1) {
        setSelectedSubsystems(selectedSubsystems.filter((c) => c !== code));
      }
    } else {
      setSelectedSubsystems([...selectedSubsystems, code]);
    }
  };

  const toggleFeature = (key: keyof InstitutionFeatures) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openCreateModal = () => {
    setFormError(null);
    setEditingInstId(null);
    setFormName('');
    setFormAcronym('');
    setFormCode(`ESC-LUA-${Math.floor(100 + Math.random() * 900)}`);
    setFormNif('5400000000');
    setFormLicense('Dec. Executivo MED nº 2026/04');
    setFormType('privada');
    setFormCategory('complexo_escolar');
    setFormProvince('Luanda');
    setFormMunicipality('Kilamba Kiaxi');
    setFormAddress('Bairro Central');
    setFormPhone('+244 923 000 000');
    setFormEmail('');
    setFormAdminName('');
    setFormAdminEmail('');
    setFormAdminPhone('+244 923 000 000');
    setFormAdminPassword('123');
    setFormMaxClasses(20);
    setSelectedSubsystems(['primario_geral', 'secundario_geral_1']);
    setFeatures({ ...DEFAULT_INSTITUTION_FEATURES });
    setIsModalOpen(true);
  };

  const openEditModal = (inst: Institution) => {
    setFormError(null);
    setEditingInstId(inst.id);
    setFormName(inst.name);
    setFormAcronym(inst.acronym);
    setFormCode(inst.code);
    setFormNif(inst.nif);
    setFormLicense(inst.licenseNumber);
    setFormType(inst.institutionType);
    setFormCategory(inst.category);
    setFormProvince(inst.province);
    setFormMunicipality(inst.municipality);
    setFormAddress(inst.address);
    setFormPhone(inst.phone);
    setFormEmail(inst.email);
    setFormAdminName(inst.adminName || inst.directorName || '');
    setFormAdminEmail(inst.adminEmail || inst.email || '');
    setFormAdminPhone(inst.adminPhone || inst.phone || '');
    setFormAdminPassword(inst.adminPassword || '123');
    setFormMaxClasses(inst.maxClasses);
    setSelectedSubsystems(inst.subsystems.length > 0 ? inst.subsystems : ['primario_geral']);
    setFeatures(inst.features || { ...DEFAULT_INSTITUTION_FEATURES });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (navigationKey === undefined) return;
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
    if (initialEditInstitutionId) {
      const target = institutions.find((i) => i.id === initialEditInstitutionId);
      if (target) {
        openEditModal(target);
      }
    }
  }, [navigationKey, initialEditInstitutionId, initialSearchTerm, institutions]);

  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim() || !formProvince || !formAdminName.trim() || !formAdminEmail.trim()) {
      setFormError('Por favor, preencha o Nome da Escola, Província e os dados do Administrador da Escola.');
      return;
    }

    if (editingInstId) {
      // Actualizar Instituição Existente
      const existing = institutions.find((i) => i.id === editingInstId);
      if (!existing) return;

      const updatedInst: Institution = {
        ...existing,
        name: formName.trim(),
        acronym: formAcronym.trim().toUpperCase() || formName.trim().slice(0, 6).toUpperCase(),
        code: formCode.trim(),
        nif: formNif.trim(),
        licenseNumber: formLicense.trim(),
        institutionType: formType,
        category: formCategory,
        province: formProvince,
        municipality: formMunicipality.trim(),
        address: formAddress.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        directorName: formAdminName.trim(),
        adminName: formAdminName.trim(),
        adminEmail: formAdminEmail.trim().toLowerCase(),
        adminPhone: formAdminPhone.trim(),
        adminPassword: formAdminPassword.trim(),
        maxClasses: Number(formMaxClasses) || 20,
        subsystems: selectedSubsystems,
        features: features
      };

      if (onUpdateInstitution) {
        onUpdateInstitution(updatedInst);
      }
      setSuccessNotice(`Configurações de ${updatedInst.name} actualizadas com sucesso!`);
    } else {
      // Criar Nova Instituição com seu Administrador
      const newInstId = `inst-${Date.now()}`;
      const newInst: Institution = {
        id: newInstId,
        code: formCode || `ESC-${formProvince.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        name: formName.trim(),
        acronym: formAcronym.trim().toUpperCase() || formName.trim().slice(0, 6).toUpperCase(),
        nif: formNif.trim() || '5400000000',
        licenseNumber: formLicense.trim() || 'Despacho Ministerial de Autorização',
        institutionType: formType,
        category: formCategory,
        province: formProvince,
        municipality: formMunicipality || 'Município Sede',
        address: formAddress || `Bairro Central, ${formProvince}`,
        phone: formPhone || '+244 923 000 000',
        email: formEmail || `contacto@${formName.toLowerCase().replace(/[^a-z0-9]/g, '')}.ao`,
        directorName: formAdminName.trim(),
        adminName: formAdminName.trim(),
        adminEmail: formAdminEmail.trim().toLowerCase(),
        adminPhone: formAdminPhone.trim() || '+244 923 000 000',
        adminPassword: formAdminPassword.trim() || '123',
        subsystems: selectedSubsystems,
        features: features,
        status: 'active',
        maxClasses: Number(formMaxClasses) || 20,
        currentClassesCount: 0,
        currentStudentsCount: 0,
        currentTeachersCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };

      const newAdminUser: UserProfile = {
        id: `usr-admin-${Date.now()}`,
        fullName: formAdminName.trim(),
        email: formAdminEmail.trim().toLowerCase(),
        role: 'director_geral',
        institutionId: newInstId,
        institutionName: newInst.name,
        phone: formAdminPhone.trim()
      };

      onAddInstitution(newInst, newAdminUser);
      setSuccessNotice(`Escola ${newInst.name} e Administrador ${newAdminUser.fullName} (${newAdminUser.email}) cadastrados com sucesso!`);
    }

    setTimeout(() => setSuccessNotice(null), 4000);
    setIsModalOpen(false);
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const matchSearch =
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.directorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.adminEmail && inst.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchProvince = provinceFilter === 'todas' || inst.province === provinceFilter;
    const matchStatus = statusFilter === 'todos' || inst.status === statusFilter;
    return matchSearch && matchProvince && matchStatus;
  });

  const totalActive = institutions.filter((i) => i.status === 'active').length;
  const totalStudents = institutions.reduce((sum, i) => sum + i.currentStudentsCount, 0);
  const totalClasses = institutions.reduce((sum, i) => sum + i.currentClassesCount, 0);

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Gestão Multi-Institucional de Angola
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Acesso do Super Administrador · Cadastro de Escolas, Administradores, Limite de Turmas, Subsistemas e Módulos
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Escola</span>
        </button>
      </div>

      {/* Alerta de Feedback */}
      {successNotice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#067836] shrink-0" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* 2. AS 4 CAIXAS MÉTRICAS (2x2 no mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Escolas Registadas</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{institutions.length}</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">{totalActive} Activas em Angola</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Alunos na Rede SaaS</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{totalStudents}</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">Base Escolar Global</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Turmas Cadastradas</p>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">{totalClasses}</div>
            <p className="text-[11px] text-[#4b6755] font-medium mt-1">Controlo Estrito de Limites</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#4b6755]">Cobertura Nacional</p>
            <div className="text-2xl font-extrabold tracking-tight text-[#064e26] tabular-nums mt-1">18 Províncias</div>
            <p className="text-[11px] text-[#055827] font-medium mt-1">República de Angola</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. FILTROS E PESQUISA DE INSTITUIÇÕES */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por escola, administrador, e-mail ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            <option value="todas">Todas as Províncias</option>
            {ANGOLA_PROVINCES.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
          >
            <option value="todos">Todos os Estados</option>
            <option value="active">Activas</option>
            <option value="suspended">Suspensas</option>
          </select>
        </div>
      </div>

      {/* 4. TABELA DE INSTITUIÇÕES COM CONTROLO DE ADMIN E LIMITES */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider">
            Rede de Escolas e Administradores ({filteredInstitutions.length})
          </span>
          <span className="text-xs text-white/85 font-medium">Isolamento Multi-inquilino RLS</span>
        </div>

        {/* Dica de rolagem em telemóveis */}
        <div className="md:hidden px-4 py-1.5 bg-[#eaf6ee] border-b border-[#cde6d5] text-[11px] text-[#055827] flex items-center justify-between">
          <span>Deslize horizontalmente para ver todas as colunas</span>
          <span className="font-mono text-[#067836]">↔</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                <th className="py-3 px-4">Instituição de Ensino</th>
                <th className="py-3 px-4">Administrador da Escola</th>
                <th className="py-3 px-4">Província / Local</th>
                <th className="py-3 px-4 text-center">Limite de Turmas</th>
                <th className="py-3 px-4">Subsistemas Autorizados</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acções Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaf2ec] text-[#064e26]">
              {filteredInstitutions.map((inst) => {
                const percentClasses = Math.round((inst.currentClassesCount / inst.maxClasses) * 100);
                const adminName = inst.adminName || inst.directorName || 'Administrador Designado';
                const adminEmail = inst.adminEmail || inst.email || 'direcao@escola.ao';

                return (
                  <tr key={inst.id} className="hover:bg-[#f7fbf8] transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#064e26] text-sm">{inst.name}</div>
                      <div className="flex items-center space-x-2 text-[11px] text-[#4b6755] mt-0.5">
                        <span className="font-mono bg-[#eaf6ee] border border-[#cde6d5] px-1.5 py-0.5 rounded-md text-[#055827] font-bold">
                          {inst.code}
                        </span>
                        <span>• Sigla: {inst.acronym}</span>
                        <span>• NIF: {inst.nif}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#064e26] flex items-center space-x-1">
                        <UserCheck className="w-3.5 h-3.5 text-[#067836]" />
                        <span>{adminName}</span>
                      </div>
                      <div className="text-[11px] text-[#4b6755] flex items-center space-x-1 mt-0.5 font-mono">
                        <Mail className="w-3 h-3 text-[#4b6755]" />
                        <span>{adminEmail}</span>
                      </div>
                      {inst.adminPhone && (
                        <div className="text-[10px] text-[#4b6755]/80 flex items-center space-x-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{inst.adminPhone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#064e26]">{inst.province}</div>
                      <div className="text-[11px] text-[#4b6755]">{inst.municipality}</div>
                    </td>

                    <td className="py-3 px-4 text-center tabular-nums">
                      <div className="font-bold text-[#064e26]">
                        {inst.currentClassesCount} / {inst.maxClasses}
                      </div>
                      <div className="w-24 bg-[#eaf6ee] h-1.5 rounded-full mx-auto mt-1 overflow-hidden border border-[#cde6d5]">
                        <div
                          className={`h-full rounded-full ${
                            percentClasses >= 100
                              ? 'bg-red-500'
                              : percentClasses >= 75
                              ? 'bg-amber-500'
                              : 'bg-[#16a34a]'
                          }`}
                          style={{ width: `${Math.min(percentClasses, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#4b6755] mt-0.5 block">{percentClasses}% limite</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {inst.subsystems.map((subCode) => {
                          const subMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === subCode);
                          return (
                            <span
                              key={subCode}
                              className="text-[10px] font-semibold bg-[#f7fbf8] text-[#064e26] px-1.5 py-0.5 rounded-md border border-[#cde6d5]"
                            >
                              {subMeta?.shortName || subCode}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                          inst.status === 'active'
                            ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {inst.status === 'active' ? 'Activa' : 'Suspensa'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Editar Limites e Permissões */}
                      <button
                        onClick={() => openEditModal(inst)}
                        className="inline-flex items-center space-x-1 text-xs font-bold bg-[#eaf6ee] text-[#055827] hover:bg-[#d7efe0] px-2.5 py-1.5 rounded-lg border border-[#cde6d5] transition cursor-pointer"
                        title="Configurar limite de turmas, subsistemas e funcionalidades"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#067836]" />
                        <span>Configurar</span>
                      </button>

                      {/* Suspender / Activar */}
                      <button
                        onClick={() =>
                          onUpdateStatus(inst.id, inst.status === 'active' ? 'suspended' : 'active')
                        }
                        className={`inline-flex items-center p-1.5 rounded-lg text-xs transition cursor-pointer ${
                          inst.status === 'active'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-[#067836] hover:bg-[#eaf6ee]'
                        }`}
                        title={inst.status === 'active' ? 'Suspender instituição' : 'Activar instituição'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CADASTRO / EDIÇÃO DE ESCOLA COM SEU ADMINISTRADOR, LIMITES E FUNCIONALIDADES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Cabeçalho */}
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-4 border-b border-[#067836]/20 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/15 text-white rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">
                    {editingInstId ? 'Configurar Limites, Subsistemas e Administrador da Escola' : 'Cadastrar Nova Escola e Administrador'}
                  </h3>
                  <span className="text-xs text-white/85 block">
                    Definição de parâmetros pelo Super Administrador da plataforma
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form onSubmit={handleSaveInstitution} className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {/* SECÇÃO 1: DADOS DA ESCOLA */}
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider block border-b border-[#dce7df] pb-1.5">
                  1. Dados de Identificação da Escola
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#064e26] block mb-1">
                      Nome Oficial da Escola / Colégio *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Complexo Escolar Privado Girassol do Saber"
                      className="w-full bg-[#f7fbf8] text-[#064e26] font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Sigla / Acrónimo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formAcronym}
                      onChange={(e) => setFormAcronym(e.target.value)}
                      placeholder="GIRASSOL"
                      className="w-full bg-[#f7fbf8] text-[#064e26] font-bold uppercase rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Província de Angola *
                    </label>
                    <select
                      value={formProvince}
                      onChange={(e) => setFormProvince(e.target.value)}
                      className="w-full bg-[#f7fbf8] text-[#064e26] font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    >
                      {ANGOLA_PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Município *
                    </label>
                    <input
                      type="text"
                      value={formMunicipality}
                      onChange={(e) => setFormMunicipality(e.target.value)}
                      placeholder="Ex: Kilamba Kiaxi"
                      className="w-full bg-[#f7fbf8] text-[#064e26] font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Natureza Jurídica
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="w-full bg-[#f7fbf8] text-[#064e26] font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    >
                      <option value="privada">Privada</option>
                      <option value="publica">Pública</option>
                      <option value="comparticipada">Comparticipada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECÇÃO 2: ADMINISTRADOR DA ESCOLA */}
              <div className="space-y-3 bg-[#eaf6ee] p-4 rounded-xl border border-[#cde6d5]">
                <div className="flex items-center space-x-2 text-[#064e26] font-extrabold uppercase tracking-wider text-xs border-b border-[#cde6d5] pb-1.5">
                  <UserCheck className="w-4 h-4 text-[#067836]" />
                  <span>2. Administrador Designado para a Escola</span>
                </div>
                <p className="text-[11px] text-[#055827]">
                  O administrador terá acesso total para configurar a escola, gerir turmas, matricular alunos e cadastrar utilizadores.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Nome Completo do Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      value={formAdminName}
                      onChange={(e) => setFormAdminName(e.target.value)}
                      placeholder="Ex: Dr. Bernardo Fernando dos Santos"
                      className="w-full bg-white text-[#064e26] font-bold rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      E-mail de Acesso (Login) *
                    </label>
                    <input
                      type="email"
                      required
                      value={formAdminEmail}
                      onChange={(e) => setFormAdminEmail(e.target.value)}
                      placeholder="direcao@escola.ao"
                      className="w-full bg-white text-[#064e26] font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Telefone do Administrador
                    </label>
                    <input
                      type="text"
                      value={formAdminPhone}
                      onChange={(e) => setFormAdminPhone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full bg-white text-[#064e26] font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#064e26] block mb-1">
                      Senha Inicial de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={formAdminPassword}
                      onChange={(e) => setFormAdminPassword(e.target.value)}
                      className="w-full bg-white text-[#064e26] font-mono font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECÇÃO 3: LIMITE DE TURMAS (DEFINIDO PELO SUPER ADMIN) */}
              <div className="space-y-3 bg-[#f7fbf8] p-4 rounded-xl border border-[#dce7df]">
                <div className="flex items-center space-x-2 text-[#064e26] font-extrabold uppercase tracking-wider text-xs border-b border-[#dce7df] pb-1.5">
                  <Sliders className="w-4 h-4 text-[#067836]" />
                  <span>3. Limite Máximo de Turmas Autorizadas</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <label className="font-bold text-[#064e26] block mb-1">
                      Tecto de Turmas Contratadas: <span className="text-[#067836] text-sm font-black tabular-nums">{formMaxClasses} Turmas</span>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={80}
                      step={5}
                      value={formMaxClasses}
                      onChange={(e) => setFormMaxClasses(Number(e.target.value))}
                      className="w-full accent-[#067836] cursor-pointer"
                    />
                    <span className="text-[10px] text-[#4b6755] mt-0.5 block">
                      A escola não poderá criar mais turmas do que este tecto fixado pelo Super Administrador.
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {[10, 20, 35, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormMaxClasses(val)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold tabular-nums transition cursor-pointer ${
                          formMaxClasses === val
                            ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                            : 'bg-white border border-[#cde6d5] text-[#064e26] hover:bg-[#eaf6ee]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECÇÃO 4: SUBSISTEMAS DE ENSINO AUTORIZADOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#dce7df] pb-1.5">
                  <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider tabular-nums">
                    4. Subsistemas de Ensino Autorizados ({selectedSubsystems.length} seleccionados)
                  </span>
                  <span className="text-[11px] text-[#4b6755]">Lei de Bases 17/16 de Angola</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {ANGOLA_EDUCATION_SUBSYSTEMS.map((sub) => {
                    const isChecked = selectedSubsystems.includes(sub.code);
                    return (
                      <label
                        key={sub.code}
                        className={`p-2.5 rounded-xl border flex items-start space-x-2 transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]'
                            : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755] hover:bg-[#eaf6ee]/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubsystem(sub.code)}
                          className="mt-0.5 w-3.5 h-3.5 accent-[#067836] rounded focus:ring-[#067836]"
                        />
                        <div className="truncate">
                          <span className="font-bold block truncate">{sub.name}</span>
                          <span className="text-[10px] text-[#4b6755] block">{sub.shortName}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECÇÃO 5: FUNCIONALIDADES PERMITIDAS (FEATURE FLAGS) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#dce7df] pb-1.5">
                  <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider">
                    5. Módulos e Funcionalidades Habilitadas
                  </span>
                  <span className="text-[11px] text-[#067836] font-semibold">
                    Permissões granulares de acesso
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${features.financialManagement ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]' : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'}`}>
                    <div className="flex items-center space-x-2.5">
                      <DollarSign className="w-4 h-4 text-[#067836]" />
                      <div>
                        <span className="font-bold block">Gestão Financeira & Propinas Multicaixa</span>
                        <span className="text-[10px] text-[#4b6755]">Cobrança em Kwanzas e integração EMIS</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={features.financialManagement}
                      onChange={() => toggleFeature('financialManagement')}
                      className="w-4 h-4 accent-[#067836] rounded"
                    />
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${features.evaluationCenter ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]' : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'}`}>
                    <div className="flex items-center space-x-2.5">
                      <GraduationCap className="w-4 h-4 text-[#1d8cf8]" />
                      <div>
                        <span className="font-bold block">Avaliações & Mini-Pautas INIDE</span>
                        <span className="text-[10px] text-[#4b6755]">Cálculo MT = (MAC+NPP+NPT)/3</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={features.evaluationCenter}
                      onChange={() => toggleFeature('evaluationCenter')}
                      className="w-4 h-4 accent-[#067836] rounded"
                    />
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${features.officialDocuments ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]' : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'}`}>
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-[#f5a623]" />
                      <div>
                        <span className="font-bold block">Emissão de Documentos com QR Code</span>
                        <span className="text-[10px] text-[#4b6755]">Declarações e boletins oficiais</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={features.officialDocuments}
                      onChange={() => toggleFeature('officialDocuments')}
                      className="w-4 h-4 accent-[#067836] rounded"
                    />
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${features.massEnrollment ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]' : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'}`}>
                    <div className="flex items-center space-x-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-[#1d8cf8]" />
                      <div>
                        <span className="font-bold block">Matrícula em Massa (Importação CSV/Lote)</span>
                        <span className="text-[10px] text-[#4b6755]">Registo de múltiplos alunos de uma vez</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={features.massEnrollment}
                      onChange={() => toggleFeature('massEnrollment')}
                      className="w-4 h-4 accent-[#067836] rounded"
                    />
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${features.aiAssistant ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]' : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'}`}>
                    <div className="flex items-center space-x-2.5">
                      <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                      <div>
                        <span className="font-bold block">Assistente Pedagógico IA</span>
                        <span className="text-[10px] text-[#4b6755]">Planos de aula e fichas de exercícios</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={features.aiAssistant}
                      onChange={() => toggleFeature('aiAssistant')}
                      className="w-4 h-4 accent-[#067836] rounded"
                    />
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${features.reportsAndAnalytics ? 'bg-[#eaf6ee] border-[#067836]/40 text-[#064e26]' : 'bg-[#f7fbf8] border-[#dce7df] text-[#4b6755]'}`}>
                    <div className="flex items-center space-x-2.5">
                      <BarChart3 className="w-4 h-4 text-[#067836]" />
                      <div>
                        <span className="font-bold block">Relatórios Estatísticos Avançados</span>
                        <span className="text-[10px] text-[#4b6755]">Indicadores de aproveitamento e gráficos</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={features.reportsAndAnalytics}
                      onChange={() => toggleFeature('reportsAndAnalytics')}
                      className="w-4 h-4 accent-[#067836] rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-4 border-t border-[#dce7df] flex justify-end space-x-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#064e26] bg-[#f7fbf8] hover:bg-[#eaf6ee] border border-[#cde6d5] font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] font-bold shadow-sm transition cursor-pointer"
                >
                  {editingInstId ? 'Gravar Alterações da Escola' : 'Cadastrar Escola e Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
