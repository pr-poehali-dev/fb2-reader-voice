import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';

const SPEECHKIT_URL = 'https://functions.poehali.dev/8ae4c3c1-2ea4-4502-958f-5ea19e5ace2c';
const MAX_CHUNK = 1000;

interface YaVoice {
  id: string;
  name: string;
  lang: string;
}

interface AudioPlayerProps {
  text: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  fontSize: number;
  onFontSizeChange: (s: number) => void;
  canPrev: boolean;
  canNext: boolean;
}

function splitTextToChunks(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default function AudioPlayer({
  text,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  speed,
  onSpeedChange,
  fontSize,
  onFontSizeChange,
  canPrev,
  canNext,
}: AudioPlayerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<YaVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('alena');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIdxRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Load voices once
  useEffect(() => {
    fetch(SPEECHKIT_URL)
      .then(r => r.json())
      .then(d => { if (d.voices?.length) setVoices(d.voices); })
      .catch(() => {});
  }, []);

  const stopAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    chunkIdxRef.current = 0;
    setLoading(false);
  }, []);

  const playChunk = useCallback(async (chunkIdx: number) => {
    const chunks = chunksRef.current;
    if (chunkIdx >= chunks.length) {
      setLoading(false);
      onNext();
      return;
    }
    if (!isPlayingRef.current) return;

    setLoading(true);
    setError('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch(SPEECHKIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunks[chunkIdx], voice: selectedVoice, speed }),
        signal: ctrl.signal,
      });

      const data = await resp.json();
      if (!data.audio) throw new Error(data.error || 'Нет аудио');

      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (!isPlayingRef.current) { URL.revokeObjectURL(url); return; }

      const audio = new Audio(url);
      audioRef.current = audio;
      setLoading(false);

      audio.playbackRate = 1;
      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(url);
        chunkIdxRef.current = chunkIdx + 1;
        if (isPlayingRef.current) playChunk(chunkIdx + 1);
      };
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return;
      setError('Ошибка синтеза. Проверь ключ Yandex.');
      setLoading(false);
    }
  }, [selectedVoice, speed, onNext]);

  // Start / stop based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      chunksRef.current = splitTextToChunks(text, MAX_CHUNK);
      chunkIdxRef.current = 0;
      stopAudio();
      setTimeout(() => playChunk(0), 50);
    } else {
      stopAudio();
    }
    return () => { stopAudio(); };
  }, [isPlaying, text]);

  // Re-synthesize if voice/speed changed while playing
  useEffect(() => {
    if (isPlaying) {
      stopAudio();
      chunksRef.current = splitTextToChunks(text, MAX_CHUNK);
      chunkIdxRef.current = 0;
      setTimeout(() => playChunk(0), 50);
    }
  }, [selectedVoice, speed]);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div className="relative">
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-full left-0 right-0 mb-3 bg-card border border-border rounded-2xl p-5 animate-slide-up box-glow">
          <div className="space-y-5">
            {/* Voice */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Голос (Yandex SpeechKit)</label>
              <select
                value={selectedVoice}
                onChange={e => setSelectedVoice(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {voices.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Speed */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Скорость</label>
                <span className="text-xs text-violet-400 font-medium">{speed}×</span>
              </div>
              <div className="flex gap-1.5">
                {speeds.map(s => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      speed === s
                        ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase tracking-widest">Размер шрифта</label>
                <span className="text-xs text-violet-400 font-medium">{fontSize}px</span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => onFontSizeChange(v)}
                min={14}
                max={28}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute bottom-full left-0 right-0 mb-2 flex items-center gap-2 text-red-400 text-xs">
          <Icon name="AlertCircle" size={12} />
          {error}
        </div>
      )}

      {/* Player bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="SkipBack" size={18} />
        </button>

        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-2xl bg-violet-500 hover:bg-violet-400 flex items-center justify-center transition-all duration-200 active:scale-95 box-glow-strong shadow-lg"
        >
          {loading
            ? <Icon name="Loader2" size={22} className="text-white animate-spin" />
            : <Icon name={isPlaying ? 'Pause' : 'Play'} size={24} className="text-white" />
          }
        </button>

        <button
          onClick={onNext}
          disabled={!canNext}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="SkipForward" size={18} />
        </button>

        {isPlaying && !loading && (
          <div className="flex items-end gap-0.5 h-6 ml-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="wave-bar h-full" />
            ))}
          </div>
        )}

        {loading && (
          <span className="text-xs text-muted-foreground ml-1 animate-pulse">Синтез...</span>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setShowSettings(s => !s)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            showSettings ? 'bg-violet-500/20 text-violet-300' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Icon name="Settings2" size={18} />
        </button>
      </div>
    </div>
  );
}
