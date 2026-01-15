import { createClient } from "@supabase/supabase-js";

// CORREÇÃO: Usando os nomes exatos que colocamos no Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Antes estava SUPABASE_SERVICE_ROLE_KEY

// Verificação de segurança (para o log te avisar se falhar de novo)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("As chaves do Supabase não foram carregadas no Vercel!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // ... (mantenha o resto do seu código igual daqui para baixo)
    const event = req.body;

    if (!event) {
      return res.status(400).json({ error: "No payload" });
    }

    if (event.status === "ACTIVE") {
      await supabase.from("subscriptions").upsert({
        user_id: event.reference_id,
        plan: event.plan || "mensal",
        status: "active",
        expires_at: event.next_billing_at || new Date().toISOString()
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}

