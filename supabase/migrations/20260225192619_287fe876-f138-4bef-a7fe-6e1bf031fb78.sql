
-- Table to store external Supabase credentials and last message per user
CREATE TABLE public.user_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supabase_url TEXT NOT NULL,
  supabase_api_key TEXT NOT NULL,
  last_message TEXT NOT NULL DEFAULT 'Olá',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_configs_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own config"
ON public.user_configs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config"
ON public.user_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
ON public.user_configs FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_configs_updated_at
BEFORE UPDATE ON public.user_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
