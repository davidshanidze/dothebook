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
    const { query, language = 'en' } = req.body;

    console.log('📥 Received query:', query);
    console.log('🌍 Language:', language);

    if (!query) {
      console.error('❌ No query provided');
      return res.status(400).json({ error: 'Query is required' });
    }

    const isRussian = language === 'ru';
    
    const systemMessage = isRussian
      ? "Ты эксперт по подбору книг. Отвечаешь только валидным JSON без markdown. Все названия книг и авторов на РУССКОМ языке."
      : "You are a book recommendation expert. Respond only with valid JSON without markdown. All book titles and authors in ENGLISH.";

    const prompt = isRussian ? `Ты эксперт по подбору книг для личностного роста и саморазвития.

Пользователь описал свою цель: "${query}"

Подбери 3 книги которые МАКСИМАЛЬНО точно помогут достичь этой конкретной цели. 

Важно:
- Приоритет СПЕЦИАЛИЗИРОВАННЫМ книгам по теме
- Универсальные книги предлагай только если они действительно лучший выбор
- Каждая книга должна напрямую относиться к "${query}"
- ВСЕ названия книг и имена авторов на РУССКОМ языке

Примеры хорошего подбора:
- "научиться играть в футбол" → книги про футбол и спортивные тренировки
- "перестать зависеть от чужого мнения" → книги про уверенность и независимость
- "научиться готовить" → кулинарные книги и гиды по кухне

Для запроса "${query}" предложи 3 книги в формате JSON:

[
  {
    "title": "Название на русском",
    "author": "Автор на русском",
    "reason": "Объяснение почему эта книга подходит (2-3 предложения)",
    "relevance": 85-95
  }
]

Отвечай ТОЛЬКО валидным JSON без markdown.` : `You are an expert in personal development and self-improvement books.

User's goal: "${query}"

Recommend 3 books that will MAXIMALLY help achieve this specific goal.

Important:
- Prioritize SPECIALIZED books on the topic
- Suggest universal books only if they're truly the best choice
- Each book must directly relate to "${query}"
- ALL book titles and author names in ENGLISH

Examples of good recommendations:
- "learn to play football" → books about football and sports training
- "stop caring about others' opinions" → books about confidence and independence
- "learn to cook" → culinary books and kitchen guides

For the query "${query}", suggest 3 books in JSON format:

[
  {
    "title": "Title in English",
    "author": "Author in English",
    "reason": "Explanation why this book fits (2-3 sentences)",
    "relevance": 85-95
  }
]

Respond ONLY with valid JSON without markdown.`;

    console.log('🤖 Calling Groq API...');

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemMessage
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
