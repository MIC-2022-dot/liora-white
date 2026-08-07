-- ============ IMAGE KNOWLEDGE / LIBRARY ============
-- Adds the image library, per-recipient usage tracking, and Studio rules
-- for the AI contextual image sending feature.

-- ============ ENUMS ============
CREATE TYPE public.image_time_context AS ENUM ('morning','afternoon','evening','night','anytime');
CREATE TYPE public.image_state AS ENUM ('current','historical','reference');
CREATE TYPE public.image_reuse_policy AS ENUM ('never','after_days','always');

-- ============ IMAGE LIBRARY ============
CREATE TABLE public.image_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  title text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  activity text,
  location_context text,
  time_context public.image_time_context NOT NULL DEFAULT 'anytime',
  image_state public.image_state NOT NULL DEFAULT 'historical',
  ai_enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  reuse_policy public.image_reuse_policy NOT NULL DEFAULT 'never',
  reuse_after_days integer,
  ai_metadata jsonb,
  metadata_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT image_library_storage_path_unique UNIQUE (user_id, storage_path)
);
CREATE INDEX image_library_user_idx ON public.image_library (user_id, created_at DESC);
CREATE INDEX image_library_user_ai_idx ON public.image_library (user_id) WHERE ai_enabled = true;
CREATE INDEX image_library_tags_idx ON public.image_library USING GIN (tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_library TO authenticated;
GRANT ALL ON public.image_library TO service_role;
ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own image library" ON public.image_library FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_studio_access(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.has_studio_access(auth.uid()));
CREATE TRIGGER image_library_updated BEFORE UPDATE ON public.image_library FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ IMAGE USAGE (per-recipient) ============
CREATE TABLE public.image_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES public.image_library(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (image_id, recipient_id)
);
CREATE INDEX image_usage_owner_recipient_idx ON public.image_usage (owner_id, recipient_id, sent_at DESC);
CREATE INDEX image_usage_image_idx ON public.image_usage (image_id);
GRANT SELECT, INSERT, DELETE ON public.image_usage TO authenticated;
GRANT ALL ON public.image_usage TO service_role;
ALTER TABLE public.image_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own image usage" ON public.image_usage FOR ALL TO authenticated
  USING (owner_id = auth.uid() AND public.has_studio_access(auth.uid()))
  WITH CHECK (owner_id = auth.uid() AND public.has_studio_access(auth.uid()));

-- ============ IMAGE RULES (Studio configurable) ============
CREATE TABLE public.image_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition text NOT NULL,
  action text NOT NULL DEFAULT 'prefer',
  instruction text,
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT image_rules_action_check CHECK (action IN ('prefer','exclude','require'))
);
CREATE INDEX image_rules_user_idx ON public.image_rules (user_id, priority DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_rules TO authenticated;
GRANT ALL ON public.image_rules TO service_role;
ALTER TABLE public.image_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own image rules" ON public.image_rules FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_studio_access(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.has_studio_access(auth.uid()));
CREATE TRIGGER image_rules_updated BEFORE UPDATE ON public.image_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REALTIME ============
ALTER TABLE public.image_library REPLICA IDENTITY FULL;
ALTER TABLE public.image_usage REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_library, public.image_usage;