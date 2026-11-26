/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Listas Nominais das Turmas em Folha A4 Branca (Administradores Escolares)
 * Lista alfabética de alunos matriculados por classe/turma com cálculo de idade e assinaturas oficiais
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ListChecks,
  Search,
  Users,
  School,
  Calendar,
  MapPin,
  PlusCircle
} from 'lucide-react';
import { ClassRoom, Institution, Student, Teacher } from '../../types';
import { OfficialDocumentHeader } from '../common/OfficialDocumentHeader';
import { DocumentExportBar } from '../common/DocumentExportBar';
import { formatAngolaDate } from '../../utils/currency';

interface ClassListsSheetProps {
  currentInstitution: Institution;
  classes: ClassRoom[];
  students: Student[];
  teachers: Teacher[];
  onNavigateTab?: (tab: string) => void;
}

function parseBirthDate(raw?: string): Date | null {
  const clean = String(raw || '').trim();
  if (!clean) return null;

  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d;
    }
    return null;
  }

  // Formato YYYY-MM-DD (evitar deslocamento de fuso horário)
  const yyyymmdd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyymmdd) {
    const year = Number(yyyymmdd[1]);
    const month = Number(yyyymmdd[2]);
    const day = Number(yyyymmdd[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d;
    }
    return null;
  }

  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateStudentAge(birthDate?: string): number | null {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

function formatShiftLabel(shift: ClassRoom['shift']): string {
  switch (shift) {
    case 'manha':
      return 'Manhã';
    case 'tarde':
      return 'Tarde';
    case 'noite':
      return 'Noite';
    case 'integral':
      return 'Integral';
    default:
      return shift;
  }
}

export const ClassListsSheet: React.FC<ClassListsSheetProps> = ({
  currentInstitution,
  classes,
  students,
  teachers,
  onNavigateTab
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [classSearch, setClassSearch] = useState('');

  const instClasses = useMemo(
    () =>
      classes
        .filter((c) => c.institutionId === currentInstitution.id)
        .sort((a, b) =>
          `${a.gradeLevel} ${a.name}`.localeCompare(`${b.gradeLevel} ${b.name}`, 'pt', {
            sensitivity: 'base',
            numeric: true
          })
        ),
    [classes, currentInstitution.id]
  );

  const instStudents = useMemo(
    () => students.filter((s) => s.institutionId === currentInstitution.id),
    [students, currentInstitution.id]
  );

  const instTeachers = useMemo(
    () => teachers.filter((t) => t.institutionId === currentInstitution.id),
    [teachers, currentInstitution.id]
  );

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return instClasses;
    return instClasses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.gradeLevel.toLowerCase().includes(q) ||
        (c.courseName || '').toLowerCase().includes(q)
    );
  }, [instClasses, classSearch]);

  const [selectedClassId, setSelectedClassId] = useState<string>(instClasses[0]?.id || '');

  useEffect(() => {
    if (instClasses.length === 0) {
      setSelectedClassId('');
      return;
    }
    const stillExists = instClasses.some((c) => c.id === selectedClassId);
    if (!stillExists) {
      setSelectedClassId(instClasses[0].id);
    }
  }, [instClasses, selectedClassId]);

  const selectedClass = useMemo(
    () => instClasses.find((c) => c.id === selectedClassId) || instClasses[0] || null,
    [instClasses, selectedClassId]
  );

  const sortedClassStudents = useMemo(() => {
    if (!selectedClass) return [];
    return instStudents
      .filter((s) => s.classId === selectedClass.id)
      .sort((a, b) =>
        (a.fullName || '').localeCompare(b.fullName || '', 'pt', {
          sensitivity: 'base',
          numeric: true
        })
      );
  }, [instStudents, selectedClass]);

  const classTeacherName = useMemo(() => {
    if (!selectedClass) return '_______________________________';
    if (selectedClass.classDirectorName?.trim()) {
      return selectedClass.classDirectorName.trim();
    }
    if (selectedClass.classDirectorId) {
      const byId = instTeachers.find((t) => t.id === selectedClass.classDirectorId);
      if (byId?.fullName) return byId.fullName;
    }
    const assigned = instTeachers.find((t) =>
      t.assignedClasses?.some((ac) => ac.classId === selectedClass.id)
    );
    if (assigned?.fullName) return assigned.fullName;
    return '_______________________________';
  }, [selectedClass, instTeachers]);

  const totalMale = sortedClassStudents.filter((s) => s.gender === 'M').length;
  const totalFemale = sortedClassStudents.filter((s) => s.gender === 'F').length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Barra de Exportação A4 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#dce7df] print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#064e26] tracking-tight flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-[#067836]" />
            <span>Listas Nominais das Turmas (Folha A4)</span>
          </h1>
          <p className="text-xs text-[#4b6755] mt-0.5">
            {currentInstitution.name} · {instClasses.length} turma{instClasses.length === 1 ? '' : 's'} criada{instClasses.length === 1 ? '' : 's'} · Ordem alfabética com idade e assinaturas oficiais
          </p>
        </div>

        {selectedClass && (
          <DocumentExportBar
            targetRef={sheetRef}
            filename={`Lista_Nominal_${selectedClass.code}_${selectedClass.name.replace(/\s+/g, '_')}`}
            documentTitle={`Lista Nominal - ${selectedClass.gradeLevel} ${selectedClass.name}`}
            defaultFormat="A4"
            defaultOrientation="portrait"
          />
        )}
      </div>

      {/* Painel de Selecção da Turma (Oculto na impressão) */}
      <div className="bg-white rounded-2xl border border-[#dce7df] shadow-[0_2px_10px_rgba(2,44,22,0.04)] p-4 space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#4b6755] absolute left-3 top-2.5" />
            <input
              type="text"
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="Filtrar turma por classe, nome ou código..."
              className="w-full bg-[#f7fbf8] text-[#064e26] text-xs rounded-xl pl-9 pr-4 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#064e26] whitespace-nowrap">
              Seleccionar Turma:
            </label>
            <select
              value={selectedClass?.id || ''}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={instClasses.length === 0}
              className="bg-[#f7fbf8] text-[#064e26] text-xs font-bold rounded-xl px-3 py-2 border border-[#cde6d5] focus:border-[#067836] focus:ring-2 focus:ring-[#16a34a]/15 focus:outline-none min-w-[240px]"
            >
              {instClasses.map((cls) => {
                const count = instStudents.filter((s) => s.classId === cls.id).length;
                return (
                  <option key={cls.id} value={cls.id}>
                    {cls.gradeLevel} · {cls.name} ({cls.code}) — {count} aluno{count === 1 ? '' : 's'}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Cartões rápidos das turmas criadas */}
        {filteredClasses.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {filteredClasses.map((cls) => {
              const count = instStudents.filter((s) => s.classId === cls.id).length;
              const isSelected = selectedClass?.id === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#067836] to-[#149a45] text-white border-[#067836] shadow-sm'
                      : 'bg-[#f7fbf8] text-[#064e26] border-[#cde6d5] hover:bg-[#eaf6ee]'
                  }`}
                >
                  <School className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#067836]'}`} />
                  <div className="text-xs leading-tight">
                    <div className="font-bold">
                      {cls.gradeLevel} · {cls.name}
                    </div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-emerald-100' : 'text-[#4b6755]'
                      }`}
                    >
                      {formatShiftLabel(cls.shift)} · {count} aluno{count === 1 ? '' : 's'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Área da Folha A4 Branca */}
      {instClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#cde6d5] p-10 text-center space-y-3">
          <School className="w-10 h-10 text-[#067836]/60 mx-auto" />
          <h2 className="text-base font-bold text-[#064e26]">
            Ainda não existem turmas criadas nesta escola
          </h2>
          <p className="text-xs text-[#4b6755] max-w-md mx-auto">
            Crie primeiro as turmas e matricule os alunos para gerar automaticamente a lista nominal oficial em folha A4 branca.
          </p>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('classes')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#067836] to-[#149a45] text-white font-bold text-xs shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ir para Turmas</span>
            </button>
          )}
        </div>
      ) : selectedClass ? (
        <div className="overflow-x-auto pb-6">
          {/* Folha A4 Branca Oficial (210mm x 297mm) */}
          <div
            ref={sheetRef}
            className="official-document-sheet bg-white text-black mx-auto w-full max-w-[794px] min-h-[1123px] p-8 sm:p-12 shadow-lg border border-slate-300 flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:min-h-0"
          >
            <div className="space-y-5">
              {/* 1. CABEÇALHO OFICIAL */}
              <div className="pb-3 border-b-2 border-black">
                <OfficialDocumentHeader
                  institution={currentInstitution}
                  insigniaClassName="h-14 w-auto mx-auto object-contain"
                />
              </div>

              {/* 2. TÍTULO, CLASSE E TURMA */}
              <div className="text-center space-y-2">
                <h2 className="font-bold uppercase underline tracking-wide text-black">
                  LISTA NOMINAL DOS ALUNOS
                </h2>
                <div className="border border-black p-3 text-left space-y-1">
                  <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                    <div>
                      <strong>Classe:</strong> {selectedClass.gradeLevel}
                      {selectedClass.courseName ? ` — ${selectedClass.courseName}` : ''}
                    </div>
                    <div>
                      <strong>Turma:</strong> {selectedClass.name} ({selectedClass.code})
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                    <div>
                      <strong>Turno:</strong> {formatShiftLabel(selectedClass.shift)} ·{' '}
                      <strong>Sala:</strong> {selectedClass.room}
                    </div>
                    <div>
                      <strong>Ano Lectivo:</strong> {selectedClass.academicYear}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 pt-1 border-t border-black/30">
                    <div>
                      <strong>Total de Alunos:</strong> {sortedClassStudents.length} (M: {totalMale} | F: {totalFemale})
                    </div>
                    <div>
                      <strong>Professor(a) da Turma:</strong> {classTeacherName}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. LISTA NOMINAL EM ORDEM ALFABÉTICA COM A IDADE */}
              {sortedClassStudents.length > 0 ? (
                <div>
                  <table className="w-full border-collapse border border-black text-left">
                    <thead>
                      <tr className="border-b border-black">
                        <th className="border border-black py-1.5 px-2 text-center w-12 font-bold">
                          N.º
                        </th>
                        <th className="border border-black py-1.5 px-2 w-28 font-bold">
                          N.º Processo
                        </th>
                        <th className="border border-black py-1.5 px-2.5 font-bold">
                          Nome Completo (Ordem Alfabética)
                        </th>
                        <th className="border border-black py-1.5 px-2 text-center w-16 font-bold">
                          Gén.
                        </th>
                        <th className="border border-black py-1.5 px-2 text-center w-24 font-bold">
                          Idade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedClassStudents.map((stu, idx) => {
                        const age = calculateStudentAge(stu.birthDate);
                        return (
                          <tr key={stu.id} className="border-b border-black">
                            <td className="border border-black py-1.5 px-2 text-center">
                              {idx + 1}
                            </td>
                            <td className="border border-black py-1.5 px-2">
                              {stu.processNumber}
                            </td>
                            <td className="border border-black py-1.5 px-2.5 font-semibold">
                              {stu.fullName}
                            </td>
                            <td className="border border-black py-1.5 px-2 text-center">
                              {stu.gender || '—'}
                            </td>
                            <td className="border border-black py-1.5 px-2 text-center">
                              {age !== null ? `${age} anos` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-black p-8 text-center space-y-2">
                  <Users className="w-7 h-7 mx-auto text-black/60 print:hidden" />
                  <p className="font-semibold">
                    Nenhum aluno cadastrado nesta turma ({selectedClass.gradeLevel} · {selectedClass.name}).
                  </p>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('students')}
                      className="print:hidden mt-2 px-4 py-1.5 rounded-lg bg-[#067836] text-white font-bold cursor-pointer"
                    >
                      Matricular Alunos
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4. LOCAL, DATA E ASSINATURAS NO FINAL DA FOLHA A4 */}
            <div className="pt-10 mt-8 space-y-8">
              <div className="text-center flex items-center justify-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 hidden" />
                  {currentInstitution.municipality || 'Município'}, {currentInstitution.province || 'Angola'}, aos{' '}
                  {formatAngolaDate(new Date())}
                </span>
                <Calendar className="w-3.5 h-3.5 hidden" />
              </div>

              <div className="grid grid-cols-3 gap-6 pt-4 text-center items-end">
                <div className="space-y-1">
                  <div className="font-bold">O(A) Professor(a) da Turma</div>
                  <div className="pt-8 border-b border-black mx-2" />
                  <div className="pt-1">{classTeacherName}</div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold">O(A) Subdirector(a) Pedagógico(a)</div>
                  <div className="pt-8 border-b border-black mx-2" />
                  <div className="pt-1">
                    {currentInstitution.subdirectorPedagogico?.trim() ||
                      '_____________________________'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold">O(A) Director(a) da Escola</div>
                  <div className="pt-8 border-b border-black mx-2" />
                  <div className="pt-1">
                    {currentInstitution.directorName?.trim() ||
                      '_____________________________'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
