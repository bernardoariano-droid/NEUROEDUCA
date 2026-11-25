/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Gestão de Professores e Atribuições Docentes (Angola)
 * Atribuição de turmas e disciplinas (1 ou mais — multidisciplinar a partir do Secundário até ao Superior)
 * integrada no cadastro do professor e editável a qualquer momento
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Layers,
  Phone,
  Mail,
  CheckCircle,
  X,
  GraduationCap,
  UserCheck,
  Calendar,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import {
  Teacher,
  Institution,
  ClassRoom,
  SchoolSubject
} from '../../types';
import {
  resolveSubjectsForClass,
  isMultidisciplinarySubsystem
} from '../../utils/evaluationEngine';

interface TeachersManagerProps {
  currentInstitution: Institution;
  teachers: Teacher[];
  classes: ClassRoom[];
  customSubjects?: SchoolSubject[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({
  currentInstitution,
  teachers,
  classes,
  customSubjects = [],
  onAddTeacher,
  onUpdateTeacher
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formStaffCode, setFormStaffCode] = useState('');
  const [formDegree, setFormDegree] = useState<Teacher['academicDegree']>('Licenciado');
  const [formSpecialization, setFormSpecialization] = useState('Ensino da Matemática');
  const [formPhone, setFormPhone] = useState('+244 923 000 000');
  const [formEmail, setFormEmail] = useState('');
  const [formContractType, setFormContractType] =
    useState<Teacher['contractType']>('tempo_integral');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAssignedClasses, setFormAssignedClasses] = useState<Teacher['assignedClasses']>([]);

  const instClasses = useMemo(
    () => classes.filter((c) => c.institutionId === currentInstitution.id),
    [classes, currentInstitution.id]
  );

  // Picker state para atribuição multidisciplinar (turma -> 1 ou mais disciplinas + h/sem)
  const [pickerClassId, setPickerClassId] = useState<string>('');
  const [pickerCheckedSubjects, setPickerCheckedSubjects] = useState<Record<string, number>>({});
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const instTeachers = useMemo(
    () => teachers.filter((t) => t.institutionId === currentInstitution.id),
    [teachers, currentInstitution.id]
  );

  const filteredTeachers = instTeachers.filter(
    (t) =>
      t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.staffCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignedClasses.some(
        (ac) =>
          ac.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ac.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getSubjectsForClass = (classId: string) => {
    const cls = instClasses.find((c) => c.id === classId);
    if (!cls) return [];
    return resolveSubjectsForClass(
      cls.subsystemCode,
      cls.gradeLevel,
      cls.courseName,
      customSubjects,
      cls.subjects
    );
  };

  const pickerClass = useMemo(
    () => instClasses.find((c) => c.id === pickerClassId),
    [instClasses, pickerClassId]
  );

  const pickerSubjects = useMemo(
    () => getSubjectsForClass(pickerClassId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickerClassId, instClasses, customSubjects]
  );

  const isPickerMultidisciplinary = isMultidisciplinarySubsystem(
    pickerClass?.subsystemCode,
    pickerClass?.gradeLevel
  );

  const syncPickerCheckedFromAssignments = (
    classId: string,
    assignments: Teacher['assignedClasses']
  ) => {
    const existingForClass = assignments.filter((a) => a.classId === classId);
    const nextMap: Record<string, number> = {};
    existingForClass.forEach((a) => {
      nextMap[a.subjectId] = a.weeklyHours;
    });
    setPickerCheckedSubjects(nextMap);
  };

  const initPickerForClasses = (
    classList: ClassRoom[],
    existingAssignments: Teacher['assignedClasses'] = []
  ) => {
    const firstCls = classList[0];
    if (!firstCls) {
      setPickerClassId('');
      setPickerCheckedSubjects({});
      return;
    }
    setPickerClassId(firstCls.id);
    syncPickerCheckedFromAssignments(firstCls.id, existingAssignments);
  };

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFormName('');
    setFormStaffCode(`DOC-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormDegree('Licenciado');
    setFormSpecialization('Ensino da Matemática');
    setFormPhone('+244 923 000 000');
    setFormEmail('');
    setFormContractType('tempo_integral');
    setFormIsActive(true);
    setFormAssignedClasses([]);
    setAssignmentError(null);
    initPickerForClasses(instClasses, []);
    setIsModalOpen(true);
  };

  const openEditModal = (tch: Teacher) => {
    const clonedAssignments = tch.assignedClasses.map((a) => ({ ...a }));
    setEditingTeacher(tch);
    setFormName(tch.fullName);
    setFormStaffCode(tch.staffCode);
    setFormDegree(tch.academicDegree);
    setFormSpecialization(tch.specialization);
    setFormPhone(tch.phone);
    setFormEmail(tch.email);
    setFormContractType(tch.contractType);
    setFormIsActive(tch.isActive);
    setFormAssignedClasses(clonedAssignments);
    setAssignmentError(null);
    initPickerForClasses(instClasses, clonedAssignments);
    setIsModalOpen(true);
  };

  const handlePickerClassChange = (nextClassId: string) => {
    setPickerClassId(nextClassId);
    setAssignmentError(null);
    syncPickerCheckedFromAssignments(nextClassId, formAssignedClasses);
  };

  const togglePickerSubject = (subjectId: string, defaultHours: number) => {
    setAssignmentError(null);
    setPickerCheckedSubjects((prev) => {
      if (prev[subjectId] !== undefined) {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      }
      return { ...prev, [subjectId]: defaultHours || 4 };
    });
  };

  const handlePickerSubjectHoursChange = (subjectId: string, hours: number) => {
    setPickerCheckedSubjects((prev) => ({
      ...prev,
      [subjectId]: Math.max(1, hours || 1)
    }));
  };

  const handleSelectAllPickerSubjects = () => {
    setAssignmentError(null);
    const nextMap: Record<string, number> = {};
    pickerSubjects.forEach((sub) => {
      nextMap[sub.id] = pickerCheckedSubjects[sub.id] ?? sub.weeklyHours ?? 4;
    });
    setPickerCheckedSubjects(nextMap);
  };

  const handleClearPickerSubjects = () => {
    setAssignmentError(null);
    setPickerCheckedSubjects({});
  };

  const handleApplyClassAssignments = () => {
    setAssignmentError(null);
    const cls = instClasses.find((c) => c.id === pickerClassId);
    if (!cls) {
      setAssignmentError('Seleccione uma turma válida para atribuir ao docente.');
      return;
    }

    const selectedEntries = pickerSubjects.filter(
      (sub) => pickerCheckedSubjects[sub.id] !== undefined
    );

    if (selectedEntries.length < 1) {
      setAssignmentError(
        isPickerMultidisciplinary
          ? 'Regime Multidisciplinar (Ensino Secundário até ao Ensino Superior): seleccione pelo menos 1 disciplina para atribuir esta turma ao docente.'
          : 'Seleccione pelo menos 1 disciplina integrada nesta turma para atribuir ao professor.'
      );
      return;
    }

    const newForThisClass: Teacher['assignedClasses'] = selectedEntries.map((sub) => ({
      classId: cls.id,
      className: cls.name,
      subjectId: sub.id,
      subjectName: sub.name,
      weeklyHours: Math.max(1, Number(pickerCheckedSubjects[sub.id]) || sub.weeklyHours || 4)
    }));

    setFormAssignedClasses((prev) => [
      ...prev.filter((a) => a.classId !== cls.id),
      ...newForThisClass
    ]);
  };

  const handleUpdateAssignmentItem = (
    idx: number,
    patch: Partial<Teacher['assignedClasses'][number]>
  ) => {
    setFormAssignedClasses((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveAssignment = (idx: number) => {
    setFormAssignedClasses((prev) => {
      const target = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      if (target && target.classId === pickerClassId) {
        syncPickerCheckedFromAssignments(pickerClassId, next);
      }
      return next;
    });
  };

  const handleSubmitTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const cleanEmail =
      formEmail.trim() ||
      `docente.${formName.toLowerCase().replace(/[^a-z0-9]/g, '')}@escola.ao`;

    // Se o utilizador seleccionou disciplinas no painel mas ainda não clicou em "+ Aplicar Turma", aplicar automaticamente
    let finalAssignments = [...formAssignedClasses];
    if (pickerClass && Object.keys(pickerCheckedSubjects).length > 0) {
      const selectedEntries = pickerSubjects.filter(
        (sub) => pickerCheckedSubjects[sub.id] !== undefined
      );
      if (selectedEntries.length > 0) {
        const appliedForPicker: Teacher['assignedClasses'] = selectedEntries.map((sub) => ({
          classId: pickerClass.id,
          className: pickerClass.name,
          subjectId: sub.id,
          subjectName: sub.name,
          weeklyHours: Math.max(
            1,
            Number(pickerCheckedSubjects[sub.id]) || sub.weeklyHours || 4
          )
        }));
        finalAssignments = [
          ...finalAssignments.filter((a) => a.classId !== pickerClass.id),
          ...appliedForPicker
        ];
      }
    }

    if (editingTeacher && onUpdateTeacher) {
      const updatedTeacher: Teacher = {
        ...editingTeacher,
        staffCode: formStaffCode.trim() || editingTeacher.staffCode,
        fullName: formName.trim(),
        academicDegree: formDegree,
        specialization: formSpecialization.trim() || editingTeacher.specialization,
        phone: formPhone.trim(),
        email: cleanEmail,
        contractType: formContractType,
        assignedClasses: finalAssignments,
        isActive: formIsActive
      };
      onUpdateTeacher(updatedTeacher);
      setIsModalOpen(false);
      setEditingTeacher(null);
      setNotice(
        `Docente "${updatedTeacher.fullName}" e ${updatedTeacher.assignedClasses.length} atribuição(ões) de disciplina actualizados na memória Localhost!`
      );
      setTimeout(() => setNotice(null), 4500);
      return;
    }

    const newTeacher: Teacher = {
      id: `prof-${Date.now()}`,
      institutionId: currentInstitution.id,
      staffCode: formStaffCode.trim() || `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: formName.trim(),
      academicDegree: formDegree,
      specialization: formSpecialization.trim(),
      phone: formPhone.trim(),
      email: cleanEmail,
      contractType: formContractType,
      assignedClasses: finalAssignments,
      isActive: formIsActive
    };

    onAddTeacher(newTeacher);
    setIsModalOpen(false);
    setNotice(
      `Docente "${newTeacher.fullName}" cadastrado com ${newTeacher.assignedClasses.length} disciplina(s) atribuída(s) e guardado na memória Localhost!`
    );
    setTimeout(() => setNotice(null), 4500);
  };

  const teachersWithClassesCount = instTeachers.filter(
    (t) => t.assignedClasses.length > 0
  ).length;
  const totalAssignedEntries = instTeachers.reduce(
    (acc, t) => acc + t.assignedClasses.length,
    0
  );

  // Agrupar atribuições por turma para visualização clara no cartão do docente
  const groupAssignmentsByClass = (assignments: Teacher['assignedClasses']) => {
    const map = new Map<
      string,
      { classId: string; className: string; items: Teacher['assignedClasses'] }
    >();
    assignments.forEach((ac) => {
      const existing = map.get(ac.classId);
      if (existing) {
        existing.items.push(ac);
      } else {
        map.set(ac.classId, { classId: ac.classId, className: ac.className, items: [ac] });
      }
    });
    return Array.from(map.values());
  };

  const checkedCount = Object.keys(pickerCheckedSubjects).length;

  return (
    <div className="space-y-5">
      {/* 1. TÍTULO SUPERIOR PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#dce7df]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight uppercase">
            CORPO DOCENTE E PROFESSORES
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5 font-medium">
            Plataforma Multi-institucional NEUROEDUCA · {currentInstitution.name} ({currentInstitution.province})
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 min-h-[42px] bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cadastrar Professor</span>
        </button>
      </div>

      {/* Feedback inline */}
      {notice && (
        <div className="p-3.5 bg-[#eaf6ee] border border-[#cde6d5] rounded-2xl text-xs text-[#055827] flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span className="font-semibold">{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[#055827] hover:text-[#064e26] font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. CARTÕES KPI DE DOCENTES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#16a34a] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Docentes Cadastrados</span>
            <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {instTeachers.length}
            </div>
            <span className="text-[11px] text-[#16a34a] font-semibold block mt-0.5">
              {instTeachers.filter((t) => t.isActive).length} activo(s)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#1d8cf8] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Turmas Atribuídas</span>
            <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {teachersWithClassesCount} / {instTeachers.length}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">Alocação multidisciplinar</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#f5a623] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Disciplinas Alocadas</span>
            <div className="text-2xl font-extrabold text-[#064e26] tabular-nums mt-0.5">
              {totalAssignedEntries}
            </div>
            <span className="text-[11px] text-[#4b6755] block mt-0.5">Secundário até Superior</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#dce7df] p-4 shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#4b6755] block">Lançamento de Notas</span>
            <div className="text-xl font-extrabold text-[#064e26] mt-0.5">
              1.º Trimestre
            </div>
            <span className="text-[11px] text-[#16a34a] font-semibold block mt-0.5">Período aberto</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por docente, código, especialidade ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f7fbf8] text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none font-medium"
          />
        </div>
        <span className="text-xs text-[#4b6755] font-semibold">
          Mostrando {filteredTeachers.length} de {instTeachers.length} docentes
        </span>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((tch) => {
          const grouped = groupAssignmentsByClass(tch.assignedClasses);
          return (
            <div
              key={tch.id}
              className="bg-white rounded-2xl p-5 border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] hover:border-[#16a34a]/40 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#055827] bg-[#eaf6ee] px-2.5 py-0.5 rounded-lg border border-[#cde6d5]">
                      {tch.staffCode}
                    </span>
                    <h3 className="font-extrabold text-[#064e26] text-base mt-2">{tch.fullName}</h3>
                    <p className="text-xs text-[#4b6755] font-medium">{tch.specialization}</p>
                  </div>

                  <span className="text-[10px] uppercase font-bold bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-lg shrink-0">
                    {tch.academicDegree}
                  </span>
                </div>

                {/* Assigned classes and subjects */}
                <div className="mt-4 pt-3 border-t border-[#eaf1ec]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#064e26]">
                      Turmas & Disciplinas ({grouped.length} turma{grouped.length === 1 ? '' : 's'} · {tch.assignedClasses.length} disc.):
                    </span>
                  </div>
                  {grouped.length > 0 ? (
                    <div className="space-y-2">
                      {grouped.map((grp) => {
                        const clsObj = instClasses.find((c) => c.id === grp.classId);
                        const isMulti = isMultidisciplinarySubsystem(
                          clsObj?.subsystemCode,
                          clsObj?.gradeLevel
                        );
                        return (
                          <div
                            key={grp.classId}
                            className="bg-[#f7fbf8] p-2.5 rounded-xl border border-[#dce7df] text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-[#064e26] truncate">{grp.className}</strong>
                              {isMulti && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                  Multidisciplinar
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {grp.items.map((item, i) => (
                                <span
                                  key={`${item.subjectId}-${i}`}
                                  className="inline-flex items-center space-x-1 bg-white border border-[#cde6d5] px-2 py-0.5 rounded-lg text-[11px] text-slate-700"
                                >
                                  <span className="font-semibold">{item.subjectName}</span>
                                  <span className="font-mono text-[10px] text-[#4b6755]">
                                    ({item.weeklyHours}h)
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[#4b6755] text-xs italic bg-[#f7fbf8] p-2.5 rounded-xl border border-dashed border-[#cde6d5]">
                      Sem turmas atribuídas no momento.
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-xs text-[#4b6755]">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-[#16a34a]" />
                    <span>{tch.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-[#067836]" />
                    <span className="truncate">{tch.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#eaf1ec] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[#4b6755] capitalize">
                    {tch.contractType.replace('_', ' ')}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg ${
                      tch.isActive
                        ? 'text-[#055827] bg-[#eaf6ee]'
                        : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {tch.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {onUpdateTeacher && (
                  <button
                    type="button"
                    onClick={() => openEditModal(tch)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#eaf6ee] hover:bg-[#d7efe0] border border-[#cde6d5] text-[#055827] font-bold inline-flex items-center space-x-1 cursor-pointer transition"
                    title="Editar dados e turmas atribuídas do professor"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar / Turmas</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cadastrar / Editar Professor com Atribuição Multidisciplinar de Turmas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#dce7df] max-h-[92vh] overflow-y-auto my-4">
            <div className="bg-gradient-to-r from-[#067836] to-[#149a45] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-emerald-200" />
                <span>
                  {editingTeacher
                    ? `Editar Docente e Turmas: ${editingTeacher.fullName}`
                    : 'Cadastrar Docente e Atribuir Turmas / Disciplinas'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTeacher(null);
                }}
                className="p-1.5 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTeacher} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nome Completo do Docente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prof. Dr. Armando Manuel João"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Código do Docente</label>
                  <input
                    type="text"
                    value={formStaffCode}
                    onChange={(e) => setFormStaffCode(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Grau Académico *</label>
                  <select
                    value={formDegree}
                    onChange={(e) => setFormDegree(e.target.value as Teacher['academicDegree'])}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    <option value="Licenciado">Licenciado</option>
                    <option value="Mestre">Mestre</option>
                    <option value="Doutor">Doutor</option>
                    <option value="Bacharel">Bacharel</option>
                    <option value="Médio Pedagógico">Médio Pedagógico</option>
                    <option value="Técnico Médio">Técnico Médio</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Especialização / Área de Formação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ensino da Matemática e Física"
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="docente@escola.ao"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Regime Contratual</label>
                  <select
                    value={formContractType}
                    onChange={(e) =>
                      setFormContractType(e.target.value as Teacher['contractType'])
                    }
                    className="w-full bg-slate-50 text-slate-800 rounded-lg px-3 py-2 border border-slate-300"
                  >
                    <option value="tempo_integral">Tempo Integral</option>
                    <option value="tempo_parcial">Tempo Parcial</option>
                    <option value="colaborador">Colaborador</option>
                  </select>
                </div>
              </div>

              {editingTeacher && (
                <div className="flex items-center space-x-2">
                  <label className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Docente em Exercício Activo</span>
                  </label>
                </div>
              )}

              {/* SECÇÃO INTEGRADA: ATRIBUIÇÃO MULTIDISCIPLINAR DE TURMAS E DISCIPLINAS */}
              <div className="pt-3 border-t border-[#dce7df] space-y-3">
                <div>
                  <h4 className="font-bold text-[#064e26] flex items-center space-x-1.5 text-xs uppercase tracking-wide">
                    <UserCheck className="w-4 h-4 text-[#067836]" />
                    <span>
                      Atribuição de Turmas &amp; Disciplinas ({formAssignedClasses.length} alocação{formAssignedClasses.length === 1 ? '' : 'ões'})
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#4b6755]">
                    A partir do Ensino Secundário até ao Ensino Superior (regime multidisciplinar), atribua 1 ou mais disciplinas por turma ao docente (editável posteriormente).
                  </p>
                </div>

                {instClasses.length > 0 ? (
                  <div className="bg-[#f7fbf8] p-3.5 rounded-2xl border border-[#dce7df] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-[#064e26] block mb-1">
                          1. Seleccionar Turma
                        </label>
                        <select
                          value={pickerClassId}
                          onChange={(e) => handlePickerClassChange(e.target.value)}
                          className="w-full bg-white text-slate-800 rounded-xl px-3 py-2 border border-[#cde6d5] text-xs font-semibold focus:border-[#067836] focus:outline-none"
                        >
                          {instClasses.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.code} — {cls.name} ({cls.gradeLevel})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-block px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${
                            isPickerMultidisciplinary
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-[#eaf6ee] text-[#055827] border-[#cde6d5]'
                          }`}
                        >
                          {isPickerMultidisciplinary
                            ? 'Multidisciplinar (1 ou mais disciplinas)'
                            : 'Turma Primário / Infantil (1+ disc.)'}
                        </span>
                      </div>
                    </div>

                    {/* Selecção múltipla de disciplinas da turma */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-[11px] font-semibold text-[#064e26]">
                          2. Disciplinas da Turma Seleccionada ({checkedCount} marcada{checkedCount === 1 ? '' : 's'} — mínimo 1):
                        </label>
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={handleSelectAllPickerSubjects}
                            className="text-[#067836] hover:text-[#055827] font-bold cursor-pointer"
                          >
                            Seleccionar Todas
                          </button>
                          <span className="text-[#cde6d5]">|</span>
                          <button
                            type="button"
                            onClick={handleClearPickerSubjects}
                            className="text-[#4b6755] hover:text-[#064e26] font-semibold cursor-pointer"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                        {pickerSubjects.map((sub) => {
                          const isChecked = pickerCheckedSubjects[sub.id] !== undefined;
                          const hoursVal =
                            pickerCheckedSubjects[sub.id] ?? sub.weeklyHours ?? 4;
                          return (
                            <div
                              key={sub.id}
                              className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition ${
                                isChecked
                                  ? 'bg-[#eaf6ee] border-[#16a34a] text-[#064e26]'
                                  : 'bg-white border-[#dce7df] text-slate-700 hover:bg-[#f7fbf8]'
                              }`}
                            >
                              <label className="flex items-center space-x-2 flex-1 min-w-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    togglePickerSubject(sub.id, sub.weeklyHours || 4)
                                  }
                                  className="rounded border-[#cde6d5] text-[#067836] focus:ring-[#16a34a] shrink-0"
                                />
                                <span className="truncate font-semibold text-xs" title={sub.name}>
                                  {sub.name}
                                </span>
                              </label>

                              <div className="flex items-center space-x-1 shrink-0">
                                <input
                                  type="number"
                                  min={1}
                                  max={30}
                                  disabled={!isChecked}
                                  value={hoursVal}
                                  onChange={(e) =>
                                    handlePickerSubjectHoursChange(
                                      sub.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-12 bg-white border border-[#cde6d5] rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-center disabled:opacity-40"
                                />
                                <span className="text-[10px] text-[#4b6755]">h</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {assignmentError && (
                      <div className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-xl">
                        {assignmentError}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleApplyClassAssignments}
                        className="min-h-[38px] px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold text-xs inline-flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>+ Atribuir Turma e {checkedCount || ''} Disciplina(s)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                    Nenhuma turma criada nesta escola ainda. Poderá criar turmas em Gestão de Turmas e editar este docente depois para atribuir as turmas.
                  </div>
                )}

                {/* Lista de Turmas e Disciplinas Atribuídas ao Docente (Editável) */}
                {formAssignedClasses.length > 0 ? (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {formAssignedClasses.map((ac, idx) => {
                      const classSubjects = getSubjectsForClass(ac.classId);
                      return (
                        <div
                          key={`${ac.classId}-${ac.subjectId}-${idx}`}
                          className="bg-[#eaf6ee] border border-[#cde6d5] rounded-xl p-2.5 grid grid-cols-12 gap-2 items-center"
                        >
                          <div className="col-span-12 sm:col-span-5 min-w-0">
                            <span className="font-bold text-[#064e26] block truncate">
                              {ac.className}
                            </span>
                          </div>

                          <div className="col-span-7 sm:col-span-4">
                            <select
                              value={ac.subjectId}
                              onChange={(e) => {
                                const nextSub = classSubjects.find((s) => s.id === e.target.value);
                                if (nextSub) {
                                  handleUpdateAssignmentItem(idx, {
                                    subjectId: nextSub.id,
                                    subjectName: nextSub.name,
                                    weeklyHours: nextSub.weeklyHours || ac.weeklyHours
                                  });
                                }
                              }}
                              className="w-full bg-white border border-[#cde6d5] rounded-lg px-2 py-1 text-xs font-medium text-slate-800"
                            >
                              {classSubjects.length > 0 ? (
                                classSubjects.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </option>
                                ))
                              ) : (
                                <option value={ac.subjectId}>{ac.subjectName}</option>
                              )}
                            </select>
                          </div>

                          <div className="col-span-4 sm:col-span-2 flex items-center space-x-1">
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={ac.weeklyHours}
                              onChange={(e) =>
                                handleUpdateAssignmentItem(idx, {
                                  weeklyHours: Math.max(1, Number(e.target.value) || 1)
                                })
                              }
                              className="w-full bg-white border border-[#cde6d5] rounded-lg px-2 py-1 text-xs font-bold text-slate-800 text-center"
                            />
                            <span className="text-[10px] text-[#4b6755]">h</span>
                          </div>

                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(idx)}
                              title="Remover atribuição"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[11px] text-[#4b6755] bg-[#f7fbf8] border border-dashed border-[#cde6d5] rounded-xl">
                    Nenhuma turma/disciplina atribuída ainda. Marque 1 ou mais disciplinas acima e clique em "+ Atribuir Turma".
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#dce7df] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTeacher(null);
                  }}
                  className="min-h-[42px] px-4 py-2 border border-[#cde6d5] rounded-xl text-[#4b6755] hover:bg-[#f7fbf8] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 bg-gradient-to-r from-[#067836] to-[#149a45] hover:from-[#05652d] hover:to-[#11863b] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingTeacher ? 'Guardar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
