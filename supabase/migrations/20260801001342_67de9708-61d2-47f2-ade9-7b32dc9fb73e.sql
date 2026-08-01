
-- avatars
CREATE POLICY "avatars readable" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- chat media: folder is conversation id
CREATE POLICY "chat media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media' AND public.is_participant(((storage.foldername(name))[1])::uuid, auth.uid()));
CREATE POLICY "chat media write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND public.is_participant(((storage.foldername(name))[1])::uuid, auth.uid()));

-- studio media: folder is user id, studio access required
CREATE POLICY "studio media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'studio-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_studio_access(auth.uid()));
CREATE POLICY "studio media write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'studio-media' AND (storage.foldername(name))[1] = auth.uid()::text AND public.has_studio_access(auth.uid()));
CREATE POLICY "studio media update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'studio-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "studio media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'studio-media' AND (storage.foldername(name))[1] = auth.uid()::text);
