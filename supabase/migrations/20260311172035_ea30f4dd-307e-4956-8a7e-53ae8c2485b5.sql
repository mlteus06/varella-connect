
-- Contact lists (spreadsheets or manual groups)
CREATE TABLE public.contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'spreadsheet',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contact lists" ON public.contact_lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contact lists" ON public.contact_lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contact lists" ON public.contact_lists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contact lists" ON public.contact_lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Base contacts
CREATE TABLE public.base_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  nome text,
  telefone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.base_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts" ON public.base_contacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON public.base_contacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.base_contacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.base_contacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Segmentation lists
CREATE TABLE public.segmentation_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.segmentation_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own segmentation lists" ON public.segmentation_lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own segmentation lists" ON public.segmentation_lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own segmentation lists" ON public.segmentation_lists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own segmentation lists" ON public.segmentation_lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Segmentation sources (which contact_lists are in a segmentation)
CREATE TABLE public.segmentation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segmentation_id uuid NOT NULL REFERENCES public.segmentation_lists(id) ON DELETE CASCADE,
  contact_list_id uuid NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  UNIQUE(segmentation_id, contact_list_id)
);

ALTER TABLE public.segmentation_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segmentation sources" ON public.segmentation_sources
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.segmentation_lists WHERE id = segmentation_sources.segmentation_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert segmentation sources" ON public.segmentation_sources
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.segmentation_lists WHERE id = segmentation_sources.segmentation_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete segmentation sources" ON public.segmentation_sources
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.segmentation_lists WHERE id = segmentation_sources.segmentation_id AND user_id = auth.uid())
  );

-- Add status and template_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL;

-- Campaign sources (which lists/segments are used)
CREATE TABLE public.campaign_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL
);

ALTER TABLE public.campaign_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign sources" ON public.campaign_sources
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_sources.campaign_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert campaign sources" ON public.campaign_sources
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_sources.campaign_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete campaign sources" ON public.campaign_sources
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_sources.campaign_id AND user_id = auth.uid())
  );
