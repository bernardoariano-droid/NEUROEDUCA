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
  FolderArchive,
  Edit2,
  Trash2,
  FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
import { isExamAndRecourseEligible } from '../../utils/evaluationEngine';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';

interface MassParsedRow {
  rowIndex: number;
  student: Student;
  rawClassName: string;
  matchedClassId: string;
  error?: string;
}

interface StudentsManagerProps {
  currentInstitution: Institution;
  students: Student[];
  classes: ClassRoom[];
  onAddStudent: (newStudent: Student) => void;
  onUpdateStudent?: (updatedStudent: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
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
  onUpdateStudent,
  onDeleteStudent,
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
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
  const [massParsedRows, setMassParsedRows] = useState<MassParsedRow[]>([]);
  const [massUploadFileName, setMassUploadFileName] = useState<string | null>(null);
  const [massFileError, setMassFileError] = useState<string | null>(null);
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
  const [formAcademicStatus, setFormAcademicStatus] = useState<Student['academicStatus']>('matriculado');
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

  const openNewStudentModal = () => {
    setEditingStudent(null);
    setFormError(null);
    setFormName('');
    setFormProcess(`${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
    setFormBirthDate('2014-05-10');
    setFormGender('M');
    setFormBi('');
    setFormProvince(currentInstitution.province);
    setFormMunicipality(currentInstitution.municipality);
    setFormAddress('');
    setFormFather('');
    setFormMother('');
    setFormGuardianName('');
    setFormGuardianPhone('');
    setFormGuardianRel('Pai');
    setFormClassId(instClasses[0]?.id || '');
    setFormAcademicStatus('matriculado');
    setFormPortalEmail('');
    setFormPortalPassword('123');
    setIsModalOpen(true);
  };

  const openEditStudentModal = (stu: Student) => {
    setEditingStudent(stu);
    setFormError(null);
    setFormName(stu.fullName || '');
    setFormProcess(stu.processNumber || '');
    setFormBirthDate(stu.birthDate || '');
    setFormGender(stu.gender || 'M');
    setFormBi(stu.identityCardNumber || '');
    setFormProvince(stu.birthProvince || currentInstitution.province);
    setFormMunicipality(stu.birthMunicipality || currentInstitution.municipality);
    setFormAddress(stu.residentialAddress || '');
    setFormFather(stu.fatherName || '');
    setFormMother(stu.motherName || '');
    setFormGuardianName(stu.guardianName || '');
    setFormGuardianPhone(stu.guardianPhone || '');
    setFormGuardianRel(stu.guardianRelationship || 'Pai');
    setFormClassId(stu.classId || '');
    setFormAcademicStatus(stu.academicStatus || 'matriculado');
    setFormPortalEmail(stu.email || stu.guardianEmail || '');
    setFormPortalPassword(stu.portalPassword || '123');
    setIsModalOpen(true);
  };

  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim() || !formProcess.trim()) {
      setFormError('Nome completo e Número de Processo são obrigatórios.');
      return;
    }

    // Verificar duplicação de nº de processo (ignorando o próprio aluno quando em edição)
    const alreadyExists = instStudents.some(
      (s) =>
        s.id !== editingStudent?.id &&
        s.processNumber.trim().toLowerCase() === formProcess.trim().toLowerCase()
    );
    if (alreadyExists) {
      setFormError(`O Número de Processo "${formProcess}" já está em uso nesta instituição.`);
      return;
    }

    const assignedClass = instClasses.find((c) => c.id === formClassId) || (!editingStudent ? instClasses[0] : undefined);
    const studentLoginEmail =
      formPortalEmail.trim() ||
      `aluno.${formProcess.trim().replace(/[^a-zA-Z0-9]/g, '')}@${currentInstitution.acronym?.toLowerCase() || 'escola'}.ao`;

    if (editingStudent && onUpdateStudent) {
      const updatedStudent: Student = {
        ...editingStudent,
        processNumber: formProcess.trim(),
        fullName: formName.trim(),
        birthDate: formBirthDate.trim(),
        gender: formGender,
        identityCardNumber: formBi.trim() || undefined,
        birthProvince: formProvince,
        birthMunicipality: formMunicipality,
        residentialAddress: formAddress.trim() || `Bairro Central, ${formProvince}`,
        fatherName: formFather.trim() || undefined,
        motherName: formMother.trim() || undefined,
        guardianName: formGuardianName.trim(),
        guardianPhone: formGuardianPhone.trim(),
        guardianRelationship: formGuardianRel || 'Encarregado Principal',
        guardianEmail: studentLoginEmail,
        email: studentLoginEmail,
        portalPassword: formPortalPassword.trim() || '123',
        subsystemCode: assignedClass
          ? assignedClass.subsystemCode
          : editingStudent.subsystemCode || currentInstitution.subsystems[0],
        gradeLevel: assignedClass
          ? assignedClass.gradeLevel
          : editingStudent.gradeLevel || '1.ª Classe',
        courseName: assignedClass ? assignedClass.courseName : editingStudent.courseName,
        classId: assignedClass ? assignedClass.id : '',
        className: assignedClass ? assignedClass.name : 'Sem Turma Atribuída',
        shift: assignedClass ? assignedClass.shift : editingStudent.shift || 'manha',
        academicStatus: formAcademicStatus
      };

      onUpdateStudent(updatedStudent);
      if (selectedStudentProfile?.id === updatedStudent.id) {
        setSelectedStudentProfile(updatedStudent);
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      setMassSuccessNotice(`Dados do aluno "${updatedStudent.fullName}" actualizados com sucesso.`);
      setTimeout(() => setMassSuccessNotice(null), 4000);
      return;
    }

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      institutionId: currentInstitution.id,
      processNumber: formProcess.trim(),
      fullName: formName.trim(),
      birthDate: formBirthDate.trim(),
      gender: formGender,
      identityCardNumber: formBi.trim() || undefined,
      birthProvince: formProvince,
      birthMunicipality: formMunicipality,
      residentialAddress: formAddress.trim() || `Bairro Central, ${formProvince}`,
      fatherName: formFather.trim() || undefined,
      motherName: formMother.trim() || undefined,
      guardianName: formGuardianName.trim() || formFather.trim() || formMother.trim() || '',
      guardianPhone: formGuardianPhone.trim(),
      guardianRelationship: formGuardianRel,
      guardianEmail: studentLoginEmail,
      email: studentLoginEmail,
      portalPassword: formPortalPassword.trim() || '123',
      enrollmentFeePaid: false,
      subsystemCode: assignedClass ? assignedClass.subsystemCode : currentInstitution.subsystems[0],
      gradeLevel: assignedClass ? assignedClass.gradeLevel : '1.ª Classe',
      courseName: assignedClass?.courseName,
      classId: assignedClass ? assignedClass.id : '',
      className: assignedClass ? assignedClass.name : 'Sem Turma Atribuída',
      shift: assignedClass ? assignedClass.shift : 'manha',
      academicYear: '2026/2027',
      academicStatus: 'matriculado'
    };

    onAddStudent(newStudent);

    setIsModalOpen(false);
    setEditingStudent(null);

    // Reset
    setFormName('');
    setFormProcess('');
    setFormBi('');
    setFormPortalEmail('');
    setFormPortalPassword('123');
  };

  // Normalização de strings e reconhecimento inteligente de turmas criadas
  const normalizeMatchKey = (val: string): string =>
    String(val || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ªº°]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const matchClassByInput = (rawInput: string): ClassRoom | null => {
    const clean = String(rawInput || '').trim();
    if (!clean || instClasses.length === 0) return null;
    const key = normalizeMatchKey(clean);
    const compactKey = key.replace(/\s+/g, '');

    // 1. Correspondência exacta por Código ou Nome
    const exactMatch = instClasses.find(
      (c) =>
        normalizeMatchKey(c.code) === key ||
        normalizeMatchKey(c.code).replace(/\s+/g, '') === compactKey ||
        normalizeMatchKey(c.name) === key ||
        normalizeMatchKey(c.name).replace(/\s+/g, '') === compactKey
    );
    if (exactMatch) return exactMatch;

    // 2. Correspondência por "Classe + Código" ou inclusão directa
    const combinedMatch = instClasses.find((c) => {
      const codeNorm = normalizeMatchKey(c.code);
      const nameNorm = normalizeMatchKey(c.name);
      const gradeAndCode = normalizeMatchKey(`${c.gradeLevel} ${c.code}`);
      return (
        gradeAndCode === key ||
        nameNorm.includes(key) ||
        (key.length >= 2 && key.includes(nameNorm)) ||
        (codeNorm.length >= 2 && key === `${normalizeMatchKey(c.gradeLevel)} turma ${codeNorm}`)
      );
    });
    if (combinedMatch) return combinedMatch;

    // 3. Correspondência por número da classe + letra final (ex: "7A" ou "7 Classe A")
    const numMatch = key.match(/\d+/);
    const letterMatch = key.match(/\b([a-z])\s*$/) || compactKey.match(/\d+([a-z])$/);
    if (numMatch && letterMatch) {
      const targetNum = numMatch[0];
      const targetLetter = letterMatch[1];
      const heuristic = instClasses.find((c) => {
        const gradeDigits = normalizeMatchKey(c.gradeLevel).match(/\d+/)?.[0];
        const codeLast = normalizeMatchKey(c.code).slice(-1);
        const nameLast = normalizeMatchKey(c.name).match(/\b([a-z])\s*$/)?.[1];
        return gradeDigits === targetNum && (codeLast === targetLetter || nameLast === targetLetter);
      });
      if (heuristic) return heuristic;
    }

    return null;
  };

  const normalizeMassBirthDate = (raw: string): string => {
    const clean = String(raw || '').trim();
    if (!clean) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // DD/MM/AAAA ou DD-MM-AAAA
    const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (brMatch) {
      const day = brMatch[1].padStart(2, '0');
      const month = brMatch[2].padStart(2, '0');
      const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Número serial do Excel (ex: 41748)
    if (/^\d{4,5}(\.\d+)?$/.test(clean)) {
      const serial = Number(clean);
      if (serial > 1000 && serial < 100000) {
        const utcDays = Math.floor(serial - 25569);
        const d = new Date(utcDays * 86400 * 1000);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
      }
    }

    return clean;
  };

  const splitFiliacao = (rawFiliacao: string): { fatherName?: string; motherName?: string } => {
    const clean = String(rawFiliacao || '').trim();
    if (!clean) return {};
    const separators = [/\s+e\s+/i, /\s*\/\s*/, /\s*\|\s*/, /\s*&\s*/];
    for (const sep of separators) {
      const parts = clean.split(sep).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { fatherName: parts[0], motherName: parts.slice(1).join(' e ') };
      }
    }
    return { fatherName: clean };
  };

  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const processMassRows = (rawRows: string[][]) => {
    const nonEmptyRows = rawRows
      .map((r) => r.map((cell) => String(cell ?? '').trim()))
      .filter((r) => r.some((cell) => cell.length > 0));

    if (nonEmptyRows.length === 0) {
      setMassParsedRows([]);
      return;
    }

    const firstRowNorm = nonEmptyRows[0].map((c) => normalizeMatchKey(c));
    const hasHeader = firstRowNorm.some(
      (c) =>
        c.includes('nome') ||
        c.includes('aluno') ||
        c.includes('turma') ||
        c.includes('genero') ||
        c.includes('encarregado') ||
        c.includes('filiacao')
    );

    const findColIndex = (keywords: string[]): number =>
      firstRowNorm.findIndex((h) => keywords.some((kw) => h.includes(kw)));

    let colMap = {
      name: 0,
      turma: 1,
      gender: 2,
      birthDate: 3,
      bi: 4,
      filiacao: 5,
      father: -1,
      mother: -1,
      guardian: 6,
      phone: 7
    };

    if (hasHeader) {
      colMap = {
        name: findColIndex(['nome do aluno', 'nome completo', 'nome', 'aluno', 'estudante']),
        turma: findColIndex(['turma', 'codigo da turma', 'classe turma']),
        gender: findColIndex(['genero', 'sexo']),
        birthDate: findColIndex(['nascimento', 'data nasc', 'data de nasc']),
        bi: findColIndex(['bi', 'bilhete', 'identificacao', 'cedula']),
        filiacao: findColIndex(['filiacao']),
        father: findColIndex(['nome do pai', 'pai']),
        mother: findColIndex(['nome da mae', 'mae']),
        guardian: findColIndex(['encarregado']),
        phone: findColIndex(['telefone', 'contacto', 'telemovel', 'celular'])
      };
      if (colMap.name === -1) colMap.name = 0;
      if (colMap.turma === -1) colMap.turma = 1;
    }

    const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows;
    const baseProcessNum = instStudents.length + 400;
    const batchTs = Date.now();

    const parsed: MassParsedRow[] = dataRows.map((cols, idx) => {
      let fullName = '';
      let rawTurma = '';
      let rawGender = '';
      let rawBirth = '';
      let rawBi = '';
      let rawFiliacao = '';
      let rawFather = '';
      let rawMother = '';
      let rawGuardian = '';
      let rawPhone = '';

      if (hasHeader) {
        fullName = cols[colMap.name] || '';
        rawTurma = cols[colMap.turma] || '';
        rawGender = colMap.gender >= 0 ? cols[colMap.gender] || '' : '';
        rawBirth = colMap.birthDate >= 0 ? cols[colMap.birthDate] || '' : '';
        rawBi = colMap.bi >= 0 ? cols[colMap.bi] || '' : '';
        rawFiliacao = colMap.filiacao >= 0 ? cols[colMap.filiacao] || '' : '';
        rawFather = colMap.father >= 0 ? cols[colMap.father] || '' : '';
        rawMother = colMap.mother >= 0 ? cols[colMap.mother] || '' : '';
        rawGuardian = colMap.guardian >= 0 ? cols[colMap.guardian] || '' : '';
        rawPhone = colMap.phone >= 0 ? cols[colMap.phone] || '' : '';
      } else {
        // Suporte posicional: modelo padrão [Nome, Turma, Género, Nascimento, BI, Filiação, Encarregado, Telefone]
        // Compatibilidade legada se col[1] for apenas "M" ou "F"
        const looksLikeLegacy =
          cols.length >= 5 && ['M', 'F'].includes((cols[1] || '').trim().toUpperCase()) && !matchClassByInput(cols[1] || '');
        if (looksLikeLegacy) {
          fullName = cols[0] || '';
          rawGender = cols[1] || '';
          rawBirth = cols[2] || '';
          rawBi = cols[3] || '';
          rawTurma = cols[4] || '';
          rawGuardian = cols[5] || '';
          rawPhone = cols[6] || '';
        } else {
          fullName = cols[0] || '';
          rawTurma = cols[1] || '';
          rawGender = cols[2] || '';
          rawBirth = cols[3] || '';
          rawBi = cols[4] || '';
          rawFiliacao = cols[5] || '';
          rawGuardian = cols[6] || '';
          rawPhone = cols[7] || '';
        }
      }

      const matchedClass = matchClassByInput(rawTurma);
      const cleanName = fullName.trim();
      const genderNorm = rawGender.trim().toUpperCase();
      const gender: 'M' | 'F' = genderNorm.startsWith('F') ? 'F' : 'M';
      const parsedBirth = normalizeMassBirthDate(rawBirth);
      const filiacaoParts = splitFiliacao(rawFiliacao);
      const fatherName = rawFather.trim() || filiacaoParts.fatherName;
      const motherName = rawMother.trim() || filiacaoParts.motherName;
      const processNumber = `2026/${String(baseProcessNum + idx).padStart(4, '0')}`;
      const studentEmail = `aluno.${processNumber.replace(/[^a-zA-Z0-9]/g, '')}@${currentInstitution.acronym?.toLowerCase() || 'escola'}.ao`;

      let error: string | undefined;
      if (!cleanName) {
        error = 'Nome do aluno obrigatório';
      } else if (!rawTurma.trim()) {
        error = 'Turma obrigatória';
      } else if (!matchedClass) {
        error = instClasses.length === 0
          ? 'Nenhuma turma criada na escola'
          : `Turma "${rawTurma}" não encontrada`;
      }

      const student: Student = {
        id: `stu-mass-${batchTs}-${idx}`,
        institutionId: currentInstitution.id,
        processNumber,
        fullName: cleanName || `Aluno Linha ${idx + 1}`,
        birthDate: parsedBirth,
        gender,
        identityCardNumber: rawBi.trim() || undefined,
        birthProvince: currentInstitution.province,
        birthMunicipality: currentInstitution.municipality,
        residentialAddress: `Bairro Central, ${currentInstitution.province}`,
        fatherName,
        motherName,
        guardianName: rawGuardian.trim(),
        guardianPhone: rawPhone.trim(),
        guardianRelationship: 'Encarregado Principal',
        guardianEmail: studentEmail,
        email: studentEmail,
        portalPassword: '123',
        enrollmentFeePaid: false,
        subsystemCode: matchedClass ? matchedClass.subsystemCode : currentInstitution.subsystems[0],
        gradeLevel: matchedClass ? matchedClass.gradeLevel : '',
        courseName: matchedClass?.courseName,
        classId: matchedClass ? matchedClass.id : '',
        className: matchedClass ? matchedClass.name : rawTurma.trim() || 'Não atribuída',
        shift: matchedClass ? matchedClass.shift : 'manha',
        academicYear: '2026/2027',
        academicStatus: 'matriculado'
      };

      return {
        rowIndex: idx + 1,
        student,
        rawClassName: rawTurma.trim(),
        matchedClassId: matchedClass?.id || '',
        error
      };
    });

    setMassParsedRows(parsed);
  };

  const handleParseMassText = (text: string) => {
    setMassRawText(text);
    setMassFileError(null);
    if (!text.trim()) {
      setMassParsedRows([]);
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rows = lines.map((line) => {
      const delimiter = line.includes(';')
        ? ';'
        : line.includes('\t')
        ? '\t'
        : ',';
      return parseCsvLine(line, delimiter);
    });

    processMassRows(rows);
  };

  const handleMassFileUpload = async (file: File) => {
    setMassFileError(null);
    setMassUploadFileName(file.name);
    const lowerName = file.name.toLowerCase();

    try {
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setMassFileError('O ficheiro Excel está vazio.');
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          raw: false,
          defval: ''
        });
        const textPreview = rows
          .filter((r) => r.some((c) => String(c ?? '').trim().length > 0))
          .map((r) => r.map((c) => String(c ?? '').trim()).join(';'))
          .join('\n');
        setMassRawText(textPreview);
        processMassRows(rows);
      } else {
        const content = await file.text();
        handleParseMassText(content);
      }
    } catch (err: any) {
      setMassFileError(err?.message || 'Não foi possível ler o ficheiro seleccionado.');
    }
  };

  const handleReassignMassRowClass = (rowIndex: number, classId: string) => {
    const targetCls = instClasses.find((c) => c.id === classId);
    setMassParsedRows((prev) =>
      prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        if (!targetCls) {
          return {
            ...row,
            matchedClassId: '',
            error: !row.student.fullName.trim() ? 'Nome do aluno obrigatório' : 'Turma obrigatória'
          };
        }
        return {
          ...row,
          matchedClassId: targetCls.id,
          rawClassName: targetCls.name,
          error: !row.student.fullName.trim() ? 'Nome do aluno obrigatório' : undefined,
          student: {
            ...row.student,
            classId: targetCls.id,
            className: targetCls.name,
            gradeLevel: targetCls.gradeLevel,
            subsystemCode: targetCls.subsystemCode,
            courseName: targetCls.courseName,
            shift: targetCls.shift
          }
        };
      })
    );
  };

  const validMassRows = massParsedRows.filter((r) => !r.error && Boolean(r.matchedClassId));

  const handleConfirmMassEnrollment = () => {
    if (validMassRows.length === 0) return;
    const studentsToEnroll = validMassRows.map((r) => r.student);

    if (onAddMultipleStudents) {
      onAddMultipleStudents(studentsToEnroll);
    } else {
      studentsToEnroll.forEach((stu) => onAddStudent(stu));
    }

    setMassSuccessNotice(
      `Matrícula em massa concluída com sucesso! Foram matriculados ${studentsToEnroll.length} aluno(s) nas respectivas turmas.`
    );
    setTimeout(() => setMassSuccessNotice(null), 5000);
    setIsMassModalOpen(false);
    setMassRawText('');
    setMassParsedRows([]);
    setMassUploadFileName(null);
    setMassFileError(null);
  };

  const getTemplateExampleRows = (): string[][] => {
    const cls1 = instClasses[0]?.name || instClasses[0]?.code || '4.ª Classe - Turma A';
    const cls2 = instClasses[1]?.name || instClasses[1]?.code || cls1;
    return [
      [
        'Nome do Aluno *',
        'Turma *',
        'Género (M/F)',
        'Data de Nascimento (AAAA-MM-DD)',
        'Nº do BI',
        'Filiação',
        'Encarregado',
        'Telefone'
      ],
      [
        'Bernardo António Quaresma',
        cls1,
        'M',
        '2013-04-18',
        '004819234LA088',
        'António Quaresma e Maria Quaresma',
        'António Quaresma',
        '+244 923 111 444'
      ],
      [
        'Esperança Neves Domingos',
        cls2,
        '',
        '',
        '',
        '',
        '',
        ''
      ]
    ];
  };

  const handleDownloadMassExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const rows = getTemplateExampleRows();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 28 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
      { wch: 34 },
      { wch: 24 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Matrícula em Massa');

    const classesSheetRows: (string | number)[][] = [
      ['Código da Turma', 'Nome da Turma', 'Classe', 'Turno', 'Matriculados', 'Capacidade']
    ];
    if (instClasses.length > 0) {
      instClasses.forEach((c) => {
        classesSheetRows.push([
          c.code,
          c.name,
          c.gradeLevel,
          c.shift,
          c.enrolledStudentsCount,
          c.maxCapacity
        ]);
      });
    } else {
      classesSheetRows.push(['SEM-TURMA', 'Crie pelo menos uma turma em Turmas antes de importar', '-', '-', 0, 45]);
    }
    const wsClasses = XLSX.utils.aoa_to_sheet(classesSheetRows);
    wsClasses['!cols'] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsClasses, 'Turmas Disponíveis');

    XLSX.writeFile(
      wb,
      `Modelo_Matricula_Massa_${(currentInstitution.acronym || 'NEUROEDUCA').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
    );
  };

  const handleDownloadMassCsvTemplate = () => {
    const rows = getTemplateExampleRows();
    const csvBody = rows
      .map((r) =>
        r
          .map((cell) => {
            const safe = String(cell ?? '').replace(/"/g, '""');
            return safe.includes(';') || safe.includes('"') ? `"${safe}"` : safe;
          })
          .join(';')
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Modelo_Matricula_Massa_${(currentInstitution.acronym || 'NEUROEDUCA').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadExampleMassData = () => {
    const rows = getTemplateExampleRows();
    const text = rows.map((r) => r.join(';')).join('\n');
    setMassUploadFileName(null);
    handleParseMassText(text);
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
      `"${s.guardianName || ''}"`,
      s.guardianPhone || '',
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
                  setMassFileError(null);
                  setIsMassModalOpen(true);
                  if (!massRawText) loadExampleMassData();
                }}
                className="inline-flex items-center space-x-1.5 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                title="Descarregar modelo CSV/Excel e importar múltiplos alunos"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#067836]" />
                <span>+ Matrícula em Massa (CSV / Excel)</span>
              </button>

              <button
                onClick={openNewStudentModal}
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
                const parsedBirthYear = stu.birthDate ? new Date(stu.birthDate).getFullYear() : NaN;
                const age = !isNaN(parsedBirthYear) && parsedBirthYear > 1900 ? 2026 - parsedBirthYear : null;

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
                        {stu.fatherName ? `Pai: ${stu.fatherName}` : ''}
                        {stu.fatherName && stu.motherName ? ' · ' : ''}
                        {stu.motherName ? `Mãe: ${stu.motherName}` : !stu.fatherName ? 'Filiação por preencher' : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-800">
                      {stu.identityCardNumber || 'Por preencher'}
                      <span className="block text-[11px] text-[#4b6755] font-sans">
                        {age !== null ? `${age} anos` : 'Nasc. pendente'} ({stu.gender === 'F' ? 'F' : 'M'})
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{stu.birthProvince}</div>
                      <span className="text-[11px] text-[#4b6755]">{stu.birthMunicipality}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`font-bold block ${stu.classId ? 'text-[#064e26]' : 'text-amber-700'}`}>
                        {stu.className || 'Sem Turma Atribuída'}
                      </span>
                      <span className="text-[11px] text-[#4b6755]">
                        {stu.gradeLevel || 'Classe pendente'} {stu.courseName ? `· ${stu.courseName}` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {stu.guardianName || <span className="text-slate-400 italic">Por preencher</span>}
                      </div>
                      <div className="text-[11px] text-[#4b6755] font-mono">
                        {stu.guardianPhone || 'Sem contacto'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#055827] capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                        <span>{stu.academicStatus}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentProfile(stu)}
                          className="bg-[#f7fbf8] hover:bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] p-1.5 rounded-lg transition cursor-pointer"
                          title="Ver Dossiê 360°"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isSuperAdmin && !isProfessor && onUpdateStudent && (
                          <button
                            type="button"
                            onClick={() => openEditStudentModal(stu)}
                            className="bg-[#f7fbf8] hover:bg-[#eaf6ee] text-[#055827] border border-[#cde6d5] px-2 py-1 rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1 cursor-pointer"
                            title="Editar dados do aluno"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        )}
                        {!isSuperAdmin && !isProfessor && onDeleteStudent && (
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(stu)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1 cursor-pointer"
                            title="Apagar aluno"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Apagar</span>
                          </button>
                        )}
                        {onOpenDigitalArchive && (
                          <button
                            type="button"
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
                            type="button"
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
                  <span className="text-[#064e26] font-bold">
                    {selectedStudentProfile.birthDate
                      ? formatAngolaDate(selectedStudentProfile.birthDate)
                      : 'Por preencher'}
                  </span>
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
                  <strong className="text-[#064e26] text-sm">
                    {selectedStudentProfile.guardianName || 'Por preencher'}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[#4b6755] block font-semibold">Contacto Telefónico:</span>
                  <span className="font-mono font-bold text-[#055827]">
                    {selectedStudentProfile.guardianPhone || 'Por preencher'}
                  </span>
                </div>
              </div>

              {/* Acções Rápidas do Dossiê */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#dce7df]">
                <div className="flex flex-wrap items-center gap-2">
                  {!isSuperAdmin && !isProfessor && onUpdateStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedStudentProfile;
                        setSelectedStudentProfile(null);
                        openEditStudentModal(s);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#f7fbf8] hover:bg-[#eaf6ee] text-[#055827] font-bold rounded-xl border border-[#cde6d5] transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Dados</span>
                    </button>
                  )}
                  {!isSuperAdmin && !isProfessor && onDeleteStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = selectedStudentProfile;
                        setSelectedStudentProfile(null);
                        setStudentToDelete(s);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Apagar</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
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
        </div>
      )}

      {/* Modal Matrícula / Edição de Aluno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#dce7df] max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <GraduationCap className="w-5 h-5" />
                <span>
                  {editingStudent
                    ? `Editar Ficha do Aluno: ${editingStudent.fullName}`
                    : 'Ficha Oficial de Matrícula de Aluno (Angola)'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStudent(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStudent} className="p-6 space-y-3.5 text-xs">
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
                    onChange={(e) => setFormGender(e.target.value as 'M' | 'F')}
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
                    Encarregado(a) de Educação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Francisca Paulo Kizua"
                    value={formGuardianName}
                    onChange={(e) => setFormGuardianName(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Contacto do Encarregado
                  </label>
                  <input
                    type="text"
                    placeholder="+244 923 000 000"
                    value={formGuardianPhone}
                    onChange={(e) => setFormGuardianPhone(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div className={editingStudent ? '' : 'md:col-span-2'}>
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

                {editingStudent && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Estado Académico
                    </label>
                    <select
                      value={formAcademicStatus}
                      onChange={(e) => setFormAcademicStatus(e.target.value as Student['academicStatus'])}
                      className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-semibold"
                    >
                      <option value="matriculado">Matriculado</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="transferido">Transferido</option>
                      <option value="desistente">Desistente</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </div>
                )}

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
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 border border-[#cde6d5] rounded-xl text-[#055827] bg-[#f7fbf8] hover:bg-[#eaf6ee] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingStudent ? 'Guardar Alterações' : 'Confirmar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Apagar Aluno */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-600 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirmar Remoção de Aluno</span>
              </h3>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p>
                Tem a certeza que deseja apagar o aluno{' '}
                <strong className="text-slate-900">{studentToDelete.fullName}</strong> (Processo nº{' '}
                <strong className="font-mono">{studentToDelete.processNumber}</strong>)?
              </p>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = studentToDelete;
                    setStudentToDelete(null);
                    onDeleteStudent?.(target.id);
                    setMassSuccessNotice(`Registo do aluno "${target.fullName}" removido com sucesso.`);
                    setTimeout(() => setMassSuccessNotice(null), 4000);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                >
                  Apagar Aluno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MATRÍCULA EM MASSA (IMPORTAÇÃO EM LOTE / CSV / EXCEL) */}
      {isMassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#dce7df] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-white/15 border border-white/25 text-white rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    MATRÍCULA EM MASSA DE ALUNOS (EXCEL / CSV)
                  </h3>
                  <span className="text-xs text-white/85">
                    {currentInstitution.name} · Descarregue o modelo, preencha e carregue para enquadrar nas turmas criadas
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMassModalOpen(false)}
                className="p-1 rounded text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal com Scroll */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Passo 1: Descarregar Modelo & Regras de Campos */}
              <div className="bg-[#eaf6ee] border border-[#cde6d5] rounded-xl p-3.5 text-[#055827] space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <span className="font-bold block text-[#064e26] text-xs mb-1">
                      1. Descarregue o modelo oficial e preencha os alunos:
                    </span>
                    <div className="text-[11px] space-y-0.5">
                      <div>
                        <strong className="text-[#064e26]">Campos Obrigatórios:</strong>{' '}
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#cde6d5]">Nome do Aluno *</span>{' '}
                        e{' '}
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#cde6d5]">Turma *</span>{' '}
                        (nome ou código de uma turma criada na escola).
                      </div>
                      <div>
                        <strong className="text-[#064e26]">Campos Opcionais (editáveis depois):</strong>{' '}
                        Género, Data de Nascimento, Nº do BI, Filiação, Encarregado e Telefone.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadMassExcelTemplate}
                      className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-xs"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Modelo Excel (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadMassCsvTemplate}
                      className="inline-flex items-center space-x-1.5 bg-white border border-[#cde6d5] hover:bg-[#d7efe0] text-[#055827] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Modelo CSV (.csv)</span>
                    </button>

                    <label className="inline-flex items-center space-x-1.5 bg-white border border-[#067836] hover:bg-[#d7efe0] text-[#064e26] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[#067836]" />
                      <span>Carregar Excel / CSV</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleMassFileUpload(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                {instClasses.length > 0 ? (
                  <div className="pt-2 border-t border-[#cde6d5] text-[11px] flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-[#064e26]">Turmas criadas disponíveis:</span>
                    {instClasses.map((c) => (
                      <span
                        key={c.id}
                        className="bg-white/90 border border-[#cde6d5] px-2 py-0.5 rounded-lg font-mono text-[10px] text-[#055827]"
                      >
                        {c.code} · {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] font-medium">
                    Atenção: Ainda não existem turmas criadas nesta instituição. Crie pelo menos uma turma no módulo "Turmas" para enquadrar os alunos importados.
                  </div>
                )}
              </div>

              {massUploadFileName && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 flex items-center justify-between text-xs">
                  <span>
                    Ficheiro carregado: <strong>{massUploadFileName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={loadExampleMassData}
                    className="text-sky-700 font-bold hover:underline cursor-pointer"
                  >
                    Repor exemplo
                  </button>
                </div>
              )}

              {massFileError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center space-x-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{massFileError}</span>
                </div>
              )}

              {/* Área de Texto para Colar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#064e26]">
                    2. Pré-visualização / Edição rápida em texto (ou cole directamente do Excel):
                  </label>
                  <button
                    type="button"
                    onClick={loadExampleMassData}
                    className="text-[11px] font-bold text-[#067836] hover:underline cursor-pointer"
                  >
                    Carregar Exemplo
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={massRawText}
                  onChange={(e) => handleParseMassText(e.target.value)}
                  placeholder="Nome do Aluno *;Turma *;Género;Data Nasc.;BI;Filiação;Encarregado;Telefone&#10;Bernardo António Quaresma;4.ª Classe - Turma A;;;;;;"
                  className="w-full bg-[#f7fbf8] text-slate-800 font-mono text-[11px] rounded-xl p-3 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>

              {/* Tabela de Pré-visualização dos Alunos Detectados */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Pré-visualização dos Alunos Identificados ({validMassRows.length} prontos de {massParsedRows.length})
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Campos opcionais em branco podem ser editados depois na ficha do aluno
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 border-b border-slate-200">
                        <th className="py-2 px-3">Processo</th>
                        <th className="py-2 px-3">Nome do Aluno *</th>
                        <th className="py-2 px-3">Turma Enquadrada *</th>
                        <th className="py-2 px-3 text-center">Género</th>
                        <th className="py-2 px-3">Nasc. / BI</th>
                        <th className="py-2 px-3">Filiação / Encarregado</th>
                        <th className="py-2 px-3 text-center">Validação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {massParsedRows.length > 0 ? (
                        massParsedRows.map((row) => {
                          const stu = row.student;
                          return (
                            <tr key={row.rowIndex} className={row.error ? 'bg-red-50/50' : 'hover:bg-slate-50'}>
                              <td className="py-2 px-3 font-mono font-bold text-sky-700">
                                {stu.processNumber}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {stu.fullName}
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={row.matchedClassId}
                                  onChange={(e) => handleReassignMassRowClass(row.rowIndex, e.target.value)}
                                  className={`w-full max-w-[220px] rounded-lg px-2 py-1 text-xs font-semibold border ${
                                    row.matchedClassId
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                      : 'bg-red-50 border-red-300 text-red-800'
                                  }`}
                                >
                                  <option value="">
                                    {row.rawClassName
                                      ? `-- "${row.rawClassName}" não encontrada --`
                                      : '-- Seleccione a turma --'}
                                  </option>
                                  {instClasses.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                      {cls.code} · {cls.name}
                                    </option>
                                  ))}
                                </select>
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
                                <div>{stu.birthDate || 'Opcional'}</div>
                                <div className="text-[10px] text-slate-400">{stu.identityCardNumber || 'S/BI'}</div>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium block">
                                  {stu.guardianName || stu.fatherName || 'Opcional'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {stu.guardianPhone || 'Sem telefone'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.error ? (
                                  <span className="inline-flex items-center space-x-1 text-red-700 font-bold text-[10px]">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{row.error}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[10px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>Pronto</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            Nenhum dado carregado. Descarregue o modelo Excel/CSV, preencha e carregue o ficheiro acima.
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
                Prontos para matricular:{' '}
                <span className="text-[#067836] text-sm font-black">
                  {validMassRows.length} Aluno(s)
                </span>
                {massParsedRows.length > validMassRows.length && (
                  <span className="ml-2 text-red-600 font-semibold">
                    ({massParsedRows.length - validMassRows.length} com erro de turma/nome)
                  </span>
                )}
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
                  disabled={validMassRows.length === 0}
                  onClick={handleConfirmMassEnrollment}
                  className={`px-5 py-2 rounded-xl text-white font-bold transition shadow-xs cursor-pointer ${
                    validMassRows.length > 0
                      ? 'bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Confirmar Matrícula em Massa ({validMassRows.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
