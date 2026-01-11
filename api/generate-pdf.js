// Vercel Function для генерации PDF с поддержкой кириллицы
// Использует pdf-lib + fontkit + Roboto font

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fetch from 'node-fetch';

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
    const { content, bookTitle } = req.body;

    if (!content || !bookTitle) {
      return res.status(400).json({ error: 'content и bookTitle обязательны' });
    }

    // Создаём PDF документ
    const pdfDoc = await PDFDocument.create();
    
    // ВАЖНО: Регистрируем fontkit для поддержки кастомных шрифтов
    pdfDoc.registerFontkit(fontkit);
    
    // Загружаем шрифты Roboto в формате TTF (не WOFF2!)
    // Используем GitHub репозиторий с TTF файлами
    const fontRegularUrl = 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf';
    const fontBoldUrl = 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf';
    const fontItalicUrl = 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Italic.ttf';
    
    const [fontRegularBytes, fontBoldBytes, fontItalicBytes] = await Promise.all([
      fetch(fontRegularUrl).then(r => r.arrayBuffer()),
      fetch(fontBoldUrl).then(r => r.arrayBuffer()),
      fetch(fontItalicUrl).then(r => r.arrayBuffer())
    ]);
    
    const font = await pdfDoc.embedFont(fontRegularBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);
    const fontItalic = await pdfDoc.embedFont(fontItalicBytes);

    // Создаём первую страницу
    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Helper function to add text with word wrap
    const addText = (text, size, textFont, color = rgb(0, 0, 0)) => {
      const maxWidth = width - (margin * 2);
      
      // Simple word wrap
      const words = text.split(' ');
      let line = '';
      
      words.forEach((word, index) => {
        const testLine = line + word + ' ';
        const testWidth = textFont.widthOfTextAtSize(testLine, size);
        
        if (testWidth > maxWidth && line !== '') {
          // Check if need new page
          if (y < margin + size) {
            page = pdfDoc.addPage([595, 842]);
            y = height - margin;
          }
          
          // Draw current line
          page.drawText(line.trim(), {
            x: margin,
            y: y,
            size: size,
            font: textFont,
            color: color
          });
          
          y -= size + 4;
          line = word + ' ';
        } else {
          line = testLine;
        }
      });
      
      // Draw last line
      if (line.trim() !== '') {
        if (y < margin + size) {
          page = pdfDoc.addPage([595, 842]);
          y = height - margin;
        }
        
        page.drawText(line.trim(), {
          x: margin,
          y: y,
          size: size,
          font: textFont,
          color: color
        });
        
        y -= size + 4;
      }
      
      y -= 6; // Extra spacing between blocks
    };

    // Парсим контент
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        y -= 8;
        return;
      }

      // Заголовок (первая строка)
      if (index === 0) {
        addText(trimmed, 18, fontBold);
        y -= 10;
        return;
      }

      // Разделители - пропускаем
      if (trimmed.startsWith('━')) {
        return;
      }

      // Секции
      if (trimmed.includes('ГЛАВНЫЕ ИДЕИ') || trimmed.includes('КОНКРЕТНЫЕ ДЕЙСТВИЯ')) {
        y -= 8;
        addText(trimmed, 14, fontBold, rgb(0.54, 0.36, 0.96));
        y -= 2;
        return;
      }

      // Действия
      if (trimmed.startsWith('Действие')) {
        y -= 6;
        addText(trimmed, 12, fontBold);
        return;
      }

      // "Зачем"
      if (trimmed.startsWith('Зачем:')) {
        addText(trimmed, 10, fontItalic, rgb(0.4, 0.4, 0.4));
        return;
      }

      // Обычный текст
      addText(trimmed, 10, font);
    });

    // Сохраняем PDF
    const pdfBytes = await pdfDoc.save();

    // Отправляем PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(bookTitle)} - План действий.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Ошибка генерации PDF',
      details: error.message 
    });
  }
}
