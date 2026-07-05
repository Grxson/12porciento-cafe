import { useRef, useState } from 'react';
import { Plus, X, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { uploadsApi } from '../../api';
import { resolveImageUrl } from '../utils/imageUrl';

interface GalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

export default function GalleryUploader({ value, onChange, label = 'Galería de imágenes', max = 8 }: GalleryUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const atMax = value.length >= max;

  const handleFiles = async (files: FileList) => {
    setError('');
    const remaining = max - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue;
        const res = await uploadsApi.upload(file);
        urls.push(res.data.data.url);
      }
      if (urls.length) onChange([...value, ...urls]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al subir imágenes');
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5">
        {label} <span className="text-coffee-600 dark:text-coffee-400 normal-case tracking-normal">({value.length}/{max})</span>
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {value.map((url, i) => (
          <div key={url + i} className="relative group aspect-square border border-coffee-400 dark:border-coffee-600">
            <img src={resolveImageUrl(url)} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Quitar imagen"
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
            >
              <X size={12} />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-coffee-950/70">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover izquierda" className="p-1 text-cream disabled:opacity-30">
                <ArrowLeft size={12} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Mover derecha" className="p-1 text-cream disabled:opacity-30">
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square border-2 border-dashed border-coffee-400 dark:border-coffee-700 flex flex-col items-center justify-center text-coffee-600 dark:text-coffee-400 hover:border-gold-500 hover:text-coffee-900 dark:hover:text-cream transition-colors"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus size={18} /><span className="text-xs mt-1">Agregar</span></>}
          </button>
        )}
      </div>

      {!atMax && (
        <input
          ref={fileRef}
          data-testid="gallery-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
