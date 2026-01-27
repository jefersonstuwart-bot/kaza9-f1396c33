-- Create storage bucket for construtoras photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('construtoras', 'construtoras', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public viewing
CREATE POLICY "Public can view construtora images"
ON storage.objects FOR SELECT
USING (bucket_id = 'construtoras');

-- Create policy for directors to upload
CREATE POLICY "Directors can upload construtora images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'construtoras' 
  AND has_role(auth.uid(), 'DIRETOR'::user_role)
);

-- Create policy for directors to update
CREATE POLICY "Directors can update construtora images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'construtoras' 
  AND has_role(auth.uid(), 'DIRETOR'::user_role)
);

-- Create policy for directors to delete
CREATE POLICY "Directors can delete construtora images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'construtoras' 
  AND has_role(auth.uid(), 'DIRETOR'::user_role)
);