import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "varella_supabase_config";

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

export async function initializeDisparosTable(client: SupabaseClient): Promise<{ success: boolean; message: string }> {
  try {
    const { error: checkError } = await client.from("disparos").select("id").limit(1);
    
    if (!checkError) {
      return { success: true, message: "Estrutura já existente. Conexão validada com sucesso." };
    }

    const { error: createError } = await client.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS disparos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome text,
          telefone text NOT NULL,
          mensagem text DEFAULT 'Olá',
          status text DEFAULT 'PENDENTE',
          created_at timestamp with time zone DEFAULT now()
        );
      `
    });

    if (createError) {
      return {
        success: false,
        message: "Não foi possível criar a tabela automaticamente. Crie a tabela 'disparos' manualmente no seu Supabase com os campos: id (uuid), nome (text), telefone (text NOT NULL), mensagem (text DEFAULT 'Olá'), status (text DEFAULT 'PENDENTE'), created_at (timestamptz DEFAULT now())."
      };
    }

    return { success: true, message: "Estrutura criada com sucesso." };
  } catch (err) {
    return { success: false, message: "Erro na conexão. Verifique suas credenciais." };
  }
}
