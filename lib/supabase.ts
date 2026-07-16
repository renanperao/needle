import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quando as variáveis de ambiente do Supabase estão definidas. */
export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/** Cliente Supabase do navegador (singleton). Sessão persiste no localStorage. */
export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "needle:auth" },
    });
  }
  return client;
}
