import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface NotesCaptureProps {
  value: string;
  onChange: (notes: string) => void;
}

const TEMPLATES = ['Muy caliente', 'Frío', 'Amargo', 'Ácido', 'Perfecto', 'Ajustar dosis'];

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

function appendNote(existing: string, addition: string): string {
  return existing ? `${existing} · ${addition}` : addition;
}

export default function NotesCapture({ value, onChange }: NotesCaptureProps) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoice = () => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) onChange(appendNote(value, transcript));
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="mb-4">
      <p className="text-[10px] text-coffee-500 uppercase tracking-widest mb-2">
        Notas (opcional)
      </p>

      {/* Template buttons */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(appendNote(value, t))}
            className="text-[11px] px-2.5 py-1 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Voice button — only if SpeechRecognition available */}
      {SpeechRecognition && (
        <button
          type="button"
          aria-label={recording ? 'Detener grabación' : 'Grabar nota de voz'}
          onClick={recording ? stopVoice : startVoice}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 mb-2 transition-colors ${
            recording
              ? 'bg-red-600/30 text-red-400 border border-red-600/50'
              : 'bg-white dark:bg-coffee-800 text-coffee-600 dark:text-coffee-400 hover:text-gold-400 border border-coffee-200 dark:border-coffee-700'
          }`}
        >
          {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {recording ? 'Detener' : 'Grabar nota'}
        </button>
      )}

      {/* Free text */}
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="O escribe aquí..."
        maxLength={500}
        className="w-full bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-800 dark:text-coffee-200 text-xs px-3 py-2 focus:border-gold-500 focus:outline-none resize-none"
      />
      <p className="text-[10px] text-coffee-600 text-right">{value.length}/500</p>
    </div>
  );
}
