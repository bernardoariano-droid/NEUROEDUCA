/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Motor de Avaliação Escolar Angolano
 * Suporte a Fórmulas INIDE/MED, Ensino Superior e Avaliação Qualitativa
 */

import { OFFICIAL_CURRICULUM_PLANS } from '../data/angolaCurriculum';
import { CurriculumSubject, EducationSubsystemCode, GradeRecord, SchoolSubject } from '../types';

export const MULTIDISCIPLINARY_SUBSYSTEMS: EducationSubsystemCode[] = [
  'secundario_geral_1',
  'secundario_geral_2',
  'tecnico_1',
  'tecnico_2',
  'pedagogico',
  'superior'
];

/**
 * Verifica se a turma/subsistema pertence ao regime multidisciplinar
 * (a partir do Ensino Secundário até ao Ensino Superior)
 */
export function isMultidisciplinarySubsystem(
  subsystemCode?: EducationSubsystemCode | string,
  gradeLevel?: string
): boolean {
  if (
    subsystemCode &&
    MULTIDISCIPLINARY_SUBSYSTEMS.includes(subsystemCode as EducationSubsystemCode)
  ) {
    return true;
  }
  if (subsystemCode === 'adultos' && gradeLevel && /secund/i.test(gradeLevel)) {
    return true;
  }
  return false;
}

export interface GradingScaleConfig {
  maxScale: number;
  passingThreshold: number;
  recourseThreshold: number;
  veryGoodThreshold: number;
  goodThreshold: number;
  scaleLabel: string;
  isPrimaryScale: boolean;
}

/**
 * Retorna a escala oficial conforme o nível de ensino:
 * - Ensino Primário (primario_geral): 0 a 10 valores (aprovação ≥ 5.0)
 * - Ensino Secundário ao Ensino Superior: 0 a 20 valores (≥ 9.5 Secundário/Técnico/Pedagógico/Adultos; ≥ 10.0 Superior)
 */
export function getGradingScaleConfig(subsystemCode?: string): GradingScaleConfig {
  if (subsystemCode === 'primario_geral') {
    return {
      maxScale: 10,
      passingThreshold: 5.0,
      recourseThreshold: 3.5,
      veryGoodThreshold: 8.5,
      goodThreshold: 7.0,
      scaleLabel: '0 a 10 valores',
      isPrimaryScale: true
    };
  }

  if (subsystemCode === 'superior') {
    return {
      maxScale: 20,
      passingThreshold: 10.0,
      recourseThreshold: 7.0,
      veryGoodThreshold: 17.0,
      goodThreshold: 14.0,
      scaleLabel: '0 a 20 valores',
      isPrimaryScale: false
    };
  }

  return {
    maxScale: 20,
    passingThreshold: 9.5,
    recourseThreshold: 7.0,
    veryGoodThreshold: 17.0,
    goodThreshold: 14.0,
    scaleLabel: '0 a 20 valores',
    isPrimaryScale: false
  };
}

export interface GradeComponents {
  ac1?: number; // Avaliação Contínua 1
  ac2?: number; // Avaliação Contínua 2
  ac3?: number; // Avaliação Contínua 3
  mac?: number; // Média de Avaliação Contínua = (AC1 + AC2 + AC3) / 3
  npp?: number; // Nota da Prova do Professor (compatibilidade)
  npt?: number; // Nota da Prova Trimestral
  examScore?: number; // Exame de Recurso ou Exame Final
}

export interface EvaluationResult {
  trimestralAverage?: number; // MT
  finalGrade?: number; // MF
  isApproved: boolean;
  needsRecourse: boolean;
  statusLabel: 'Aprovado' | 'Reprovado' | 'Recurso' | 'Transita' | 'Não Transita' | 'Pendente';
  scale: string;
}

export interface AnnualSubjectSummary {
  mt1?: number;
  mt2?: number;
  mt3?: number;
  cap?: number; // Classificação Anual de Frequência / Provisória
  en?: number; // Exame Normal (EN)
  rec?: number; // Exame de Recurso (REC)
  examScore?: number; // Compatibilidade legada (EN)
  mf?: number; // Média Final Anual (CF / MF)
  hasExamAndRecourse?: boolean;
  isApproved: boolean;
  needsRecourse: boolean;
  statusLabel: 'Transita' | 'Recurso' | 'Não Transita' | 'Aprovado' | 'Reprovado' | 'Pendente';
}

export interface CouncilDecisionResult {
  overallAverage?: number;
  positivesCount: number;
  negativesCount: number;
  evaluatedCount: number;
  totalSubjects: number;
  decision: 'Transita' | 'Admitido a Exame' | 'Recurso' | 'Não Transita' | 'Em Curso';
}

export interface MedGenderStats {
  matriculados: { m: number; f: number; total: number };
  avaliados: { m: number; f: number; total: number };
  positivas: { m: number; f: number; total: number };
  negativas: { m: number; f: number; total: number };
  recurso: { m: number; f: number; total: number };
  taxaAproveitamento: number;
}

/**
 * Verifica se a classe/nível possui EXCLUSIVAMENTE Exames (EN) e Recursos (REC):
 * - 6.ª Classe
 * - Módulo 3 (ou Módulo III)
 * - Etapa 3 (ou Etapa III)
 * - 9.ª Classe
 * - 12.ª Classe
 * - Todo o Ensino Superior
 */
export function isExamAndRecourseEligible(
  subsystemCode?: string,
  gradeLevel?: string
): boolean {
  if (subsystemCode === 'superior') {
    return true;
  }
  if (!gradeLevel) return false;
  const g = gradeLevel.trim();

  // 6.ª Classe, 9.ª Classe, 12.ª Classe (exclui 13.ª, 10.ª, 11.ª, 7.ª, 8.ª, 1.ª-5.ª)
  if (/^(6|9|12)(?:\s*[.º°ªa]|\s+classe\b|$)/i.test(g) || /\b(6|9|12)[ªa]\s*classe\b/i.test(g)) {
    return true;
  }

  // Módulo 3 / Módulo III
  if (/\bm[óo]dulo\s*(?:3|iii)\b/i.test(g)) {
    return true;
  }

  // Etapa 3 / Etapa III
  if (/\betapa\s*(?:3|iii)\b/i.test(g)) {
    return true;
  }

  return false;
}

/**
 * Alias mantido para compatibilidade com módulos existentes
 */
export function isTerminalExamGrade(
  gradeLevel?: string,
  subsystemCode?: string
): boolean {
  return isExamAndRecourseEligible(subsystemCode, gradeLevel);
}

/**
 * Resolve as disciplinas curriculares oficiais do INIDE/MED para uma turma/aluno
 * Evita fallback cego para a 1.ª Classe em níveis secundários, técnicos ou pedagógicos
 */
export function resolveSubjectsForClass(
  subsystemCode?: string,
  gradeLevel?: string,
  courseName?: string,
  customSubjects?: SchoolSubject[],
  classSubjects?: CurriculumSubject[]
): CurriculumSubject[] {
  if (classSubjects && classSubjects.length > 0) {
    return classSubjects;
  }

  let baseSubjects: CurriculumSubject[] = OFFICIAL_CURRICULUM_PLANS[0].subjects;

  if (subsystemCode || gradeLevel) {
    // 1. Correspondência exacta (subsistema + classe + curso)
    const exactWithCourse = courseName
      ? OFFICIAL_CURRICULUM_PLANS.find(
          (p) =>
            p.subsystemCode === subsystemCode &&
            p.gradeLevel === gradeLevel &&
            p.courseName?.toLowerCase() === courseName.toLowerCase()
        )
      : undefined;

    if (exactWithCourse) {
      baseSubjects = exactWithCourse.subjects;
    } else {
      // 2. Correspondência exacta (subsistema + classe)
      const exactGrade = OFFICIAL_CURRICULUM_PLANS.find(
        (p) => p.subsystemCode === subsystemCode && p.gradeLevel === gradeLevel
      );
      if (exactGrade) {
        baseSubjects = exactGrade.subjects;
      } else {
        // 3. Correspondência por subsistema + curso
        const bySubAndCourse = courseName
          ? OFFICIAL_CURRICULUM_PLANS.find(
              (p) =>
                p.subsystemCode === subsystemCode &&
                p.courseName?.toLowerCase() === courseName.toLowerCase()
            )
          : undefined;
        if (bySubAndCourse) {
          baseSubjects = bySubAndCourse.subjects;
        } else if (subsystemCode === 'primario_geral') {
          const isUpperPrimary = gradeLevel && /^(5\.ª|6\.ª)/.test(gradeLevel);
          const priFallback = OFFICIAL_CURRICULUM_PLANS.find(
            (p) => p.id === (isUpperPrimary ? 'cur-pri-6' : 'cur-pri-4')
          );
          if (priFallback) baseSubjects = priFallback.subjects;
        } else if (subsystemCode === 'secundario_geral_1' || subsystemCode === 'tecnico_1') {
          const isNinth = gradeLevel && /^9\.ª/.test(gradeLevel);
          const sec1Fallback = OFFICIAL_CURRICULUM_PLANS.find(
            (p) => p.id === (isNinth ? 'cur-sec1-9' : 'cur-sec1-7')
          );
          if (sec1Fallback) baseSubjects = sec1Fallback.subjects;
        } else {
          const bySubsystem = OFFICIAL_CURRICULUM_PLANS.find(
            (p) => p.subsystemCode === subsystemCode
          );
          if (bySubsystem) baseSubjects = bySubsystem.subjects;
        }
      }
    }
  }

  if (!customSubjects || customSubjects.length === 0) {
    return baseSubjects;
  }

  const matchingCustom = customSubjects.filter((cs) => {
    if (cs.status !== 'activa') return false;
    if (subsystemCode && cs.subsystemCode !== subsystemCode) return false;
    const matchesGrade =
      !cs.gradeLevel ||
      cs.gradeLevel === 'Todas' ||
      !gradeLevel ||
      cs.gradeLevel.toLowerCase() === gradeLevel.toLowerCase();
    if (!matchesGrade) return false;
    if (cs.courseName && courseName) {
      return cs.courseName.toLowerCase() === courseName.toLowerCase();
    }
    return true;
  });

  if (matchingCustom.length === 0) {
    return baseSubjects;
  }

  const merged = [...baseSubjects];
  matchingCustom.forEach((cs) => {
    const existingIdx = merged.findIndex(
      (b) =>
        b.code.toLowerCase() === cs.code.toLowerCase() ||
        b.name.toLowerCase() === cs.name.toLowerCase()
    );
    if (existingIdx >= 0) {
      merged[existingIdx] = cs;
    } else {
      merged.push(cs);
    }
  });

  return merged;
}

/**
 * Arredonda uma nota por excesso (decimal >= 0.5) ou por defeito (decimal < 0.5)
 * para o número inteiro mais próximo (norma oficial MED Angola para MT1, MT2, MT3 e MFD).
 */
export function roundGradeExcessOrDefect(value?: number): number | undefined {
  if (value === undefined || isNaN(value)) return undefined;
  // Normaliza imprecisões de ponto flutuante (ex: 9.4999999999 -> 9.5)
  const normalized = Math.round(value * 1000) / 1000;
  return Math.floor(normalized + 0.5);
}

/**
 * Formata uma nota arredondada (MT1, MT2, MT3, MFD) para exibição sem casas decimais
 */
export function formatRoundedGrade(value?: number): string {
  if (value === undefined || isNaN(value)) return '--';
  const rounded = roundGradeExcessOrDefect(value);
  return rounded !== undefined ? String(rounded) : '--';
}

/**
 * Calcula a Média de Avaliação Contínua (MAC) a partir das três avaliações contínuas:
 * MAC = (AC1 + AC2 + AC3) / n
 */
export function calculateMAC(
  ac1?: number,
  ac2?: number,
  ac3?: number,
  fallbackMac?: number
): number | undefined {
  const valid = [ac1, ac2, ac3].filter((g): g is number => g !== undefined && !isNaN(g));
  if (valid.length === 0) {
    return fallbackMac !== undefined && !isNaN(fallbackMac) ? fallbackMac : undefined;
  }
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

/**
 * Calcula a Média Trimestral (MT):
 * MT = (MAC + NPT) / 2, arredondada por excesso (>= 0.5) ou por defeito (< 0.5)
 */
export function calculateTrimestralMT(
  mac?: number,
  npt?: number,
  legacyNpp?: number
): number | undefined {
  const valid: number[] = [];
  if (mac !== undefined && !isNaN(mac)) valid.push(mac);
  if (legacyNpp !== undefined && !isNaN(legacyNpp)) valid.push(legacyNpp);
  if (npt !== undefined && !isNaN(npt)) valid.push(npt);

  if (valid.length === 0) return undefined;
  const sum = valid.reduce((a, b) => a + b, 0);
  return roundGradeExcessOrDefect(sum / valid.length);
}

/**
 * Extrai e normaliza AC1, AC2, AC3, MAC, NPT e MT de um registo de nota trimestral
 * garantindo que MT esteja arredondada por excesso ou por defeito
 */
export function resolveGradeTrimestralComponents(rec?: GradeRecord): {
  ac1?: number;
  ac2?: number;
  ac3?: number;
  mac?: number;
  npt?: number;
  mt?: number;
} {
  if (!rec) return {};
  const ac1 = rec.ac1;
  const ac2 = rec.ac2;
  const ac3 = rec.ac3;
  const hasAnyAC = ac1 !== undefined || ac2 !== undefined || ac3 !== undefined;
  const mac = calculateMAC(ac1, ac2, ac3, rec.mac);
  const npt = rec.npt;
  const rawMt =
    rec.mt ??
    calculateTrimestralMT(mac, npt, hasAnyAC ? undefined : rec.npp);
  const mt = roundGradeExcessOrDefect(rawMt);

  return { ac1, ac2, ac3, mac, npt, mt };
}

/**
 * Alias de compatibilidade: calcula MT = (MAC + NPT) / 2 ou média com NPP legado
 */
export function calculateTrimestralAverage(mac?: number, npp?: number, npt?: number): number | undefined {
  return calculateTrimestralMT(mac, npt, npp);
}

/**
 * Calcula a Classificação Anual de Frequência (CAP / MFD) = (MT1 + MT2 + MT3) / n,
 * arredondada por excesso (>= 0.5) ou por defeito (< 0.5)
 */
export function calculateCAP(mt1?: number, mt2?: number, mt3?: number): number | undefined {
  const trimestrais = [mt1, mt2, mt3]
    .filter((g): g is number => g !== undefined && !isNaN(g))
    .map((g) => roundGradeExcessOrDefect(g) as number);
  if (trimestrais.length === 0) return undefined;
  const avg = trimestrais.reduce((a, b) => a + b, 0) / trimestrais.length;
  return roundGradeExcessOrDefect(avg);
}

/**
 * Calcula a Média Final Anual (MFD)
 * Se tem exame terminal (6ª, 9ª, 12ª, 13ª classe): MFD = (0.4 * CAP) + (0.6 * Exame)
 * Sem exame: MFD = CAP = (MT1 + MT2 + MT3) / 3
 * Arredondamento por excesso ou por defeito
 */
export function calculateFinalGrade(
  mt1?: number,
  mt2?: number,
  mt3?: number,
  examScore?: number,
  hasTerminalExam: boolean = false
): number | undefined {
  const cap = calculateCAP(mt1, mt2, mt3);
  if (cap === undefined) return undefined;

  if (hasTerminalExam && examScore !== undefined && !isNaN(examScore)) {
    return roundGradeExcessOrDefect(0.4 * cap + 0.6 * examScore);
  }

  return cap;
}

/**
 * Avalia o resultado com base no subsistema (0-10 no Primário; 0-20 do Secundário ao Superior)
 */
export function evaluateStudentResult(
  subsystemCode: string,
  finalGrade?: number,
  gradeLevel?: string
): EvaluationResult {
  if (subsystemCode === 'pre_escolar' || subsystemCode === 'centro_infantil') {
    return {
      isApproved: true,
      needsRecourse: false,
      statusLabel: 'Transita',
      scale: 'Qualitativa (Desenvolvimento Integral)'
    };
  }

  const cfg = getGradingScaleConfig(subsystemCode);
  const scaleText =
    subsystemCode === 'superior' ? '0 a 20 valores (Créditos ECTS)' : cfg.scaleLabel;

  if (finalGrade === undefined) {
    return {
      isApproved: false,
      needsRecourse: false,
      statusLabel: 'Pendente',
      scale: scaleText
    };
  }

  if (subsystemCode === 'superior') {
    if (finalGrade >= cfg.passingThreshold) {
      return {
        isApproved: true,
        needsRecourse: false,
        statusLabel: 'Aprovado',
        scale: scaleText
      };
    } else if (finalGrade >= cfg.recourseThreshold) {
      return {
        isApproved: false,
        needsRecourse: true,
        statusLabel: 'Recurso',
        scale: scaleText
      };
    } else {
      return {
        isApproved: false,
        needsRecourse: false,
        statusLabel: 'Reprovado',
        scale: scaleText
      };
    }
  }

  if (finalGrade >= cfg.passingThreshold) {
    return {
      isApproved: true,
      needsRecourse: false,
      statusLabel: 'Transita',
      scale: scaleText
    };
  } else if (finalGrade >= cfg.recourseThreshold) {
    return {
      isApproved: false,
      needsRecourse: true,
      statusLabel: 'Recurso',
      scale: scaleText
    };
  } else {
    return {
      isApproved: false,
      needsRecourse: false,
      statusLabel: 'Não Transita',
      scale: scaleText
    };
  }
}

/**
 * Calcula a Média Final Anual com suporte exclusivo a Exame Normal (EN) e Exame de Recurso (REC)
 * Ensino Geral/Adultos/Secundário (6ª, Módulo 3, Etapa 3, 9ª, 12ª): MF = 0.4 × CAP + 0.6 × Exame
 * Ensino Superior: MF = 0.5 × CAP + 0.5 × Exame
 */
export function calculateExamAndRecourseMF(
  cap: number | undefined,
  en: number | undefined,
  rec: number | undefined,
  subsystemCode: string,
  hasExamAndRecourse: boolean
): { mf?: number; mfAfterEN?: number; isEligibleForREC: boolean } {
  const roundedCap = roundGradeExcessOrDefect(cap);
  if (!hasExamAndRecourse) {
    return {
      mf: roundedCap,
      mfAfterEN: roundedCap,
      isEligibleForREC: false
    };
  }

  const threshold = getGradingScaleConfig(subsystemCode).passingThreshold;
  const capWeight = subsystemCode === 'superior' ? 0.5 : 0.4;
  const examWeight = subsystemCode === 'superior' ? 0.5 : 0.6;

  const combine = (base: number | undefined, exam: number): number => {
    if (base !== undefined && !isNaN(base)) {
      return roundGradeExcessOrDefect(capWeight * base + examWeight * exam) as number;
    }
    return roundGradeExcessOrDefect(exam) as number;
  };

  let mfAfterEN: number | undefined = roundedCap;
  if (en !== undefined && !isNaN(en)) {
    mfAfterEN = combine(roundedCap, en);
  }

  const isEligibleForREC = mfAfterEN === undefined || mfAfterEN < threshold;

  let mf = mfAfterEN;
  if (rec !== undefined && !isNaN(rec)) {
    mf = combine(roundedCap, rec);
  }

  return {
    mf,
    mfAfterEN,
    isEligibleForREC
  };
}

/**
 * Consolida os 3 trimestres + EN/REC (exclusivo para 6ª, Módulo 3, Etapa 3, 9ª, 12ª e Ensino Superior)
 */
export function computeAnnualSubjectSummary(
  studentSubjectGrades: GradeRecord[],
  subsystemCode: string,
  hasExamAndRecourse: boolean
): AnnualSubjectSummary {
  const g1 = studentSubjectGrades.find((g) => g.period === '1_trimestre');
  const g2 = studentSubjectGrades.find((g) => g.period === '2_trimestre');
  const g3 = studentSubjectGrades.find((g) => g.period === '3_trimestre');
  const gAnual = studentSubjectGrades.find((g) => g.period === 'anual');

  const mt1 = resolveGradeTrimestralComponents(g1).mt;
  const mt2 = resolveGradeTrimestralComponents(g2).mt;
  const mt3 = resolveGradeTrimestralComponents(g3).mt;

  const cap = calculateCAP(mt1, mt2, mt3) ?? roundGradeExcessOrDefect(gAnual?.mt);

  const en = hasExamAndRecourse ? (gAnual?.examNormal ?? gAnual?.examScore) : undefined;
  const rec = hasExamAndRecourse ? gAnual?.examRecourse : undefined;

  const calc = calculateExamAndRecourseMF(cap, en, rec, subsystemCode, hasExamAndRecourse);
  let mf = calc.mf;
  if (mf === undefined && gAnual?.finalGrade !== undefined && !hasExamAndRecourse) {
    mf = roundGradeExcessOrDefect(gAnual.finalGrade);
  }

  const evalRes = evaluateStudentResult(subsystemCode, mf);
  return {
    mt1,
    mt2,
    mt3,
    cap,
    en,
    rec,
    examScore: en,
    mf,
    hasExamAndRecourse,
    isApproved: evalRes.isApproved,
    needsRecourse: evalRes.needsRecourse,
    statusLabel: evalRes.statusLabel
  };
}

/**
 * Deliberação oficial do Conselho de Notas (MED Angola) para a Pauta Final da Turma
 */
export function evaluateAnnualCouncilDecision(
  subjectFinals: Array<{ mf?: number; isTerminalExam?: boolean }>,
  hasTerminalExam: boolean,
  subsystemCode: string
): CouncilDecisionResult {
  const totalSubjects = subjectFinals.length;

  if (subsystemCode === 'pre_escolar' || subsystemCode === 'centro_infantil') {
    return {
      positivesCount: totalSubjects,
      negativesCount: 0,
      evaluatedCount: totalSubjects,
      totalSubjects,
      decision: 'Transita'
    };
  }

  const evaluated = subjectFinals.filter((s) => s.mf !== undefined && !isNaN(s.mf));
  const evaluatedCount = evaluated.length;

  if (evaluatedCount === 0) {
    return {
      positivesCount: 0,
      negativesCount: 0,
      evaluatedCount: 0,
      totalSubjects,
      decision: 'Em Curso'
    };
  }

  const cfg = getGradingScaleConfig(subsystemCode);
  const threshold = cfg.passingThreshold;
  const sum = evaluated.reduce((acc, s) => acc + (s.mf || 0), 0);
  const overallAverage = Math.round((sum / evaluatedCount) * 10) / 10;

  const positivesCount = evaluated.filter((s) => (s.mf || 0) >= threshold).length;
  const negatives = evaluated.filter((s) => (s.mf || 0) < threshold);
  const negativesCount = negatives.length;

  let decision: CouncilDecisionResult['decision'] = 'Transita';

  if (negativesCount === 0) {
    decision = 'Transita';
  } else if (negativesCount <= 2 && negatives.every((s) => (s.mf || 0) >= cfg.recourseThreshold)) {
    decision = hasTerminalExam ? 'Admitido a Exame' : 'Recurso';
  } else {
    decision = 'Não Transita';
  }

  return {
    overallAverage,
    positivesCount,
    negativesCount,
    evaluatedCount,
    totalSubjects,
    decision
  };
}

/**
 * Gera o Quadro Estatístico Oficial M / F exigido nas Mini-Pautas e Pautas do MED Angola
 */
export function computeMedGenderStats(
  rows: Array<{ gender: 'M' | 'F'; isEvaluated: boolean; isPositive: boolean; isRecourse?: boolean }>
): MedGenderStats {
  const countMF = (list: typeof rows) => {
    const m = list.filter((r) => r.gender === 'M').length;
    const f = list.filter((r) => r.gender === 'F').length;
    return { m, f, total: m + f };
  };

  const matriculados = countMF(rows);
  const avaliadosList = rows.filter((r) => r.isEvaluated);
  const avaliados = countMF(avaliadosList);
  const positivas = countMF(avaliadosList.filter((r) => r.isPositive));
  const recurso = countMF(avaliadosList.filter((r) => !r.isPositive && r.isRecourse));
  const negativas = countMF(avaliadosList.filter((r) => !r.isPositive));

  const taxaAproveitamento =
    avaliados.total > 0 ? Math.round((positivas.total / avaliados.total) * 100) : 0;

  return {
    matriculados,
    avaliados,
    positivas,
    negativas,
    recurso,
    taxaAproveitamento
  };
}

/**
 * Classificação qualitativa complementar segundo a escala oficial (0-10 Primário ou 0-20 Secundário/Superior)
 */
export function getGradeQualitativeText(grade?: number, subsystemCode?: string): string {
  if (grade === undefined || isNaN(grade)) return 'Pendente';
  const cfg = getGradingScaleConfig(subsystemCode);
  if (grade >= cfg.veryGoodThreshold) return 'Muito Bom';
  if (grade >= cfg.goodThreshold) return 'Bom';
  if (grade >= cfg.passingThreshold) return 'Suficiente';
  if (grade >= cfg.recourseThreshold) return 'Insuficiente';
  return 'Mau';
}

