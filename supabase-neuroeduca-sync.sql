-- =====================================================================
-- NEUROEDUCA - SCRIPT COMPLETO DE TABELAS, CHAVES ESTRANGEIRAS E AUTH
-- Execute este script no SQL Editor do seu projecto Supabase
-- (Database > SQL Editor > New Query > Run)
-- Seguro para executar em bancos novos OU já existentes (Idempotente).
-- =====================================================================

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
-- ROW LEVEL SECURITY (RLS) BLINDADA, ISOLAMENTO MULTI-TENANT & STORAGE
-- Zero acesso anónimo (anon) a tabelas/ficheiros; controlo por perfil e auth.uid()
-- =====================================================================

-- 1. RPC segura para verificação de login (nunca expõe passwords via REST API)
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
BEGIN
    IF v_clean_email = '' OR COALESCE(p_password, '') = '' THEN
        RETURN jsonb_build_object('authenticated', false);
    END IF;

    SELECT email, full_name, role, institution_id, municipality, province, status, payload
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

REVOKE ALL ON FUNCTION public.verify_neuroeduca_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_neuroeduca_login(TEXT, TEXT) TO anon, authenticated;

-- 2. Funções auxiliares SECURITY DEFINER baseadas em auth.uid() (sem recursão nem spoofing de metadata)
CREATE OR REPLACE FUNCTION public.ne_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT a.role
    FROM public.neuroeduca_accounts a
    WHERE a.auth_user_id = auth.uid()
      AND COALESCE(a.status, 'activo') <> 'inactivo'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ne_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(public.ne_current_role() = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.ne_current_institution_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT a.institution_id
    FROM public.neuroeduca_accounts a
    WHERE a.auth_user_id = auth.uid()
      AND COALESCE(a.status, 'activo') <> 'inactivo'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ne_current_municipality()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT a.municipality
    FROM public.neuroeduca_accounts a
    WHERE a.auth_user_id = auth.uid()
      AND COALESCE(a.status, 'activo') <> 'inactivo'
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ne_is_school_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
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
SET search_path = public, auth
AS $$
    SELECT COALESCE(
        public.ne_current_role() IN (
            'admin_institucional',
            'director_geral',
            'secretario_geral'
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.ne_current_student_ids()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH acc AS (
        SELECT lower(trim(email)) AS acc_email, payload
        FROM public.neuroeduca_accounts
        WHERE auth_user_id = auth.uid()
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

REVOKE ALL ON FUNCTION public.ne_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_institution_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_municipality() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_is_school_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_is_school_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ne_current_student_ids() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ne_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ne_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_institution_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_municipality() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ne_is_school_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ne_is_school_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ne_current_student_ids() TO authenticated;

-- 3. Remover acesso anónimo (anon) e políticas permissivas em todas as 16 tabelas
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
        'neuroeduca_audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbl_list LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon;', tbl);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', tbl);
        FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- 4. Políticas RLS granulares por função, escola e processo do aluno

CREATE POLICY ne_sync_meta_read ON public.neuroeduca_sync_meta
    FOR SELECT TO authenticated USING (true);
CREATE POLICY ne_sync_meta_write ON public.neuroeduca_sync_meta
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR public.ne_is_school_admin())
    WITH CHECK (public.ne_is_super_admin() OR public.ne_is_school_admin());

CREATE POLICY ne_institutions_select ON public.neuroeduca_institutions
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR id = public.ne_current_institution_id()
        OR (
            public.ne_current_role() = 'director_municipal'
            AND lower(COALESCE(municipality, '')) = lower(COALESCE(public.ne_current_municipality(), ''))
        )
    );
CREATE POLICY ne_institutions_insert ON public.neuroeduca_institutions
    FOR INSERT TO authenticated
    WITH CHECK (public.ne_is_super_admin());
CREATE POLICY ne_institutions_update ON public.neuroeduca_institutions
    FOR UPDATE TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND id = public.ne_current_institution_id()));
CREATE POLICY ne_institutions_delete ON public.neuroeduca_institutions
    FOR DELETE TO authenticated
    USING (public.ne_is_super_admin());

CREATE POLICY ne_teachers_select ON public.neuroeduca_teachers
    FOR SELECT TO authenticated
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
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_classes_select ON public.neuroeduca_classes
    FOR SELECT TO authenticated
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
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_subjects_select ON public.neuroeduca_subjects
    FOR SELECT TO authenticated
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
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_students_select ON public.neuroeduca_students
    FOR SELECT TO authenticated
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
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_grades_select ON public.neuroeduca_grades
    FOR SELECT TO authenticated
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
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_attendance_select ON public.neuroeduca_attendance
    FOR SELECT TO authenticated
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
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));
CREATE POLICY ne_attendance_student_justify ON public.neuroeduca_attendance
    FOR UPDATE TO authenticated
    USING (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    WITH CHECK (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()));

CREATE POLICY ne_invoices_select ON public.neuroeduca_invoices
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IN ('admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro')
            AND institution_id = public.ne_current_institution_id()
        )
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_invoices_write ON public.neuroeduca_invoices
    FOR ALL TO authenticated
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
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_current_role() IN ('admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro')
            AND institution_id = public.ne_current_institution_id()
        )
        OR (
            public.ne_current_role() IN ('aluno', 'encarregado_educacao')
            AND student_id = ANY(public.ne_current_student_ids())
        )
    );
CREATE POLICY ne_fin_notif_write ON public.neuroeduca_financial_notifications
    FOR ALL TO authenticated
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

CREATE POLICY ne_archive_select ON public.neuroeduca_digital_archive
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id())
        OR (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    );
CREATE POLICY ne_archive_insert ON public.neuroeduca_digital_archive
    FOR INSERT TO authenticated
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
    FOR UPDATE TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_staff() AND institution_id = public.ne_current_institution_id()));
CREATE POLICY ne_archive_delete ON public.neuroeduca_digital_archive
    FOR DELETE TO authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
        OR (public.ne_current_role() IN ('aluno', 'encarregado_educacao') AND student_id = ANY(public.ne_current_student_ids()))
    );

CREATE POLICY ne_announcements_select ON public.neuroeduca_announcements
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR institution_id IS NULL
        OR institution_id = public.ne_current_institution_id()
        OR public.ne_current_role() = 'director_municipal'
    );
CREATE POLICY ne_announcements_write ON public.neuroeduca_announcements
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()))
    WITH CHECK (public.ne_is_super_admin() OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id()));

CREATE POLICY ne_accounts_select ON public.neuroeduca_accounts
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR auth_user_id = auth.uid()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_accounts_insert ON public.neuroeduca_accounts
    FOR INSERT TO authenticated
    WITH CHECK (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
        )
    );
CREATE POLICY ne_accounts_update ON public.neuroeduca_accounts
    FOR UPDATE TO authenticated
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
    FOR DELETE TO authenticated
    USING (
        public.ne_is_super_admin()
        OR (
            public.ne_is_school_admin()
            AND institution_id = public.ne_current_institution_id()
            AND role NOT IN ('super_admin', 'director_municipal')
            AND auth_user_id IS DISTINCT FROM auth.uid()
        )
    );

CREATE POLICY ne_school_users_select ON public.neuroeduca_school_users
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR auth_user_id = auth.uid()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_school_users_write ON public.neuroeduca_school_users
    FOR ALL TO authenticated
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
    FOR SELECT TO authenticated USING (true);
CREATE POLICY ne_plans_write ON public.neuroeduca_subscription_plans
    FOR ALL TO authenticated
    USING (public.ne_is_super_admin())
    WITH CHECK (public.ne_is_super_admin());

CREATE POLICY ne_audit_select ON public.neuroeduca_audit_logs
    FOR SELECT TO authenticated
    USING (
        public.ne_is_super_admin()
        OR (public.ne_is_school_admin() AND institution_id = public.ne_current_institution_id())
    );
CREATE POLICY ne_audit_insert ON public.neuroeduca_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        public.ne_is_super_admin()
        OR institution_id = public.ne_current_institution_id()
    );
CREATE POLICY ne_audit_admin_manage ON public.neuroeduca_audit_logs
    FOR DELETE TO authenticated
    USING (public.ne_is_super_admin());

-- =====================================================================
-- SUPABASE STORAGE PRIVADO: BUCKET DE DOCUMENTOS PESSOAIS DOS ALUNOS
-- (Acesso autenticado via URLs assinadas; zero acesso público anónimo)
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
    FOR SELECT TO authenticated
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
    FOR INSERT TO authenticated
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
    FOR UPDATE TO authenticated
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
    FOR DELETE TO authenticated
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
