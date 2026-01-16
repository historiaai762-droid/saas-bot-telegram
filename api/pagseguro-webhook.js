const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQzMzc3NCwiZXhwIjoyMDg0MDA5Nzc0fQ.qSU5YFFtGo58WWew7UG31RUGCqw1FrXQ4TAd2aCr7Ag";

const supabase = createClient(supabaseUrl, supabaseKey);

const PAGSEGURO_TOKEN = "4f6eb875-2441-4bb9-a455-68c4da045c0abe77c4e24181a15b2527f8c3ffab1ac8103b-a43a-42c1-a3f4-f4677dcddee8";
const PAGSEGURO_EMAIL = "jdonascimentosoares@gmail.com";

module.exports = async (req, res) => {
  try {
    // PROTEÇÃO: Verifica se notificationCode existe de forma segura
    // Tenta pegar do corpo (POST) ou da URL (GET)
    const notificationCode = (req.body && req.body.notificationCode) || (req.query && req.query.notificationCode);

    if (!notificationCode) {
      // Se não houver código, apenas diz que está online em vez de dar erro 500
      return res.status(200).json({ 
        status: "Online", 
        message: "Aguardando notificações do PagSeguro..." 
      });
    }
    
    console.log(`🔔 Notificação Recebida: ${notificationCode}`);

    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;

    const transactionResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml;charset=ISO-8859-1' }
    });

    if (!transactionResponse.ok) {
      throw new Error(`Erro PagSeguro: ${transactionResponse.status}`);
    }

    const xmlText = await transactionResponse.text();
    
    const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
    const emailMatch = xmlText.match(/<sender>.*?<email>(.*?)<\/email>.*?<\/sender>/);
    
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const userEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : null;

    if ((status === 3 || status === 4) && userEmail) {
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + 30);
      
      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userEmail,
          plan: "premium",
          status: "active",
          expires_at: dataExpiracao.toISOString()
        }, { onConflict: 'user_id' }); 

      if (error) throw error;
      console.log(`✅ Acesso LIBERADO para: ${userEmail}`);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Erro:", error.message);
    // Retorna erro 500 apenas se for um erro real de processamento
    return res.status(500).json({ error: error.message });
  }
};
