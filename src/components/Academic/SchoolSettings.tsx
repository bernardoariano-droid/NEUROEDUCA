/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Configurações da Escola (Acesso do Administrador da Escola)
 * Gestão de dados institucionais, direcção escolar, contactos e parâmetros
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Layers,
  CreditCard,
  UserCheck,
  Award,
  Sparkles,
  Info
} from 'lucide-react';
import { Institution, EducationSubsystemCode } from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS } from '../../data/angolaCurriculum';
import { ANGOLA_PROVINCES } from '../../utils/currency';

interface SchoolSettingsProps {
  currentInstitution: Institution;
  onUpdateInstitution: (updated: Institution) => void;
}

export const SchoolSettings: React.FC<SchoolSettingsProps> = ({
  currentInstitution,
  onUpdateInstitution
}) => {
  const [name, setName] = useState(currentInstitution.name);
  const [acronym, setAcronym] = useState(currentInstitution.acronym);
  const [nif, setNif] = useState(currentInstitution.nif);
  const [licenseNumber, setLicenseNumber] = useState(currentInstitution.licenseNumber);
  const [directorName, setDirectorName] = useState(currentInstitution.directorName);
  const [subdirectorPedagogico, setSubdirectorPedagogico] = useState(
    currentInstitution.subdirectorPedagogico || 'Msc. Teresa Kiala'
  );
  const [secretarioGeral, setSecretarioGeral] = useState(
    currentInstitution.secretarioGeral || 'Dr. Simão Luvualu'
  );
  const [province, setProvince] = useState(currentInstitution.province);
  const [municipality, setMunicipality] = useState(currentInstitution.municipality);
  const [address, setAddress] = useState(currentInstitution.address);
  const [phone, setPhone] = useState(currentInstitution.phone);
  const [email, setEmail] = useState(currentInstitution.email);
  const [pedagogicalMotto, setPedagogicalMotto] = useState(
    currentInstitution.pedagogicalMotto || 'Educar com Rigor, Inovação e Excelência Moral'
  );

  // Dados Bancários e Multicaixa
  const [bankName, setBankName] = useState(
    currentInstitution.bankAccount?.bankName || 'Banco BAI'
  );
  const [iban, setIban] = useState(
    currentInstitution.bankAccount?.iban || 'AO06.0040.0000.1234.5678.9012.3'
  );
  const [multicaixaEntity, setMulticaixaEntity] = useState(
    currentInstitution.bankAccount?.multicaixaEntity || '00142'
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setName(currentInstitution.name);
    setAcronym(currentInstitution.acronym);
    setNif(currentInstitution.nif);
    setLicenseNumber(currentInstitution.licenseNumber);
    setDirectorName(currentInstitution.directorName);
    setSubdirectorPedagogico(currentInstitution.subdirectorPedagogico || 'Msc. Teresa Kiala');
    setSecretarioGeral(currentInstitution.secretarioGeral || 'Dr. Simão Luvualu');
    setProvince(currentInstitution.province);
    setMunicipality(currentInstitution.municipality);
    setAddress(currentInstitution.address);
    setPhone(currentInstitution.phone);
    setEmail(currentInstitution.email);
    setPedagogicalMotto(
      currentInstitution.pedagogicalMotto || 'Educar com Rigor, Inovação e Excelência Moral'
    );
    setBankName(currentInstitution.bankAccount?.bankName || 'Banco BAI');
    setIban(currentInstitution.bankAccount?.iban || 'AO06.0040.0000.1234.5678.9012.3');
    setMulticaixaEntity(currentInstitution.bankAccount?.multicaixaEntity || '00142');
  }, [currentInstitution]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedInst: Institution = {
      ...currentInstitution,
      name: name.trim(),
      acronym: acronym.trim().toUpperCase(),
      nif: nif.trim(),
      licenseNumber: licenseNumber.trim(),
      directorName: directorName.trim(),
      subdirectorPedagogico: subdirectorPedagogico.trim(),
      secretarioGeral: secretarioGeral.trim(),
      province,
      municipality: municipality.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      pedagogicalMotto: pedagogicalMotto.trim(),
      bankAccount: {
        bankName: bankName.trim(),
        iban: iban.trim(),
        multicaixaEntity: multicaixaEntity.trim()
      }
    };

    onUpdateInstitution(updatedInst);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Nomes dos subsistemas autorizados pelo Super Admin
  const authorizedSubsystems = ANGOLA_EDUCATION_SUBSYSTEMS.filter((sub) =>
    currentInstitution.subsystems.includes(sub.code)
  );

  // Funcionalidades autorizadas
  const features = currentInstitution.features || {
    financialManagement: true,
    evaluationCenter: true,
    aiAssistant: true,
    officialDocuments: true,
    massEnrollment: true,
    specializedModules: true,
    reportsAndAnalytics: true,
    psychopedagogicalSupport: false
  };

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            CONFIGURAÇÕES DA ESCOLA
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5 font-medium">
            Plataforma Multi-institucional NEUROEDUCA · Gestão Institucional de {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Gravar Alterações</span>
        </button>
      </div>

      {/* Alerta de Sucesso */}
      {savedSuccess && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
          <span className="font-semibold">Dados institucionais actualizados com sucesso na plataforma!</span>
        </div>
      )}

      {/* 2. CARTÕES KPI INSTITUCIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Sigla Institucional</span>
            <div className="text-xl font-extrabold text-[#064e26] mt-0.5 truncate">
              {currentInstitution.acronym || 'ESCOLA'}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5 font-mono">
              Código: {currentInstitution.code}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Limite Autorizado</span>
            <div className="text-xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {currentInstitution.maxClasses} Turmas
            </div>
            <span className="text-[11px] text-[#16a34a] font-semibold block mt-0.5">
              {currentInstitution.currentClassesCount} turmas activas
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Subsistemas Activos</span>
            <div className="text-xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {authorizedSubsystems.length}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">Conformidade INIDE/MED</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Estado da Licença</span>
            <div className="text-xl font-extrabold text-[#16a34a] mt-0.5">Activo</div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">República de Angola</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CARTÃO 1: DADOS INSTITUCIONAIS GERAIS */}
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              1. DADOS DE IDENTIFICAÇÃO INSTITUCIONAL
            </span>
            <span className="text-xs text-emerald-100 font-mono">NIF: {currentInstitution.nif}</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#064e26] mb-1">
                Nome Oficial da Instituição *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Sigla ou Acrónimo *
              </label>
              <input
                type="text"
                required
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-bold rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Número de Identificação Fiscal (NIF) *
              </label>
              <input
                type="text"
                required
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-mono rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Decreto / Alvará / Licença do MED *
              </label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Natureza Jurídica
              </label>
              <input
                type="text"
                disabled
                value={
                  currentInstitution.institutionType === 'publica'
                    ? 'Pública'
                    : currentInstitution.institutionType === 'privada'
                    ? 'Privada'
                    : 'Comparticipada'
                }
                className="w-full bg-slate-100 text-slate-600 font-medium rounded-xl px-3 py-2 border border-[#dce7df] cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-bold text-[#064e26] mb-1">
                Lema Pedagógico / Slogan Institucional
              </label>
              <input
                type="text"
                value={pedagogicalMotto}
                onChange={(e) => setPedagogicalMotto(e.target.value)}
                placeholder="Ex: Educar com Rigor, Inovação e Excelência Moral"
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none italic"
              />
            </div>
          </div>
        </div>

        {/* CARTÃO 2: DIRECÇÃO ESCOLAR */}
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-[#f7fbf8] px-5 py-3 border-b border-[#dce7df] flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider">
              2. CORPO DIRETIVO E RESPONSÁVEIS DA INSTITUIÇÃO
            </span>
            <span className="text-xs text-[#4b6755] font-medium">Assinatura em Documentos e Pautas</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Director Geral / Administrador Escolar *
              </label>
              <input
                type="text"
                required
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-bold rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
              <span className="text-[10px] text-[#4b6755] mt-1 block">
                Nome que figura no cabeçalho das declarações oficiais.
              </span>
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Subdirector Pedagógico
              </label>
              <input
                type="text"
                value={subdirectorPedagogico}
                onChange={(e) => setSubdirectorPedagogico(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
              <span className="text-[10px] text-[#4b6755] mt-1 block">
                Responsável pela homologação das pautas e exames.
              </span>
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Secretário Geral da Escola
              </label>
              <input
                type="text"
                value={secretarioGeral}
                onChange={(e) => setSecretarioGeral(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
              <span className="text-[10px] text-[#4b6755] mt-1 block">
                Validação de matrículas e arquivo escolar.
              </span>
            </div>
          </div>
        </div>

        {/* CARTÃO 3: LOCALIZAÇÃO E CONTACTOS OFICIAIS */}
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-[#f7fbf8] px-5 py-3 border-b border-[#dce7df] flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider">
              3. LOCALIZAÇÃO GEOGRÁFICA E CANAIS DE CONTACTO (ANGOLA)
            </span>
            <span className="text-xs text-[#4b6755] font-medium">
              Reflecte-se no cabeçalho de todos os documentos
            </span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Província *
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              >
                {ANGOLA_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Município *
              </label>
              <input
                type="text"
                required
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Telefone Institucional *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                E-mail Oficial *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block font-bold text-[#064e26] mb-1">
                Endereço Físico Completo *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* CARTÃO 4: DADOS BANCÁRIOS E MULTICAIXA PARA PROPINAS */}
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-[#f7fbf8] px-5 py-3 border-b border-[#dce7df] flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider">
              4. DADOS BANCÁRIOS PARA COBRANÇA DE PROPINAS & MULTICAIXA
            </span>
            <span className="text-xs text-[#16a34a] font-bold font-mono">EMIS / Multicaixa Express</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Nome do Banco Receptor *
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: Banco BAI, BFA, BIC, BMA"
                className="w-full bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                IBAN Bancário (AO06...) *
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="AO06.0000.0000.0000.0000.0000.0"
                className="w-full bg-[#f7fbf8] text-slate-800 font-mono rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e26] mb-1">
                Código de Entidade Multicaixa
              </label>
              <input
                type="text"
                value={multicaixaEntity}
                onChange={(e) => setMulticaixaEntity(e.target.value)}
                placeholder="Ex: 00142"
                className="w-full bg-[#f7fbf8] text-slate-800 font-mono font-bold rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* CARTÃO 5: LIMITES E REGRAS DEFINIDAS PELO SUPER ADMINISTRADOR (Somente Leitura) */}
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-[#f7fbf8] px-5 py-3 border-b border-[#dce7df] flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#064e26] uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
              <span>5. LIMITES E PARÂMETROS ATRIBUÍDOS PELO SUPER ADMINISTRADOR</span>
            </span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
              Controlado pelo Administrador Geral
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Limite de Turmas */}
            <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#dce7df] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="font-bold text-[#064e26] block text-sm">
                  Limite Contratado de Turmas: {currentInstitution.maxClasses} Turmas
                </span>
                <span className="text-[#4b6755] text-xs">
                  Turmas actualmente cadastradas: {currentInstitution.currentClassesCount} de {currentInstitution.maxClasses} ({Math.round((currentInstitution.currentClassesCount / currentInstitution.maxClasses) * 100)}% de ocupação).
                </span>
              </div>
              <span className="text-xs font-bold text-[#055827] bg-[#eaf6ee] px-3 py-1.5 rounded-xl border border-[#cde6d5] shrink-0">
                Quota: {currentInstitution.currentClassesCount} / {currentInstitution.maxClasses}
              </span>
            </div>

            {/* Subsistemas Autorizados */}
            <div>
              <span className="font-bold text-[#064e26] block mb-2 uppercase text-[11px]">
                Subsistemas de Ensino Oficiais Autorizados nesta Escola:
              </span>
              <div className="flex flex-wrap gap-2">
                {authorizedSubsystems.map((sub) => (
                  <span
                    key={sub.code}
                    className="bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span>{sub.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Funcionalidades Activas */}
            <div>
              <span className="font-bold text-[#064e26] block mb-2 uppercase text-[11px]">
                Módulos e Funcionalidades Habilitadas pelo Super Administrador:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.financialManagement ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Gestão Financeira & Propinas Multicaixa</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.evaluationCenter ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Centro de Avaliações & Mini-Pautas INIDE</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.officialDocuments ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Emissão de Documentos com QR Code</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.massEnrollment ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Matrícula em Massa (Importação Lote)</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.aiAssistant ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Assistente Pedagógico IA Gemini</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.reportsAndAnalytics ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Relatórios Estatísticos Avançados</span>
                </div>
                <div className={`p-2.5 rounded-xl border flex items-center space-x-2 ${features.psychopedagogicalSupport ? 'bg-[#eaf6ee] border-[#cde6d5] text-[#055827]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">
                    Acompanhamento Psicopedagógico &amp; NEE {!features.psychopedagogicalSupport && '(Por Activar)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Inferior de Gravação */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Gravar Todas as Configurações da Escola</span>
          </button>
        </div>
      </form>
    </div>
  );
};
