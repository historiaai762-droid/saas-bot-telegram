import { createClient } from "@supabase/supabase-js";

// 1. Configuração das Chaves
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 2. Verificação de Segurança (Para debug)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("As chaves do Supabase não foram carregadas no Vercel!");
}

// 3. Inicializa o Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    // 4. Se você abrir no navegador (GET), mostra mensagem de sucesso
    if (req.method !== "POST") {
      return res.status(200).json({ 
        ok: true, 
        message: "Webhook PagSeguro está ONLINE! (As chaves funcionaram)" 
      });
    }

    // 5. Lógica do Webhook (Quando o PagSeguro manda dados)
    const event = req.body;

    if (!event) {
      return res.status(400).json({ error: "Sem dados (No Payload)" });
    }

    // Exemplo: Ativar assinatura
    if (event.status === "ACTIVE") {
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: event.reference_id, // Garanta que o PagSeguro envia isso
        plan: event.plan || "mensal",
        status: "active",
        expires_at: event.next_billing_at || new Date().toISOString()
      });

      if (error) throw error;
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERRO NO WEBHOOK:", err);
    return res.status(500).json({ error: err.message });
  }
}
