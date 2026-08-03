
CREATE TABLE public.ai_chat_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'away',
  away_after_minutes INTEGER NOT NULL DEFAULT 5,
  reply_delay_seconds INTEGER NOT NULL DEFAULT 2,
  voice_notes_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_note_mode TEXT NOT NULL DEFAULT 'auto',
  voice_note_max_seconds INTEGER NOT NULL DEFAULT 45,
  voice_note_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_settings_mode_check CHECK (mode IN ('always','away','manual')),
  CONSTRAINT ai_chat_settings_vn_mode_check CHECK (voice_note_mode IN ('never','auto','always'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_settings TO authenticated;
GRANT ALL ON public.ai_chat_settings TO service_role;
ALTER TABLE public.ai_chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai chat settings" ON public.ai_chat_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'chat',
  scenario TEXT,
  user_input TEXT NOT NULL,
  ideal_response TEXT NOT NULL,
  response_format TEXT NOT NULL DEFAULT 'text',
  tags TEXT[] NOT NULL DEFAULT '{}',
  weight NUMERIC NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_training_examples_channel_check CHECK (channel IN ('call','chat','both')),
  CONSTRAINT ai_training_examples_format_check CHECK (response_format IN ('text','voice_note','spoken'))
);
CREATE INDEX ai_training_examples_user_idx ON public.ai_training_examples (user_id, channel);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_training_examples TO authenticated;
GRANT ALL ON public.ai_training_examples TO service_role;
ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own training examples" ON public.ai_training_examples FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_training_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'chat',
  condition TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'reply_text',
  instruction TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_training_rules_channel_check CHECK (channel IN ('call','chat','both')),
  CONSTRAINT ai_training_rules_action_check CHECK (action IN ('reply_text','send_voice_note','stay_silent','escalate'))
);
CREATE INDEX ai_training_rules_user_idx ON public.ai_training_rules (user_id, channel, priority DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_training_rules TO authenticated;
GRANT ALL ON public.ai_training_rules TO service_role;
ALTER TABLE public.ai_training_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own training rules" ON public.ai_training_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ai_chat_settings_updated BEFORE UPDATE ON public.ai_chat_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ai_training_examples_updated BEFORE UPDATE ON public.ai_training_examples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ai_training_rules_updated BEFORE UPDATE ON public.ai_training_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
