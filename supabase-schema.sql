-- =====================================================================
-- NEUROEDUCA - SISTEMA DE GESTÃO ESCOLAR MULTI-INSTITUCIONAL (ANGOLA)
-- SCRIPT DE BASE DE DADOS COMPLETO PARA POSTGRESQL / SUPABASE
-- Inclui: 35+ Tabelas, Chaves Estrangeiras, Índices, Triggers e Row Level Security (RLS)
-- Moeda padrão: Kwanza (AOA / Kz)
-- Subsistemas: 11 subsistemas oficiais do Sistema de Educação de Angola
-- =====================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. TABELAS DE PLATAFORMA E MULTI-TENANCY
-- ==========================================

-- Instituições de Ensino (Públicas, Privadas, Público-Privadas)
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(50),
    nif VARCHAR(50),
    license_number VARCHAR(100), -- Nº de Alvará ou Decreto de Criação
    institution_type VARCHAR(50) NOT NULL CHECK (institution_type IN ('publica', 'privada', 'comparticipada')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('infantil', 'geral', 'tecnico', 'pedagogico', 'superior', 'complexo_escolar')),
    province VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    commune VARCHAR(100),
    neighborhood VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    director_name VARCHAR(150),
    logo_url TEXT,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'pending_validation')),
    max_classes INT DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Planos de Subscrição SaaS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    billing_cycle VARCHAR(30) NOT NULL CHECK (billing_cycle IN ('mensal', 'trimestral', 'anual')),
    price_aoa NUMERIC(15,2) NOT NULL,
    price_per_class_aoa NUMERIC(15,2) DEFAULT 0,
    max_classes INT NOT NULL,
    max_storage_gb INT DEFAULT 10,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscrição Activa por Instituição
CREATE TABLE IF NOT EXISTS public.institution_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status VARCHAR(30) NOT NULL CHECK (status IN ('active', 'expired', 'grace_period', 'cancelled')),
    start_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    contracted_classes INT NOT NULL,
    amount_paid_aoa NUMERIC(15,2) NOT NULL,
    payment_reference VARCHAR(100),
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Configurações Institucionais
CREATE TABLE IF NOT EXISTS public.institution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
    official_name_header TEXT,
    ministry_banner TEXT DEFAULT 'REPÚBLICA DE ANGOLA\nMINISTÉRIO DA EDUCAÇÃO',
    currency VARCHAR(10) DEFAULT 'Kz',
    default_max_class_capacity INT DEFAULT 45,
    grading_scale VARCHAR(30) DEFAULT '0-20',
    passing_grade NUMERIC(4,2) DEFAULT 9.50,
    enable_multicaixa_express BOOLEAN DEFAULT true,
    enable_ai_assistant BOOLEAN DEFAULT true,
    header_logo_url TEXT,
    stamp_signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 2. UTILIZADORES, PERFIS E PERMISSÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT true
);

-- Inserir Perfis Oficiais
INSERT INTO public.roles (code, name, description) VALUES
('super_admin', 'Administrador Geral', 'Acesso total à plataforma SaaS NEUROEDUCA'),
('director_municipal', 'Director Municipal da Educação', 'Supervisão estatística e pedagógica das escolas do município'),
('admin_institucional', 'Administrador Institucional', 'Gestão administrativa da escola'),
('director_geral', 'Director Geral', 'Gestão pedagógica e institucional máxima'),
('subdirector_pedagogico', 'Subdirector Pedagógico', 'Coordenação pedagógica e curricular'),
('secretario_geral', 'Secretário Geral', 'Emissão de documentos, matrículas e processos'),
('coordenador_curso', 'Coordenador de Curso', 'Gestão técnica ou pedagógica de curso'),
('director_turma', 'Director de Turma', 'Acompanhamento da turma e pautas'),
('professor', 'Professor / Docente', 'Lançamento de notas, faltas e planos de aula'),
('funcionario_financeiro', 'Funcionário Financeiro', 'Cobrança de propinas e tesouraria'),
('aluno', 'Aluno / Estudante', 'Consulta de notas, horários e propinas'),
('encarregado_educacao', 'Encarregado de Educação', 'Acompanhamento do educando'),
('supervisor_estagio', 'Supervisor de Estágio', 'Acompanhamento de práticas e estágios')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- Ligação directa com Supabase Auth
    email VARCHAR(150) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    identity_card_number VARCHAR(50), -- Nº do Bilhete de Identidade (BI)
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

CREATE OR REPLACE FUNCTION public.sync_public_users_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        INSERT INTO public.users (auth_id, email, full_name, status)
        VALUES (
            NEW.id,
            lower(trim(NEW.email)),
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', lower(trim(NEW.email))),
            'active'
        )
        ON CONFLICT (email) DO UPDATE SET
            auth_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_to_public_users ON auth.users;
CREATE TRIGGER trg_auth_user_to_public_users
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_public_users_from_auth();

CREATE TABLE IF NOT EXISTS public.institution_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    is_primary_institution BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, user_id, role_id)
);

-- ==========================================
-- 3. SUBSISTEMAS E MOTOR CURRICULAR ANGOLANO
-- ==========================================

CREATE TABLE IF NOT EXISTS public.education_subsystems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    official_norm_reference TEXT, -- Ex: Lei de Bases nº 17/16 ou nº 32/20
    is_active BOOLEAN DEFAULT true
);

-- Inserir os 11 Subsistemas Oficiais de Angola
INSERT INTO public.education_subsystems (code, name, official_norm_reference) VALUES
('pre_escolar', 'Educação Pré-Escolar', 'Decreto Executivo nº 41/14 - MED'),
('primario_geral', 'Ensino Primário Geral', 'Plano Curricular do Ensino Primário - INIDE/MED'),
('adultos', 'Educação de Adultos', 'Estratégia Nacional de Alfabetização e EJA'),
('secundario_geral_1', 'I Ciclo do Ensino Secundário Geral', 'Plano Curricular do 1º Ciclo - INIDE/MED'),
('secundario_geral_2', 'II Ciclo do Ensino Secundário Geral', 'Plano Curricular do 2º Ciclo (Liceu) - INIDE/MED'),
('tecnico_1', 'I Ciclo do Ensino Secundário Técnico-Profissional', 'Instituto Nacional de Emprego e Formação Profissional / INIDE'),
('tecnico_2', 'II Ciclo do Ensino Secundário Técnico-Profissional (Institutos Médios)', 'Planos Curriculares do Ensino Técnico Profissional - INETP/MED'),
('pedagogico', 'Ensino Secundário Pedagógico (Magistério)', 'Formação de Professores do Ensino Primário - MED/INIDE'),
('especial', 'Educação Especial (Inclusiva e Diferenciada)', 'Política Nacional de Educação Especial e Inclusiva'),
('centro_infantil', 'Centro Infantil (Berçário e Creche)', 'Regulamento dos Centros Infantis Comunitários e Privados'),
('superior', 'Ensino Superior (Graduação e Pós-Graduação)', 'Lei de Bases do Ensino Superior nº 31/20 - MESCTI')
ON CONFLICT (code) DO NOTHING;

-- Anos Lectivos
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- Ex: 2026/2027
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('planned', 'active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, code)
);

-- Períodos Académicos (Trimestres ou Semestres)
CREATE TABLE IF NOT EXISTS public.academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- 1º Trimestre, 2º Trimestre, 3º Trimestre ou 1º Semestre
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('trimestre', 'semestre', 'anual')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    weight NUMERIC(4,2) DEFAULT 1.0
);

-- Cursos / Opções de Formação
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subsystem_id UUID NOT NULL REFERENCES public.education_subsystems(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    area VARCHAR(100), -- Ex: Ciências Físicas e Biológicas, Ciências Económicas, etc.
    duration_years INT DEFAULT 3,
    legal_authorization_doc TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, code)
);

-- Planos Curriculares e Versões
CREATE TABLE IF NOT EXISTS public.curriculum_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE, -- NULL = Plano Nacional Base
    subsystem_id UUID NOT NULL REFERENCES public.education_subsystems(id),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    grade_level VARCHAR(50) NOT NULL, -- Ex: 1ª Classe, 7ª Classe, 10ª Classe, 1º Ano
    name VARCHAR(150) NOT NULL,
    version VARCHAR(20) DEFAULT 'v1.0',
    effective_year VARCHAR(20),
    legal_reference TEXT,
    validation_status VARCHAR(50) DEFAULT 'validated' CHECK (validation_status IN ('validated', 'pending_validation', 'deprecated')),
    evaluation_formula TEXT, -- Formula para calcular notas e pautas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disciplinas do Catálogo Curricular
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    short_name VARCHAR(50),
    subject_group VARCHAR(50) CHECK (subject_group IN ('geral', 'especifica', 'socio_cultural', 'tecnica_tecnologica', 'pratica')),
    description TEXT
);

-- Disciplinas associadas a cada Plano Curricular
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_plan_id UUID NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    weekly_hours INT NOT NULL DEFAULT 4,
    coefficient NUMERIC(4,2) DEFAULT 1.0,
    academic_credits NUMERIC(4,2) DEFAULT 0, -- Para Ensino Superior
    is_mandatory BOOLEAN DEFAULT true,
    is_terminal_exam BOOLEAN DEFAULT false, -- Ex: Prova Nacional ou Exame
    UNIQUE(curriculum_plan_id, subject_id)
);

-- ==========================================
-- 4. TURMAS, PROFESSORES E ATRIBUIÇÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    curriculum_plan_id UUID NOT NULL REFERENCES public.curriculum_plans(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL, -- Ex: T-10-INF-A
    name VARCHAR(100) NOT NULL, -- Ex: 10ª Classe - Informática A
    grade_level VARCHAR(50) NOT NULL,
    shift VARCHAR(30) NOT NULL CHECK (shift IN ('manha', 'tarde', 'noite', 'integral')),
    room VARCHAR(50),
    class_director_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    max_students INT NOT NULL DEFAULT 45,
    enrolled_count INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, academic_year_id, code)
);

-- Professores / Docentes
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    staff_code VARCHAR(50) UNIQUE,
    academic_degree VARCHAR(50) NOT NULL, -- Bacharel, Licenciado, Mestre, Doutor
    specialization VARCHAR(150),
    contract_type VARCHAR(50) DEFAULT 'tempo_integral',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Atribuição de Professores às Turmas e Disciplinas
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    hours_per_week INT DEFAULT 4,
    UNIQUE(class_id, subject_id, teacher_id)
);

-- ==========================================
-- 5. ALUNOS, ENCARREGADOS E MATRÍCULAS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- Pai, Mãe, Tutor, Tio, etc.
    identity_card_number VARCHAR(50),
    profession VARCHAR(100),
    phone VARCHAR(50) NOT NULL,
    secondary_phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    workplace VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    process_number VARCHAR(50) NOT NULL, -- Número de Processo do Aluno
    full_name VARCHAR(150) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('M', 'F')),
    identity_card_number VARCHAR(50),
    birth_certificate_number VARCHAR(100),
    birth_province VARCHAR(100) NOT NULL,
    birth_municipality VARCHAR(100) NOT NULL,
    birth_commune VARCHAR(100),
    residential_address TEXT,
    father_name VARCHAR(150),
    mother_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(100),
    primary_guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    special_needs_notes TEXT, -- Educação Especial
    authorized_pickup_persons JSONB DEFAULT '[]'::jsonb, -- Centros Infantis
    photo_url TEXT,
    status VARCHAR(30) DEFAULT 'ativo' CHECK (status IN ('ativo', 'transferido', 'desistente', 'concluido', 'suspenso')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, process_number)
);

-- Matrículas Anuais do Estudante
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    enrollment_number VARCHAR(50),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    enrollment_type VARCHAR(30) DEFAULT 'confirmacao' CHECK (enrollment_type IN ('nova_matricula', 'confirmacao', 'transferencia_entrada')),
    status VARCHAR(30) DEFAULT 'ativo' CHECK (status IN ('ativo', 'anulado', 'transferido', 'concluido')),
    final_result VARCHAR(30) CHECK (final_result IN ('aprovado', 'reprovado', 'recurso', 'desistente', 'pendente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, student_id, academic_year_id)
);

-- ==========================================
-- 6. AVALIAÇÕES, NOTAS E PAUTAS
-- ==========================================

-- Avaliações Marcadas
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    assessment_type VARCHAR(30) NOT NULL CHECK (assessment_type IN ('MAC', 'NPP', 'NPT', 'exame_final', 'exame_recurso', 'avaliacao_qualitativa')),
    title VARCHAR(150) NOT NULL,
    max_score NUMERIC(5,2) DEFAULT 20.00,
    assessment_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Registo de Notas por Aluno (Mini-Pautas e Pautas Oficiais)
CREATE TABLE IF NOT EXISTS public.grades_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.academic_periods(id) ON DELETE RESTRICT,
    mac NUMERIC(4,2), -- Média de Avaliação Contínua
    npp NUMERIC(4,2), -- Nota de Prova do Professor
    npt NUMERIC(4,2), -- Nota de Prova Trimestral
    period_average NUMERIC(4,2), -- Média Trimestral (MT)
    exam_score NUMERIC(4,2), -- Exame Final / Recurso se aplicável
    final_score NUMERIC(4,2), -- Média Final da Disciplina
    qualitative_observation TEXT, -- Para Pré-Escolar e Educação Especial
    classification VARCHAR(30), -- Aprovado, Não Aprovado, Transita
    registered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, enrollment_id, subject_id, period_id)
);

-- Assiduidade / Faltas
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('presente', 'falta_justificada', 'falta_injustificada', 'atraso')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 7. GESTÃO FINANCEIRA EM KWANZA (AOA)
-- ==========================================

-- Tipos de Cobrança / Emolumentos
CREATE TABLE IF NOT EXISTS public.fee_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL, -- Ex: Propina Mensal, Taxa de Matrícula, Declaração, Certificado
    subsystem_id UUID REFERENCES public.education_subsystems(id),
    default_amount_aoa NUMERIC(15,2) NOT NULL,
    penalty_rate_percent NUMERIC(5,2) DEFAULT 10.0, -- Multa por atraso
    penalty_days_grace INT DEFAULT 10,
    is_monthly BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Facturas / Mensalidades Emitidas aos Alunos
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    month_reference VARCHAR(30), -- Ex: Outubro/2026
    description VARCHAR(255) NOT NULL,
    original_amount_aoa NUMERIC(15,2) NOT NULL,
    penalty_amount_aoa NUMERIC(15,2) DEFAULT 0,
    discount_amount_aoa NUMERIC(15,2) DEFAULT 0,
    total_due_aoa NUMERIC(15,2) NOT NULL,
    total_paid_aoa NUMERIC(15,2) DEFAULT 0,
    balance_due_aoa NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'parcial', 'vencido', 'cancelado')),
    multicaixa_reference VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, invoice_number)
);

-- Pagamentos Registados
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL,
    amount_paid_aoa NUMERIC(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('multicaixa_express', 'tpa_multicaixa', 'transferencia_bancaria', 'deposito_bancario', 'numerario')),
    transaction_reference VARCHAR(100), -- Referência Multicaixa / ID Transacção
    bank_name VARCHAR(100), -- BFA, BAI, BIC, BCI, SOL, etc.
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    cashier_user_id UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, receipt_number)
);

-- Despesas Institucionais
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- Salários, Material Didáctico, Luz, Água, Manutenção
    description TEXT NOT NULL,
    amount_aoa NUMERIC(15,2) NOT NULL,
    expense_date DATE NOT NULL,
    proof_document_url TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 8. DOCUMENTOS OFICIAIS E VERIFICAÇÃO QR
-- ==========================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('declaracao_matricula', 'declaracao_notas', 'certificado_habilitacoes', 'boletim_trimestral', 'ficha_individual', 'recibo_propina')),
    document_number VARCHAR(100) NOT NULL,
    verification_code VARCHAR(100) UNIQUE NOT NULL, -- Código de autenticidade no QR Code
    academic_year VARCHAR(50) NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    issued_by UUID NOT NULL REFERENCES public.users(id),
    document_payload JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'valido' CHECK (status IN ('valido', 'revogado', 'substituido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, document_number)
);

-- ==========================================
-- 9. AUDITORIA E NOTIFICAÇÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- Ex: 'CREATE_STUDENT', 'UPDATE_GRADE', 'REGISTER_PAYMENT'
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'academico',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- 10. ROW LEVEL SECURITY (RLS) NO SUPABASE
-- Regra Fundamental: Nenhuma instituição pode ver ou modificar dados de outra!
-- ==========================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_subsystems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 10.1 FUNÇÕES AUXILIARES SECURITY DEFINER (BASEADAS EM auth.uid())
-- Evitam recursão infinita em RLS e impedem adulteração de user_metadata no JWT
-- ==========================================

CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT id FROM public.users WHERE auth_id = auth.uid() AND status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM public.users WHERE auth_id = auth.uid() AND status = 'active' LIMIT 1),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.app_user_institution_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(array_agg(DISTINCT iu.institution_id), ARRAY[]::UUID[])
    FROM public.institution_users iu
    JOIN public.users u ON u.id = iu.user_id
    WHERE u.auth_id = auth.uid()
      AND u.status = 'active'
      AND iu.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.app_has_inst_role(p_institution_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.institution_users iu
        JOIN public.users u ON u.id = iu.user_id
        JOIN public.roles r ON r.id = iu.role_id
        WHERE u.auth_id = auth.uid()
          AND u.status = 'active'
          AND iu.is_active = true
          AND iu.institution_id = p_institution_id
          AND r.code = ANY(p_roles)
    );
$$;

CREATE OR REPLACE FUNCTION public.app_is_school_admin(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.app_has_inst_role(p_institution_id, ARRAY['admin_institucional', 'director_geral', 'secretario_geral']);
$$;

CREATE OR REPLACE FUNCTION public.app_is_school_staff(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.app_has_inst_role(
        p_institution_id,
        ARRAY['admin_institucional', 'director_geral', 'subdirector_pedagogico', 'secretario_geral', 'coordenador_curso', 'director_turma', 'professor', 'funcionario_financeiro']
    );
$$;

CREATE OR REPLACE FUNCTION public.app_is_treasury_staff(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.app_has_inst_role(
        p_institution_id,
        ARRAY['admin_institucional', 'director_geral', 'secretario_geral', 'funcionario_financeiro']
    );
$$;

CREATE OR REPLACE FUNCTION public.app_student_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH me AS (
        SELECT lower(trim(email)) AS my_email
        FROM public.users
        WHERE auth_id = auth.uid() AND status = 'active'
        LIMIT 1
    )
    SELECT COALESCE(array_agg(DISTINCT s.id), ARRAY[]::UUID[])
    FROM public.students s
    LEFT JOIN public.guardians g ON g.id = s.primary_guardian_id, me
    WHERE lower(COALESCE(s.email, '')) = me.my_email
       OR lower(COALESCE(g.email, '')) = me.my_email;
$$;

REVOKE ALL ON FUNCTION public.app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_institution_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_has_inst_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_school_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_school_staff(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_treasury_staff(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_student_ids() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_institution_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_has_inst_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_school_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_school_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_treasury_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_student_ids() TO authenticated;

-- Revogar acesso anónimo (anon) em todas as 30 tabelas e limpar políticas antigas
DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
    tbl_list TEXT[] := ARRAY[
        'institutions', 'subscription_plans', 'institution_subscriptions', 'institution_settings',
        'roles', 'users', 'institution_users', 'education_subsystems',
        'academic_years', 'academic_periods', 'courses', 'curriculum_plans',
        'subjects', 'curriculum_subjects', 'classes', 'teachers', 'teacher_assignments',
        'guardians', 'students', 'enrollments', 'assessments', 'grades_records',
        'attendance', 'fee_types', 'invoices', 'payments', 'expenses',
        'documents', 'audit_logs', 'notifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbl_list LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon;', tbl);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', tbl);
        FOR pol IN
            SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- 10.2 POLÍTICAS RLS GRANULARES POR TABELA E PERFIL

-- Utilizadores & Perfis (impede auto-elevação de is_super_admin ou atribuição indevida de escola)
CREATE POLICY users_select ON public.users
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR auth_id = auth.uid()
        OR id IN (
            SELECT iu.user_id FROM public.institution_users iu
            WHERE public.app_is_school_admin(iu.institution_id)
        )
    );
CREATE POLICY users_insert ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (public.app_is_super_admin() OR (auth_id = auth.uid() AND is_super_admin = false));
CREATE POLICY users_update ON public.users
    FOR UPDATE TO authenticated
    USING (public.app_is_super_admin() OR auth_id = auth.uid())
    WITH CHECK (public.app_is_super_admin() OR (auth_id = auth.uid() AND is_super_admin = false));
CREATE POLICY users_delete ON public.users
    FOR DELETE TO authenticated
    USING (public.app_is_super_admin());

CREATE POLICY institutional_users_select ON public.institution_users
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR user_id = public.app_user_id()
        OR public.app_is_school_admin(institution_id)
    );
CREATE POLICY institutional_users_write ON public.institution_users
    FOR ALL TO authenticated
    USING (
        public.app_is_super_admin()
        OR (
            public.app_is_school_admin(institution_id)
            AND role_id NOT IN (SELECT id FROM public.roles WHERE code IN ('super_admin', 'director_municipal'))
        )
    )
    WITH CHECK (
        public.app_is_super_admin()
        OR (
            public.app_is_school_admin(institution_id)
            AND role_id NOT IN (SELECT id FROM public.roles WHERE code IN ('super_admin', 'director_municipal'))
        )
    );

-- Catálogos Globais (leitura autenticada, gestão exclusiva Super Admin)
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_write ON public.roles FOR ALL TO authenticated USING (public.app_is_super_admin()) WITH CHECK (public.app_is_super_admin());

CREATE POLICY education_subsystems_select ON public.education_subsystems FOR SELECT TO authenticated USING (true);
CREATE POLICY education_subsystems_write ON public.education_subsystems FOR ALL TO authenticated USING (public.app_is_super_admin()) WITH CHECK (public.app_is_super_admin());

CREATE POLICY subscription_plans_select ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY subscription_plans_write ON public.subscription_plans FOR ALL TO authenticated USING (public.app_is_super_admin()) WITH CHECK (public.app_is_super_admin());

-- Instituições, Subscrições & Configurações
CREATE POLICY institutions_select ON public.institutions
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR id = ANY(public.app_user_institution_ids()));
CREATE POLICY institutions_insert ON public.institutions
    FOR INSERT TO authenticated WITH CHECK (public.app_is_super_admin());
CREATE POLICY institutions_update ON public.institutions
    FOR UPDATE TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(id));
CREATE POLICY institutions_delete ON public.institutions
    FOR DELETE TO authenticated USING (public.app_is_super_admin());

CREATE POLICY institution_subscriptions_select ON public.institution_subscriptions
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));
CREATE POLICY institution_subscriptions_write ON public.institution_subscriptions
    FOR ALL TO authenticated USING (public.app_is_super_admin()) WITH CHECK (public.app_is_super_admin());

CREATE POLICY institution_settings_select ON public.institution_settings
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY institution_settings_write ON public.institution_settings
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

-- Estrutura Académica & Curricular
CREATE POLICY academic_years_select ON public.academic_years
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY academic_years_write ON public.academic_years
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY academic_periods_select ON public.academic_periods
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY academic_periods_write ON public.academic_periods
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY courses_select ON public.courses
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY courses_write ON public.courses
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY curriculum_plans_select ON public.curriculum_plans
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id IS NULL OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY curriculum_plans_write ON public.curriculum_plans
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR (institution_id IS NOT NULL AND public.app_is_school_admin(institution_id)))
    WITH CHECK (public.app_is_super_admin() OR (institution_id IS NOT NULL AND public.app_is_school_admin(institution_id)));

CREATE POLICY subjects_select ON public.subjects
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id IS NULL OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY subjects_write ON public.subjects
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR (institution_id IS NOT NULL AND public.app_is_school_staff(institution_id)))
    WITH CHECK (public.app_is_super_admin() OR (institution_id IS NOT NULL AND public.app_is_school_staff(institution_id)));

CREATE POLICY curriculum_subjects_select ON public.curriculum_subjects
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR curriculum_plan_id IN (
            SELECT id FROM public.curriculum_plans
            WHERE institution_id IS NULL OR institution_id = ANY(public.app_user_institution_ids())
        )
    );
CREATE POLICY curriculum_subjects_write ON public.curriculum_subjects
    FOR ALL TO authenticated
    USING (
        public.app_is_super_admin()
        OR curriculum_plan_id IN (
            SELECT id FROM public.curriculum_plans
            WHERE institution_id IS NOT NULL AND public.app_is_school_admin(institution_id)
        )
    )
    WITH CHECK (
        public.app_is_super_admin()
        OR curriculum_plan_id IN (
            SELECT id FROM public.curriculum_plans
            WHERE institution_id IS NOT NULL AND public.app_is_school_admin(institution_id)
        )
    );

CREATE POLICY classes_select ON public.classes
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY classes_write ON public.classes
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_staff(institution_id));

CREATE POLICY teachers_select ON public.teachers
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_staff(institution_id) OR user_id = public.app_user_id());
CREATE POLICY teachers_write ON public.teachers
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY teacher_assignments_select ON public.teacher_assignments
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_staff(institution_id));
CREATE POLICY teacher_assignments_write ON public.teacher_assignments
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

-- Alunos, Encarregados & Matrículas (Aluno/Encarregado só acede ao seu próprio processo)
CREATE POLICY guardians_select ON public.guardians
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_school_staff(institution_id)
        OR id IN (SELECT primary_guardian_id FROM public.students WHERE id = ANY(public.app_student_ids()))
    );
CREATE POLICY guardians_write ON public.guardians
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY students_select ON public.students
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_school_staff(institution_id)
        OR id = ANY(public.app_student_ids())
    );
CREATE POLICY students_write ON public.students
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY enrollments_select ON public.enrollments
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_school_staff(institution_id)
        OR student_id = ANY(public.app_student_ids())
    );
CREATE POLICY enrollments_write ON public.enrollments
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

-- Avaliações, Notas & Assiduidade
CREATE POLICY assessments_select ON public.assessments
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY assessments_write ON public.assessments
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_staff(institution_id));

CREATE POLICY grades_records_select ON public.grades_records
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_school_staff(institution_id)
        OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = ANY(public.app_student_ids()))
    );
CREATE POLICY grades_records_write ON public.grades_records
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_staff(institution_id));

CREATE POLICY attendance_select ON public.attendance
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_school_staff(institution_id)
        OR enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id = ANY(public.app_student_ids()))
    );
CREATE POLICY attendance_write ON public.attendance
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_staff(institution_id));

-- Financeiro (Tesouraria, Direcção & Próprio Aluno/Encarregado)
CREATE POLICY fee_types_select ON public.fee_types
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR institution_id = ANY(public.app_user_institution_ids()));
CREATE POLICY fee_types_write ON public.fee_types
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id));

CREATE POLICY invoices_select ON public.invoices
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_treasury_staff(institution_id)
        OR student_id = ANY(public.app_student_ids())
    );
CREATE POLICY invoices_write ON public.invoices
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id));

CREATE POLICY payments_select ON public.payments
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_treasury_staff(institution_id)
        OR invoice_id IN (SELECT id FROM public.invoices WHERE student_id = ANY(public.app_student_ids()))
    );
CREATE POLICY payments_write ON public.payments
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id));

CREATE POLICY expenses_select ON public.expenses
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id));
CREATE POLICY expenses_write ON public.expenses
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_treasury_staff(institution_id));

-- Documentos Oficiais, Auditoria & Notificações
CREATE POLICY documents_select ON public.documents
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR public.app_is_school_staff(institution_id)
        OR student_id = ANY(public.app_student_ids())
    );
CREATE POLICY documents_write ON public.documents
    FOR ALL TO authenticated
    USING (public.app_is_super_admin() OR public.app_is_school_admin(institution_id))
    WITH CHECK (public.app_is_super_admin() OR public.app_is_school_admin(institution_id));

CREATE POLICY audit_logs_select ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.app_is_super_admin() OR (institution_id IS NOT NULL AND public.app_is_school_admin(institution_id)));
CREATE POLICY audit_logs_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.app_is_super_admin() OR (institution_id IS NOT NULL AND institution_id = ANY(public.app_user_institution_ids())));
CREATE POLICY audit_logs_delete ON public.audit_logs
    FOR DELETE TO authenticated
    USING (public.app_is_super_admin());

CREATE POLICY notifications_select ON public.notifications
    FOR SELECT TO authenticated
    USING (
        public.app_is_super_admin()
        OR target_user_id = public.app_user_id()
        OR (institution_id IS NOT NULL AND public.app_is_school_admin(institution_id))
    );
CREATE POLICY notifications_write ON public.notifications
    FOR ALL TO authenticated
    USING (
        public.app_is_super_admin()
        OR target_user_id = public.app_user_id()
        OR (institution_id IS NOT NULL AND public.app_is_school_admin(institution_id))
    )
    WITH CHECK (
        public.app_is_super_admin()
        OR target_user_id = public.app_user_id()
        OR (institution_id IS NOT NULL AND public.app_is_school_admin(institution_id))
    );

-- FIM DO SCRIPT DE SCHEMA

