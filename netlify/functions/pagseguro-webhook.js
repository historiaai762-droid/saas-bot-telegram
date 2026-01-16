const { createClient } = require("@supabase/supabase-js");

// Credenciais do Supabase (Service Role)
const supabaseUrl = "https://zyjeriulpozkvhtxdvrx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5amVyaXVscG96a3ZodHhkdnJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQzMzc3NCwiZXhwIjoyMDg0MDA5Nzc0fQ.qSU5YFFtGo58WWew7UG31RUGCqw1FrXQ4TAd2aCr7Ag";
const supabase = createClient(supabaseUrl, supabaseKey);

// Credenciais PagSeguro
const PAGSEGURO_TOKEN = "4f6eb875-2441-4bb9-a455-68c4da045c0abe77c4e24181a15b2527f8c3ffab1ac8103b-a43a-42c1-a3f4-f4677dcddee8";
const PAGSEGURO_EMAIL = "jdonascimentosoares@gmail.com";

exports.handler = async (event, context) => {
    try {
        // No Netlify, os dados podem vir no body (POST) ou no queryStringParameters (GET)
        let notificationCode = "";

        if (event.httpMethod === "POST" && event.body) {
            // O PagSeguro envia como x-www-form-urlencoded (ex: notificationCode=123)
            const params = new URLSearchParams(event.body);
            notificationCode = params.get("notificationCode");
        } else if (event.queryStringParameters) {
            notificationCode = event.queryStringParameters.notificationCode;
        }

        // Se não tiver código, apenas responde que está online
        if (!notificationCode) {
            return {
                statusCode: 200,
                body: JSON.stringify({ status: "Online", message: "Webhook Netlify pronto!" })
            };
        }

        console.log(`🔔 Notificação recebida: ${notificationCode}`);

        // Consulta PagSeguro
        const url = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${PAGSEGURO_EMAIL}&token=${PAGSEGURO_TOKEN}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/xml;charset=ISO-8859-1' }
        });

        if (!response.ok) throw new Error("Erro PagSeguro");

        const xmlText = await response.text();
        const statusMatch = xmlText.match(/<status>(\d)<\/status>/);
        const emailMatch = xmlText.match(/<sender>.*?<email>(.*?)<\/email>.*?<\/sender>/);
        const valorMatch = xmlText.match(/<grossAmount>(.*?)<\/grossAmount>/);

        const status = statusMatch ? parseInt(statusMatch[1], 10) : null;
        const userEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : null;
        const valorPago = valorMatch ? parseFloat(valorMatch[1]) : 0;

        // Se estiver pago (3) ou disponível (4)
        if ((status === 3 || status === 4) && userEmail) {
            let dias = 30;
            let plano = "Mensal";

            if (valorPago > 150) { dias = 36500; plano = "Vitalício"; }
            else if (valorPago > 80) { dias = 180; plano = "Semestral"; }
            else if (valorPago > 40) { dias = 90; plano = "Trimestral"; }

            const exp = new Date();
            exp.setDate(exp.getDate() + dias);

            const { error } = await supabase.from("subscriptions").upsert({
                user_id: userEmail,
                plan: plano,
                status: "active",
                expires_at: exp.toISOString()
            }, { onConflict: 'user_id' });

            if (error) throw error;
            console.log(`✅ Liberado: ${userEmail} (${plano})`);
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (err) {
        console.error("❌ Erro:", err.message);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
