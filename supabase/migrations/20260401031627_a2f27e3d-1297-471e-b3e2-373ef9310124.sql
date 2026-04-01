
-- Function to recalculate all commissions for a corretor in a period after delete
CREATE OR REPLACE FUNCTION public.recalculate_period_commissions(_corretor_id uuid, _data_venda date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _periodo_tipo VARCHAR(20);
    _start_date DATE;
    _end_date DATE;
    _venda RECORD;
    _count INTEGER := 0;
    _nivel nivel_corretor;
    _percentual NUMERIC;
    _max_faixa INTEGER;
BEGIN
    -- Get period type
    SELECT tipo INTO _periodo_tipo 
    FROM public.comissao_periodo_config 
    WHERE ativo = true 
    LIMIT 1;
    
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
    
    -- Get corretor nivel
    SELECT p.nivel_corretor INTO _nivel
    FROM public.profiles p
    WHERE p.id = _corretor_id;
    
    IF _nivel IS NULL THEN RETURN; END IF;
    
    -- Get max faixa
    SELECT MAX(cf.numero_venda) INTO _max_faixa
    FROM public.comissao_faixas cf
    WHERE cf.nivel_corretor = _nivel AND cf.ativo = true;
    
    IF _max_faixa IS NULL THEN RETURN; END IF;
    
    -- Loop through all active vendas in period ordered by data_venda
    FOR _venda IN 
        SELECT id 
        FROM public.vendas 
        WHERE corretor_id = _corretor_id 
        AND status = 'ATIVA' 
        AND data_venda >= _start_date 
        AND data_venda <= _end_date
        ORDER BY data_venda ASC, created_at ASC
    LOOP
        _count := _count + 1;
        
        -- Get percentual for this position
        SELECT cf.percentual INTO _percentual
        FROM public.comissao_faixas cf
        WHERE cf.nivel_corretor = _nivel
        AND cf.numero_venda = LEAST(_count, _max_faixa)
        AND cf.ativo = true;
        
        -- Update the venda
        UPDATE public.vendas 
        SET numero_venda_periodo = _count,
            percentual_comissao = COALESCE(_percentual, 0),
            valor_comissao = ROUND((valor_vgv * COALESCE(_percentual, 0) / 100), 2)
        WHERE id = _venda.id;
    END LOOP;
END;
$$;

-- Trigger function to recalculate after delete
CREATE OR REPLACE FUNCTION public.trigger_recalculate_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Recalculate commissions for the corretor in the period
    PERFORM public.recalculate_period_commissions(OLD.corretor_id, OLD.data_venda);
    
    -- Also update gerente commission if applicable
    IF OLD.gerente_id IS NOT NULL THEN
        PERFORM public.update_gerente_commission(
            OLD.gerente_id, 
            EXTRACT(MONTH FROM OLD.data_venda)::INTEGER, 
            EXTRACT(YEAR FROM OLD.data_venda)::INTEGER
        );
    END IF;
    
    RETURN OLD;
END;
$$;

-- Create trigger for after delete
CREATE TRIGGER trigger_vendas_after_delete
AFTER DELETE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_after_delete();

-- Also recalculate on UPDATE (e.g. date change, status change)
CREATE OR REPLACE FUNCTION public.trigger_recalculate_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- If date, status or corretor changed, recalculate
    IF OLD.data_venda IS DISTINCT FROM NEW.data_venda 
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.corretor_id IS DISTINCT FROM NEW.corretor_id THEN
        
        -- Recalculate for old corretor/period
        PERFORM public.recalculate_period_commissions(OLD.corretor_id, OLD.data_venda);
        
        -- If corretor or date changed, also recalculate new period
        IF OLD.corretor_id IS DISTINCT FROM NEW.corretor_id 
           OR OLD.data_venda IS DISTINCT FROM NEW.data_venda THEN
            PERFORM public.recalculate_period_commissions(NEW.corretor_id, NEW.data_venda);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_vendas_after_update_recalc
AFTER UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_after_update();
