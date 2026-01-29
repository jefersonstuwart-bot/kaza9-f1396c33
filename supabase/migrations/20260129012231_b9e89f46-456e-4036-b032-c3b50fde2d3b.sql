-- Table for manager commission tiers (ranges)
CREATE TABLE public.comissao_gerente_faixas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    faixa_inicio INTEGER NOT NULL,
    faixa_fim INTEGER, -- NULL means "or more" (e.g., 11+)
    percentual NUMERIC NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comissao_gerente_faixas ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated can view, only directors can manage
CREATE POLICY "Authenticated users can view comissao_gerente_faixas"
ON public.comissao_gerente_faixas FOR SELECT
USING (true);

CREATE POLICY "Directors can manage comissao_gerente_faixas"
ON public.comissao_gerente_faixas FOR ALL
USING (has_role(auth.uid(), 'DIRETOR'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_comissao_gerente_faixas_updated_at
BEFORE UPDATE ON public.comissao_gerente_faixas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table to store calculated manager commissions per period
CREATE TABLE public.comissao_gerente_periodo (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gerente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    total_vendas INTEGER NOT NULL DEFAULT 0,
    valor_vgv_total NUMERIC NOT NULL DEFAULT 0,
    faixa_id UUID REFERENCES public.comissao_gerente_faixas(id),
    percentual_aplicado NUMERIC,
    valor_comissao NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(gerente_id, mes, ano)
);

-- Enable RLS
ALTER TABLE public.comissao_gerente_periodo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Directors can view all comissao_gerente_periodo"
ON public.comissao_gerente_periodo FOR SELECT
USING (has_role(auth.uid(), 'DIRETOR'::user_role));

CREATE POLICY "Managers can view own comissao_gerente_periodo"
ON public.comissao_gerente_periodo FOR SELECT
USING (gerente_id = get_profile_id(auth.uid()));

CREATE POLICY "System can manage comissao_gerente_periodo"
ON public.comissao_gerente_periodo FOR ALL
USING (has_role(auth.uid(), 'DIRETOR'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_comissao_gerente_periodo_updated_at
BEFORE UPDATE ON public.comissao_gerente_periodo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- History table for tracking tier changes
CREATE TABLE public.comissao_gerente_faixas_historico (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    faixa_id UUID NOT NULL REFERENCES public.comissao_gerente_faixas(id) ON DELETE CASCADE,
    acao VARCHAR(20) NOT NULL, -- 'CRIADO', 'ATUALIZADO', 'ATIVADO', 'DESATIVADO'
    percentual_anterior NUMERIC,
    percentual_novo NUMERIC,
    usuario_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comissao_gerente_faixas_historico ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only directors can view history
CREATE POLICY "Directors can view comissao_gerente_faixas_historico"
ON public.comissao_gerente_faixas_historico FOR SELECT
USING (has_role(auth.uid(), 'DIRETOR'::user_role));

CREATE POLICY "Directors can insert comissao_gerente_faixas_historico"
ON public.comissao_gerente_faixas_historico FOR INSERT
WITH CHECK (has_role(auth.uid(), 'DIRETOR'::user_role));

-- Insert default tiers as example (editable by director)
INSERT INTO public.comissao_gerente_faixas (faixa_inicio, faixa_fim, percentual) VALUES
(1, 5, 4.00),
(6, 10, 5.00),
(11, NULL, 6.00);

-- Function to calculate manager commission for a period
CREATE OR REPLACE FUNCTION public.calculate_gerente_commission(_gerente_id uuid, _mes integer, _ano integer)
RETURNS TABLE(
    total_vendas integer,
    valor_vgv_total numeric,
    faixa_id uuid,
    percentual_aplicado numeric,
    valor_comissao numeric,
    vendas_para_proxima_faixa integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _total_vendas INTEGER;
    _valor_vgv_total NUMERIC;
    _faixa_id UUID;
    _percentual NUMERIC;
    _valor_comissao NUMERIC;
    _vendas_proxima INTEGER;
    _periodo_tipo VARCHAR(20);
    _start_date DATE;
    _end_date DATE;
    _next_faixa_inicio INTEGER;
BEGIN
    -- Get period type config
    SELECT tipo INTO _periodo_tipo 
    FROM public.comissao_periodo_config 
    WHERE ativo = true 
    LIMIT 1;
    
    IF _periodo_tipo IS NULL THEN
        _periodo_tipo := 'MENSAL';
    END IF;
    
    -- Calculate period boundaries based on mes/ano
    _start_date := make_date(_ano, _mes, 1);
    
    CASE _periodo_tipo
        WHEN 'MENSAL' THEN
            _end_date := (_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        WHEN 'TRIMESTRAL' THEN
            _start_date := DATE_TRUNC('quarter', _start_date)::DATE;
            _end_date := (_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
        WHEN 'ANUAL' THEN
            _start_date := DATE_TRUNC('year', _start_date)::DATE;
            _end_date := (_start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
        ELSE
            _end_date := (_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END CASE;
    
    -- Count team sales and total VGV
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(v.valor_vgv), 0)
    INTO _total_vendas, _valor_vgv_total
    FROM public.vendas v
    JOIN public.profiles p ON v.corretor_id = p.id
    WHERE p.gerente_id = _gerente_id
    AND v.status = 'ATIVA'
    AND v.data_venda >= _start_date
    AND v.data_venda <= _end_date;
    
    -- Find matching tier
    SELECT f.id, f.percentual
    INTO _faixa_id, _percentual
    FROM public.comissao_gerente_faixas f
    WHERE f.ativo = true
    AND _total_vendas >= f.faixa_inicio
    AND (_total_vendas <= f.faixa_fim OR f.faixa_fim IS NULL)
    ORDER BY f.faixa_inicio DESC
    LIMIT 1;
    
    -- If no tier found but there are sales, use the highest applicable tier
    IF _faixa_id IS NULL AND _total_vendas > 0 THEN
        SELECT f.id, f.percentual
        INTO _faixa_id, _percentual
        FROM public.comissao_gerente_faixas f
        WHERE f.ativo = true
        AND f.faixa_fim IS NULL
        ORDER BY f.faixa_inicio DESC
        LIMIT 1;
    END IF;
    
    -- Calculate commission (retroactive - percentage applies to ALL sales)
    _valor_comissao := ROUND((_valor_vgv_total * COALESCE(_percentual, 0) / 100), 2);
    
    -- Calculate sales needed for next tier
    SELECT f.faixa_inicio INTO _next_faixa_inicio
    FROM public.comissao_gerente_faixas f
    WHERE f.ativo = true
    AND f.faixa_inicio > _total_vendas
    ORDER BY f.faixa_inicio ASC
    LIMIT 1;
    
    IF _next_faixa_inicio IS NOT NULL THEN
        _vendas_proxima := _next_faixa_inicio - _total_vendas;
    ELSE
        _vendas_proxima := 0;
    END IF;
    
    RETURN QUERY SELECT 
        _total_vendas,
        _valor_vgv_total,
        _faixa_id,
        COALESCE(_percentual, 0)::NUMERIC,
        _valor_comissao,
        _vendas_proxima;
END;
$$;

-- Function to update/recalculate manager commission for a period
CREATE OR REPLACE FUNCTION public.update_gerente_commission(_gerente_id uuid, _mes integer, _ano integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _result RECORD;
BEGIN
    -- Get calculated commission
    SELECT * INTO _result 
    FROM public.calculate_gerente_commission(_gerente_id, _mes, _ano);
    
    -- Upsert into comissao_gerente_periodo
    INSERT INTO public.comissao_gerente_periodo (
        gerente_id, mes, ano, total_vendas, valor_vgv_total, 
        faixa_id, percentual_aplicado, valor_comissao
    ) VALUES (
        _gerente_id, _mes, _ano, _result.total_vendas, _result.valor_vgv_total,
        _result.faixa_id, _result.percentual_aplicado, _result.valor_comissao
    )
    ON CONFLICT (gerente_id, mes, ano) DO UPDATE SET
        total_vendas = EXCLUDED.total_vendas,
        valor_vgv_total = EXCLUDED.valor_vgv_total,
        faixa_id = EXCLUDED.faixa_id,
        percentual_aplicado = EXCLUDED.percentual_aplicado,
        valor_comissao = EXCLUDED.valor_comissao,
        updated_at = now();
END;
$$;

-- Trigger to auto-recalculate manager commission when a sale is created/updated
CREATE OR REPLACE FUNCTION public.trigger_update_gerente_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _gerente_id UUID;
    _mes INTEGER;
    _ano INTEGER;
BEGIN
    -- Get the manager of the corretor
    SELECT gerente_id INTO _gerente_id
    FROM public.profiles
    WHERE id = COALESCE(NEW.corretor_id, OLD.corretor_id);
    
    IF _gerente_id IS NOT NULL THEN
        -- Extract month and year from sale date
        _mes := EXTRACT(MONTH FROM COALESCE(NEW.data_venda, OLD.data_venda));
        _ano := EXTRACT(YEAR FROM COALESCE(NEW.data_venda, OLD.data_venda));
        
        -- Update manager commission
        PERFORM public.update_gerente_commission(_gerente_id, _mes, _ano);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on vendas table
CREATE TRIGGER trigger_vendas_update_gerente_commission
AFTER INSERT OR UPDATE OR DELETE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_gerente_commission();