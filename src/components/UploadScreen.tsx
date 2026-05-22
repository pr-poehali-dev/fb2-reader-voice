import { useState, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';

interface UploadScreenProps {
  onLoad: (xmlText: string) => void;
}

export default function UploadScreen({ onLoad }: UploadScreenProps) {
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file.name.endsWith('.fb2')) {
      setError('Поддерживаются только файлы .fb2');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onLoad(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }, []);

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url);
      const text = await res.text();
      onLoad(text);
    } catch {
      setError('Не удалось загрузить файл по URL. Проверьте ссылку.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 animate-fade-in">
      {/* Background mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-electric/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-12 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center box-glow">
              <Icon name="BookOpen" size={20} className="text-violet-400" />
            </div>
            <span className="font-cormorant text-3xl font-light tracking-widest text-foreground">
              Аудиоридер
            </span>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide">
            Загрузи книгу в формате FB2 и слушай с подсветкой текста
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300 animate-slide-up
            ${dragging
              ? 'border-violet-400 bg-violet-500/10 box-glow-strong scale-[1.02]'
              : 'border-border hover:border-violet-500/50 hover:bg-violet-500/5 bg-card'
            }
          `}
          style={{ animationDelay: '0.1s' }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${dragging ? 'bg-violet-500/30 scale-110' : 'bg-secondary'}`}>
              <Icon name="Upload" size={28} className={dragging ? 'text-violet-300' : 'text-muted-foreground'} />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                {loading ? 'Загружаем книгу...' : 'Перетащи .fb2 файл сюда'}
              </p>
              <p className="text-sm text-muted-foreground">или нажми для выбора файла</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".fb2"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {/* URL input */}
        <div className="mt-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Icon name="Link" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                placeholder="Или вставь URL файла FB2..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrl()}
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <button
              onClick={handleUrl}
              className="px-5 py-3 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 hover:border-violet-500/50 transition-all duration-200 active:scale-95"
            >
              Загрузить
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm animate-fade-in">
            <Icon name="AlertCircle" size={14} />
            {error}
          </div>
        )}

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Книга обрабатывается локально — данные не уходят на сервер
        </p>
      </div>
    </div>
  );
}
