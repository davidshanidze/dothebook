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

Пользователь описал: "${query}"

ВАЖНО: Подбери книги КОНКРЕТНО под этот запрос. Не используй универсальные книги если есть более специализированные варианты.

Например:
- Если запрос про деньги/финансы → книги про финансовую грамотность, инвестиции
- Если про отношения → книги про психологию отношений, общение
- Если про здоровье → книги про здоровье, питание, сон
- Если про карьеру → книги про карьерный рост, лидерство
- Если про прокрастинацию → книги про продуктивность, привычки
- Если про уверенность → книги про самооценку, харизму

Предложи 3 РАЗНЫЕ книги которые МАКСИМАЛЬНО точно подходят под запрос "${query}".

Для каждой книги укажи:
- title: Название книги на русском (если есть перевод)
- author: Автор на русском
- reason: Почему ЭТА КОНКРЕТНАЯ книга подходит именно для "${query}" (2-3 предложения, будь специфичным)
- relevance: Релевантность от 80 до 100

Отвечай ТОЛЬКО валидным JSON массивом без markdown:
[
  {
    "title": "Название",
    "author": "Автор",
    "reason": "Конкретное объяснение почему подходит для '${query}'...",
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
        reason: "Универсальный подход к изменениям через формирование микропривычек. Подходит для начала работы над любой целью.",
        relevance: 85
      },
      {
        title: "Думай медленно... Решай быстро",
        author: "Даниэль Канеман",
        reason: "Помогает понять как мы принимаем решения и избегать когнитивных ошибок в достижении целей.",
        relevance: 82
      },
      {
        title: "Поток",
        author: "Михай Чиксентмихайи",
        reason: "Учит находить состояние максимальной продуктивности и удовольствия в любой деятельности.",
        relevance: 80
      }
    ];

    return res.status(200).json(fallbackBooks);
  }
}
