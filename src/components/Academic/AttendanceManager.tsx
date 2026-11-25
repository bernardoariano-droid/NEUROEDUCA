/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão de Frequência Diária, Faltas e Justificações (Angola)
 * Regras de Acesso:
 * - Professor / Director de Turma: Regista frequência diária, recebe justificações (sistema ou presencial) e valida/rejeita.
 * - Administrador Escolar: Apenas visualiza o número de faltas por aluno (justificadas e não justificadas) em modo leitura.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Save,
  FileText,
  Eye,
  Plus,
  ShieldCheck,
  BookOpen,
  Layers,
  Users,
  Printer,
  Check,
  MessageSquare,
  X
} from 'lucide-react';
import {
  Institution,
  ClassRoom,
  Student,
  Teacher,
  AttendanceRecord,
  AttendanceStatus,
  JustificationSource,
  UserProfile,
  UserRole,
  SchoolSubject
} from '../../types';
import { resolveSubjectsForClass } from '../../utils/evaluationEngine';
import { formatAngolaDate } from '../../utils/currency';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import { DocumentExportBar } from '../common/DocumentExportBar';

interface AttendanceManagerProps {
  currentInstitution: Institution;
  classes: ClassRoom[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  customSubjects?: SchoolSubject[];
  currentUser?: UserProfile | null;
  activeRole?: UserRole;
  currentTeacher?: Teacher | null;
  onSaveDailyAttendance: (records: AttendanceRecord[]) => void;
  onValidateJustification: (payload: {
    recordId?: string;
    student?: Student;
    classId?: string;
    subjectId?: string;
    subjectName?: string;
    date?: string;
    decision: 'validada' | 'rejeitada';
    source: JustificationSource;
    reason?: string;
    validationNotes?: string;
  }) => void;
  initialClassId?: string;
  navigationKey?: number;
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

export function formatMonthReference(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'Ano Lectivo';
  const year = parts[0];
  const monthIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
  return `${MONTH_NAMES_PT[monthIdx] || 'Mês'}/${year}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  currentInstitution,
  classes,
  students,
  attendanceRecords,
  customSubjects = [],
  currentUser,
  activeRole,
  currentTeacher,
  onSaveDailyAttendance,
  onValidateJustification,
  initialClassId,
  navigationKey
}) => {
  const isProfessorMode =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma' ||
    activeRole === 'professor' ||
    activeRole === 'director_turma';

  const isSchoolAdminMode = !isProfessorMode;

  const instClasses = useMemo(
    () => classes.filter((c) => c.institutionId === currentInstitution.id),
    [classes, currentInstitution.id]
  );

  const instStudents = useMemo(
    () => students.filter((s) => s.institutionId === currentInstitution.id),
    [students, currentInstitution.id]
  );

  const instAttendance = useMemo(() => {
    const studentIds = new Set(instStudents.map((s) => s.id));
    return attendanceRecords.filter(
      (r) => r.institutionId === currentInstitution.id || studentIds.has(r.studentId)
    );
  }, [attendanceRecords, currentInstitution.id, instStudents]);

  // Turmas permitidas ao professor
  const teacherClassIds = useMemo(() => {
    const assigned = currentTeacher?.assignedClasses?.map((a) => a.classId) || [];
    const directed = instClasses
      .filter((c) => c.classDirectorId === currentTeacher?.id)
      .map((c) => c.id);
    return Array.from(new Set([...assigned, ...directed]));
  }, [currentTeacher, instClasses]);

  const professorClasses = useMemo(() => {
    if (!isProfessorMode) return instClasses;
    const matched = instClasses.filter((c) => teacherClassIds.includes(c.id));
    return matched.length > 0 ? matched : instClasses.slice(0, 1);
  }, [isProfessorMode, instClasses, teacherClassIds]);

  const professorStudentIds = useMemo(() => {
    const clsIds = new Set(professorClasses.map((c) => c.id));
    return new Set(instStudents.filter((s) => clsIds.has(s.classId)).map((s) => s.id));
  }, [professorClasses, instStudents]);

  // Sub-separadores exclusivos do Professor
  const [profTab, setProfTab] = useState<'chamada' | 'justificacoes' | 'resumo'>('chamada');

  // Selecções para a Chamada Diária (Professor)
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId && professorClasses.some((c) => c.id === initialClassId)
      ? initialClassId
      : professorClasses[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (initialClassId && professorClasses.some((c) => c.id === initialClassId)) {
      setSelectedClassId(initialClassId);
    } else if (
      professorClasses.length > 0 &&
      !professorClasses.some((c) => c.id === selectedClassId)
    ) {
      setSelectedClassId(professorClasses[0].id);
    }
  }, [initialClassId, navigationKey, professorClasses, selectedClassId]);

  const selectedClass = useMemo(
    () => professorClasses.find((c) => c.id === selectedClassId) || professorClasses[0],
    [professorClasses, selectedClassId]
  );

  const classSubjects = useMemo(
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

  const teacherSubjectsForClass = useMemo(() => {
    if (!isProfessorMode || !selectedClass || !currentTeacher?.assignedClasses) {
      return classSubjects;
    }
    const assigned = currentTeacher.assignedClasses.filter(
      (a) => a.classId === selectedClass.id
    );
    if (assigned.length === 0) return classSubjects;
    const matched = assigned.map((asg) => {
      const found = classSubjects.find(
        (sub) =>
          sub.id === asg.subjectId ||
          sub.name.toLowerCase() === asg.subjectName.toLowerCase()
      );
      return (
        found || {
          id: asg.subjectId,
          code: asg.subjectName.slice(0, 4).toUpperCase(),
          name: asg.subjectName,
          shortName: asg.subjectName.slice(0, 4).toUpperCase(),
          group: 'geral' as const,
          weeklyHours: asg.weeklyHours || 4,
          coefficient: 1
        }
      );
    });
    return matched.length > 0 ? matched : classSubjects;
  }, [isProfessorMode, selectedClass, currentTeacher, classSubjects]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    teacherSubjectsForClass[0]?.id || ''
  );

  useEffect(() => {
    if (
      teacherSubjectsForClass.length > 0 &&
      !teacherSubjectsForClass.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId(teacherSubjectsForClass[0].id);
    }
  }, [teacherSubjectsForClass, selectedSubjectId]);

  const selectedSubject = useMemo(
    () =>
      teacherSubjectsForClass.find((s) => s.id === selectedSubjectId) ||
      teacherSubjectsForClass[0],
    [teacherSubjectsForClass, selectedSubjectId]
  );

  const classStudents = useMemo(
    () =>
      selectedClass
        ? instStudents.filter((s) => s.classId === selectedClass.id)
        : [],
    [instStudents, selectedClass]
  );

  // Rascunho da chamada diária do professor
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [draftReasons, setDraftReasons] = useState<Record<string, string>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;
    const nextStatuses: Record<string, AttendanceStatus> = {};
    const nextNotes: Record<string, string> = {};
    const nextReasons: Record<string, string> = {};

    classStudents.forEach((stu) => {
      const existing = instAttendance.find(
        (r) =>
          r.studentId === stu.id &&
          r.classId === selectedClass.id &&
          r.date === selectedDate &&
          (r.subjectId === selectedSubject.id ||
            r.subjectName.toLowerCase() === selectedSubject.name.toLowerCase())
      );
      nextStatuses[stu.id] = existing?.status || 'presente';
      nextNotes[stu.id] = existing?.notes || '';
      nextReasons[stu.id] = existing?.justificationReason || '';
    });

    setDraftStatuses(nextStatuses);
    setDraftNotes(nextNotes);
    setDraftReasons(nextReasons);
  }, [selectedClass, selectedSubject, selectedDate, classStudents, instAttendance]);

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      next[s.id] = 'presente';
    });
    setDraftStatuses(next);
  };

  const handleSaveRollCall = () => {
    if (!isProfessorMode || !selectedClass || !selectedSubject) return;
    const nowIso = new Date().toISOString();
    const teacherName =
      currentTeacher?.fullName || currentUser?.fullName || 'Professor da Disciplina';
    const teacherId = currentTeacher?.id || currentUser?.id || 'prof';

    const recordsToSave: AttendanceRecord[] = classStudents.map((stu) => {
      const existing = instAttendance.find(
        (r) =>
          r.studentId === stu.id &&
          r.classId === selectedClass.id &&
          r.date === selectedDate &&
          (r.subjectId === selectedSubject.id ||
            r.subjectName.toLowerCase() === selectedSubject.name.toLowerCase())
      );
      const status = draftStatuses[stu.id] || 'presente';
      const note = draftNotes[stu.id]?.trim() || undefined;
      const reason = draftReasons[stu.id]?.trim() || undefined;

      // Se o professor registar directamente como Falta Justificada, considera-se justificação presencial validada
      const isDirectJustified = status === 'falta_justificada';

      return {
        id:
          existing?.id ||
          `att-${selectedClass.id}-${selectedSubject.id}-${selectedDate}-${stu.id}`,
        institutionId: currentInstitution.id,
        studentId: stu.id,
        studentName: stu.fullName,
        studentProcessNumber: stu.processNumber,
        classId: selectedClass.id,
        className: selectedClass.name,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        date: selectedDate,
        month: formatMonthReference(selectedDate),
        status,
        notes: note,
        recordedByTeacherId: teacherId,
        recordedByTeacherName: teacherName,
        recordedAt: nowIso,
        justificationStatus: isDirectJustified
          ? 'validada'
          : existing?.justificationStatus || 'nao_solicitada',
        justificationSource: isDirectJustified
          ? existing?.justificationSource || 'presencial'
          : existing?.justificationSource,
        justificationReason:
          reason ||
          existing?.justificationReason ||
          (isDirectJustified ? 'Justificação apresentada presencialmente ao docente.' : undefined),
        justificationSubmittedAt:
          existing?.justificationSubmittedAt || (isDirectJustified ? nowIso : undefined),
        justificationSubmittedBy:
          existing?.justificationSubmittedBy || (isDirectJustified ? teacherName : undefined),
        validatedByTeacherId: isDirectJustified
          ? teacherId
          : existing?.validatedByTeacherId,
        validatedByTeacherName: isDirectJustified
          ? teacherName
          : existing?.validatedByTeacherName,
        validatedAt: isDirectJustified ? nowIso : existing?.validatedAt,
        validationNotes: existing?.validationNotes
      };
    });

    onSaveDailyAttendance(recordsToSave);
    setSaveNotice(
      `Chamada diária de ${selectedSubject.name} (${selectedClass.name}) em ${formatDisplayDate(
        selectedDate
      )} registada com sucesso (${recordsToSave.length} alunos).`
    );
    setTimeout(() => setSaveNotice(null), 5000);
  };

  // ==============================================================
  // FILTROS E MODAL DE JUSTIFICAÇÕES (PROFESSOR: SISTEMA + PRESENCIAL)
  // ==============================================================
  const [justFilterStatus, setJustFilterStatus] = useState<string>('todos');
  const [justSearch, setJustSearch] = useState('');
  const [reviewingRecord, setReviewingRecord] = useState<AttendanceRecord | null>(null);
  const [reviewSource, setReviewSource] = useState<JustificationSource>('sistema');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const [showInPersonModal, setShowInPersonModal] = useState(false);
  const [inPersonStudentId, setInPersonStudentId] = useState<string>('');
  const [inPersonSubjectName, setInPersonSubjectName] = useState<string>('');
  const [inPersonDate, setInPersonDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [inPersonReason, setInPersonReason] = useState('');
  const [inPersonNotes, setInPersonNotes] = useState('');

  const professorScopedStudents = useMemo(
    () => instStudents.filter((s) => professorStudentIds.has(s.id)),
    [instStudents, professorStudentIds]
  );

  useEffect(() => {
    if (professorScopedStudents.length > 0 && !inPersonStudentId) {
      setInPersonStudentId(professorScopedStudents[0].id);
    }
  }, [professorScopedStudents, inPersonStudentId]);

  const inPersonStudent = useMemo(
    () =>
      professorScopedStudents.find((s) => s.id === inPersonStudentId) ||
      professorScopedStudents[0],
    [professorScopedStudents, inPersonStudentId]
  );

  const inPersonAvailableSubjects = useMemo(() => {
    if (!inPersonStudent) return [];
    const cls = instClasses.find((c) => c.id === inPersonStudent.classId);
    return resolveSubjectsForClass(
      cls?.subsystemCode || inPersonStudent.subsystemCode,
      cls?.gradeLevel || inPersonStudent.gradeLevel,
      cls?.courseName || inPersonStudent.courseName,
      customSubjects,
      cls?.subjects
    );
  }, [inPersonStudent, instClasses, customSubjects]);

  useEffect(() => {
    if (
      inPersonAvailableSubjects.length > 0 &&
      !inPersonAvailableSubjects.some((s) => s.name === inPersonSubjectName)
    ) {
      setInPersonSubjectName(inPersonAvailableSubjects[0].name);
    }
  }, [inPersonAvailableSubjects, inPersonSubjectName]);

  const professorAbsenceRecords = useMemo(() => {
    return instAttendance
      .filter(
        (r) =>
          professorStudentIds.has(r.studentId) &&
          (r.status === 'falta_injustificada' ||
            r.status === 'falta_justificada' ||
            r.justificationStatus === 'pendente' ||
            r.justificationStatus === 'validada' ||
            r.justificationStatus === 'rejeitada')
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [instAttendance, professorStudentIds]);

  const pendingJustificationsCount = useMemo(
    () => professorAbsenceRecords.filter((r) => r.justificationStatus === 'pendente').length,
    [professorAbsenceRecords]
  );

  const filteredJustificationRecords = useMemo(() => {
    const q = justSearch.trim().toLowerCase();
    return professorAbsenceRecords.filter((r) => {
      if (justFilterStatus === 'pendente' && r.justificationStatus !== 'pendente') {
        return false;
      }
      if (justFilterStatus === 'validada' && r.justificationStatus !== 'validada') {
        return false;
      }
      if (justFilterStatus === 'rejeitada' && r.justificationStatus !== 'rejeitada') {
        return false;
      }
      if (
        justFilterStatus === 'injustificada' &&
        !(r.status === 'falta_injustificada' && r.justificationStatus !== 'pendente')
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        (r.studentProcessNumber || '').toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q) ||
        (r.justificationReason || '').toLowerCase().includes(q)
      );
    });
  }, [professorAbsenceRecords, justFilterStatus, justSearch]);

  const openReviewModal = (rec: AttendanceRecord) => {
    setReviewingRecord(rec);
    setReviewSource(rec.justificationSource || 'sistema');
    setReviewReason(rec.justificationReason || '');
    setReviewNotes(rec.validationNotes || '');
  };

  const handleConfirmValidation = (decision: 'validada' | 'rejeitada') => {
    if (!reviewingRecord) return;
    onValidateJustification({
      recordId: reviewingRecord.id,
      decision,
      source: reviewSource,
      reason: reviewReason.trim() || reviewingRecord.justificationReason,
      validationNotes: reviewNotes.trim() || undefined
    });
    setSaveNotice(
      decision === 'validada'
        ? `Falta de ${reviewingRecord.studentName} (${formatDisplayDate(
            reviewingRecord.date
          )}) validada como Justificada (${
            reviewSource === 'presencial' ? 'Presencial' : 'Via Sistema'
          }).`
        : `Justificação de ${reviewingRecord.studentName} rejeitada; falta mantida como Injustificada.`
    );
    setTimeout(() => setSaveNotice(null), 5000);
    setReviewingRecord(null);
  };

  const handleSaveInPersonJustification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inPersonStudent || !inPersonReason.trim()) return;
    const subObj = inPersonAvailableSubjects.find((s) => s.name === inPersonSubjectName);
    onValidateJustification({
      student: inPersonStudent,
      classId: inPersonStudent.classId,
      subjectId: subObj?.id,
      subjectName: inPersonSubjectName || 'Disciplina Curricular',
      date: inPersonDate,
      decision: 'validada',
      source: 'presencial',
      reason: inPersonReason.trim(),
      validationNotes:
        inPersonNotes.trim() || 'Justificação recebida presencialmente e validada pelo docente.'
    });
    setShowInPersonModal(false);
    setInPersonReason('');
    setInPersonNotes('');
    setSaveNotice(
      `Justificação presencial de ${inPersonStudent.fullName} (${formatDisplayDate(
        inPersonDate
      )}) registada e validada.`
    );
    setTimeout(() => setSaveNotice(null), 5000);
  };

  // ==============================================================
  // AGREGAÇÃO POR ALUNO (PARA ADMINISTRADOR ESCOLAR E RESUMO DO PROFESSOR)
  // ==============================================================
  const [adminClassFilter, setAdminClassFilter] = useState<string>('todas');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('todos');
  const [adminSearch, setAdminSearch] = useState<string>('');
  const [inspectStudentSummary, setInspectStudentSummary] = useState<{
    student: Student;
    records: AttendanceRecord[];
  } | null>(null);
  const [showPrintableReport, setShowPrintableReport] = useState(false);
  const reportPrintRef = useRef<HTMLDivElement>(null);

  const visibleStudentsForSummary = useMemo(() => {
    const base = isProfessorMode ? professorScopedStudents : instStudents;
    const q = adminSearch.trim().toLowerCase();
    return base.filter((stu) => {
      if (adminClassFilter !== 'todas' && stu.classId !== adminClassFilter) {
        return false;
      }
      if (!q) return true;
      return (
        stu.fullName.toLowerCase().includes(q) ||
        stu.processNumber.toLowerCase().includes(q) ||
        stu.className.toLowerCase().includes(q)
      );
    });
  }, [isProfessorMode, professorScopedStudents, instStudents, adminClassFilter, adminSearch]);

  const studentAggregatedRows = useMemo(() => {
    return visibleStudentsForSummary
      .map((stu) => {
        const recs = instAttendance
          .filter((r) => r.studentId === stu.id)
          .sort((a, b) => b.date.localeCompare(a.date));
        const presences = recs.filter((r) => r.status === 'presente').length;
        const delays = recs.filter((r) => r.status === 'atraso').length;
        const justified = recs.filter((r) => r.status === 'falta_justificada').length;
        const unjustified = recs.filter((r) => r.status === 'falta_injustificada').length;
        const pendingValidation = recs.filter(
          (r) => r.justificationStatus === 'pendente'
        ).length;
        const totalAbsences = justified + unjustified;
        const totalRecorded = recs.length;
        const attendanceRate =
          totalRecorded > 0
            ? Number((((presences + delays) / totalRecorded) * 100).toFixed(1))
            : 100;

        return {
          student: stu,
          records: recs,
          totalRecorded,
          presences,
          delays,
          justified,
          unjustified,
          pendingValidation,
          totalAbsences,
          attendanceRate
        };
      })
      .filter((row) => {
        if (adminStatusFilter === 'com_faltas') return row.totalAbsences > 0;
        if (adminStatusFilter === 'com_injustificadas') return row.unjustified > 0;
        if (adminStatusFilter === 'com_pendentes') return row.pendingValidation > 0;
        return true;
      });
  }, [visibleStudentsForSummary, instAttendance, adminStatusFilter]);

  const globalTotals = useMemo(() => {
    return studentAggregatedRows.reduce(
      (acc, row) => ({
        studentsCount: acc.studentsCount + 1,
        justified: acc.justified + row.justified,
        unjustified: acc.unjustified + row.unjustified,
        pending: acc.pending + row.pendingValidation,
        totalAbsences: acc.totalAbsences + row.totalAbsences
      }),
      { studentsCount: 0, justified: 0, unjustified: 0, pending: 0, totalAbsences: 0 }
    );
  }, [studentAggregatedRows]);

  // Opções para filtros suspensos profissionais
  const classDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      professorClasses.map((cls) => ({
        value: cls.id,
        label: `${cls.name} (${cls.code})`,
        description: `${cls.gradeLevel} · ${cls.room} · Turno ${cls.shift}`,
        group: 'Minhas Turmas Atribuídas',
        badge: cls.gradeLevel,
        badgeTone: 'emerald'
      })),
    [professorClasses]
  );

  const subjectDropdownOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      teacherSubjectsForClass.map((sub) => ({
        value: sub.id,
        label: sub.name,
        description: `${sub.code} · ${sub.weeklyHours}h/semana`,
        group: 'Disciplinas da Turma',
        badge: sub.shortName,
        badgeTone: 'emerald'
      })),
    [teacherSubjectsForClass]
  );

  const summaryClassOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const scope = isProfessorMode ? professorClasses : instClasses;
    return [
      {
        value: 'todas',
        label: 'Todas as Turmas da Escola',
        description: `Visualizar alunos de todas as ${scope.length} turmas`,
        group: 'Abrangência',
        badge: `${scope.length} turmas`,
        badgeTone: 'slate'
      },
      ...scope.map((cls) => ({
        value: cls.id,
        label: `${cls.name} (${cls.code})`,
        description: `${cls.gradeLevel} · Turno ${cls.shift}`,
        group: 'Turmas',
        badge: cls.gradeLevel,
        badgeTone: 'emerald' as const
      }))
    ];
  }, [isProfessorMode, professorClasses, instClasses]);

  const dailyCounters = useMemo(() => {
    let presentes = 0;
    let atrasos = 0;
    let injustificadas = 0;
    let justificadas = 0;
    classStudents.forEach((s) => {
      const st = draftStatuses[s.id] || 'presente';
      if (st === 'presente') presentes++;
      else if (st === 'atraso') atrasos++;
      else if (st === 'falta_injustificada') injustificadas++;
      else if (st === 'falta_justificada') justificadas++;
    });
    return { presentes, atrasos, injustificadas, justificadas };
  }, [classStudents, draftStatuses]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] uppercase tracking-tight">
              {isProfessorMode
                ? 'Frequência Diária & Justificação de Faltas'
                : 'Consulta de Faltas por Aluno (Assiduidade)'}
            </h1>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                isProfessorMode
                  ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                  : 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
              }`}
            >
              {isProfessorMode ? 'Registo Exclusivo do Professor' : 'Modo Visualização (Admin)'}
            </span>
          </div>
          <p className="text-xs text-[#4b6755] mt-0.5">
            {isProfessorMode
              ? 'Registe a chamada diária das suas turmas, receba justificações enviadas no sistema ou presencialmente e valide no sistema.'
              : `Visualização do número de faltas justificadas e não justificadas por estudante em ${currentInstitution.name}.`}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {isProfessorMode && (
            <button
              type="button"
              onClick={() => setShowInPersonModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registar Justificação Presencial</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPrintableReport((prev) => !prev)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#067836]" />
            <span>{showPrintableReport ? 'Ocultar Mapa PDF' : 'Imprimir / Exportar Mapa'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de confirmação */}
      {saveNotice && (
        <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button
            onClick={() => setSaveNotice(null)}
            className="text-[#055827] hover:text-[#064e26] font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Aviso de Regra para Administrador Escolar */}
      {isSchoolAdminMode && (
        <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl p-3.5 flex items-start space-x-2.5 text-xs text-[#055827]">
          <ShieldCheck className="w-4 h-4 text-[#067836] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Perfil de Visualização Administrativa:</span> O registo
            diário de presenças e a validação de justificações de faltas são efectuados
            exclusivamente pelos professores das turmas. A direcção escolar consulta os totais de
            faltas justificadas e não justificadas por aluno.
          </div>
        </div>
      )}

      {/* Sub-navegação exclusiva do Professor */}
      {isProfessorMode && (
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
          <button
            type="button"
            onClick={() => setProfTab('chamada')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              profTab === 'chamada'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                : 'bg-[#f7fbf8] text-[#4b6755] hover:bg-[#eaf6ee] hover:text-[#055827]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Chamada Diária</span>
          </button>

          <button
            type="button"
            onClick={() => setProfTab('justificacoes')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              profTab === 'justificacoes'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                : 'bg-[#f7fbf8] text-[#4b6755] hover:bg-[#eaf6ee] hover:text-[#055827]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>2. Justificações &amp; Validações</span>
            {pendingJustificationsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-[#f5a623] text-slate-900 text-[10px] font-black">
                {pendingJustificationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setProfTab('resumo')}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              profTab === 'resumo'
                ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white shadow-xs'
                : 'bg-[#f7fbf8] text-[#4b6755] hover:bg-[#eaf6ee] hover:text-[#055827]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. Totais de Faltas por Aluno</span>
          </button>
        </div>
      )}

      {/* ==============================================================
          SECÇÃO 1 (PROFESSOR): CHAMADA DIÁRIA POR TURMA E DISCIPLINA
         ============================================================== */}
      {isProfessorMode && profTab === 'chamada' && (
        <div className="space-y-4">
          {/* Controlo da Aula / Data */}
          <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <FunctionalDropdownFilter
                label="Turma Atribuída"
                options={classDropdownOptions}
                value={selectedClass?.id || ''}
                onChange={setSelectedClassId}
                placeholder="Seleccionar turma..."
                searchable
              />
            </div>

            <div>
              <FunctionalDropdownFilter
                label="Disciplina da Aula"
                options={subjectDropdownOptions}
                value={selectedSubject?.id || ''}
                onChange={setSelectedSubjectId}
                placeholder="Seleccionar disciplina..."
                searchable
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#4b6755] uppercase tracking-wider mb-1">
                Data da Aula (Registo Diário)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-[#064e26] bg-[#f7fbf8] border border-[#cde6d5] rounded-xl focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                />
              </div>
            </div>
          </div>

          {/* Indicadores do Dia */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#4b6755] block">Presentes</span>
                <span className="text-2xl font-extrabold text-[#064e26] tabular-nums">
                  {dailyCounters.presentes}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#4b6755] block">Atrasos</span>
                <span className="text-2xl font-extrabold text-[#064e26] tabular-nums">
                  {dailyCounters.atrasos}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#4b6755] block">
                  Faltas Injustificadas
                </span>
                <span className="text-2xl font-extrabold text-red-700 tabular-nums">
                  {dailyCounters.injustificadas}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#4b6755] block">
                  Faltas Justificadas
                </span>
                <span className="text-2xl font-extrabold text-[#064e26] tabular-nums">
                  {dailyCounters.justificadas}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Chamada */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wide">
                  LISTA DE CHAMADA · {selectedClass?.name || 'Turma'} ·{' '}
                  {selectedSubject?.name || 'Disciplina'}
                </h2>
                <p className="text-[11px] text-white/85">
                  Data: <strong>{formatDisplayDate(selectedDate)}</strong> ·{' '}
                  {classStudents.length} estudante(s) matriculado(s)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/25 text-white transition cursor-pointer"
                >
                  Marcar Todos Presentes
                </button>
                <button
                  type="button"
                  onClick={handleSaveRollCall}
                  disabled={classStudents.length === 0}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-[#055827] hover:bg-[#eaf6ee] disabled:opacity-50 shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Frequência do Dia</span>
                </button>
              </div>
            </div>

            {classStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4b6755]">
                Nenhum estudante matriculado na turma seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                      <th className="py-2.5 px-3 w-12 text-center">N.º</th>
                      <th className="py-2.5 px-3">Estudante &amp; Processo</th>
                      <th className="py-2.5 px-3">Estado Diário</th>
                      <th className="py-2.5 px-3">Observação / Motivo Presencial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((stu, idx) => {
                      const currentSt = draftStatuses[stu.id] || 'presente';
                      const existingRec = instAttendance.find(
                        (r) =>
                          r.studentId === stu.id &&
                          r.classId === selectedClass?.id &&
                          r.date === selectedDate &&
                          (r.subjectId === selectedSubject?.id ||
                            r.subjectName.toLowerCase() ===
                              (selectedSubject?.name || '').toLowerCase())
                      );
                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{stu.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-2">
                              <span>Proc. {stu.processNumber}</span>
                              {existingRec?.justificationStatus === 'pendente' && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-bold">
                                  Justificação Pendente (Sistema)
                                </span>
                              )}
                              {existingRec?.justificationStatus === 'validada' && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-sans font-bold">
                                  Justificação Validada (
                                  {existingRec.justificationSource === 'presencial'
                                    ? 'Presencial'
                                    : 'Sistema'}
                                  )
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1.5">
                              {(
                                [
                                  {
                                    val: 'presente',
                                    label: 'Presente',
                                    activeClass:
                                      'bg-emerald-600 text-white border-emerald-700',
                                    idleClass:
                                      'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50'
                                  },
                                  {
                                    val: 'atraso',
                                    label: 'Atraso',
                                    activeClass: 'bg-sky-600 text-white border-sky-700',
                                    idleClass:
                                      'bg-white text-slate-600 border-slate-300 hover:bg-sky-50'
                                  },
                                  {
                                    val: 'falta_injustificada',
                                    label: 'Falta Injust.',
                                    activeClass: 'bg-red-600 text-white border-red-700',
                                    idleClass:
                                      'bg-white text-slate-600 border-slate-300 hover:bg-red-50'
                                  },
                                  {
                                    val: 'falta_justificada',
                                    label: 'Falta Justif.',
                                    activeClass: 'bg-blue-600 text-white border-blue-700',
                                    idleClass:
                                      'bg-white text-slate-600 border-slate-300 hover:bg-blue-50'
                                  }
                                ] as const
                              ).map((btn) => {
                                const isActive = currentSt === btn.val;
                                return (
                                  <button
                                    key={btn.val}
                                    type="button"
                                    onClick={() =>
                                      setDraftStatuses((prev) => ({
                                        ...prev,
                                        [stu.id]: btn.val
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded border text-[11px] font-bold transition cursor-pointer ${
                                      isActive ? btn.activeClass : btn.idleClass
                                    }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {currentSt === 'falta_justificada' ? (
                              <input
                                type="text"
                                value={draftReasons[stu.id] || ''}
                                onChange={(e) =>
                                  setDraftReasons((prev) => ({
                                    ...prev,
                                    [stu.id]: e.target.value
                                  }))
                                }
                                placeholder="Motivo da justificação presencial..."
                                className="w-full px-2.5 py-1.5 text-xs bg-[#eaf6ee] border border-[#cde6d5] rounded-lg focus:outline-none focus:border-[#067836]"
                              />
                            ) : (
                              <input
                                type="text"
                                value={draftNotes[stu.id] || ''}
                                onChange={(e) =>
                                  setDraftNotes((prev) => ({
                                    ...prev,
                                    [stu.id]: e.target.value
                                  }))
                                }
                                placeholder="Observação opcional da aula..."
                                className="w-full px-2.5 py-1.5 text-xs bg-[#f7fbf8] border border-[#cde6d5] rounded-lg focus:outline-none focus:border-[#067836]"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          SECÇÃO 2 (PROFESSOR): RECEBER & VALIDAR JUSTIFICAÇÕES (SISTEMA + PRESENCIAL)
         ============================================================== */}
      {isProfessorMode && profTab === 'justificacoes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={justSearch}
                  onChange={(e) => setJustSearch(e.target.value)}
                  placeholder="Pesquisar aluno, processo, disciplina ou motivo..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#f7fbf8] border border-[#cde6d5] rounded-xl focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                />
              </div>

              <select
                value={justFilterStatus}
                onChange={(e) => setJustFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs font-bold text-[#064e26] bg-[#f7fbf8] border border-[#cde6d5] rounded-xl focus:outline-none focus:border-[#067836]"
              >
                <option value="todos">Todas as Faltas &amp; Pedidos</option>
                <option value="pendente">Pendentes de Validação ({pendingJustificationsCount})</option>
                <option value="injustificada">Sem Justificação (Injustificadas)</option>
                <option value="validada">Justificações Validadas</option>
                <option value="rejeitada">Justificações Rejeitadas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowInPersonModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Receber Justificação Presencial</span>
            </button>
          </div>

          {filteredJustificationRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#dce7df] p-8 text-center text-xs text-[#4b6755]">
              Nenhuma falta ou pedido de justificação encontrado para os filtros aplicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredJustificationRecords.map((rec) => {
                const isPending = rec.justificationStatus === 'pendente';
                const isValidated = rec.justificationStatus === 'validada';
                const isRejected = rec.justificationStatus === 'rejeitada';
                return (
                  <div
                    key={rec.id}
                    className={`bg-white rounded-2xl border p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isPending
                        ? 'border-amber-300 bg-amber-50/20'
                        : isValidated
                        ? 'border-[#cde6d5]'
                        : 'border-[#dce7df]'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-[#064e26]">
                          {rec.studentName}
                        </span>
                        {rec.studentProcessNumber && (
                          <span className="text-[11px] font-mono text-[#055827] bg-[#eaf6ee] px-2 py-0.5 rounded-lg border border-[#cde6d5]">
                            Proc. {rec.studentProcessNumber}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                            rec.status === 'falta_justificada'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}
                        >
                          {rec.status === 'falta_justificada'
                            ? 'Falta Justificada'
                            : 'Falta Injustificada'}
                        </span>

                        {isPending && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Pedido Recebido no Sistema · Aguarda Validação
                            </span>
                          </span>
                        )}
                        {isValidated && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              Validada (
                              {rec.justificationSource === 'presencial'
                                ? 'Presencial'
                                : 'Directo no Sistema'}
                              )
                            </span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200 inline-flex items-center space-x-1">
                            <XCircle className="w-3 h-3" />
                            <span>Justificação Rejeitada</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#4b6755] flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          <strong>Data:</strong> {formatDisplayDate(rec.date)}
                        </span>
                        <span>
                          <strong>Disciplina:</strong> {rec.subjectName}
                        </span>
                        {rec.className && (
                          <span>
                            <strong>Turma:</strong> {rec.className}
                          </span>
                        )}
                      </div>

                      {rec.justificationReason && (
                        <div className="bg-[#f7fbf8] border border-[#cde6d5] rounded-xl p-2.5 text-xs text-slate-700">
                          <span className="font-bold text-[#064e26]">
                            Motivo apresentado (
                            {rec.justificationSource === 'presencial'
                              ? 'Presencial'
                              : 'Via Sistema'}
                            ):{' '}
                          </span>
                          {rec.justificationReason}
                          {rec.justificationSubmittedBy && (
                            <span className="block text-[10px] text-[#4b6755] mt-0.5">
                              Apresentado por: {rec.justificationSubmittedBy}
                            </span>
                          )}
                        </div>
                      )}

                      {rec.validationNotes && (
                        <div className="text-[11px] text-[#4b6755] italic">
                          <strong>Parecer do Professor:</strong> {rec.validationNotes}
                          {rec.validatedByTeacherName ? ` — ${rec.validatedByTeacherName}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openReviewModal(rec)}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isPending || rec.status === 'falta_injustificada'
                            ? 'bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white shadow-xs'
                            : 'bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {isPending
                            ? 'Validar / Decidir'
                            : rec.status === 'falta_injustificada'
                            ? 'Justificar & Validar'
                            : 'Rever Validação'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          SECÇÃO 3: MAPA DE FALTAS POR ALUNO (ADMIN ESCOLAR + RESUMO PROFESSOR)
         ============================================================== */}
      {(isSchoolAdminMode || profTab === 'resumo') && (
        <div className="space-y-4">
          {/* Indicadores Globais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#4b6755] font-semibold block">
                  Alunos Listados
                </span>
                <span className="text-2xl font-extrabold text-[#064e26] tabular-nums">
                  {globalTotals.studentsCount}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#4b6755] font-semibold block">
                  Faltas Justificadas
                </span>
                <span className="text-2xl font-extrabold text-[#064e26] tabular-nums">
                  {globalTotals.justified}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#4b6755] font-semibold block">
                  Faltas Não Justificadas
                </span>
                <span className="text-2xl font-extrabold text-red-700 tabular-nums">
                  {globalTotals.unjustified}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#4b6755] font-semibold block">
                  Justificações Pendentes
                </span>
                <span className="text-2xl font-extrabold text-amber-700 tabular-nums">
                  {globalTotals.pending}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <FunctionalDropdownFilter
                label="Filtrar por Turma"
                options={summaryClassOptions}
                value={adminClassFilter}
                onChange={setAdminClassFilter}
                placeholder="Todas as turmas..."
                searchable
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#4b6755] uppercase tracking-wider mb-1">
                Pesquisar Aluno ou Processo
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Nome do estudante ou n.º de processo..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#f7fbf8] border border-[#cde6d5] rounded-xl focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#4b6755] uppercase tracking-wider mb-1">
                Filtro de Assiduidade
              </label>
              <select
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold text-[#064e26] bg-[#f7fbf8] border border-[#cde6d5] rounded-xl focus:outline-none focus:border-[#067836]"
              >
                <option value="todos">Todos os Estudantes</option>
                <option value="com_faltas">Apenas Alunos com Faltas</option>
                <option value="com_injustificadas">Com Faltas Não Justificadas</option>
                <option value="com_pendentes">Com Pedidos Pendentes de Validação</option>
              </select>
            </div>
          </div>

          {/* Tabela Consolidada por Aluno */}
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider">
                MAPA DE FALTAS POR ESTUDANTE (JUSTIFICADAS E NÃO JUSTIFICADAS)
              </span>
              <span className="text-[11px] text-white/90 font-semibold">
                {studentAggregatedRows.length} estudante(s)
              </span>
            </div>

            {studentAggregatedRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4b6755]">
                Nenhum estudante encontrado para os critérios seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                      <th className="py-3 px-4">N.º Processo</th>
                      <th className="py-3 px-4">Nome do Estudante</th>
                      <th className="py-3 px-4">Turma / Classe</th>
                      <th className="py-3 px-4 text-center">Presenças</th>
                      <th className="py-3 px-4 text-center">Atrasos</th>
                      <th className="py-3 px-4 text-center bg-blue-50/50 text-blue-800">
                        Faltas Justificadas
                      </th>
                      <th className="py-3 px-4 text-center bg-red-50/50 text-red-800">
                        Faltas Não Justificadas
                      </th>
                      <th className="py-3 px-4 text-center">Total Faltas</th>
                      <th className="py-3 px-4 text-center">Assiduidade</th>
                      <th className="py-3 px-4 text-right">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {studentAggregatedRows.map((row) => (
                      <tr key={row.student.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {row.student.processNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{row.student.fullName}</div>
                          {row.pendingValidation > 0 && (
                            <span className="text-[10px] font-bold text-amber-700">
                              {row.pendingValidation} pedido(s) de justificação aguardando professor
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{row.student.className}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700 tabular-nums">
                          {row.presences}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-sky-700 tabular-nums">
                          {row.delays}
                        </td>
                        <td className="py-3 px-4 text-center bg-blue-50/30">
                          <span className="inline-block min-w-[28px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-black tabular-nums">
                            {row.justified}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center bg-red-50/30">
                          <span
                            className={`inline-block min-w-[28px] px-2 py-0.5 rounded font-black tabular-nums ${
                              row.unjustified > 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {row.unjustified}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-slate-800 tabular-nums">
                          {row.totalAbsences}
                        </td>
                        <td className="py-3 px-4 text-center font-bold tabular-nums">
                          <span
                            className={
                              row.attendanceRate >= 85 ? 'text-emerald-700' : 'text-amber-700'
                            }
                          >
                            {row.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setInspectStudentSummary({
                                student: row.student,
                                records: row.records
                              })
                            }
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Faltas</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          MAPA OFICIAL IMPRIMÍVEL / PDF (FOLHA BRANCA + ARIAL 12PT + CABEÇALHO OFICIAL)
         ============================================================== */}
      {showPrintableReport && (
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
          <div className="bg-[#f7fbf8] px-4 py-2.5 border-b border-[#dce7df] flex flex-wrap items-center justify-between gap-2 print:hidden">
            <span className="text-xs font-bold text-[#064e26] uppercase">
              Pré-visualização do Mapa Oficial de Faltas (Folha Branca · Arial 12pt)
            </span>
            <DocumentExportBar
              targetRef={reportPrintRef}
              filename={`Mapa_Faltas_${currentInstitution.acronym || 'Escola'}`}
              documentTitle="Mapa de Faltas e Assiduidade Escolar"
              defaultFormat="A4"
              defaultOrientation="portrait"
              compact
            />
          </div>

          <div
            ref={reportPrintRef}
            className="official-document-sheet p-6 sm:p-8 bg-white text-black space-y-4"
          >
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <OfficialDocumentHeader
                institution={currentInstitution}
                insigniaClassName="h-14 w-auto mx-auto object-contain"
                extraMeta={
                  <div className="text-xs font-bold uppercase pt-1">
                    MAPA CONSOLIDADO DE ASSIDUIDADE E FALTAS POR ALUNO · ANO LECTIVO 2026/2027
                  </div>
                }
              />
            </div>

            <table className="w-full border border-slate-800 border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-slate-800 p-1.5 text-left">N.º Proc.</th>
                  <th className="border border-slate-800 p-1.5 text-left">Nome do Estudante</th>
                  <th className="border border-slate-800 p-1.5 text-left">Turma</th>
                  <th className="border border-slate-800 p-1.5 text-center">Justificadas</th>
                  <th className="border border-slate-800 p-1.5 text-center">Não Justificadas</th>
                  <th className="border border-slate-800 p-1.5 text-center">Total Faltas</th>
                </tr>
              </thead>
              <tbody>
                {studentAggregatedRows.map((row) => (
                  <tr key={row.student.id}>
                    <td className="border border-slate-800 p-1.5">{row.student.processNumber}</td>
                    <td className="border border-slate-800 p-1.5">{row.student.fullName}</td>
                    <td className="border border-slate-800 p-1.5">{row.student.className}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{row.justified}</td>
                    <td className="border border-slate-800 p-1.5 text-center">{row.unjustified}</td>
                    <td className="border border-slate-800 p-1.5 text-center font-bold">
                      {row.totalAbsences}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-4 text-right text-xs">
              {currentInstitution.municipality || currentInstitution.province || 'Angola'}
              {currentInstitution.municipality && currentInstitution.province
                ? `, ${currentInstitution.province}`
                : ''}
              , aos {formatAngolaDate(new Date())}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL (PROFESSOR): VALIDAR / REJEITAR JUSTIFICAÇÃO
         ============================================================== */}
      {isProfessorMode && reviewingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#dce7df]">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wide">
                Validar Justificação de Falta (Professor)
              </span>
              <button
                type="button"
                onClick={() => setReviewingRecord(null)}
                className="text-white hover:text-white/80 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="bg-[#f7fbf8] border border-[#cde6d5] rounded-xl p-3 space-y-1">
                <div className="font-extrabold text-[#064e26] text-sm">
                  {reviewingRecord.studentName}
                </div>
                <div className="text-[#4b6755]">
                  Data da falta: <strong>{formatDisplayDate(reviewingRecord.date)}</strong> ·
                  Disciplina: <strong>{reviewingRecord.subjectName}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#064e26] mb-1">
                  Via de Recepção da Justificação:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewSource('sistema')}
                    className={`p-2 rounded-xl border font-bold cursor-pointer ${
                      reviewSource === 'sistema'
                        ? 'bg-[#eaf6ee] border-[#067836] text-[#055827]'
                        : 'bg-white border-[#dce7df] text-[#4b6755]'
                    }`}
                  >
                    Recebida no Sistema
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewSource('presencial')}
                    className={`p-2 rounded-xl border font-bold cursor-pointer ${
                      reviewSource === 'presencial'
                        ? 'bg-[#eaf6ee] border-[#067836] text-[#055827]'
                        : 'bg-white border-[#dce7df] text-[#4b6755]'
                    }`}
                  >
                    Entrega Presencial
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#064e26] mb-1">
                  Motivo / Comprovativo Apresentado:
                </label>
                <textarea
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Descreva o motivo ou documento entregue (atestado médico, carta do encarregado...)"
                  className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                />
              </div>

              <div>
                <label className="block font-bold text-[#064e26] mb-1">
                  Parecer / Nota de Validação do Professor:
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Ex.: Atestado verificado; falta justificada conforme regulamento."
                  className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                />
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewingRecord(null)}
                  className="px-3 py-1.5 rounded-xl font-bold text-[#4b6755] hover:bg-[#f7fbf8] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmValidation('rejeitada')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Rejeitar (Manter Injustificada)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmValidation('validada')}
                  className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Validar Falta Justificada</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL (PROFESSOR): REGISTAR JUSTIFICAÇÃO PRESENCIAL DIRECTA
         ============================================================== */}
      {isProfessorMode && showInPersonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#dce7df]">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wide">
                Registar &amp; Validar Justificação Presencial
              </span>
              <button
                type="button"
                onClick={() => setShowInPersonModal(false)}
                className="text-white hover:text-white/80 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInPersonJustification} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#064e26] mb-1">Estudante da Turma:</label>
                <select
                  value={inPersonStudentId}
                  onChange={(e) => setInPersonStudentId(e.target.value)}
                  className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] font-semibold focus:outline-none focus:border-[#067836]"
                  required
                >
                  {professorScopedStudents.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.fullName} ({stu.processNumber}) · {stu.className}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#064e26] mb-1">Disciplina:</label>
                  <select
                    value={inPersonSubjectName}
                    onChange={(e) => setInPersonSubjectName(e.target.value)}
                    className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] focus:outline-none focus:border-[#067836]"
                    required
                  >
                    {inPersonAvailableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#064e26] mb-1">Data da Falta:</label>
                  <input
                    type="date"
                    value={inPersonDate}
                    onChange={(e) => setInPersonDate(e.target.value)}
                    className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] focus:outline-none focus:border-[#067836]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#064e26] mb-1">
                  Documento / Motivo Apresentado Presencialmente:
                </label>
                <textarea
                  rows={3}
                  value={inPersonReason}
                  onChange={(e) => setInPersonReason(e.target.value)}
                  placeholder="Ex.: Atestado médico entregue presencialmente pelo encarregado na escola..."
                  className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] focus:outline-none focus:border-[#067836]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#064e26] mb-1">
                  Nota de Validação (Opcional):
                </label>
                <input
                  type="text"
                  value={inPersonNotes}
                  onChange={(e) => setInPersonNotes(e.target.value)}
                  placeholder="Ex.: Validado pelo professor após conferência do documento físico."
                  className="w-full p-2.5 border border-[#cde6d5] rounded-xl bg-[#f7fbf8] focus:outline-none focus:border-[#067836]"
                />
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInPersonModal(false)}
                  className="px-3 py-1.5 rounded-xl font-bold text-[#4b6755] hover:bg-[#f7fbf8] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl font-bold bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Registar e Validar Falta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL (MODO LEITURA): DETALHE DAS FALTAS DE UM ALUNO
         ============================================================== */}
      {inspectStudentSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-[#dce7df] max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white p-4 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wide">
                Registo Individual de Faltas · {inspectStudentSummary.student.fullName}
              </span>
              <button
                type="button"
                onClick={() => setInspectStudentSummary(null)}
                className="text-white hover:text-white/80 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              <div className="bg-[#f7fbf8] border border-[#cde6d5] rounded-xl p-3 flex flex-wrap justify-between gap-2">
                <div>
                  <strong>Processo:</strong>{' '}
                  <span className="font-mono">{inspectStudentSummary.student.processNumber}</span>{' '}
                  · <strong>Turma:</strong> {inspectStudentSummary.student.className}
                </div>
                <div className="space-x-3">
                  <span className="text-blue-700 font-bold">
                    Justificadas:{' '}
                    {
                      inspectStudentSummary.records.filter(
                        (r) => r.status === 'falta_justificada'
                      ).length
                    }
                  </span>
                  <span className="text-red-700 font-bold">
                    Não Justificadas:{' '}
                    {
                      inspectStudentSummary.records.filter(
                        (r) => r.status === 'falta_injustificada'
                      ).length
                    }
                  </span>
                </div>
              </div>

              {inspectStudentSummary.records.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Sem registos diários lançados até ao momento para este estudante.
                </div>
              ) : (
                <table className="w-full text-left border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px]">
                      <th className="p-2 border-b border-slate-200">Data</th>
                      <th className="p-2 border-b border-slate-200">Disciplina</th>
                      <th className="p-2 border-b border-slate-200">Estado</th>
                      <th className="p-2 border-b border-slate-200">Justificação / Validação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectStudentSummary.records.map((rec) => (
                      <tr key={rec.id}>
                        <td className="p-2 font-mono">{formatDisplayDate(rec.date)}</td>
                        <td className="p-2 font-semibold">{rec.subjectName}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.status === 'presente'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'atraso'
                                ? 'bg-sky-100 text-sky-800'
                                : rec.status === 'falta_justificada'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {rec.status === 'presente'
                              ? 'Presente'
                              : rec.status === 'atraso'
                              ? 'Atraso'
                              : rec.status === 'falta_justificada'
                              ? 'Falta Justificada'
                              : 'Falta Não Justificada'}
                          </span>
                        </td>
                        <td className="p-2 text-[11px] text-slate-600">
                          {rec.justificationStatus === 'validada'
                            ? `Validada (${
                                rec.justificationSource === 'presencial'
                                  ? 'Presencial'
                                  : 'Sistema'
                              })${rec.justificationReason ? ` — ${rec.justificationReason}` : ''}`
                            : rec.justificationStatus === 'pendente'
                            ? 'Pedido enviado no sistema (Aguarda Professor)'
                            : rec.justificationStatus === 'rejeitada'
                            ? `Rejeitada${rec.validationNotes ? ` — ${rec.validationNotes}` : ''}`
                            : rec.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-[#f7fbf8] p-3 border-t border-[#dce7df] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectStudentSummary(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
