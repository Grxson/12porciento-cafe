import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Clock, DollarSign, User } from 'lucide-react';
import { giftCardsApi } from '../../api';
import type { GiftCard } from '../../types';

export default function GiftCards() {
  const [tab, setTab] = useState<'sent' | 'received'>('received');
  const [sent, setSent] = useState<GiftCard[]>([]);
  const [received, setReceived] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await giftCardsApi.my();
        setSent(res.data.data.sent);
        setReceived(res.data.data.received);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const current = tab === 'sent' ? sent : received;

  return (
    <div>
      <div className="flex gap-0 border-b border-coffee-200 dark:border-coffee-800 mb-6">
        <button
          onClick={() => setTab('received')}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
            tab === 'received'
              ? 'border-gold-500 text-gold-500'
              : 'border-transparent text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream'
          }`}
        >
          Recibidas ({received.length})
        </button>
        <button
          onClick={() => setTab('sent')}
          className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
            tab === 'sent'
              ? 'border-gold-500 text-gold-500'
              : 'border-transparent text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream'
          }`}
        >
          Enviadas ({sent.length})
        </button>
      </div>

      {current.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-coffee-500 dark:text-coffee-400">
          <Gift className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-1">
            {tab === 'sent' ? 'No has enviado gift cards' : 'No tienes gift cards recibidas'}
          </p>
          <p className="text-sm">
            {tab === 'sent'
              ? 'Compra una gift card para regalar café de especialidad.'
              : 'Cuando alguien te envíe una gift card, aparecerá aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {current.map((card) => {
            const expired = card.expiresAt && new Date(card.expiresAt) < new Date();
            const isActive = card.isActive && !expired && card.balance > 0;

            return (
              <div
                key={card.id}
                className="border border-coffee-200 dark:border-coffee-800 bg-coffee-50 dark:bg-coffee-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-4 h-4 text-gold-500 shrink-0" />
                      <span className="font-mono text-sm font-bold text-coffee-900 dark:text-cream">
                        {card.code}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                          isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {isActive ? 'Activa' : expired ? 'Expirada' : 'Inactiva'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-coffee-600 dark:text-coffee-400">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>${card.initialAmount} MXN</span>
                      </div>
                      {card.balance !== card.initialAmount && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-gold-500" />
                          <span className="text-gold-500">Saldo: ${card.balance} MXN</span>
                        </div>
                      )}
                      {tab === 'sent' && card.recipientName && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <User className="w-3.5 h-3.5" />
                          <span>Para: {card.recipientName}</span>
                        </div>
                      )}
                      {tab === 'received' && card.senderName && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <User className="w-3.5 h-3.5" />
                          <span>De: {card.senderName}</span>
                        </div>
                      )}
                      {card.message && (
                        <p className="col-span-2 italic text-coffee-500 dark:text-coffee-400 text-xs mt-1">
                          &ldquo;{card.message}&rdquo;
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 col-span-2 text-xs text-coffee-400 dark:text-coffee-500 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(card.createdAt).toLocaleDateString('es-MX')}</span>
                        {card.expiresAt && (
                          <span className="ml-2">Expira: {new Date(card.expiresAt).toLocaleDateString('es-MX')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {tab === 'received' && isActive && (
                    <button
                      onClick={() => copyCode(card.code)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gold-500 border border-gold-500/30 hover:bg-gold-500/10 transition-colors shrink-0"
                    >
                      {copiedId === card.code ? (
                        <><Check className="w-3.5 h-3.5" /> Copiado</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Canjear</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
