const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const SUPABASE_URL = "https://joxydnlbtlrhvvecoovr.supabase.co";
const GENAPI_KEY = "sk-8G88dciyi99U7SHLfjEgwH7Ep0m6gjvAGJDjGDgCJtEhY9yGa4unBw2jwc4o";

const app = express();

// Единый CORS для всех запросов
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Headers", req.headers['access-control-request-headers'] || "*");
    return res.sendStatus(200);
  }
  next();
});

// Прокси Supabase (без парсинга тела)
app.use('/supabase', createProxyMiddleware({
  target: SUPABASE_URL,
  changeOrigin: true,
  pathRewrite: { '^/supabase': '' },
}));

// AI-консультант (парсинг JSON только здесь)
app.post('/genapi-query', express.json(), async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ answer: 'Неверный формат сообщений.' });

  const systemMessage = { 
    role: "system", 
    content: `Ты — эксперт по космическим аппаратам и комплектующим для малых спутников, а также консультант по подбору ракет-носителей на платформе RocketSearch. 

Твои задачи:
1. Отвечать на вопросы о космическом оборудовании (камеры, аккумуляторы, солнечные панели, двигатели, системы связи и т.д.) — их характеристиках, массе, совместимости.
2. Помогать с подбором ракет-носителей для запуска спутников, включая:
   - Анализ требований пользователя (масса и размеры спутника, целевая орбита, бюджет)
   - Сравнение ракет из базы данных (глобальной и от провайдеров), которая передаётся в контексте сообщений
   - Рекомендации конкретных ракет с обоснованием выбора (цена за кг, доступные даты, космодромы, максимальная грузоподъёмность)
   - Предупреждения о возможных ограничениях

Ты НЕ должен отказываться отвечать на вопросы о ракетах-носителях и запусках, если у тебя есть данные о них в контексте сообщений.

При ответе на вопросы о ракетах обязательно:
- Указывай конкретные названия ракет из базы
- Приводи цены в рублях за кг
- Отмечай доступные даты запусков
- Сравнивай 2-3 подходящих варианта
- Если данных недостаточно, говори об этом и предлагай уточнить запрос`
  };

  const payload = {
    model: "text-embedding-3-small",
    messages: [systemMessage, ...messages],
    max_tokens: 1500,
    temperature: 0.3,
  };

  try {
    const response = await fetch("https://proxy.gen-api.ru/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GENAPI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return res.json({ answer: data.choices[0].message.content });
    }
    return res.json({ answer: `❌ Нет ответа от модели. Ответ GenAPI: ${JSON.stringify(data)}` });
  } catch (e) {
    console.error('Fetch error:', e);
    return res.status(500).json({ answer: "Ошибка соединения с GenAPI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
