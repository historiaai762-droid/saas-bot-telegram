// CÓDIGO DE DIAGNÓSTICO - NÃO USAR EM PRODUÇÃO FINAL
export default async function handler(req, res) {
  console.log("--- 🕵️‍♂️ INÍCIO DA INVESTIGAÇÃO 🕵️‍♂️ ---");
  console.log("MÉTODO:", req.method);
  
  // Ouro: Vamos ver o que veio no corpo da requisição
  console.log("BODY RECEBIDO:", JSON.stringify(req.body, null, 2));
  
  // E também na URL (query string)
  console.log("QUERY RECEBIDA:", JSON.stringify(req.query, null, 2));

  console.log("--- 🕵️‍♂️ FIM DA INVESTIGAÇÃO 🕵️‍♂️ ---");

  // Responde OK para o PagSeguro não ficar tentando de novo
  res.status(200).json({ status: "log_gravado_com_sucesso" });
}
