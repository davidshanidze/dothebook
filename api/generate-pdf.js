// Vercel Function для генерации PDF с поддержкой кириллицы
// Использует PDFKit

import PDFDocument from 'pdfkit';

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
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Настраиваем headers для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(bookTitle)} - План действий.pdf"`);

    // Направляем PDF в response
    doc.pipe(res);

    // Парсим контент
    const lines = content.split('\n');
    let firstLine = true;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        doc.moveDown(0.5);
        return;
      }

      // Заголовок (первая строка)
      if (index === 0) {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text(trimmed, { align: 'left' });
        doc.moveDown(1);
        return;
      }

      // Разделители - пропускаем
      if (trimmed.startsWith('━')) {
        return;
      }

      // Секции
      if (trimmed.includes('ГЛАВНЫЕ ИДЕИ') || trimmed.includes('КОНКРЕТНЫЕ ДЕЙСТВИЯ')) {
        doc.moveDown(0.5);
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#8a5cf6')
           .text(trimmed, { align: 'left' });
        doc.fillColor('#000000');
        doc.moveDown(0.5);
        return;
      }

      // Действия
      if (trimmed.startsWith('Действие')) {
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(trimmed, { align: 'left' });
        doc.moveDown(0.3);
        return;
      }

      // "Зачем"
      if (trimmed.startsWith('Зачем:')) {
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .fillColor('#666666')
           .text(trimmed, { align: 'left' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);
        return;
      }

      // Обычный текст
      doc.fontSize(10)
         .font('Helvetica')
         .text(trimmed, { align: 'left' });
      doc.moveDown(0.2);
    });

    // Завершаем документ
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Ошибка генерации PDF',
      details: error.message 
    });
  }
}
