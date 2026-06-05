import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import { reviewsApi } from '../api';
import { useUser } from '../context/UserContext';

interface Reply {
  id: string;
  name: string;
  content: string;
  user?: { id: string; name: string; avatarUrl?: string | null };
  createdAt: string;
  isApproved: boolean;
}

interface Props {
  reviewId: string;
}

export default function ReviewThread({ reviewId }: Props) {
  const user = useUser((s) => s.user);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    loadReplies();
  }, [reviewId]);

  const loadReplies = async () => {
    try {
      const res = await reviewsApi.listReplies(reviewId);
      setReplies(res.data.data || []);
    } catch {
      // silent — empty is fine
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('El mensaje no puede estar vacío');
      return;
    }
    if (!user && !guestName.trim()) {
      setError('Ingresa tu nombre para responder');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsApi.createReply(reviewId, {
        content: content.trim(),
        ...(user ? {} : { name: guestName.trim() }),
      });
      setContent('');
      setGuestName('');
      setShowForm(false);
      setSuccessMsg('Respuesta enviada. Será visible tras aprobación.');
      await loadReplies();
      successTimerRef.current = setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 ml-4 pl-4 border-l-2 border-coffee-700/50 space-y-3">
      {replies.map((reply) => (
        <div key={reply.id} className="flex items-start gap-2.5">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-coffee-700 flex items-center justify-center overflow-hidden">
            {reply.user?.avatarUrl ? (
              <img src={reply.user.avatarUrl} alt={reply.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-coffee-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-coffee-200">{reply.name}</p>
            <p className="text-sm text-coffee-300 mt-0.5 break-words">{reply.content}</p>
            <p className="text-xs text-coffee-500 mt-1">
              {new Date(reply.createdAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      ))}

      {successMsg && (
        <p className="text-xs text-green-400">{successMsg}</p>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs text-coffee-500 hover:text-gold-400 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {replies.length > 0 ? `Ver ${replies.length} respuesta${replies.length !== 1 ? 's' : ''} · Responder` : 'Responder'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 pt-1">
          {!user && (
            <input
              type="text"
              placeholder="Tu nombre"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-coffee-800 border border-coffee-600 rounded-lg text-cream placeholder-coffee-500 focus:outline-none focus:border-gold-500"
            />
          )}
          <div className="flex gap-2">
            <textarea
              placeholder={user ? `Responder como ${user.name}…` : 'Escribe tu respuesta…'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="flex-1 px-3 py-2 text-sm bg-coffee-800 border border-coffee-600 rounded-lg text-cream placeholder-coffee-500 focus:outline-none focus:border-gold-500 resize-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="self-end p-2 bg-gold-600 hover:bg-gold-500 text-coffee-950 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={() => { setShowForm(false); setError(null); setContent(''); setGuestName(''); }}
            className="text-xs text-coffee-500 hover:text-coffee-300 transition-colors"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
