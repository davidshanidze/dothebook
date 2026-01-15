import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const prompt = `Ты эксперт по подбору книг для личностного роста и саморазвития.

Пользователь описал свою цель или проблему: "${query}"

Предложи 3 лучшие книги которые помогут достичь этой цели или решить эту проблему.

Для каждой книги укажи:
- title: Название книги (на русском, если есть перевод)
- author: Автор (на русском)
- reason: Почему эта книга подходит (2-3 предложения, конкретно про запрос пользователя)
- relevance: Релевантность от 80 до 100 (насколько точно подходит)

Отвечай ТОЛЬКО валидным JSON массивом, без дополнительного текста:
[
  {
    "title": "Название",
    "author": "Автор",
    "reason": "Объяснение...",
    "relevance": 95
  }
]`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Ты эксперт по подбору книг. Отвечаешь только валидным JSON без markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Clean response (remove markdown if present)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    // Parse JSON
    const recommendations = JSON.parse(cleanedResponse);

    // Validate structure
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('Invalid recommendations format');
    }

    return res.status(200).json(recommendations);

  } catch (error) {
    console.error('Error recommending books:', error);
    
    // Return fallback recommendations
    const fallbackBooks = [
      {
        title: "Атомные привычки",
        author: "Джеймс Клир",
        reason: "Универсальная книга про изменения. Подходит для достижения любой цели через формирование правильных привычек.",
        relevance: 90
      },
      {
        title: "Психология влияния",
        author: "Роберт Чалдини",
        reason: "Помогает понимать людей и эффективно взаимодействовать. Полезно для любой сферы жизни.",
        relevance: 85
      },
      {
        title: "Гибкое сознание",
        author: "Кэрол Дуэк",
        reason: "Развивает установку на рост. Учит воспринимать трудности как возможности для развития.",
        relevance: 83
      }
    ];

    return res.status(200).json(fallbackBooks);
  }
}
