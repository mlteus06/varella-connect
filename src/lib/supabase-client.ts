import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "inout_supabase_config";

export interface SupabaseConfig {
  url: string;
  apiKey: string;
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createExternalClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.apiKey);
}

// Save config to Cloud DB
export async function saveConfigToCloud(supabaseUrl: string, supabaseApiKey: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { error } = await supabase.from("user_configs").upsert(
    {
      user_id: user.id,
      supabase_url: supabaseUrl,
      supabase_api_key: supabaseApiKey,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
  saveSupabaseConfig({ url: supabaseUrl, apiKey: supabaseApiKey });
}

// Load config from Cloud DB into localStorage
export async function loadConfigFromCloud(): Promise<SupabaseConfig | null> {
  const { data, error } = await supabase
    .from("user_configs")
    .select("supabase_url, supabase_api_key")
    .maybeSingle();

  if (error || !data) return null;

  const config: SupabaseConfig = {
    url: data.supabase_url,
    apiKey: data.supabase_api_key,
  };
  saveSupabaseConfig(config);
  return config;
}

// Get last message from Cloud
export async function getLastMessage(): Promise<string> {
  const { data } = await supabase
    .from("user_configs")
    .select("last_message")
    .maybeSingle();
  return data?.last_message || "Olá";
}

// Save last message to Cloud
export async function saveLastMessage(message: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_configs")
    .update({ last_message: message })
    .eq("user_id", user.id);
}

export async function initializeExternalTables(client: SupabaseClient): Promise<{ success: boolean; message: string }> {
  try {
    // Try creating all tables via exec_sql RPC
    const { error: createError } = await client.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS disparos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome text,
          telefone text NOT NULL,
          mensagem text DEFAULT 'Olá',
          status text DEFAULT 'PENDENTE',
          created_at timestamp with time zone DEFAULT now(),
          respondeu boolean DEFAULT false
        );

        CREATE TABLE IF NOT EXISTS contact_lists (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          type text NOT NULL DEFAULT 'spreadsheet',
          created_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS base_contacts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          list_id uuid REFERENCES contact_lists(id) ON DELETE CASCADE,
          nome text,
          telefone text NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS message_templates (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          content text NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS segmentation_lists (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          created_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS segmentation_sources (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          segmentation_id uuid REFERENCES segmentation_lists(id) ON DELETE CASCADE,
          contact_list_id uuid REFERENCES contact_lists(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS campaigns (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          status text NOT NULL DEFAULT 'pendente',
          template_id uuid REFERENCES message_templates(id) ON DELETE SET NULL,
          created_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS campaign_sources (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
          source_type text NOT NULL,
          source_id uuid NOT NULL
        );

        CREATE TABLE IF NOT EXISTS campaign_contacts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
          nome text,
          telefone text NOT NULL
        );
      `
    });

    if (createError) {
      // If exec_sql doesn't exist, check if tables already exist
      const { error: checkError } = await client.from("disparos").select("id").limit(1);
      if (!checkError) {
        return { success: true, message: "Conexão validada com sucesso." };
      }
      return {
        success: false,
        message: "Não foi possível criar as tabelas automaticamente. Crie a função 'exec_sql' no seu Supabase ou crie as tabelas manualmente: disparos, contact_lists, base_contacts, message_templates, segmentation_lists, segmentation_sources, campaigns, campaign_sources, campaign_contacts."
      };
    }

    return { success: true, message: "Estrutura criada com sucesso!" };
  } catch (err) {
    return { success: false, message: "Erro na conexão. Verifique suas credenciais." };
  }
}
