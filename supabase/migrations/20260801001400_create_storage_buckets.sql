-- ============ STORAGE BUCKETS ============
-- Create the storage buckets used by Liora.
-- All buckets are private; access is controlled by RLS policies
-- defined in the storage policies migration.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('chat-media', 'chat-media', false, 26214400, NULL),
  ('studio-media', 'studio-media', false, 26214400, NULL)
ON CONFLICT (id) DO NOTHING;