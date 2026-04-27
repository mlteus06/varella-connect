ALTER TABLE public.user_configs
ADD COLUMN IF NOT EXISTS token_exact TEXT;
