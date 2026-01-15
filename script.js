async function testWebhook() {
  const res = await fetch("/api/pagseguro-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teste: true })
  });

  const data = await res.json();
  document.getElementById("resposta").innerText =
    JSON.stringify(data);
}
