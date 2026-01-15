export default function handler(req, res) {
  res.status(200).json({ 
    mensagem: "O Backend está VIVO!", 
    metodo: req.method 
  });
}