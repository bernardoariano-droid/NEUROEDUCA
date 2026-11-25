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
  ShieldCheck,
  User,
  Lock,
  LogIn,
  Check,
  Globe,
  ChevronDown,
  Cloud
} from 'lucide-react';
import { Institution, StoredCredential, UserProfile, UserRole } from '../../types';
import { storageService } from '../../services/storageService';
import {
  fetchServerSupabaseStatus,
  getSupabaseConfig,
  normalizeSupabaseUrl,
  normalizeSupabaseUrlSafe,
  pullSupabaseDataToLocal,
  saveServerSupabaseConfig,
  saveSupabaseConfig,
  signInSupabaseAuthSession,
  verifySupabaseAccountLogin
} from '../../lib/supabaseClient';

interface AuthPageProps {
  institutions: Institution[];
  onLogin: (user: UserProfile, institution: Institution | null) => void;
}

const REMEMBER_EMAIL_KEY = 'neuroeduca_remembered_email';

export const AuthPage: React.FC<AuthPageProps> = ({
  institutions,
  onLogin
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showCloudConfigBox, setShowCloudConfigBox] = useState(false);
  const [cloudUrlInput, setCloudUrlInput] = useState(() => getSupabaseConfig().url || '');
  const [cloudKeyInput, setCloudKeyInput] = useState(() => getSupabaseConfig().anonKey || '');
  const [isCloudReady, setIsCloudReady] = useState(() => {
    const cfg = getSupabaseConfig();
    return Boolean(cfg.url && cfg.anonKey);
  });
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

  useEffect(() => {
    let active = true;
    fetchServerSupabaseStatus()
      .then((status) => {
        if (!active) return;
        const cfg = getSupabaseConfig();
        const ready = Boolean(status.serverConfigured || (cfg.url && cfg.anonKey));
        setIsCloudReady(ready);
        if (cfg.url) setCloudUrlInput(cfg.url);
        if (cfg.anonKey) setCloudKeyInput(cfg.anonKey);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isPt = language === 'pt';

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
          storageService.upsertAccount(syncedCred);
          matched = syncedCred;
          setIsCloudReady(true);
        } else if (!matched) {
          if (cloudCheck.cloudUnavailable) {
            setShowCloudConfigBox(true);
            setErrorMsg(
              isPt
                ? 'Ligação ao Supabase ainda não configurada neste servidor. Cole abaixo o URL e a Chave Pública (ou defina em Settings > Secrets / Vercel Env).'
                : 'Supabase connection is not configured yet. Paste the URL and Public Key below.'
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

      await signInSupabaseAuthSession(cleanEmail, cleanPassword).catch(() => {});

      let availableInstitutions = institutions;
      if (
        matched.institutionId &&
        !availableInstitutions.some((i) => i.id === matched!.institutionId)
      ) {
        const pulled = await pullSupabaseDataToLocal().catch(() => null);
        if (pulled?.success && pulled.bundle?.institutions?.length) {
          availableInstitutions = pulled.bundle.institutions;
        }
      }

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
            availableInstitutions.find((i) => i.id === matched!.institutionId) ||
            availableInstitutions[0];

          const profile: UserProfile = {
            id: `usr-${Date.now()}`,
            fullName: matched!.fullName,
            email: matched!.email,
            role: matched!.role || 'director_geral',
            institutionId: targetInst?.id || matched!.institutionId,
            institutionName: targetInst?.name || matched!.institutionName
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
    await saveServerSupabaseConfig(cleanUrl, cleanKey, true);
    setCloudUrlInput(normalizeSupabaseUrlSafe(cleanUrl));
    setShowCloudConfigBox(false);
    setIsCloudReady(true);
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

        {/* COLUNA DIREITA: CARTÃO FLUTUANTE BRANCO DE INÍCIO DE SESSÃO */}
        <section className="w-full max-w-[445px] lg:ml-auto">
          <div className="bg-white rounded-[26px] border border-[#dce7df] shadow-[0_20px_55px_rgba(2,44,22,0.14)] p-6 sm:p-8">
            {/* Ícone Circular Cadeado Verde no Topo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#06823b] to-[#16a34a] text-white shadow-[0_8px_20px_rgba(6,130,59,0.28)] flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            </div>

            {/* Título & Subtítulo */}
            <div className="text-center mt-4 mb-5">
              <h2 className="font-display text-2xl sm:text-[28px] font-extrabold text-[#0b2316] tracking-tight">
                {isPt ? 'Iniciar Sessão' : 'Sign In'}
              </h2>
              <p className="text-xs sm:text-sm text-[#4b6755] mt-1">
                {isPt ? 'Acesse o seu painel de gestão' : 'Access your management dashboard'}
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

                {/* Fallback exibido apenas se nenhuma ligação Supabase estiver configurada ainda */}
                {showCloudConfigBox && (
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
                )}
              </form>

            {/* FAIXA DE SEGURANÇA DENTRO DO CARTÃO */}
            <div className="mt-5 bg-[#e7f6ec] border border-[#cde6d5] text-[#055827] rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#067836] shrink-0" />
              <span>
                {isCloudReady
                  ? isPt
                    ? 'Ligação Permanente Activa · Dados Protegidos'
                    : 'Permanent Cloud Link Active · Protected Data'
                  : isPt
                  ? 'Sistema Seguro · Dados Protegidos'
                  : 'Secure System · Protected Data'}
              </span>
            </div>
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
                  ? 'Para redefinir ou recuperar a palavra-passe da sua conta institucional, contacte a direcção ou o Administrador da sua instituição escolar (ou o Super Administrador do sistema).'
                  : 'To reset or recover your institutional account password, please contact your School Administrator or System Super Administrator.'}
              </p>
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
