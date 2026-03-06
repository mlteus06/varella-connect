
-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign contacts table
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  nome TEXT,
  telefone TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- Campaigns RLS policies
CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);

-- Campaign contacts RLS - access through campaign ownership
CREATE POLICY "Users can view contacts of their campaigns" ON public.campaign_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert contacts to their campaigns" ON public.campaign_contacts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete contacts from their campaigns" ON public.campaign_contacts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid())
);
