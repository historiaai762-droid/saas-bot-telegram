import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ ok: true, message: "Webhook ativo" });
    }

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
