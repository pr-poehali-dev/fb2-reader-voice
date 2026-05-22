export interface Bookmark {
  id: string;
  chapterIdx: number;
  paragraphIdx: number;
  chapterTitle: string;
  text: string;
  createdAt: number;
}

export interface ReadingProgress {
  bookTitle: string;
  chapterIdx: number;
  paragraphIdx: number;
  savedAt: number;
}

const PROGRESS_KEY = 'fb2reader_progress';
const BOOKMARKS_KEY = 'fb2reader_bookmarks';

export function saveProgress(progress: ReadingProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function loadProgress(): ReadingProgress | null {
  const raw = localStorage.getItem(PROGRESS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function loadBookmarks(): Bookmark[] {
  const raw = localStorage.getItem(BOOKMARKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveBookmark(bookmark: Bookmark): void {
  const bookmarks = loadBookmarks();
  bookmarks.unshift(bookmark);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function deleteBookmark(id: string): void {
  const bookmarks = loadBookmarks().filter(b => b.id !== id);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}
