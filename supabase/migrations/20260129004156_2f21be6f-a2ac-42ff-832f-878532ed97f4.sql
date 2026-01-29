-- 1. Criar nova tabela para faixas de comissão progressiva
CREATE TABLE public.comissao_faixas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nivel_corretor nivel_corretor NOT NULL,
    numero_venda INTEGER NOT NULL,
    percentual NUMERIC(5,2) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(nivel_corretor, numero_venda)
);

-- 2. Adicionar colunas na tabela vendas para armazenar comissão calculada
ALTER TABLE public.vendas 
ADD COLUMN percentual_comissao NUMERIC(5,2),
ADD COLUMN valor_comissao NUMERIC(12,2),
ADD COLUMN numero_venda_periodo INTEGER;

-- 3. Criar tabela para configuração do período
CREATE TABLE public.comissao_periodo_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL DEFAULT 'MENSAL', -- MENSAL, TRIMESTRAL, ANUAL
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão (mensal)
INSERT INTO public.comissao_periodo_config (tipo, ativo) VALUES ('MENSAL', true);

-- 4. Inserir faixas progressivas padrão para cada nível
-- JUNIOR: 1ª=1%, 2ª=1.2%, 3ª+=1.3%
INSERT INTO public.comissao_faixas (nivel_corretor, numero_venda, percentual) VALUES 
('JUNIOR', 1, 1.0),
('JUNIOR', 2, 1.2),
('JUNIOR', 3, 1.3);

-- PLENO: 1ª=2%, 2ª=2.2%, 3ª+=2.5%
INSERT INTO public.comissao_faixas (nivel_corretor, numero_venda, percentual) VALUES 
('PLENO', 1, 2.0),
('PLENO', 2, 2.2),
('PLENO', 3, 2.5);

-- SENIOR: 1ª=3%, 2ª=3.5%, 3ª+=4%
INSERT INTO public.comissao_faixas (nivel_corretor, numero_venda, percentual) VALUES 
('SENIOR', 1, 3.0),
('SENIOR', 2, 3.5),
('SENIOR', 3, 4.0);

-- CLOSER: 1ª=4%, 2ª=4.5%, 3ª+=5%
INSERT INTO public.comissao_faixas (nivel_corretor, numero_venda, percentual) VALUES 
('CLOSER', 1, 4.0),
('CLOSER', 2, 4.5),
('CLOSER', 3, 5.0);

-- 5. Enable RLS
ALTER TABLE public.comissao_faixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissao_periodo_config ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies para comissao_faixas
CREATE POLICY "Authenticated users can view comissao_faixas"
ON public.comissao_faixas FOR SELECT
USING (true);

CREATE POLICY "Directors can manage comissao_faixas"
ON public.comissao_faixas FOR ALL
USING (has_role(auth.uid(), 'DIRETOR'));

-- 7. RLS Policies para comissao_periodo_config
CREATE POLICY "Authenticated users can view comissao_periodo_config"
ON public.comissao_periodo_config FOR SELECT
USING (true);

CREATE POLICY "Directors can manage comissao_periodo_config"
ON public.comissao_periodo_config FOR ALL
USING (has_role(auth.uid(), 'DIRETOR'));

-- 8. Criar função para obter número de vendas no período atual
CREATE OR REPLACE FUNCTION public.get_vendas_count_in_period(
    _corretor_id UUID,
    _data_venda DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _count INTEGER;
    _periodo_tipo VARCHAR(20);
    _start_date DATE;
    _end_date DATE;
BEGIN
    -- Get current period config
    SELECT tipo INTO _periodo_tipo 
    FROM public.comissao_periodo_config 
    WHERE ativo = true 
    LIMIT 1;
    
    -- Default to MENSAL if not configured
    IF _periodo_tipo IS NULL THEN
        _periodo_tipo := 'MENSAL';
    END IF;
    
    -- Calculate period boundaries
    CASE _periodo_tipo
        WHEN 'MENSAL' THEN
            _start_date := DATE_TRUNC('month', _data_venda)::DATE;
            _end_date := (DATE_TRUNC('month', _data_venda) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        WHEN 'TRIMESTRAL' THEN
            _start_date := DATE_TRUNC('quarter', _data_venda)::DATE;
            _end_date := (DATE_TRUNC('quarter', _data_venda) + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
        WHEN 'ANUAL' THEN
            _start_date := DATE_TRUNC('year', _data_venda)::DATE;
            _end_date := (DATE_TRUNC('year', _data_venda) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
        ELSE
            _start_date := DATE_TRUNC('month', _data_venda)::DATE;
            _end_date := (DATE_TRUNC('month', _data_venda) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END CASE;
    
    -- Count active sales in period BEFORE this sale
    SELECT COUNT(*) INTO _count
    FROM public.vendas v
    WHERE v.corretor_id = _corretor_id
    AND v.status = 'ATIVA'
    AND v.data_venda >= _start_date
    AND v.data_venda <= _end_date;
    
    RETURN COALESCE(_count, 0);
END;
$$;

-- 9. Criar função para calcular comissão
CREATE OR REPLACE FUNCTION public.calculate_commission(
    _corretor_id UUID,
    _valor_vgv NUMERIC,
    _data_venda DATE
)
RETURNS TABLE(percentual NUMERIC, valor_comissao NUMERIC, numero_venda INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _nivel nivel_corretor;
    _vendas_count INTEGER;
    _percentual NUMERIC;
    _max_faixa INTEGER;
BEGIN
    -- Get corretor's nivel
    SELECT p.nivel_corretor INTO _nivel
    FROM public.profiles p
    WHERE p.id = _corretor_id;
    
    -- If no nivel defined, cannot calculate commission
    IF _nivel IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- Get current sales count in period
    _vendas_count := public.get_vendas_count_in_period(_corretor_id, _data_venda);
    
    -- This will be the Nth sale (current count + 1)
    _vendas_count := _vendas_count + 1;
    
    -- Get max configured faixa for this nivel
    SELECT MAX(cf.numero_venda) INTO _max_faixa
    FROM public.comissao_faixas cf
    WHERE cf.nivel_corretor = _nivel
    AND cf.ativo = true;
    
    -- Get percentual for this faixa (use max if beyond configured faixas)
    SELECT cf.percentual INTO _percentual
    FROM public.comissao_faixas cf
    WHERE cf.nivel_corretor = _nivel
    AND cf.numero_venda = LEAST(_vendas_count, COALESCE(_max_faixa, 1))
    AND cf.ativo = true;
    
    -- Return calculated values
    RETURN QUERY SELECT 
        COALESCE(_percentual, 0)::NUMERIC,
        ROUND((_valor_vgv * COALESCE(_percentual, 0) / 100), 2)::NUMERIC,
        _vendas_count;
END;
$$;

-- 10. Criar trigger para calcular comissão automaticamente ao inserir/atualizar venda
CREATE OR REPLACE FUNCTION public.calculate_venda_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _result RECORD;
BEGIN
    -- Only calculate for active sales
    IF NEW.status = 'ATIVA' THEN
        SELECT * INTO _result 
        FROM public.calculate_commission(NEW.corretor_id, NEW.valor_vgv, NEW.data_venda);
        
        -- Validate commission was calculated
        IF _result.percentual IS NULL THEN
            RAISE EXCEPTION 'Não foi possível calcular a comissão. Verifique se o corretor possui nível definido e as regras de comissão estão configuradas.';
        END IF;
        
        NEW.percentual_comissao := _result.percentual;
        NEW.valor_comissao := _result.valor_comissao;
        NEW.numero_venda_periodo := _result.numero_venda;
    ELSE
        -- For distrato, nullify commission
        NEW.percentual_comissao := NULL;
        NEW.valor_comissao := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger on vendas
CREATE TRIGGER calculate_commission_trigger
BEFORE INSERT OR UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.calculate_venda_commission();

-- 11. Trigger to update timestamp on comissao_faixas
CREATE TRIGGER update_comissao_faixas_updated_at
BEFORE UPDATE ON public.comissao_faixas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update timestamp on comissao_periodo_config
CREATE TRIGGER update_comissao_periodo_config_updated_at
BEFORE UPDATE ON public.comissao_periodo_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();