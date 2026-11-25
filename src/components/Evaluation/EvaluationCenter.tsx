/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Centro de Avaliações, Mini-Pautas, Pautas e Boletins Oficiais de Angola (MED/INIDE)
 * Fórmulas INIDE/MED: MAC, NPP, NPT, MT = (MAC + NPP + NPT) / 3, CAP, CPE (Exame) e MF
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ClipboardList,
  Save,
  FileSpreadsheet,
  CheckCircle2,
  Award,
  Layers,
  Check,
  FileText,
  Users,
  BookOpen,
  Calendar,
  GraduationCap
} from 'lucide-react';
import {
  Institution,
  ClassRoom,
  Student,
  GradeRecord,
  CurriculumSubject,
  UserRole,
  UserProfile,
  Teacher,
  SchoolSubject,
  EducationSubsystemCode
} from '../../types';
import { ANGOLA_EDUCATION_SUBSYSTEMS } from '../../data/angolaCurriculum';
import {
  calculateMAC,
  calculateTrimestralMT,
  resolveGradeTrimestralComponents,
  getGradingScaleConfig,
  evaluateStudentResult,
  resolveSubjectsForClass,
  isExamAndRecourseEligible,
  calculateExamAndRecourseMF,
  computeAnnualSubjectSummary,
  evaluateAnnualCouncilDecision,
  computeMedGenderStats,
  getGradeQualitativeText,
  formatRoundedGrade
} from '../../utils/evaluationEngine';
import { formatAngolaDate } from '../../utils/currency';
import { QrCodeView } from '../common/QrCodeView';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import { DocumentExportBar } from '../common/DocumentExportBar';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';
import {
  ConsolidatedPautaView,
  buildConsolidatedPautaRows
} from './ConsolidatedPautaView';

const matchesSubjectGrade = (g: GradeRecord, sub: CurriculumSubject) =>
  g.subjectId === sub.id ||
  g.subjectName.trim().toLowerCase() === sub.name.trim().toLowerCase();

interface EvaluationCenterProps {
  currentInstitution: Institution;
  classes: ClassRoom[];
  students: Student[];
  grades: GradeRecord[];
  onUpdateGrade: (grade: GradeRecord) => void;
  onUpdateGradesBatch?: (grades: GradeRecord[]) => void;
  onOpenDocumentGenerator?: (student: Student, docType: string) => void;
  activeRole?: UserRole;
  currentUser?: UserProfile | null;
  currentTeacher?: Teacher | null;
  initialTab?: 'mini_pauta' | 'pauta_geral' | 'boletim_aluno';
  initialSubsystemCode?: EducationSubsystemCode;
  initialGradeLevel?: string;
  initialClassId?: string;
  initialSubjectId?: string;
  initialPeriod?: '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual';
  initialStudentId?: string;
  navigationKey?: number;
  customSubjects?: SchoolSubject[];
  onEvalTabChange?: (tab: 'mini_pauta' | 'pauta_geral' | 'boletim_aluno') => void;
}

export const EvaluationCenter: React.FC<EvaluationCenterProps> = ({
  currentInstitution,
  classes,
  students,
  grades,
  onUpdateGrade,
  onUpdateGradesBatch,
  onOpenDocumentGenerator,
  activeRole,
  currentUser,
  currentTeacher,
  initialTab,
  initialSubsystemCode,
  initialGradeLevel,
  initialClassId,
  initialSubjectId,
  initialPeriod,
  initialStudentId,
  navigationKey,
  customSubjects = [],
  onEvalTabChange
}) => {
  const isProfessor =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma' ||
    activeRole === 'professor' ||
    activeRole === 'director_turma';

  const instClasses = useMemo(
    () => classes.filter((c) => c.institutionId === currentInstitution.id),
    [classes, currentInstitution.id]
  );

  // Se for professor, restringe estritamente às suas turmas atribuídas
  const teacherClassIds = useMemo(() => {
    const fromAssigned = currentTeacher?.assignedClasses?.map((a) => a.classId) || [];
    const fromDirector = instClasses
      .filter((c) => c.classDirectorId === currentTeacher?.id)
      .map((c) => c.id);
    return Array.from(new Set([...fromAssigned, ...fromDirector]));
  }, [currentTeacher, instClasses]);

  const profClasses = useMemo(
    () => instClasses.filter((c) => teacherClassIds.includes(c.id)),
    [instClasses, teacherClassIds]
  );

  const availableClasses = useMemo(() => {
    if (!isProfessor) return instClasses;
    return profClasses.length > 0 ? profClasses : instClasses.length > 0 ? [instClasses[0]] : [];
  }, [isProfessor, profClasses, instClasses]);

  const initialTargetClass =
    availableClasses.find((c) => c.id === initialClassId) || availableClasses[0];

  const [selectedSubsystemCode, setSelectedSubsystemCode] = useState<string>(
    initialSubsystemCode || initialTargetClass?.subsystemCode || ''
  );
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>(
    initialGradeLevel || initialTargetClass?.gradeLevel || ''
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialTargetClass?.id || ''
  );

  const cascadeClasses = useMemo(
    () =>
      availableClasses.filter(
        (c) =>
          (!selectedSubsystemCode || c.subsystemCode === selectedSubsystemCode) &&
          (!selectedGradeLevel || c.gradeLevel === selectedGradeLevel)
      ),
    [availableClasses, selectedSubsystemCode, selectedGradeLevel]
  );

  const selectedClass = useMemo(
    () =>
      cascadeClasses.find((c) => c.id === selectedClassId) ||
      cascadeClasses[0] ||
      availableClasses.find((c) => c.id === selectedClassId) ||
      availableClasses[0],
    [cascadeClasses, availableClasses, selectedClassId]
  );

  // Resolver disciplinas reais integradas na turma (ou currículo INIDE/MED + escola)
  const availableSubjects: CurriculumSubject[] = useMemo(
    () =>
      resolveSubjectsForClass(
        selectedClass?.subsystemCode,
        selectedClass?.gradeLevel,
        selectedClass?.courseName,
        customSubjects,
        selectedClass?.subjects
      ),
    [selectedClass, customSubjects]
  );

  // Disciplinas atribuídas especificamente ao docente nesta turma (1 ou mais — multidisciplinar)
  const teacherAssignedForSelectedClass = useMemo(() => {
    if (!isProfessor || !currentTeacher?.assignedClasses || !selectedClass) return [];
    return currentTeacher.assignedClasses.filter((a) => a.classId === selectedClass.id);
  }, [isProfessor, currentTeacher, selectedClass]);

  const miniPautaSubjects: CurriculumSubject[] = useMemo(() => {
    if (!isProfessor || teacherAssignedForSelectedClass.length === 0) {
      return availableSubjects;
    }
    const matched: CurriculumSubject[] = [];
    teacherAssignedForSelectedClass.forEach((asg) => {
      const found = availableSubjects.find(
        (sub) =>
          sub.id === asg.subjectId ||
          sub.name.toLowerCase() === asg.subjectName.toLowerCase()
      );
      if (found) {
        if (!matched.some((m) => m.id === found.id)) {
          matched.push(found);
        }
      } else {
        matched.push({
          id: asg.subjectId,
          code: asg.subjectName.slice(0, 4).toUpperCase(),
          name: asg.subjectName,
          shortName: asg.subjectName.slice(0, 4).toUpperCase(),
          group: 'geral',
          weeklyHours: asg.weeklyHours || 4,
          coefficient: 1
        });
      }
    });
    return matched.length > 0 ? matched : availableSubjects;
  }, [isProfessor, teacherAssignedForSelectedClass, availableSubjects]);

  const [selectedPeriod, setSelectedPeriod] = useState<
    '1_trimestre' | '2_trimestre' | '3_trimestre' | 'anual'
  >(initialPeriod || '1_trimestre');

  const [activeTab, setActiveTab] = useState<'mini_pauta' | 'pauta_geral' | 'boletim_aluno'>(
    initialTab || 'mini_pauta'
  );

  const displayedSubjects = activeTab === 'mini_pauta' ? miniPautaSubjects : availableSubjects;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || displayedSubjects[0]?.id || ''
  );

  useEffect(() => {
    if (displayedSubjects.length > 0 && !displayedSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(displayedSubjects[0].id);
    }
  }, [displayedSubjects, selectedSubjectId]);

  const selectedSubject = useMemo(
    () => displayedSubjects.find((s) => s.id === selectedSubjectId) || displayedSubjects[0],
    [displayedSubjects, selectedSubjectId]
  );

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const miniPautaRef = useRef<HTMLDivElement>(null);
  const pautaGeralRef = useRef<HTMLDivElement>(null);
  const boletimRef = useRef<HTMLDivElement>(null);

  // Alunos desta turma
  const classStudents = useMemo(
    () =>
      students.filter(
        (s) => s.institutionId === currentInstitution.id && s.classId === selectedClass?.id
      ),
    [students, currentInstitution.id, selectedClass?.id]
  );

  const [selectedStudentIdForBoletim, setSelectedStudentIdForBoletim] = useState<string>(
    initialStudentId || classStudents[0]?.id || ''
  );

  useEffect(() => {
    if (navigationKey === undefined) return;
    if (initialTab) setActiveTab(initialTab);
    if (initialPeriod) setSelectedPeriod(initialPeriod);
    if (initialClassId) {
      const targetCls = availableClasses.find((c) => c.id === initialClassId);
      if (targetCls) {
        setSelectedSubsystemCode(initialSubsystemCode || targetCls.subsystemCode);
        setSelectedGradeLevel(initialGradeLevel || targetCls.gradeLevel);
      }
      setSelectedClassId(initialClassId);
    } else if (initialSubsystemCode) {
      setSelectedSubsystemCode(initialSubsystemCode);
      if (initialGradeLevel) setSelectedGradeLevel(initialGradeLevel);
    }
    if (initialSubjectId) setSelectedSubjectId(initialSubjectId);
    if (initialStudentId) setSelectedStudentIdForBoletim(initialStudentId);
  }, [
    navigationKey,
    initialTab,
    initialSubsystemCode,
    initialGradeLevel,
    initialClassId,
    initialSubjectId,
    initialPeriod,
    initialStudentId,
    availableClasses
  ]);

  useEffect(() => {
    onEvalTabChange?.(activeTab);
  }, [activeTab, onEvalTabChange]);

  useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some((s) => s.id === selectedStudentIdForBoletim)) {
      setSelectedStudentIdForBoletim(classStudents[0].id);
    }
  }, [classStudents, selectedStudentIdForBoletim]);

  const boletimStudent = useMemo(
    () => classStudents.find((s) => s.id === selectedStudentIdForBoletim) || classStudents[0],
    [classStudents, selectedStudentIdForBoletim]
  );

  // Estado local para digitação imediata de notas na Mini-pauta
  const [localScores, setLocalScores] = useState<
    Record<
      string,
      { ac1?: string; ac2?: string; ac3?: string; npt?: string; en?: string; rec?: string }
    >
  >({});

  // Limpar inputs locais temporários ao trocar turma/disciplina/período para reflectir dados gravados
  useEffect(() => {
    setLocalScores({});
  }, [selectedClassId, selectedSubjectId, selectedPeriod]);

  const isAnnualMode = selectedPeriod === 'anual';
  const classHasExamAndRecourse = isExamAndRecourseEligible(
    selectedClass?.subsystemCode,
    selectedClass?.gradeLevel
  );
  const scaleConfig = getGradingScaleConfig(selectedClass?.subsystemCode);
  const passingThreshold = scaleConfig.passingThreshold;
  const maxScale = scaleConfig.maxScale;

  const periodLabelMap: Record<string, string> = {
    '1_trimestre': '1.º Trimestre Lectivo',
    '2_trimestre': '2.º Trimestre Lectivo',
    '3_trimestre': '3.º Trimestre Lectivo',
    anual: classHasExamAndRecourse
      ? 'Pauta Final Anual (EN + REC + MF)'
      : 'Pauta Final Anual (Consolidação CAP)'
  };

  const handleScoreChange = (
    studentId: string,
    field: 'ac1' | 'ac2' | 'ac3' | 'npt' | 'en' | 'rec',
    val: string
  ) => {
    const num = parseFloat(val);
    if (val !== '' && (isNaN(num) || num < 0 || num > maxScale)) {
      return;
    }
    setLocalScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  };

  const buildUpdatedRecordForStudent = (student: Student): GradeRecord | null => {
    if (!selectedClass || !selectedSubject) return null;
    const studentInputs = localScores[student.id] || {};

    if (isAnnualMode) {
      const studentSubjectGrades = grades.filter(
        (g) => g.studentId === student.id && matchesSubjectGrade(g, selectedSubject)
      );
      const existingAnual = studentSubjectGrades.find((g) => g.period === 'anual');
      const annualSummary = computeAnnualSubjectSummary(
        studentSubjectGrades,
        selectedClass.subsystemCode,
        classHasExamAndRecourse
      );

      const enVal = classHasExamAndRecourse
        ? studentInputs.en !== undefined
          ? studentInputs.en === ''
            ? undefined
            : parseFloat(studentInputs.en)
          : existingAnual?.examNormal ?? existingAnual?.examScore
        : undefined;

      const recVal = classHasExamAndRecourse
        ? studentInputs.rec !== undefined
          ? studentInputs.rec === ''
            ? undefined
            : parseFloat(studentInputs.rec)
          : existingAnual?.examRecourse
        : undefined;

      const mfCalc = calculateExamAndRecourseMF(
        annualSummary.cap,
        enVal,
        recVal,
        selectedClass.subsystemCode,
        classHasExamAndRecourse
      );
      const mfVal = mfCalc.mf;

      const evaluation = evaluateStudentResult(
        selectedClass.subsystemCode,
        mfVal,
        selectedClass.gradeLevel
      );

      return {
        id: existingAnual ? existingAnual.id : `grd-anual-${student.id}-${selectedSubject.id}`,
        institutionId: currentInstitution.id,
        studentId: student.id,
        studentName: student.fullName,
        studentProcessNumber: student.processNumber,
        classId: selectedClass.id,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        period: 'anual',
        mt: annualSummary.cap,
        examNormal: enVal,
        examRecourse: recVal,
        examScore: enVal,
        finalGrade: mfVal,
        resultStatus: evaluation.statusLabel,
        updatedAt: new Date().toISOString().split('T')[0]
      };
    }

    const existing = grades.find(
      (g) =>
        g.studentId === student.id &&
        matchesSubjectGrade(g, selectedSubject) &&
        g.period === selectedPeriod
    );

    const ac1Val =
      studentInputs.ac1 !== undefined
        ? studentInputs.ac1 === ''
          ? undefined
          : parseFloat(studentInputs.ac1)
        : existing?.ac1;
    const ac2Val =
      studentInputs.ac2 !== undefined
        ? studentInputs.ac2 === ''
          ? undefined
          : parseFloat(studentInputs.ac2)
        : existing?.ac2;
    const ac3Val =
      studentInputs.ac3 !== undefined
        ? studentInputs.ac3 === ''
          ? undefined
          : parseFloat(studentInputs.ac3)
        : existing?.ac3;
    const nptVal =
      studentInputs.npt !== undefined
        ? studentInputs.npt === ''
          ? undefined
          : parseFloat(studentInputs.npt)
        : existing?.npt;

    const hasEditedAc =
      studentInputs.ac1 !== undefined ||
      studentInputs.ac2 !== undefined ||
      studentInputs.ac3 !== undefined;

    const macVal = calculateMAC(
      ac1Val,
      ac2Val,
      ac3Val,
      hasEditedAc ? undefined : existing?.mac
    );

    const hasAnyAc = ac1Val !== undefined || ac2Val !== undefined || ac3Val !== undefined;
    const mtVal = calculateTrimestralMT(
      macVal,
      nptVal,
      !hasAnyAc && !hasEditedAc ? existing?.npp : undefined
    );
    const evaluation = evaluateStudentResult(
      selectedClass.subsystemCode,
      mtVal,
      selectedClass.gradeLevel
    );

    return {
      id: existing ? existing.id : `grd-${selectedClass.id}-${student.id}-${selectedSubject.id}-${selectedPeriod}`,
      institutionId: currentInstitution.id,
      studentId: student.id,
      studentName: student.fullName,
      studentProcessNumber: student.processNumber,
      classId: selectedClass.id,
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      period: selectedPeriod,
      ac1: ac1Val,
      ac2: ac2Val,
      ac3: ac3Val,
      mac: macVal,
      npt: nptVal,
      mt: mtVal,
      finalGrade: mtVal,
      resultStatus: evaluation.statusLabel,
      updatedAt: new Date().toISOString().split('T')[0]
    };
  };

  const handleSaveGrades = (student: Student) => {
    const updatedRecord = buildUpdatedRecordForStudent(student);
    if (!updatedRecord) return;
    onUpdateGrade(updatedRecord);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleSaveAllGrades = () => {
    const batch = classStudents
      .map((stu) => buildUpdatedRecordForStudent(stu))
      .filter((rec): rec is GradeRecord => rec !== null);
    if (batch.length === 0) return;

    if (onUpdateGradesBatch) {
      onUpdateGradesBatch(batch);
    } else {
      batch.forEach((rec) => onUpdateGrade(rec));
    }
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Linhas computadas da Mini-Pauta (Suporte a Trimestral e Anual com EN/REC exclusivo)
  const miniPautaRows = useMemo(() => {
    const subCode = selectedClass?.subsystemCode || 'primario_geral';
    return classStudents.map((stu) => {
      const local = localScores[stu.id] || {};
      const studentSubjectGrades = selectedSubject
        ? grades.filter((g) => g.studentId === stu.id && matchesSubjectGrade(g, selectedSubject))
        : [];

      if (isAnnualMode) {
        const existingAnual = studentSubjectGrades.find((g) => g.period === 'anual');
        const summary = computeAnnualSubjectSummary(
          studentSubjectGrades,
          subCode,
          classHasExamAndRecourse
        );

        const existingEn = existingAnual?.examNormal ?? existingAnual?.examScore;
        const enStr = classHasExamAndRecourse
          ? local.en !== undefined
            ? local.en
            : existingEn !== undefined
            ? String(existingEn)
            : ''
          : '';
        const recStr = classHasExamAndRecourse
          ? local.rec !== undefined
            ? local.rec
            : existingAnual?.examRecourse !== undefined
            ? String(existingAnual.examRecourse)
            : ''
          : '';

        const enNum = enStr !== '' ? parseFloat(enStr) : undefined;
        const recNum = recStr !== '' ? parseFloat(recStr) : undefined;

        const mfCalc = calculateExamAndRecourseMF(
          summary.cap,
          enNum,
          recNum,
          subCode,
          classHasExamAndRecourse
        );

        const evalRes = evaluateStudentResult(
          subCode,
          mfCalc.mf,
          selectedClass?.gradeLevel
        );

        return {
          student: stu,
          mt1: summary.mt1,
          mt2: summary.mt2,
          mt3: summary.mt3,
          cap: summary.cap,
          enStr,
          recStr,
          isEligibleForREC: mfCalc.isEligibleForREC,
          finalGrade: mfCalc.mf,
          evalRes
        };
      }

      const existingGrade = studentSubjectGrades.find((g) => g.period === selectedPeriod);
      const ac1Str =
        local.ac1 !== undefined
          ? local.ac1
          : existingGrade?.ac1 !== undefined
          ? String(existingGrade.ac1)
          : '';
      const ac2Str =
        local.ac2 !== undefined
          ? local.ac2
          : existingGrade?.ac2 !== undefined
          ? String(existingGrade.ac2)
          : '';
      const ac3Str =
        local.ac3 !== undefined
          ? local.ac3
          : existingGrade?.ac3 !== undefined
          ? String(existingGrade.ac3)
          : '';
      const nptStr =
        local.npt !== undefined
          ? local.npt
          : existingGrade?.npt !== undefined
          ? String(existingGrade.npt)
          : '';

      const ac1Num = ac1Str !== '' ? parseFloat(ac1Str) : undefined;
      const ac2Num = ac2Str !== '' ? parseFloat(ac2Str) : undefined;
      const ac3Num = ac3Str !== '' ? parseFloat(ac3Str) : undefined;
      const nptNum = nptStr !== '' ? parseFloat(nptStr) : undefined;

      const hasEditedAc =
        local.ac1 !== undefined || local.ac2 !== undefined || local.ac3 !== undefined;
      const macNum = calculateMAC(
        ac1Num,
        ac2Num,
        ac3Num,
        hasEditedAc ? undefined : existingGrade?.mac
      );
      const hasAnyAc = ac1Num !== undefined || ac2Num !== undefined || ac3Num !== undefined;
      const mt = calculateTrimestralMT(
        macNum,
        nptNum,
        !hasAnyAc && !hasEditedAc ? existingGrade?.npp : undefined
      );

      const evalRes = evaluateStudentResult(
        subCode,
        mt,
        selectedClass?.gradeLevel
      );

      return {
        student: stu,
        ac1Str,
        ac2Str,
        ac3Str,
        macNum,
        nptStr,
        enStr: '',
        recStr: '',
        isEligibleForREC: false,
        finalGrade: mt,
        evalRes
      };
    });
  }, [
    classStudents,
    grades,
    localScores,
    selectedSubject?.id,
    isAnnualMode,
    selectedClass?.subsystemCode,
    selectedClass?.gradeLevel,
    classHasExamAndRecourse,
    selectedPeriod
  ]);

  // Estatísticas M/F da Mini-Pauta (MED)
  const miniPautaStats = useMemo(() => {
    const cfg = getGradingScaleConfig(selectedClass?.subsystemCode);
    return computeMedGenderStats(
      miniPautaRows.map((row) => ({
        gender: row.student.gender,
        isEvaluated: row.finalGrade !== undefined,
        isPositive: row.finalGrade !== undefined && row.finalGrade >= cfg.passingThreshold,
        isRecourse:
          row.finalGrade !== undefined &&
          row.finalGrade < cfg.passingThreshold &&
          row.finalGrade >= cfg.recourseThreshold
      }))
    );
  }, [miniPautaRows, selectedClass?.subsystemCode]);

  const avgSubject = useMemo(() => {
    const vals = miniPautaRows
      .map((r) => r.finalGrade)
      .filter((v): v is number => v !== undefined);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [miniPautaRows]);

  // Dados consolidados da Pauta Geral Oficial (MT1, MT2, MT3, EXAME(EN)/RECURSO(REC) quando aplicável e MFD)
  const consolidatedPautaRows = useMemo(() => {
    if (!selectedClass) return [];
    return buildConsolidatedPautaRows(selectedClass, classStudents, availableSubjects, grades);
  }, [selectedClass, classStudents, availableSubjects, grades]);

  // Dados consolidados do Boletim Individual do Aluno (Pauta MT1–MT3/MFD + trimestres separados AC1..MT)
  const boletimRows = useMemo(() => {
    if (!boletimStudent || !selectedClass) return [];
    const subCode = selectedClass.subsystemCode;
    return availableSubjects.map((sub) => {
      const stuSubGrades = grades.filter(
        (g) => g.studentId === boletimStudent.id && matchesSubjectGrade(g, sub)
      );
      const g1 = resolveGradeTrimestralComponents(
        stuSubGrades.find((g) => g.period === '1_trimestre')
      );
      const g2 = resolveGradeTrimestralComponents(
        stuSubGrades.find((g) => g.period === '2_trimestre')
      );
      const g3 = resolveGradeTrimestralComponents(
        stuSubGrades.find((g) => g.period === '3_trimestre')
      );
      const summary = computeAnnualSubjectSummary(
        stuSubGrades,
        subCode,
        classHasExamAndRecourse
      );
      return {
        subject: sub,
        g1,
        g2,
        g3,
        summary
      };
    });
  }, [boletimStudent, selectedClass, availableSubjects, grades, classHasExamAndRecourse]);

  const boletimPautaCouncil = useMemo(() => {
    const subCode = selectedClass?.subsystemCode || 'primario_geral';
    return evaluateAnnualCouncilDecision(
      boletimRows.map((r) => ({
        mf: r.summary.mf,
        isTerminalExam: r.subject.isTerminalExam
      })),
      classHasExamAndRecourse,
      subCode
    );
  }, [boletimRows, classHasExamAndRecourse, selectedClass?.subsystemCode]);

  const boletimCouncil = useMemo(() => {
    const subCode = selectedClass?.subsystemCode || 'primario_geral';
    if (!isAnnualMode) {
      const items = boletimRows.map((r) => {
        const comp =
          selectedPeriod === '1_trimestre'
            ? r.g1
            : selectedPeriod === '2_trimestre'
            ? r.g2
            : r.g3;
        return {
          mf: comp.mt,
          isTerminalExam: r.subject.isTerminalExam
        };
      });
      return evaluateAnnualCouncilDecision(items, false, subCode);
    }
    return boletimPautaCouncil;
  }, [boletimRows, isAnnualMode, selectedPeriod, boletimPautaCouncil, selectedClass?.subsystemCode]);

  // Opções em Cascata: 1. Subsistema -> 2. Classe -> 3. Turma -> 4. Aluno -> 5. Disciplinas / Mini-Pautas / Pautas / Boletins
  const subsystemDropdownOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const codes = Array.from(new Set(availableClasses.map((c) => c.subsystemCode)));
    return codes.map((code) => {
      const subMeta = ANGOLA_EDUCATION_SUBSYSTEMS.find((s) => s.code === code);
      const countCls = availableClasses.filter((c) => c.subsystemCode === code).length;
      return {
        value: code,
        label: subMeta?.name || code,
        description: `${countCls} turma(s) disponível(eis)`,
        group: '1.º Passo · Subsistemas de Ensino',
        badge: subMeta?.shortName || code,
        badgeTone: 'emerald'
      };
    });
  }, [availableClasses]);

  const gradeDropdownOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const subClasses = availableClasses.filter(
      (c) => !selectedSubsystemCode || c.subsystemCode === selectedSubsystemCode
    );
    const gradesList = Array.from(new Set(subClasses.map((c) => c.gradeLevel)));
    return gradesList.map((gr) => {
      const clsMatch = subClasses.filter((c) => c.gradeLevel === gr);
      const examEligible = isExamAndRecourseEligible(
        clsMatch[0]?.subsystemCode || selectedSubsystemCode,
        gr
      );
      return {
        value: gr,
        label: gr,
        description: `${clsMatch.length} turma(s) neste nível`,
        group: '2.º Passo · Classes / Anos',
        badge: examEligible ? 'EN / REC' : 'Trimestral',
        badgeTone: examEligible ? 'amber' : 'emerald'
      };
    });
  }, [availableClasses, selectedSubsystemCode]);

  const classDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      cascadeClasses.map((cls) => {
        const examEligible = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);
        return {
          value: cls.id,
          label: `${cls.name} (${cls.gradeLevel})`,
          description: `${cls.courseName || 'Ensino Geral'} · Sala ${cls.room} · Turno ${cls.shift}`,
          group: examEligible
            ? '3.º Passo · Turmas com Exames (EN) & Recurso (REC)'
            : '3.º Passo · Turmas em Regime Trimestral',
          badge: examEligible ? 'EN / REC' : 'Trimestral',
          badgeTone: examEligible ? 'amber' : 'blue'
        };
      }),
    [cascadeClasses]
  );

  const docViewDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'mini_pauta',
        label: 'Mini-Pautas por Disciplina',
        description: 'AC1, AC2, AC3, MAC, NPT, MT e Exames (EN/REC)',
        group: 'Documentos de Avaliação',
        badge: 'Mini-Pauta',
        badgeTone: 'emerald'
      },
      {
        value: 'pauta_geral',
        label: 'Pauta Geral Consolidada da Turma',
        description: 'Todas as disciplinas, trimestres e decisão final',
        group: 'Documentos de Avaliação',
        badge: 'Pauta Geral',
        badgeTone: 'emerald'
      },
      {
        value: 'boletim_aluno',
        label: 'Boletim Individual do Aluno (MED)',
        description: `Boletim de ${boletimStudent?.fullName || 'Aluno seleccionado'}`,
        group: 'Documentos Individuais',
        badge: 'Boletim',
        badgeTone: 'amber'
      },
      ...(!isProfessor && onOpenDocumentGenerator && boletimStudent
        ? [
            {
              value: 'outros_declaracao_matricula',
              label: 'Outros Documentos: Declaração de Matrícula',
              description: `Emitir no Centro de Documentos para ${boletimStudent.fullName}`,
              group: 'Outros Documentos Oficiais',
              badge: 'Documento',
              badgeTone: 'purple' as const
            },
            {
              value: 'outros_declaracao_notas',
              label: 'Outros Documentos: Declaração c/ Notas',
              description: `Emitir no Centro de Documentos para ${boletimStudent.fullName}`,
              group: 'Outros Documentos Oficiais',
              badge: 'Documento',
              badgeTone: 'purple' as const
            },
            {
              value: 'outros_certificado',
              label: 'Outros Documentos: Certificado de Habilitações',
              description: `Emitir certificado para ${boletimStudent.fullName}`,
              group: 'Outros Documentos Oficiais',
              badge: 'Certificado',
              badgeTone: 'purple' as const
            }
          ]
        : [])
    ],
    [boletimStudent, isProfessor, onOpenDocumentGenerator]
  );

  const subjectDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      displayedSubjects.map((sub) => ({
        value: sub.id,
        label: sub.name,
        description: `Sigla: ${sub.shortName} · ${sub.weeklyHours}h/semana · Coef. ${sub.coefficient}`,
        group:
          sub.group === 'geral'
            ? 'Formação Geral'
            : sub.group === 'especifica'
            ? 'Formação Específica'
            : sub.group === 'tecnica_tecnologica'
            ? 'Formação Técnica & Tecnológica'
            : 'Outras Áreas Curriculares',
        badge: `${sub.weeklyHours}h`,
        badgeTone: 'slate'
      })),
    [displayedSubjects]
  );

  const periodDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: '1_trimestre',
        label: '1.º Trimestre Lectivo',
        description: 'Avaliação Separada: AC1, AC2, AC3, MAC, NPT e MT1',
        group: 'Trimestres Separados (AC1–AC3, MAC, NPT, MT)',
        badge: '1.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: '2_trimestre',
        label: '2.º Trimestre Lectivo',
        description: 'Avaliação Separada: AC1, AC2, AC3, MAC, NPT e MT2',
        group: 'Trimestres Separados (AC1–AC3, MAC, NPT, MT)',
        badge: '2.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: '3_trimestre',
        label: '3.º Trimestre Lectivo',
        description: 'Avaliação Separada: AC1, AC2, AC3, MAC, NPT e MT3',
        group: 'Trimestres Separados (AC1–AC3, MAC, NPT, MT)',
        badge: '3.º Trim.',
        badgeTone: 'emerald'
      },
      {
        value: 'anual',
        label: classHasExamAndRecourse
          ? 'Anual Consolidado (CAP + EN + REC)'
          : 'Anual Consolidado (Média CAP)',
        description: classHasExamAndRecourse
          ? 'Consolidação dos 3 Trimestres + EN e REC'
          : 'Consolidação dos 3 Trimestres (Média CAP)',
        group: 'Consolidação Anual & Exames',
        badge: classHasExamAndRecourse ? 'EN / REC' : 'CAP',
        badgeTone: classHasExamAndRecourse ? 'amber' : 'emerald'
      }
    ],
    [classHasExamAndRecourse]
  );

  const studentDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      classStudents.map((stu) => ({
        value: stu.id,
        label: stu.fullName,
        description: `Proc. ${stu.processNumber} · Encarregado: ${stu.guardianName}`,
        group: 'Estudantes Matriculados na Turma',
        badge: stu.academicStatus,
        badgeTone: stu.academicStatus === 'confirmado' ? 'emerald' : 'blue'
      })),
    [classStudents]
  );

  // Exportar CSV (Mini-Pauta ou Pauta Geral)
  const handleExportCsv = () => {
    if (!selectedClass || !selectedSubject) return;

    if (activeTab === 'pauta_geral') {
      const headers = [
        'Nº',
        'Nome Completo do Aluno',
        ...availableSubjects.flatMap((s) =>
          classHasExamAndRecourse
            ? [
                `${s.shortName} MT1`,
                `${s.shortName} MT2`,
                `${s.shortName} MT3`,
                `${s.shortName} EXAME (EN)`,
                `${s.shortName} RECURSO (REC)`,
                `${s.shortName} MFD`
              ]
            : [
                `${s.shortName} MT1`,
                `${s.shortName} MT2`,
                `${s.shortName} MT3`,
                `${s.shortName} MFD`
              ]
        ),
        'Resultado'
      ];
      const rows = consolidatedPautaRows.map((row, idx) =>
        [
          idx + 1,
          `"${row.student.fullName}"`,
          ...row.subjectSummaries.flatMap((s) =>
            classHasExamAndRecourse
              ? [
                  s.mt1 !== undefined ? formatRoundedGrade(s.mt1) : '',
                  s.mt2 !== undefined ? formatRoundedGrade(s.mt2) : '',
                  s.mt3 !== undefined ? formatRoundedGrade(s.mt3) : '',
                  s.en !== undefined ? s.en.toFixed(1) : '',
                  s.rec !== undefined ? s.rec.toFixed(1) : '',
                  s.mfd !== undefined ? formatRoundedGrade(s.mfd) : ''
                ]
              : [
                  s.mt1 !== undefined ? formatRoundedGrade(s.mt1) : '',
                  s.mt2 !== undefined ? formatRoundedGrade(s.mt2) : '',
                  s.mt3 !== undefined ? formatRoundedGrade(s.mt3) : '',
                  s.mfd !== undefined ? formatRoundedGrade(s.mfd) : ''
                ]
          ),
          `"${row.resumo.estado}"`
        ].join(';')
      );
      const csvContent = [
        `"REPÚBLICA DE ANGOLA - DIRECÇÃO MUNICIPAL DA EDUCAÇÃO"`,
        `"PAUTA GERAL CONSOLIDADA DE APROVEITAMENTO - ${currentInstitution.name}"`,
        `"TURMA: ${selectedClass.name} | NÍVEL: ${selectedClass.gradeLevel} | ESCALA: ${scaleConfig.scaleLabel} | ANO LECTIVO: ${selectedClass.academicYear}"`,
        headers.join(';'),
        ...rows
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `PautaGeralConsolidada_${selectedClass.code}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = isAnnualMode
      ? classHasExamAndRecourse
        ? ['Nº', 'N.º Processo', 'Nome Completo', 'Gén.', 'MT1', 'MT2', 'MT3', 'CAP', 'EN (Exame)', 'REC (Recurso)', 'MF (CF)', 'Classificação']
        : ['Nº', 'N.º Processo', 'Nome Completo', 'Gén.', 'MT1', 'MT2', 'MT3', 'CAP', 'MF (CF)', 'Classificação']
      : ['Nº', 'N.º Processo', 'Nome Completo', 'Gén.', 'AC1', 'AC2', 'AC3', 'MAC', 'NPT', 'MT (Média)', 'Classificação'];

    const rows = miniPautaRows.map((row, idx) => {
      if (isAnnualMode) {
        return (
          classHasExamAndRecourse
            ? [
                idx + 1,
                `"${row.student.processNumber}"`,
                `"${row.student.fullName}"`,
                row.student.gender,
                row.mt1 !== undefined ? formatRoundedGrade(row.mt1) : '',
                row.mt2 !== undefined ? formatRoundedGrade(row.mt2) : '',
                row.mt3 !== undefined ? formatRoundedGrade(row.mt3) : '',
                row.cap !== undefined ? formatRoundedGrade(row.cap) : '',
                row.enStr || '',
                row.recStr || '',
                row.finalGrade !== undefined ? formatRoundedGrade(row.finalGrade) : '',
                `"${row.evalRes.statusLabel}"`
              ]
            : [
                idx + 1,
                `"${row.student.processNumber}"`,
                `"${row.student.fullName}"`,
                row.student.gender,
                row.mt1 !== undefined ? formatRoundedGrade(row.mt1) : '',
                row.mt2 !== undefined ? formatRoundedGrade(row.mt2) : '',
                row.mt3 !== undefined ? formatRoundedGrade(row.mt3) : '',
                row.cap !== undefined ? formatRoundedGrade(row.cap) : '',
                row.finalGrade !== undefined ? formatRoundedGrade(row.finalGrade) : '',
                `"${row.evalRes.statusLabel}"`
              ]
        ).join(';');
      }
      return [
        idx + 1,
        `"${row.student.processNumber}"`,
        `"${row.student.fullName}"`,
        row.student.gender,
        row.ac1Str || '',
        row.ac2Str || '',
        row.ac3Str || '',
        row.macNum !== undefined ? row.macNum.toFixed(1) : '',
        row.nptStr || '',
        row.finalGrade !== undefined ? formatRoundedGrade(row.finalGrade) : '',
        `"${row.evalRes.statusLabel}"`
      ].join(';');
    });

    const csvContent = [
      `"REPÚBLICA DE ANGOLA - MINISTÉRIO DA EDUCAÇÃO"`,
      `"MINI-PAUTA OFICIAL - ${currentInstitution.name}"`,
      `"Turma: ${selectedClass.name} | Disciplina: ${selectedSubject.name} | Escala: ${scaleConfig.scaleLabel} | Período: ${periodLabelMap[selectedPeriod]}"`,
      headers.join(';'),
      ...rows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `MiniPauta_${selectedClass.code}_${selectedSubject.code}_${selectedPeriod}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderGradeColor = (val?: number) => {
    if (val === undefined || isNaN(val)) return 'text-slate-400';
    return val >= passingThreshold ? 'text-black' : 'text-red-600';
  };

  const renderMedStatsFooter = (stats: ReturnType<typeof computeMedGenderStats>, labelApproved = 'Positivas / Transitam') => (
    <div className="p-4 bg-slate-50 border-t border-slate-300 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
          Quadro Estatístico Oficial de Aproveitamento (Modelo MED — Angola)
        </h4>
        <span className="text-xs font-black text-[#0073b7] tabular-nums">
          Taxa de Aproveitamento: {stats.taxaAproveitamento}%
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border border-slate-300 border-collapse bg-white tabular-nums">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold uppercase">
              <th className="border border-slate-300 py-1.5 px-2.5 text-left">Indicador Estatístico</th>
              <th className="border border-slate-300 py-1.5 px-2 text-center w-20">Masculino (M)</th>
              <th className="border border-slate-300 py-1.5 px-2 text-center w-20">Feminino (F)</th>
              <th className="border border-slate-300 py-1.5 px-2 text-center w-20 bg-slate-100">Total (MF)</th>
              <th className="border border-slate-300 py-1.5 px-2 text-center w-20">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 py-1 px-2.5 font-semibold text-slate-700">Matriculados</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono">{stats.matriculados.m}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono">{stats.matriculados.f}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono font-bold bg-slate-50">{stats.matriculados.total}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono">100%</td>
            </tr>
            <tr>
              <td className="border border-slate-300 py-1 px-2.5 font-semibold text-slate-700">Avaliados</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono">{stats.avaliados.m}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono">{stats.avaliados.f}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono font-bold bg-slate-50">{stats.avaliados.total}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                {stats.matriculados.total > 0 ? Math.round((stats.avaliados.total / stats.matriculados.total) * 100) : 0}%
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 py-1 px-2.5 font-semibold text-[#0073b7]">{labelApproved} (≥ {passingThreshold.toFixed(1)})</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono text-[#0073b7] font-bold">{stats.positivas.m}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono text-[#0073b7] font-bold">{stats.positivas.f}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono font-black text-[#0073b7] bg-sky-50">{stats.positivas.total}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono font-bold text-[#0073b7]">
                {stats.taxaAproveitamento}%
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 py-1 px-2.5 font-semibold text-red-700">Negativas / Em Recurso (&lt; {passingThreshold.toFixed(1)})</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono text-red-600 font-bold">{stats.negativas.m}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono text-red-600 font-bold">{stats.negativas.f}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono font-black text-red-600 bg-red-50">{stats.negativas.total}</td>
              <td className="border border-slate-300 py-1 px-2 text-center font-mono font-bold text-red-600">
                {stats.avaliados.total > 0 ? 100 - stats.taxaAproveitamento : 0}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#dce7df] print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight">
            Centro de Avaliações, Pautas e Boletins (MED)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Normas INIDE / Ministério da Educação · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isProfessor && activeTab === 'mini_pauta' && (
            <button
              onClick={handleSaveAllGrades}
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer min-h-[40px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Toda a Turma</span>
            </button>
          )}
          {activeTab !== 'boletim_aluno' && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center space-x-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[40px]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          )}
          <DocumentExportBar
            targetRef={
              activeTab === 'mini_pauta'
                ? miniPautaRef
                : activeTab === 'pauta_geral'
                ? pautaGeralRef
                : boletimRef
            }
            filename={
              activeTab === 'mini_pauta'
                ? `MiniPauta_${selectedClass?.code || 'Turma'}_${selectedSubject?.shortName || 'Disc'}`
                : activeTab === 'pauta_geral'
                ? `PautaGeral_${selectedClass?.code || 'Turma'}`
                : `Boletim_${boletimStudent?.processNumber || 'Aluno'}`
            }
            documentTitle={
              activeTab === 'mini_pauta'
                ? `Mini-Pauta ${selectedClass?.name || ''}`
                : activeTab === 'pauta_geral'
                ? `Pauta Geral ${selectedClass?.name || ''}`
                : `Boletim ${boletimStudent?.fullName || ''}`
            }
            defaultFormat="A4"
            defaultOrientation={activeTab === 'boletim_aluno' ? 'portrait' : 'landscape'}
          />
        </div>
      </div>

      {/* 2. CARTÕES KPI DE AVALIAÇÕES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Alunos na Turma</span>
            <div className="font-display text-2xl font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
              {classStudents.length}
            </div>
            <span className="text-[11px] text-[#067836] font-semibold block mt-0.5 truncate">
              {selectedClass?.name || 'Turma'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Aproveitamento</span>
            <div className="font-display text-2xl font-extrabold text-[#067836] tabular-nums leading-tight mt-0.5">
              {miniPautaStats.avaliados.total > 0 ? `${miniPautaStats.taxaAproveitamento}%` : '--'}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              Positivas ≥ {passingThreshold.toFixed(1)} v.
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Média da Disciplina</span>
            <div className="font-display text-2xl font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
              {avgSubject !== null ? `${avgSubject.toFixed(1)} v.` : '--'}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              {selectedSubject?.name || 'Disciplina'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Fórmula &amp; Escala</span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mt-0.5 truncate">
              {isAnnualMode
                ? classHasExamAndRecourse
                  ? selectedClass?.subsystemCode === 'superior'
                    ? 'MF = 0.5×CAP + 0.5×(EN/REC)'
                    : 'MF = 0.4×CAP + 0.6×(EN/REC)'
                  : 'MF = CAP = (MT1+MT2+MT3)/3'
                : 'MAC = (AC1+AC2+AC3)/3'}
            </div>
            <span className="text-[11px] text-[#067836] font-semibold block mt-0.5 truncate">
              Escala: {scaleConfig.scaleLabel} ·{' '}
              {classHasExamAndRecourse ? 'EN & REC Activos' : 'Regime Trimestral'}
            </span>
          </div>
        </div>
      </div>

      {/* Alerta Informativo de Perfil (Professor vs Administração Escolar) */}
      {isProfessor ? (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#064e26] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <div>
              <span className="font-bold">Lançamento de Notas Autorizado (Docente):</span>
              <span className="ml-1">
                Acesso às Mini-Pautas, Pautas da Turma e Boletins dos alunos da turma atribuída{' '}
                <strong>{selectedClass?.name || 'Turma'}</strong>.
              </span>
            </div>
          </div>
          {teacherAssignedForSelectedClass.length > 0 && (
            <span className="text-[11px] font-bold bg-white text-[#055827] px-2.5 py-1 rounded-xl border border-[#cde6d5] shrink-0">
              Disciplinas atribuídas ({teacherAssignedForSelectedClass.length}):{' '}
              {teacherAssignedForSelectedClass.map((a) => a.subjectName).join(', ')}
            </span>
          )}
        </div>
      ) : (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#064e26] flex items-center space-x-2.5 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-[#067836] shrink-0" />
          <div>
            <span className="font-bold">Consulta &amp; Homologação Oficial (Administração Escolar):</span>
            <span className="ml-1">
              Visualização, exportação PDF/CSV e impressão de Mini-Pautas, Pautas Gerais e Boletins Individuais de todas as turmas da escola (o lançamento de notas é competência exclusiva do Professor).
            </span>
          </div>
        </div>
      )}

      {/* 3. PESQUISA EM CASCATA: SUBSISTEMA -> CLASSE -> TURMA -> ALUNO -> FILTRO SUSPENSO */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] print:hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl">
          <span className="text-xs font-bold tracking-wide">
            Pesquisa em Cascata: Subsistema → Classe → Turma → Aluno → Documentos
          </span>
          <span className="text-xs text-emerald-100 font-semibold">
            {scaleConfig.isPrimaryScale ? 'Escala Primário: 0–10 v.' : 'Escala Sec./Sup.: 0–20 v.'} ·{' '}
            {isAnnualMode
              ? classHasExamAndRecourse
                ? selectedClass?.subsystemCode === 'superior'
                  ? 'Superior: EN & REC · MF = 0.5×CAP + 0.5×Exame'
                  : 'Anual (EN & REC) · MF = 0.4×CAP + 0.6×Exame'
                : 'Anual (Sem Exames): MF = CAP = (MT1+MT2+MT3)/3'
              : 'Trimestral: AC1, AC2, AC3 → MAC · MT = (MAC + NPT) / 2'}
          </span>
        </div>

        {/* Linha 1: Cascata Académica (1. Subsistema -> 2. Classe -> 3. Turma -> 4. Aluno) */}
        <div className="p-4 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <FunctionalDropdownFilter
            label="1. Subsistema de Ensino:"
            value={selectedClass?.subsystemCode || selectedSubsystemCode}
            onChange={(val) => {
              setSelectedSubsystemCode(val);
              const firstMatching = availableClasses.find((c) => c.subsystemCode === val);
              setSelectedGradeLevel(firstMatching?.gradeLevel || '');
              setSelectedClassId(firstMatching?.id || '');
            }}
            options={subsystemDropdownOptions}
            icon={<BookOpen className="w-4 h-4 text-[#067836]" />}
            placeholder="Seleccionar subsistema..."
            searchable
          />

          <FunctionalDropdownFilter
            label="2. Classe / Ano:"
            value={selectedClass?.gradeLevel || selectedGradeLevel}
            onChange={(val) => {
              setSelectedGradeLevel(val);
              const firstMatching = availableClasses.find(
                (c) =>
                  (!selectedSubsystemCode || c.subsystemCode === selectedSubsystemCode) &&
                  c.gradeLevel === val
              );
              if (firstMatching) setSelectedClassId(firstMatching.id);
            }}
            options={gradeDropdownOptions}
            disabled={!selectedSubsystemCode}
            icon={<GraduationCap className="w-4 h-4 text-[#16a34a]" />}
            placeholder="Seleccionar classe..."
            searchable
          />

          <FunctionalDropdownFilter
            label="3. Turma:"
            value={selectedClass?.id || ''}
            onChange={(val) => setSelectedClassId(val)}
            options={classDropdownOptions}
            disabled={!selectedGradeLevel}
            icon={<Layers className="w-4 h-4 text-[#067836]" />}
            placeholder="Seleccionar turma..."
            searchable
          />

          <FunctionalDropdownFilter
            label="4. Aluno da Turma:"
            value={boletimStudent?.id || ''}
            onChange={(val) => setSelectedStudentIdForBoletim(val)}
            options={studentDropdownOptions}
            disabled={classStudents.length === 0}
            icon={<Users className="w-4 h-4 text-[#16a34a]" />}
            placeholder="Seleccionar aluno..."
            searchable
          />
        </div>

        {/* Linha 2: 5.º Passo — Filtro Suspenso após selecção do Aluno (Disciplinas, Mini-Pautas, Pautas, Boletins & Outros Documentos) */}
        <div className="px-4 pb-4 pt-3 border-t border-[#dce7df] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#f7fbf8] rounded-b-2xl">
          <FunctionalDropdownFilter
            label="5A. Filtro Suspenso (Pautas, Boletins & Outros Docs):"
            value={activeTab}
            onChange={(val) => {
              if (val.startsWith('outros_') && boletimStudent && onOpenDocumentGenerator) {
                const docKey = val.replace('outros_', '');
                onOpenDocumentGenerator(boletimStudent, docKey);
                return;
              }
              setActiveTab(val as any);
            }}
            options={docViewDropdownOptions}
            icon={<FileText className="w-4 h-4 text-[#067836]" />}
            placeholder="Mini-Pauta, Pauta, Boletim ou Outros..."
          />

          <FunctionalDropdownFilter
            label={`5B. Disciplina Curricular ${
              isProfessor && teacherAssignedForSelectedClass.length > 0
                ? `(Atribuídas: ${displayedSubjects.length})`
                : '(INIDE)'
            }:`}
            value={selectedSubject?.id || ''}
            onChange={(val) => setSelectedSubjectId(val)}
            options={subjectDropdownOptions}
            disabled={activeTab !== 'mini_pauta'}
            icon={<BookOpen className="w-4 h-4 text-[#16a34a]" />}
            placeholder="Seleccionar disciplina..."
            searchable
          />

          <FunctionalDropdownFilter
            label="5C. Trimestre Separado / Consolidação:"
            value={selectedPeriod}
            onChange={(val) => setSelectedPeriod(val as any)}
            options={periodDropdownOptions}
            icon={<Calendar className="w-4 h-4 text-[#f5a623]" />}
            placeholder="Seleccionar trimestre..."
          />
        </div>
      </div>

      {/* SWITCHER DAS 3 VISÕES OFICIAIS DO MED */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
        <div className="bg-white p-1.5 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('mini_pauta')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center space-x-1.5 ${
              activeTab === 'mini_pauta'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#055827]'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>1. Mini-Pauta ({selectedSubject?.shortName})</span>
          </button>

          <button
            onClick={() => setActiveTab('pauta_geral')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center space-x-1.5 ${
              activeTab === 'pauta_geral'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#055827]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Pauta Geral da Turma</span>
          </button>

          <button
            onClick={() => setActiveTab('boletim_aluno')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center space-x-1.5 ${
              activeTab === 'boletim_aluno'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#eaf6ee] hover:text-[#055827]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Boletim Individual do Aluno</span>
          </button>
        </div>

        {saveSuccessNotice && (
          <div className="flex items-center space-x-1.5 text-xs text-[#055827] bg-[#eaf6ee] px-3 py-1.5 rounded-xl border border-[#cde6d5] font-semibold">
            <Check className="w-4 h-4 text-[#16a34a]" />
            <span>Notas calculadas e guardadas com sucesso!</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          TAB 1: MINI-PAUTA OFICIAL POR DISCIPLINA (MED ANGOLA)
         ===================================================================== */}
      {activeTab === 'mini_pauta' && selectedClass && selectedSubject && (
        <div
          ref={miniPautaRef}
          className="official-document-sheet bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden print:border-slate-900"
        >
          {/* Cabeçalho Oficial Centralizado e Editável */}
          <div className="p-5 bg-white border-b-2 border-slate-800 space-y-2">
            <OfficialDocumentHeader
              institution={currentInstitution}
              insigniaClassName="h-12 sm:h-14 w-auto mx-auto object-contain"
              extraMeta={
                <p className="text-xs font-extrabold uppercase tracking-wide pt-1">
                  MINI-PAUTA OFICIAL DE APROVEITAMENTO · {isAnnualMode ? 'CONSOLIDAÇÃO ANUAL / EXAMES' : periodLabelMap[selectedPeriod].toUpperCase()}
                </p>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-300 text-[11px] text-slate-800">
              <div>Classe / Turma: <strong>{selectedClass.gradeLevel} · {selectedClass.name}</strong></div>
              <div>Disciplina: <strong>{selectedSubject.name}</strong></div>
              <div>Turno / Sala: <strong className="capitalize">{selectedClass.shift} · {selectedClass.room}</strong></div>
              <div>Ano Lectivo: <strong>{selectedClass.academicYear}</strong></div>
              <div className="col-span-2">Docente: <strong>{currentTeacher?.fullName || selectedClass.classDirectorName || 'Docente Titular'}</strong></div>
              <div>Carga Horária: <strong>{selectedSubject.weeklyHours}h/semana</strong></div>
              <div>Escala MED: <strong className="text-[#0073b7]">{scaleConfig.scaleLabel} (Mín. {passingThreshold.toFixed(1)})</strong></div>
            </div>
          </div>

          {isAnnualMode && (
            <div
              className={`px-4 py-2 border-b text-[11px] font-semibold flex flex-wrap items-center justify-between gap-2 print:hidden ${
                classHasExamAndRecourse
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span>
                {classHasExamAndRecourse
                  ? `Épocas de Exame Normal (EN) e Exame de Recurso (REC) exclusivas activas para ${selectedClass.gradeLevel} (${
                      selectedClass.subsystemCode === 'superior' ? 'Ensino Superior' : 'Norma MED'
                    }).`
                  : `${selectedClass.gradeLevel}: Classe em regime puramente trimestral (sem Exames EN nem Recursos REC). Consolidação automática pela Média CAP.`}
              </span>
              <span className="font-mono font-bold">
                {classHasExamAndRecourse
                  ? `EN / REC · Aprovação ≥ ${passingThreshold.toFixed(1)}`
                  : 'CAP = (MT1+MT2+MT3)/3'}
              </span>
            </div>
          )}

          <div className="md:hidden px-4 py-1.5 bg-[#eaf6ee] border-b border-[#cde6d5] text-[11px] text-[#055827] flex items-center justify-between print:hidden">
            <span>Deslize lateralmente para preencher todas as notas da Mini-Pauta</span>
            <span className="font-mono font-bold">↔</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[820px] tabular-nums">
              <thead>
                <tr className="bg-slate-100 text-slate-800 uppercase font-bold border-b-2 border-slate-300">
                  <th className="py-2.5 px-2.5 w-10 text-center border-r border-slate-200">N.º</th>
                  <th className="py-2.5 px-2.5 w-24 border-r border-slate-200">N.º Proc.</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Nome Completo do Aluno</th>
                  <th className="py-2.5 px-2 w-12 text-center border-r border-slate-200">Gén.</th>
                  {isAnnualMode ? (
                    <>
                      <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">MT 1</th>
                      <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">MT 2</th>
                      <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">MT 3</th>
                      <th className="py-2.5 px-2 text-center w-20 bg-slate-200/70 border-r border-slate-200">CAP (MDF)</th>
                      {classHasExamAndRecourse && (
                        <>
                          <th className="py-2.5 px-2 text-center w-24 bg-sky-50/80 text-sky-900 border-r border-slate-200" title="Exame Normal">
                            EN (Exame)
                          </th>
                          <th className="py-2.5 px-2 text-center w-24 bg-amber-50/80 text-amber-900 border-r border-slate-200" title="Exame de Recurso">
                            REC (Recurso)
                          </th>
                        </>
                      )}
                      <th className="py-2.5 px-2 text-center w-20 bg-sky-50 text-sky-950 font-black border-r border-slate-200">MF (CF)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200" title="Avaliação Contínua 1">
                        AC1
                      </th>
                      <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200" title="Avaliação Contínua 2">
                        AC2
                      </th>
                      <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200" title="Avaliação Contínua 3">
                        AC3
                      </th>
                      <th className="py-2.5 px-2 text-center w-20 bg-slate-200/70 text-slate-900 border-r border-slate-200" title="Média de Avaliação Contínua = (AC1+AC2+AC3)/3">
                        MAC
                      </th>
                      <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200" title="Nota da Prova Trimestral">
                        NPT
                      </th>
                      <th className="py-2.5 px-2 text-center w-20 bg-sky-50 text-sky-950 font-black border-r border-slate-200" title="Média Trimestral = (MAC+NPT)/2">
                        MT
                      </th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-center w-32 border-r border-slate-200">Observação / Resultado</th>
                  {isProfessor && (
                    <th className="py-2.5 px-2 text-center w-16 print:hidden">Gravar</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {miniPautaRows.map((row, idx) => {
                  const stu = row.student;
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-700 border-r border-slate-200">
                        {stu.processNumber}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                        {stu.fullName}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {stu.gender}
                      </td>

                      {isAnnualMode ? (
                        <>
                          <td className={`py-2 px-2 text-center font-mono font-bold border-r border-slate-200 ${renderGradeColor(row.mt1)}`}>
                            {formatRoundedGrade(row.mt1)}
                          </td>
                          <td className={`py-2 px-2 text-center font-mono font-bold border-r border-slate-200 ${renderGradeColor(row.mt2)}`}>
                            {formatRoundedGrade(row.mt2)}
                          </td>
                          <td className={`py-2 px-2 text-center font-mono font-bold border-r border-slate-200 ${renderGradeColor(row.mt3)}`}>
                            {formatRoundedGrade(row.mt3)}
                          </td>
                          <td className={`py-2 px-2 text-center font-mono font-extrabold bg-slate-50 border-r border-slate-200 ${renderGradeColor(row.cap)}`}>
                            {formatRoundedGrade(row.cap)}
                          </td>
                          {classHasExamAndRecourse && (
                            <>
                              <td className="py-2 px-2 text-center border-r border-slate-200 bg-sky-50/20">
                                {isProfessor ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={maxScale}
                                    placeholder="--"
                                    value={row.enStr}
                                    onChange={(e) => handleScoreChange(stu.id, 'en', e.target.value)}
                                    className={`w-16 text-center bg-slate-50 font-bold rounded p-1.5 border border-slate-300 focus:ring-1 focus:ring-sky-500 print:border-none print:bg-transparent ${
                                      row.enStr !== '' && Number(row.enStr) < passingThreshold ? 'text-red-600' : 'text-black'
                                    }`}
                                  />
                                ) : (
                                  <span className={`font-mono font-bold ${renderGradeColor(row.enStr !== '' ? Number(row.enStr) : undefined)}`}>
                                    {row.enStr !== '' ? Number(row.enStr).toFixed(1) : '--'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center border-r border-slate-200 bg-amber-50/20">
                                {isProfessor ? (
                                  row.isEligibleForREC || row.recStr !== '' ? (
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max={maxScale}
                                      placeholder="--"
                                      value={row.recStr}
                                      onChange={(e) => handleScoreChange(stu.id, 'rec', e.target.value)}
                                      className={`w-16 text-center bg-amber-50/60 font-bold rounded p-1.5 border border-amber-300 focus:ring-1 focus:ring-amber-500 print:border-none print:bg-transparent ${
                                        row.recStr !== '' && Number(row.recStr) < passingThreshold ? 'text-red-600' : 'text-black'
                                      }`}
                                    />
                                  ) : (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      Aprov. EN
                                    </span>
                                  )
                                ) : (
                                  <span className={`font-mono font-bold ${renderGradeColor(row.recStr !== '' ? Number(row.recStr) : undefined)}`}>
                                    {row.recStr !== '' ? Number(row.recStr).toFixed(1) : '--'}
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-1.5 text-center border-r border-slate-200">
                            {isProfessor ? (
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={maxScale}
                                placeholder="--"
                                value={row.ac1Str}
                                onChange={(e) => handleScoreChange(stu.id, 'ac1', e.target.value)}
                                className={`w-14 text-center bg-slate-50 font-bold rounded p-1.5 border border-slate-300 focus:ring-1 focus:ring-sky-500 print:border-none print:bg-transparent ${
                                  row.ac1Str !== '' && Number(row.ac1Str) < passingThreshold ? 'text-red-600' : 'text-black'
                                }`}
                              />
                            ) : (
                              <span className={`font-mono font-bold ${renderGradeColor(row.ac1Str !== '' ? Number(row.ac1Str) : undefined)}`}>
                                {row.ac1Str !== '' ? Number(row.ac1Str).toFixed(1) : '--'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-1.5 text-center border-r border-slate-200">
                            {isProfessor ? (
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={maxScale}
                                placeholder="--"
                                value={row.ac2Str}
                                onChange={(e) => handleScoreChange(stu.id, 'ac2', e.target.value)}
                                className={`w-14 text-center bg-slate-50 font-bold rounded p-1.5 border border-slate-300 focus:ring-1 focus:ring-sky-500 print:border-none print:bg-transparent ${
                                  row.ac2Str !== '' && Number(row.ac2Str) < passingThreshold ? 'text-red-600' : 'text-black'
                                }`}
                              />
                            ) : (
                              <span className={`font-mono font-bold ${renderGradeColor(row.ac2Str !== '' ? Number(row.ac2Str) : undefined)}`}>
                                {row.ac2Str !== '' ? Number(row.ac2Str).toFixed(1) : '--'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-1.5 text-center border-r border-slate-200">
                            {isProfessor ? (
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={maxScale}
                                placeholder="--"
                                value={row.ac3Str}
                                onChange={(e) => handleScoreChange(stu.id, 'ac3', e.target.value)}
                                className={`w-14 text-center bg-slate-50 font-bold rounded p-1.5 border border-slate-300 focus:ring-1 focus:ring-sky-500 print:border-none print:bg-transparent ${
                                  row.ac3Str !== '' && Number(row.ac3Str) < passingThreshold ? 'text-red-600' : 'text-black'
                                }`}
                              />
                            ) : (
                              <span className={`font-mono font-bold ${renderGradeColor(row.ac3Str !== '' ? Number(row.ac3Str) : undefined)}`}>
                                {row.ac3Str !== '' ? Number(row.ac3Str).toFixed(1) : '--'}
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-2 px-2 text-center bg-slate-100/80 font-mono font-extrabold border-r border-slate-200 ${renderGradeColor(
                              row.macNum
                            )}`}
                            title="Média calculada de AC1, AC2 e AC3"
                          >
                            {row.macNum !== undefined ? row.macNum.toFixed(1) : '--'}
                          </td>
                          <td className="py-2 px-1.5 text-center border-r border-slate-200">
                            {isProfessor ? (
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={maxScale}
                                placeholder="--"
                                value={row.nptStr}
                                onChange={(e) => handleScoreChange(stu.id, 'npt', e.target.value)}
                                className={`w-14 text-center bg-slate-50 font-bold rounded p-1.5 border border-slate-300 focus:ring-1 focus:ring-sky-500 print:border-none print:bg-transparent ${
                                  row.nptStr !== '' && Number(row.nptStr) < passingThreshold ? 'text-red-600' : 'text-black'
                                }`}
                              />
                            ) : (
                              <span className={`font-mono font-bold ${renderGradeColor(row.nptStr !== '' ? Number(row.nptStr) : undefined)}`}>
                                {row.nptStr !== '' ? Number(row.nptStr).toFixed(1) : '--'}
                              </span>
                            )}
                          </td>
                        </>
                      )}

                      <td className={`py-2 px-2 text-center bg-sky-50/50 font-mono font-black text-sm border-r border-slate-200 ${renderGradeColor(row.finalGrade)}`}>
                        {formatRoundedGrade(row.finalGrade)}
                      </td>

                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        <span
                          className={`font-bold text-[11px] ${
                            row.finalGrade === undefined
                              ? 'text-slate-400'
                              : row.evalRes.isApproved
                              ? 'text-black'
                              : row.evalRes.needsRecourse
                              ? 'text-amber-700'
                              : 'text-red-600'
                          }`}
                        >
                          {row.evalRes.statusLabel}
                        </span>
                      </td>

                      {isProfessor && (
                        <td className="py-2 px-2 text-center print:hidden">
                          <button
                            onClick={() => handleSaveGrades(stu)}
                            className="p-2 rounded-lg bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] transition cursor-pointer"
                            title="Gravar nota"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quadro Estatístico M/F Oficial MED */}
          {renderMedStatsFooter(miniPautaStats, 'Positivas na Disciplina')}

          {/* Assinaturas Oficiais da Mini-Pauta (3 assinaturas MED) */}
          <div className="p-6 bg-white border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs text-slate-700">
            <div>
              <div className="w-44 border-b border-slate-500 mx-auto mb-1.5 mt-6" />
              <span className="font-bold block text-slate-900">O(A) Professor(a) da Disciplina</span>
              <span className="text-[11px] text-slate-500">
                {currentTeacher?.fullName || selectedClass.classDirectorName || 'Assinatura & Data'}
              </span>
            </div>
            <div>
              <div className="w-44 border-b border-slate-500 mx-auto mb-1.5 mt-6" />
              <span className="font-bold block text-slate-900">O(A) Coordenador(a) de Disciplina</span>
              <span className="text-[11px] text-slate-500">Conferido / Classe</span>
            </div>
            <div>
              <div className="w-44 border-b border-slate-500 mx-auto mb-1.5 mt-6" />
              <span className="font-bold block text-slate-900">
                {currentInstitution.subdirectorPedagogico || 'O(A) Subdirector(a) Pedagógico(a)'}
              </span>
              <span className="text-[11px] text-slate-500">Subdirecção Pedagógica · Visto</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PAUTA GERAL DA TURMA (TRIMESTRAL SEPARADA OU ANUAL CONSOLIDADA)
         ===================================================================== */}
      {activeTab === 'pauta_geral' && selectedClass && (
        <div ref={pautaGeralRef}>
          <ConsolidatedPautaView
            currentInstitution={currentInstitution}
            selectedClass={selectedClass}
            students={classStudents}
            subjects={availableSubjects}
            grades={grades}
            selectedPeriod={selectedPeriod}
          />
        </div>
      )}

      {/* =====================================================================
          TAB 3: BOLETIM INDIVIDUAL DO ALUNO (MODELO OFICIAL MED ANGOLA)
         ===================================================================== */}
      {activeTab === 'boletim_aluno' && selectedClass && (
        <div className="space-y-4">
          {/* Selector do Aluno com Filtro Suspenso Profissional */}
          <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="text-xs">
              <span className="font-bold text-[#064e26] uppercase block">
                Boletim Individual de Avaliação Escolar (MED) · Escala {scaleConfig.scaleLabel}
              </span>
              <span className="text-slate-500">
                {isAnnualMode
                  ? '3 Trimestres separados (AC1, AC2, AC3, MAC, NPT, MT) + Consolidação Anual para exportação PDF.'
                  : `${periodLabelMap[selectedPeriod]} separado com AC1, AC2, AC3, MAC, NPT e MT.`}
              </span>
            </div>
            <div className="w-full sm:w-80">
              <FunctionalDropdownFilter
                value={boletimStudent?.id || ''}
                onChange={(val) => setSelectedStudentIdForBoletim(val)}
                options={studentDropdownOptions}
                icon={<GraduationCap className="w-4 h-4 text-[#067836]" />}
                placeholder="Seleccionar estudante..."
                searchable
                align="right"
              />
            </div>
          </div>

          {boletimStudent ? (
            <div
              ref={boletimRef}
              className="official-document-sheet bg-white rounded-xl border border-slate-300 shadow-md p-6 sm:p-10 max-w-4xl mx-auto text-black print:shadow-none print:border-none print:p-0 space-y-4"
            >
              {/* Cabeçalho Oficial Centralizado e Editável */}
              <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                <OfficialDocumentHeader
                  institution={currentInstitution}
                  insigniaClassName="h-14 w-auto mx-auto object-contain"
                  extraMeta={
                    <p className="text-xs font-extrabold uppercase pt-1">
                      {isAnnualMode
                        ? `BOLETIM INDIVIDUAL DE NOTAS (TRIMESTRES SEPARADOS & ANUAL) · ${boletimStudent.academicYear}`
                        : `BOLETIM INDIVIDUAL DE NOTAS · ${periodLabelMap[selectedPeriod].toUpperCase()} · ${boletimStudent.academicYear}`}
                    </p>
                  }
                />
              </div>

              {/* Dados do Estudante e Encarregado */}
              <div className="p-3.5 bg-slate-50 rounded border border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div>Nome Completo: <strong className="uppercase">{boletimStudent.fullName}</strong></div>
                <div>N.º de Processo: <strong className="font-mono">{boletimStudent.processNumber}</strong></div>
                <div>Classe / Curso: <strong>{boletimStudent.gradeLevel}{boletimStudent.courseName ? ` · ${boletimStudent.courseName}` : ''}</strong></div>
                <div>Turma / Turno: <strong>{boletimStudent.className} ({boletimStudent.shift})</strong></div>
                <div>Escala Oficial: <strong className="text-[#0073b7]">{scaleConfig.scaleLabel} (Mín. {passingThreshold.toFixed(1)})</strong></div>
                <div>B.I. / Cédula: <strong className="font-mono">{boletimStudent.identityCardNumber || 'Constante do Processo'}</strong></div>
                <div>Encarregado(a): <strong>{boletimStudent.guardianName} ({boletimStudent.guardianRelationship})</strong></div>
                <div>Contacto do Encarregado: <strong className="font-mono">{boletimStudent.guardianPhone}</strong></div>
              </div>

              {/* Quadro Resumo da Pauta (MT1, MT2, MT3, EXAME(EN), RECURSO(REC), MFD) SEMPRE visível e sincronizado com as Mini-Pautas */}
              <div className="space-y-1.5 pt-1">
                <div className="bg-slate-100 text-black px-3 py-1.5 rounded border border-slate-400 font-extrabold uppercase text-[11px] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {classHasExamAndRecourse
                      ? 'QUADRO DA PAUTA POR DISCIPLINA (MT1, MT2, MT3, EXAME (EN), RECURSO (REC) E MFD)'
                      : 'QUADRO DA PAUTA POR DISCIPLINA (MT1, MT2, MT3 E MFD)'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 normal-case">
                    Notas MT reflectidas directamente das Mini-Pautas
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-400 border-collapse tabular-nums min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-extrabold uppercase text-[11px]">
                        <th className="border border-slate-400 p-1.5 text-left">Disciplina Curricular (INIDE)</th>
                        <th className="border border-slate-400 p-1.5 text-center">MT1</th>
                        <th className="border border-slate-400 p-1.5 text-center">MT2</th>
                        <th className="border border-slate-400 p-1.5 text-center">MT3</th>
                        {classHasExamAndRecourse && (
                          <>
                            <th className="border border-slate-400 p-1.5 text-center bg-sky-50 text-sky-900">EXAME (EN)</th>
                            <th className="border border-slate-400 p-1.5 text-center bg-amber-50 text-amber-900">RECURSO (REC)</th>
                          </>
                        )}
                        <th className="border border-slate-400 p-1.5 text-center bg-sky-100 text-sky-950">MFD</th>
                        <th className="border border-slate-400 p-1.5 text-center">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boletimRows.map((row) => (
                        <tr key={`pauta-boletim-${row.subject.id}`}>
                          <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{row.subject.name}</td>
                          <td className={`border border-slate-300 p-1.5 text-center font-mono font-bold ${renderGradeColor(row.summary.mt1)}`}>
                            {formatRoundedGrade(row.summary.mt1)}
                          </td>
                          <td className={`border border-slate-300 p-1.5 text-center font-mono font-bold ${renderGradeColor(row.summary.mt2)}`}>
                            {formatRoundedGrade(row.summary.mt2)}
                          </td>
                          <td className={`border border-slate-300 p-1.5 text-center font-mono font-bold ${renderGradeColor(row.summary.mt3)}`}>
                            {formatRoundedGrade(row.summary.mt3)}
                          </td>
                          {classHasExamAndRecourse && (
                            <>
                              <td className={`border border-slate-300 p-1.5 text-center font-mono font-bold bg-sky-50/30 ${renderGradeColor(row.summary.en)}`}>
                                {row.summary.en !== undefined ? row.summary.en.toFixed(1) : '--'}
                              </td>
                              <td className={`border border-slate-300 p-1.5 text-center font-mono font-bold bg-amber-50/30 ${renderGradeColor(row.summary.rec)}`}>
                                {row.summary.rec !== undefined ? row.summary.rec.toFixed(1) : '--'}
                              </td>
                            </>
                          )}
                          <td className={`border border-slate-300 p-1.5 text-center font-mono font-black bg-sky-50 ${renderGradeColor(row.summary.mf)}`}>
                            {formatRoundedGrade(row.summary.mf)}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center text-[11px] font-bold">
                            <span className={row.summary.mf === undefined ? 'text-slate-400 font-normal' : row.summary.isApproved ? 'text-black' : row.summary.needsRecourse ? 'text-amber-700' : 'text-red-600'}>
                              {row.summary.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900">
                        <td colSpan={classHasExamAndRecourse ? 6 : 4} className="border border-slate-400 p-2 text-right uppercase">
                          Média Geral (MFD) / Deliberação MED:
                        </td>
                        <td className={`border border-slate-400 p-2 text-center font-mono text-sm ${renderGradeColor(boletimPautaCouncil.overallAverage)}`}>
                          {boletimPautaCouncil.overallAverage !== undefined ? boletimPautaCouncil.overallAverage.toFixed(1) : '--'}
                        </td>
                        <td className={`border border-slate-400 p-2 text-center text-[11px] uppercase ${boletimPautaCouncil.decision === 'Transita' ? 'text-black' : boletimPautaCouncil.decision === 'Não Transita' ? 'text-red-600' : 'text-amber-700'}`}>
                          {boletimPautaCouncil.decision}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Secção(ões) Separada(s) da Mini-Pauta por Trimestre (AC1, AC2, AC3, MAC, NPT e MT) */}
              {(isAnnualMode
                ? (['1_trimestre', '2_trimestre', '3_trimestre'] as const)
                : ([selectedPeriod] as const)
              ).map((trimKey) => {
                const trimTitle =
                  trimKey === '1_trimestre'
                    ? '1.º TRIMESTRE LECTIVO'
                    : trimKey === '2_trimestre'
                    ? '2.º TRIMESTRE LECTIVO'
                    : '3.º TRIMESTRE LECTIVO';
                return (
                  <div key={trimKey} className="space-y-1.5">
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
                      <span className="text-[11px] font-extrabold uppercase text-[#0f294a]">
                        DETALHE DA MINI-PAUTA · {trimTitle} (AC1, AC2, AC3, MAC, NPT e MT)
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600">
                        MAC = (AC1+AC2+AC3)/3 · MT = (MAC+NPT)/2
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-slate-400 border-collapse tabular-nums min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-200 text-slate-900 font-extrabold uppercase text-[11px]">
                            <th className="border border-slate-400 p-1.5 text-left">Disciplina Curricular (INIDE)</th>
                            <th className="border border-slate-400 p-1.5 text-center w-14">AC1</th>
                            <th className="border border-slate-400 p-1.5 text-center w-14">AC2</th>
                            <th className="border border-slate-400 p-1.5 text-center w-14">AC3</th>
                            <th className="border border-slate-400 p-1.5 text-center w-16 bg-slate-100">MAC</th>
                            <th className="border border-slate-400 p-1.5 text-center w-14">NPT</th>
                            <th className="border border-slate-400 p-1.5 text-center w-16 bg-sky-100 text-sky-950">MT</th>
                            <th className="border border-slate-400 p-1.5 text-center w-24">Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boletimRows.map((row) => {
                            const comp =
                              trimKey === '1_trimestre'
                                ? row.g1
                                : trimKey === '2_trimestre'
                                ? row.g2
                                : row.g3;
                            const evalTrim = evaluateStudentResult(
                              selectedClass.subsystemCode,
                              comp.mt,
                              selectedClass.gradeLevel
                            );
                            return (
                              <tr key={`${trimKey}-${row.subject.id}`}>
                                <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                                  {row.subject.name}
                                </td>
                                <td className={`border border-slate-300 p-1.5 text-center font-mono ${renderGradeColor(comp.ac1)}`}>
                                  {comp.ac1 !== undefined ? comp.ac1.toFixed(1) : '--'}
                                </td>
                                <td className={`border border-slate-300 p-1.5 text-center font-mono ${renderGradeColor(comp.ac2)}`}>
                                  {comp.ac2 !== undefined ? comp.ac2.toFixed(1) : '--'}
                                </td>
                                <td className={`border border-slate-300 p-1.5 text-center font-mono ${renderGradeColor(comp.ac3)}`}>
                                  {comp.ac3 !== undefined ? comp.ac3.toFixed(1) : '--'}
                                </td>
                                <td className={`border border-slate-300 p-1.5 text-center font-mono font-bold bg-slate-50 ${renderGradeColor(comp.mac)}`}>
                                  {comp.mac !== undefined ? comp.mac.toFixed(1) : '--'}
                                </td>
                                <td className={`border border-slate-300 p-1.5 text-center font-mono ${renderGradeColor(comp.npt)}`}>
                                  {comp.npt !== undefined ? comp.npt.toFixed(1) : '--'}
                                </td>
                                <td className={`border border-slate-300 p-1.5 text-center font-mono font-black bg-sky-50/50 ${renderGradeColor(comp.mt)}`}>
                                  {formatRoundedGrade(comp.mt)}
                                </td>
                                <td className="border border-slate-300 p-1.5 text-center text-[11px] font-bold">
                                  <span
                                    className={
                                      comp.mt === undefined
                                        ? 'text-slate-400 font-normal'
                                        : evalTrim.isApproved
                                        ? 'text-black'
                                        : evalTrim.needsRecourse
                                        ? 'text-amber-700'
                                        : 'text-red-600'
                                    }
                                  >
                                    {evalTrim.statusLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Assiduidade, Observações e Deliberação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-300 space-y-1">
                  <div className="font-bold uppercase text-slate-700 text-[11px]">Assiduidade e Comportamento</div>
                  <div>Taxa de Presenças: <strong>96.8%</strong> (4 Faltas Justificadas · 2 Injustificadas)</div>
                  <div>Comportamento Escolar: <strong>Bom / Disciplinado</strong></div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-300 space-y-1">
                  <div className="font-bold uppercase text-slate-700 text-[11px]">
                    Deliberação ({isAnnualMode ? 'Conselho Anual' : periodLabelMap[selectedPeriod]})
                  </div>
                  <div>
                    Média Global:{' '}
                    <strong className={renderGradeColor(boletimCouncil.overallAverage)}>
                      {boletimCouncil.overallAverage !== undefined
                        ? `${boletimCouncil.overallAverage.toFixed(1)} v.`
                        : '--'}
                    </strong>{' '}
                    ({getGradeQualitativeText(boletimCouncil.overallAverage, selectedClass.subsystemCode)}) · Positivas:{' '}
                    <strong>{boletimCouncil.positivesCount}</strong> · Negativas:{' '}
                    <strong className={boletimCouncil.negativesCount > 0 ? 'text-red-600' : 'text-slate-900'}>
                      {boletimCouncil.negativesCount}
                    </strong>
                  </div>
                  <div>
                    Resultado:{' '}
                    <strong
                      className={
                        boletimCouncil.decision === 'Transita'
                          ? 'text-black uppercase'
                          : boletimCouncil.decision === 'Não Transita'
                          ? 'text-red-600 uppercase'
                          : 'text-amber-700 uppercase'
                      }
                    >
                      {boletimCouncil.decision}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 border border-slate-300 rounded text-xs">
                <span className="font-bold text-slate-700 uppercase text-[11px] block mb-1">
                  Observações Pedagógicas do(a) Director(a) de Turma:
                </span>
                <p className="text-slate-600">
                  {boletimCouncil.negativesCount === 0
                    ? 'O(A) estudante demonstra aproveitamento satisfatório e assiduidade regular, cumprindo os objectivos curriculares definidos pelo INIDE/MED.'
                    : `Recomenda-se acompanhamento reforçado nas disciplinas com aproveitamento inferior a ${passingThreshold.toFixed(1)} valores junto do Encarregado de Educação.`}
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center space-x-3">
                  <QrCodeView
                    value={`https://neuroeduca.gov.ao/boletim/${boletimStudent.processNumber}`}
                    size={68}
                  />
                  <div>
                    <div className="font-bold text-slate-800">Autenticidade Digital NEUROEDUCA</div>
                    <div className="font-mono text-[10px]">Proc: {boletimStudent.processNumber} · {formatAngolaDate(new Date())}</div>
                  </div>
                </div>
                <div className="text-right">
                  {currentInstitution.municipality}, aos {formatAngolaDate(new Date())}
                </div>
              </div>

              {/* Assinaturas do Boletim: Director de Turma, Subdirector Pedagógico, Encarregado */}
              <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-700">
                <div>
                  <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
                  <span className="font-bold block text-slate-900">
                    {selectedClass.classDirectorName || 'O(A) Director(a) de Turma'}
                  </span>
                  <span className="text-[10px] text-slate-500">Director(a) de Turma</span>
                </div>
                <div>
                  <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
                  <span className="font-bold block text-slate-900">
                    {currentInstitution.subdirectorPedagogico || 'O(A) Subdirector(a) Pedagógico(a)'}
                  </span>
                  <span className="text-[10px] text-slate-500">Subdirecção Pedagógica</span>
                </div>
                <div>
                  <div className="w-40 border-b border-slate-500 mx-auto mb-1" />
                  <span className="font-bold block text-slate-900">{boletimStudent.guardianName}</span>
                  <span className="text-[10px] text-slate-500">Tomou Conhecimento (Encarregado)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded border border-slate-200 text-center text-xs text-slate-500">
              Nenhum aluno matriculado nesta turma para emitir o Boletim.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
