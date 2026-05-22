export interface FB2Chapter {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface FB2Book {
  title: string;
  author: string;
  chapters: FB2Chapter[];
}

export function parseFB2(xmlText: string): FB2Book {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const titleEl = doc.querySelector('book-title');
  const authorFirst = doc.querySelector('first-name')?.textContent || '';
  const authorLast = doc.querySelector('last-name')?.textContent || '';

  const title = titleEl?.textContent || 'Без названия';
  const author = [authorFirst, authorLast].filter(Boolean).join(' ') || 'Неизвестный автор';

  const sections = doc.querySelectorAll('body > section');
  const chapters: FB2Chapter[] = [];

  sections.forEach((section, idx) => {
    const titleNode = section.querySelector(':scope > title');
    const chapterTitle = titleNode?.textContent?.trim() || `Глава ${idx + 1}`;

    const paragraphs: string[] = [];
    section.querySelectorAll('p').forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 0) paragraphs.push(text);
    });

    if (paragraphs.length > 0) {
      chapters.push({
        id: `chapter-${idx}`,
        title: chapterTitle,
        paragraphs,
      });
    }
  });

  if (chapters.length === 0) {
    const allParas: string[] = [];
    doc.querySelectorAll('body p').forEach(p => {
      const text = p.textContent?.trim();
      if (text) allParas.push(text);
    });

    const chunkSize = 20;
    for (let i = 0; i < allParas.length; i += chunkSize) {
      chapters.push({
        id: `chapter-${i}`,
        title: `Часть ${Math.floor(i / chunkSize) + 1}`,
        paragraphs: allParas.slice(i, i + chunkSize),
      });
    }
  }

  return { title, author, chapters };
}
