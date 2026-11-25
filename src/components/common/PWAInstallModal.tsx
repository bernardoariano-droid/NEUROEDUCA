/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Componente de Instalação do Aplicativo (APK / PWA)
 */

import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  WifiOff
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#dce7df] text-slate-800 animate-scale-up">
        {/* Cabeçalho com Gradiente da Marca */}
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/15 rounded-xl border border-white/25">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">
                INSTALAR APLICATIVO (APK)
              </h2>
              <p className="text-[11px] text-emerald-100">
                Instale o NEUROEDUCA directamente no seu telemóvel, tablet ou computador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4 text-xs">
          {installSuccess ? (
            <div className="p-4 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#16a34a] mx-auto" />
              <h3 className="font-bold text-sm text-[#055827]">Aplicativo Instalado com Sucesso!</h3>
              <p className="text-[#067836] text-xs">
                O ícone do <strong>NEUROEDUCA</strong> foi adicionado ao ecrã inicial do seu telemóvel. Já pode aceder sem barras de navegação do navegador.
              </p>
            </div>
          ) : isInstalled ? (
            <div className="p-4 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#067836] mx-auto" />
              <h3 className="font-bold text-sm text-[#055827]">Aplicativo Já Instalado</h3>
              <p className="text-[#067836] text-xs">
                O sistema já se encontra instalado no seu dispositivo em modo ecrã inteiro.
              </p>
            </div>
          ) : (
            <>
              {/* Vantagens do APK / PWA */}
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2.5 bg-[#f3f7f4] border border-[#dce7df] rounded-xl flex items-start space-x-2">
                  <Zap className="w-4 h-4 text-[#f5a623] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Acesso Instantâneo</span>
                    <span className="text-[10px] text-slate-500">Sem digitar o endereço URL a cada visita</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#f3f7f4] border border-[#dce7df] rounded-xl flex items-start space-x-2">
                  <Smartphone className="w-4 h-4 text-[#067836] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Ecrã Inteiro</span>
                    <span className="text-[10px] text-slate-500">Experiência idêntica a uma app nativa</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                  <WifiOff className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Funciona Offline</span>
                    <span className="text-[10px] text-slate-500">Carrega mais rápido e poupa saldo de dados</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Leve e Seguro</span>
                    <span className="text-[10px] text-slate-500">Não ocupa armazenamento desnecessário</span>
                  </div>
                </div>
              </div>

              {/* Botão de Instalação Direta (Quando suportado nativamente pelo browser) */}
              {isInstallable && (
                <div className="pt-2">
                  <button
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar APK no Telemóvel Agora</span>
                  </button>
                </div>
              )}

              {/* Guia para Android (Google Chrome / Samsung Internet) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] uppercase font-black">
                    Android
                  </span>
                  <span>Como instalar no Chrome / Telemóvel Android:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                  <li>
                    Toque no menu de <strong>3 pontos (⋮)</strong> no canto superior direito do seu navegador.
                  </li>
                  <li>
                    Seleccione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar ao ecrã inicial"</strong>.
                  </li>
                  <li>
                    Toque em <strong>"Instalar"</strong> para concluir. O APK oficial será adicionado à sua lista de aplicações.
                  </li>
                </ol>
              </div>

              {/* Guia para iPhone / iPad (iOS Safari) */}
              {isIOS && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
                  <div className="font-bold text-sky-950 flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] uppercase font-black">
                      Apple iOS
                    </span>
                    <span>Como instalar no iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-sky-900 text-[11px] leading-relaxed">
                    <li>
                      Toque no botão de <strong>Partilhar</strong> (<Share2 className="w-3 h-3 inline mx-0.5" />) na barra inferior do Safari.
                    </li>
                    <li>
                      Role para baixo e toque em <strong>"Ecrã Principal"</strong> (Add to Home Screen).
                    </li>
                    <li>
                      Toque em <strong>"Adicionar"</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              NEUROEDUCA PWA · Compatível com Android 8+, iOS 14+, Windows e macOS
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
