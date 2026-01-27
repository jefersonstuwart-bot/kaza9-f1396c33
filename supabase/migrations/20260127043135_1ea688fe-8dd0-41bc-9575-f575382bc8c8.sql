-- KAZA9 CRM Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE public.user_role AS ENUM ('DIRETOR', 'GERENTE', 'CORRETOR');
CREATE TYPE public.nivel_corretor AS ENUM ('JUNIOR', 'PLENO', 'SENIOR', 'CLOSER');
CREATE TYPE public.lead_status AS ENUM ('NOVO', 'EM_ATENDIMENTO', 'ANALISE_CREDITO', 'APROVADO', 'REPROVADO', 'DISTRATO');
CREATE TYPE public.venda_status AS ENUM ('ATIVA', 'DISTRATO');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    nivel_corretor public.nivel_corretor DEFAULT 'JUNIOR',
    gerente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    avatar_url TEXT,
    empresa_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table (RBAC)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.user_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Construtoras (Builders/Developers)
CREATE TABLE public.construtoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    foto_url TEXT,
    drive_url TEXT,
    percentual_comissao DECIMAL(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Lead origins (dynamic)
CREATE TABLE public.lead_origens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default origins
INSERT INTO public.lead_origens (nome) VALUES 
    ('Facebook'),
    ('OLX'),
    ('Orgânico'),
    ('Instagram'),
    ('Indicação'),
    ('Google Ads'),
    ('Outros');

-- Leads table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT,
    origem_id UUID REFERENCES public.lead_origens(id),
    status public.lead_status DEFAULT 'NOVO' NOT NULL,
    corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notas TEXT,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    data_ultima_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Lead history (status changes)
CREATE TABLE public.lead_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    status_anterior public.lead_status,
    status_novo public.lead_status NOT NULL,
    usuario_id UUID REFERENCES public.profiles(id),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Vendas (Sales)
CREATE TABLE public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    construtora_id UUID REFERENCES public.construtoras(id) NOT NULL,
    corretor_id UUID REFERENCES public.profiles(id) NOT NULL,
    gerente_id UUID REFERENCES public.profiles(id),
    lead_id UUID REFERENCES public.leads(id),
    valor_vgv DECIMAL(15,2) NOT NULL,
    data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
    status public.venda_status DEFAULT 'ATIVA' NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Metas (Goals)
CREATE TABLE public.metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    meta_vgv DECIMAL(15,2) DEFAULT 0,
    meta_qtd_vendas INTEGER DEFAULT 0,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(usuario_id, mes, ano)
);

-- Commission configuration
CREATE TABLE public.comissao_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL, -- 'GERENTE_FAIXA' or 'CORRETOR_NIVEL'
    valor_referencia TEXT NOT NULL, -- For faixa: '1-5', '6-10', '11+' | For nivel: 'JUNIOR', 'PLENO', etc
    percentual DECIMAL(5,2) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default commission config for managers
INSERT INTO public.comissao_config (tipo, valor_referencia, percentual) VALUES
    ('GERENTE_FAIXA', '1-5', 4.00),
    ('GERENTE_FAIXA', '6-10', 5.00),
    ('GERENTE_FAIXA', '11+', 6.00),
    ('CORRETOR_NIVEL', 'JUNIOR', 2.00),
    ('CORRETOR_NIVEL', 'PLENO', 3.00),
    ('CORRETOR_NIVEL', 'SENIOR', 4.00),
    ('CORRETOR_NIVEL', 'CLOSER', 5.00);

-- Alertas (Notifications)
CREATE TABLE public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lido BOOLEAN DEFAULT false,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construtoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_origens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissao_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's profile id
CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if user is manager of another user
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_user_id UUID, _user_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_profile_id
        AND gerente_id = public.get_profile_id(_manager_user_id)
    )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Directors can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'DIRETOR'));

CREATE POLICY "Managers can view team profiles" ON public.profiles
    FOR SELECT USING (
        public.has_role(auth.uid(), 'GERENTE') 
        AND (gerente_id = public.get_profile_id(auth.uid()) OR user_id = auth.uid())
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Directors can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'DIRETOR'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Directors can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'DIRETOR'));

-- RLS Policies for construtoras
CREATE POLICY "Authenticated users can view construtoras" ON public.construtoras
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Directors can manage construtoras" ON public.construtoras
    FOR ALL USING (public.has_role(auth.uid(), 'DIRETOR'));

-- RLS Policies for lead_origens
CREATE POLICY "Authenticated users can view origens" ON public.lead_origens
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Directors can manage origens" ON public.lead_origens
    FOR ALL USING (public.has_role(auth.uid(), 'DIRETOR'));

-- RLS Policies for leads
CREATE POLICY "Directors can view all leads" ON public.leads
    FOR SELECT USING (public.has_role(auth.uid(), 'DIRETOR'));

CREATE POLICY "Managers can view team leads" ON public.leads
    FOR SELECT USING (
        public.has_role(auth.uid(), 'GERENTE') 
        AND (corretor_id = public.get_profile_id(auth.uid()) OR public.is_manager_of(auth.uid(), corretor_id))
    );

CREATE POLICY "Corretores can view own leads" ON public.leads
    FOR SELECT USING (
        public.has_role(auth.uid(), 'CORRETOR') 
        AND corretor_id = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Authenticated users can insert leads" ON public.leads
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Directors can update any lead" ON public.leads
    FOR UPDATE USING (public.has_role(auth.uid(), 'DIRETOR'));

CREATE POLICY "Corretores can update own leads" ON public.leads
    FOR UPDATE USING (corretor_id = public.get_profile_id(auth.uid()));

-- RLS Policies for lead_historico
CREATE POLICY "View lead history" ON public.lead_historico
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert lead history" ON public.lead_historico
    FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for vendas
CREATE POLICY "Directors can view all vendas" ON public.vendas
    FOR SELECT USING (public.has_role(auth.uid(), 'DIRETOR'));

CREATE POLICY "Managers can view team vendas" ON public.vendas
    FOR SELECT USING (
        public.has_role(auth.uid(), 'GERENTE') 
        AND (corretor_id = public.get_profile_id(auth.uid()) 
             OR gerente_id = public.get_profile_id(auth.uid())
             OR public.is_manager_of(auth.uid(), corretor_id))
    );

CREATE POLICY "Corretores can view own vendas" ON public.vendas
    FOR SELECT USING (
        public.has_role(auth.uid(), 'CORRETOR') 
        AND corretor_id = public.get_profile_id(auth.uid())
    );

CREATE POLICY "Authenticated can insert vendas" ON public.vendas
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Directors can update vendas" ON public.vendas
    FOR UPDATE USING (public.has_role(auth.uid(), 'DIRETOR'));

-- RLS Policies for metas
CREATE POLICY "Directors can manage all metas" ON public.metas
    FOR ALL USING (public.has_role(auth.uid(), 'DIRETOR'));

CREATE POLICY "Users can view own metas" ON public.metas
    FOR SELECT USING (usuario_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Managers can view team metas" ON public.metas
    FOR SELECT USING (
        public.has_role(auth.uid(), 'GERENTE') 
        AND public.is_manager_of(auth.uid(), usuario_id)
    );

-- RLS Policies for comissao_config
CREATE POLICY "Authenticated can view comissao_config" ON public.comissao_config
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Directors can manage comissao_config" ON public.comissao_config
    FOR ALL USING (public.has_role(auth.uid(), 'DIRETOR'));

-- RLS Policies for alertas
CREATE POLICY "Users can view own alertas" ON public.alertas
    FOR SELECT USING (usuario_id = public.get_profile_id(auth.uid()) OR usuario_id IS NULL);

CREATE POLICY "Users can update own alertas" ON public.alertas
    FOR UPDATE USING (usuario_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Insert alertas" ON public.alertas
    FOR INSERT TO authenticated WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construtoras_updated_at
    BEFORE UPDATE ON public.construtoras
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at
    BEFORE UPDATE ON public.vendas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metas_updated_at
    BEFORE UPDATE ON public.metas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comissao_config_updated_at
    BEFORE UPDATE ON public.comissao_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update lead's data_ultima_movimentacao when status changes
CREATE OR REPLACE FUNCTION public.update_lead_movimentacao()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.data_ultima_movimentacao = now();
        
        -- Insert into history
        INSERT INTO public.lead_historico (lead_id, status_anterior, status_novo)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lead_status_history
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_lead_movimentacao();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, nome, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
    
    -- Default role is CORRETOR
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'CORRETOR');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;
