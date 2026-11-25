/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Portal de Autenticação SaaS
 * Design inspirado na identidade institucional verde esmeralda e branco (Angola)
 */

import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  User,
  GraduationCap,
  ArrowRight,
  Lock,
  LogIn,
  Check,
  Globe,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Cloud
} from 'lucide-react';
import { Institution, StoredCredential, UserProfile, UserRole } from '../../types';
import { DEFAULT_ACCOUNTS, storageService } from '../../services/storageService';
import {
  getSupabaseConfig,
  normalizeSupabaseUrl,
  normalizeSupabaseUrlSafe,
  saveSupabaseConfig,
  signInSupabaseAuthSession,
  verifySupabaseAccountLogin
} from '../../lib/supabaseClient';

interface AuthPageProps {
  institutions: Institution[];
  onLogin: (user: UserProfile, institution: Institution | null) => void;
  onRegisterInstitution?: (newInst: Institution, adminUser: UserProfile) => void;
  onRegisterUser: (newUser: UserProfile, institution: Institution, password?: string) => void;
}

const REMEMBER_EMAIL_KEY = 'neuroeduca_remembered_email';

export const AuthPage: React.FC<AuthPageProps> = ({
  institutions,
  onLogin,
  onRegisterUser
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [showCloudConfigBox, setShowCloudConfigBox] = useState(false);
  const [cloudUrlInput, setCloudUrlInput] = useState(() => getSupabaseConfig().url || '');
  const [cloudKeyInput, setCloudKeyInput] = useState(() => getSupabaseConfig().anonKey || '');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [language, setLanguage] = useState<'pt' | 'en'>('pt');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Estados do Login
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY));
    } catch {
      return false;
    }
  });

  // Estados do Cadastro
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerInstitutionId, setRegisterInstitutionId] = useState<string>(
    institutions[0]?.id || ''
  );
  const [registerCustomInstName, setRegisterCustomInstName] = useState('');
  const [isCreatingNewSchool, setIsCreatingNewSchool] = useState(false);
  const [registerRole, setRegisterRole] = useState<
    'director_geral' | 'professor' | 'aluno' | 'encarregado_educacao'
  >('director_geral');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const [accounts, setAccounts] = useState<StoredCredential[]>(() =>
    storageService.getAccounts()
  );

  useEffect(() => {
    setAccounts(storageService.getAccounts());
  }, [institutions]);

  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
  }, [authMode]);

  const isPt = language === 'pt';

  const handlePrefillCredentials = (account: StoredCredential) => {
    setAuthMode('login');
    setLoginEmail(account.email);
    setLoginPassword(account.password || '123');
    setErrorMsg('');
    setSuccessMsg(
      isPt
        ? `Credenciais de "${account.fullName}" preenchidas. Clique em Entrar.`
        : `Credentials for "${account.fullName}" filled. Click Sign In.`
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail) {
      setErrorMsg(isPt ? 'Por favor, informe o seu e-mail.' : 'Please enter your email.');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg(isPt ? 'Por favor, informe a sua palavra-passe.' : 'Please enter your password.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const latestAccounts = storageService.getAccounts();
      let matched = latestAccounts.find((acc) => acc.email.toLowerCase() === cleanEmail);

      if (!matched || (matched.password && matched.password !== cleanPassword)) {
        const cloudCheck = await verifySupabaseAccountLogin(cleanEmail, cleanPassword);
        if (cloudCheck.inactive) {
          setErrorMsg(
            isPt
              ? 'Esta conta encontra-se desactivada. Contacte a administração.'
              : 'This account is deactivated. Contact administration.'
          );
          return;
        }
        if (cloudCheck.authenticated && cloudCheck.account) {
          const syncedCred: StoredCredential = {
            email: cloudCheck.account.email,
            password: cleanPassword,
            fullName: cloudCheck.account.fullName,
            role: cloudCheck.account.role as UserRole,
            institutionId: cloudCheck.account.institutionId,
            institutionName: cloudCheck.account.institutionName,
            municipality: cloudCheck.account.municipality,
            province: cloudCheck.account.province,
            status: 'activo'
          };
          const updatedList = storageService.upsertAccount(syncedCred);
          setAccounts(updatedList);
          matched = syncedCred;
        } else if (!matched) {
          if (cloudCheck.cloudUnavailable) {
            setShowCloudConfigBox(true);
            setErrorMsg(
              isPt
                ? 'Esta conta não está na memória local e o acesso à nuvem Supabase ainda não está ligado neste navegador. Cole abaixo o URL e a Chave Pública do Supabase (ou configure em Settings > Secrets).'
                : 'Account not cached locally and Supabase connection is not configured in this browser yet.'
            );
            return;
          }
          if (cloudCheck.error) {
            setErrorMsg(
              isPt
                ? `Erro ao verificar conta no Supabase: ${cloudCheck.error}`
                : `Supabase auth error: ${cloudCheck.error}`
            );
            return;
          }
        }
      }

      if (!matched) {
        setErrorMsg(
          isPt
            ? 'E-mail não encontrado ou palavra-passe incorrecta. Verifique os seus dados.'
            : 'Email not found or incorrect password. Please check your credentials.'
        );
        return;
      }

      if (matched.status === 'inactivo') {
        setErrorMsg(
          isPt
            ? 'Esta conta encontra-se desactivada pelo Administrador da Escola. Contacte a direcção.'
            : 'This account is deactivated by the School Administrator. Contact administration.'
        );
        return;
      }

      if (matched.password && matched.password !== cleanPassword) {
        setErrorMsg(isPt ? 'Palavra-passe incorrecta. Por favor tente novamente.' : 'Incorrect password. Please try again.');
        return;
      }

      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        // Ignora erros de armazenamento
      }

      signInSupabaseAuthSession(cleanEmail, cleanPassword).catch(() => {});

      setSuccessMsg(
        isPt
          ? `Autenticado com sucesso (${matched.role.replace(/_/g, ' ')})! A entrar...`
          : `Signed in successfully (${matched.role.replace(/_/g, ' ')})! Entering...`
      );

      setTimeout(() => {
        if (matched!.role === 'super_admin') {
          const profile: UserProfile = {
            id: `usr-super-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
            fullName: matched!.fullName,
            email: matched!.email,
            role: 'super_admin',
            institutionName: 'Administração Geral SaaS'
          };
          onLogin(profile, null);
        } else if (matched!.role === 'director_municipal') {
          const municipality = matched!.municipality || 'Kilamba Kiaxi';
          const province = matched!.province || 'Luanda';
          const profile: UserProfile = {
            id: `usr-mun-${Date.now()}`,
            fullName: matched!.fullName,
            email: matched!.email,
            role: 'director_municipal',
            municipality,
            province,
            institutionName: `Direcção Municipal da Educação de ${municipality}`
          };
          onLogin(profile, null);
        } else {
          const targetInst =
            institutions.find((i) => i.id === matched!.institutionId) ||
            institutions[0];

          const profile: UserProfile = {
            id: `usr-${Date.now()}`,
            fullName: matched!.fullName,
            email: matched!.email,
            role: matched!.role || 'director_geral',
            institutionId: targetInst?.id,
            institutionName: targetInst?.name
          };
          onLogin(profile, targetInst || null);
        }
      }, 300);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSaveCloudAndRetryLogin = async () => {
    let cleanUrl = '';
    try {
      cleanUrl = normalizeSupabaseUrl(cloudUrlInput);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isPt
            ? 'Endereço URL do Supabase inválido. Exemplo: https://seuprojecto.supabase.co'
            : 'Invalid Supabase URL.')
      );
      return;
    }

    const cleanKey = cloudKeyInput.trim();
    if (!cleanUrl || !cleanKey) {
      setErrorMsg(
        isPt
          ? 'Preencha o URL do Projecto Supabase e a Chave Pública (anon / publishable).'
          : 'Please enter Supabase URL and Public Key.'
      );
      return;
    }

    saveSupabaseConfig({
      url: cleanUrl,
      anonKey: cleanKey,
      isConnected: true,
      autoSync: true,
      lastSyncAt: null
    });
    setCloudUrlInput(normalizeSupabaseUrlSafe(cleanUrl));
    setShowCloudConfigBox(false);
    setErrorMsg('');

    if (loginEmail.trim() && loginPassword.trim()) {
      await handleLoginSubmit({ preventDefault: () => {} } as React.FormEvent);
    } else {
      setSuccessMsg(
        isPt
          ? 'Ligação ao Supabase guardada! Agora insira o seu e-mail e palavra-passe e clique em Entrar.'
          : 'Supabase connection saved! Now enter your email and password.'
      );
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanFullName = registerFullName.trim();
    const cleanEmail = registerEmail.trim().toLowerCase();
    const cleanPassword = registerPassword.trim();

    if (!cleanFullName) {
      setErrorMsg(isPt ? 'Por favor, informe o nome completo do utilizador.' : 'Please enter full name.');
      return;
    }

    if (isCreatingNewSchool && !registerCustomInstName.trim()) {
      setErrorMsg(isPt ? 'Por favor, informe o nome da instituição de ensino.' : 'Please enter school name.');
      return;
    }

    if (!cleanEmail) {
      setErrorMsg(isPt ? 'Por favor, indique um e-mail válido.' : 'Please enter a valid email.');
      return;
    }

    if (cleanPassword.length < 3) {
      setErrorMsg(isPt ? 'A palavra-passe deve conter pelo menos 3 caracteres.' : 'Password must have at least 3 characters.');
      return;
    }

    if (cleanPassword !== registerConfirmPassword.trim()) {
      setErrorMsg(isPt ? 'As palavras-passe não coincidem.' : 'Passwords do not match.');
      return;
    }

    const latestAccounts = storageService.getAccounts();
    if (latestAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      setErrorMsg(
        isPt
          ? 'Este e-mail já está cadastrado. Faça login com a sua conta existente.'
          : 'This email is already registered. Please sign in.'
      );
      return;
    }

    let targetInst: Institution;
    if (isCreatingNewSchool) {
      const newInstId = `inst-${Date.now()}`;
      const acronymGen =
        registerCustomInstName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 5) || 'ESC';

      targetInst = {
        id: newInstId,
        code: `${acronymGen}-2026`,
        name: registerCustomInstName.trim(),
        acronym: acronymGen,
        nif: `5000${Math.floor(100000 + Math.random() * 900000)}`,
        licenseNumber: `Dec. Exec. nº ${Math.floor(100 + Math.random() * 900)}/MED/2026`,
        institutionType: 'privada',
        category: 'complexo_escolar',
        province: 'Luanda',
        municipality: 'Município Sede',
        address: 'Bairro Central, Angola',
        phone: '+244 923 000 000',
        email: cleanEmail,
        directorName: cleanFullName,
        subsystems: ['primario_geral', 'secundario_geral_1'],
        status: 'active',
        maxClasses: 25,
        currentClassesCount: 0,
        currentStudentsCount: 0,
        currentTeachersCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
    } else {
      targetInst =
        institutions.find((i) => i.id === registerInstitutionId) ||
        institutions[0];
    }

    const effectiveRole: UserRole = isCreatingNewSchool ? 'director_geral' : registerRole;

    const newUserProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      fullName: cleanFullName,
      email: cleanEmail,
      role: effectiveRole,
      institutionId: targetInst.id,
      institutionName: targetInst.name
    };

    const newCredential: StoredCredential = {
      email: cleanEmail,
      password: cleanPassword,
      fullName: cleanFullName,
      role: effectiveRole,
      institutionId: targetInst.id,
      institutionName: targetInst.name,
      status: 'activo'
    };

    const nextAccounts = storageService.upsertAccount(newCredential);
    setAccounts(nextAccounts);

    setSuccessMsg(
      isPt
        ? `Conta criada e guardada para ${cleanFullName}! A iniciar...`
        : `Account created for ${cleanFullName}! Starting...`
    );

    setTimeout(() => {
      onRegisterUser(newUserProfile, targetInst, cleanPassword);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#ffffff] via-[#f5fbf7] to-[#e1f2e7] font-sans text-[#0b2316]">
      {/* DECORAÇÃO ORGÂNICA DE FUNDO (ESTILO DO DESIGN DE REFERÊNCIA) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Curva verde superior esquerda */}
        <svg
          viewBox="0 0 360 280"
          className="absolute -top-6 -left-6 w-52 sm:w-72 h-auto text-[#08833c]"
          fill="none"
        >
          <path d="M0 0 H210 C120 55 55 135 0 235 Z" fill="#cdebd6" />
          <path d="M0 0 H148 C88 48 42 105 0 175 Z" fill="url(#topCornerGrad)" />
          <defs>
            <linearGradient id="topCornerGrad" x1="0" y1="0" x2="148" y2="175" gradientUnits="userSpaceOnUse">
              <stop stopColor="#046a2e" />
              <stop offset="1" stopColor="#1ba34d" />
            </linearGradient>
          </defs>
        </svg>

        {/* Brilho solar suave ao centro-direita */}
        <div className="absolute top-[-10%] right-[12%] w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#d3eedb]/65 via-[#e8f7ed]/40 to-transparent blur-3xl" />

        {/* Onda verde diagonal inferior esquerda + canto inferior direito */}
        <svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="hidden lg:block absolute bottom-8 left-0 w-full h-[270px]"
        >
          <defs>
            <linearGradient id="bottomRibbonGrad" x1="0" y1="0" x2="1" y2="0.4">
              <stop offset="0%" stopColor="#057032" />
              <stop offset="55%" stopColor="#0b863d" />
              <stop offset="100%" stopColor="#149a47" />
            </linearGradient>
          </defs>
          {/* Faixa menta clara diagonal */}
          <path d="M0 40 L920 320 L0 320 Z" fill="#bfe6cb" />
          {/* Faixa verde esmeralda principal */}
          <path d="M0 78 L870 320 L0 320 Z" fill="url(#bottomRibbonGrad)" />
          {/* Detalhe verde no canto inferior direito */}
          <path d="M1260 320 C1340 285 1400 235 1440 165 L1440 320 Z" fill="#077e39" />
        </svg>
      </div>

      {/* BARRA SUPERIOR: SELECTOR DE IDIOMA */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-4 sm:pt-5 flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="inline-flex items-center gap-2 bg-white/95 hover:bg-white border border-[#cde6d5] rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#0b2316] shadow-xs transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#067836]" />
            <span>{isPt ? 'Português' : 'English'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#4b6755]" />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-1.5 w-40 bg-white border border-[#cde6d5] rounded-xl shadow-lg py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  setLanguage('pt');
                  setShowLangMenu(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  isPt ? 'bg-[#eaf6ee] text-[#055827]' : 'text-[#0b2316] hover:bg-[#f7fbf8]'
                }`}
              >
                <span>Português (AO)</span>
                {isPt && <Check className="w-3.5 h-3.5 text-[#067836]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  setShowLangMenu(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  !isPt ? 'bg-[#eaf6ee] text-[#055827]' : 'text-[#0b2316] hover:bg-[#f7fbf8]'
                }`}
              >
                <span>English</span>
                {!isPt && <Check className="w-3.5 h-3.5 text-[#067836]" />}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL: ESQUERDA INSTITUCIONAL + DIREITA CARTÃO FLUTUANTE */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 py-6 lg:py-4 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12">
        {/* COLUNA ESQUERDA: MARCA, SLOGAN, BENEFÍCIOS E MENSAGEM ANGOLA */}
        <section className="w-full lg:w-[52%] flex flex-col justify-between lg:min-h-[540px]">
          <div className="pt-2 lg:pt-4">
            {/* Marca Oficial NEUROEDUCA */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-[#cde6d5] shadow-sm p-2 flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/Log_NueroEduca_0d40bfa8.png"
                  alt="Logomarca NEUROEDUCA"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <span className="font-display text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-[#077a36] block leading-none">
                  NEUROEDUCA
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[#1a2e22] mt-1.5 block">
                  {isPt
                    ? 'Sistema de Gestão Escolar Multi-institucional'
                    : 'Multi-Institutional School Management System'}
                </span>
              </div>
            </div>

            {/* Slogan Principal em Itálico + Sublinhado Curvo */}
            <div className="mt-7 sm:mt-9 max-w-xl">
              <h1 className="font-display text-2xl sm:text-3xl lg:text-[36px] font-extrabold italic leading-[1.18] text-[#05612c] text-balance">
                {isPt ? (
                  <>
                    Educação de Qualidade
                    <br />
                    <span className="text-[#0c8940]">para um Futuro Melhor</span>
                  </>
                ) : (
                  <>
                    Quality Education
                    <br />
                    <span className="text-[#0c8940]">for a Better Future</span>
                  </>
                )}
              </h1>

              {/* Sublinhado curvo verde */}
              <svg viewBox="0 0 280 18" className="w-56 sm:w-64 h-3.5 mt-1.5" fill="none" aria-hidden="true">
                <path
                  d="M4 13 C85 3 195 3 274 11"
                  stroke="#0b863d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Lista de 4 Benefícios com Check Verde Circular */}
            <ul className="mt-5 sm:mt-6 space-y-3 max-w-md">
              {[
                isPt ? 'Gestão Académica Eficiente' : 'Efficient Academic Management',
                isPt ? 'Controlo Financeiro Inteligente' : 'Smart Financial Control',
                isPt ? 'Relatórios em Tempo Real' : 'Real-Time Reports',
                isPt ? 'Acesso Seguro e Personalizado' : 'Secure & Personalized Access'
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span className="text-sm sm:text-[15px] font-semibold text-[#11291b]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Assinatura Juntos pela Educação em Angola (Desktop sobre faixa verde / Mobile cartão verde) */}
          <div className="mt-8 lg:mt-10">
            <div className="inline-flex items-center gap-3.5 px-4 py-3 lg:px-0 lg:py-0 rounded-2xl bg-[#077936] lg:bg-transparent text-white shadow-sm lg:shadow-none">
              {/* Ícone 3 Pessoas Branco */}
              <div className="flex items-center -space-x-1 shrink-0">
                <svg viewBox="0 0 64 44" className="w-11 h-8 text-white" fill="currentColor" aria-hidden="true">
                  <circle cx="15" cy="14" r="6" opacity="0.92" />
                  <path d="M5 37 C5 28 25 28 25 37 Z" opacity="0.92" />
                  <circle cx="49" cy="14" r="6" opacity="0.92" />
                  <path d="M39 37 C39 28 59 28 59 37 Z" opacity="0.92" />
                  <circle cx="32" cy="11" r="7.5" />
                  <path d="M18 39 C18 26 46 26 46 39 Z" />
                </svg>
              </div>
              <div className="h-9 w-px bg-white/30" aria-hidden="true" />
              <div>
                <p className="text-sm sm:text-[15px] font-semibold italic leading-snug text-white">
                  {isPt ? (
                    <>
                      Juntos pela Educação
                      <br />
                      em Angola
                    </>
                  ) : (
                    <>
                      Together for Education
                      <br />
                      in Angola
                    </>
                  )}
                </p>
                <svg viewBox="0 0 140 10" className="w-28 h-2 mt-0.5" fill="none" aria-hidden="true">
                  <path d="M2 8 C45 2 95 2 138 6" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* COLUNA DIREITA: CARTÃO FLUTUANTE BRANCO DE INÍCIO DE SESSÃO / REGISTO */}
        <section className="w-full max-w-[445px] lg:ml-auto">
          <div className="bg-white rounded-[26px] border border-[#dce7df] shadow-[0_20px_55px_rgba(2,44,22,0.14)] p-6 sm:p-8">
            {/* Ícone Circular Cadeado Verde no Topo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#06823b] to-[#16a34a] text-white shadow-[0_8px_20px_rgba(6,130,59,0.28)] flex items-center justify-center">
                {authMode === 'login' ? (
                  <Lock className="w-8 h-8" />
                ) : (
                  <UserPlus className="w-8 h-8" />
                )}
              </div>
            </div>

            {/* Título & Subtítulo */}
            <div className="text-center mt-4 mb-5">
              <h2 className="font-display text-2xl sm:text-[28px] font-extrabold text-[#0b2316] tracking-tight">
                {authMode === 'login'
                  ? isPt
                    ? 'Iniciar Sessão'
                    : 'Sign In'
                  : isPt
                  ? 'Criar Conta'
                  : 'Create Account'}
              </h2>
              <p className="text-xs sm:text-sm text-[#4b6755] mt-1">
                {authMode === 'login'
                  ? isPt
                    ? 'Acesse o seu painel de gestão'
                    : 'Access your management dashboard'
                  : isPt
                  ? 'Associe o seu perfil à sua instituição de ensino'
                  : 'Link your profile to your school'}
              </p>
            </div>

            {/* Mensagens de Erro / Sucesso */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORMULÁRIO DE LOGIN */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div className="relative">
                  <User className="w-4 h-4 text-[#067836] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={isPt ? 'Nome de Utilizador (E-mail)' : 'Username (Email)'}
                    aria-label={isPt ? 'Nome de Utilizador' : 'Username'}
                    className="w-full min-h-[46px] bg-white text-[#0b2316] placeholder:text-[#6e8577] rounded-xl pl-10 pr-3.5 py-2.5 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-[#067836] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={isPt ? 'Palavra-passe' : 'Password'}
                    aria-label={isPt ? 'Palavra-passe' : 'Password'}
                    className="w-full min-h-[46px] bg-white text-[#0b2316] placeholder:text-[#6e8577] rounded-xl pl-10 pr-11 py-2.5 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={isPt ? 'Mostrar ou ocultar palavra-passe' : 'Toggle password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#5c7365] hover:text-[#067836] rounded-lg cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="lembrar-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#cde6d5] accent-[#067836] cursor-pointer"
                    />
                    <span className="text-[#1a3324] font-medium">
                      {isPt ? 'Lembrar-me' : 'Remember me'}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[#067836] hover:text-[#045c29] font-semibold hover:underline cursor-pointer"
                  >
                    {isPt ? 'Esqueceu a palavra-passe?' : 'Forgot password?'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full min-h-[48px] py-2.5 px-5 bg-gradient-to-r from-[#06823b] to-[#159b48] hover:from-[#056b30] hover:to-[#11833c] disabled:opacity-60 text-white font-bold text-base rounded-xl shadow-[0_6px_18px_rgba(6,120,54,0.28)] transition-all cursor-pointer inline-flex items-center justify-center gap-2 mt-1"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isAuthenticating
                      ? isPt
                        ? 'A verificar...'
                        : 'Verifying...'
                      : isPt
                      ? 'Entrar'
                      : 'Sign In'}
                  </span>
                </button>

                {/* Painel opcional para ligar ao Supabase directamente no Login quando não há Secrets */}
                {showCloudConfigBox ? (
                  <div className="mt-3 p-3.5 bg-[#f7fbf8] border border-[#cde6d5] rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#055827] flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-[#067836]" />
                        <span>Ligar Supabase para Login na Nuvem</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCloudConfigBox(false)}
                        className="text-[#4b6755] hover:text-[#0b2316] font-semibold cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cloudUrlInput}
                      onChange={(e) => setCloudUrlInput(e.target.value)}
                      placeholder="https://seuprojecto.supabase.co"
                      className="w-full bg-white text-[#0b2316] font-mono rounded-lg px-2.5 py-2 text-[11px] border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
                    />
                    <input
                      type="password"
                      value={cloudKeyInput}
                      onChange={(e) => setCloudKeyInput(e.target.value)}
                      placeholder="Chave Pública (sb_publishable_... ou eyJ...)"
                      className="w-full bg-white text-[#0b2316] font-mono rounded-lg px-2.5 py-2 text-[11px] border border-[#cde6d5] focus:border-[#067836] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCloudAndRetryLogin}
                      className="w-full py-2 px-3 bg-[#067836] hover:bg-[#055f2b] text-white font-bold rounded-lg transition cursor-pointer"
                    >
                      Guardar Ligação e Entrar
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCloudConfigBox(true)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#4b6755] hover:text-[#067836] cursor-pointer"
                    >
                      <Cloud className="w-3 h-3" />
                      <span>{isPt ? 'Configurar ligação Supabase neste navegador' : 'Configure Supabase connection'}</span>
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* FORMULÁRIO DE CADASTRO */}
            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0b2316] mb-1">
                    {isPt ? 'Nome Completo*' : 'Full Name*'}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)}
                    placeholder="Ex.: Ana Paula Mateus"
                    className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#0b2316]">
                      {isPt ? 'Instituição de Ensino*' : 'School / Institution*'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewSchool(!isCreatingNewSchool)}
                      className="text-xs text-[#067836] hover:text-[#045c29] font-semibold hover:underline cursor-pointer"
                    >
                      {isCreatingNewSchool
                        ? isPt
                          ? 'Selecionar existente'
                          : 'Select existing'
                        : isPt
                        ? '+ Registar nova escola'
                        : '+ Register new school'}
                    </button>
                  </div>

                  {isCreatingNewSchool ? (
                    <input
                      type="text"
                      required
                      value={registerCustomInstName}
                      onChange={(e) => setRegisterCustomInstName(e.target.value)}
                      placeholder={isPt ? 'Nome oficial da escola ou colégio' : 'Official school name'}
                      className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                    />
                  ) : (
                    <select
                      value={registerInstitutionId}
                      onChange={(e) => setRegisterInstitutionId(e.target.value)}
                      className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-xs font-medium border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition cursor-pointer"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.province})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!isCreatingNewSchool && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0b2316] mb-1">
                      {isPt ? 'Perfil de Acesso*' : 'Access Role*'}
                    </label>
                    <select
                      value={registerRole}
                      onChange={(e) => setRegisterRole(e.target.value as any)}
                      className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-xs font-medium border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition cursor-pointer"
                    >
                      <option value="director_geral">Administrador Escolar / Direcção</option>
                      <option value="professor">Professor / Docente</option>
                      <option value="aluno">Aluno / Estudante (Portal Restrito)</option>
                      <option value="encarregado_educacao">Encarregado de Educação (Portal Restrito)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#0b2316] mb-1">
                    {isPt ? 'Endereço de E-mail*' : 'Email Address*'}
                  </label>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="utilizador@escola.ao"
                    className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0b2316] mb-1">
                      {isPt ? 'Palavra-passe*' : 'Password*'}
                    </label>
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0b2316] mb-1">
                      {isPt ? 'Confirmar*' : 'Confirm*'}
                    </label>
                    <input
                      type="password"
                      required
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[42px] bg-[#f7fbf8] text-[#0b2316] rounded-xl px-3.5 py-2 text-sm border border-[#cde6d5] focus:border-[#067836] focus:ring-4 focus:ring-[#16a34a]/15 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[46px] py-2.5 px-5 bg-gradient-to-r from-[#06823b] to-[#159b48] hover:from-[#056b30] hover:to-[#11833c] text-white font-bold text-sm rounded-xl shadow-[0_6px_18px_rgba(6,120,54,0.28)] transition-all cursor-pointer inline-flex items-center justify-center gap-2 mt-1"
                >
                  <span>{isPt ? 'Criar Conta' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* SEPARADOR "ou" */}
            <div className="relative my-4 flex items-center">
              <div className="flex-grow border-t border-[#dce7df]" />
              <span className="px-3 text-xs font-medium text-[#4b6755]">
                {isPt ? 'ou' : 'or'}
              </span>
              <div className="flex-grow border-t border-[#dce7df]" />
            </div>

            {/* BOTÃO SECUNDÁRIO CONTORNADO: ALTERNAR MODO / CRIAR CONTA */}
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-[#f7fbf8] border border-[#cde6d5] hover:border-[#067836] text-[#0b2316] font-semibold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? (
                <>
                  <UserPlus className="w-4 h-4 text-[#067836]" />
                  <span>{isPt ? 'Criar Nova Conta Institucional' : 'Create Institutional Account'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#067836]" />
                  <span>{isPt ? 'Já tenho conta · Iniciar Sessão' : 'Already have an account · Sign In'}</span>
                </>
              )}
            </button>

            {/* FAIXA DE SEGURANÇA DENTRO DO CARTÃO */}
            <div className="mt-4 bg-[#e7f6ec] border border-[#cde6d5] text-[#055827] rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#067836] shrink-0" />
              <span>
                {isPt ? 'Sistema Seguro · Dados Protegidos' : 'Secure System · Protected Data'}
              </span>
            </div>
          </div>

          {/* ACESSO RÁPIDO A CREDENCIAIS DE DEMONSTRAÇÃO */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-white/90 hover:bg-white border border-[#cde6d5] text-[#055827] text-xs font-semibold flex items-center justify-between shadow-2xs transition cursor-pointer"
            >
              <span>
                {isPt
                  ? `Acesso rápido · Contas de demonstração (${accounts.length})`
                  : `Quick access · Demo accounts (${accounts.length})`}
              </span>
              {showDemoAccounts ? (
                <ChevronUp className="w-4 h-4 text-[#067836]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#067836]" />
              )}
            </button>

            {showDemoAccounts && (
              <div className="mt-2 bg-white rounded-2xl p-3 border border-[#dce7df] shadow-lg space-y-1.5">
                <button
                  type="button"
                  onClick={() => handlePrefillCredentials(DEFAULT_ACCOUNTS[2])}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#eaf6ee] flex items-center justify-between border border-slate-100 hover:border-[#cde6d5] cursor-pointer transition"
                >
                  <div>
                    <strong className="block text-[#0b2316] text-xs">Director Geral (Admin da Escola)</strong>
                    <span className="text-[11px] text-[#4b6755] font-mono">direcao@sagradaesperanca.ao · senha: 123</span>
                  </div>
                  <Building2 className="w-4 h-4 text-[#067836] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePrefillCredentials(DEFAULT_ACCOUNTS[1])}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#eaf6ee] flex items-center justify-between border border-slate-100 hover:border-[#cde6d5] cursor-pointer transition"
                >
                  <div>
                    <strong className="block text-[#0b2316] text-xs">Director Municipal da Educação (Kilamba Kiaxi)</strong>
                    <span className="text-[11px] text-[#4b6755] font-mono">director.municipal@neuroeduca.ao · senha: 123</span>
                  </div>
                  <Building2 className="w-4 h-4 text-[#1d8cf8] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePrefillCredentials(DEFAULT_ACCOUNTS[0])}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#eaf6ee] flex items-center justify-between border border-slate-100 hover:border-[#cde6d5] cursor-pointer transition"
                >
                  <div>
                    <strong className="block text-[#0b2316] text-xs">Super Admin SaaS</strong>
                    <span className="text-[11px] text-[#4b6755] font-mono">admin.geral@neuroeduca.ao · senha: admin</span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#1d8cf8] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePrefillCredentials(DEFAULT_ACCOUNTS[4])}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#eaf6ee] flex items-center justify-between border border-slate-100 hover:border-[#cde6d5] cursor-pointer transition"
                >
                  <div>
                    <strong className="block text-[#0b2316] text-xs">Professor / Docente</strong>
                    <span className="text-[11px] text-[#4b6755] font-mono">professor@sagradaesperanca.ao · senha: 123</span>
                  </div>
                  <GraduationCap className="w-4 h-4 text-[#16a34a] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const acc =
                      DEFAULT_ACCOUNTS.find((a) => a.email === 'aluno@sagradaesperanca.ao') ||
                      DEFAULT_ACCOUNTS[7];
                    handlePrefillCredentials(acc);
                  }}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#eaf6ee] flex items-center justify-between border border-slate-100 hover:border-[#cde6d5] cursor-pointer transition"
                >
                  <div>
                    <strong className="block text-[#0b2316] text-xs">Aluno (Portal Restrito — Dados Próprios)</strong>
                    <span className="text-[11px] text-[#4b6755] font-mono">aluno@sagradaesperanca.ao · senha: 123</span>
                  </div>
                  <User className="w-4 h-4 text-[#7c3aed] shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const acc =
                      DEFAULT_ACCOUNTS.find((a) => a.email === 'encarregado@sagradaesperanca.ao') ||
                      DEFAULT_ACCOUNTS[10];
                    handlePrefillCredentials(acc);
                  }}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-xl hover:bg-[#eaf6ee] flex items-center justify-between border border-slate-100 hover:border-[#cde6d5] cursor-pointer transition"
                >
                  <div>
                    <strong className="block text-[#0b2316] text-xs">Encarregado de Educação (Apenas Educandos)</strong>
                    <span className="text-[11px] text-[#4b6755] font-mono">encarregado@sagradaesperanca.ao · senha: 123</span>
                  </div>
                  <User className="w-4 h-4 text-[#067836] shrink-0" />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* RODAPÉ INSTITUCIONAL VERDE ESCURO */}
      <footer className="relative z-10 w-full bg-[#004e23] text-white/95 border-t border-[#067836]/40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
            <strong className="font-extrabold tracking-wide text-white">NEUROEDUCA</strong>
            <span className="text-white/80">© 2026</span>
            <span className="text-white/50">|</span>
            <span className="text-white/90">
              {isPt
                ? 'Gestão Escolar Inteligente, Educação Mais Forte.'
                : 'Smart School Management, Stronger Education.'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-white/90 shrink-0">
            {/* Bandeira de Angola SVG */}
            <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[2px] shadow-2xs shrink-0" aria-label="Angola">
              <rect width="24" height="8" y="0" fill="#cc092f" />
              <rect width="24" height="8" y="8" fill="#111111" />
              <circle cx="12" cy="8" r="2.6" fill="none" stroke="#ffcb00" strokeWidth="1.2" strokeDasharray="1.8 0.8" />
              <circle cx="12" cy="8" r="0.9" fill="#ffcb00" />
            </svg>
            <span className="font-semibold">Angola</span>
            <span className="text-white/50">|</span>
            <span className="text-white/85 tabular-nums">
              {isPt ? 'Versão 1.0.0' : 'Version 1.0.0'}
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL RECUPERAÇÃO DE PALAVRA-PASSE */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-[#022c16]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-sm w-full text-[#0b2316] shadow-2xl border border-[#dce7df]">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5">
              <h3 className="font-display font-bold text-base">
                {isPt ? 'Recuperação de Palavra-passe' : 'Password Recovery'}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-xs text-[#4b6755] mb-4 leading-relaxed">
                {isPt
                  ? 'Para redefinir a palavra-passe da sua conta institucional, utilize as credenciais padrão do ambiente local ou contacte a direcção da sua instituição escolar.'
                  : 'To reset your institutional account password, use the default local environment credentials or contact your school administration.'}
              </p>
              <div className="p-3 bg-[#f3f7f4] rounded-xl text-xs space-y-1.5 mb-4 border border-[#cde6d5]">
                <span className="block font-semibold text-[#0b2316]">
                  {isPt ? 'Palavras-passe de Demonstração:' : 'Demo Passwords:'}
                </span>
                <span className="block text-[#4b6755] font-mono">director / prof / aluno: 123</span>
                <span className="block text-[#4b6755] font-mono">super admin: admin</span>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full min-h-[44px] py-2 bg-gradient-to-r from-[#06823b] to-[#159b48] hover:from-[#056b30] hover:to-[#11833c] text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
