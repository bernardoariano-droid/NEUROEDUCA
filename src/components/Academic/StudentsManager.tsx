/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão de Alunos, Matrículas e Processos Escolares de Angola
 */

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  FileText,
  UserCheck,
  MapPin,
  Phone,
  FileSpreadsheet,
  X,
  CreditCard,
  AlertCircle,
  Eye,
  Calendar,
  Award,
  Download,
  CheckCircle2,
  ExternalLink,
  Shield,
  ShieldCheck,
  Upload,
  AlertTriangle,
  FolderArchive
} from 'lucide-react';
import {
  Student,
  Institution,
  ClassRoom,
  UserRole,
  UserProfile,
  Teacher,
  DigitalArchiveDocument
} from '../../types';
import { ANGOLA_PROVINCES, formatAngolaDate } from '../../utils/currency';
import { storageService } from '../../services/storageService';
import { isExamAndRecourseEligible } from '../../utils/evaluationEngine';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';

interface StudentsManagerProps {
  currentInstitution: Institution;
  students: Student[];
  classes: ClassRoom[];
  onAddStudent: (newStudent: Student) => void;
  onAddMultipleStudents?: (newStudents: Student[]) => void;
  onOpenDocumentGenerator?: (student: Student, docType: string) => void;
  initialOpenModal?: boolean;
  activeRole?: UserRole;
  currentUser?: UserProfile | null;
  currentTeacher?: Teacher | null;
  initialSearchTerm?: string;
  initialSelectedStudentId?: string;
  navigationKey?: number;
  digitalArchive?: DigitalArchiveDocument[];
  onOpenDigitalArchive?: (student: Student) => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({
  currentInstitution,
  students,
  classes,
  onAddStudent,
  onAddMultipleStudents,
  onOpenDocumentGenerator,
  initialOpenModal = false,
  activeRole,
  currentUser,
  currentTeacher,
  initialSearchTerm,
  initialSelectedStudentId,
  navigationKey,
  digitalArchive = [],
  onOpenDigitalArchive
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin' || activeRole === 'super_admin';
  const isProfessor =
    currentUser?.role === 'professor' ||
    currentUser?.role === 'director_turma' ||
    activeRole === 'professor' ||
    activeRole === 'director_turma';

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedClassFilter, setSelectedClassFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(initialOpenModal);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<Student | null>(null);

  useEffect(() => {
    if (navigationKey === undefined) return;
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
    if (initialSelectedStudentId) {
      const targetStudent = students.find((s) => s.id === initialSelectedStudentId);
      if (targetStudent) {
        setSelectedStudentProfile(targetStudent);
      }
    }
  }, [navigationKey, initialSearchTerm, initialSelectedStudentId, students]);

  // Estados para Matrícula em Massa
  const [isMassModalOpen, setIsMassModalOpen] = useState(false);
  const [massRawText, setMassRawText] = useState('');
  const [massSuccessNotice, setMassSuccessNotice] = useState<string | null>(null);
  const [massParsedStudents, setMassParsedStudents] = useState<Student[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formProcess, setFormProcess] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('2014-05-10');
  const [formGender, setFormGender] = useState<'M' | 'F'>('M');
  const [formBi, setFormBi] = useState('');
  const [formProvince, setFormProvince] = useState(currentInstitution.province);
  const [formMunicipality, setFormMunicipality] = useState(currentInstitution.municipality);
  const [formAddress, setFormAddress] = useState('');
  const [formFather, setFormFather] = useState('');
  const [formMother, setFormMother] = useState('');
  const [formGuardianName, setFormGuardianName] = useState('');
  const [formGuardianPhone, setFormGuardianPhone] = useState('');
  const [formGuardianRel, setFormGuardianRel] = useState('Pai');
  const [formClassId, setFormClassId] = useState('');
  const [formPortalEmail, setFormPortalEmail] = useState('');
  const [formPortalPassword, setFormPortalPassword] = useState('123');

  const instStudents = students.filter((s) => s.institutionId === currentInstitution.id);
  const instClasses = classes.filter((c) => c.institutionId === currentInstitution.id);

  // Turmas atribuídas ao professor logado
  const teacherClassIds = currentTeacher?.assignedClasses?.map((a) => a.classId) ||
    instClasses.filter((c) => c.classDirectorId === currentTeacher?.id).map((c) => c.id);
  const profClasses = instClasses.filter((c) => teacherClassIds.includes(c.id));
  const profTargetClass = profClasses[0] || instClasses[0];

  // Se for professor, restringe estritamente aos alunos da sua turma atribuída
  const baseStudents = isProfessor
    ? instStudents.filter((s) => s.classId === profTargetClass?.id || teacherClassIds.includes(s.classId))
    : instStudents;

  const filteredStudents = baseStudents.filter((stu) => {
    const matchSearch =
      stu.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stu.processNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stu.identityCardNumber && stu.identityCardNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchClass = selectedClassFilter === 'todas' || stu.classId === selectedClassFilter;
    const matchStatus = statusFilter === 'todos' || stu.academicStatus === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const classFilterOptions: FunctionalDropdownOption[] = [
    {
      value: 'todas',
      label: `Todas as Turmas (${instStudents.length})`,
      description: 'Visualizar estudantes de toda a instituição',
      group: 'Filtro Global',
      badge: `${instStudents.length}`,
      badgeTone: 'slate'
    },
    ...instClasses.map((cls) => {
      const eligible = isExamAndRecourseEligible(cls.subsystemCode, cls.gradeLevel);
      return {
        value: cls.id,
        label: cls.name,
        description: `${cls.gradeLevel} · ${cls.enrolledStudentsCount} aluno(s)`,
        group: eligible
          ? 'Turmas com Exames (EN) & Recurso (REC)'
          : 'Turmas em Regime Trimestral',
        badge: eligible ? 'EN / REC' : cls.gradeLevel,
        badgeTone: eligible ? ('amber' as const) : ('emerald' as const)
      };
    })
  ];

  const statusFilterOptions: FunctionalDropdownOption[] = [
    {
      value: 'todos',
      label: 'Todos os Estados',
      group: 'Situação Académica',
      badge: `${instStudents.length}`,
      badgeTone: 'slate'
    },
    {
      value: 'matriculado',
      label: 'Matriculado',
      description: 'Primeira inscrição no ano lectivo',
      group: 'Situação Académica',
      badge: 'Novo',
      badgeTone: 'emerald'
    },
    {
      value: 'confirmado',
      label: 'Confirmado',
      description: 'Matrícula renovada com sucesso',
      group: 'Situação Académica',
      badge: 'Activo',
      badgeTone: 'emerald'
    },
    {
      value: 'transferido',
      label: 'Transferido',
      description: 'Processo transferido para outra escola',
      group: 'Situação Académica',
      badge: 'Saída',
      badgeTone: 'amber'
    }
  ];

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim() || !formProcess.trim()) return;

    // Verificar duplicação de nº de processo
    const alreadyExists = instStudents.some(
      (s) => s.processNumber.trim().toLowerCase() === formProcess.trim().toLowerCase()
    );
    if (alreadyExists) {
      setFormError(`O Número de Processo "${formProcess}" já está em uso nesta instituição.`);
      return;
    }

    const assignedClass = instClasses.find((c) => c.id === formClassId) || instClasses[0];
    const studentLoginEmail =
      formPortalEmail.trim() ||
      `aluno.${formProcess.trim().replace(/[^a-zA-Z0-9]/g, '')}@${currentInstitution.acronym?.toLowerCase() || 'escola'}.ao`;

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      institutionId: currentInstitution.id,
      processNumber: formProcess.trim(),
      fullName: formName.trim(),
      birthDate: formBirthDate,
      gender: formGender,
      identityCardNumber: formBi.trim() || undefined,
      birthProvince: formProvince,
      birthMunicipality: formMunicipality,
      residentialAddress: formAddress || `Bairro Central, ${formProvince}`,
      fatherName: formFather.trim() || undefined,
      motherName: formMother.trim() || undefined,
      guardianName: formGuardianName.trim() || formFather.trim() || formMother.trim() || 'Encarregado Principal',
      guardianPhone: formGuardianPhone.trim() || '+244 923 000 000',
      guardianRelationship: formGuardianRel,
      guardianEmail: studentLoginEmail,
      email: studentLoginEmail,
      portalPassword: formPortalPassword.trim() || '123',
      enrollmentFeePaid: false,
      subsystemCode: assignedClass ? assignedClass.subsystemCode : currentInstitution.subsystems[0],
      gradeLevel: assignedClass ? assignedClass.gradeLevel : '1.ª Classe',
      courseName: assignedClass?.courseName,
      classId: assignedClass ? assignedClass.id : 'class-default',
      className: assignedClass ? assignedClass.name : 'Turma Geral',
      shift: assignedClass ? assignedClass.shift : 'Manhã',
      academicYear: '2026/2027',
      academicStatus: 'matriculado'
    };

    onAddStudent(newStudent);

    // Registar credenciais do Aluno para acesso imediato ao Portal na memória Localhost
    storageService.upsertAccount({
      email: studentLoginEmail,
      password: formPortalPassword.trim() || '123',
      fullName: `${newStudent.fullName} (Estudante)`,
      role: 'aluno',
      institutionId: newStudent.institutionId,
      institutionName: currentInstitution.name,
      status: 'activo'
    });

    setIsModalOpen(false);

    // Reset
    setFormName('');
    setFormProcess('');
    setFormBi('');
    setFormPortalEmail('');
    setFormPortalPassword('123');
  };

  const handleParseMassText = (text: string) => {
    setMassRawText(text);
    if (!text.trim()) {
      setMassParsedStudents([]);
      return;
    }

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('nome'));

    const defaultClass = instClasses[0];
    const baseProcessNum = instStudents.length + 400;

    const parsed: Student[] = lines.map((line, idx) => {
      const parts = line.includes(';')
        ? line.split(';')
        : line.includes('\t')
        ? line.split('\t')
        : line.split(',');

      const fullName = (parts[0] || `Aluno Novo ${idx + 1}`).trim();
      const rawGender = (parts[1] || 'M').trim().toUpperCase();
      const gender: 'M' | 'F' = rawGender.startsWith('F') ? 'F' : 'M';
      const birthDate = (parts[2] || '2014-05-10').trim();
      const bi = (parts[3] || '').trim();
      const classNameCandidate = (parts[4] || '').trim();
      const guardianName = (parts[5] || 'Encarregado').trim();
      const guardianPhone = (parts[6] || '+244 923 000 000').trim();

      const matchedClass =
        instClasses.find(
          (c) =>
            c.name.toLowerCase().includes(classNameCandidate.toLowerCase()) ||
            c.gradeLevel.toLowerCase().includes(classNameCandidate.toLowerCase())
        ) || defaultClass;

      return {
        id: `stu-mass-${Date.now()}-${idx}`,
        institutionId: currentInstitution.id,
        processNumber: `2026/${String(baseProcessNum + idx).padStart(4, '0')}`,
        fullName,
        birthDate: birthDate.length === 10 ? birthDate : '2014-05-10',
        gender,
        identityCardNumber: bi || undefined,
        birthProvince: currentInstitution.province,
        birthMunicipality: currentInstitution.municipality,
        residentialAddress: `Bairro Central, ${currentInstitution.province}`,
        guardianName,
        guardianPhone,
        guardianRelationship: 'Encarregado Principal',
        subsystemCode: matchedClass ? matchedClass.subsystemCode : currentInstitution.subsystems[0],
        gradeLevel: matchedClass ? matchedClass.gradeLevel : '1.ª Classe',
        courseName: matchedClass?.courseName,
        classId: matchedClass ? matchedClass.id : 'class-default',
        className: matchedClass ? matchedClass.name : 'Turma Geral',
        shift: matchedClass ? matchedClass.shift : 'Manhã',
        academicYear: '2026/2027',
        academicStatus: 'matriculado' as const
      };
    });

    setMassParsedStudents(parsed);
  };

  const handleConfirmMassEnrollment = () => {
    if (massParsedStudents.length === 0) return;

    if (onAddMultipleStudents) {
      onAddMultipleStudents(massParsedStudents);
    } else {
      massParsedStudents.forEach((stu) => onAddStudent(stu));
    }

    setMassSuccessNotice(
      `Matrícula em massa concluída com sucesso! Foram matriculados ${massParsedStudents.length} alunos.`
    );
    setTimeout(() => setMassSuccessNotice(null), 4000);
    setIsMassModalOpen(false);
    setMassRawText('');
    setMassParsedStudents([]);
  };

  const loadExampleMassData = () => {
    const example = `Bernardo António Quaresma;M;2013-04-18;004819234LA088;7.ª Classe Turma A;António Quaresma;+244 923 111 444
Esperança Neves Domingos;F;2014-09-22;005912384LA021;4.ª Classe Turma A;Neves Domingos;+244 931 222 555
Mateus Francisco Gouveia;M;2013-11-05;006129845LA090;7.ª Classe Turma A;Francisco Gouveia;+244 912 333 666
Kieza Luísa Manuel;F;2010-02-14;007349120LA033;10.ª Classe Turma A;Luísa Manuel;+244 924 444 777
Afonso Pedro Sebastião;M;2014-06-30;008451290LA012;4.ª Classe Turma A;Pedro Sebastião;+244 935 555 888`;
    handleParseMassText(example);
  };

  const handleExportCSV = () => {
    const headers = ['Processo', 'Nome Completo', 'BI', 'Turma', 'Classe', 'Turno', 'Encarregado', 'Contacto', 'Estado'];
    const rows = filteredStudents.map((s) => [
      s.processNumber,
      `"${s.fullName}"`,
      s.identityCardNumber || 'S/BI',
      `"${s.className}"`,
      s.gradeLevel,
      s.shift,
      `"${s.guardianName}"`,
      s.guardianPhone,
      s.academicStatus
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lista_alunos_${currentInstitution.acronym || 'escola'}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL (Tema Dashboard Unificado) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            REGISTO E GESTÃO DE ALUNOS
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            Plataforma Multi-institucional NEUROEDUCA · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] text-xs font-bold px-3.5 py-2 rounded-xl border border-[#cde6d5] transition cursor-pointer"
            title="Exportar Lista de Estudantes para Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#067836]" />
            <span>Exportar CSV</span>
          </button>

          {!isSuperAdmin && !isProfessor && (
            <>
              <button
                onClick={() => {
                  setIsMassModalOpen(true);
                  if (!massRawText) loadExampleMassData();
                }}
                className="inline-flex items-center space-x-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                title="Importar múltiplos alunos por arquivo ou lote de texto"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#067836]" />
                <span>+ Matrícula em Massa (Lote)</span>
              </button>

              <button
                onClick={() => {
                  setFormProcess(`${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Matrícula Individual</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alerta de Restrição para Super Administrador */}
      {isSuperAdmin && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <div>
            <span className="font-bold">Restrição de Nível de Acesso (Super Administrador):</span>
            <span className="ml-1">
              O Super Administrador não tem permissões para realizar matrículas nem fazer matrícula (individual ou em massa). Esta operação compete exclusivamente à Secretaria e Direcção de cada Escola.
            </span>
          </div>
        </div>
      )}

      {/* Alerta Informativo para Professor */}
      {isProfessor && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
          <div>
            <span className="font-bold">Área do Professor / Docente:</span>
            <span className="ml-1">
              Visualização restrita aos estudantes da sua turma atribuída ({profTargetClass?.name || '4.ª Classe - Turma A'}). O lançamento e atribuição de notas estão disponíveis no separador "Lançamento de Notas".
            </span>
          </div>
        </div>
      )}

      {/* Alerta de Matrícula em Massa */}
      {massSuccessNotice && (
        <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
          <span>{massSuccessNotice}</span>
        </div>
      )}

      {/* 2. CARTÕES KPI DE MATRÍCULAS (ESTILO EXECUTIVO ESMERALDA) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Total Matriculados</span>
            <div className="font-display text-2xl font-extrabold text-[#064e26] tabular-nums">
              {instStudents.length}
            </div>
            <span className="text-[11px] text-[#4b6755] block">Nesta instituição</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Masculino (M)</span>
            <div className="font-display text-2xl font-extrabold text-[#064e26] tabular-nums">
              {instStudents.filter((s) => s.gender === 'M').length}
            </div>
            <span className="text-[11px] text-[#4b6755] block">Registo por género</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Feminino (F)</span>
            <div className="font-display text-2xl font-extrabold text-[#064e26] tabular-nums">
              {instStudents.filter((s) => s.gender === 'F').length}
            </div>
            <span className="text-[11px] text-[#4b6755] block">Registo por género</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Situação Regular</span>
            <div className="font-display text-2xl font-extrabold text-[#16a34a] tabular-nums">
              100%
            </div>
            <span className="text-[11px] text-[#4b6755] block">Ano Lectivo 2026/2027</span>
          </div>
        </div>
      </div>

      {/* Search and Functional Dropdown Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por nome, processo ou BI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] bg-[#f7fbf8] text-[#064e26] text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto lg:min-w-[460px]">
          <FunctionalDropdownFilter
            value={selectedClassFilter}
            onChange={(val) => setSelectedClassFilter(val)}
            options={classFilterOptions}
            icon={<Filter className="w-4 h-4 text-[#067836]" />}
            placeholder="Filtrar por turma..."
            searchable
          />

          <FunctionalDropdownFilter
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={statusFilterOptions}
            icon={<UserCheck className="w-4 h-4 text-[#16a34a]" />}
            placeholder="Filtrar por estado..."
            align="right"
          />
        </div>
      </div>

      {/* Table of Students with Interactive Row Click */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-extrabold flex items-center space-x-2">
            <UserCheck className="w-4 h-4" />
            <span>Lista Nominal de Estudantes ({filteredStudents.length})</span>
          </h2>
          <span className="text-[11px] text-white/85">
            Clique na linha para visualizar o Dossiê 360° do aluno
          </span>
        </div>

        {/* Dica de rolagem em telemóveis */}
        <div className="md:hidden px-4 py-1.5 bg-[#eaf6ee] border-b border-[#cde6d5] text-[11px] text-[#055827] flex items-center justify-between">
          <span>👉 Deslize horizontalmente para ver todos os dados</span>
          <span className="font-mono text-[#067836]">↔</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-[#f7fbf8] text-[#4b6755] uppercase font-bold border-b border-[#dce7df]">
                <th className="py-3 px-4">N.º Processo</th>
                <th className="py-3 px-4">Nome Completo do Aluno</th>
                <th className="py-3 px-4">BI / Cédula</th>
                <th className="py-3 px-4">Naturalidade</th>
                <th className="py-3 px-4">Turma / Classe</th>
                <th className="py-3 px-4">Encarregado(a)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef4f0] text-slate-700">
              {filteredStudents.map((stu) => {
                const birthYear = new Date(stu.birthDate).getFullYear();
                const age = 2026 - birthYear;

                return (
                  <tr
                    key={stu.id}
                    onClick={() => setSelectedStudentProfile(stu)}
                    className="hover:bg-[#f7fbf8] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#055827] bg-[#eaf6ee]/50">
                      {stu.processNumber}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#064e26] text-sm">{stu.fullName}</div>
                      <div className="text-[11px] text-[#4b6755]">
                        {stu.fatherName ? `Pai: ${stu.fatherName} · ` : ''}Mãe: {stu.motherName || 'Não declarada'}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stu.identityCardNumber || 'Cédula / S/BI'}
                      <span className="block text-[11px] text-[#4b6755] font-sans">
                        {age} anos ({stu.gender === 'M' ? 'M' : 'F'})
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{stu.birthProvince}</div>
                      <span className="text-[11px] text-[#4b6755]">{stu.birthMunicipality}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-[#064e26] block">{stu.className}</span>
                      <span className="text-[11px] text-[#4b6755]">
                        {stu.gradeLevel} {stu.courseName ? `· ${stu.courseName}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{stu.guardianName}</div>
                      <div className="text-[11px] text-[#4b6755] font-mono">{stu.guardianPhone}</div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#055827] capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                        <span>{stu.academicStatus}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex space-x-1">
                        <button
                          onClick={() => setSelectedStudentProfile(stu)}
                          className="bg-[#f7fbf8] hover:bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] p-1.5 rounded-lg transition cursor-pointer"
                          title="Ver Dossiê 360°"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onOpenDigitalArchive && (
                          <button
                            onClick={() => onOpenDigitalArchive(stu)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-[11px] font-semibold border border-amber-200 transition inline-flex items-center space-x-1 cursor-pointer"
                            title="Ver documentos enviados no Arquivo Digital"
                          >
                            <FolderArchive className="w-3 h-3" />
                            <span>
                              Arquivo ({digitalArchive.filter((d) => d.studentId === stu.id).length})
                            </span>
                          </button>
                        )}
                        {onOpenDocumentGenerator && (
                          <button
                            onClick={() => onOpenDocumentGenerator(stu, 'declaracao_matricula')}
                            className="bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#cde6d5] transition cursor-pointer"
                            title="Emitir Declaração de Matrícula"
                          >
                            Declaração
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 360° STUDENT PROFILE MODAL / DOSSIÊ ACADÉMICO */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#dce7df] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-6 py-4 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-white/15 border border-white/25 text-white font-black text-lg flex items-center justify-center">
                  {selectedStudentProfile.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedStudentProfile.fullName}
                  </h3>
                  <div className="text-xs text-white/85 flex items-center space-x-2 mt-0.5 font-mono">
                    <span>Processo: <strong>{selectedStudentProfile.processNumber}</strong></span>
                    <span>·</span>
                    <span>BI: <strong>{selectedStudentProfile.identityCardNumber || 'Constante do Processo'}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentProfile(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Informações Pessoais & Filiação */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#f7fbf8] rounded-xl border border-[#dce7df]">
                <div>
                  <span className="text-[#4b6755] block font-semibold">Data de Nascimento:</span>
                  <span className="text-[#064e26] font-bold">{formatAngolaDate(selectedStudentProfile.birthDate)}</span>
                </div>
                <div>
                  <span className="text-[#4b6755] block font-semibold">Naturalidade:</span>
                  <span className="text-[#064e26] font-bold">{selectedStudentProfile.birthMunicipality}, {selectedStudentProfile.birthProvince}</span>
                </div>
                <div>
                  <span className="text-[#4b6755] block font-semibold">Pai:</span>
                  <span className="text-slate-800">{selectedStudentProfile.fatherName || 'Não declarado'}</span>
                </div>
                <div>
                  <span className="text-[#4b6755] block font-semibold">Mãe:</span>
                  <span className="text-slate-800">{selectedStudentProfile.motherName || 'Não declarada'}</span>
                </div>
              </div>

              {/* Informações Académicas */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#eaf6ee] rounded-xl border border-[#cde6d5]">
                <div>
                  <span className="text-[#055827] block font-semibold">Turma Actual:</span>
                  <strong className="text-[#064e26] text-sm block">{selectedStudentProfile.className}</strong>
                </div>
                <div>
                  <span className="text-[#055827] block font-semibold">Classe / Nível:</span>
                  <strong className="text-[#064e26] text-sm block">{selectedStudentProfile.gradeLevel}</strong>
                </div>
                <div>
                  <span className="text-[#055827] block font-semibold">Turno / Sala:</span>
                  <strong className="text-[#064e26] text-sm block">{selectedStudentProfile.shift}</strong>
                </div>
              </div>

              {/* Encarregado de Educação */}
              <div className="p-3.5 bg-[#f7fbf8] rounded-xl border border-[#dce7df] flex items-center justify-between">
                <div>
                  <span className="text-[#4b6755] block font-semibold">Encarregado(a) de Educação ({selectedStudentProfile.guardianRelationship}):</span>
                  <strong className="text-[#064e26] text-sm">{selectedStudentProfile.guardianName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[#4b6755] block font-semibold">Contacto Telefónico:</span>
                  <span className="font-mono font-bold text-[#055827]">{selectedStudentProfile.guardianPhone}</span>
                </div>
              </div>

              {/* Acções Rápidas do Dossiê */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-[#dce7df]">
                {onOpenDigitalArchive && (
                  <button
                    onClick={() => {
                      const s = selectedStudentProfile;
                      setSelectedStudentProfile(null);
                      onOpenDigitalArchive(s);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-200 transition cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>
                      Arquivo Digital ({digitalArchive.filter((d) => d.studentId === selectedStudentProfile.id).length})
                    </span>
                  </button>
                )}
                {onOpenDocumentGenerator && (
                  <>
                    <button
                      onClick={() => {
                        const s = selectedStudentProfile;
                        setSelectedStudentProfile(null);
                        onOpenDocumentGenerator(s, 'declaracao_matricula');
                      }}
                      className="px-3 py-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] font-semibold rounded-xl border border-[#cde6d5] transition cursor-pointer"
                    >
                      Declaração de Matrícula
                    </button>
                    <button
                      onClick={() => {
                        const s = selectedStudentProfile;
                        setSelectedStudentProfile(null);
                        onOpenDocumentGenerator(s, 'boletim_trimestral');
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Boletim Trimestral
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Matrícula Novo Aluno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#dce7df] max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <GraduationCap className="w-5 h-5" />
                <span>Ficha Oficial de Matrícula de Aluno (Angola)</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="font-semibold text-[#064e26] block mb-1">
                    Nome Completo do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kizua Manuel Domingos"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] font-medium focus:outline-none focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Número de Processo * (Único)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2026/0148"
                    value={formProcess}
                    onChange={(e) => setFormProcess(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Bilhete de Identidade (BI) ou Cédula
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 008942150LA042"
                    value={formBi}
                    onChange={(e) => setFormBi(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Género</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Província de Origem</label>
                  <select
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    {ANGOLA_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Município de Nascimento</label>
                  <input
                    type="text"
                    placeholder="Ex: Kilamba Kiaxi"
                    value={formMunicipality}
                    onChange={(e) => setFormMunicipality(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome do Pai</label>
                  <input
                    type="text"
                    placeholder="Ex: Manuel Domingos Pedro"
                    value={formFather}
                    onChange={(e) => setFormFather(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome da Mãe</label>
                  <input
                    type="text"
                    placeholder="Ex: Francisca Paulo Kizua"
                    value={formMother}
                    onChange={(e) => setFormMother(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Encarregado(a) de Educação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Francisca Paulo Kizua"
                    value={formGuardianName}
                    onChange={(e) => setFormGuardianName(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Contacto do Encarregado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+244 923 000 000"
                    value={formGuardianPhone}
                    onChange={(e) => setFormGuardianPhone(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Turma a Inserir o Aluno *
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-bold"
                  >
                    <option value="">-- Seleccione a Turma --</option>
                    {instClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.enrolledStudentsCount}/{cls.maxCapacity} vagas ocupadas)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secção de Credenciais e Permissões do Aluno / Encarregado */}
                <div className="md:col-span-2 pt-2 border-t border-[#dce7df]">
                  <div className="font-bold text-xs uppercase tracking-wider text-[#067836] flex items-center space-x-1.5 mb-2">
                    <ShieldCheck className="w-4 h-4 text-[#067836]" />
                    <span>Acesso ao Portal do Aluno & Encarregado de Educação</span>
                  </div>

                  <div className="p-3 bg-[#eaf6ee] border border-[#cde6d5] rounded-xl text-xs text-[#055827] space-y-2 mb-3">
                    <div className="font-bold text-[11px] text-[#064e26]">
                      Permissões Oficiais Atribuídas ao Aluno / Encarregado nesta Matrícula:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#055827]">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                        <span>1. Consultar Médias das Notas por Trimestre</span>
                      </div>
                      <div className="flex items-center space-x-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                        <span>2. Consultar Frequências às Aulas</span>
                      </div>
                      <div className="flex items-center space-x-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                        <span>3. Consultar Propinas, Multicaixa &amp; Avisos</span>
                      </div>
                      <div className="flex items-center space-x-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                        <span>4. Consultar Taxa de Matrícula (Tesouraria)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[#064e26] block mb-1 text-xs">
                        E-mail de Acesso ao Portal (Aluno ou Encarregado)
                      </label>
                      <input
                        type="email"
                        placeholder="Ex: encarregado@sagradaesperanca.ao"
                        value={formPortalEmail}
                        onChange={(e) => setFormPortalEmail(e.target.value)}
                        className="w-full bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] text-xs focus:outline-none focus:border-[#067836]"
                      />
                      <span className="text-[10px] text-[#4b6755] mt-0.5 block">
                        Se vazio, será gerado: aluno.processo@{currentInstitution.acronym?.toLowerCase() || 'escola'}.ao
                      </span>
                    </div>

                    <div>
                      <label className="font-semibold text-[#064e26] block mb-1 text-xs">
                        Senha Inicial do Portal
                      </label>
                      <input
                        type="text"
                        value={formPortalPassword}
                        onChange={(e) => setFormPortalPassword(e.target.value)}
                        className="w-full bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] text-xs font-mono focus:outline-none focus:border-[#067836]"
                      />
                      <span className="text-[10px] text-[#4b6755] mt-0.5 block">
                        Padrão: 123 (pode ser alterada pelo utilizador)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#cde6d5] rounded-xl text-[#055827] bg-[#f7fbf8] hover:bg-[#eaf6ee] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirmar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MATRÍCULA EM MASSA (IMPORTAÇÃO EM LOTE / CSV) */}
      {isMassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-white/15 border border-white/25 text-white rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    MATRÍCULA EM MASSA DE ALUNOS (LOTE / CSV)
                  </h3>
                  <span className="text-xs text-white/85">
                    {currentInstitution.name} · Importação rápida para múltiplas turmas
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMassModalOpen(false)}
                className="p-1 rounded text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal com Scroll */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Barra de Instruções e Formato */}
              <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-xl p-3 text-[#055827] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="font-bold block mb-0.5">Formato das Colunas (separadas por ponto e vírgula ";" ou tabulação):</span>
                  <code className="text-[11px] font-mono bg-white/90 px-2 py-0.5 rounded-lg border border-[#cde6d5] block text-[#064e26]">
                    Nome Completo ; Género (M/F) ; Data Nasc (AAAA-MM-DD) ; N.º BI ; Turma ; Encarregado ; Telefone
                  </code>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <label className="inline-flex items-center space-x-1.5 bg-white border border-[#cde6d5] hover:bg-[#d7efe0] text-[#055827] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Arquivo .CSV</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            handleParseMassText(content);
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={loadExampleMassData}
                    className="bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-xs"
                  >
                    Exemplo (5 Alunos)
                  </button>
                </div>
              </div>

              {/* Área de Texto para Colar */}
              <div>
                <label className="font-bold text-[#064e26] block mb-1">
                  Cole os dados aqui (directo do Excel, Bloco de Notas ou CSV):
                </label>
                <textarea
                  rows={4}
                  value={massRawText}
                  onChange={(e) => handleParseMassText(e.target.value)}
                  placeholder="Bernardo António Quaresma;M;2013-04-18;004819234LA088;7.ª Classe Turma A;António Quaresma;+244 923 111 444&#10;Esperança Neves Domingos;F;2014-09-22;005912384LA021;4.ª Classe Turma A;Neves Domingos;+244 931 222 555"
                  className="w-full bg-[#f7fbf8] text-slate-800 font-mono text-[11px] rounded-xl p-3 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              {/* Tabela de Pré-visualização dos Alunos Detectados */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Pré-visualização dos Alunos Identificados ({massParsedStudents.length})
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Números de processo gerados automaticamente
                  </span>
                </div>

                <div className="border border-slate-200 rounded overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200">
                        <th className="py-2 px-3">Processo</th>
                        <th className="py-2 px-3">Nome Completo do Aluno</th>
                        <th className="py-2 px-3 text-center">Género</th>
                        <th className="py-2 px-3">Data Nasc.</th>
                        <th className="py-2 px-3">Turma Alocada</th>
                        <th className="py-2 px-3">Encarregado / Contacto</th>
                        <th className="py-2 px-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {massParsedStudents.length > 0 ? (
                        massParsedStudents.map((stu) => (
                          <tr key={stu.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-sky-700">
                              {stu.processNumber}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {stu.fullName}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  stu.gender === 'M'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-pink-100 text-pink-800'
                                }`}
                              >
                                {stu.gender === 'M' ? 'Masc' : 'Fem'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                              {stu.birthDate}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {stu.className} ({stu.gradeLevel})
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-medium block">{stu.guardianName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{stu.guardianPhone}</span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pronto</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            Nenhum dado colado. Insira as linhas no campo acima ou clique em "Exemplo (5 Alunos)".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="bg-[#f7fbf8] px-5 py-3 border-t border-[#dce7df] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-[#064e26]">
                Total para matricular:{' '}
                <span className="text-[#067836] text-sm font-black">
                  {massParsedStudents.length} Alunos
                </span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsMassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#055827] bg-white border border-[#cde6d5] hover:bg-[#eaf6ee] font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={massParsedStudents.length === 0}
                  onClick={handleConfirmMassEnrollment}
                  className={`px-5 py-2 rounded-xl text-white font-bold transition shadow-xs cursor-pointer ${
                    massParsedStudents.length > 0
                      ? 'bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Confirmar Matrícula em Massa ({massParsedStudents.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
