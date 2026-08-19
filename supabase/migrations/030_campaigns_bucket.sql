-- Create campaigns bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the campaigns bucket
-- Allow public read access to the campaigns bucket
CREATE POLICY "Campaigns Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaigns');

-- Allow authenticated users (admin) to upload files to the campaigns bucket
CREATE POLICY "Campaigns Admin Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their files
CREATE POLICY "Campaigns Admin Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their files
CREATE POLICY "Campaigns Admin Delete Access"
ON storage.objects FOR DELETE
USING (bucket_id = 'campaigns' AND auth.role() = 'authenticated');
