import { useState, useRef } from 'react';
import { Mic, MicOff, X as IconX } from 'lucide-react';

interface NotesCaptureProps {
  value: string;
  onChange: (notes: string) => void;
  onPhotoCapture?: (photo: { preview: string; blob: Blob }) => void; // R14: Per-step photo capture
}

const TEMPLATES = ['Muy caliente', 'Frío', 'Amargo', 'Ácido', 'Perfecto', 'Ajustar dosis'];

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

function appendNote(existing: string, addition: string): string {
  return existing ? `${existing} · ${addition}` : addition;
}

export default function NotesCapture({ value, onChange, onPhotoCapture }: NotesCaptureProps) {
  const [recording, setRecording] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [stepPhoto, setStepPhoto] = useState<string | null>(null); // R14: Per-step photo capture
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const startVoice = () => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalText += (finalText ? ' ' : '') + r[0].transcript;
        } else {
          setInterim(r[0].transcript);
        }
      }
      if (finalText) {
        const current = valueRef.current;
        onChange(current ? `${current} · ${finalText}` : finalText);
      }
    };
    recognition.onend = () => { setRecording(false); setInterim(''); };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setMicDenied(true);
      }
      setRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setRecording(false);
    setInterim('');
  };

  // R14: Per-step photo capture
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setStepPhoto(preview);
    onPhotoCapture?.({ preview, blob: file });
  };

  const removeStepPhoto = () => {
    if (stepPhoto) URL.revokeObjectURL(stepPhoto);
    setStepPhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  return (
    <div className="mb-4">
      <p className="text-xs text-coffee-500 uppercase tracking-widest mb-2">
        Notas (opcional)
      </p>

      {/* R14: Per-step photo capture */}
      {onPhotoCapture && (
        <div className="mb-4">
          {stepPhoto ? (
            <div className="relative mb-3">
              <img
                src={stepPhoto}
                alt="Foto del paso"
                className="w-full h-32 object-cover rounded"
              />
              <button
                type="button"
                onClick={removeStepPhoto}
                className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full"
                aria-label="Eliminar foto"
              >
                <IconX className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-coffee-700 p-3 rounded cursor-pointer hover:border-gold-400 transition-colors mb-3">
              <span className="text-xs text-coffee-400">📷 Foto de este paso</span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Foto del paso"
              />
            </label>
          )}
        </div>
      )}

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
        micDenied ? (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
            Permiso de micrófono denegado. Actívalo en la configuración del navegador.
          </p>
        ) : (
          <>
            {!recording && (
              <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-1">
                🎤 Dicta tus notas — el navegador pedirá permiso al micrófono.
              </p>
            )}
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
          </>
        )
      )}

      {/* Free text */}
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={recording ? 'Escuchando...' : 'O escribe aquí...'}
        maxLength={500}
        className="w-full bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-800 dark:text-coffee-200 text-xs px-3 py-2 focus:border-gold-500 focus:outline-none resize-none"
      />
      {interim && (
        <p className="text-xs text-gold-500 italic mt-1">{interim}…</p>
      )}
      <p className="text-xs text-coffee-600 text-right">{value.length}/500</p>
    </div>
  );
}
