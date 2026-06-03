import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { mexicanStates } from '../../constants/mexico';

function resizeToBase64(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProfileSettings() {
  const user = useUser((s) => s.user);
  const updateProfile = useUser((s) => s.updateProfile);
  const { add } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', state: '', zipCode: '', avatarUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        zipCode: user.zipCode ?? '',
        avatarUrl: user.avatarUrl ?? '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { add('Imagen muy grande (máx 5 MB)', 'error'); return; }
    try {
      const base64 = await resizeToBase64(file);
      setForm((f) => ({ ...f, avatarUrl: base64 }));
    } catch { add('No se pudo procesar la imagen', 'error'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateProfile(form);
      add('Datos guardados exitosamente', 'success');
    } catch {
      setError('Error al guardar cambios');
      add('Error al guardar cambios', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="font-serif text-2xl text-cream mb-6">Datos personales</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">

        {/* Avatar */}
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-3">Foto de perfil</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-16 h-16 rounded-full overflow-hidden bg-coffee-800 border-2 border-coffee-700 hover:border-gold-500/60 transition-colors group shrink-0"
            >
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gold-500/20 flex items-center justify-center">
                  <span className="font-serif text-2xl text-gold-500 font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-coffee-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-cream" />
              </div>
            </button>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 hover:border-gold-500/60 px-4 py-2 transition-colors flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Subir foto
              </button>
              {form.avatarUrl && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, avatarUrl: '' }))}
                  className="text-xs text-coffee-500 hover:text-red-400 transition-colors mt-1 block">
                  Quitar foto
                </button>
              )}
              <p className="text-coffee-600 text-[10px] mt-1">JPG, PNG, WebP · máx 5 MB</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarFile}
          />
        </div>

        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Nombre *</label>
          <input name="name" required value={form.name} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Teléfono</label>
          <input name="phone" value={form.phone} onChange={handleChange} type="tel"
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="55 1234 5678" />
        </div>

        <h3 className="font-serif text-lg text-cream pt-4 border-t border-coffee-800">Dirección de envío</h3>

        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Calle y número</label>
          <input name="address" value={form.address} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="Calle, número, colonia" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Ciudad</label>
            <input name="city" value={form.city} onChange={handleChange}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">CP</label>
            <input name="zipCode" value={form.zipCode} onChange={handleChange}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
              placeholder="12345" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Estado</label>
          <select name="state" value={form.state} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors">
            <option value="">Seleccionar</option>
            {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </motion.div>
  );
}
