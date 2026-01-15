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

    console.log('📥 Received query:', query);

    if (!query) {
      console.error('❌ No query provided');
      return res.status(400).json({ error: 'Query is required' });
    }

    const prompt = `Ты эксперт по подбору книг для личностного роста и саморазвития.

Пользователь описал: "${query}"

КРИТИЧЕСКИ ВАЖНО: 
1. НЕ ПРЕДЛАГАЙ "Атомные привычки", "Психология влияния" или "Гибкое сознание" если запрос НЕ про привычки/влияние/мышление
2. Подбери СПЕЦИАЛИЗИРОВАННЫЕ книги именно под "${query}"
3. Каждая книга должна быть МАКСИМАЛЬНО релевантна запросу

ПРИМЕРЫ ПРАВИЛЬНОГО ПОДБОРА:

Запрос: "научиться играть в футбол"
✅ ПРАВИЛЬНО: "Футбол. Теория и практика", "Тренировки футболиста", "Анатомия футбола"
❌ НЕПРАВИЛЬНО: "Атомные привычки", "Психология влияния"

Запрос: "перестать зависеть от чужого мнения"
✅ ПРАВИЛЬНО: "Тонкое искусство пофигизма", "Быть собой", "Смелость быть несовершенным"
❌ НЕПРАВИЛЬНО: "Атомные привычки", "Гибкое сознание"

Запрос: "научиться готовить"
✅ ПРАВИЛЬНО: "Кулинарная школа", "Основы кулинарии", "Профессиональная кухня"
❌ НЕПРАВИЛЬНО: "Атомные привычки"

Запрос: "улучшить отношения с партнером"
✅ ПРАВИЛЬНО: "Пять языков любви", "Искусство любить", "Почему мужчины врут"
❌ НЕПРАВИЛЬНО: "Психология влияния", "Гибкое сознание"

Теперь для запроса "${query}" предложи 3 СПЕЦИАЛИЗИРОВАННЫЕ книги.

Для каждой книги укажи:
- title: Название на русском (найди реальные книги по этой теме)
- author: Автор на русском
- reason: Объяснение почему КОНКРЕТНО эта книга подходит для "${query}" (будь специфичным)
- relevance: 85-95

Отвечай ТОЛЬКО валидным JSON без markdown:
[
  {
    "title": "Специализированная книга",
    "author": "Автор",
    "reason": "Конкретное объяснение...",
    "relevance": 90
  }
]`;

    console.log('🤖 Calling Groq API...');

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
    console.log('🤖 AI raw response:', responseText);
    
    // Clean response (remove markdown if present)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    console.log('🧹 Cleaned response:', cleanedResponse);

    // Parse JSON
    const recommendations = JSON.parse(cleanedResponse);

    console.log('✅ Parsed recommendations:', recommendations);

    // Validate structure
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.error('❌ Invalid recommendations format');
      throw new Error('Invalid recommendations format');
    }

    console.log('✅ Returning', recommendations.length, 'recommendations');
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
