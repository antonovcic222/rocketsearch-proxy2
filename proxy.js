const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const SUPABASE_URL = "https://joxydnlbtlrhvvecoovr.supabase.co";
const GENAPI_KEY = "sk-8G88dciyi99U7SHLfjEgwH7Ep0m6gjvAGJDjGDgCJtEhY9yGa4unBw2jwc4o";   // <-- замените

const app = express();
app.use(express.json());

// Прокси Supabase
app.use('/supabase', createProxyMiddleware({
  target: SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: { '^/supabase': '' },
}));

// AI‑консультант
app.post('/genapi-query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const systemPrompt = `Ты — эксперт по космическим аппаратам. Отвечай только о комплектующих, массе, совместимости. Если вопрос не по теме — отвечай: "Я консультирую только по космическому оборудованию."`;

  try {
    const resp = await fetch("https://api.gen-api.ru/api/v1/networks/chatgpt-4", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GENAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });
    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || "Ошибка получения ответа от AI.";
    res.json({ answer });
  } catch (e) {
    res.status(500).json({ answer: "Ошибка соединения с AI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
