// Vercel Function для анализа книги и генерации контекста
// Генерирует: описание книги, популярные запросы, примеры людей

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем данные от клиента
    const { bookTitle } = req.body;

    // Валидация
    if (!bookTitle) {
      return res.status(400).json({ error: 'bookTitle обязателен' });
    }

    // API ключ из переменных окружения
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY не найден в переменных окружения');
      return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }

    // Формируем промпт для анализа книги
    const prompt = `Ты эксперт по книгам саморазвития и бизнес-литературы. Твоя задача - помочь людям превратить книгу в действия.

КНИГА: "${bookTitle}"

Создай JSON с тремя полями:

1. "description": краткое описание книги в одном предложении (начни с "Эта книга про...")
2. "popularQueries": массив из 4 популярных запросов/проблем, которые решает эта книга
3. "examples": массив из 2 примеров реальных людей (желательно известных), которые применили принципы из книги

ФОРМАТ (СТРОГО JSON БЕЗ MARKDOWN):

{
  "description": "Эта книга про [главная тема книги в 5-10 словах]",
  "popularQueries": [
    "Хочу [конкретная цель связанная с книгой]",
    "Бросить/начать [конкретная привычка]",
    "[Проблема которую решает книга]",
    "[Ещё одна типичная проблема читателей]"
  ],
  "examples": [
    {
      "name": "[Имя человека (автор/известная личность)]",
      "quote": "[Короткая цитата о применении принципов из книги, 10-15 слов]"
    },
    {
      "name": "[Имя другого человека]",
      "quote": "[Короткая цитата о применении, 10-15 слов]"
    }
  ]
}

ТРЕБОВАНИЯ:
- Популярные запросы должны быть конкретными и персональными (как будто человек сам пишет)
- Примеры должны быть реальными людьми (авторы, предприниматели, спортсмены и т.д.)
- Цитаты должны быть короткими и мотивирующими
- Ответ ТОЛЬКО JSON, без пояснений, без markdown
- Пиши на русском языке

Если не знаешь эту книгу - создай правдоподобный контент на основе названия.`;

    // Запрос к Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Ошибка при обращении к Groq API' 
      });
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;

    // Парсим JSON из ответа (убираем возможные markdown обёртки)
    let bookInfo;
    try {
      // Убираем возможные ```json и ``` обёртки
      const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      bookInfo = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', rawContent);
      
      // Fallback на моковые данные если парсинг не удался
      bookInfo = {
        description: 'Эта книга про личностное развитие и изменение жизни',
        popularQueries: [
          'Хочу изменить свою жизнь',
          'Стать более продуктивным',
          'Достичь своих целей',
          'Найти мотивацию'
        ],
        examples: [
          {
            name: 'Автор книги',
            quote: 'Применял эти принципы многие годы'
          },
          {
            name: 'Известный предприниматель',
            quote: 'Эта книга изменила мой подход к работе'
          }
        ]
      };
    }

    // Возвращаем результат клиенту
    return res.status(200).json(bookInfo);

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
}
