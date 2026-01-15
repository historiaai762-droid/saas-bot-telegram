const { createClient } = require("@supabase/supabase-js");

// =====================================================
// 🚨 ÁREA DE TESTE (Chaves inseridas diretamente)
const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzM3NzQsImV4cCI6MjA4NDAwOTc3NH0.dFcbSg8JOlO0sSvU1bz-a1rpyh8p5LoUpLddetHkGZI";
// =====================================================

// Inicializa o Supabase com as chaves diretas
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    // Se abrir no navegador, mostra sucesso
    if (req.method !== "POST") {
      return res.status(200).json({ 
        ok: true, 
        message: "✅ SUCESSO! O Webhook conectou no Supabase via código direto." 
      });
    }

    const event = req.body;

    if (!event) {
      return res.status(400).json({ error: "No payload" });
    }

    // Exemplo: Salvar no banco
    if (event.status === "ACTIVE") {
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: event.reference_id || "teste-manual",
        plan: event.plan || "mensal",
        status: "active",
        expires_at: event.next_billing_at || new Date().toISOString()
      });

      if (error) throw error;
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERRO:", err);
    return res.status(500).json({ error: err.message });
  }
}

