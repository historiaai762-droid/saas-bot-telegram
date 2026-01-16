const { createClient } = require("@supabase/supabase-js");

// Credenciais do Supabase
const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co"; 
// CHAVE SERVICE_ROLE (MASTER) PARA PERMISSÃO TOTAL
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQzMzc3NCwiZXhwIjoyMDg0MDA5Nzc0fQ.qSU5YFFtGo58WWew7UG31RUGCqw1FrXQ4TAd2aCr7Ag";

const supabase = createClient(supabaseUrl, supabaseKey);

// Credenciais PagSeguro (Vendedor)
const PAGSEGURO_TOKEN = "4f6eb875-2441-4bb9-a455-68c4da045c0abe77c4e24181a15b2527f8c3ffab1ac8103b-a43a-42c1-a3f4-f4677dcddee8";
const PAGSEGURO_EMAIL = "jdonascimentosoares@gmail.com";

module.exports = async (req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // O PagSeguro envia o código via POST ou GET dependendo da configuração
    const notificationCode = req.body.notificationCode || req.query.notificationCode;

    if (!notificationCode) {
      return res.status(200).json({ message: "Webhook Online e Pronto!" });
    }
    
    console.log(`🔔 Notificação Recebida: ${notificationCode}`);

    // Consulta os detalhes da transação no PagSeguro
    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;

    const transactionResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml;charset=ISO-8859-1' }
    });

    if (!transactionResponse.ok) {
      throw new Error(`Erro PagSeguro: ${transactionResponse.status}`);
    }

    const xmlText = await transactionResponse.text();
    
    // Extrai Status e E-mail do comprador usando Regex
    const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
    const emailMatch = xmlText.match(/<sender>.*?<email>(.*?)<\/email>.*?<\/sender>/);
    
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const userEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : null;

    console.log(`📊 Transação: ${userEmail} | Status: ${status}`);

    // Status 3 = Pago | Status 4 = Disponível
    if ((status === 3 || status === 4) && userEmail) {
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + 30); // Adiciona 30 dias
      
      console.log(`Simulando liberação para: ${userEmail}`);

      const { data, error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userEmail,
          plan: "premium",
          status: "active",
          expires_at: dataExpiracao.toISOString()
        }, { onConflict: 'user_id' }); 

      if (error) {
        console.error("❌ Erro Supabase:", error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Acesso LIBERADO para: ${userEmail}`);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Erro Crítico:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
