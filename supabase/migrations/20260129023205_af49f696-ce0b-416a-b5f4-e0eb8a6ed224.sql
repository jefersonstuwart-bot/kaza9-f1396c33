-- Allow directors to delete vendas
CREATE POLICY "Directors can delete vendas" 
ON public.vendas 
FOR DELETE 
USING (has_role(auth.uid(), 'DIRETOR'::user_role));