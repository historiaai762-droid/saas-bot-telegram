const { createClient } = require("@supabase/supabase-js");

// Pega as chaves
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// --- ÁREA DE DIAGNÓSTICO (Vai aparecer no Log) ---
console.log("--- INÍCIO DO DIAGNÓSTICO ---");
console.log("Estou rodando no ambiente:", process.env.NODE_ENV);
console.log("Tentando ler SUPABASE_URL:", supabaseUrl ? "✅ ACHEI!" : "❌ ESTÁ VAZIO/UNDEFINED");
console.log("Tentando ler SUPABASE_KEY:", supabaseKey ? "✅ ACHEI!" : "❌ ESTÁ VAZIO/UNDEFINED");
console.log("--- FIM DO DIAGNÓSTICO ---");
// --------------------------------------------------

// Verificação de Segurança
if (!supabaseUrl || !supabaseKey) {
  throw new Error("DIAGNÓSTICO: O código rodou, mas as variáveis vieram vazias.");
}

// Inicializa
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ 
        ok: true, 
        message: "Webhook Conectado! O Supabase foi carregado com sucesso." 
      });
    }

    const event = req.body;
    
    // Log do evento recebido para ajudar no futuro
    console.log("Evento recebido do PagSeguro:", JSON.stringify(event));

    if (!event) {
      return res.status(400).json({ error: "No payload" });
    }

    if (event.status === "ACTIVE") {
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: event.reference_id,
        plan: event.plan || "mensal",
        status: "active",
        expires_at: event.next_billing_at || new Date().toISOString()
      });

      if (error) throw error;
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERRO CRÍTICO:", err);
    return res.status(500).json({ error: err.message });
  }
}
