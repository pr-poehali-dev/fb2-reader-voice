import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';

const SPEECHKIT_URL = 'https://functions.poehali.dev/8ae4c3c1-2ea4-4502-958f-5ea19e5ace2c';

interface YaVoice {
  id: string;
  name: string;
  lang: string;
}

interface AudioPlayerProps {
  paragraphs: string[];
  startParagraphIdx?: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onParagraphChange: (idx: number) => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  fontSize: number;
  onFontSizeChange: (s: number) => void;
}

export default function AudioPlayer({
  paragraphs,
  startParagraphIdx = 0,
  isPlaying,
  onPlayPause,
  onNext,
  onParagraphChange,
  speed,
  onSpeedChange,
  fontSize,
  onFontSizeChange,
}: AudioPlayerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<YaVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('alena');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const paraIdxRef = useRef(startParagraphIdx);
  const abortRef = useRef<AbortController | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const paragraphsRef = useRef(paragraphs);
  paragraphsRef.current = paragraphs;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const voiceRef = useRef(selectedVoice);
  voiceRef.current = selectedVoice;

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
    setLoading(false);
  }, []);

  const playFrom = useCallback(async (pIdx: number) => {
    const paras = paragraphsRef.current;
    if (pIdx >= paras.length) {
      setLoading(false);
      onNext();
      return;
    }
    if (!isPlayingRef.current) return;

    paraIdxRef.current = pIdx;
    onParagraphChange(pIdx);
    setLoading(true);
    setError('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const text = paras[pIdx].trim();
    if (!text) {
      setLoading(false);
      if (isPlayingRef.current) playFrom(pIdx + 1);
      return;
    }

    try {
      const resp = await fetch(SPEECHKIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 4500),
          voice: voiceRef.current,
          speed: speedRef.current,
        }),
        signal: ctrl.signal,
      });

      const data = await resp.json();
      if (!data.audio) throw new Error(data.error || 'Нет аудио');

      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (!isPlayingRef.current) { URL.revokeObjectURL(url); setLoading(false); return; }

      const audio = new Audio(url);
      audioRef.current = audio;
      setLoading(false);

      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (isPlayingRef.current) playFrom(pIdx + 1);
      };
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return;
      setError('Ошибка синтеза. Проверь ключ Yandex.');
      setLoading(false);
    }
  }, [onNext, onParagraphChange]);

  // Start / stop on isPlaying toggle
  useEffect(() => {
    if (isPlaying) {
      stopAudio();
      const startIdx = paraIdxRef.current;
      setTimeout(() => playFrom(startIdx), 50);
    } else {
      stopAudio();
    }
    return () => { stopAudio(); };
  }, [isPlaying]);

  // New chapter — reset paragraph index
  useEffect(() => {
    paraIdxRef.current = 0;
    if (isPlaying) {
      stopAudio();
      setTimeout(() => playFrom(0), 50);
    }
  }, [paragraphs]);

  // External paragraph jump (e.g. click on paragraph in reader)
  useEffect(() => {
    if (paraIdxRef.current === startParagraphIdx) return;
    paraIdxRef.current = startParagraphIdx;
    stopAudio();
    setTimeout(() => playFrom(startParagraphIdx), 50);
  }, [startParagraphIdx]);

  // Re-synthesize if voice/speed changed while playing
  useEffect(() => {
    if (isPlaying) {
      stopAudio();
      setTimeout(() => playFrom(paraIdxRef.current), 50);
    }
  }, [selectedVoice, speed]);

  const jumpParagraph = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(paragraphs.length - 1, paraIdxRef.current + delta));
    stopAudio();
    paraIdxRef.current = next;
    onParagraphChange(next);
    if (isPlayingRef.current) setTimeout(() => playFrom(next), 50);
  }, [paragraphs.length, stopAudio, playFrom, onParagraphChange]);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div className="relative">
      {showSettings && (
        <div className="absolute bottom-full left-0 right-0 mb-3 bg-card border border-border rounded-2xl p-5 animate-slide-up box-glow">
          <div className="space-y-5">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">
                Голос (Yandex SpeechKit)
              </label>
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

      {error && (
        <div className="absolute bottom-full left-0 right-0 mb-2 flex items-center gap-2 text-red-400 text-xs">
          <Icon name="AlertCircle" size={12} />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => jumpParagraph(-1)}
          disabled={paraIdxRef.current === 0}
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
          onClick={() => jumpParagraph(1)}
          disabled={paraIdxRef.current >= paragraphs.length - 1}
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