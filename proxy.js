const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const SUPABASE_URL = "https://joxydnlbtlrhvvecoovr.supabase.co";
const GENAPI_KEY = "sk-8G88dciyi99U7SHLfjEgwH7Ep0m6gjvAGJDjGDgCJtEhY9yGa4unBw2jwc4o";

const app = express();

// Ручной CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", req.headers['access-control-request-headers'] || "*");
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

// AI-консультант (OpenAI-совместимый эндпоинт GenAPI)
app.post('/genapi-query', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ answer: 'Неверный формат сообщений.' });
  }

  const systemMessage = {
    role: "system",
    content: "Ты — эксперт по космическим аппаратам и комплектующим для малых спутников. Отвечай **только** на вопросы, связанные с космическим оборудованием (камеры, аккумуляторы, солнечные панели, двигатели, системы связи и т.д.), их характеристиками и массой. На любые другие вопросы отвечай: 'Я могу консультировать только по космическим комплектующим и оборудованию.'"
  };

  const payload = {
    model: "grok-4.3",
    messages: [systemMessage, ...messages],
    max_tokens: 500,
    temperature: 0.3,
  };

  try {
    const response = await fetch("https://proxy.gen-api.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GENAPI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    // Выводим в логи Railway для отладки (можно убрать после проверки)
    console.error('GenAPI response:', JSON.stringify(data).substring(0, 500));

    let answer;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      answer = data.choices[0].message.content;
    } else if (data.error) {
      // Если API вернуло ошибку, показываем её
      answer = `Ошибка AI: ${data.error.message || data.error}`;
    } else {
      // На всякий случай пытаемся достать из других полей
      answer = data.output?.choices?.[0]?.message?.content
            || data.output?.content
            || (typeof data.output === 'string' ? data.output : null)
            || "Ошибка получения ответа от AI.";
    }

    res.json({ answer });
  } catch (e) {
    console.error('Fetch error:', e);
    res.status(500).json({ answer: "Ошибка соединения с GenAPI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
