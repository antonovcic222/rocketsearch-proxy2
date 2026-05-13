const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const SUPABASE_URL = "https://joxydnlbtlrhvvecoovr.supabase.co";
const GENAPI_KEY = "sk-8G88dciyi99U7SHLfjEgwH7Ep0m6gjvAGJDjGDgCJtEhY9yGa4unBw2jwc4o";

const app = express();

// Ручной CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
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

// AI-консультант (нативный API GenAPI)
app.post('/genapi-query', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const systemPrompt = `Ты — эксперт по космическим аппаратам, полезным нагрузкам и комплектующим для малых спутников. Отвечай **только** на вопросы, связанные с космическим оборудованием, комплектующими, массой, совместимостью, характеристиками камер, аккумуляторов, солнечных панелей, двигателей, систем связи и других компонентов космических аппаратов. Если вопрос не относится к этим темам, отвечай: "Я могу консультировать только по космическим комплектующим и оборудованию."`;

  const inputMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  try {
    const resp = await fetch("https://api.gen-api.ru/api/v1/networks/grok-4-3", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GENAPI_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        is_sync: true,                     // синхронный ответ
        model: "grok-4.3",
        messages: inputMessages,
        max_tokens: 500,
        temperature: 0.3
      })
    });
    const data = await resp.json();
    console.error('GenAPI response:', JSON.stringify(data));

    // В ответе нативного API может быть поле output или choices
    const answer = data.output?.choices?.[0]?.message?.content
                || data.choices?.[0]?.message?.content
                || data.output?.content
                || "Ошибка получения ответа от AI.";
    res.json({ answer });
  } catch (e) {
    console.error('GenAPI error:', e);
    res.status(500).json({ answer: "Ошибка соединения с AI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
