// Vercel Function для генерации плана действий из книги
// Использует Groq API для AI-генерации

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
    const { bookTitle, userContext, language = 'en' } = req.body;

    // Валидация
    if (!bookTitle || !userContext) {
      return res.status(400).json({ error: 'bookTitle и userContext обязательны' });
    }

    console.log('📝 Generating plan for:', bookTitle, 'Language:', language);

    // API ключ из переменных окружения
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY не найден в переменных окружения');
      return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }

    const isRussian = language === 'ru';

    // Формируем промпт для генерации плана
    const prompt = isRussian ? `Ты эксперт по превращению книжных знаний в конкретные действия. Твоя задача - трансформировать идеи из книги в немедленные, практические шаги.

ЗАДАЧА:
- Книга: "${bookTitle}"
- Контекст пользователя: "${userContext}"

ПРОЦЕСС:
1. Определи книгу и автора
2. Извлеки 5 ГЛАВНЫХ ИДЕЙ из книги (самые важные концепции)
3. Создай 3-5 КОНКРЕТНЫХ ДЕЙСТВИЙ, персонализированных под контекст пользователя
   - Каждое действие должно быть простым, выполнимым и специфичным
   - Укажи ЗАЧЕМ это действие важно (ссылаясь на идеи из книги)
   - Сделай действия последовательными - от простого к сложному

ФОРМАТ ВЫВОДА (СТРОГО):

[Название книги] - [Автор]

━━━━━━━━━━━━━━━━━━━━━━━

ГЛАВНЫЕ ИДЕИ КНИГИ:

1. [Первая ключевая идея из книги - 1-2 предложения]

2. [Вторая ключевая идея из книги - 1-2 предложения]

3. [Третья ключевая идея из книги - 1-2 предложения]

4. [Четвертая ключевая идея из книги - 1-2 предложения]

5. [Пятая ключевая идея из книги - 1-2 предложения]

━━━━━━━━━━━━━━━━━━━━━━━

КОНКРЕТНЫЕ ДЕЙСТВИЯ:

Действие 1:
[Конкретное, специфичное действие]
Зачем: [Объяснение со ссылкой на идеи книги]

Действие 2:
[Конкретное, специфичное действие]
Зачем: [Объяснение со ссылкой на идеи книги]

Действие 3:
[Конкретное, специфичное действие]
Зачем: [Объяснение со ссылкой на идеи книги]

Действие 4:
[Конкретное, специфичное действие]
Зачем: [Объяснение со ссылкой на идеи книги]

Действие 5:
[Конкретное, специфичное действие]
Зачем: [Объяснение со ссылкой на идеи книги]

ПРАВИЛА:
- Будь МАКСИМАЛЬНО КОНКРЕТНЫМ в действиях (не "займись спортом", а "завтра в 7 утра сделай 10 отжиманий")
- Каждое действие должно быть выполнимо за 5-30 минут
- Действия должны быть персонализированы под контекст: "${userContext}"
- Расставь действия по сложности: от самого простого к более сложному
- Используй простой, понятный язык
- Пиши на русском языке
- СТРОГО следуй формату выше
- Общий ответ должен быть 300-500 слов` : `You are an expert at turning book knowledge into concrete actions. Your task is to transform book ideas into immediate, practical steps.

TASK:
- Book: "${bookTitle}"
- User context: "${userContext}"

PROCESS:
1. Identify the book and author
2. Extract 5 KEY IDEAS from the book (most important concepts)
3. Create 3-5 SPECIFIC ACTIONS, personalized to user's context
   - Each action must be simple, achievable, and specific
   - Explain WHY this action matters (referencing book ideas)
   - Make actions sequential - from simple to complex

OUTPUT FORMAT (STRICT):

[Book Title] - [Author]

━━━━━━━━━━━━━━━━━━━━━━━

KEY IDEAS FROM THE BOOK:

1. [First key idea from the book - 1-2 sentences]

2. [Second key idea from the book - 1-2 sentences]

3. [Third key idea from the book - 1-2 sentences]

4. [Fourth key idea from the book - 1-2 sentences]

5. [Fifth key idea from the book - 1-2 sentences]

━━━━━━━━━━━━━━━━━━━━━━━

CONCRETE ACTIONS:

Action 1:
[Specific, concrete action]
Why: [Explanation referencing book ideas]

Action 2:
[Specific, concrete action]
Why: [Explanation referencing book ideas]

Action 3:
[Specific, concrete action]
Why: [Explanation referencing book ideas]

Action 4:
[Specific, concrete action]
Why: [Explanation referencing book ideas]

Action 5:
[Specific, concrete action]
Why: [Explanation referencing book ideas]

RULES:
- Be MAXIMALLY SPECIFIC in actions (not "exercise more", but "tomorrow at 7am do 10 pushups")
- Each action should take 5-30 minutes to complete
- Actions must be personalized to context: "${userContext}"
- Order actions by difficulty: from simplest to more complex
- Use simple, clear language
- Write in English
- STRICTLY follow the format above
- Total response should be 300-500 words`;

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
        max_tokens: 2000,
        top_p: 0.9
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
    const plan = data.choices[0].message.content;

    console.log('✅ Plan generated successfully');

    // Возвращаем результат клиенту
    return res.status(200).json({ plan });

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
}
