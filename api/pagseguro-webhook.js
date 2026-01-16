const { createClient } = require("@supabase/supabase-js");

// =====================================================
// 🚨 SUAS CHAVES DO SUPABASE
const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzM3NzQsImV4cCI6MjA4NDAwOTc3NH0.dFcbSg8JOlO0sSvU1bz-a1rpyh8p5LoUpLddetHkGZI";
const supabase = createClient(supabaseUrl, supabaseKey);
// =====================================================

// =====================================================
// 🚨 SUAS CREDENCIAIS DO PAGSEGURO
const PAGSEGURO_TOKEN = "4f6eb875-2441-4bb9-a455-68c4da045c0abe77c4e24181a15b2527f8c3ffab1ac8103b-a43a-42c1-a3f4-f4677dcddee8";
const PAGSEGURO_EMAIL = "jdonascimentosoares@gmail.com";
// =====================================================

export default async function handler(req, res) {
  try {
    const { notificationCode } = req.body;

    if (!notificationCode) {
      console.log("Acesso via navegador ou notificação inválida.");
      return res.status(200).json({ message: "Webhook Online e Pronto para receber notificações!" });
    }
    
    console.log(`🔔 Código de Notificação Recebido: ${notificationCode}`);

    // Monta a URL para consultar a transação no PagSeguro
    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;

    const transactionResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml' } 
    });

    if (!transactionResponse.ok) {
      throw new Error(`Erro ao consultar PagSeguro: ${transactionResponse.statusText}`);
    }

    const xmlText = await transactionResponse.text();
    console.log("🔍 XML Recebido do PagSeguro:", xmlText);

    // Extrair dados do XML
    const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
    const referenceMatch = xmlText.match(/<reference>(.*?)<\/reference>/);
    
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const reference = referenceMatch ? referenceMatch[1] : `transacao-${Date.now()}`;

    console.log(`📊 Status da Transação: ${status} | Referência: ${reference}`);

    // Status 3 (Paga) ou 4 (Disponível) = LIBERAR ACESSO
    if (status === 3 || status === 4) {
      const dataHoje = new Date();
      dataHoje.setDate(dataHoje.getDate() + 30);
      
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: reference,
        plan: "premium",
        status: "active",
        expires_at: dataHoje.toISOString()
      });

      if (error) throw error;
      console.log(`✅ Acesso liberado para a referência: ${reference}`);
    }

    res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ ERRO CRÍTICO NO WEBHOOK:", error);
    res.status(500).json({ error: error.message });
  }
}
