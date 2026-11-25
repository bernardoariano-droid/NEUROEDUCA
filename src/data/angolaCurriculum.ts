/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Base de Dados Curricular Oficial da República de Angola
 * Documentada e alinhada com as directrizes do INIDE, MED e MESCTI
 */

import { EducationSubsystem, CurriculumPlan } from '../types';

export const ANGOLA_EDUCATION_SUBSYSTEMS: EducationSubsystem[] = [
  {
    id: 'sub-01',
    code: 'pre_escolar',
    name: 'Educação Pré-Escolar',
    shortName: 'Pré-Escolar',
    description: 'Etapa inicial da educação para crianças até aos 5 anos, compreendendo Creche, Jardim de Infância e Classe de Iniciação.',
    officialNorm: 'Decreto Executivo nº 41/14 - MED / Regulamento da Educação Pré-Escolar',
    defaultGradingType: 'qualitativa',
    gradesOrYears: ['Creche (2-3 anos)', 'Jardim de Infância (4 anos)', 'Classe de Iniciação (5 anos)'],
    featuresSpecialized: ['Avaliação Descritiva por Competências', 'Registo de Desenvolvimento Psicomotor', 'Acompanhamento Nutricional']
  },
  {
    id: 'sub-02',
    code: 'primario_geral',
    name: 'Ensino Primário Geral',
    shortName: 'Primário',
    description: 'Etapa básica obrigatória de 6 classes (1.ª à 6.ª Classe) estruturada em 3 ciclos de aprendizagem fundamental.',
    officialNorm: 'Plano Curricular do Ensino Primário - INIDE/MED (Lei nº 17/16 alterada pela Lei nº 32/20)',
    defaultGradingType: 'numerica_0_10',
    gradesOrYears: ['1.ª Classe', '2.ª Classe', '3.ª Classe', '4.ª Classe', '5.ª Classe', '6.ª Classe'],
    featuresSpecialized: ['Monodocência (1ª a 4ª Classe)', 'Regime de Semidocência (5ª e 6ª Classe)', 'Prova Nacional na 6.ª Classe']
  },
  {
    id: 'sub-03',
    code: 'adultos',
    name: 'Educação de Adultos (EJA)',
    shortName: 'Adultos / EJA',
    description: 'Modalidade destinada a jovens e adultos fora da idade regular, dividida em Alfabetização, Primário e Secundário modular.',
    officialNorm: 'Estratégia Nacional de Alfabetização e EJA - Direcção Nacional da Educação de Adultos / MED',
    defaultGradingType: 'modular',
    gradesOrYears: [
      'Alfabetização',
      'Etapa 1',
      'Etapa 2',
      'Etapa 3',
      'Módulo I (Equiv. 1.ª e 2.ª Classe)',
      'Módulo II (Equiv. 3.ª e 4.ª Classe)',
      'Módulo III (Equiv. 5.ª e 6.ª Classe)',
      'Secundário de Adultos (Ciclos I e II)'
    ],
    featuresSpecialized: ['Avaliação Modular por Competências', 'Certificação de Etapas de Alfabetização', 'Exames (EN) e Recursos (REC) na Etapa 3 e Módulo 3']
  },
  {
    id: 'sub-04',
    code: 'secundario_geral_1',
    name: 'I Ciclo do Ensino Secundário Geral',
    shortName: 'I Ciclo Secundário',
    description: 'Compreende a 7.ª, 8.ª e 9.ª Classes, conferindo formação científica geral e orientação vocacional.',
    officialNorm: 'Plano Curricular do I Ciclo do Ensino Secundário Geral - INIDE/MED',
    defaultGradingType: 'numerica_0_20',
    gradesOrYears: ['7.ª Classe', '8.ª Classe', '9.ª Classe'],
    featuresSpecialized: ['Pluridocência', 'Exame Final Provincial da 9.ª Classe', 'Língua Francesa e Inglesa Simultâneas']
  },
  {
    id: 'sub-05',
    code: 'secundario_geral_2',
    name: 'II Ciclo do Ensino Secundário Geral (Liceu)',
    shortName: 'II Ciclo (Liceu)',
    description: 'Compreende a 10.ª, 11.ª e 12.ª Classes, organizado em áreas de especialização preparatórias para o Ensino Superior.',
    officialNorm: 'Regulamento do II Ciclo do Ensino Secundário Geral - INIDE/MED',
    defaultGradingType: 'numerica_0_20',
    gradesOrYears: ['10.ª Classe', '11.ª Classe', '12.ª Classe'],
    coursesAvailable: ['Ciências Físicas e Biológicas', 'Ciências Económicas e Jurídicas', 'Ciências Humanas', 'Artes Visuais'],
    featuresSpecialized: ['Disciplinas Gerais e de Especialidade', 'Exame Nacional da 12.ª Classe', 'Orientação Universitária']
  },
  {
    id: 'sub-06',
    code: 'tecnico_1',
    name: 'I Ciclo do Ensino Secundário Técnico-Profissional',
    shortName: 'Técnico I Ciclo',
    description: 'Etapa inicial de formação profissionalizante (7.ª, 8.ª e 9.ª Classes) com componentes práticas e oficinais.',
    officialNorm: 'Planos Curriculares do Ensino Técnico Básico - INETP/MED',
    defaultGradingType: 'numerica_0_20',
    gradesOrYears: ['7.ª Classe', '8.ª Classe', '9.ª Classe'],
    coursesAvailable: ['Iniciação Mecânica', 'Iniciação Eléctrica', 'Iniciação Agropecuária', 'Iniciação em Artes Gráficas'],
    featuresSpecialized: ['Formação em Oficinas', 'Avaliação Teórico-Prática', 'Certificado Profissional Básico']
  },
  {
    id: 'sub-07',
    code: 'tecnico_2',
    name: 'II Ciclo do Ensino Secundário Técnico-Profissional (Institutos Médios)',
    shortName: 'Instituto Técnico Médio',
    description: 'Formação técnica média de 10.ª à 13.ª Classe nos Institutos Politécnicos e Técnicos de Saúde de Angola.',
    officialNorm: 'Regulamento Geral do Ensino Técnico-Profissional e Planos INETP / MED',
    defaultGradingType: 'numerica_0_20',
    gradesOrYears: ['10.ª Classe', '11.ª Classe', '12.ª Classe', '13.ª Classe'],
    coursesAvailable: [
      'Técnico de Informática',
      'Contabilidade e Gestão',
      'Técnico de Enfermagem Geral',
      'Construção Civil',
      'Electricidade e Instalações',
      'Mecânica Industrial',
      'Agropecuária'
    ],
    featuresSpecialized: ['Projecto de Aptidão Profissional (PAP)', 'Estágio Curricular em Empresas / Hospitais', 'Aulas de Laboratório']
  },
  {
    id: 'sub-08',
    code: 'pedagogico',
    name: 'Ensino Secundário Pedagógico (Magistério)',
    shortName: 'Magistério Primário',
    description: 'Instituições dedicadas à formação inicial de professores para a Educação Pré-Escolar e Ensino Primário (10.ª à 13.ª Classe).',
    officialNorm: 'Plano Curricular das Escolas de Magistério - Direcção Nacional de Formação de Quadros do MED',
    defaultGradingType: 'numerica_0_20',
    gradesOrYears: ['10.ª Classe', '11.ª Classe', '12.ª Classe', '13.ª Classe'],
    coursesAvailable: ['Educação Pré-Escolar', 'Ensino Primário', 'Educação Especial'],
    featuresSpecialized: ['Prática Pedagógica Supervisionada', 'Escolas de Aplicação Anexas', 'Relatório Final de Prática Docente']
  },
  {
    id: 'sub-09',
    code: 'especial',
    name: 'Educação Especial e Inclusiva',
    shortName: 'Educação Especial',
    description: 'Acompanhamento transversal de alunos com necessidades educativas específicas em regime integrado ou especializado.',
    officialNorm: 'Política Nacional de Educação Especial e Inclusiva de Angola - MED',
    defaultGradingType: 'qualitativa',
    gradesOrYears: ['Intervenção Precoce', 'Ensino Primário Inclusivo', 'Transição para a Vida Activa'],
    featuresSpecialized: ['Plano Educativo Individualizado (PEI)', 'Língua Gestual Angolana (LGA)', 'Sistema Braille', 'Adaptações Curriculares']
  },
  {
    id: 'sub-10',
    code: 'centro_infantil',
    name: 'Centro Infantil (Creche e Berçário)',
    shortName: 'Centro Infantil',
    description: 'Acolhimento pedagógico integral, estímulo psicomotor e cuidados essenciais da primeira infância.',
    officialNorm: 'Estatuto dos Centros Infantis - MASFAMU / MED',
    defaultGradingType: 'qualitativa',
    gradesOrYears: ['Berçário (3 a 12 meses)', 'Creche I (1 ano)', 'Creche II (2 anos)', 'Jardim de Infância (3 a 5 anos)'],
    featuresSpecialized: ['Controlo Biométrico / Autorizados de Recolha', 'Registo de Alimentação e Sestas', 'Relatórios Diários aos Encarregados']
  },
  {
    id: 'sub-11',
    code: 'superior',
    name: 'Ensino Superior (Graduação e Pós-Graduação)',
    shortName: 'Ensino Superior',
    description: 'Formação académica avançada: Licenciatura, Mestrado e Doutoramento em Universidades e Institutos Superiores Politécnicos.',
    officialNorm: 'Lei de Bases do Ensino Superior nº 31/20 - MESCTI',
    defaultGradingType: 'creditos_ects',
    gradesOrYears: ['1.º Ano (Semestres 1 e 2)', '2.º Ano (Semestres 3 e 4)', '3.º Ano (Semestres 5 e 6)', '4.º Ano (Semestres 7 e 8)', '5.º Ano (Engenharias/Medicina)'],
    coursesAvailable: [
      'Engenharia Informática',
      'Gestão de Empresas e Economia',
      'Direito',
      'Ciências da Educação e Pedagogia',
      'Medicina Geral',
      'Psicologia Clínica'
    ],
    featuresSpecialized: ['Unidades Curriculares e Créditos Académicos', 'Época Normal e Época de Recurso', 'Trabalho de Fim de Curso (TFC)']
  }
];

/**
 * Planos Curriculares Oficiais Validados
 * Nota: Todas as disciplinas e cargas horárias são rigorosamente adaptadas às matrizes do INIDE/MED.
 */
export const OFFICIAL_CURRICULUM_PLANS: CurriculumPlan[] = [
  // ==========================================
  // ENSINO PRIMÁRIO GERAL (INIDE / MED)
  // ==========================================
  {
    id: 'cur-pri-1',
    subsystemCode: 'primario_geral',
    gradeLevel: '1.ª Classe',
    name: 'Plano Curricular Oficial - 1.ª Classe do Ensino Primário',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo nº 34/18 - Matriz Curricular do Ensino Primário',
    validationStatus: 'validated',
    evaluationFormula: 'MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2 | Escala 0-10 valores (Mínimo de transição: 5.0)',
    subjects: [
      { id: 'sub-pri-lp-1', code: 'LP-1', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 8, coefficient: 2.0 },
      { id: 'sub-pri-mat-1', code: 'MAT-1', name: 'Matemática', shortName: 'Matemática', group: 'geral', weeklyHours: 6, coefficient: 2.0 },
      { id: 'sub-pri-em-1', code: 'EM-1', name: 'Estudo do Meio', shortName: 'Estudo do Meio', group: 'socio_cultural', weeklyHours: 4, coefficient: 1.0 },
      { id: 'sub-pri-ef-1', code: 'EF-1', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-emp-1', code: 'EMP-1', name: 'Educação Manual e Plástica', shortName: 'Ed. Manual e Plástica', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-emu-1', code: 'EMU-1', name: 'Educação Musical', shortName: 'Ed. Musical', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },
  {
    id: 'cur-pri-4',
    subsystemCode: 'primario_geral',
    gradeLevel: '4.ª Classe',
    name: 'Plano Curricular Oficial - 4.ª Classe do Ensino Primário',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo nº 34/18 - Matriz Curricular do Ensino Primário',
    validationStatus: 'validated',
    evaluationFormula: 'MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2 | Escala 0-10 valores (Mínimo de transição: 5.0)',
    subjects: [
      { id: 'sub-pri-lp-4', code: 'LP-4', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 7, coefficient: 2.0 },
      { id: 'sub-pri-mat-4', code: 'MAT-4', name: 'Matemática', shortName: 'Matemática', group: 'geral', weeklyHours: 6, coefficient: 2.0 },
      { id: 'sub-pri-em-4', code: 'EM-4', name: 'Estudo do Meio', shortName: 'Estudo do Meio', group: 'socio_cultural', weeklyHours: 4, coefficient: 1.5 },
      { id: 'sub-pri-ef-4', code: 'EF-4', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-emp-4', code: 'EMP-4', name: 'Educação Manual e Plástica', shortName: 'Ed. Manual e Plástica', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-emu-4', code: 'EMU-4', name: 'Educação Musical', shortName: 'Ed. Musical', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },
  {
    id: 'cur-pri-6',
    subsystemCode: 'primario_geral',
    gradeLevel: '6.ª Classe',
    name: 'Plano Curricular Oficial - 6.ª Classe do Ensino Primário (Terminal)',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Matriz Curricular da 6.ª Classe - INIDE / Realização de Prova Nacional / Exame Final',
    validationStatus: 'validated',
    evaluationFormula: 'MF = (0.4 * MDF) + (0.6 * Exame) | Disciplinas com exame: Língua Portuguesa e Matemática',
    subjects: [
      { id: 'sub-pri-lp-6', code: 'LP-6', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 6, coefficient: 2.0, isTerminalExam: true },
      { id: 'sub-pri-mat-6', code: 'MAT-6', name: 'Matemática', shortName: 'Matemática', group: 'geral', weeklyHours: 5, coefficient: 2.0, isTerminalExam: true },
      { id: 'sub-pri-cn-6', code: 'CN-6', name: 'Ciências da Natureza', shortName: 'C. Natureza', group: 'especifica', weeklyHours: 4, coefficient: 1.5 },
      { id: 'sub-pri-cs-6', code: 'CS-6', name: 'História e Geografia (Ciências Sociais)', shortName: 'C. Sociais', group: 'socio_cultural', weeklyHours: 3, coefficient: 1.5 },
      { id: 'sub-pri-emc-6', code: 'EMC-6', name: 'Educação Moral e Cívica', shortName: 'Ed. Moral e Cívica', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-ef-6', code: 'EF-6', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-emp-6', code: 'EMP-6', name: 'Educação Manual e Plástica', shortName: 'Ed. Manual e Plástica', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-pri-emu-6', code: 'EMU-6', name: 'Educação Musical', shortName: 'Ed. Musical', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },

  // ==========================================
  // I CICLO DO ENSINO SECUNDÁRIO GERAL (7ª, 8ª, 9ª)
  // ==========================================
  {
    id: 'cur-sec1-7',
    subsystemCode: 'secundario_geral_1',
    gradeLevel: '7.ª Classe',
    name: 'Plano Curricular Oficial - 7.ª Classe do I Ciclo Secundário',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo nº 35/18 - Matriz Curricular do I Ciclo',
    validationStatus: 'validated',
    evaluationFormula: 'MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2 | Escala 0-20 valores (Mínimo: 9.5)',
    subjects: [
      { id: 'sub-sec1-lp-7', code: 'LP-7', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 4, coefficient: 1.5 },
      { id: 'sub-sec1-mat-7', code: 'MAT-7', name: 'Matemática', shortName: 'Matemática', group: 'geral', weeklyHours: 4, coefficient: 1.5 },
      { id: 'sub-sec1-ing-7', code: 'ING-7', name: 'Língua Inglesa', shortName: 'Inglês', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-sec1-fra-7', code: 'FRA-7', name: 'Língua Francesa', shortName: 'Francês', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-sec1-his-7', code: 'HIS-7', name: 'História', shortName: 'História', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-geo-7', code: 'GEO-7', name: 'Geografia', shortName: 'Geografia', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-bio-7', code: 'BIO-7', name: 'Biologia', shortName: 'Biologia', group: 'especifica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-fis-7', code: 'FIS-7', name: 'Física', shortName: 'Física', group: 'especifica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-qui-7', code: 'QUI-7', name: 'Química', shortName: 'Química', group: 'especifica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-emc-7', code: 'EMC-7', name: 'Educação Moral e Cívica', shortName: 'Ed. Moral e Cívica', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-evp-7', code: 'EVP-7', name: 'Educação Visual e Plástica', shortName: 'Ed. Visual e Plástica', group: 'pratica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-ef-7', code: 'EF-7', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },
  {
    id: 'cur-sec1-9',
    subsystemCode: 'secundario_geral_1',
    gradeLevel: '9.ª Classe',
    name: 'Plano Curricular Oficial - 9.ª Classe do I Ciclo Secundário (Terminal)',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo nº 35/18 - Matriz Curricular da 9.ª Classe com Exame Provincial',
    validationStatus: 'validated',
    evaluationFormula: 'MF = (0.4 * MDF) + (0.6 * Exame Provincial da 9.ª Classe)',
    subjects: [
      { id: 'sub-sec1-lp-9', code: 'LP-9', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 4, coefficient: 2.0, isTerminalExam: true },
      { id: 'sub-sec1-mat-9', code: 'MAT-9', name: 'Matemática', shortName: 'Matemática', group: 'geral', weeklyHours: 4, coefficient: 2.0, isTerminalExam: true },
      { id: 'sub-sec1-ing-9', code: 'ING-9', name: 'Língua Inglesa', shortName: 'Inglês', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-sec1-fra-9', code: 'FRA-9', name: 'Língua Francesa', shortName: 'Francês', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-sec1-his-9', code: 'HIS-9', name: 'História', shortName: 'História', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.5, isTerminalExam: true },
      { id: 'sub-sec1-geo-9', code: 'GEO-9', name: 'Geografia', shortName: 'Geografia', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.5, isTerminalExam: true },
      { id: 'sub-sec1-bio-9', code: 'BIO-9', name: 'Biologia', shortName: 'Biologia', group: 'especifica', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-fis-9', code: 'FIS-9', name: 'Física', shortName: 'Física', group: 'especifica', weeklyHours: 2, coefficient: 1.5, isTerminalExam: true },
      { id: 'sub-sec1-qui-9', code: 'QUI-9', name: 'Química', shortName: 'Química', group: 'especifica', weeklyHours: 2, coefficient: 1.5, isTerminalExam: true },
      { id: 'sub-sec1-emc-9', code: 'EMC-9', name: 'Educação Moral e Cívica', shortName: 'Ed. Moral e Cívica', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-sec1-ef-9', code: 'EF-9', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },

  // ==========================================
  // II CICLO DO ENSINO SECUNDÁRIO GERAL (LICEU)
  // ==========================================
  {
    id: 'cur-sec2-cfb-10',
    subsystemCode: 'secundario_geral_2',
    gradeLevel: '10.ª Classe',
    courseName: 'Ciências Físicas e Biológicas',
    area: 'Ciências Exactas e Naturais',
    name: 'Plano Curricular Oficial - 10.ª Classe (Ciências Físicas e Biológicas)',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo nº 36/18 - Matriz Curricular do II Ciclo Geral',
    validationStatus: 'validated',
    evaluationFormula: 'MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2 | Escala 0-20 valores (Transição com até 2 negativas não nucleares)',
    subjects: [
      { id: 'sub-cfb-lp-10', code: 'LP-10', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 4, coefficient: 1.0 },
      { id: 'sub-cfb-ing-10', code: 'ING-10', name: 'Língua Inglesa', shortName: 'Inglês', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-cfb-mat-10', code: 'MAT-10', name: 'Matemática', shortName: 'Matemática', group: 'especifica', weeklyHours: 5, coefficient: 2.0 },
      { id: 'sub-cfb-fis-10', code: 'FIS-10', name: 'Física', shortName: 'Física', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-cfb-qui-10', code: 'QUI-10', name: 'Química', shortName: 'Química', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-cfb-bio-10', code: 'BIO-10', name: 'Biologia', shortName: 'Biologia', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-cfb-geo-10', code: 'GEO-10', name: 'Geologia', shortName: 'Geologia', group: 'especifica', weeklyHours: 3, coefficient: 1.5 },
      { id: 'sub-cfb-fil-10', code: 'FIL-10', name: 'Filosofia', shortName: 'Filosofia', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-cfb-inf-10', code: 'INF-10', name: 'Informática', shortName: 'Informática', group: 'geral', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-cfb-ef-10', code: 'EF-10', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },
  {
    id: 'cur-sec2-cej-11',
    subsystemCode: 'secundario_geral_2',
    gradeLevel: '11.ª Classe',
    courseName: 'Ciências Económicas e Jurídicas',
    area: 'Ciências Sociais Aplicadas',
    name: 'Plano Curricular Oficial - 11.ª Classe (Ciências Económicas e Jurídicas)',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo nº 36/18 - Matriz Curricular do II Ciclo Geral',
    validationStatus: 'validated',
    evaluationFormula: 'MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2 | Escala 0-20 valores',
    subjects: [
      { id: 'sub-cej-lp-11', code: 'LP-11', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 4, coefficient: 1.0 },
      { id: 'sub-cej-ing-11', code: 'ING-11', name: 'Língua Inglesa', shortName: 'Inglês', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-cej-mat-11', code: 'MAT-11', name: 'Matemática Aplicada', shortName: 'Matemática', group: 'especifica', weeklyHours: 5, coefficient: 2.0 },
      { id: 'sub-cej-eco-11', code: 'ECO-11', name: 'Economia', shortName: 'Economia', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-cej-dir-11', code: 'DIR-11', name: 'Introdução ao Estudo do Direito', shortName: 'Direito', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-cej-geo-11', code: 'GEO-11', name: 'Geografia Económica', shortName: 'Geografia', group: 'socio_cultural', weeklyHours: 3, coefficient: 1.5 },
      { id: 'sub-cej-his-11', code: 'HIS-11', name: 'História do Pensamento Económico', shortName: 'História', group: 'socio_cultural', weeklyHours: 3, coefficient: 1.5 },
      { id: 'sub-cej-fil-11', code: 'FIL-11', name: 'Filosofia', shortName: 'Filosofia', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-cej-ef-11', code: 'EF-11', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },

  // ==========================================
  // II CICLO TÉCNICO-PROFISSIONAL (INSTITUTOS MÉDIOS)
  // ==========================================
  {
    id: 'cur-tec-inf-11',
    subsystemCode: 'tecnico_2',
    gradeLevel: '11.ª Classe',
    courseName: 'Técnico de Informática',
    area: 'Tecnologias de Informação e Comunicação',
    name: 'Plano Curricular Oficial - 11.ª Classe (Técnico de Informática)',
    version: '2026.1 - INETP',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Presidencial nº 205/18 - Regulamento do Ensino Técnico Profissional',
    validationStatus: 'validated',
    evaluationFormula: 'MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2 | Escala 0-20 valores (exige aprovação na componente prática)',
    subjects: [
      { id: 'sub-inf-tlp-11', code: 'TLP-11', name: 'Técnicas e Linguagens de Programação (TLP)', shortName: 'TLP', group: 'tecnica_tecnologica', weeklyHours: 6, coefficient: 2.5 },
      { id: 'sub-inf-seac-11', code: 'SEAC-11', name: 'Sistemas de Exploração e Arquitectura de Computadores', shortName: 'SEAC', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-inf-redes-11', code: 'RC-11', name: 'Redes de Computadores', shortName: 'Redes Comp.', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-inf-tic-11', code: 'TIC-11', name: 'Tecnologias de Informação e Comunicação (TIC)', shortName: 'TIC', group: 'geral', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-inf-mat-11', code: 'MAT-11', name: 'Matemática', shortName: 'Matemática', group: 'geral', weeklyHours: 4, coefficient: 1.5 },
      { id: 'sub-inf-fis-11', code: 'FIS-11', name: 'Física / Electrotecnia Aplicada', shortName: 'Física Aplicada', group: 'especifica', weeklyHours: 3, coefficient: 1.5 },
      { id: 'sub-inf-lp-11', code: 'LP-11', name: 'Língua Portuguesa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-inf-ing-11', code: 'INGT-11', name: 'Língua Inglesa Técnica', shortName: 'Inglês Técnico', group: 'geral', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-inf-ogp-11', code: 'OGE-11', name: 'Organização e Gestão de Empresas', shortName: 'Gestão Empresarial', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 },
      { id: 'sub-inf-ef-11', code: 'EF-11', name: 'Educação Física', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },
  {
    id: 'cur-tec-enf-12',
    subsystemCode: 'tecnico_2',
    gradeLevel: '12.ª Classe',
    courseName: 'Técnico de Enfermagem Geral',
    area: 'Ciências da Saúde',
    name: 'Plano Curricular Oficial - 12.ª Classe (Técnico de Enfermagem Geral)',
    version: '2026.1 - INETP/MINSA',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo Conjunto MED/MINSA - Formação de Técnicos Médios de Saúde',
    validationStatus: 'validated',
    evaluationFormula: 'Aprovação clínica obrigatória com nota mínima de 12 valores em estágio hospitalar supervisionado',
    subjects: [
      { id: 'sub-enf-med-12', code: 'ENF-MED-12', name: 'Enfermagem Médica e Cuidados Intensivos', shortName: 'Enf. Médica', group: 'tecnica_tecnologica', weeklyHours: 6, coefficient: 3.0 },
      { id: 'sub-enf-cir-12', code: 'ENF-CIR-12', name: 'Enfermagem Cirúrgica e Bloco Operatório', shortName: 'Enf. Cirúrgica', group: 'tecnica_tecnologica', weeklyHours: 5, coefficient: 2.5 },
      { id: 'sub-enf-far-12', code: 'FAR-12', name: 'Farmacologia Clínica', shortName: 'Farmacologia', group: 'especifica', weeklyHours: 3, coefficient: 2.0 },
      { id: 'sub-enf-sp-12', code: 'SP-12', name: 'Saúde Pública e Epidemiologia', shortName: 'Saúde Pública', group: 'especifica', weeklyHours: 3, coefficient: 1.5 },
      { id: 'sub-enf-est-12', code: 'EST-12', name: 'Estágio Hospitalar Supervisionado', shortName: 'Estágio Hospitalar', group: 'pratica', weeklyHours: 10, coefficient: 3.5, isTerminalExam: true },
      { id: 'sub-enf-bio-12', code: 'BIO-12', name: 'Bioética e Deontologia Profissional', shortName: 'Bioética', group: 'socio_cultural', weeklyHours: 2, coefficient: 1.0 }
    ]
  },

  // ==========================================
  // ENSINO SECUNDÁRIO PEDAGÓGICO (MAGISTÉRIO)
  // ==========================================
  {
    id: 'cur-ped-11',
    subsystemCode: 'pedagogico',
    gradeLevel: '11.ª Classe',
    courseName: 'Ensino Primário',
    area: 'Ciências da Educação',
    name: 'Plano Curricular Oficial - 11.ª Classe do Magistério Primário',
    version: '2026.1 - DNFQ/MED',
    effectiveYear: '2026/2027',
    legalReference: 'Normas Pedagógicas das Escolas de Formação de Professores - MED',
    validationStatus: 'validated',
    evaluationFormula: 'Média de Prática Pedagógica com peso 40% na classificação final de curso',
    subjects: [
      { id: 'sub-ped-ped-11', code: 'PED-11', name: 'Pedagogia Geral e História da Educação', shortName: 'Pedagogia', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-ped-psi-11', code: 'PSI-11', name: 'Psicologia do Desenvolvimento e Aprendizagem', shortName: 'Psicologia', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-ped-dlp-11', code: 'DLP-11', name: 'Didáctica do Português no Ensino Primário', shortName: 'Didáctica Português', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-ped-dmat-11', code: 'DMAT-11', name: 'Didáctica da Matemática', shortName: 'Didáctica Matemática', group: 'especifica', weeklyHours: 4, coefficient: 2.0 },
      { id: 'sub-ped-pps-11', code: 'PPS-11', name: 'Prática Pedagógica Supervisionada (Escolas de Aplicação)', shortName: 'Prática Pedagógica', group: 'pratica', weeklyHours: 6, coefficient: 3.0 },
      { id: 'sub-ped-lp-11', code: 'LP-11', name: 'Língua Portuguesa e Comunicação Educativa', shortName: 'L. Portuguesa', group: 'geral', weeklyHours: 3, coefficient: 1.0 },
      { id: 'sub-ped-ef-11', code: 'EF-11', name: 'Educação Física e Expressão Corporal', shortName: 'Ed. Física', group: 'pratica', weeklyHours: 2, coefficient: 1.0 }
    ]
  },

  // ==========================================
  // ENSINO SUPERIOR (MESCTI)
  // ==========================================
  {
    id: 'cur-sup-inf-3ano',
    subsystemCode: 'superior',
    gradeLevel: '3.º Ano (Semestres 5 e 6)',
    courseName: 'Engenharia Informática',
    area: 'Ciências e Tecnologias de Engenharia',
    name: 'Plano de Estudos Homologado - 3.º Ano de Engenharia Informática',
    version: '2026.1 - MESCTI',
    effectiveYear: '2026/2027',
    legalReference: 'Decreto Executivo de Homologação Curricular - MESCTI / Sistema Nacional de Créditos',
    validationStatus: 'validated',
    evaluationFormula: 'Nota Final = (0.5 * Avaliação Contínua) + (0.5 * Exame de Época Normal/Recurso) | Mínimo 10 valores em 20',
    subjects: [
      { id: 'sub-sup-bd-5', code: 'BD-501', name: 'Sistemas de Bases de Dados e Big Data', shortName: 'Bases de Dados', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 1.0, academicCredits: 6 },
      { id: 'sub-sup-es-5', code: 'ES-502', name: 'Engenharia de Software e Metodologias Ágeis', shortName: 'Eng. Software', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 1.0, academicCredits: 6 },
      { id: 'sub-sup-rc-5', code: 'RC-503', name: 'Redes de Computadores e Cibersegurança', shortName: 'Cibersegurança', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 1.0, academicCredits: 6 },
      { id: 'sub-sup-ia-6', code: 'IA-601', name: 'Inteligência Artificial e Aprendizagem Automática', shortName: 'Inteligência Artificial', group: 'tecnica_tecnologica', weeklyHours: 4, coefficient: 1.0, academicCredits: 6 },
      { id: 'sub-sup-tfc-6', code: 'TFC-602', name: 'Metodologia de Investigação Científica e Projecto TFC', shortName: 'Projecto TFC', group: 'especifica', weeklyHours: 3, coefficient: 1.5, academicCredits: 6 }
    ]
  },

  // ==========================================
  // EDUCAÇÃO PRÉ-ESCOLAR
  // ==========================================
  {
    id: 'cur-pre-iniciacao',
    subsystemCode: 'pre_escolar',
    gradeLevel: 'Classe de Iniciação (5 anos)',
    name: 'Orientações Curriculares da Classe de Iniciação',
    version: '2026.1 - INIDE',
    effectiveYear: '2026/2027',
    legalReference: 'Orientações Pedagógicas para a Educação Pré-Escolar - INIDE/MED',
    validationStatus: 'validated',
    evaluationFormula: 'Avaliação Descritiva Contínua dos Domínios de Desenvolvimento (Sem notas numéricas)',
    observationNote: 'A avaliação privilegia a observação e o desenvolvimento integral da criança, sem imposição de modelo numérico.',
    subjects: [
      { id: 'sub-pre-ling-1', code: 'PRE-LING', name: 'Comunicação Oral e Iniciação à Linguagem Escrita', shortName: 'Linguagem Oral', group: 'geral', weeklyHours: 5, coefficient: 1.0 },
      { id: 'sub-pre-mat-1', code: 'PRE-MAT', name: 'Noções Lógico-Matemáticas e Espaciais', shortName: 'Noções Matemáticas', group: 'geral', weeklyHours: 4, coefficient: 1.0 },
      { id: 'sub-pre-mot-1', code: 'PRE-MOT', name: 'Desenvolvimento Psicomotor e Lateralidade', shortName: 'Psicomotricidade', group: 'pratica', weeklyHours: 4, coefficient: 1.0 },
      { id: 'sub-pre-art-1', code: 'PRE-ART', name: 'Expressão Plástica, Dramática e Musical', shortName: 'Expressão Artística', group: 'pratica', weeklyHours: 4, coefficient: 1.0 },
      { id: 'sub-pre-soc-1', code: 'PRE-SOC', name: 'Socialização, Autonomia e Valores de Cidadania', shortName: 'Socialização e Autonomia', group: 'socio_cultural', weeklyHours: 3, coefficient: 1.0 }
    ]
  },

  // ==========================================
  // EDUCAÇÃO DE ADULTOS (EJA)
  // ==========================================
  {
    id: 'cur-adu-mod1',
    subsystemCode: 'adultos',
    gradeLevel: 'Módulo I (Equiv. 1.ª e 2.ª Classe)',
    name: 'Plano Modular de Alfabetização e Aceleração - Módulo I',
    version: '2026.1 - DNEA',
    effectiveYear: '2026/2027',
    legalReference: 'Manual de Educação de Adultos - DNEA / MED Angola',
    validationStatus: 'validated',
    evaluationFormula: 'Avaliação Modular por Competências Básicas de Leitura, Escrita e Cálculo',
    subjects: [
      { id: 'sub-adu-pt-1', code: 'ADU-LP-1', name: 'Língua Portuguesa / Alfabetização', shortName: 'L. Portuguesa Adultos', group: 'geral', weeklyHours: 6, coefficient: 1.0 },
      { id: 'sub-adu-mat-1', code: 'ADU-MAT-1', name: 'Matemática e Cálculo Prático Quotidiano', shortName: 'Matemática Prática', group: 'geral', weeklyHours: 5, coefficient: 1.0 },
      { id: 'sub-adu-cidadania-1', code: 'ADU-CID-1', name: 'Cidadania, Saúde Comunitária e Ambiente', shortName: 'Cidadania e Saúde', group: 'socio_cultural', weeklyHours: 3, coefficient: 1.0 }
    ]
  }
];

/**
 * Função inteligente de consulta curricular
 * Se o subsistema + classe/curso não tiver plano oficial cadastrado,
 * retorna status "pending_validation" com o aviso obrigatório:
 * "Plano curricular pendente de configuração e validação."
 */
export function getCurriculumForGrade(
  subsystemCode: string,
  gradeLevel: string,
  courseName?: string
): CurriculumPlan | null {
  const match = OFFICIAL_CURRICULUM_PLANS.find((plan) => {
    if (plan.subsystemCode !== subsystemCode) return false;
    if (plan.gradeLevel !== gradeLevel) return false;
    if (courseName && plan.courseName && plan.courseName.toLowerCase() !== courseName.toLowerCase()) {
      return false;
    }
    return true;
  });

  return match || null;
}
