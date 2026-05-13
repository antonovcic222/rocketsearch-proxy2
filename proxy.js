const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const SUPABASE_URL = "https://joxydnlbtlrhvvecoovr.supabase.co";
const GENAPI_KEY = "sk-8G88dciyi99U7SHLfjEgwH7Ep0m6gjvAGJDjGDgCJtEhY9yGa4unBw2jwc4o";

const app = express();

// Разрешаем CORS для всех источников (можно ограничить доменом вашего сайта)
app.use(cors());

// Парсинг JSON тела запроса
app.use(express.json());

// Прокси для Supabase
app.use('/supabase', createProxyMiddleware({
  target: SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: { '^/supabase': '' },
}));

// AI-консультант
app.post('/genapi-query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const systemPrompt = `Ты — эксперт по космическим аппаратам, полезным нагрузкам и комплектующим для малых спутников. Отвечай **только** на вопросы, связанные с космическим оборудованием, комплектующими, массой, совместимостью, характеристиками камер, аккумуляторов, солнечных панелей, двигателей, систем связи и других компонентов космических аппаратов. Если вопрос не относится к этим темам, отвечай: "Я могу консультировать только по космическим комплектующим и оборудованию."`;

  try {
    const resp = await fetch("https://proxy.gen-api.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GENAPI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-v4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
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
