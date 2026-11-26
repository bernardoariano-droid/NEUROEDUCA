/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NEUROEDUCA - Script SQL Oficial de Sincronização Supabase (PostgreSQL)
 * Inclui todas as 18 tabelas relacionais, Sessões Seguras (x-ne-session),
 * Chaves Estrangeiras (FK), Índices, Ligação com Supabase Auth (auth.users) e Políticas RLS.
 */

export const NEUROEDUCA_SUPABASE_SYNC_SQL = `-- =====================================================================
-- NEUROEDUCA - SCRIPT COMPLETO DE TABELAS, CHAVES ESTRANGEIRAS, SESSÕES & RLS
-- Execute este script no SQL Editor do seu projecto Supabase
-- (Database > SQL Editor > New Query > Run)
-- Seguro para executar em bancos novos OU já existentes (Idempotente).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Metadados de Sincronização
CREATE TABLE IF NOT EXISTS public.neuroeduca_sync_meta (
    id TEXT PRIMARY KEY,
    last_pushed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    app_version TEXT,
    summary JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Instituições de Ensino (Tabela Pai Multi-Tenant)
CREATE TABLE IF NOT EXISTS public.neuroeduca_institutions (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    acronym TEXT,
    nif TEXT,
    institution_type TEXT,
    category TEXT,
    province TEXT,
    municipality TEXT,
    status TEXT DEFAULT 'active',
    max_classes INTEGER DEFAULT 20,
    current_classes_count INTEGER DEFAULT 0,
    current_students_count INTEGER DEFAULT 0,
    current_teachers_count INTEGER DEFAULT 0,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Docentes / Professores -> FK Instituição
CREATE TABLE IF NOT EXISTS public.neuroeduca_teachers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    staff_code TEXT,
    full_name TEXT NOT NULL,
    academic_degree TEXT,
    specialization TEXT,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_teachers_inst ON public.neuroeduca_teachers(institution_id);

-- 4. Turmas -> FK Instituição
CREATE TABLE IF NOT EXISTS public.neuroeduca_classes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    subsystem_code TEXT,
    grade_level TEXT,
    shift TEXT,
    room TEXT,
    academic_year TEXT,
    max_capacity INTEGER DEFAULT 45,
    enrolled_students_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'aberta',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_classes_inst ON public.neuroeduca_classes(institution_id);

-- 5. Disciplinas Personalizadas -> FK Instituição & FK Docente
CREATE TABLE IF NOT EXISTS public.neuroeduca_subjects (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    short_name TEXT,
    subsystem_code TEXT,
    grade_level TEXT,
    teacher_id TEXT REFERENCES public.neuroeduca_teachers(id) ON DELETE SET NULL,
    teacher_name TEXT,
    status TEXT DEFAULT 'activa',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_subjects_inst ON public.neuroeduca_subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_subjects_teacher ON public.neuroeduca_subjects(teacher_id);

-- 6. Estudantes / Alunos -> FK Instituição & FK Turma
CREATE TABLE IF NOT EXISTS public.neuroeduca_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    class_id TEXT REFERENCES public.neuroeduca_classes(id) ON DELETE SET NULL,
    process_number TEXT,
    full_name TEXT NOT NULL,
    gender TEXT,
    birth_date TEXT,
    identity_card_number TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    academic_status TEXT DEFAULT 'matriculado',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_students_inst ON public.neuroeduca_students(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_students_class ON public.neuroeduca_students(class_id);

-- 7. Notas, Mini-Pautas e Pautas -> FK Instituição, FK Aluno & FK Turma
CREATE TABLE IF NOT EXISTS public.neuroeduca_grades (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.neuroeduca_classes(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    subject_name TEXT,
    period TEXT NOT NULL,
    ac1 NUMERIC(5,2),
    ac2 NUMERIC(5,2),
    ac3 NUMERIC(5,2),
    mac NUMERIC(5,2),
    npt NUMERIC(5,2),
    mt NUMERIC(5,2),
    exam_normal NUMERIC(5,2),
    exam_recourse NUMERIC(5,2),
    final_grade NUMERIC(5,2),
    result_status TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_grades_inst ON public.neuroeduca_grades(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_grades_student ON public.neuroeduca_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_ne_grades_class ON public.neuroeduca_grades(class_id);

-- 8. Facturas e Propinas -> FK Instituição & FK Aluno
CREATE TABLE IF NOT EXISTS public.neuroeduca_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    category TEXT DEFAULT 'propina',
    month_reference TEXT,
    description TEXT,
    total_aoa NUMERIC(15,2) DEFAULT 0,
    amount_paid_aoa NUMERIC(15,2) DEFAULT 0,
    balance_aoa NUMERIC(15,2) DEFAULT 0,
    due_date TEXT,
    status TEXT DEFAULT 'pendente',
    multicaixa_reference TEXT,
    receipt_number TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_invoices_inst ON public.neuroeduca_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_invoices_student ON public.neuroeduca_invoices(student_id);

-- 9. Frequência / Presenças e Justificações -> FK Instituição, FK Aluno & FK Turma
CREATE TABLE IF NOT EXISTS public.neuroeduca_attendance (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES public.neuroeduca_classes(id) ON DELETE CASCADE,
    attendance_date TEXT NOT NULL,
    month_reference TEXT,
    status TEXT NOT NULL,
    justification_status TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_attendance_inst ON public.neuroeduca_attendance(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_attendance_student ON public.neuroeduca_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_ne_attendance_class ON public.neuroeduca_attendance(class_id);

-- 10. Arquivo Digital Escolar (Documentos Pessoais + Supabase Storage) -> FK Instituição & FK Aluno
CREATE TABLE IF NOT EXISTS public.neuroeduca_digital_archive (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE,
    document_type TEXT,
    title TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    file_size_bytes BIGINT,
    storage_bucket TEXT DEFAULT 'neuroeduca-student-docs',
    storage_path TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pendente',
    uploaded_at TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_archive_inst ON public.neuroeduca_digital_archive(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_archive_student ON public.neuroeduca_digital_archive(student_id);

-- 11. Notificações Financeiras -> FK Instituição, FK Aluno & FK Factura
CREATE TABLE IF NOT EXISTS public.neuroeduca_financial_notifications (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES public.neuroeduca_invoices(id) ON DELETE SET NULL,
    recipient_target TEXT,
    notification_type TEXT,
    title TEXT NOT NULL,
    message TEXT,
    amount_aoa NUMERIC(15,2),
    is_read BOOLEAN DEFAULT false,
    sent_at TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_fin_notif_inst ON public.neuroeduca_financial_notifications(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_fin_notif_student ON public.neuroeduca_financial_notifications(student_id);

-- 12. Comunicados Oficiais -> FK Instituição (NULL para comunicados do Super Admin)
CREATE TABLE IF NOT EXISTS public.neuroeduca_announcements (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    sender_role TEXT,
    sender_name TEXT,
    target_scope TEXT,
    priority TEXT DEFAULT 'normal',
    category TEXT DEFAULT 'geral',
    title TEXT NOT NULL,
    content TEXT,
    published_at TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_announcements_inst ON public.neuroeduca_announcements(institution_id);

-- 13. Credenciais & Perfis de Acesso -> FK Instituição & FK Supabase Auth (auth.users)
CREATE TABLE IF NOT EXISTS public.neuroeduca_accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    institution_id TEXT REFERENCES public.neuroeduca_institutions(id) ON DELETE SET NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    municipality TEXT,
    province TEXT,
    status TEXT DEFAULT 'activo',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_accounts_inst ON public.neuroeduca_accounts(institution_id);

-- 14. Utilizadores Institucionais & Directores Municipais -> FK Instituição, FK Conta & FK Auth
CREATE TABLE IF NOT EXISTS public.neuroeduca_school_users (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES public.neuroeduca_accounts(id) ON DELETE SET NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    municipality TEXT,
    province TEXT,
    status TEXT DEFAULT 'activo',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_school_users_inst ON public.neuroeduca_school_users(institution_id);

-- 15. Planos de Subscrição SaaS
CREATE TABLE IF NOT EXISTS public.neuroeduca_subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cycle TEXT,
    price_aoa NUMERIC(15,2) DEFAULT 0,
    max_classes INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Registos de Auditoria -> FK Instituição
CREATE TABLE IF NOT EXISTS public.neuroeduca_audit_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.neuroeduca_institutions(id) ON DELETE SET NULL,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp_str TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_audit_inst ON public.neuroeduca_audit_logs(institution_id);

-- 17. Protocolos Psicopedagógicos Globais (Super Admin)
CREATE TABLE IF NOT EXISTS public.neuroeduca_psychopedagogical_protocols (
    id TEXT PRIMARY KEY,
    code TEXT,
    title TEXT NOT NULL,
    category TEXT,
    target_subsystem TEXT,
    is_active BOOLEAN DEFAULT true,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Dossiês & Acompanhamento Psicopedagógico por Escola -> FK Instituição & FK Aluno
CREATE TABLE IF NOT EXISTS public.neuroeduca_psychopedagogical_cases (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE,
    case_code TEXT,
    student_name TEXT NOT NULL,
    status TEXT DEFAULT 'em_avaliacao',
    risk_level TEXT,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_psy_cases_inst ON public.neuroeduca_psychopedagogical_cases(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_psy_cases_student ON public.neuroeduca_psychopedagogical_cases(student_id);

-- 19. Sessões Seguras de Utilizadores (Token Opaco SHA-256)
CREATE TABLE IF NOT EXISTS public.neuroeduca_sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES public.neuroeduca_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ne_sessions_account ON public.neuroeduca_sessions(account_id);
REVOKE ALL ON public.neuroeduca_sessions FROM PUBLIC, anon, authenticated;
ALTER TABLE public.neuroeduca_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- MIGRAÇÃO IDEMPOTENTE: APLICAR COLUNAS DE LIGAÇÃO E CHAVES ESTRANGEIRAS
-- EM TABELAS JÁ EXISTENTES
-- =====================================================================

ALTER TABLE public.neuroeduca_accounts
    ADD COLUMN IF NOT EXISTS auth_user_id UUID,
    ALTER COLUMN institution_id DROP NOT NULL;

ALTER TABLE public.neuroeduca_school_users
    ADD COLUMN IF NOT EXISTS account_id TEXT,
    ADD COLUMN IF NOT EXISTS auth_user_id UUID,
    ALTER COLUMN institution_id DROP NOT NULL;

ALTER TABLE public.neuroeduca_announcements
    ALTER COLUMN institution_id DROP NOT NULL;

ALTER TABLE public.neuroeduca_audit_logs
    ALTER COLUMN institution_id DROP NOT NULL;

ALTER TABLE public.neuroeduca_subjects
    ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.neuroeduca_students
    ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE public.neuroeduca_financial_notifications
    ADD COLUMN IF NOT EXISTS invoice_id TEXT;

ALTER TABLE public.neuroeduca_digital_archive
    ADD COLUMN IF NOT EXISTS mime_type TEXT,
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'neuroeduca-student-docs',
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Saneamento seguro antes de criar Foreign Keys
UPDATE public.neuroeduca_school_users
SET institution_id = NULL
WHERE institution_id IS NOT NULL
  AND (institution_id = '' OR institution_id = 'municipal' OR institution_id NOT IN (SELECT id FROM public.neuroeduca_institutions));

UPDATE public.neuroeduca_accounts
SET institution_id = NULL
WHERE institution_id IS NOT NULL
  AND (institution_id = '' OR institution_id = 'municipal' OR institution_id NOT IN (SELECT id FROM public.neuroeduca_institutions));

UPDATE public.neuroeduca_announcements
SET institution_id = NULL
WHERE institution_id IS NOT NULL
  AND (institution_id = '' OR institution_id NOT IN (SELECT id FROM public.neuroeduca_institutions));

UPDATE public.neuroeduca_audit_logs
SET institution_id = NULL
WHERE institution_id IS NOT NULL
  AND (institution_id = '' OR institution_id NOT IN (SELECT id FROM public.neuroeduca_institutions));

UPDATE public.neuroeduca_subjects
SET teacher_id = NULL
WHERE teacher_id IS NOT NULL
  AND teacher_id NOT IN (SELECT id FROM public.neuroeduca_teachers);

UPDATE public.neuroeduca_students
SET class_id = NULL
WHERE class_id IS NOT NULL
  AND class_id NOT IN (SELECT id FROM public.neuroeduca_classes);

UPDATE public.neuroeduca_financial_notifications
SET invoice_id = COALESCE(invoice_id, payload->>'invoiceId')
WHERE invoice_id IS NULL AND payload ? 'invoiceId';

UPDATE public.neuroeduca_financial_notifications
SET invoice_id = NULL
WHERE invoice_id IS NOT NULL
  AND invoice_id NOT IN (SELECT id FROM public.neuroeduca_invoices);

UPDATE public.neuroeduca_school_users u
SET account_id = a.id
FROM public.neuroeduca_accounts a
WHERE lower(u.email) = lower(a.email)
  AND (u.account_id IS NULL OR u.account_id <> a.id);

UPDATE public.neuroeduca_accounts a
SET auth_user_id = au.id
FROM auth.users au
WHERE lower(a.email) = lower(au.email)
  AND a.auth_user_id IS DISTINCT FROM au.id;

UPDATE public.neuroeduca_school_users u
SET auth_user_id = au.id
FROM auth.users au
WHERE lower(u.email) = lower(au.email)
  AND u.auth_user_id IS DISTINCT FROM au.id;

DROP INDEX IF EXISTS public.idx_ne_accounts_auth_uid;
DROP INDEX IF EXISTS public.idx_ne_school_users_auth_uid;
CREATE INDEX IF NOT EXISTS idx_ne_accounts_auth_uid ON public.neuroeduca_accounts(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ne_school_users_auth_uid ON public.neuroeduca_school_users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ne_subjects_teacher ON public.neuroeduca_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ne_grades_class ON public.neuroeduca_grades(class_id);
CREATE INDEX IF NOT EXISTS idx_ne_attendance_class ON public.neuroeduca_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_ne_archive_student ON public.neuroeduca_digital_archive(student_id);
CREATE INDEX IF NOT EXISTS idx_ne_fin_notif_student ON public.neuroeduca_financial_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_ne_fin_notif_invoice ON public.neuroeduca_financial_notifications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ne_accounts_inst ON public.neuroeduca_accounts(institution_id);
CREATE INDEX IF NOT EXISTS idx_ne_school_users_account ON public.neuroeduca_school_users(account_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_teachers_inst') THEN
        ALTER TABLE public.neuroeduca_teachers
            ADD CONSTRAINT fk_ne_teachers_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_classes_inst') THEN
        ALTER TABLE public.neuroeduca_classes
            ADD CONSTRAINT fk_ne_classes_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_subjects_inst') THEN
        ALTER TABLE public.neuroeduca_subjects
            ADD CONSTRAINT fk_ne_subjects_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_subjects_teacher') THEN
        ALTER TABLE public.neuroeduca_subjects
            ADD CONSTRAINT fk_ne_subjects_teacher FOREIGN KEY (teacher_id) REFERENCES public.neuroeduca_teachers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_students_inst') THEN
        ALTER TABLE public.neuroeduca_students
            ADD CONSTRAINT fk_ne_students_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_students_class') THEN
        ALTER TABLE public.neuroeduca_students
            ADD CONSTRAINT fk_ne_students_class FOREIGN KEY (class_id) REFERENCES public.neuroeduca_classes(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_grades_inst') THEN
        ALTER TABLE public.neuroeduca_grades
            ADD CONSTRAINT fk_ne_grades_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_grades_student') THEN
        ALTER TABLE public.neuroeduca_grades
            ADD CONSTRAINT fk_ne_grades_student FOREIGN KEY (student_id) REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_grades_class') THEN
        ALTER TABLE public.neuroeduca_grades
            ADD CONSTRAINT fk_ne_grades_class FOREIGN KEY (class_id) REFERENCES public.neuroeduca_classes(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_invoices_inst') THEN
        ALTER TABLE public.neuroeduca_invoices
            ADD CONSTRAINT fk_ne_invoices_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_invoices_student') THEN
        ALTER TABLE public.neuroeduca_invoices
            ADD CONSTRAINT fk_ne_invoices_student FOREIGN KEY (student_id) REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_attendance_inst') THEN
        ALTER TABLE public.neuroeduca_attendance
            ADD CONSTRAINT fk_ne_attendance_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_attendance_student') THEN
        ALTER TABLE public.neuroeduca_attendance
            ADD CONSTRAINT fk_ne_attendance_student FOREIGN KEY (student_id) REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_attendance_class') THEN
        ALTER TABLE public.neuroeduca_attendance
            ADD CONSTRAINT fk_ne_attendance_class FOREIGN KEY (class_id) REFERENCES public.neuroeduca_classes(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_archive_inst') THEN
        ALTER TABLE public.neuroeduca_digital_archive
            ADD CONSTRAINT fk_ne_archive_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_archive_student') THEN
        ALTER TABLE public.neuroeduca_digital_archive
            ADD CONSTRAINT fk_ne_archive_student FOREIGN KEY (student_id) REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_fin_notif_inst') THEN
        ALTER TABLE public.neuroeduca_financial_notifications
            ADD CONSTRAINT fk_ne_fin_notif_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_fin_notif_student') THEN
        ALTER TABLE public.neuroeduca_financial_notifications
            ADD CONSTRAINT fk_ne_fin_notif_student FOREIGN KEY (student_id) REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_fin_notif_invoice') THEN
        ALTER TABLE public.neuroeduca_financial_notifications
            ADD CONSTRAINT fk_ne_fin_notif_invoice FOREIGN KEY (invoice_id) REFERENCES public.neuroeduca_invoices(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_announcements_inst') THEN
        ALTER TABLE public.neuroeduca_announcements
            ADD CONSTRAINT fk_ne_announcements_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_accounts_inst') THEN
        ALTER TABLE public.neuroeduca_accounts
            ADD CONSTRAINT fk_ne_accounts_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_accounts_auth') THEN
        ALTER TABLE public.neuroeduca_accounts
            ADD CONSTRAINT fk_ne_accounts_auth FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_school_users_inst') THEN
        ALTER TABLE public.neuroeduca_school_users
            ADD CONSTRAINT fk_ne_school_users_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_school_users_account') THEN
        ALTER TABLE public.neuroeduca_school_users
            ADD CONSTRAINT fk_ne_school_users_account FOREIGN KEY (account_id) REFERENCES public.neuroeduca_accounts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_school_users_auth') THEN
        ALTER TABLE public.neuroeduca_school_users
            ADD CONSTRAINT fk_ne_school_users_auth FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_audit_inst') THEN
        ALTER TABLE public.neuroeduca_audit_logs
            ADD CONSTRAINT fk_ne_audit_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_psy_cases_inst') THEN
        ALTER TABLE public.neuroeduca_psychopedagogical_cases
            ADD CONSTRAINT fk_ne_psy_cases_inst FOREIGN KEY (institution_id) REFERENCES public.neuroeduca_institutions(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ne_psy_cases_student') THEN
        ALTER TABLE public.neuroeduca_psychopedagogical_cases
            ADD CONSTRAINT fk_ne_psy_cases_student FOREIGN KEY (student_id) REFERENCES public.neuroeduca_students(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================================
-- TRIGGERS AUTOMÁTICOS DE LIGAÇÃO: auth.users <-> accounts <-> school_users
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_neuroeduca_account_auth_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        NEW.email := lower(trim(NEW.email));
        IF NEW.auth_user_id IS NULL THEN
            SELECT id INTO NEW.auth_user_id
            FROM auth.users
            WHERE lower(email) = NEW.email
            LIMIT 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ne_account_auth ON public.neuroeduca_accounts;
CREATE TRIGGER trg_sync_ne_account_auth
    BEFORE INSERT OR UPDATE ON public.neuroeduca_accounts
    FOR EACH ROW EXECUTE FUNCTION public.sync_neuroeduca_account_auth_link();

CREATE OR REPLACE FUNCTION public.sync_neuroeduca_school_user_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        NEW.email := lower(trim(NEW.email));
        IF NEW.account_id IS NULL THEN
            SELECT id INTO NEW.account_id
            FROM public.neuroeduca_accounts
            WHERE lower(email) = NEW.email
            LIMIT 1;
        END IF;
        IF NEW.auth_user_id IS NULL THEN
            SELECT id INTO NEW.auth_user_id
            FROM auth.users
            WHERE lower(email) = NEW.email
            LIMIT 1;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ne_school_user_links ON public.neuroeduca_school_users;
CREATE TRIGGER trg_sync_ne_school_user_links
    BEFORE INSERT OR UPDATE ON public.neuroeduca_school_users
    FOR EACH ROW EXECUTE FUNCTION public.sync_neuroeduca_school_user_links();

CREATE OR REPLACE FUNCTION public.handle_auth_user_to_neuroeduca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    clean_email TEXT;
    meta_role TEXT;
    meta_name TEXT;
    meta_inst TEXT;
BEGIN
    IF NEW.email IS NULL THEN
        RETURN NEW;
    END IF;

    clean_email := lower(trim(NEW.email));
    meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'director_geral');
    meta_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', clean_email);
    meta_inst := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'institution_id', '')), '');

    IF meta_inst = 'municipal' OR (meta_inst IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.neuroeduca_institutions WHERE id = meta_inst
    )) THEN
        meta_inst := NULL;
    END IF;

    INSERT INTO public.neuroeduca_accounts (
        id, email, full_name, role, institution_id, auth_user_id, status, payload, updated_at
    )
    VALUES (
        clean_email,
        clean_email,
        meta_name,
        meta_role,
        meta_inst,
        NEW.id,
        'activo',
        jsonb_build_object(
            'email', clean_email,
            'fullName', meta_name,
            'role', meta_role,
            'institutionId', meta_inst,
            'status', 'activo'
        ),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        auth_user_id = NEW.id,
        updated_at = now();

    UPDATE public.neuroeduca_school_users
    SET auth_user_id = NEW.id,
        account_id = clean_email,
        updated_at = now()
    WHERE lower(email) = clean_email
      AND (auth_user_id IS DISTINCT FROM NEW.id OR account_id IS DISTINCT FROM clean_email);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_synced_to_neuroeduca ON auth.users;
CREATE TRIGGER on_auth_user_synced_to_neuroeduca
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_to_neuroeduca();

-- =====================================================================
-- AUTENTICAÇÃO, SESSÃO SEGURA E ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- Suporta Supabase Auth (auth.uid()) E Sessões NEUROEDUCA (x-ne-session)
-- Zero acesso não autenticado a tabelas/ficheiros; controlo estrito por perfil
-- =====================================================================

-- 1. Leitura segura do cabeçalho x-ne-session enviado pelo cliente
CREATE OR REPLACE FUNCTION public.ne_read_session_token_header()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    SELECT NULLIF(trim(COALESCE(
        (current_setting('request.headers', true)::jsonb)->>'x-ne-session',
        ''
    )), '');
$$;

CREATE OR REPLACE FUNCTION public.ne_current_account_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_acc_id TEXT;
    v_uid UUID := auth.uid();
    v_raw_token TEXT;
    v_token_hash TEXT;
BEGIN
    IF v_uid IS NOT NULL THEN
        SELECT a.id INTO v_acc_id
        FROM public.neuroeduca_accounts a
        WHERE a.auth_user_id = v_uid
          AND COALESCE(a.status, 'activo') <> 'inactivo'
        LIMIT 1;
        IF v_acc_id IS NOT NULL THEN
            RETURN v_acc_id;
        END IF;
    END IF;

    v_raw_token := public.ne_read_session_token_header();
    IF v_raw_token IS NOT NULL THEN
        v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
        SELECT a.id INTO v_acc_id
        FROM public.neuroeduca_sessions s
        JOIN public.neuroeduca_accounts a ON a.id = s.account_id
        WHERE s.token_hash = v_token_hash
          AND s.expires_at > now()
          AND COALESCE(a.status, 'activo') <> 'inactivo'
        LIMIT 1;
        RETURN v_acc_id;
    END IF;

    RETURN NULL;
END;
$$;

-- 2. Funções auxiliares SECURITY DEFINER baseadas na conta autenticada
CREATE OR REPLACE FUNCTION public.ne_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    SELECT COALESCE(a.role, NULLIF(a.payload->>'role', ''))
    FROM public.neuroeduca_accounts a
    WHERE a.id = public.ne_current_account_id()
      AND COALESCE(a.status, 'activo') <> 'inactivo'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ne_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    SELECT COALESCE(public.ne_current_role() = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.ne_current_institution_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    SELECT COALESCE(a.institution_id, NULLIF(a.payload->>'institutionId', ''))
    FROM public.neuroeduca_accounts a
    WHERE a.id = public.ne_current_account_id()
      AND COALESCE(a.status, 'activo') <> 'inactivo'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ne_current_municipality()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    SELECT COALESCE(a.municipality, NULLIF(a.payload->>'municipality', ''))
    FROM public.neuroeduca_accounts a
    WHERE a.id = public.ne_current_account_id()
      AND COALESCE(a.status, 'activo') <> 'inactivo'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ne_is_school_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    SELECT COALESCE(
        public.ne_current_role() IN (
            'admin_institucional',
            'director_geral',
            'subdirector_pedagogico',
            'secretario_geral',
            'coordenador_curso',
            'director_turma',
            'professor',
            'funcionario_financeiro'
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.ne_is_school_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    SELECT COALESCE(
        public.ne_current_role() IN (
            'admin_institucional',
            'director_geral',
            'subdirector_pedagogico',
            'secretario_geral',
            'coordenador_curso'
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.ne_current_student_ids()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
    WITH acc AS (
        SELECT lower(trim(email)) AS acc_email, payload
        FROM public.neuroeduca_accounts
        WHERE id = public.ne_current_account_id()
          AND COALESCE(status, 'activo') <> 'inactivo'
        LIMIT 1
    )
    SELECT COALESCE(array_agg(DISTINCT s.id), ARRAY[]::TEXT[])
    FROM public.neuroeduca_students s, acc
    WHERE lower(COALESCE(s.payload->>'email', '')) = acc.acc_email
       OR lower(COALESCE(s.payload->>'guardianEmail', '')) = acc.acc_email
       OR s.id = NULLIF(acc.payload->>'linkedStudentId', '')
       OR (
           jsonb_typeof(acc.payload->'linkedStudentIds') = 'array'
           AND s.id IN (SELECT jsonb_array_elements_text(acc.payload->'linkedStudentIds'))
       );
$$;

REVOKE ALL ON FUNCTION public.ne_read_session_token_header() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_account_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_institution_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_municipality() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_is_school_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_is_school_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_student_ids() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ne_current_account_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_institution_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_municipality() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_is_school_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_is_school_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_student_ids() TO anon, authenticated;

-- 3. RPCs de Autenticação, Sessão, Bootstrap & Leitura de Comunicados
CREATE OR REPLACE FUNCTION public.verify_neuroeduca_login(
    p_email TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_clean_email TEXT := lower(trim(COALESCE(p_email, '')));
    v_acc RECORD;
    v_stored_pw TEXT;
    v_valid BOOLEAN := false;
    v_raw_token TEXT;
    v_token_hash TEXT;
BEGIN
    IF v_clean_email = '' OR COALESCE(p_password, '') = '' THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    SELECT id, email, full_name, role, institution_id, municipality, province, status, payload
    INTO v_acc
    FROM public.neuroeduca_accounts
    WHERE id = v_clean_email
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    IF COALESCE(v_acc.status, v_acc.payload->>'status', 'activo') = 'inactivo' THEN
        RETURN jsonb_build_object('authenticated', false, 'inactive', true);
    END IF;

    v_stored_pw := trim(COALESCE(v_acc.payload->>'password', ''));
    IF v_stored_pw = '' THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    IF v_stored_pw LIKE '$2%' THEN
        v_valid := (crypt(p_password, v_stored_pw) = v_stored_pw);
    ELSE
        v_valid := (v_stored_pw = trim(p_password));
    END IF;

    IF NOT v_valid THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    v_raw_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
    DELETE FROM public.neuroeduca_sessions WHERE expires_at <= now();
    INSERT INTO public.neuroeduca_sessions (token_hash, account_id, expires_at)
    VALUES (v_token_hash, v_acc.id, now() + interval '7 days');

    RETURN jsonb_build_object(
        'authenticated', true,
        'sessionToken', v_raw_token,
        'account', jsonb_build_object(
            'email', v_acc.email,
            'fullName', COALESCE(v_acc.full_name, v_acc.payload->>'fullName', v_acc.email),
            'role', COALESCE(v_acc.role, v_acc.payload->>'role', 'director_geral'),
            'institutionId', COALESCE(v_acc.institution_id, NULLIF(v_acc.payload->>'institutionId', '')),
            'institutionName', NULLIF(v_acc.payload->>'institutionName', ''),
            'municipality', COALESCE(v_acc.municipality, NULLIF(v_acc.payload->>'municipality', '')),
            'province', COALESCE(v_acc.province, NULLIF(v_acc.payload->>'province', '')),
            'status', 'activo'
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_neuroeduca_session_profile()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_acc_id TEXT := public.ne_current_account_id();
    v_acc RECORD;
BEGIN
    IF v_acc_id IS NULL THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    SELECT id, email, full_name, role, institution_id, municipality, province, status, payload
    INTO v_acc
    FROM public.neuroeduca_accounts
    WHERE id = v_acc_id
      AND COALESCE(status, 'activo') <> 'inactivo'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    RETURN jsonb_build_object(
        'authenticated', true,
        'account', jsonb_build_object(
            'email', v_acc.email,
            'fullName', COALESCE(v_acc.full_name, v_acc.payload->>'fullName', v_acc.email),
            'role', COALESCE(v_acc.role, v_acc.payload->>'role', 'director_geral'),
            'institutionId', COALESCE(v_acc.institution_id, NULLIF(v_acc.payload->>'institutionId', '')),
            'institutionName', NULLIF(v_acc.payload->>'institutionName', ''),
            'municipality', COALESCE(v_acc.municipality, NULLIF(v_acc.payload->>'municipality', '')),
            'province', COALESCE(v_acc.province, NULLIF(v_acc.payload->>'province', '')),
            'status', 'activo'
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.logout_neuroeduca_session(
    p_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_token TEXT := COALESCE(NULLIF(trim(COALESCE(p_token, '')), ''), public.ne_read_session_token_header());
BEGIN
    IF v_token IS NOT NULL THEN
        DELETE FROM public.neuroeduca_sessions
        WHERE token_hash = encode(digest(v_token, 'sha256'), 'hex');
    END IF;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_neuroeduca_bootstrap_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'hasAccounts', EXISTS(SELECT 1 FROM public.neuroeduca_accounts),
        'hasInstitutions', EXISTS(SELECT 1 FROM public.neuroeduca_institutions)
    );
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_neuroeduca_super_admin(
    p_email TEXT,
    p_full_name TEXT,
    p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_clean_email TEXT := lower(trim(COALESCE(p_email, '')));
    v_clean_name TEXT := NULLIF(trim(COALESCE(p_full_name, '')), '');
    v_hashed_pw TEXT;
    v_raw_token TEXT;
    v_token_hash TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.neuroeduca_accounts) THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'alreadyInitialized', true,
            'error', 'Já existem contas registadas neste projecto Supabase.'
        );
    END IF;

    IF v_clean_email = '' OR length(trim(COALESCE(p_password, ''))) < 3 THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'error', 'Informe um e-mail válido e palavra-passe com pelo menos 3 caracteres.'
        );
    END IF;

    v_clean_name := COALESCE(v_clean_name, 'Super Administrador');
    v_hashed_pw := crypt(trim(p_password), gen_salt('bf'));

    INSERT INTO public.neuroeduca_accounts (
        id, email, full_name, role, institution_id, status, payload, updated_at
    )
    VALUES (
        v_clean_email,
        v_clean_email,
        v_clean_name,
        'super_admin',
        NULL,
        'activo',
        jsonb_build_object(
            'email', v_clean_email,
            'password', v_hashed_pw,
            'fullName', v_clean_name,
            'role', 'super_admin',
            'institutionName', 'Administração Geral SaaS NEUROEDUCA',
            'status', 'activo'
        ),
        now()
    );

    v_raw_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');
    INSERT INTO public.neuroeduca_sessions (token_hash, account_id, expires_at)
    VALUES (v_token_hash, v_clean_email, now() + interval '7 days');

    RETURN jsonb_build_object(
        'authenticated', true,
        'sessionToken', v_raw_token,
        'account', jsonb_build_object(
            'email', v_clean_email,
            'fullName', v_clean_name,
            'role', 'super_admin',
            'institutionName', 'Administração Geral SaaS NEUROEDUCA',
            'status', 'activo'
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_neuroeduca_announcement_read(
    p_announcement_id TEXT,
    p_read_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_acc_id TEXT := public.ne_current_account_id();
    v_clean_key TEXT := lower(trim(COALESCE(p_read_key, '')));
    v_existing JSONB;
BEGIN
    IF v_acc_id IS NULL OR v_clean_key = '' OR COALESCE(p_announcement_id, '') = '' THEN
        RETURN false;
    END IF;

    SELECT COALESCE(payload->'readByUserKeys', '[]'::jsonb)
    INTO v_existing
    FROM public.neuroeduca_announcements
    WHERE id = p_announcement_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(v_existing) elem
        WHERE lower(trim(elem)) = v_clean_key
    ) THEN
        UPDATE public.neuroeduca_announcements
        SET payload = jsonb_set(
                payload,
                '{readByUserKeys}',
                v_existing || to_jsonb(v_clean_key),
                true
            ),
            updated_at = now()
        WHERE id = p_announcement_id;
    END IF;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_neuroeduca_login(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_neuroeduca_session_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.logout_neuroeduca_session(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_neuroeduca_bootstrap_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_neuroeduca_super_admin(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_neuroeduca_announcement_read(TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.verify_neuroeduca_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_neuroeduca_session_profile() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.logout_neuroeduca_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_neuroeduca_bootstrap_status() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_neuroeduca_super_admin(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_neuroeduca_announcement_read(TEXT, TEXT) TO anon, authenticated;

-- 4. Configurar RLS estrita e permissões em todas as 18 tabelas de dados
DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
    tbl_list TEXT[] := ARRAY[
        'neuroeduca_sync_meta',
        'neuroeduca_institutions',
        'neuroeduca_teachers',
        'neuroeduca_classes',
        'neuroeduca_subjects',
        'neuroeduca_students',
        'neuroeduca_grades',
        'neuroeduca_invoices',
        'neuroeduca_attendance',
        'neuroeduca_digital_archive',
        'neuroeduca_financial_notifications',
        'neuroeduca_announcements',
        'neuroeduca_accounts',
        'neuroeduca_school_users',
        'neuroeduca_subscription_plans',
        'neuroeduca_audit_logs',
        'neuroeduca_psychopedagogical_protocols',
        'neuroeduca_psychopedagogical_cases'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbl_list LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated;', tbl);
        FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- 5. Políticas RLS granulares por função, escola e processo do aluno
-- (Apenas pedidos com sessão válida via auth.uid() ou x-ne-session têm acesso)

CREATE POLICY ne_sync_meta_read ON public.neuroeduca_sync_meta
    FOR SELECT TO anon, authenticated USING (public.ne_current_role() IS NOT NULL);
CREATE POLICY ne_sync_meta_write ON public.neuroeduca_sync_meta
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR public.ne_is_school_staff())
    WITH CHECK (public.ne_is_super_admin() OR public.ne_is_school_staff());

CREATE POLICY ne_institutions_select ON public.neuroeduca_institutions
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR id = public.ne_current_institution_id()
        OR (
            public.ne_current_role() = 'director_municipal'
            AND lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
        )
    );
CREATE POLICY ne_institutions_insert ON public.neuroeduca_institutions
    FOR INSERT TO anon, authenticated
    WITH CHECK (public.ne_is_super_admin());
CREATE POLICY ne_institutions_update ON public.neuroeduca_institutions
    FOR UPDATE TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND id = public.ne_current_institution_id()));
CREATE POLICY ne_institutions_delete ON public.neuroeduca_institutions
    FOR DELETE TO anon, authenticated
    USING (public.ne_is_super_admin());

CREATE POLICY ne_teachers_select ON public.neuroeduca_teachers
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR institution_id = public.ne_current_institution_id()
        OR (
            public.ne_current_role() = 'director_municipal'
            AND institution_id IN (
                SELECT id FROM public.neuroeduca_institutions
                WHERE lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
            )
        )
    );
CREATE POLICY ne_teachers_write ON public.neuroeduca_teachers
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_classes_select ON public.neuroeduca_classes
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR institution_id = public.ne_current_institution_id()
        OR (
            public.ne_current_role() = 'director_municipal'
            AND institution_id IN (
                SELECT id FROM public.neuroeduca_institutions
                WHERE lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
            )
        )
    );
CREATE POLICY ne_classes_write ON public.neuroeduca_classes
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_subjects_select ON public.neuroeduca_subjects
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR institution_id = public.ne_current_institution_id()
        OR (
            public.ne_current_role() = 'director_municipal'
            AND institution_id IN (
                SELECT id FROM public.neuroeduca_institutions
                WHERE lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
            )
        )
    );
CREATE POLICY ne_subjects_write ON public.neuroeduca_subjects
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_students_select ON public.neuroeduca_students
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (
            public.ne_current_role() = 'director_municipal'
            AND institution_id IN (
                SELECT id FROM public.neuroeduca_institutions
                WHERE lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
            )
        )
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_students_write ON public.neuroeduca_students
    FOR ALL TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR ((public.ne_is_school_admin() OR public.ne_current_role() = 'funcionario_financeiro') AND institution_id = public.ne_current_institution_id())
    )
    WITH CHECK (
        public.ne_is_super_admin()
        OR ((public.ne_is_school_admin() OR public.ne_current_role() = 'funcionario_financeiro') AND institution_id = public.ne_current_institution_id())
    );

CREATE POLICY ne_grades_select ON public.neuroeduca_grades
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (
            public.ne_current_role() = 'director_municipal'
            AND institution_id IN (
                SELECT id FROM public.neuroeduca_institutions
                WHERE lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
            )
        )
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_grades_write ON public.neuroeduca_grades
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_attendance_select ON public.neuroeduca_attendance
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (
            public.ne_current_role() = 'director_municipal'
            AND institution_id IN (
                SELECT id FROM public.neuroeduca_institutions
                WHERE lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
            )
        )
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_attendance_staff_write ON public.neuroeduca_attendance
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));
CREATE POLICY ne_attendance_student_justify ON public.neuroeduca_attendance
    FOR ALL TO anon, authenticated
    USING (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    WITH CHECK (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()));

CREATE POLICY ne_invoices_select ON public.neuroeduca_invoices
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_invoices_write ON public.neuroeduca_invoices
    FOR ALL TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IN ('admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro')
            AND institution_id = public.ne_current_institution_id()
        )
    )
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IN ('admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro')
            AND institution_id = public.ne_current_institution_id()
        )
    );

CREATE POLICY ne_fin_notif_select ON public.neuroeduca_financial_notifications
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_fin_notif_write ON public.neuroeduca_financial_notifications
    FOR ALL TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IN ('admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro')
            AND institution_id = public.ne_current_institution_id()
        )
    )
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IN ('admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro')
            AND institution_id = public.ne_current_institution_id()
        )
    );
CREATE POLICY ne_fin_notif_student_read ON public.neuroeduca_financial_notifications
    FOR UPDATE TO anon, authenticated
    USING (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    WITH CHECK (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()));

CREATE POLICY ne_archive_select ON public.neuroeduca_digital_archive
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    );
CREATE POLICY ne_archive_insert ON public.neuroeduca_digital_archive
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND institution_id = public.ne_current_institution_id()
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_archive_update ON public.neuroeduca_digital_archive
    FOR UPDATE TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));
CREATE POLICY ne_archive_delete ON public.neuroeduca_digital_archive
    FOR DELETE TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
        OR (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    );

CREATE POLICY ne_announcements_select ON public.neuroeduca_announcements
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_current_role() IS NOT NULL
        AND (
            public.ne_is_super_admin()
            OR institution_id IS NULL
            OR institution_id = public.ne_current_institution_id()
            OR public.ne_current_role() = 'director_municipal'
        )
    );
CREATE POLICY ne_announcements_write ON public.neuroeduca_announcements
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_accounts_select ON public.neuroeduca_accounts
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR id = public.ne_current_account_id()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_accounts_insert ON public.neuroeduca_accounts
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
        )
    );
CREATE POLICY ne_accounts_update ON public.neuroeduca_accounts
    FOR UPDATE TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
        )
    )
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
        )
    );
CREATE POLICY ne_accounts_delete ON public.neuroeduca_accounts
    FOR DELETE TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
            AND id IS DISTINCT FROM public.ne_current_account_id()
        )
    );

CREATE POLICY ne_school_users_select ON public.neuroeduca_school_users
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR account_id = public.ne_current_account_id()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_school_users_write ON public.neuroeduca_school_users
    FOR ALL TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
        )
    )
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
        )
    );

CREATE POLICY ne_plans_select ON public.neuroeduca_subscription_plans
    FOR SELECT TO anon, authenticated USING (public.ne_current_role() IS NOT NULL);
CREATE POLICY ne_plans_write ON public.neuroeduca_subscription_plans
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin())
    WITH CHECK (public.ne_is_super_admin());

CREATE POLICY ne_audit_select ON public.neuroeduca_audit_logs
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_audit_insert ON public.neuroeduca_audit_logs
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IS NOT NULL
            AND (institution_id = public.ne_current_institution_id() OR institution_id IS NULL)
        )
    );
CREATE POLICY ne_audit_admin_manage ON public.neuroeduca_audit_logs
    FOR DELETE TO anon, authenticated
    USING (public.ne_is_super_admin());

CREATE POLICY ne_psy_protocols_select ON public.neuroeduca_psychopedagogical_protocols
    FOR SELECT TO anon, authenticated
    USING (public.ne_current_role() IS NOT NULL);
CREATE POLICY ne_psy_protocols_write ON public.neuroeduca_psychopedagogical_protocols
    FOR ALL TO anon, authenticated
    USING (public.ne_is_super_admin())
    WITH CHECK (public.ne_is_super_admin());

CREATE POLICY ne_psy_cases_select ON public.neuroeduca_psychopedagogical_cases
    FOR SELECT TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_psy_cases_write ON public.neuroeduca_psychopedagogical_cases
    FOR ALL TO anon, authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    )
    WITH CHECK (
        public.ne_is_super_admin()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );

-- =====================================================================
-- SUPABASE STORAGE PRIVADO: BUCKET DE DOCUMENTOS PESSOAIS DOS ALUNOS
-- (Acesso autenticado via URLs assinadas; zero acesso público não autenticado)
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'neuroeduca-student-docs',
    'neuroeduca-student-docs',
    false,
    12582912,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 12582912,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[];

DROP POLICY IF EXISTS neuroeduca_student_docs_select ON storage.objects;
CREATE POLICY neuroeduca_student_docs_select ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (
        bucket_id = 'neuroeduca-student-docs'
        AND (
            public.ne_is_super_admin()
            OR (
                (storage.foldername(name))[1] = public.ne_current_institution_id()
                AND (
                    public.ne_is_school_staff()
                    OR (
                        public.ne_current_role() IN ('aluno', 'encarregado_educacao')
                        AND (storage.foldername(name))[2] = ANY(public.ne_current_student_ids())
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS neuroeduca_student_docs_insert ON storage.objects;
CREATE POLICY neuroeduca_student_docs_insert ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        bucket_id = 'neuroeduca-student-docs'
        AND (
            public.ne_is_super_admin()
            OR (
                (storage.foldername(name))[1] = public.ne_current_institution_id()
                AND (
                    public.ne_is_school_staff()
                    OR (
                        public.ne_current_role() IN ('aluno', 'encarregado_educacao')
                        AND (storage.foldername(name))[2] = ANY(public.ne_current_student_ids())
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS neuroeduca_student_docs_update ON storage.objects;
CREATE POLICY neuroeduca_student_docs_update ON storage.objects
    FOR UPDATE TO anon, authenticated
    USING (
        bucket_id = 'neuroeduca-student-docs'
        AND (
            public.ne_is_super_admin()
            OR (public.ne_is_school_staff() AND (storage.foldername(name))[1] = public.ne_current_institution_id())
        )
    )
    WITH CHECK (
        bucket_id = 'neuroeduca-student-docs'
        AND (
            public.ne_is_super_admin()
            OR (public.ne_is_school_staff() AND (storage.foldername(name))[1] = public.ne_current_institution_id())
        )
    );

DROP POLICY IF EXISTS neuroeduca_student_docs_delete ON storage.objects;
CREATE POLICY neuroeduca_student_docs_delete ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (
        bucket_id = 'neuroeduca-student-docs'
        AND (
            public.ne_is_super_admin()
            OR (
                (storage.foldername(name))[1] = public.ne_current_institution_id()
                AND (
                    public.ne_is_school_admin()
                    OR (
                        public.ne_current_role() IN ('aluno', 'encarregado_educacao')
                        AND (storage.foldername(name))[2] = ANY(public.ne_current_student_ids())
                    )
                )
            )
        )
    );

NOTIFY pgrst, 'reload schema';
`;
