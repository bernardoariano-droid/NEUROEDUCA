/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Arquivo Digital Escolar
 * Envio de documentos escolares por Alunos e Encarregados de Educação
 * Visualização, descarga e validação pelo Professor e Administrador Escolar
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderArchive,
  Upload,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  Search,
  GraduationCap,
  Layers,
  Filter,
  X,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  MessageSquare,
  Plus,
  Cloud
} from 'lucide-react';
import {
  Institution,
  Student,
  ClassRoom,
  Teacher,
  UserProfile,
  UserRole,
  DigitalArchiveDocument,
  DigitalArchiveCategory,
  DigitalArchiveStatus
} from '../../types';
import {
  FunctionalDropdownFilter,
  FunctionalDropdownOption
} from '../common/FunctionalDropdownFilter';
import { resolveAuthorizedStudentsForUser } from '../../utils/studentAccess';
import { resolveSignedStudentDocumentUrl } from '../../lib/supabaseClient';

export const ARCHIVE_CATEGORY_META: Record<
  DigitalArchiveCategory,
  { label: string; shortLabel: string; description: string; group: string }
> = {
  bilhete_identidade: {
    label: 'Bilhete de Identidade (BI) / Cédula',
    shortLabel: 'Bilhete de Identidade',
    description: 'Documento de identificação civil (frente e verso)',
    group: 'Identificação Pessoal'
  },
  certidao_nascimento: {
    label: 'Certidão de Nascimento / Assento',
    shortLabel: 'Certidão Nascimento',
    description: 'Registo civil de nascimento do estudante',
    group: 'Identificação Pessoal'
  },
  fotografia_passe: {
    label: 'Fotografia Tipo Passe',
    shortLabel: 'Foto Tipo Passe',
    description: 'Fotografia actualizada para processo e cartão',
    group: 'Identificação Pessoal'
  },
  certificado_habilitacoes: {
    label: 'Certificado / Declaração de Habilitações',
    shortLabel: 'Certificado Anterior',
    description: 'Comprovativo de conclusão da classe ou ciclo anterior',
    group: 'Histórico Académico'
  },
  boletim_anterior: {
    label: 'Boletim de Notas / Pauta Anterior',
    shortLabel: 'Boletim Anterior',
    description: 'Histórico de aproveitamento lectivo anterior',
    group: 'Histórico Académico'
  },
  declaracao_transferencia: {
    label: 'Guia / Declaração de Transferência',
    shortLabel: 'Transferência',
    description: 'Guia oficial de transferência escolar (MED)',
    group: 'Histórico Académico'
  },
  atestado_medico: {
    label: 'Atestado Médico / Ficha de Saúde',
    shortLabel: 'Atestado Médico',
    description: 'Aptidão clínica para actividades escolares e educação física',
    group: 'Saúde & Assiduidade'
  },
  cartao_vacinas: {
    label: 'Cartão de Vacinas',
    shortLabel: 'Cartão de Vacinas',
    description: 'Registo actualizado do Programa Alargado de Vacinação',
    group: 'Saúde & Assiduidade'
  },
  comprovativo_pagamento: {
    label: 'Comprovativo de Pagamento / Talão',
    shortLabel: 'Talão Pagamento',
    description: 'Talão Multicaixa, depósito ou transferência bancária',
    group: 'Secretaria & Tesouraria'
  },
  outro: {
    label: 'Outro Documento Escolar',
    shortLabel: 'Outro Documento',
    description: 'Requerimento, justificação de falta ou autorização',
    group: 'Secretaria & Tesouraria'
  }
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

interface DigitalArchiveCenterProps {
  currentInstitution: Institution;
  students: Student[];
  classes: ClassRoom[];
  documents: DigitalArchiveDocument[];
  onAddDocument: (
    doc: DigitalArchiveDocument,
    fileDataBase64?: string
  ) => Promise<void> | void;
  onUpdateStatus: (
    docId: string,
    status: DigitalArchiveStatus,
    reviewNotes?: string
  ) => void;
  onDeleteDocument: (docId: string) => void;
  currentUser?: UserProfile | null;
  activeRole?: UserRole;
  currentTeacher?: Teacher | null;
  lockedStudentId?: string;
  initialStudentId?: string;
  initialSearchTerm?: string;
  navigationKey?: number;
  embedded?: boolean;
}

export const DigitalArchiveCenter: React.FC<DigitalArchiveCenterProps> = ({
  currentInstitution,
  students,
  classes,
  documents,
  onAddDocument,
  onUpdateStatus,
  onDeleteDocument,
  currentUser,
  activeRole,
  currentTeacher,
  lockedStudentId,
  initialStudentId,
  initialSearchTerm,
  navigationKey,
  embedded = false
}) => {
  const isStudentMode =
    currentUser?.role === 'aluno' ||
    currentUser?.role === 'encarregado_educacao' ||
    activeRole === 'aluno' ||
    activeRole === 'encarregado_educacao';

  const isGuardianMode =
    currentUser?.role === 'encarregado_educacao' ||
    activeRole === 'encarregado_educacao';

  const isProfessorMode =
    !isStudentMode &&
    (currentUser?.role === 'professor' ||
      currentUser?.role === 'director_turma' ||
      activeRole === 'professor' ||
      activeRole === 'director_turma');

  const isSchoolAdminMode = !isStudentMode && !isProfessorMode;
  const canReviewDocuments = isProfessorMode || isSchoolAdminMode;

  const instStudents = useMemo(
    () => students.filter((s) => s.institutionId === currentInstitution.id),
    [students, currentInstitution.id]
  );

  const instClasses = useMemo(
    () => classes.filter((c) => c.institutionId === currentInstitution.id),
    [classes, currentInstitution.id]
  );

  // Turmas visíveis conforme o perfil
  const professorClasses = useMemo(() => {
    if (!isProfessorMode) return instClasses;
    const assignedIds =
      currentTeacher?.assignedClasses?.map((a) => a.classId) ||
      instClasses
        .filter((c) => c.classDirectorId === currentTeacher?.id)
        .map((c) => c.id);
    const matched = instClasses.filter((c) => assignedIds.includes(c.id));
    return matched.length > 0 ? matched : instClasses.slice(0, 1);
  }, [isProfessorMode, instClasses, currentTeacher]);

  // Identificação estrita do(s) aluno(s) visíveis pelo utilizador (sem acesso a outros alunos)
  const authorizedStudentsForSession = useMemo(() => {
    if (!isStudentMode) return [];
    return resolveAuthorizedStudentsForUser(
      students,
      currentInstitution.id,
      currentUser,
      activeRole
    );
  }, [isStudentMode, students, currentInstitution.id, currentUser, activeRole]);

  const loggedInStudent = useMemo(() => {
    if (!isStudentMode) return null;
    if (lockedStudentId) {
      return (
        authorizedStudentsForSession.find((s) => s.id === lockedStudentId) || null
      );
    }
    return authorizedStudentsForSession[0] || null;
  }, [isStudentMode, lockedStudentId, authorizedStudentsForSession]);

  const scopedStudents = useMemo(() => {
    if (isStudentMode) {
      if (lockedStudentId) {
        return loggedInStudent ? [loggedInStudent] : [];
      }
      return authorizedStudentsForSession;
    }
    if (isProfessorMode) {
      const clsIds = new Set(professorClasses.map((c) => c.id));
      return instStudents.filter((s) => clsIds.has(s.classId));
    }
    return instStudents;
  }, [
    isStudentMode,
    lockedStudentId,
    loggedInStudent,
    authorizedStudentsForSession,
    isProfessorMode,
    professorClasses,
    instStudents
  ]);

  const canUploadDocuments =
    (isStudentMode && scopedStudents.length > 0) || isSchoolAdminMode;

  const scopedStudentIds = useMemo(
    () => new Set(scopedStudents.map((s) => s.id)),
    [scopedStudents]
  );

  // Documentos visíveis no arquivo para o perfil actual
  const scopedDocuments = useMemo(() => {
    return documents
      .filter((d) => d.institutionId === currentInstitution.id)
      .filter((d) => scopedStudentIds.has(d.studentId))
      .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  }, [documents, currentInstitution.id, scopedStudentIds]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [classFilter, setClassFilter] = useState('todas');
  const [studentFilter, setStudentFilter] = useState(initialStudentId || 'todos');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | DigitalArchiveCategory>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | DigitalArchiveStatus>('todos');

  // Estados do formulário de envio
  const [showUploadForm, setShowUploadForm] = useState(isStudentMode);
  const [uploadStudentId, setUploadStudentId] = useState<string>(
    lockedStudentId || loggedInStudent?.id || scopedStudents[0]?.id || ''
  );
  const [uploadCategory, setUploadCategory] =
    useState<DigitalArchiveCategory>('bilhete_identidade');
  const [uploadTitle, setUploadTitle] = useState(
    ARCHIVE_CATEGORY_META.bilhete_identidade.label
  );
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visualizador e Revisão
  const [previewDoc, setPreviewDoc] = useState<DigitalArchiveDocument | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [reviewNotesDraft, setReviewNotesDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (lockedStudentId && scopedStudents.some((s) => s.id === lockedStudentId)) {
      setUploadStudentId(lockedStudentId);
      setStudentFilter(lockedStudentId);
    } else if (isStudentMode) {
      const validIds = new Set(scopedStudents.map((s) => s.id));
      if (!validIds.has(uploadStudentId)) {
        setUploadStudentId(scopedStudents[0]?.id || '');
      }
      if (studentFilter !== 'todos' && !validIds.has(studentFilter)) {
        setStudentFilter(scopedStudents.length === 1 ? scopedStudents[0].id : 'todos');
      }
    } else if (!uploadStudentId && scopedStudents[0]) {
      setUploadStudentId(scopedStudents[0].id);
    }
  }, [lockedStudentId, isStudentMode, scopedStudents, uploadStudentId, studentFilter]);

  useEffect(() => {
    if (navigationKey === undefined) return;
    if (initialStudentId) {
      setStudentFilter(initialStudentId);
    }
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [navigationKey, initialStudentId, initialSearchTerm]);

  useEffect(() => {
    if (previewDoc) {
      setReviewNotesDraft(previewDoc.reviewNotes || '');
    }
  }, [previewDoc]);

  const handleCategoryChange = (cat: DigitalArchiveCategory) => {
    const prevDefault = ARCHIVE_CATEGORY_META[uploadCategory]?.label;
    setUploadCategory(cat);
    if (!uploadTitle.trim() || uploadTitle === prevDefault) {
      setUploadTitle(ARCHIVE_CATEGORY_META[cat].label);
    }
  };

  const handleFilePicked = (file: File | null | undefined) => {
    if (!file) return;
    setUploadError(null);

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];
    const isAllowed =
      allowedTypes.includes(file.type) ||
      /\.(pdf|jpe?g|png|webp)$/i.test(file.name);

    if (!isAllowed) {
      setUploadError(
        'Formato não suportado. Por favor, envie ficheiros PDF, JPG, PNG ou WebP.'
      );
      return;
    }

    const maxBytes = 12 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        'O ficheiro ultrapassa o limite máximo de 12 MB. Comprima ou envie uma digitalização mais leve.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile(file);
      setSelectedFileBase64(String(reader.result || ''));
    };
    reader.onerror = () => {
      setUploadError('Não foi possível ler o ficheiro seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    const targetStudent =
      scopedStudents.find((s) => s.id === uploadStudentId) ||
      loggedInStudent ||
      scopedStudents[0];

    if (!targetStudent) {
      setUploadError('Seleccione o estudante a que pertence o documento.');
      return;
    }

    if (!selectedFile || !selectedFileBase64) {
      setUploadError('Seleccione ou arraste o ficheiro (PDF ou imagem) antes de enviar.');
      return;
    }

    const finalTitle =
      uploadTitle.trim() || ARCHIVE_CATEGORY_META[uploadCategory].label;

    setIsUploading(true);
    try {
      const inferredMime =
        selectedFile.type ||
        (selectedFile.name.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : 'image/jpeg');

      const newDoc: DigitalArchiveDocument = {
        id: `arch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        institutionId: currentInstitution.id,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        studentProcessNumber: targetStudent.processNumber,
        classId: targetStudent.classId,
        className: targetStudent.className,
        gradeLevel: targetStudent.gradeLevel,
        category: uploadCategory,
        title: finalTitle,
        description: uploadDescription.trim() || undefined,
        fileName: selectedFile.name,
        mimeType: inferredMime,
        fileSizeBytes: selectedFile.size,
        dataUrl: selectedFileBase64,
        uploadedByUserId: currentUser?.id || 'usr-local',
        uploadedByName:
          currentUser?.fullName ||
          (isGuardianMode ? targetStudent.guardianName : targetStudent.fullName),
        uploadedByRole: currentUser?.role || activeRole || 'aluno',
        uploadedAt: new Date().toISOString(),
        status: isSchoolAdminMode ? 'validado' : 'pendente',
        ...(isSchoolAdminMode
          ? {
              reviewedByName: currentUser?.fullName || 'Secretaria Escolar',
              reviewedByRole: 'Administrador Escolar',
              reviewedAt: new Date().toISOString(),
              reviewNotes: 'Arquivado e validado pela Secretaria Escolar.'
            }
          : {})
      };

      await onAddDocument(newDoc, selectedFileBase64);

      setSelectedFile(null);
      setSelectedFileBase64(null);
      setUploadDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!isStudentMode) setShowUploadForm(false);

      setFeedbackNotice(
        `Documento "${finalTitle}" enviado com sucesso para o Arquivo Digital de ${targetStudent.fullName}!`
      );
      setTimeout(() => setFeedbackNotice(null), 5000);
    } catch {
      setUploadError('Ocorreu um erro ao enviar o documento. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReviewAction = (
    doc: DigitalArchiveDocument,
    nextStatus: DigitalArchiveStatus,
    notes?: string
  ) => {
    onUpdateStatus(doc.id, nextStatus, notes?.trim() || undefined);
    if (previewDoc && previewDoc.id === doc.id) {
      setPreviewDoc({
        ...previewDoc,
        status: nextStatus,
        reviewedByName: currentUser?.fullName || (isProfessorMode ? 'Docente' : 'Administrador Escolar'),
        reviewedAt: new Date().toISOString(),
        reviewNotes: notes?.trim() || undefined
      });
    }
    setFeedbackNotice(
      nextStatus === 'validado'
        ? `Documento "${doc.title}" validado com sucesso.`
        : `Documento "${doc.title}" marcado para reenvio / correcção.`
    );
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // Opções para filtros suspensos profissionais
  const classOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const base: FunctionalDropdownOption[] = [
      {
        value: 'todas',
        label: 'Todas as Turmas Permitidas',
        description: `${professorClasses.length} turma(s) disponível(eis)`,
        group: 'Filtro Geral',
        badge: `${professorClasses.length}`,
        badgeTone: 'emerald'
      }
    ];
    professorClasses.forEach((cls) => {
      const count = scopedDocuments.filter((d) => d.classId === cls.id).length;
      base.push({
        value: cls.id,
        label: cls.name,
        description: `${cls.gradeLevel} · Turno ${cls.shift} · ${count} doc(s)`,
        group: 'Turmas',
        badge: `${count} doc(s)`,
        badgeTone: count > 0 ? 'emerald' : 'slate'
      });
    });
    return base;
  }, [professorClasses, scopedDocuments]);

  const studentOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const base: FunctionalDropdownOption[] = [
      {
        value: 'todos',
        label: 'Todos os Estudantes',
        description: `${scopedStudents.length} estudante(s) no escopo`,
        group: 'Filtro Geral',
        badge: `${scopedStudents.length}`,
        badgeTone: 'emerald'
      }
    ];
    scopedStudents.forEach((stu) => {
      const count = scopedDocuments.filter((d) => d.studentId === stu.id).length;
      base.push({
        value: stu.id,
        label: stu.fullName,
        description: `Proc. ${stu.processNumber} · ${stu.className}`,
        group: stu.className,
        badge: `${count} doc(s)`,
        badgeTone: count > 0 ? 'emerald' : 'slate'
      });
    });
    return base;
  }, [scopedStudents, scopedDocuments]);

  const categoryOptions = useMemo<FunctionalDropdownOption[]>(() => {
    const opts: FunctionalDropdownOption[] = [
      {
        value: 'todas',
        label: 'Todas as Categorias Documentais',
        description: 'BI, Certificados, Boletins, Saúde e Outros',
        group: 'Filtro Geral',
        badge: `${scopedDocuments.length}`,
        badgeTone: 'emerald'
      }
    ];
    (Object.keys(ARCHIVE_CATEGORY_META) as DigitalArchiveCategory[]).forEach((key) => {
      const meta = ARCHIVE_CATEGORY_META[key];
      const count = scopedDocuments.filter((d) => d.category === key).length;
      opts.push({
        value: key,
        label: meta.label,
        description: meta.description,
        group: meta.group,
        badge: count > 0 ? `${count}` : undefined,
        badgeTone: count > 0 ? 'emerald' : 'slate'
      });
    });
    return opts;
  }, [scopedDocuments]);

  const uploadCategoryOptions = useMemo<FunctionalDropdownOption[]>(
    () =>
      (Object.keys(ARCHIVE_CATEGORY_META) as DigitalArchiveCategory[]).map((key) => {
        const meta = ARCHIVE_CATEGORY_META[key];
        return {
          value: key,
          label: meta.label,
          description: meta.description,
          group: meta.group,
          badge: meta.shortLabel,
          badgeTone: 'emerald'
        };
      }),
    []
  );

  const statusOptions = useMemo<FunctionalDropdownOption[]>(
    () => [
      {
        value: 'todos',
        label: 'Todos os Estados',
        description: 'Pendentes, validados e rejeitados',
        group: 'Estado de Validação',
        badge: `${scopedDocuments.length}`,
        badgeTone: 'slate'
      },
      {
        value: 'pendente',
        label: 'Pendentes de Análise',
        description: 'Aguardam visualização/validação do docente ou escola',
        group: 'Estado de Validação',
        badge: `${scopedDocuments.filter((d) => d.status === 'pendente').length}`,
        badgeTone: 'amber'
      },
      {
        value: 'validado',
        label: 'Validados pela Escola',
        description: 'Documentos conferidos e homologados',
        group: 'Estado de Validação',
        badge: `${scopedDocuments.filter((d) => d.status === 'validado').length}`,
        badgeTone: 'emerald'
      },
      {
        value: 'rejeitado',
        label: 'Solicitado Reenvio / Rejeitados',
        description: 'Documentos ilegíveis ou incompletos',
        group: 'Estado de Validação',
        badge: `${scopedDocuments.filter((d) => d.status === 'rejeitado').length}`,
        badgeTone: 'purple'
      }
    ],
    [scopedDocuments]
  );

  const filteredDocuments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedDocuments.filter((doc) => {
      if (classFilter !== 'todas' && doc.classId !== classFilter) return false;
      if (studentFilter !== 'todos' && doc.studentId !== studentFilter) return false;
      if (categoryFilter !== 'todas' && doc.category !== categoryFilter) return false;
      if (statusFilter !== 'todos' && doc.status !== statusFilter) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.studentName.toLowerCase().includes(q) ||
        doc.studentProcessNumber.toLowerCase().includes(q) ||
        doc.className.toLowerCase().includes(q) ||
        doc.uploadedByName.toLowerCase().includes(q) ||
        ARCHIVE_CATEGORY_META[doc.category].label.toLowerCase().includes(q)
      );
    });
  }, [scopedDocuments, classFilter, studentFilter, categoryFilter, statusFilter, searchTerm]);

  const metrics = useMemo(() => {
    return {
      total: scopedDocuments.length,
      pending: scopedDocuments.filter((d) => d.status === 'pendente').length,
      validated: scopedDocuments.filter((d) => d.status === 'validado').length,
      rejected: scopedDocuments.filter((d) => d.status === 'rejeitado').length
    };
  }, [scopedDocuments]);

  const resolvePreviewUrl = (doc: DigitalArchiveDocument): string => {
    if (doc.fileUrl && (doc.storagePath || doc.fileUrl.startsWith('https://'))) {
      return doc.fileUrl;
    }
    if (doc.dataUrl) return doc.dataUrl;
    if (doc.fileUrl) return doc.fileUrl;
    return `/api/archive/file/${doc.id}`;
  };

  const handleOpenPreview = async (doc: DigitalArchiveDocument) => {
    setPreviewDoc(doc);
    setResolvedPreviewUrl(resolvePreviewUrl(doc));
    if (doc.storagePath) {
      setIsLoadingPreview(true);
      try {
        const signed = await resolveSignedStudentDocumentUrl(doc);
        if (signed) {
          setResolvedPreviewUrl(signed);
        }
      } finally {
        setIsLoadingPreview(false);
      }
    }
  };

  const handleDownloadDocument = async (doc: DigitalArchiveDocument) => {
    const targetUrl = doc.storagePath
      ? await resolveSignedStudentDocumentUrl(doc, doc.fileName || 'documento')
      : resolveDownloadUrl(doc);
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = doc.fileName || 'documento';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const resolveDownloadUrl = (doc: DigitalArchiveDocument): string => {
    if (doc.fileUrl && (doc.storagePath || doc.fileUrl.includes('/storage/v1/object/'))) {
      const downloadName = encodeURIComponent(doc.fileName || 'documento');
      return doc.fileUrl.includes('?')
        ? `${doc.fileUrl}&download=${downloadName}`
        : `${doc.fileUrl}?download=${downloadName}`;
    }
    if (doc.dataUrl) return doc.dataUrl;
    const base = doc.fileUrl || `/api/archive/file/${doc.id}`;
    return base.includes('?') ? `${base}&download=1` : `${base}?download=1`;
  };

  const PERSONAL_DOCS_CHECKLIST: Array<{ category: DigitalArchiveCategory; label: string }> = [
    { category: 'fotografia_passe', label: 'Fotografia Tipo Passe' },
    { category: 'bilhete_identidade', label: 'Bilhete de Identidade' },
    { category: 'certidao_nascimento', label: 'Certidão de Nascimento' },
    { category: 'cartao_vacinas', label: 'Cartão de Vacinas' }
  ];

  const checklistStudent = useMemo(() => {
    const targetId =
      studentFilter !== 'todos'
        ? studentFilter
        : uploadStudentId || scopedStudents[0]?.id || '';
    return scopedStudents.find((s) => s.id === targetId) || null;
  }, [studentFilter, uploadStudentId, scopedStudents]);

  const openQuickUploadForCategory = (cat: DigitalArchiveCategory) => {
    if (checklistStudent) {
      setUploadStudentId(checklistStudent.id);
    }
    setUploadCategory(cat);
    setUploadTitle(ARCHIVE_CATEGORY_META[cat].label);
    setShowUploadForm(true);
  };

  const getRoleBadgeLabel = (role: UserRole): string => {
    if (role === 'encarregado_educacao') return 'Encarregado de Educação';
    if (role === 'aluno') return 'Aluno / Estudante';
    if (role === 'professor' || role === 'director_turma') return 'Docente';
    return 'Secretaria / Administração';
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho da Secção */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#dce7df]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#eaf6ee] border border-[#cde6d5] text-[#067836] flex items-center justify-center shrink-0">
                <FolderArchive className="w-5 h-5" />
              </span>
              <span>Arquivo Digital Escolar</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isStudentMode
                ? `Envio seguro dos documentos do estudante · ${currentInstitution.name}`
                : isProfessorMode
                ? `Visualização e conferência dos documentos enviados pelos alunos das suas turmas · ${currentInstitution.name}`
                : `Repositório digital de documentos enviados por Alunos e Encarregados · ${currentInstitution.name}`}
            </p>
          </div>

          {canUploadDocuments && !isStudentMode && (
            <button
              type="button"
              onClick={() => setShowUploadForm((prev) => !prev)}
              className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              {showUploadForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showUploadForm ? 'Fechar Formulário' : 'Anexar Documento para Aluno'}</span>
            </button>
          )}
        </div>
      )}

      {/* 4 Cartões KPI do Arquivo Digital */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-sm">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Documentos Arquivados</span>
            <div className="font-display text-2xl font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
              {metrics.total}
            </div>
            <span className="text-[11px] text-[#067836] font-semibold block mt-0.5 truncate">
              {isProfessorMode ? 'Nas suas turmas' : isStudentMode ? 'No seu processo' : 'Total da escola'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Pendentes de Análise</span>
            <div className="font-display text-2xl font-extrabold text-amber-700 tabular-nums leading-tight mt-0.5">
              {metrics.pending}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">Aguardam conferência</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Documentos Validados</span>
            <div className="font-display text-2xl font-extrabold text-[#067836] tabular-nums leading-tight mt-0.5">
              {metrics.validated}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">Conferidos pela escola</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">Para Correcção</span>
            <div className="font-display text-2xl font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
              {metrics.rejected}
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              {isStudentMode ? 'Ver observações' : 'Notificados ao aluno'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback de Acção */}
      {feedbackNotice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#064e26] flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span className="font-semibold">{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-[#055827] hover:text-[#064e26] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Checklist dos 4 Documentos Pessoais Essenciais (Supabase Storage) */}
      {checklistStudent && (
        <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#eaf6ee] text-[#067836] flex items-center justify-center shrink-0">
                <Cloud className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-extrabold text-[#064e26]">
                  Documentos Pessoais do Aluno · Supabase Storage
                </h3>
                <p className="text-[11px] text-slate-500">
                  {checklistStudent.fullName} (Proc. {checklistStudent.processNumber})
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#eaf6ee] text-[#055827] border border-[#cde6d5]">
              Bucket: neuroeduca-student-docs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PERSONAL_DOCS_CHECKLIST.map((item) => {
              const matchingDoc = scopedDocuments.find(
                (d) => d.studentId === checklistStudent.id && d.category === item.category
              );
              const isInCloud = Boolean(
                matchingDoc?.storagePath || matchingDoc?.fileUrl?.includes('/storage/v1/object/')
              );
              return (
                <div
                  key={item.category}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                    matchingDoc
                      ? matchingDoc.status === 'validado'
                        ? 'bg-[#f7fbf8] border-[#cde6d5]'
                        : matchingDoc.status === 'rejeitado'
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800">{item.label}</span>
                      {matchingDoc ? (
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            matchingDoc.status === 'validado'
                              ? 'text-[#16a34a]'
                              : matchingDoc.status === 'rejeitado'
                              ? 'text-red-500'
                              : 'text-amber-500'
                          }`}
                        />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] mt-1 font-semibold text-slate-500">
                      {matchingDoc
                        ? matchingDoc.status === 'validado'
                          ? 'Validado'
                          : matchingDoc.status === 'rejeitado'
                          ? 'Rejeitado (reenviar)'
                          : 'Pendente de validação'
                        : 'Em falta no dossier'}
                      {isInCloud ? ' · Na Nuvem' : ''}
                    </div>
                  </div>

                  {matchingDoc ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(matchingDoc)}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-[#dce7df] text-[#055827] hover:bg-[#eaf6ee] cursor-pointer"
                      >
                        Visualizar
                      </button>
                      {canUploadDocuments && (
                        <button
                          type="button"
                          onClick={() => openQuickUploadForCategory(item.category)}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Substituir
                        </button>
                      )}
                    </div>
                  ) : canUploadDocuments ? (
                    <button
                      type="button"
                      onClick={() => openQuickUploadForCategory(item.category)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#067836] hover:bg-[#05652d] text-white transition cursor-pointer inline-flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Enviar agora</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Aguardando envio</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulário de Envio de Documentos (Alunos, Encarregados e Secretaria) */}
      {canUploadDocuments && showUploadForm && (
        <form
          onSubmit={handleSubmitUpload}
          className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wide">
                {isStudentMode
                  ? 'Enviar Documento Escolar para o Arquivo Digital'
                  : 'Anexar Documento Digitalizado ao Processo do Aluno'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-100 font-medium">
              PDF, JPG, PNG ou WebP · Máx. 12 MB
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <FunctionalDropdownFilter
                  label="1. Estudante / Processo *"
                  value={uploadStudentId}
                  onChange={(val) => setUploadStudentId(val)}
                  options={scopedStudents.map((s) => ({
                    value: s.id,
                    label: s.fullName,
                    description: `Proc. ${s.processNumber} · ${s.className}`,
                    group: s.gradeLevel,
                    badge: s.processNumber,
                    badgeTone: 'emerald'
                  }))}
                  disabled={
                    Boolean(lockedStudentId) ||
                    (isStudentMode && (!isGuardianMode || scopedStudents.length <= 1))
                  }
                  icon={<GraduationCap className="w-4 h-4 text-[#067836]" />}
                  placeholder="Seleccionar estudante..."
                  searchable={scopedStudents.length > 5}
                />
              </div>

              <div>
                <FunctionalDropdownFilter
                  label="2. Categoria do Documento *"
                  value={uploadCategory}
                  onChange={(val) => handleCategoryChange(val as DigitalArchiveCategory)}
                  options={uploadCategoryOptions}
                  icon={<FileText className="w-4 h-4 text-[#16a34a]" />}
                  placeholder="Seleccionar tipo de documento..."
                  searchable
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1">
                  3. Título / Identificação *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ex: Cópia do BI / Certificado da 9.ª Classe"
                  className="w-full min-h-[42px] bg-[#f7fbf8] text-slate-800 font-medium rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* Zona Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilePicked(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition cursor-pointer min-h-[148px] ${
                  isDragging
                    ? 'border-[#067836] bg-[#eaf6ee]'
                    : selectedFile
                    ? 'border-[#16a34a] bg-[#eaf6ee]/60'
                    : 'border-[#cde6d5] bg-[#f7fbf8] hover:border-[#067836] hover:bg-[#eaf6ee]/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#16a34a] text-white flex items-center justify-center mx-auto">
                      {selectedFile.type === 'application/pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900 break-all">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[#055827] font-semibold">
                      {formatBytes(selectedFile.size)} · Pronto para enviar (clique para substituir)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#eaf6ee] border border-[#cde6d5] text-[#067836] flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Clique aqui ou arraste o documento digitalizado
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Aceita PDF, JPG, PNG ou WebP até 12 MB
                    </p>
                  </div>
                )}
              </div>

              {/* Observação e Botão de Envio */}
              <div className="flex flex-col justify-between space-y-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1">
                    Observações / Notas para o Professor ou Secretaria (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Ex: Cópia actualizada do BI entregue para renovação da matrícula de 2026/2027..."
                    className="w-full text-xs bg-[#f7fbf8] text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-500">
                    Fica visível de imediato para o Professor e Administrador Escolar.
                  </span>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'A Enviar...' : 'Enviar Documento'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Barra de Filtros Suspensos & Pesquisa */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wide">
            <Filter className="w-4 h-4" />
            <span>
              {isStudentMode
                ? 'Os Meus Documentos Enviados'
                : isProfessorMode
                ? 'Documentos Recebidos dos Alunos (Minhas Turmas)'
                : 'Todos os Documentos Recebidos na Escola'}
            </span>
          </div>
          <span className="text-xs font-semibold text-emerald-100 tabular-nums">
            {filteredDocuments.length} documento(s) encontrado(s)
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1">
              Pesquisar Documento / Aluno
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#067836] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, processo, título ou ficheiro..."
                className="w-full min-h-[42px] pl-9 pr-8 py-2 bg-[#f7fbf8] border border-[#cde6d5] rounded-xl text-xs text-slate-800 focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {!isStudentMode && (
            <FunctionalDropdownFilter
              label="Filtrar por Turma"
              value={classFilter}
              onChange={(val) => {
                setClassFilter(val);
                setStudentFilter('todos');
              }}
              options={classOptions}
              icon={<Layers className="w-4 h-4 text-[#16a34a]" />}
              placeholder="Todas as turmas"
              searchable={classOptions.length > 6}
            />
          )}

          {(!isStudentMode || (isGuardianMode && !lockedStudentId && scopedStudents.length > 1)) && (
            <FunctionalDropdownFilter
              label="Filtrar por Estudante"
              value={studentFilter}
              onChange={(val) => setStudentFilter(val)}
              options={studentOptions}
              icon={<GraduationCap className="w-4 h-4 text-[#067836]" />}
              placeholder="Todos os estudantes"
              searchable={studentOptions.length > 6}
            />
          )}

          <FunctionalDropdownFilter
            label="Categoria Documental"
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val as any)}
            options={categoryOptions}
            icon={<FileText className="w-4 h-4 text-[#f5a623]" />}
            placeholder="Todas as categorias"
            searchable
          />

          <FunctionalDropdownFilter
            label="Estado de Validação"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={statusOptions}
            icon={<UserCheck className="w-4 h-4 text-[#7c3aed]" />}
            placeholder="Todos os estados"
          />
        </div>
      </div>

      {/* Lista / Tabela de Documentos do Arquivo Digital */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#dce7df] p-10 text-center space-y-2 shadow-[0_2px_10px_rgba(2,44,22,0.04)]">
          <FolderArchive className="w-12 h-12 text-[#067836]/30 mx-auto" />
          <h3 className="text-sm font-bold text-[#064e26]">
            Nenhum documento encontrado no Arquivo Digital
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isStudentMode
              ? scopedStudents.length === 0
                ? 'Nenhum processo de estudante vinculado a esta conta. Solicite à Secretaria da escola a associação do seu e-mail.'
                : 'Utilize o formulário acima para enviar o seu Bilhete de Identidade, Certidão, Atestado Médico ou Certificados escolares.'
              : 'Nenhum aluno ou encarregado enviou documentos que correspondam aos filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const isPdf = doc.mimeType === 'application/pdf';
            const catMeta = ARCHIVE_CATEGORY_META[doc.category] || ARCHIVE_CATEGORY_META.outro;
            const statusBadge =
              doc.status === 'validado'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : doc.status === 'rejeitado'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200';
            const statusLabel =
              doc.status === 'validado'
                ? 'Validado pela Escola'
                : doc.status === 'rejeitado'
                ? 'Rejeitado / Reenviar'
                : 'Pendente de Análise';

            const canDeleteThis =
              isSchoolAdminMode ||
              (isStudentMode &&
                scopedStudentIds.has(doc.studentId) &&
                doc.uploadedByRole === (currentUser?.role || activeRole || doc.uploadedByRole));

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          isPdf
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : 'bg-[#eaf6ee] border-[#cde6d5] text-[#067836]'
                        }`}
                      >
                        {isPdf ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <ImageIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#eaf6ee] text-[#055827] border border-[#cde6d5]">
                            {catMeta.shortLabel}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge}`}
                          >
                            {statusLabel}
                          </span>
                          {(doc.storagePath || doc.fileUrl?.includes('/storage/v1/object/')) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <Cloud className="w-3 h-3" />
                              <span>Supabase Storage</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-1 leading-snug">
                          {doc.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {doc.fileName} · {formatBytes(doc.fileSizeBytes)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadados do Estudante e Remetente */}
                  <div className="bg-[#f7fbf8] rounded-xl border border-[#dce7df] p-2.5 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-bold text-slate-800">
                        {doc.studentName}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#067836]">
                        Proc. {doc.studentProcessNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2">
                      <span>{doc.className}</span>
                      <span>·</span>
                      <span>
                        Enviado por: <strong>{doc.uploadedByName}</strong> ({getRoleBadgeLabel(doc.uploadedByRole)})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Data de envio: {formatDateTime(doc.uploadedAt)}
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-[#055827] bg-[#eaf6ee]/60 border border-[#cde6d5] rounded-xl px-3 py-2">
                      {doc.description}
                    </p>
                  )}

                  {doc.reviewNotes && (
                    <div
                      className={`text-xs rounded-xl px-3 py-2 border flex items-start space-x-2 ${
                        doc.status === 'rejeitado'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-[#eaf6ee] border-[#cde6d5] text-[#064e26]'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[11px]">
                          Parecer ({doc.reviewedByName || 'Escola'}):
                        </span>
                        <span>{doc.reviewNotes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra de Acções */}
                <div className="px-4 py-2.5 bg-[#f7fbf8] border-t border-[#dce7df] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(doc)}
                      className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc)}
                      className="inline-flex items-center space-x-1 bg-[#eaf6ee] hover:bg-[#d7efe0] text-[#055827] border border-[#cde6d5] text-xs font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canReviewDocuments && doc.status !== 'validado' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleReviewAction(
                            doc,
                            'validado',
                            'Documento conferido e aceite no processo escolar.'
                          )
                        }
                        className="inline-flex items-center space-x-1 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                        title="Validar Documento"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validar</span>
                      </button>
                    )}

                    {canDeleteThis && (
                      confirmDeleteId === doc.id ? (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDocument(doc.id);
                              setConfirmDeleteId(null);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded-lg cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Eliminar documento do arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO INTEGRADA DO DOCUMENTO */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-[#dce7df] overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold uppercase truncate">
                  {previewDoc.title}
                </h3>
                <p className="text-[11px] text-emerald-100 truncate">
                  {previewDoc.studentName} (Proc. {previewDoc.studentProcessNumber}) · {previewDoc.className}
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDocument(previewDoc)}
                  className="inline-flex items-center space-x-1 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descarregar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
                  aria-label="Fechar visualizador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Ficheiro */}
            <div className="flex-1 overflow-y-auto bg-[#f3f7f4] p-3 sm:p-5 flex items-center justify-center min-h-[380px]">
              {isLoadingPreview ? (
                <div className="text-xs font-semibold text-[#064e26] py-12">
                  A gerar ligação segura ao Supabase Storage...
                </div>
              ) : previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  title={previewDoc.title}
                  src={resolvedPreviewUrl || resolvePreviewUrl(previewDoc)}
                  className="w-full h-[62vh] bg-white rounded-xl border border-[#dce7df] shadow-xs"
                />
              ) : (
                <img
                  src={resolvedPreviewUrl || resolvePreviewUrl(previewDoc)}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[65vh] object-contain bg-white rounded-xl border border-[#dce7df] shadow-sm p-1"
                />
              )}
            </div>

            {/* Painel de Conferência / Validação (Professor & Administrador Escolar) */}
            <div className="bg-white border-t border-[#dce7df] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div>
                  <span>
                    <strong>Ficheiro:</strong> {previewDoc.fileName} ({formatBytes(previewDoc.fileSizeBytes)})
                  </span>
                  <span className="mx-2">·</span>
                  <span>
                    <strong>Enviado por:</strong> {previewDoc.uploadedByName} ({getRoleBadgeLabel(previewDoc.uploadedByRole)}) em {formatDateTime(previewDoc.uploadedAt)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                    previewDoc.status === 'validado'
                      ? 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                      : previewDoc.status === 'rejeitado'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {previewDoc.status === 'validado'
                    ? 'Validado pela Escola'
                    : previewDoc.status === 'rejeitado'
                    ? 'Solicitado Reenvio'
                    : 'Pendente de Análise'}
                </span>
              </div>

              {canReviewDocuments && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-[#dce7df]">
                  <input
                    type="text"
                    value={reviewNotesDraft}
                    onChange={(e) => setReviewNotesDraft(e.target.value)}
                    placeholder="Observação / Parecer do Professor ou Administrador Escolar (opcional)..."
                    className="flex-1 text-xs bg-[#f7fbf8] border border-[#cde6d5] rounded-xl px-3 py-2 text-slate-800 focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
                  />
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleReviewAction(
                          previewDoc,
                          'rejeitado',
                          reviewNotesDraft || 'Documento ilegível ou incompleto. Por favor, reenviar.'
                        )
                      }
                      className="inline-flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Solicitar Reenvio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleReviewAction(
                          previewDoc,
                          'validado',
                          reviewNotesDraft || 'Documento conferido e validado com sucesso.'
                        )
                      }
                      className="inline-flex items-center space-x-1 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Validar Documento</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
