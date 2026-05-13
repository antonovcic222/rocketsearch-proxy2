const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const SUPABASE_URL = "https://joxydnlbtlrhvvecoovr.supabase.co";
const GENAPI_KEY = "sk-8G88dciyi99U7SHLfjEgwH7Ep0m6gjvAGJDjGDgCJtEhY9yGa4unBw2jwc4o";

const app = express();

// Ручной CORS: разрешаем все заголовки
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  // Зеркалируем запрошенные заголовки (или разрешаем все)
  if (req.headers['access-control-request-headers']) {
    res.header("Access-Control-Allow-Headers", req.headers['access-control-request-headers']);
  } else {
    res.header("Access-Control-Allow-Headers", "*");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Прокси Supabase
app.use('/supabase', createProxyMiddleware({
  target: SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: { '^/supabase': '' },
}));

// AI-консультант
app.post('/genapi-query', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const systemPrompt = {
    role: "system",
    content: `Ты — эксперт по космическим аппаратам, полезным нагрузкам и комплектующим для малых спутников. Отвечай **только** на вопросы, связанные с космическим оборудованием, комплектующими, массой, совместимостью, характеристиками камер, аккумуляторов, солнечных панелей, двигателей, систем связи и других компонентов космических аппаратов. Если вопрос не относится к этим темам, отвечай: "Я могу консультировать только по космическим комплектующим и оборудованию."`
  };

  try {
    const resp = await fetch("https://proxy.gen-api.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GENAPI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [systemPrompt, ...messages],
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
