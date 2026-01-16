const { createClient } = require("@supabase/supabase-js");

// Credenciais (JÁ ESTÃO CORRETAS)
const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzM3NzQsImV4cCI6MjA4NDAwOTc3NH0.dFcbSg8JOlO0sSvU1bz-a1rpyh8p5LoUpLddetHkGZI";
const supabase = createClient(supabaseUrl, supabaseKey);
const PAGSEGURO_TOKEN = "4f6eb875-2441-4bb9-a455-68c4da045c0abe77c4e24181a15b2527f8c3ffab1ac8103b-a43a-42c1-a3f4-f4677dcddee8";
const PAGSEGURO_EMAIL = "jdonascimentosoares@gmail.com";

// Formato correto para Vercel Serverless Functions
module.exports = async (req, res) => {
  try {
    const { notificationCode } = req.body;

    if (!notificationCode) {
      return res.status(200).json({ message: "Webhook Online e Pronto!" });
    }
    
    console.log(`🔔 Código Recebido: ${notificationCode}`);

    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;

    const transactionResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml;charset=ISO-8859-1' }
    });

    if (!transactionResponse.ok) {
      const errorBody = await transactionResponse.text();
      console.error("Erro do PagSeguro:", transactionResponse.status, errorBody);
      throw new Error(`Erro ao consultar PagSeguro: ${transactionResponse.statusText}`);
    }

    const xmlText = await transactionResponse.text();
    console.log("🔍 XML Recebido:", xmlText);

    // Extrair o e-mail do comprador
    const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
    const emailMatch = xmlText.match(/<sender><email>(.*?)<\/email><\/sender>/);
    
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const userEmail = emailMatch ? emailMatch[1] : `cliente-sem-email-${Date.now()}`;

    console.log(`📊 Status: ${status} | Comprador: ${userEmail}`);

    if (status === 3 || status === 4) { // Paga ou Disponível
      const dataHoje = new Date();
      dataHoje.setDate(dataHoje.getDate() + 30);
      
      const { data, error } = await supabase.from("subscriptions").upsert({
        user_id: userEmail, // Salva o e-mail do cliente como ID
        plan: "premium",
        status: "active",
        expires_at: dataHoje.toISOString()
      }, { onConflict: 'user_id' }); 

      if (error) throw error;
      console.log(`✅ Acesso liberado/atualizado para: ${userEmail}`);
    }

    res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ ERRO CRÍTICO:", error.message);
    res.status(500).json({ error: error.message });
  }
};
