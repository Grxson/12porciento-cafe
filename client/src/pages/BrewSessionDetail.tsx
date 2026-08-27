import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Star,
  Heart,
  Copy,
  Trash2,
  Clock,
  ThermometerSun,
  Scale,
  ChevronRight,
} from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import type { BrewSession } from '@12porciento/shared';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';

export default function BrewSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useUser((s) => s.user);
  const navigate = useNavigate();
  const addToast = useToast((s) => s.add);

  const [session, setSession] = useState<BrewSession | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!id) return;
    setLoading(true);
    brewApi
      .getSession(id)
      .then((r) => setSession(r.data.data))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="h-40 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Sesión no encontrada"
          description="Esta preparación no existe o no es tuya."
          action={
            <Link to="/brew/sesiones" className="btn-primary">
              Ver mis preparaciones
            </Link>
          }
        />
      </div>
    );
  }

  const isOwner = user?.id === session.userId;

  async function toggleFavorite() {
    if (!session) return;
    try {
      const r = await brewApi.toggleFavorite(session.id);
      setSession({ ...session, favorited: r.data.data.favorited });
    } catch {
      addToast('No se pudo actualizar favorita', 'error');
    }
  }

  async function deleteSession() {
    if (!session) return;
    if (!window.confirm('¿Eliminar esta preparación?')) return;
    try {
      await brewApi.deleteSession(session.id);
      addToast('Preparación eliminada', 'success');
      navigate('/brew/sesiones');
    } catch {
      addToast('No se pudo eliminar', 'error');
    }
  }

  async function repeatSession() {
    if (!session) return;
    try {
      const r = await brewApi.startSession({
        recipeId: session.recipeId ?? undefined,
        coffeeId: session.coffeeId ?? undefined,
        brewMethodId: session.brewMethodId ?? undefined,
        coffeeDoseGrams: session.coffeeDoseGrams ?? undefined,
        waterGrams: session.waterGrams ?? undefined,
        ratio: session.ratio ?? undefined,
        temperatureCelsius: session.temperatureCelsius ?? undefined,
        grindSetting: session.grindSetting ?? undefined,
        grindMicrons: session.grindMicrons ?? undefined,
      });
      addToast('Preparación reiniciada con los mismos parámetros', 'success');
      navigate(`/brew/preparar?session=${r.data.data.id}`);
    } catch {
      addToast('No se pudo reiniciar', 'error');
    }
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/brew/sesiones"
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-coffee-500 hover:text-gold-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Mis preparaciones
        </Link>

        <header className="mb-6 flex flex-wrap items-start gap-4">
          {session.coffee?.imageUrl && (
            <MediaFrame
              ratio="avatar"
              src={session.coffee.imageUrl}
              alt={session.coffee.name ?? 'Café'}
              className="h-16 w-16 shrink-0 rounded sm:h-20 sm:w-20"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              {session.brewMethod?.name ?? 'Método libre'}
            </p>
            <h1 className="mt-1 font-serif text-2xl text-coffee-900 dark:text-cream sm:text-3xl">
              {session.recipe?.title ?? 'Receta libre'}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs text-coffee-500">
              <Clock className="h-3 w-3" />
              {new Date(session.createdAt).toLocaleString('es-MX')}
              {session.coffee && (
                <>
                  <span>·</span>
                  <Link
                    to={`/brew/cafes/${session.coffee.slug}`}
                    className="hover:text-gold-600 hover:underline"
                  >
                    {session.coffee.name}
                  </Link>
                </>
              )}
            </p>
          </div>
          {session.rating != null && (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <span className="font-bold text-coffee-900 dark:text-cream">
                {session.rating}/5
              </span>
            </div>
          )}
        </header>

        {/* Parameters */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ParamCard icon={<Scale className="h-4 w-4" />} label="Dosis" value={`${session.coffeeDoseGrams ?? '—'} g`} />
          <ParamCard icon={<Scale className="h-4 w-4" />} label="Agua" value={`${session.waterGrams ?? '—'} g`} />
          <ParamCard
            icon={<Scale className="h-4 w-4" />}
            label="Ratio"
            value={session.ratio ? `1:${session.ratio}` : '—'}
          />
          <ParamCard
            icon={<ThermometerSun className="h-4 w-4" />}
            label="Temp"
            value={session.temperatureCelsius ? `${session.temperatureCelsius} °C` : '—'}
          />
        </section>

        {session.grindSetting && (
          <section className="mb-6 border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Molienda
            </p>
            <p className="mt-1 font-mono text-base text-coffee-900 dark:text-cream">
              {session.grindSetting}
              {session.grindMicrons && (
                <span className="ml-2 text-xs text-coffee-500">~{session.grindMicrons} µm</span>
              )}
            </p>
          </section>
        )}

        {/* Taste profile */}
        {(session.sweetnessRating || session.acidityRating || session.bodyRating || session.clarityRating) && (
          <section className="mb-6 border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Perfil de sabor (1-5)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TasteBar label="Dulzor" value={session.sweetnessRating} />
              <TasteBar label="Acidez" value={session.acidityRating} />
              <TasteBar label="Cuerpo" value={session.bodyRating} />
              <TasteBar label="Claridad" value={session.clarityRating} />
            </div>
          </section>
        )}

        {session.notes && (
          <section className="mb-6 border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Notas
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-coffee-700 dark:text-coffee-300">
              {session.notes}
            </p>
          </section>
        )}

        {session.result && (
          <section className="mb-6 border-l-4 border-gold-500 bg-gold-500/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400">
              Resultado reportado
            </p>
            <p className="mt-1 font-serif text-lg text-coffee-900 dark:text-cream">
              {session.result}
            </p>
            <Link
              to={`/brew/dial-in?result=${session.result}`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold-600 hover:text-gold-500 dark:text-gold-400"
            >
              Obtener recomendación dial-in <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* Actions */}
        {isOwner && (
          <section className="flex flex-wrap gap-3 border-t border-coffee-200 pt-6 dark:border-coffee-800">
            <button
              type="button"
              onClick={repeatSession}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Copy className="h-4 w-4" /> Repetir
            </button>
            <button
              type="button"
              onClick={toggleFavorite}
              className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors ${
                session.favorited
                  ? 'border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300'
                  : 'border-coffee-200 text-coffee-700 hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-200'
              }`}
            >
              <Heart className={`h-4 w-4 ${session.favorited ? 'fill-gold-500' : ''}`} />
              {session.favorited ? 'Favorita' : 'Marcar favorita'}
            </button>
            <button
              type="button"
              onClick={deleteSession}
              className="inline-flex items-center gap-2 border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function ParamCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-coffee-200 bg-white p-3 text-center dark:border-coffee-800 dark:bg-coffee-900">
      <div className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-coffee-500">{label}</p>
      <p className="mt-0.5 font-serif text-base text-coffee-900 dark:text-cream">{value}</p>
    </div>
  );
}

function TasteBar({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value ?? 0;
  return (
    <div>
      <p className="mb-1 flex justify-between text-xs text-coffee-600 dark:text-coffee-400">
        <span>{label}</span>
        <span className="font-mono font-semibold text-coffee-900 dark:text-cream">
          {value ?? '—'}/5
        </span>
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-coffee-100 dark:bg-coffee-800">
        <div
          className="h-full bg-gold-500 transition-all"
          style={{ width: `${(v / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
