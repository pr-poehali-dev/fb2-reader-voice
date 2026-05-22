import { useRef, useEffect } from 'react';
import { FB2Chapter } from '@/lib/fb2parser';
import Icon from '@/components/ui/icon';
import { Bookmark } from '@/lib/storage';

interface ChapterNavProps {
  chapters: FB2Chapter[];
  currentChapter: number;
  bookmarks: Bookmark[];
  onSelectChapter: (idx: number) => void;
  onSelectBookmark: (chapterIdx: number, paragraphIdx: number) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}

export default function ChapterNav({
  chapters,
  currentChapter,
  bookmarks,
  onSelectChapter,
  onSelectBookmark,
  onDeleteBookmark,
  onClose,
}: ChapterNavProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentChapter]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="font-medium text-sm text-foreground">Навигация</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
        >
          <Icon name="X" size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Chapters */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest px-2 mb-2">Главы</p>
          <div className="space-y-0.5">
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                ref={idx === currentChapter ? activeRef : null}
                onClick={() => { onSelectChapter(idx); onClose(); }}
                className={`
                  w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                  ${idx === currentChapter
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-50 w-6 flex-shrink-0">{idx + 1}</span>
                  <span className="line-clamp-2 leading-snug">{ch.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest px-2 mb-2">Закладки</p>
            <div className="space-y-0.5">
              {bookmarks.map(bm => (
                <div key={bm.id} className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary transition-all duration-200">
                  <button
                    onClick={() => { onSelectBookmark(bm.chapterIdx, bm.paragraphIdx); onClose(); }}
                    className="flex-1 text-left"
                  >
                    <p className="text-xs text-violet-400 mb-0.5">{bm.chapterTitle}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">{bm.text}</p>
                  </button>
                  <button
                    onClick={() => onDeleteBookmark(bm.id)}
                    className="opacity-0 group-hover:opacity-100 mt-0.5 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <Icon name="Trash2" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
