-- Tabela para armazenar atualizações/histórico do lead
CREATE TABLE public.lead_atualizacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.profiles(id),
    tipo TEXT NOT NULL DEFAULT 'OBSERVACAO', -- OBSERVACAO, WHATSAPP, LIGACAO, EMAIL, VISITA
    descricao TEXT,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lead_atualizacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view lead updates for their leads" 
ON public.lead_atualizacoes 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_id
        AND (
            l.corretor_id = get_profile_id(auth.uid())
            OR has_role(auth.uid(), 'DIRETOR'::user_role)
            OR (has_role(auth.uid(), 'GERENTE'::user_role) AND is_manager_of(auth.uid(), l.corretor_id))
        )
    )
);

CREATE POLICY "Users can insert updates for their leads" 
ON public.lead_atualizacoes 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_id
        AND (
            l.corretor_id = get_profile_id(auth.uid())
            OR has_role(auth.uid(), 'DIRETOR'::user_role)
            OR (has_role(auth.uid(), 'GERENTE'::user_role) AND is_manager_of(auth.uid(), l.corretor_id))
        )
    )
);

CREATE POLICY "Users can delete updates for their leads" 
ON public.lead_atualizacoes 
FOR DELETE 
USING (
    usuario_id = get_profile_id(auth.uid())
    OR has_role(auth.uid(), 'DIRETOR'::user_role)
);

-- Criar bucket para uploads de leads
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-uploads', 'lead-uploads', true);

-- Políticas de storage
CREATE POLICY "Anyone can view lead uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lead-uploads');

CREATE POLICY "Authenticated can upload lead files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lead-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their uploads" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'lead-uploads' AND auth.role() = 'authenticated');