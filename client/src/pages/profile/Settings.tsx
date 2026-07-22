import { useRef, useState, useEffect } from 'react';
import { Camera, Wifi, WifiOff, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { mexicanStates } from '../../constants/mexico';
import NotificationSettings from '../../components/NotificationSettings';
import EmailVerificationBanner from '../../components/EmailVerificationBanner';
import { baristaApi } from '../../api/barista';
import { uploadsApi } from '../../api';
import { useCacheStats } from '../../hooks/useCacheStats';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { ConfirmDialog } from '@12porciento/ui';

function resizeToBase64(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
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
  const offlineEnabled = useOfflineMode((s) => s.enabled);
  const toggleOffline = useOfflineMode((s) => s.toggle);
  const cacheStats = useCacheStats();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    avatarUrl: '',
  });
  const [baristaData, setBaristaData] = useState({ bio: '', bannerUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!user?.id) return;
    baristaApi
      .getProfile(user.id)
      .then((res) => {
        const p = res.data.data;
        setBaristaData({ bio: p.bio ?? '', bannerUrl: p.bannerUrl ?? '' });
      })
      .catch((err) => console.error('Error loading barista profile:', err));
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      add('Imagen muy grande (máx 5 MB)', 'error');
      return;
    }
    try {
      const base64 = await resizeToBase64(file);
      setForm((f) => ({ ...f, avatarUrl: base64 }));
    } catch {
      add('No se pudo procesar la imagen', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateProfile(form);
      await baristaApi.updateProfile({ bio: baristaData.bio, bannerUrl: baristaData.bannerUrl });
      add('Datos guardados exitosamente', 'success');
    } catch {
      setError('Error al guardar cambios');
      add('Error al guardar cambios', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Datos personales</h2>
      {user && !user.emailVerified && <EmailVerificationBanner email={user.email} />}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Avatar */}
        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-3">
            Foto de perfil
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-16 h-16 rounded-full overflow-hidden bg-coffee-200 dark:bg-coffee-800 border-2 border-coffee-200 dark:border-coffee-700 hover:border-gold-500/60 transition-colors group shrink-0"
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
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 hover:border-gold-500/60 px-4 py-2 transition-colors flex items-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" /> Subir foto
              </button>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatarUrl: '' }))}
                  className="text-xs text-coffee-500 hover:text-red-400 transition-colors mt-1 block min-h-11"
                >
                  Quitar foto
                </button>
              )}
              <p className="text-coffee-500 dark:text-coffee-600 text-xs mt-1">
                JPG, PNG, WebP · máx 5 MB
              </p>
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

        {/* Bio */}
        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
            Biografía
          </label>
          <textarea
            name="bio"
            maxLength={280}
            rows={3}
            value={baristaData.bio}
            onChange={(e) => setBaristaData((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Cuéntanos sobre ti y tu pasión por el café..."
            className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors resize-none"
          />
          <p className="text-coffee-500 dark:text-coffee-600 text-xs mt-1 text-right">
            {baristaData.bio.length}/280
          </p>
        </div>

        {/* Banner */}
        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-3">
            Foto de portada
          </label>
          <p className="text-xs text-coffee-500 dark:text-coffee-600 mb-3">
            Se recomienda 1200×400 píxeles para mejor visualización en todos los dispositivos.
          </p>
          {baristaData.bannerUrl ? (
            <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-coffee-200 dark:bg-coffee-800 mb-3 group">
              <img
                src={baristaData.bannerUrl}
                alt="Portada"
                className="w-full h-full object-cover"
              />
              {/* Overlay hover con info de crop */}
              <div className="absolute inset-0 bg-coffee-950/0 group-hover:bg-coffee-950/40 transition-colors flex items-center justify-center">
                <p className="text-cream text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  Vista previa — 3:1
                </p>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-[3/1] rounded-lg bg-coffee-100 dark:bg-coffee-800/50 border-2 border-dashed border-coffee-300 dark:border-coffee-700 mb-3 flex items-center justify-center">
              {/* Guía de crop: líneas de tercios */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-coffee-300/30" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-coffee-300/30" />
                <div className="absolute top-1/3 left-0 right-0 border-t border-coffee-300/30" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-coffee-300/30" />
              </div>
              <div className="text-center relative z-10">
                <Camera className="w-8 h-8 text-coffee-400 dark:text-coffee-600 mx-auto mb-2" />
                <p className="text-coffee-500 dark:text-coffee-600 text-sm">Sin foto de portada</p>
                <p className="text-coffee-400 dark:text-coffee-600 text-xs mt-1">1200 × 400 px</p>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => bannerFileRef.current?.click()}
              className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 hover:border-gold-500/60 px-4 py-2 transition-colors flex items-center gap-2"
            >
              <Camera className="w-3.5 h-3.5" /> Subir portada
            </button>
            {baristaData.bannerUrl && (
              <button
                type="button"
                onClick={() => setBaristaData((f) => ({ ...f, bannerUrl: '' }))}
                className="text-sm text-coffee-500 hover:text-red-400 transition-colors px-4 py-2 border border-coffee-300 dark:border-coffee-700"
              >
                Quitar portada
              </button>
            )}
          </div>
          <input
            ref={bannerFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                add('Imagen muy grande (máx 10 MB)', 'error');
                return;
              }
              try {
                const res = await uploadsApi.uploadBanner(file);
                const url = res.data.data.url;
                setBaristaData((f) => ({ ...f, bannerUrl: url }));
              } catch {
                add('No se pudo subir la portada', 'error');
              }
            }}
          />
        </div>

        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
            Nombre *
          </label>
          <input
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
            Teléfono
          </label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="55 1234 5678"
          />
        </div>

        <h3 className="font-serif text-lg text-coffee-900 dark:text-cream pt-4 border-t border-coffee-200 dark:border-coffee-800">
          Dirección de envío
        </h3>

        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
            Calle y número
          </label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="Calle, número, colonia"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
              Ciudad
            </label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
              CP
            </label>
            <input
              name="zipCode"
              value={form.zipCode}
              onChange={handleChange}
              className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
              placeholder="12345"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
            Estado
          </label>
          <select
            name="state"
            value={form.state}
            onChange={handleChange}
            className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
          >
            <option value="">Seleccionar</option>
            {mexicanStates.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      <div className="max-w-lg mt-12 pt-8 border-t border-coffee-200 dark:border-coffee-800">
        <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">Notificaciones</h3>
        <NotificationSettings />
      </div>

      <div className="max-w-lg mt-12 pt-8 border-t border-coffee-200 dark:border-coffee-800">
        <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">
          Modo sin conexión
        </h3>
        <div className="p-4 bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800">
          <div className="flex items-start gap-3">
            {offlineEnabled ? (
              <Wifi className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-5 h-5 text-coffee-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-coffee-900 dark:text-cream mb-1">
                  Navegación sin conexión
                </p>
                <button
                  onClick={toggleOffline}
                  role="switch"
                  aria-checked={offlineEnabled}
                  aria-label="Activar navegación sin conexión"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500/60 focus:ring-offset-2 focus:ring-offset-coffee-50 dark:focus:ring-offset-coffee-900 ${
                    offlineEnabled ? 'bg-gold-500' : 'bg-coffee-300 dark:bg-coffee-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition-transform ${
                      offlineEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-coffee-600 dark:text-coffee-400">
                {offlineEnabled
                  ? 'Los datos se guardan automáticamente para navegar sin conexión a internet.'
                  : 'Siempre se cargarán los datos más recientes desde el servidor.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Almacenamiento offline ── */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Limpiar caché"
        description="Se eliminarán todos los datos guardados localmente (recetas, imágenes, API). Las próximas visitas cargarán datos nuevos desde el servidor."
        confirmLabel="Limpiar todo"
        confirmVariant="danger"
        loading={clearing}
        onConfirm={async () => {
          setClearing(true);
          await cacheStats.clearAllCache();
          setClearing(false);
          setShowClearConfirm(false);
          add('Caché limpiado exitosamente', 'success');
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <div className="max-w-lg mt-12 pt-8 border-t border-coffee-200 dark:border-coffee-800">
        <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">
          Almacenamiento offline
        </h3>
        <div className="p-4 bg-coffee-50 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800">
          {cacheStats.loading ? (
            <div className="flex items-center gap-2 text-coffee-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculando almacenamiento...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Resumen */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-coffee-600 dark:text-coffee-400">Total almacenado</span>
                <span className="text-coffee-900 dark:text-cream font-medium">
                  {cacheStats.totalEstimatedSize} ({cacheStats.totalEntries} archivos)
                </span>
              </div>

              {/* Lista de cachés */}
              {cacheStats.caches.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-coffee-500 dark:text-coffee-500 uppercase tracking-wider">
                    Detalle por tipo
                  </p>
                  {cacheStats.caches.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between text-xs text-coffee-600 dark:text-coffee-400"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 ml-2">
                        {c.estimatedSize} ({c.entries} {c.entries === 1 ? 'archivo' : 'archivos'})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Brews pendientes */}
              {cacheStats.pendingBrews > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-coffee-200 dark:border-coffee-700">
                  <span className="text-coffee-600 dark:text-coffee-400">
                    {cacheStats.pendingBrews} brew{cacheStats.pendingBrews !== 1 ? 's' : ''}{' '}
                    pendiente{cacheStats.pendingBrews !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={cacheStats.syncPendingBrews}
                    disabled={cacheStats.syncing}
                    className="inline-flex items-center gap-1 text-xs text-gold-500 hover:text-gold-400 font-medium disabled:opacity-50 transition-colors"
                  >
                    {cacheStats.syncing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    {cacheStats.syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                  </button>
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-2 border-t border-coffee-200 dark:border-coffee-700">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-coffee-500 hover:text-red-400 border border-coffee-300 dark:border-coffee-700 px-3 py-2 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpiar caché
                </button>
                <button
                  onClick={cacheStats.refresh}
                  className="inline-flex items-center gap-1.5 text-xs text-coffee-500 hover:text-gold-500 border border-coffee-300 dark:border-coffee-700 px-3 py-2 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
