import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { baristaApi } from '../../api/barista';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { PageMeta } from '../../hooks/usePageMeta';
import FlavorSelector from '../../components/FlavorSelector';
import FlavorRadarChart from '../../components/FlavorRadarChart';
import type { FlavorProfile as FlavorProfileType } from '../../types';

const ORIGINS = [
  'África',
  'Asia',
  'Centroamérica',
  'Sudamérica',
  'México',
  'Indonesia',
  'Etiopía',
  'Colombia',
  'Brasil',
  'Costa Rica',
  'Kenya',
  'India',
];

interface RadarPoint {
  flavor: string;
  value: number;
}

function computeRadarData(selected: string[]): RadarPoint[] {
  const dims: Record<string, number> = {
    Dulzor: 30,
    Acidez: 30,
    Cuerpo: 30,
    Amargor: 20,
    Final: 30,
    Intensidad: 30,
  };

  const adjustments: Record<string, Partial<Record<string, number>>> = {
    Chocolate: { Dulzor: 25, Cuerpo: 20, Amargor: 10, Final: 15 },
    Caramelo: { Dulzor: 30, Acidez: -5, Final: 10 },
    Miel: { Dulzor: 25, Cuerpo: 10, Final: 10 },
    Vainilla: { Dulzor: 20, Final: 10 },
    'Frutos secos': { Cuerpo: 15, Final: 10 },
    Cítrico: { Acidez: 35, Dulzor: 10, Intensidad: 10 },
    'Frutos rojos': { Acidez: 25, Dulzor: 15, Intensidad: 5 },
    'Fruta tropical': { Acidez: 20, Dulzor: 20, Intensidad: 10 },
    Manzana: { Acidez: 20, Dulzor: 15 },
    Durazno: { Dulzor: 20, Acidez: 10, Final: 5 },
    Jazmín: { Dulzor: 10, Acidez: 5, Final: 15 },
    Lavanda: { Final: 15, Dulzor: 5 },
    Rosa: { Final: 10, Dulzor: 5, Acidez: 5 },
    Hibisco: { Acidez: 20, Dulzor: 5, Intensidad: 5 },
    Canela: { Dulzor: 10, Intensidad: 15, Final: 10 },
    Clavo: { Intensidad: 20, Amargor: 10, Final: 5 },
    Pimienta: { Intensidad: 20, Amargor: 10 },
    'Nuez moscada': { Dulzor: 5, Intensidad: 15, Final: 10 },
    Tabaco: { Amargor: 25, Cuerpo: 15, Intensidad: 15, Final: 10 },
    Cuero: { Cuerpo: 20, Amargor: 15, Intensidad: 10 },
    Madera: { Cuerpo: 15, Amargor: 10, Final: 10 },
    Cacao: { Dulzor: 15, Cuerpo: 20, Amargor: 15, Final: 10 },
    Nueces: { Cuerpo: 15, Final: 10 },
    Mantequilla: { Cuerpo: 20, Dulzor: 5 },
    Crema: { Cuerpo: 25, Dulzor: 5 },
    'Vino tinto': { Acidez: 15, Amargor: 10, Intensidad: 10, Final: 15 },
  };

  for (const flavor of selected) {
    const adj = adjustments[flavor];
    if (adj) {
      for (const [dim, delta] of Object.entries(adj)) {
        if (dims[dim] !== undefined && delta !== undefined) {
          dims[dim] = Math.min(100, Math.max(0, dims[dim] + delta));
        }
      }
    }
  }

  return Object.entries(dims).map(([flavor, value]) => ({ flavor, value }));
}

export default function FlavorProfile() {
  const { userId } = useParams<{ userId: string }>();
  const currentUser = useUser((s) => s.user);
  const navigate = useNavigate();
  const { add } = useToast();
  const queryClient = useQueryClient();

  const targetUserId = userId || currentUser?.id;

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['barista-profile', targetUserId],
    queryFn: () => baristaApi.getProfile(targetUserId!).then((r) => r.data.data),
    enabled: !!targetUserId,
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [preferredOrigin, setPreferredOrigin] = useState('');
  const [preferredRoast, setPreferredRoast] = useState('');

  useEffect(() => {
    if (profileData?.flavorProfile) {
      setSelected(profileData.flavorProfile.favorites ?? []);
      setPreferredOrigin(profileData.flavorProfile.preferredOrigin ?? '');
      setPreferredRoast(profileData.flavorProfile.preferredRoast ?? '');
    }
  }, [profileData]);

  const isOwnProfile = currentUser?.id === targetUserId;

  const saveMutation = useMutation({
    mutationFn: (flavorProfile: FlavorProfileType) => baristaApi.updateProfile({ flavorProfile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barista-profile', targetUserId] });
      add('Perfil de sabor guardado', 'success');
    },
    onError: () => {
      add('Error al guardar perfil de sabor', 'error');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      favorites: selected,
      preferredOrigin,
      preferredRoast,
    });
  };

  const handleCancel = () => {
    if (profileData?.flavorProfile) {
      setSelected(profileData.flavorProfile.favorites ?? []);
      setPreferredOrigin(profileData.flavorProfile.preferredOrigin ?? '');
      setPreferredRoast(profileData.flavorProfile.preferredRoast ?? '');
    } else {
      setSelected([]);
      setPreferredOrigin('');
      setPreferredRoast('');
    }
  };

  const radarData = computeRadarData(selected);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
        <PageMeta title="Perfil de Sabor" />
        <div className="max-w-2xl mx-auto px-4 space-y-6 pt-12">
          <div className="shimmer dark:shimmer-dark h-8 w-48" />
          <div className="shimmer dark:shimmer-dark h-[280px] w-full rounded" />
          <div className="shimmer dark:shimmer-dark h-64 w-full rounded" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageMeta title="Perfil de Sabor" description="Define tus preferencias de sabor." />

      <div className="space-y-8">
        <div>
          <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
            Perfil de Sabor
          </h2>
          <p className="text-sm text-coffee-600 dark:text-coffee-400">
            Selecciona hasta 5 sabores que más disfrutas en tu café. Esto ayudará a recomendarte los
            granos ideales.
          </p>
        </div>

        {/* Radar chart preview */}
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-4">
            Vista previa de perfil
          </p>
          <FlavorRadarChart userData={radarData} />
        </div>

        {/* Flavor selector */}
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <FlavorSelector selected={selected} onChange={setSelected} max={5} />
        </div>

        {/* Origin and roast */}
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 space-y-5">
          <div>
            <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
              Origen preferido
            </label>
            <select
              value={preferredOrigin}
              onChange={(e) => setPreferredOrigin(e.target.value)}
              className="w-full bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            >
              <option value="">Sin preferencia</option>
              {ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
              Tostado preferido
            </label>
            <div className="flex gap-3">
              {[
                { value: 'claro', label: 'Claro' },
                { value: 'medio', label: 'Medio' },
                { value: 'oscuro', label: 'Oscuro' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreferredRoast(value)}
                  className={`flex-1 px-4 py-3 text-sm border transition-colors ${
                    preferredRoast === value
                      ? 'bg-gold-500/20 border-gold-500 text-gold-400 font-medium'
                      : 'bg-coffee-100 dark:bg-coffee-800 border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 hover:border-coffee-400 dark:hover:border-coffee-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        {isOwnProfile && (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border border-coffee-300 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-sm hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 px-6 py-3 bg-gold-500 text-coffee-950 text-sm font-semibold hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
