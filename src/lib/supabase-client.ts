import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

export async function initializeDisparosTable(client: SupabaseClient): Promise<{ success: boolean; message: string }> {
  try {
    // Check if table exists by trying to select from it
    const { error: checkError } = await client.from("disparos").select("id").limit(1);
    
    if (!checkError) {
      return { success: true, message: "Estrutura já existente. Conexão validada com sucesso." };
    }

    // If table doesn't exist, we need to create it via SQL
    // Using the REST API to run SQL
    const { error: createError } = await client.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS disparos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome text,
          telefone text NOT NULL,
          status text DEFAULT 'PENDENTE',
          created_at timestamp with time zone DEFAULT now()
        );
      `
    });

    if (createError) {
      // Try alternative: the table might need to be created differently
      // If RPC doesn't exist, inform the user
      return {
        success: false,
        message: "Não foi possível criar a tabela automaticamente. Crie a tabela 'disparos' manualmente no seu Supabase com os campos: id (uuid), nome (text), telefone (text NOT NULL), status (text DEFAULT 'PENDENTE'), created_at (timestamptz DEFAULT now())."
      };
    }

    return { success: true, message: "Estrutura criada com sucesso." };
  } catch (err) {
    return { success: false, message: "Erro na conexão. Verifique suas credenciais." };
  }
}
