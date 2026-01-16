const { createClient } = require("@supabase/supabase-js");

// Credenciais do Supabase (Service Role para permissão total)
const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQzMzc3NCwiZXhwIjoyMDg0MDA5Nzc0fQ.qSU5YFFtGo58WWew7UG31RUGCqw1FrXQ4TAd2aCr7Ag";

const supabase = createClient(supabaseUrl, supabaseKey);

// Credenciais PagSeguro (Vendedor)
const PAGSEGURO_TOKEN = "4f6eb875-2441-4bb9-a455-68c4da045c0abe77c4e24181a15b2527f8c3ffab1ac8103b-a43a-42c1-a3f4-f4677dcddee8";
const PAGSEGURO_EMAIL = "jdonascimentosoares@gmail.com";

module.exports = async (req, res) => {
  try {
    // Captura o código de notificação enviado pelo PagSeguro
    const notificationCode = (req.body && req.body.notificationCode) || (req.query && req.query.notificationCode);

    if (!notificationCode) {
      return res.status(200).json({ status: "Online", message: "Aguardando notificações..." });
    }
    
    console.log(`🔔 Notificação recebida: ${notificationCode}`);

    // Consulta os detalhes da transação no PagSeguro
    const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;

    const transactionResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml;charset=ISO-8859-1' }
    });

    if (!transactionResponse.ok) throw new Error("Erro ao consultar PagSeguro");

    const xmlText = await transactionResponse.text();
    
    // EXTRAÇÃO DE DADOS VIA REGEX
    const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
    const emailMatch = xmlText.match(/<sender>.*?<email>(.*?)<\/email>.*?<\/sender>/);
    const valorMatch = xmlText.match(/<grossAmount>(.*?)<\/grossAmount>/);
    
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const userEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : null;
    const valorPago = valorMatch ? parseFloat(valorMatch[1]) : 0;

    console.log(`📊 Processando: ${userEmail} | Valor: R$ ${valorPago} | Status: ${status}`);

    // Status 3 (Pago) ou Status 4 (Disponível)
    if ((status === 3 || status === 4) && userEmail) {
      
      let diasAdicionais = 30; 
      let nomePlano = "Mensal";

      // LÓGICA DE DEFINIÇÃO DE PLANO POR VALOR (Baseado no seu index.html)
      if (valorPago > 150) {
        diasAdicionais = 36500; // Vitalício (aprox. 100 anos)
        nomePlano = "Vitalício";
      } else if (valorPago > 80) {
        diasAdicionais = 180; // Semestral
        nomePlano = "Semestral";
      } else if (valorPago > 40) {
        diasAdicionais = 90; // Trimestral
        nomePlano = "Trimestral";
      }

      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + diasAdicionais);
      
      // Salva ou Atualiza no Supabase
      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userEmail,
          plan: nomePlano,
          status: "active",
          expires_at: dataExpiracao.toISOString()
        }, { onConflict: 'user_id' }); 

      if (error) {
        console.error("❌ Erro Supabase:", error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ SUCESSO: Plano ${nomePlano} ativado para ${userEmail}`);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ Erro no Webhook:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
