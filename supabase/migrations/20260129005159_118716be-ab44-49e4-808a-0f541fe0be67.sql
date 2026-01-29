-- Add INSERT policy for managers to create profiles (with themselves as gerente)
CREATE POLICY "Managers can insert team profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'GERENTE'::user_role) 
  AND gerente_id = get_profile_id(auth.uid())
);

-- Add UPDATE policy for managers to update their team members
CREATE POLICY "Managers can update team profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'GERENTE'::user_role) 
  AND gerente_id = get_profile_id(auth.uid())
);

-- Add INSERT policy for managers to create CORRETOR roles only
CREATE POLICY "Managers can insert corretor roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'GERENTE'::user_role) 
  AND role = 'CORRETOR'::user_role
);

-- Add SELECT policy for managers to view roles of their team
CREATE POLICY "Managers can view team roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'GERENTE'::user_role) 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = user_roles.user_id 
    AND p.gerente_id = get_profile_id(auth.uid())
  )
);