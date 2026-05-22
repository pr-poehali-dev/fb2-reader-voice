import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  text: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onWordIndex: (idx: number) => void;
  onPrev: () => void;
  onNext: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  fontSize: number;
  onFontSizeChange: (s: number) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceChange: (name: string) => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function AudioPlayer({
  text,
  isPlaying,
  onPlayPause,
  onWordIndex,
  onPrev,
  onNext,
  speed,
  onSpeedChange,
  fontSize,
  onFontSizeChange,
  voices,
  selectedVoice,
  onVoiceChange,
  canPrev,
  canNext,
}: AudioPlayerProps) {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const wordsRef = useRef<string[]>([]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(() => {
    stop();
    const words = text.split(/\s+/).filter(Boolean);
    wordsRef.current = words;

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speed;
    utter.lang = 'ru-RU';

    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utter.voice = voice;

    utter.onboundary = (e) => {
      if (e.name === 'word') {
        const charIdx = e.charIndex;
        const textBefore = text.slice(0, charIdx);
        const wordIdx = textBefore.split(/\s+/).filter(Boolean).length;
        onWordIndex(wordIdx);
      }
    };

    utter.onend = () => {
      onWordIndex(-1);
      if (isPlaying) onNext();
    };

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [text, speed, selectedVoice, voices, onWordIndex, onNext, isPlaying, stop]);

  useEffect(() => {
    if (isPlaying) {
      speak();
    } else {
      stop();
    }
    return () => { stop(); };
  }, [isPlaying, text]);

  useEffect(() => {
    if (isPlaying) speak();
  }, [speed, selectedVoice]);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div className="relative">
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-full left-0 right-0 mb-3 bg-card border border-border rounded-2xl p-5 animate-slide-up box-glow">
          <div className="space-y-5">
            {/* Voice */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Голос</label>
              <select
                value={selectedVoice}
                onChange={e => onVoiceChange(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {voices.length === 0 && <option value="">Системный голос</option>}
                {voices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
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

      {/* Player bar */}
      <div className="flex items-center gap-3">
        {/* Prev chapter */}
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="SkipBack" size={18} />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className="w-14 h-14 rounded-2xl bg-violet-500 hover:bg-violet-400 flex items-center justify-center transition-all duration-200 active:scale-95 box-glow-strong shadow-lg"
        >
          <Icon name={isPlaying ? 'Pause' : 'Play'} size={24} className="text-white" />
        </button>

        {/* Next chapter */}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="SkipForward" size={18} />
        </button>

        {/* Wave animation */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-6 ml-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="wave-bar h-full" />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Settings */}
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
