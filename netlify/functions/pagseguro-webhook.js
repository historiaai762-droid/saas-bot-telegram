const { createClient } = require("@supabase/supabase-js");

// O código agora busca as chaves de forma segura nas "Environment Variables" do Netlify
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, supabaseKey);

const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN;
const PAGSEGURO_EMAIL = process.env.PAGSEGURO_EMAIL;

exports.handler = async (event, context) => {
    try {
        let notificationCode = "";

        // Captura o código enviado pelo PagSeguro
        if (event.httpMethod === "POST" && event.body) {
            const params = new URLSearchParams(event.body);
            notificationCode = params.get("notificationCode");
        } else if (event.queryStringParameters) {
            notificationCode = event.queryStringParameters.notificationCode;
        }

        // Resposta para teste de conexão
        if (!notificationCode) {
            return {
                statusCode: 200,
                body: JSON.stringify({ status: "Online", message: "Webhook Seguro e Ativo!" })
            };
        }

        console.log(`🔔 Processando código: ${notificationCode}`);

        // Consulta os detalhes da transação no PagSeguro
        const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/xml;charset=ISO-8859-1' }
        });

        if (!response.ok) throw new Error("Erro na comunicação com PagSeguro");

        const xmlText = await response.text();
        
        // Extração de dados
        const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
        const emailMatch = xmlText.match(/<sender>.*?<email>(.*?)<\/email>.*?<\/sender>/);
        const valorMatch = xmlText.match(/<grossAmount>(.*?)<\/grossAmount>/);

        const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
        const userEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : null;
        const valorPago = valorMatch ? parseFloat(valorMatch[1]) : 0;

        // Status 3 = Pago | Status 4 = Disponível
        if ((status === 3 || status === 4) && userEmail) {
            let dias = 30;
            let plano = "Mensal";

            // Lógica de planos baseada no valor pago
            if (valorPago > 150) { dias = 36500; plano = "Vitalício"; }
            else if (valorPago > 80) { dias = 180; plano = "Semestral"; }
            else if (valorPago > 40) { dias = 90; plano = "Trimestral"; }

            const exp = new Date();
            exp.setDate(exp.getDate() + dias);

            // Atualiza o acesso no Supabase usando a Service Role protegida
            const { error } = await supabase.from("subscriptions").upsert({
                user_id: userEmail,
                plan: plano,
                status: "active",
                expires_at: exp.toISOString()
            }, { onConflict: 'user_id' });

            if (error) throw error;
            console.log(`✅ Acesso LIBERADO: ${userEmail} (${plano})`);
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (err) {
        console.error("❌ Erro Crítico:", err.message);
        return { statusCode: 500, body: JSON.stringify({ error: "Erro interno no servidor" }) };
    }
};
