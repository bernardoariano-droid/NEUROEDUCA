/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Insígnia Oficial da República de Angola para Cabeçalho de Documentos
 */

import React, { useState } from 'react';

interface AngolaInsigniaProps {
  className?: string;
}

const PRIMARY_INSIGNIA_URL = 'https://luanda.gov.ao/themes/portalweb/assets/insignia.png';
const CDN_INSIGNIA_URL =
  'https://th.bing.com/th/id/R.ee6fee60d1fa04392c3c3573275bfde8?rik=gDE%2fatTNFOr1eQ&pid=ImgRaw&r=0';

export const AngolaInsignia: React.FC<AngolaInsigniaProps> = ({
  className = 'h-14 sm:h-16 w-auto mx-auto object-contain'
}) => {
  const [sourceIndex, setSourceIndex] = useState<0 | 1 | 2>(0);

  const handleError = () => {
    setSourceIndex((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : 2));
  };

  if (sourceIndex === 2) {
    return (
      <div
        className="mx-auto flex items-center justify-center w-14 h-14 rounded-full border-2 border-amber-600 bg-amber-50 text-amber-800 font-black text-[10px] tracking-wider uppercase"
        aria-label="Insígnia da República de Angola"
      >
        ANGOLA
      </div>
    );
  }

  const currentSrc =
    sourceIndex === 0 ? PRIMARY_INSIGNIA_URL : CDN_INSIGNIA_URL;

  return (
    <img
      src={currentSrc}
      alt="Insígnia da República de Angola"
      data-angola-insignia="true"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
};
