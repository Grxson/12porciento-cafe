import { useRef, useState } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { uploadsApi } from '../../api';
import { resolveImageUrl } from '../utils/imageUrl';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ value, onChange, label = 'Imagen' }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const doUpload = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      onChange(res.data.data.url);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  return (
    <div>
      <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5">{label}</label>

      {value ? (
        <div className="relative inline-block">
          <img
            src={resolveImageUrl(value)}
            alt="Vista previa"
            className="w-32 h-32 object-cover border border-coffee-400 dark:border-coffee-600"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
            aria-label="Quitar imagen"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-coffee-300 dark:border-coffee-700'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-coffee-600 dark:text-coffee-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Subiendo...</span>
            </div>
          ) : (
            <>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-3">Arrastra una imagen aquí o</p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-coffee-400 dark:border-coffee-700 text-coffee-600 dark:text-coffee-300 text-sm hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-500 transition-colors"
                >
                  <Upload size={14} /> Subir archivo
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-coffee-400 dark:border-coffee-700 text-coffee-600 dark:text-coffee-300 text-sm hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-500 transition-colors"
                >
                  <Camera size={14} /> Tomar foto
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        data-testid="image-file-input"
        type="file"
        accept="image/*"
        onChange={onInputChange}
        className="hidden"
      />
      <input
        ref={cameraRef}
        data-testid="image-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onInputChange}
        className="hidden"
      />

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
