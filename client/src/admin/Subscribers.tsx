import { useEffect, useState } from 'react';
import { subscriptionsApi } from '../api';
import type { Subscription, SubscriptionStatus } from '../types';

function FulfillmentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDIENTE:  'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
    PREPARANDO: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
    ENVIADO:    'text-green-400 bg-green-900/20 border-green-500/30',
    ENTREGADO:  'text-coffee-300 bg-coffee-800/40 border-coffee-700',
  };
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente', PREPARANDO: 'Preparando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 border rounded-sm whitespace-nowrap ${styles[status] ?? styles.PENDIENTE}`}>
      {labels[status] ?? status}
    </span>
  );
}

const statusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  ACTIVE:    { label: 'Activa',     color: 'text-green-400' },
  PAUSED:    { label: 'Pausada',    color: 'text-yellow-400' },
  CANCELLED: { label: 'Cancelada',  color: 'text-red-400' },
};

const planLabels: Record<string, string> = {
  FUNDADOR:    'Fundador',
  EXPLORADOR:  'Explorador',
  CONNOISSEUR: 'Connoisseur',
};

export default function AdminSubscribers() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () => {
    const params: Record<string, string> | undefined = filter ? { status: filter } : undefined;
    subscriptionsApi.list(params).then((r) => { setSubs(r.data); setLoading(false); });
  };

  useEffect(load, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await subscriptionsApi.updateStatus(id, status);
    load();
  };

  const active = subs.filter((s) => s.status === 'ACTIVE').length;
  const paused = subs.filter((s) => s.status === 'PAUSED').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Suscriptores</h1>
          <p className="text-coffee-400 text-sm mt-1">
            {active} activas · {paused} pausadas
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setLoading(true); }}
          className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
        >
          <option value="">Todas</option>
          <option value="ACTIVE">Activas</option>
          <option value="PAUSED">Pausadas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">No hay suscriptores con ese filtro.</div>
      ) : (
        <div className="bg-coffee-900 border border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-800">
                  {['Nombre', 'Email', 'Plan', 'Molienda', 'Frecuencia', 'Próximo cobro', 'Estado', 'Entrega', 'Cafés', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => {
                  const cfg = statusConfig[sub.status as SubscriptionStatus] ?? statusConfig.ACTIVE;
                  return (
                    <tr key={sub.id} className="border-b border-coffee-800/50 hover:bg-coffee-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-cream font-medium">{sub.name}</p>
                        {sub.phone && <p className="text-coffee-500 text-xs">{sub.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-coffee-300">{sub.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-gold-500 text-xs font-medium uppercase tracking-wider">
                          {planLabels[sub.plan] ?? sub.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 border border-coffee-700 bg-coffee-800/40 text-coffee-300 rounded-sm uppercase tracking-wider">
                          {sub.grindPreference || 'GRANO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-coffee-300 capitalize">
                        {sub.frequency === 'monthly' ? 'Mensual' : 'Bimestral'}
                      </td>
                      <td className="px-4 py-3 text-coffee-300">
                        {new Date(sub.nextBilling).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <FulfillmentBadge status={sub.fulfillmentStatus ?? 'PENDIENTE'} />
                          <select
                            value={sub.fulfillmentStatus ?? 'PENDIENTE'}
                            onChange={async (e) => {
                              await subscriptionsApi.updateFulfillment(sub.id, e.target.value);
                              load();
                            }}
                            className="text-xs bg-coffee-800 border border-coffee-700 text-cream px-2 py-1 focus:outline-none focus:border-gold-500"
                          >
                            {['PENDIENTE','PREPARANDO','ENVIADO','ENTREGADO'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {sub.items && sub.items.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sub.items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-1 bg-coffee-800 px-2 py-0.5">
                                <img src={item.product?.imageUrl} className="w-4 h-4 object-cover" alt="" />
                                <span className="text-[10px] text-coffee-300 truncate max-w-[80px]">{item.product?.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {sub.status !== 'ACTIVE' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'ACTIVE')}
                              className="text-xs text-green-400 hover:text-green-300 transition-colors"
                            >
                              Activar
                            </button>
                          )}
                          {sub.status === 'ACTIVE' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'PAUSED')}
                              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                            >
                              Pausar
                            </button>
                          )}
                          {sub.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Cancelar suscripción de ${sub.name}?`))
                                  updateStatus(sub.id, 'CANCELLED');
                              }}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
