/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Emissor Oficial de Documentos Escolares com Código QR de Autenticidade
 * República de Angola: Declaração de Matrícula, Boletim de Notas MED, Declaração com Notas, Recibos e Certificados
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  Calendar,
  FolderOpen,
  BookOpen,
  Layers
} from 'lucide-react';
import {
  Institution,
  Student,
  Invoice,
  GradeRecord,
  UserProfile,
  UserRole,
  SchoolSubject,
  ClassRoom,
  EducationSubsystemCode
} from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS } from '../../data/angolaCurriculum';
import { formatAngolaDate, formatKwanza } from '../../utils/currency';
import {
  resolveSubjectsForClass,
  computeAnnualSubjectSummary,
  evaluateAnnualCouncilDecision,
  isExamAndRecourseEligible,
  getGradeQualitativeText,
  getGradingScaleConfig,
  resolveGradeTrimestralComponents,
  formatRoundedGrade
} from '../../utils/evaluationEngine';
import { QrCodeView } from '../common/QrCodeView';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import { DocumentExportBar } from '../common/DocumentExportBar';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';
import { resolveAuthorizedStudentsForUser } from '../../utils/studentAccess';

interface DocumentCenterProps {
  currentInstitution: Institution;
  students: Student[];
  classes?: ClassRoom[];
  invoices: Invoice[];
  grades: GradeRecord[];
  initialStudent?: Student;
  initialDocType?: string;
  initialPeriod?: '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual';
  currentUser?: UserProfile | null;
  activeRole?: UserRole;
  navigationKey?: number;
  customSubjects?: SchoolSubject[];
}

export const DocumentCenter: React.FC<DocumentCenterProps> = ({
  currentInstitution,
  students,
  classes = [],
  invoices,
  grades,
  initialStudent,
  initialDocType,
  initialPeriod,
  currentUser,
  activeRole,
  navigationKey,
  customSubjects = []
}) => {
  const isStudentMode =
    currentUser?.role === 'aluno' ||
    currentUser?.role === 'encarregado_educacao' ||
    activeRole === 'aluno' ||
    activeRole === 'encarregado_educacao';

  const isGuardianMode =
    (activeRole || currentUser?.role) === 'encarregado_educacao';

  const instStudents = students.filter((s) => s.institutionId === currentInstitution.id);
  const instClasses = classes.filter((c) => c.institutionId === currentInstitution.id);

  const authorizedStudentPortalList = useMemo(() => {
    if (!isStudentMode) return [];
    return resolveAuthorizedStudentsForUser(
      students,
      currentInstitution.id,
      currentUser,
      activeRole
    );
  }, [isStudentMode, students, currentInstitution.id, currentUser, activeRole]);

  const visibleStudents = isStudentMode ? authorizedStudentPortalList : instStudents;

  const seedStudent = isStudentMode
    ? (initialStudent && authorizedStudentPortalList.some((s) => s.id === initialStudent.id)
        ? initialStudent
        : authorizedStudentPortalList[0])
    : initialStudent || visibleStudents[0];

  const [selectedSubsystemCode, setSelectedSubsystemCode] = useState<string>(
    seedStudent?.subsystemCode || (!isStudentMode ? instClasses[0]?.subsystemCode || '' : '')
  );
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>(
    seedStudent?.gradeLevel || (!isStudentMode ? instClasses[0]?.gradeLevel || '' : '')
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    seedStudent?.classId || (!isStudentMode ? instClasses[0]?.id || '' : '')
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    seedStudent?.id || ''
  );

  const [documentType, setDocumentType] = useState<
    'declaracao_matricula' | 'declaracao_notas' | 'boletim_trimestral' | 'recibo_propina' | 'certificado'
  >((initialDocType as any) || 'declaracao_matricula');

  const [selectedPeriod, setSelectedPeriod] = useState<
    '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual'
  >(initialPeriod || 'anual');

  const [purpose, setPurpose] = useState('Efeitos de Emprego, Passaporte e Segurança Social');
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStudentMode) {
      const target =
        (initialStudent && authorizedStudentPortalList.find((s) => s.id === initialStudent.id)) ||
        authorizedStudentPortalList.find((s) => s.id === selectedStudentId) ||
        authorizedStudentPortalList[0];
      if (target) {
        setSelectedSubsystemCode(target.subsystemCode);
        setSelectedGradeLevel(target.gradeLevel);
        setSelectedClassId(target.classId);
        setSelectedStudentId(target.id);
      } else {
        setSelectedSubsystemCode('');
        setSelectedGradeLevel('');
        setSelectedClassId('');
        setSelectedStudentId('');
      }
    } else if (initialStudent?.id) {
      setSelectedSubsystemCode(initialStudent.subsystemCode);
      setSelectedGradeLevel(initialStudent.gradeLevel);
      setSelectedClassId(initialStudent.classId);
      setSelectedStudentId(initialStudent.id);
    }
    if (initialDocType) {
      setDocumentType(initialDocType as any);
    }
    if (initialPeriod) {
      setSelectedPeriod(initialPeriod);
    }
  }, [
    initialStudent,
    initialDocType,
    initialPeriod,
    navigationKey,
    isStudentMode,
    authorizedStudentPortalList,
    selectedStudentId
  ]);

  const cascadeStudents = useMemo(
    () =>
      visibleStudents.filter(
        (s) =>
          (!selectedSubsystemCode || s.subsystemCode === selectedSubsystemCode) &&
          (!selectedGradeLevel || s.gradeLevel === selectedGradeLevel) &&
          (!selectedClassId || s.classId === selectedClassId)
      ),
    [visibleStudents, selectedSubsystemCode, selectedGradeLevel, selectedClassId]
  );

  const activeStudent = isStudentMode
    ? (isGuardianMode
        ? authorizedStudentPortalList.find((s) => s.id === selectedStudentId) ||
          authorizedStudentPortalList[0]
        : authorizedStudentPortalList[0])
    : cascadeStudents.find((s) => s.id === selectedStudentId) ||
      cascadeStudents[0] ||
      visibleStudents.find((s) => s.id === selectedStudentId) ||
      visibleStudents[0];

  const officialSubjects = useMemo(() => {
    if (!activeStudent) return [];
    const studentClass = classes.find((c) => c.id === activeStudent.classId);
    return resolveSubjectsForClass(
      activeStudent.subsystemCode,
      activeStudent.gradeLevel,
      activeStudent.courseName,
      customSubjects,
      studentClass?.subjects
    );
  }, [activeStudent, classes, customSubjects]);

  const studentGrades = useMemo(() => {
    if (!activeStudent) return [];
    return grades.filter((g) => g.studentId === activeStudent.id);
  }, [grades, activeStudent]);

  const hasExamAndRecourse = activeStudent
    ? isExamAndRecourseEligible(activeStudent.subsystemCode, activeStudent.gradeLevel)
    : false;
  const scaleConfig = getGradingScaleConfig(activeStudent?.subsystemCode);
  const passingThreshold = scaleConfig.passingThreshold;
  const recourseThreshold = scaleConfig.recourseThreshold;

  const consolidatedRows = useMemo(() => {
    if (!activeStudent) return [];
    return officialSubjects.map((sub) => {
      const subGrades = studentGrades.filter(
        (g) =>
          g.subjectId === sub.id ||
          g.subjectName.toLowerCase() === sub.name.toLowerCase()
      );
      const t1 = resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '1_trimestre'));
      const t2 = resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '2_trimestre'));
      const t3 = resolveGradeTrimestralComponents(subGrades.find((g) => g.period === '3_trimestre'));
      const periodRec = subGrades.find((g) => g.period === selectedPeriod);
      const periodComp = resolveGradeTrimestralComponents(periodRec);
      const annual = computeAnnualSubjectSummary(
        subGrades,
        activeStudent.subsystemCode,
        hasExamAndRecourse
      );
      return {
        subject: sub,
        periodRec,
        periodComp,
        periodMt: periodComp.mt,
        trimesters: {
          '1_trimestre': t1,
          '2_trimestre': t2,
          '3_trimestre': t3
        },
        annual
      };
    });
  }, [officialSubjects, studentGrades, activeStudent, selectedPeriod, hasExamAndRecourse]);

  const pautaCouncilDecision = useMemo(() => {
    if (!activeStudent) {
      return {
        overallAverage: undefined,
        positivesCount: 0,
        negativesCount: 0,
        evaluatedCount: 0,
        totalSubjects: 0,
        decision: 'Em Curso' as const
      };
    }
    return evaluateAnnualCouncilDecision(
      consolidatedRows.map((r) => ({
        mf: r.annual.mf,
        isTerminalExam: r.subject.isTerminalExam
      })),
      hasExamAndRecourse,
      activeStudent.subsystemCode
    );
  }, [consolidatedRows, activeStudent, hasExamAndRecourse]);

  const councilDecision = useMemo(() => {
    if (!activeStudent) {
      return {
        overallAverage: undefined,
        positivesCount: 0,
        negativesCount: 0,
        evaluatedCount: 0,
        totalSubjects: 0,
        decision: 'Em Curso' as const
      };
    }
    if (selectedPeriod === 'anual') {
      return pautaCouncilDecision;
    }
    const items = consolidatedRows.map((r) => ({
      mf: r.periodMt,
      isTerminalExam: r.subject.isTerminalExam
    }));
    return evaluateAnnualCouncilDecision(
      items,
      false,
      activeStudent.subsystemCode
    );
  }, [consolidatedRows, activeStudent, selectedPeriod, pautaCouncilDecision]);

  const docSubsystemOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const codes = Array.from(new Set(visibleStudents.map((s) => s.subsystemCode)));
    return codes.map((code) => {
      const meta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === code);
      const count = visibleStudents.filter((s) => s.subsystemCode === code).length;
      return {
        value: code,
        label: meta?.name || code,
        description: `${count} estudante(s) matriculado(s)`,
        group: '1.º Passo · Subsistemas de Ensino',
        badge: meta?.shortName || code,
        badgeTone: 'emerald'
      };
    });
  }, [visibleStudents]);

  const docGradeOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const subStudents = visibleStudents.filter(
      (s) => !selectedSubsystemCode || s.subsystemCode === selectedSubsystemCode
    );
    const gradesList = Array.from(new Set(subStudents.map((s) => s.gradeLevel)));
    return gradesList.map((gr) => {
      const count = subStudents.filter((s) => s.gradeLevel === gr).length;
      const eligible = isExamAndRecourseEligible(
        (selectedSubsystemCode as EducationSubsystemCode) || subStudents[0]?.subsystemCode,
        gr
      );
      return {
        value: gr,
        label: gr,
        description: `${count} estudante(s) neste nível`,
        group: '2.º Passo · Classes / Anos',
        badge: eligible ? 'EN / REC' : 'Trimestral',
        badgeTone: eligible ? 'amber' : 'emerald'
      };
    });
  }, [visibleStudents, selectedSubsystemCode]);

  const docClassOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const filteredClasses = instClasses.filter(
      (c) =>
        (!selectedSubsystemCode || c.subsystemCode === selectedSubsystemCode) &&
        (!selectedGradeLevel || c.gradeLevel === selectedGradeLevel)
    );
    return filteredClasses.map((cls) => {
      const count = visibleStudents.filter((s) => s.classId === cls.id).length;
      return {
        value: cls.id,
        label: `${cls.name} (${cls.code})`,
        description: `Sala ${cls.room} · Turno ${cls.shift} · ${count} aluno(s)`,
        group: '3.º Passo · Turmas',
        badge: `${count} Alunos`,
        badgeTone: 'emerald'
      };
    });
  }, [instClasses, visibleStudents, selectedSubsystemCode, selectedGradeLevel]);

  const studentDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      cascadeStudents.map((s) => {
        const eligible = isExamAndRecourseEligible(s.subsystemCode, s.gradeLevel);
        return {
          value: s.id,
          label: s.fullName,
          description: `Proc. ${s.processNumber} · ${s.gradeLevel} (${s.className})`,
          group: eligible
            ? '4.º Passo · Alunos com Exames (EN) & Recurso (REC)'
            : '4.º Passo · Alunos em Regime Trimestral',
          badge: eligible ? 'EN / REC' : s.gradeLevel,
          badgeTone: eligible ? 'amber' : 'blue'
        };
      }),
    [cascadeStudents]
  );

  const docTypeDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'declaracao_matricula',
        label: 'Declaração de Matrícula',
        description: 'Comprovativo oficial de frequência lectiva',
        group: 'Declarações & Registo Académico',
        badge: 'Matrícula',
        badgeTone: 'emerald'
      },
      {
        value: 'boletim_trimestral',
        label: 'Boletim de Notas (MED Angola)',
        description: hasExamAndRecourse
          ? 'Pauta individual com MT1–MT3, CAP, EN, REC e MF'
          : 'Pauta individual com MT1–MT3, CAP e MF',
        group: 'Avaliações & Aproveitamento',
        badge: hasExamAndRecourse ? 'EN / REC' : 'Notas',
        badgeTone: hasExamAndRecourse ? 'amber' : 'blue'
      },
      {
        value: 'declaracao_notas',
        label: 'Declaração com Discriminação de Notas',
        description: 'Documento formal com médias por extenso',
        group: 'Avaliações & Aproveitamento',
        badge: 'Oficial',
        badgeTone: 'emerald'
      },
      {
        value: 'certificado',
        label: 'Certificado de Habilitações Literárias',
        description: 'Documento final de conclusão de ciclo/classe',
        group: 'Certificação & Finanças',
        badge: 'Certificado',
        badgeTone: 'purple'
      },
      {
        value: 'recibo_propina',
        label: 'Recibo Oficial de Propinas',
        description: 'Comprovativo financeiro de liquidação de propina',
        group: 'Certificação & Finanças',
        badge: 'Financeiro',
        badgeTone: 'slate'
      }
    ],
    [hasExamAndRecourse]
  );

  const periodDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'anual',
        label: hasExamAndRecourse
          ? 'Anual Consolidado (1.º–3.º Trim. + EN/REC)'
          : 'Anual Consolidado (1.º–3.º Trim.)',
        description: hasExamAndRecourse
          ? 'Inclui épocas exclusivas EN e REC'
          : 'Média CAP sem exame final',
        group: 'Consolidação Anual',
        badge: hasExamAndRecourse ? 'EN / REC' : 'Anual',
        badgeTone: hasExamAndRecourse ? 'amber' : 'emerald'
      },
      {
        value: '1_trimestre',
        label: '1.º Trimestre Lectivo',
        description: 'AC1, AC2, AC3, MAC, NPT e MT1',
        group: 'Períodos Trimestrais',
        badge: '1.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: '2_trimestre',
        label: '2.º Trimestre Lectivo',
        description: 'AC1, AC2, AC3, MAC, NPT e MT2',
        group: 'Períodos Trimestrais',
        badge: '2.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: '3_trimestre',
        label: '3.º Trimestre Lectivo',
        description: 'AC1, AC2, AC3, MAC, NPT e MT3',
        group: 'Períodos Trimestrais',
        badge: '3.º Trim.',
        badgeTone: 'emerald'
      }
    ],
    [hasExamAndRecourse]
  );

  const studentInvoices = invoices.filter(
    (i) => i.studentId === activeStudent?.id && i.status === 'pago'
  );
  const latestPaidInvoice = studentInvoices[0];

  const docNumber = `DOC-AO/${new Date().getFullYear()}/${activeStudent?.processNumber.replace('/', '-') || '001'}`;
  const verificationCode = `VERIF-AO-${Math.abs(docNumber.split('').reduce((a, b) => a + b.charCodeAt(0), 0) * 1337).toString(16).toUpperCase()}`;
  const qrVerificationUrl = `https://neuroeduca.gov.ao/verificar?doc=${docNumber}&hash=${verificationCode}`;

  const exportFilename = `${documentType}_${activeStudent?.processNumber || 'Documento'}`;

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#dce7df] print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Centro de Documentos, Boletins e Certificados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conformidade Oficial MED / INIDE · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        <DocumentExportBar
          targetRef={documentRef}
          filename={exportFilename}
          documentTitle={`Documento Oficial - ${activeStudent?.fullName || 'NEUROEDUCA'}`}
          defaultFormat="A4"
          defaultOrientation="portrait"
        />
      </div>

      {/* 2. AS 4 CAIXAS MÉTRICAS (Estilo Executivo Emerald) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Modelos Oficiais</p>
            <div className="font-display text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-tight mt-0.5">
              5 Modelos
            </div>
            <p className="text-[11px] text-[#067836] font-semibold mt-0.5 truncate">
              Boletim, Notas, Matrícula e Recibos
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Validação Antifraude</p>
            <div className="font-display text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-tight mt-0.5">
              QR Code
            </div>
            <p className="text-[11px] text-[#067836] font-semibold mt-0.5 truncate">
              Hash Criptográfico Único
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Estudante em Emissão</p>
            <div className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 truncate leading-tight mt-0.5">
              {activeStudent?.fullName.split(' ')[0]} {activeStudent?.fullName.split(' ').slice(-1)[0]}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate tabular-nums">
              Processo: {activeStudent?.processNumber}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">Conformidade Legal</p>
            <div className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight mt-0.5">
              Angola MED
            </div>
            <p className="text-[11px] text-[#067836] font-semibold mt-0.5 truncate">
              República de Angola
            </p>
          </div>
        </div>
      </div>

      {/* 3. PESQUISA EM CASCATA E EMISSÃO DO DOCUMENTO (SUBSISTEMA -> CLASSE -> TURMA -> ALUNO -> DOCUMENTOS) */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] print:hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl">
          <span className="text-xs font-bold tracking-wide">
            Pesquisa em Cascata: Subsistema → Classe → Turma → Aluno → Documento Oficial
          </span>
          <span className="text-[11px] text-emerald-100 font-semibold">
            {hasExamAndRecourse
              ? `Regime EN / REC Activo (${activeStudent?.gradeLevel})`
              : 'Validação Instantânea com QR Code'}
          </span>
        </div>

        {/* Linha 1: Cascata 1. Subsistema -> 2. Classe -> 3. Turma -> 4. Aluno */}
        <div className="p-4 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <FunctionalDropdownFilter
            label="1. Subsistema de Ensino:"
            value={activeStudent?.subsystemCode || selectedSubsystemCode}
            onChange={(val) => {
              setSelectedSubsystemCode(val);
              const firstStu = visibleStudents.find((s) => s.subsystemCode === val);
              setSelectedGradeLevel(firstStu?.gradeLevel || '');
              setSelectedClassId(firstStu?.classId || '');
              setSelectedStudentId(firstStu?.id || '');
            }}
            options={docSubsystemOptions}
            disabled={isStudentMode}
            icon={<BookOpen className="w-4 h-4 text-[#067836]" />}
            placeholder="Seleccionar subsistema..."
            searchable
          />

          <FunctionalDropdownFilter
            label="2. Classe / Ano:"
            value={activeStudent?.gradeLevel || selectedGradeLevel}
            onChange={(val) => {
              setSelectedGradeLevel(val);
              const firstStu = visibleStudents.find(
                (s) =>
                  (!selectedSubsystemCode || s.subsystemCode === selectedSubsystemCode) &&
                  s.gradeLevel === val
              );
              setSelectedClassId(firstStu?.classId || '');
              setSelectedStudentId(firstStu?.id || '');
            }}
            options={docGradeOptions}
            disabled={isStudentMode || !selectedSubsystemCode}
            icon={<GraduationCap className="w-4 h-4 text-[#16a34a]" />}
            placeholder="Seleccionar classe..."
            searchable
          />

          <FunctionalDropdownFilter
            label="3. Turma:"
            value={activeStudent?.classId || selectedClassId}
            onChange={(val) => {
              setSelectedClassId(val);
              const firstStu = visibleStudents.find((s) => s.classId === val);
              setSelectedStudentId(firstStu?.id || '');
            }}
            options={docClassOptions}
            disabled={isStudentMode || !selectedGradeLevel}
            icon={<Layers className="w-4 h-4 text-[#067836]" />}
            placeholder="Seleccionar turma..."
            searchable
          />

          <FunctionalDropdownFilter
            label="4. Aluno:"
            value={activeStudent?.id || selectedStudentId}
            onChange={(val) => setSelectedStudentId(val)}
            options={studentDropdownOptions}
            disabled={
              (isStudentMode && (!isGuardianMode || authorizedStudentPortalList.length <= 1)) ||
              cascadeStudents.length === 0
            }
            icon={<GraduationCap className="w-4 h-4 text-[#16a34a]" />}
            placeholder="Seleccionar aluno..."
            searchable={!isStudentMode}
          />
        </div>

        {/* Linha 2: 5.º Passo — Filtro Suspenso de Boletins e Outros Documentos */}
        <div className="px-4 pb-4 pt-3 border-t border-[#dce7df] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-[#f7fbf8] rounded-b-2xl">
          <FunctionalDropdownFilter
            label="5A. Filtro Suspenso (Boletins & Outros Documentos):"
            value={documentType}
            onChange={(val) => setDocumentType(val as any)}
            options={docTypeDropdownOptions}
            icon={<FolderOpen className="w-4 h-4 text-[#067836]" />}
            placeholder="Seleccionar documento..."
          />

          <FunctionalDropdownFilter
            label="5B. Período / Trimestre:"
            value={selectedPeriod}
            onChange={(val) => setSelectedPeriod(val as any)}
            options={periodDropdownOptions}
            disabled={documentType === 'declaracao_matricula' || documentType === 'recibo_propina'}
            icon={<Calendar className="w-4 h-4 text-[#f5a623]" />}
            placeholder="Seleccionar período..."
          />

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1">
              5C. Finalidade do Documento:
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ex: Efeitos Militares, Trabalho, Matrícula"
              className="w-full min-h-[42px] bg-white text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW */}
      <div
        ref={documentRef}
        className="official-document-sheet bg-white rounded-2xl border border-slate-300 shadow-xl p-6 sm:p-14 max-w-4xl mx-auto text-black print:shadow-none print:border-none print:p-0"
      >
        {/* Cabeçalho Oficial Centralizado e Editável */}
        <div className="text-center pb-5 border-b-2 border-slate-900">
          <OfficialDocumentHeader
            institution={currentInstitution}
            insigniaClassName="h-14 sm:h-16 w-auto object-contain mx-auto"
          />
        </div>

        {/* Título do Documento */}
        <div className="text-center my-6 sm:my-8">
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide border-b-2 border-slate-900 inline-block px-4 pb-1">
            {documentType === 'declaracao_matricula' && 'DECLARAÇÃO DE MATRÍCULA'}
            {documentType === 'boletim_trimestral' &&
              (selectedPeriod === 'anual'
                ? 'BOLETIM INDIVIDUAL DE NOTAS DO ALUNO (MED)'
                : `BOLETIM DE NOTAS · ${selectedPeriod.replace('_trimestre', '.º TRIMESTRE').toUpperCase()}`)}
            {documentType === 'declaracao_notas' && 'DECLARAÇÃO COM DISCRIMINAÇÃO DE NOTAS'}
            {documentType === 'recibo_propina' && 'RECIBO OFICIAL DE PAGAMENTO'}
            {documentType === 'certificado' && 'CERTIFICADO DE HABILITAÇÕES LITERÁRIAS'}
          </h3>
          <div className="text-xs font-mono text-slate-500 mt-1">
            N.º {docNumber}
          </div>
        </div>

        {/* CORPO DO DOCUMENTO */}
        {activeStudent ? (
          <div className="space-y-6 text-sm leading-relaxed text-slate-800 text-justify">
            {documentType === 'declaracao_matricula' && (
              <>
                <p>
                  Para os devidos efeitos e a pedido do(a) interessado(a), declara-se que{' '}
                  <strong className="text-slate-950 font-bold uppercase">
                    {activeStudent.fullName}
                  </strong>
                  , {activeStudent.gender === 'M' ? 'filho' : 'filha'} de{' '}
                  <strong>{activeStudent.fatherName || 'Pai não declarado'}</strong> e de{' '}
                  <strong>{activeStudent.motherName || 'Mãe não declarada'}</strong>, nascido(a) aos{' '}
                  <strong>{formatAngolaDate(activeStudent.birthDate)}</strong>, natural do Município de{' '}
                  <strong>{activeStudent.birthMunicipality}</strong>, Província de{' '}
                  <strong>{activeStudent.birthProvince}</strong>, portador(a) do Bilhete de Identidade n.º{' '}
                  <strong className="font-mono">{activeStudent.identityCardNumber || 'Constante do Processo'}</strong>,
                  está devidamente matriculado(a) nesta instituição de ensino no Ano Lectivo de{' '}
                  <strong>{activeStudent.academicYear}</strong>, sob o Número de Processo{' '}
                  <strong className="font-mono">{activeStudent.processNumber}</strong>, a frequentar a{' '}
                  <strong>{activeStudent.gradeLevel}</strong>
                  {activeStudent.courseName ? ` do curso de ${activeStudent.courseName}` : ''}, na Turma{' '}
                  <strong>{activeStudent.className}</strong>, no Turno da{' '}
                  <strong>{activeStudent.shift}</strong>.
                </p>

                <p>
                  Por ser verdade e ter sido expressamente solicitada para{' '}
                  <strong>{purpose || 'os fins convenientes'}</strong>, passou-se a presente declaração que
                  vai devidamente assinada pelo Director Geral e autenticada com o carimbo a óleo em uso
                  nesta instituição.
                </p>
              </>
            )}

            {documentType === 'boletim_trimestral' && (
              <>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-left">
                  <div>Aluno(a): <strong className="uppercase">{activeStudent.fullName}</strong></div>
                  <div>N.º Processo: <strong className="font-mono">{activeStudent.processNumber}</strong></div>
                  <div>Classe / Curso: <strong>{activeStudent.gradeLevel}{activeStudent.courseName ? ` · ${activeStudent.courseName}` : ''}</strong></div>
                  <div>Turma / Turno: <strong>{activeStudent.className} ({activeStudent.shift})</strong></div>
                  <div>Encarregado(a): <strong>{activeStudent.guardianName}</strong></div>
                  <div>Ano Lectivo: <strong>{activeStudent.academicYear}</strong></div>
                </div>

                <div className="mb-3 px-3 py-1.5 bg-sky-50/70 border border-sky-200 rounded text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2 text-left">
                  <span>
                    <strong>Escala Oficial MED:</strong> {scaleConfig.scaleLabel} (Aprovação ≥ {passingThreshold.toFixed(1)} Val.)
                  </span>
                  <span className="font-mono text-slate-600">
                    MAC = (AC1 + AC2 + AC3) / 3 · MT = (MAC + NPT) / 2
                  </span>
                </div>

                <div className="overflow-x-auto space-y-5">
                  {/* Quadro da Pauta (MT1, MT2, MT3, EXAME(EN), RECURSO(REC), MFD) SEMPRE visível com notas das Mini-Pautas */}
                  <div className="space-y-1.5 text-left">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {hasExamAndRecourse
                          ? 'Resumo Oficial da Pauta (MT1, MT2, MT3, EXAME (EN), RECURSO (REC), MFD)'
                          : 'Resumo Oficial da Pauta (MT1, MT2, MT3, MFD)'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 normal-case">
                        Notas MT provenientes das Mini-Pautas
                      </span>
                    </div>
                    <table className="w-full text-left text-xs border border-slate-400 border-collapse tabular-nums">
                      <thead className="bg-slate-100 font-bold border-b border-slate-400">
                        <tr>
                          <th className="p-2 border-r border-slate-300">Disciplina Oficial (INIDE)</th>
                          <th className="p-2 text-center border-r border-slate-300">MT1</th>
                          <th className="p-2 text-center border-r border-slate-300">MT2</th>
                          <th className="p-2 text-center border-r border-slate-300">MT3</th>
                          {hasExamAndRecourse && (
                            <>
                              <th className="p-2 text-center border-r border-slate-300 bg-sky-50 text-sky-900">EXAME (EN)</th>
                              <th className="p-2 text-center border-r border-slate-300 bg-amber-50 text-amber-900">RECURSO (REC)</th>
                            </>
                          )}
                          <th className="p-2 text-center border-r border-slate-300 bg-sky-50 font-black">MFD</th>
                          <th className="p-2 text-center">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {consolidatedRows.map(({ subject, annual }) => (
                          <tr key={`pauta-${subject.id}`}>
                            <td className="p-2 font-bold border-r border-slate-300">{subject.name}</td>
                            <td className={`p-2 text-center border-r border-slate-300 font-mono ${annual.mt1 === undefined ? 'text-slate-400 font-normal' : annual.mt1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                              {formatRoundedGrade(annual.mt1)}
                            </td>
                            <td className={`p-2 text-center border-r border-slate-300 font-mono ${annual.mt2 === undefined ? 'text-slate-400 font-normal' : annual.mt2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                              {formatRoundedGrade(annual.mt2)}
                            </td>
                            <td className={`p-2 text-center border-r border-slate-300 font-mono ${annual.mt3 === undefined ? 'text-slate-400 font-normal' : annual.mt3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                              {formatRoundedGrade(annual.mt3)}
                            </td>
                            {hasExamAndRecourse && (
                              <>
                                <td className={`p-2 text-center border-r border-slate-300 font-mono bg-sky-50/30 ${annual.en === undefined ? 'text-slate-400 font-normal' : annual.en < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                                  {annual.en !== undefined ? annual.en.toFixed(1) : '--'}
                                </td>
                                <td className={`p-2 text-center border-r border-slate-300 font-mono bg-amber-50/30 ${annual.rec === undefined ? 'text-slate-400 font-normal' : annual.rec < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-bold'}`}>
                                  {annual.rec !== undefined ? annual.rec.toFixed(1) : '--'}
                                </td>
                              </>
                            )}
                            <td className={`p-2 text-center border-r border-slate-300 font-mono font-black ${annual.mf === undefined ? 'text-slate-400 font-normal' : annual.mf < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                              {formatRoundedGrade(annual.mf)}
                            </td>
                            <td className={`p-2 text-center font-bold text-[11px] ${annual.mf === undefined ? 'text-slate-400 font-normal' : annual.isApproved ? 'text-black' : annual.needsRecourse ? 'text-amber-700' : 'text-red-600'}`}>
                              {annual.statusLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-black border-t-2 border-slate-400">
                        <tr>
                          <td colSpan={hasExamAndRecourse ? 6 : 4} className="p-2 text-right uppercase">Média Geral (MFD) / Deliberação MED:</td>
                          <td className={`p-2 text-center font-mono ${pautaCouncilDecision.overallAverage === undefined ? 'text-slate-400' : pautaCouncilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                            {pautaCouncilDecision.overallAverage !== undefined ? pautaCouncilDecision.overallAverage.toFixed(1) : '--'}
                          </td>
                          <td className={`p-2 text-center text-[11px] uppercase ${pautaCouncilDecision.decision === 'Transita' ? 'text-black' : pautaCouncilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>
                            {pautaCouncilDecision.decision}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {selectedPeriod === 'anual' ? (
                    <div className="space-y-3 text-left">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1">
                        Detalhamento das Mini-Pautas por Trimestre (AC1, AC2, AC3, MAC, NPT e MT)
                      </div>
                      {(['1_trimestre', '2_trimestre', '3_trimestre'] as const).map((trimKey) => {
                        const trimLabel = trimKey.replace('_trimestre', '.º Trimestre');
                        return (
                          <div key={trimKey} className="border border-slate-300 rounded overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase text-slate-800 border-b border-slate-300">
                              {trimLabel}
                            </div>
                            <table className="w-full text-left text-[11px] border-collapse tabular-nums">
                              <thead className="bg-slate-50 font-bold border-b border-slate-300">
                                <tr>
                                  <th className="p-1.5 border-r border-slate-200">Disciplina</th>
                                  <th className="p-1.5 text-center border-r border-slate-200">AC1</th>
                                  <th className="p-1.5 text-center border-r border-slate-200">AC2</th>
                                  <th className="p-1.5 text-center border-r border-slate-200">AC3</th>
                                  <th className="p-1.5 text-center border-r border-slate-200 bg-sky-50/70">MAC</th>
                                  <th className="p-1.5 text-center border-r border-slate-200">NPT</th>
                                  <th className="p-1.5 text-center border-r border-slate-200 bg-slate-100 font-black">MT</th>
                                  <th className="p-1.5 text-center">Situação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {consolidatedRows.map(({ subject, trimesters }) => {
                                  const t = trimesters[trimKey];
                                  return (
                                    <tr key={subject.id}>
                                      <td className="p-1.5 font-semibold border-r border-slate-200">{subject.name}</td>
                                      <td className={`p-1.5 text-center border-r border-slate-200 font-mono ${t.ac1 === undefined ? 'text-slate-400' : t.ac1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac1 !== undefined ? t.ac1.toFixed(1) : '--'}</td>
                                      <td className={`p-1.5 text-center border-r border-slate-200 font-mono ${t.ac2 === undefined ? 'text-slate-400' : t.ac2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac2 !== undefined ? t.ac2.toFixed(1) : '--'}</td>
                                      <td className={`p-1.5 text-center border-r border-slate-200 font-mono ${t.ac3 === undefined ? 'text-slate-400' : t.ac3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.ac3 !== undefined ? t.ac3.toFixed(1) : '--'}</td>
                                      <td className={`p-1.5 text-center border-r border-slate-200 font-mono font-bold bg-sky-50/40 ${t.mac === undefined ? 'text-slate-400 font-normal' : t.mac < passingThreshold ? 'text-red-600' : 'text-black'}`}>{t.mac !== undefined ? t.mac.toFixed(1) : '--'}</td>
                                      <td className={`p-1.5 text-center border-r border-slate-200 font-mono ${t.npt === undefined ? 'text-slate-400' : t.npt < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{t.npt !== undefined ? t.npt.toFixed(1) : '--'}</td>
                                      <td className={`p-1.5 text-center border-r border-slate-200 font-mono font-black bg-slate-50 ${t.mt === undefined ? 'text-slate-400 font-normal' : t.mt < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                                        {formatRoundedGrade(t.mt)}
                                      </td>
                                      <td className={`p-1.5 text-center font-bold ${t.mt === undefined ? 'text-slate-400 font-normal' : t.mt >= passingThreshold ? 'text-black' : t.mt >= recourseThreshold ? 'text-amber-700' : 'text-red-600'}`}>
                                        {t.mt === undefined ? 'Pendente' : t.mt >= passingThreshold ? 'Positiva' : t.mt >= recourseThreshold ? 'Recurso' : 'Negativa'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-left">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-300 pb-1">
                        Detalhe da Mini-Pauta · {selectedPeriod.replace('_trimestre', '.º Trimestre')} (AC1, AC2, AC3, MAC, NPT e MT)
                      </div>
                      <table className="w-full text-left text-xs border border-slate-400 border-collapse tabular-nums">
                        <thead className="bg-slate-100 font-bold border-b border-slate-400">
                          <tr>
                            <th className="p-2 border-r border-slate-300">Disciplina Oficial (INIDE)</th>
                            <th className="p-2 text-center border-r border-slate-300">AC1</th>
                            <th className="p-2 text-center border-r border-slate-300">AC2</th>
                            <th className="p-2 text-center border-r border-slate-300">AC3</th>
                            <th className="p-2 text-center border-r border-slate-300 bg-sky-50">MAC</th>
                            <th className="p-2 text-center border-r border-slate-300">NPT</th>
                            <th className="p-2 text-center border-r border-slate-300 bg-slate-200 font-black">MT</th>
                            <th className="p-2 text-center">Classificação MED</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {consolidatedRows.map(({ subject, periodComp, periodMt }) => (
                            <tr key={subject.id}>
                              <td className="p-2 font-bold border-r border-slate-300">{subject.name}</td>
                              <td className={`p-2 text-center border-r border-slate-300 font-mono ${periodComp.ac1 === undefined ? 'text-slate-400' : periodComp.ac1 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{periodComp.ac1 !== undefined ? periodComp.ac1.toFixed(1) : '--'}</td>
                              <td className={`p-2 text-center border-r border-slate-300 font-mono ${periodComp.ac2 === undefined ? 'text-slate-400' : periodComp.ac2 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{periodComp.ac2 !== undefined ? periodComp.ac2.toFixed(1) : '--'}</td>
                              <td className={`p-2 text-center border-r border-slate-300 font-mono ${periodComp.ac3 === undefined ? 'text-slate-400' : periodComp.ac3 < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{periodComp.ac3 !== undefined ? periodComp.ac3.toFixed(1) : '--'}</td>
                              <td className={`p-2 text-center border-r border-slate-300 font-mono font-bold bg-sky-50/50 ${periodComp.mac === undefined ? 'text-slate-400 font-normal' : periodComp.mac < passingThreshold ? 'text-red-600' : 'text-black'}`}>{periodComp.mac !== undefined ? periodComp.mac.toFixed(1) : '--'}</td>
                              <td className={`p-2 text-center border-r border-slate-300 font-mono ${periodComp.npt === undefined ? 'text-slate-400' : periodComp.npt < passingThreshold ? 'text-red-600 font-bold' : 'text-black font-semibold'}`}>{periodComp.npt !== undefined ? periodComp.npt.toFixed(1) : '--'}</td>
                              <td className={`p-2 text-center border-r border-slate-300 font-mono font-black text-sm bg-slate-50 ${periodMt === undefined ? 'text-slate-400 font-normal' : periodMt < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                                {formatRoundedGrade(periodMt)}
                              </td>
                              <td className={`p-2 text-center font-bold text-[11px] ${periodMt === undefined ? 'text-slate-400 font-normal' : periodMt >= passingThreshold ? 'text-black' : periodMt >= recourseThreshold ? 'text-amber-700' : 'text-red-600'}`}>
                                {periodMt === undefined ? 'Pendente' : periodMt >= passingThreshold ? 'Positiva (Transita)' : periodMt >= recourseThreshold ? 'Recurso' : 'Negativa'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black border-t-2 border-slate-400">
                          <tr>
                            <td colSpan={6} className="p-2 text-right uppercase">Média Geral do Trimestre:</td>
                            <td className={`p-2 text-center font-mono ${councilDecision.overallAverage === undefined ? 'text-slate-400' : councilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                              {councilDecision.overallAverage !== undefined ? councilDecision.overallAverage.toFixed(1) : '--'}
                            </td>
                            <td className={`p-2 text-center text-[11px] uppercase ${councilDecision.decision === 'Transita' ? 'text-black' : councilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>{councilDecision.decision}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs text-left">
                  <strong>Assiduidade &amp; Deliberação:</strong> Assiduidade regular (96.8% de presenças). Positivas:{' '}
                  <strong>{councilDecision.positivesCount}</strong> · Negativas: <strong className={councilDecision.negativesCount > 0 ? 'text-red-600' : 'text-black'}>{councilDecision.negativesCount}</strong> · Situação:{' '}
                  <strong className={`uppercase ${councilDecision.decision === 'Transita' ? 'text-black' : councilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>{councilDecision.decision}</strong>.
                </div>
              </>
            )}

            {documentType === 'declaracao_notas' && (
              <>
                <p>
                  A Direcção do(a) <strong>{currentInstitution.name}</strong> declara, para os devidos efeitos legais e a pedido do(a) interessado(a), que{' '}
                  <strong className="uppercase">{activeStudent.fullName}</strong>, {activeStudent.gender === 'M' ? 'filho' : 'filha'} de{' '}
                  <strong>{activeStudent.fatherName || 'Pai não declarado'}</strong> e de{' '}
                  <strong>{activeStudent.motherName || 'Mãe não declarada'}</strong>, nascido(a) aos{' '}
                  <strong>{formatAngolaDate(activeStudent.birthDate)}</strong>, portador(a) do B.I. n.º{' '}
                  <strong className="font-mono">{activeStudent.identityCardNumber || 'Constante do Processo'}</strong>, matriculado(a) sob o Processo n.º{' '}
                  <strong className="font-mono">{activeStudent.processNumber}</strong>, obteve na{' '}
                  <strong>{activeStudent.gradeLevel}</strong>{activeStudent.courseName ? ` (${activeStudent.courseName})` : ''}, no Ano Lectivo de{' '}
                  <strong>{activeStudent.academicYear}</strong>, as seguintes classificações constantes dos livros oficiais de pauta:
                </p>

                <table className="w-full text-left text-xs border border-slate-400 border-collapse tabular-nums">
                  <thead className="bg-slate-100 font-bold border-b border-slate-400">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Disciplina Curricular (INIDE)</th>
                      <th className="p-2 text-center border-r border-slate-300">
                        Classificação ({scaleConfig.maxScale === 10 ? '0–10' : '0–20'})
                      </th>
                      <th className="p-2 text-center border-r border-slate-300">Por Extenso / Menção MED</th>
                      <th className="p-2 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {consolidatedRows.map(({ subject, annual, periodMt }) => {
                      const val = selectedPeriod === 'anual' ? annual.mf : periodMt;
                      return (
                        <tr key={subject.id}>
                          <td className="p-2 font-bold border-r border-slate-300">{subject.name}</td>
                          <td className={`p-2 text-center border-r border-slate-300 font-mono font-black ${val === undefined ? 'text-slate-400 font-normal' : val < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                            {val !== undefined ? `${formatRoundedGrade(val)} Valores` : 'Em Curso'}
                          </td>
                          <td className="p-2 text-center border-r border-slate-300">
                            {getGradeQualitativeText(val, activeStudent.subsystemCode)}
                          </td>
                          <td className={`p-2 text-center font-bold ${val === undefined ? 'text-slate-400 font-normal' : val >= passingThreshold ? 'text-black' : 'text-red-600'}`}>
                            {val === undefined ? 'Pendente' : val >= passingThreshold ? 'Aprovado' : 'Não Aprovado'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black border-t-2 border-slate-400">
                    <tr>
                      <td className="p-2 uppercase">Média Final Global / Deliberação:</td>
                      <td className={`p-2 text-center font-mono ${councilDecision.overallAverage === undefined ? 'text-slate-400' : councilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                        {councilDecision.overallAverage !== undefined ? `${councilDecision.overallAverage.toFixed(1)} Valores` : '--'}
                      </td>
                      <td className="p-2 text-center">{getGradeQualitativeText(councilDecision.overallAverage, activeStudent.subsystemCode)}</td>
                      <td className={`p-2 text-center uppercase ${councilDecision.decision === 'Transita' ? 'text-black' : councilDecision.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>{councilDecision.decision}</td>
                    </tr>
                  </tfoot>
                </table>

                <p>
                  Por ser verdade e me haver sido solicitada para <strong>{purpose || 'fins convenientes'}</strong>,
                  passa-se a presente Declaração com Discriminação de Notas, assinada e autenticada com o carimbo em uso neste estabelecimento de ensino.
                </p>
              </>
            )}

            {documentType === 'certificado' && (
              <>
                <div className="border-2 border-slate-800 p-5 rounded-lg bg-slate-50/40 space-y-4">
                  <p>
                    Em conformidade com as disposições da Lei de Bases do Sistema de Educação e Ensino da República de Angola (Lei n.º 17/16 alterada pela Lei n.º 32/20) e demais normas do Ministério da Educação (MED), certifica-se que{' '}
                    <strong className="uppercase text-slate-950">{activeStudent.fullName}</strong>,{' '}
                    {activeStudent.gender === 'M' ? 'filho' : 'filha'} de{' '}
                    <strong>{activeStudent.fatherName || 'Pai não declarado'}</strong> e de{' '}
                    <strong>{activeStudent.motherName || 'Mãe não declarada'}</strong>, nascido(a) aos{' '}
                    <strong>{formatAngolaDate(activeStudent.birthDate)}</strong>, natural de{' '}
                    <strong>{activeStudent.birthMunicipality}</strong>, Província de{' '}
                    <strong>{activeStudent.birthProvince}</strong>, portador(a) do Bilhete de Identidade n.º{' '}
                    <strong className="font-mono">{activeStudent.identityCardNumber || 'Constante do Processo'}</strong>,
                    concluiu com aproveitamento o plano curricular da{' '}
                    <strong>{activeStudent.gradeLevel}</strong>
                    {activeStudent.courseName ? ` na especialidade de ${activeStudent.courseName}` : ''}, no Ano Lectivo de{' '}
                    <strong>{activeStudent.academicYear}</strong>, conforme os registos de Pauta Final e o Livro de Termos desta instituição.
                  </p>

                  <table className="w-full text-left text-xs border border-slate-400 border-collapse tabular-nums bg-white">
                    <thead className="bg-slate-200 font-bold border-b border-slate-400">
                      <tr>
                        <th className="p-2 border-r border-slate-300">Disciplina do Plano Curricular</th>
                        <th className="p-2 text-center border-r border-slate-300">Carga Horária</th>
                        <th className="p-2 text-center border-r border-slate-300">Classificação Final</th>
                        <th className="p-2 text-center">Qualificação MED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {consolidatedRows.map(({ subject, annual }) => (
                        <tr key={subject.id}>
                          <td className="p-2 font-bold border-r border-slate-300">{subject.name}</td>
                          <td className="p-2 text-center border-r border-slate-300 font-mono">{subject.weeklyHours}h/sem</td>
                          <td className={`p-2 text-center border-r border-slate-300 font-mono font-black ${annual.mf === undefined ? 'text-slate-400 font-normal' : annual.mf < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                            {annual.mf !== undefined ? `${formatRoundedGrade(annual.mf)} Val.` : '--'}
                          </td>
                          <td className="p-2 text-center font-semibold">{getGradeQualitativeText(annual.mf, activeStudent.subsystemCode)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="text-xs font-semibold text-slate-800">
                    Média Final de Conclusão:{' '}
                    <strong className={`font-mono text-sm ${councilDecision.overallAverage !== undefined && councilDecision.overallAverage < passingThreshold ? 'text-red-600' : 'text-black'}`}>
                      {councilDecision.overallAverage !== undefined ? `${councilDecision.overallAverage.toFixed(1)} Valores` : 'Em Apuramento'}
                    </strong>{' '}
                    ({getGradeQualitativeText(councilDecision.overallAverage, activeStudent.subsystemCode)}) · Deliberação:{' '}
                    <strong className="uppercase">{councilDecision.decision}</strong>.
                  </p>
                </div>
              </>
            )}

            {documentType === 'recibo_propina' && (
              <>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
                  <div className="flex justify-between">
                    <span>Recebemos do(a) Aluno(a): <strong>{activeStudent.fullName}</strong></span>
                    <span>Proc: <strong className="font-mono">{activeStudent.processNumber}</strong></span>
                  </div>
                  <div>
                    A quantia de:{' '}
                    <strong className="text-base text-emerald-800">
                      {formatKwanza(latestPaidInvoice?.amountPaidAoa || 35000)}
                    </strong>
                  </div>
                  <div>
                    Referente a: <strong>{latestPaidInvoice?.description || 'Propina Mensal'}</strong> ({latestPaidInvoice?.monthReference || 'Outubro/2026'})
                  </div>
                  <div>
                    Método de Pagamento: <strong>{latestPaidInvoice?.paymentMethod || 'Multicaixa Express'}</strong> · Ref: <strong className="font-mono">{latestPaidInvoice?.multicaixaReference || 'MCX-2026-9041'}</strong>
                  </div>
                </div>
              </>
            )}

            {/* Data e Localidade de Emissão em Angola */}
            <div className="pt-4 text-right font-medium text-xs">
              {currentInstitution.municipality || currentInstitution.province || 'Angola'}
              {currentInstitution.municipality && currentInstitution.province
                ? `, ${currentInstitution.province}`
                : ''}
              , aos {formatAngolaDate(new Date())}.
            </div>

            {/* Bloco de Assinaturas e Autenticidade com QR Code */}
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 items-end gap-6 border-t border-slate-200">
              <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
                <QrCodeView value={qrVerificationUrl} size={100} />
                <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                  Autenticação: {verificationCode}
                </span>
                <span className="text-[9px] text-slate-400">
                  Verifique a autenticidade apontando a câmara
                </span>
              </div>

              <div className="text-center">
                <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
                <span className="font-bold text-xs block text-slate-900">
                  {documentType === 'boletim_trimestral'
                    ? currentInstitution.subdirectorPedagogico || 'O(A) Subdirector(a) Pedagógico(a)'
                    : currentInstitution.secretarioGeral || 'O(A) Secretário(a) Geral'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {documentType === 'boletim_trimestral' ? 'Subdirecção Pedagógica' : 'Conferido por Livro'}
                </span>
              </div>

              <div className="text-center">
                <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
                <span className="font-bold text-xs block text-slate-900">
                  {documentType === 'boletim_trimestral'
                    ? activeStudent.guardianName
                    : currentInstitution.directorName}
                </span>
                <span className="text-[10px] text-slate-500">
                  {documentType === 'boletim_trimestral' ? 'Encarregado(a) de Educação' : 'Director(a) Geral'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            {isStudentMode
              ? 'Nenhum processo de estudante vinculado a esta conta. Solicite à Secretaria da escola a associação do seu e-mail à ficha de matrícula.'
              : 'Nenhum aluno seleccionado.'}
          </div>
        )}
      </div>
    </div>
  );
};
