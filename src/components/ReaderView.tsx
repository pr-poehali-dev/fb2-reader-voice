import { useState, useEffect, useRef, useCallback } from 'react';
import { FB2Book } from '@/lib/fb2parser';
import { Bookmark, saveProgress, loadProgress, loadBookmarks, saveBookmark, deleteBookmark } from '@/lib/storage';
import AudioPlayer from './AudioPlayer';
import ChapterNav from './ChapterNav';
import Icon from '@/components/ui/icon';

interface ReaderViewProps {
  book: FB2Book;
  onUnload: () => void;
}

export default function ReaderView({ book, onUnload }: ReaderViewProps) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [paragraphIdx, setParagraphIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(18);
  const [showNav, setShowNav] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkAdded, setBookmarkAdded] = useState(false);
  const [restored, setRestored] = useState(false);

  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const chapter = book.chapters[chapterIdx];
  const paragraphs = chapter?.paragraphs || [];

  // Restore progress on mount
  useEffect(() => {
    const progress = loadProgress();
    if (progress?.bookTitle === book.title) {
      setChapterIdx(progress.chapterIdx);
      setParagraphIdx(progress.paragraphIdx || 0);
      if (progress.wasPlaying) {
        // Small delay so component fully mounts before autoplay
        setTimeout(() => setIsPlaying(true), 300);
      }
    }
    setBookmarks(loadBookmarks());
    setRestored(true);
  }, [book.title]);

  // Save progress whenever chapter/paragraph changes (after restore)
  useEffect(() => {
    if (!restored) return;
    saveProgress({
      bookTitle: book.title,
      chapterIdx,
      paragraphIdx,
      wasPlaying: isPlaying,
      savedAt: Date.now(),
    });
  }, [chapterIdx, paragraphIdx, isPlaying, book.title, restored]);

  // Auto-scroll to active paragraph
  useEffect(() => {
    const el = paraRefs.current[paragraphIdx];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [paragraphIdx]);

  const handleNext = useCallback(() => {
    if (chapterIdx < book.chapters.length - 1) {
      setChapterIdx(i => i + 1);
      setParagraphIdx(0);
    } else {
      setIsPlaying(false);
    }
  }, [chapterIdx, book.chapters.length]);

  const handlePrev = useCallback(() => {
    if (chapterIdx > 0) {
      setChapterIdx(i => i - 1);
      setParagraphIdx(0);
    }
  }, [chapterIdx]);

  const handleSelectChapter = (idx: number) => {
    setChapterIdx(idx);
    setParagraphIdx(0);
    setIsPlaying(false);
  };

  const handleSelectBookmark = (ci: number, pi: number) => {
    setChapterIdx(ci);
    setParagraphIdx(pi);
    setIsPlaying(false);
  };

  const handleAddBookmark = () => {
    const para = paragraphs[paragraphIdx] || paragraphs[0] || '';
    const bm: Bookmark = {
      id: `${Date.now()}`,
      chapterIdx,
      paragraphIdx,
      chapterTitle: chapter?.title || '',
      text: para.slice(0, 120) + (para.length > 120 ? '…' : ''),
      createdAt: Date.now(),
    };
    saveBookmark(bm);
    setBookmarks(loadBookmarks());
    setBookmarkAdded(true);
    setTimeout(() => setBookmarkAdded(false), 2000);
  };

  const handleDeleteBookmark = (id: string) => {
    deleteBookmark(id);
    setBookmarks(loadBookmarks());
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-64 rounded-full bg-violet-500/5 blur-[100px]" />
        <div className="absolute bottom-32 right-1/4 w-64 h-64 rounded-full bg-electric/3 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 surface-glass border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setShowNav(s => !s)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
              showNav ? 'bg-violet-500/20 text-violet-300' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Icon name="List" size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-cormorant text-base font-medium text-foreground leading-tight truncate">{book.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {chapter?.title} · Глава {chapterIdx + 1} из {book.chapters.length}
            </p>
          </div>

          <button
            onClick={handleAddBookmark}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
              bookmarkAdded ? 'bg-violet-500/30 text-violet-300' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
            title="Добавить закладку"
          >
            <Icon name={bookmarkAdded ? 'BookmarkCheck' : 'Bookmark'} size={18} />
          </button>

          <button
            onClick={onUnload}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
            title="Сменить книгу"
          >
            <Icon name="FolderOpen" size={17} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-[57px] bottom-0 z-20 w-72 bg-card border-r border-border transition-all duration-300 ease-in-out ${
            showNav ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <ChapterNav
            chapters={book.chapters}
            currentChapter={chapterIdx}
            bookmarks={bookmarks}
            onSelectChapter={handleSelectChapter}
            onSelectBookmark={handleSelectBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onClose={() => setShowNav(false)}
          />
        </aside>

        {showNav && (
          <div
            className="fixed inset-0 z-10 bg-black/40 backdrop-blur-sm top-[57px]"
            onClick={() => setShowNav(false)}
          />
        )}

        <main className="flex-1 flex flex-col">
          <div className="flex-1 max-w-3xl mx-auto w-full px-6 pt-10 pb-44 font-cormorant animate-fade-in">
            <h2 className="font-cormorant text-3xl font-light text-foreground mb-8 text-glow">
              {chapter?.title}
            </h2>

            {paragraphs.map((para, pIdx) => (
              <p
                key={pIdx}
                ref={el => { paraRefs.current[pIdx] = el; }}
                className={`mb-6 leading-relaxed transition-all duration-300 ${
                  isPlaying && pIdx === paragraphIdx
                    ? 'text-foreground'
                    : isPlaying
                    ? 'text-muted-foreground/70'
                    : 'text-[hsl(var(--text-body))]'
                }`}
                style={{ fontSize }}
              >
                {isPlaying && pIdx === paragraphIdx && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mr-2 mb-0.5 animate-pulse" />
                )}
                {para}
              </p>
            ))}

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border">
              <button
                onClick={handlePrev}
                disabled={chapterIdx === 0}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="ChevronLeft" size={16} />
                Предыдущая
              </button>
              <span className="text-xs text-muted-foreground">{chapterIdx + 1} / {book.chapters.length}</span>
              <button
                onClick={handleNext}
                disabled={chapterIdx === book.chapters.length - 1}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Следующая
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Player */}
      <div className="fixed bottom-0 left-0 right-0 z-30 surface-glass border-t border-border px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <AudioPlayer
            paragraphs={paragraphs}
            startParagraphIdx={paragraphIdx}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(p => !p)}
            onNext={handleNext}
            onPrev={handlePrev}
            onParagraphChange={setParagraphIdx}
            speed={speed}
            onSpeedChange={setSpeed}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            canPrev={chapterIdx > 0}
            canNext={chapterIdx < book.chapters.length - 1}
          />
        </div>
      </div>
    </div>
  );
}
