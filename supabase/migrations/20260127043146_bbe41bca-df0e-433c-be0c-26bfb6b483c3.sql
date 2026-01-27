-- Fix permissive RLS policies

-- Fix leads insert policy - require corretor_id to be the user's profile
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
CREATE POLICY "Authenticated users can insert leads" ON public.leads
    FOR INSERT TO authenticated 
    WITH CHECK (corretor_id = public.get_profile_id(auth.uid()) OR corretor_id IS NULL);

-- Fix vendas insert policy - require corretor_id to be the user's profile
DROP POLICY IF EXISTS "Authenticated can insert vendas" ON public.vendas;
CREATE POLICY "Authenticated can insert vendas" ON public.vendas
    FOR INSERT TO authenticated 
    WITH CHECK (corretor_id = public.get_profile_id(auth.uid()));

-- Fix lead_historico insert policy
DROP POLICY IF EXISTS "Insert lead history" ON public.lead_historico;
CREATE POLICY "Insert lead history" ON public.lead_historico
    FOR INSERT TO authenticated 
    WITH CHECK (usuario_id = public.get_profile_id(auth.uid()) OR usuario_id IS NULL);

-- Fix alertas insert policy
DROP POLICY IF EXISTS "Insert alertas" ON public.alertas;
CREATE POLICY "Insert alertas" ON public.alertas
    FOR INSERT TO authenticated 
    WITH CHECK (usuario_id = public.get_profile_id(auth.uid()) OR usuario_id IS NULL OR public.has_role(auth.uid(), 'DIRETOR'));