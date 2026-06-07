import { useEffect, useState } from 'react';
import { Star, Check, Trash2, MessageSquare, X } from 'lucide-react';
import { reviewsApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import ConfirmDialog from './components/ConfirmDialog';
import type { Review } from '../types';

type ReviewWithResponse = Review & { adminResponse?: string };

export default function AdminReviews() {
  const { addToast } = useModuleToast();
  const [reviews, setReviews] = useState<ReviewWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    reviewsApi.adminList()
      .then((r) => { setReviews(r.data.data); })
      .catch(() => addToast('Error al cargar reseñas', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const approve = async (id: string) => {
    try {
      await reviewsApi.approve(id);
      addToast('Reseña aprobada', 'success');
      load();
    } catch {
      addToast('Error al aprobar', 'error');
    }
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await reviewsApi.delete(id);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      addToast('Reseña eliminada', 'success');
      load();
    } catch {
      addToast('Error al eliminar', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const submitResponse = async (id: string) => {
    if (!responseText.trim()) return;
    try {
      await reviewsApi.respond(id, responseText);
      setResponding(null);
      setResponseText('');
      addToast('Respuesta enviada', 'success');
      load();
    } catch {
      addToast('Error al enviar respuesta', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const approveSelected = async () => {
    setBulkBusy(true);
    let ok = 0;
    for (const id of Array.from(selected)) {
      try { await reviewsApi.approve(id); ok++; } catch { /* keep going */ }
    }
    setBulkBusy(false);
    setSelected(new Set());
    addToast(`${ok} reseña(s) aprobada(s)`, ok > 0 ? 'success' : 'error');
    load();
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true;
  });

  const pendingSelected = filtered.filter((r) => !r.isApproved && selected.has(r.id)).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Reseñas</h1>
          <p className="text-coffee-400 text-sm mt-1">{reviews.filter((r) => !r.isApproved).length} pendientes</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 tracking-wider uppercase transition-all ${
                filter === f ? 'bg-gold-500 text-coffee-950' : 'border border-coffee-700 text-coffee-400 hover:text-cream'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Aprobadas'}
            </button>
          ))}
        </div>
      </div>

      {pendingSelected > 0 && (
        <div className="bg-gold-500/10 border border-gold-500/30 p-3 flex items-center justify-between mb-4">
          <span className="text-sm text-gold-400">{pendingSelected} seleccionada(s)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
              className="px-3 py-1 text-xs border border-coffee-700 text-coffee-400 hover:text-cream transition-colors disabled:opacity-50"
            >
              Limpiar
            </button>
            <button
              onClick={approveSelected}
              disabled={bulkBusy}
              className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Check size={12} /> Aprobar seleccionadas
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No hay reseñas.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-coffee-900 border border-coffee-800 p-5">
              <div className="flex items-start justify-between gap-4">
                {!r.isApproved && (
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="w-4 h-4 accent-gold-500 mt-1 shrink-0"
                    aria-label="Seleccionar reseña"
                  />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-gold-500 text-gold-500' : 'text-coffee-700'}`} />
                      ))}
                    </div>
                    <span className="text-cream text-sm font-medium">{r.name}</span>
                    <span className="text-coffee-500 text-xs">{r.email}</span>
                    {r.product && <span className="text-coffee-400 text-xs">· {r.product.name}</span>}
                    {!r.isApproved && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400">Pendiente</span>
                    )}
                  </div>
                  <p className="text-coffee-200 text-sm leading-relaxed">{r.comment}</p>

                  {r.adminResponse && (
                    <div className="mt-3 pl-4 border-l-2 border-gold-500/30">
                      <p className="text-coffee-500 text-xs uppercase tracking-wider mb-1">Respuesta del equipo</p>
                      <p className="text-coffee-300 text-sm">{r.adminResponse}</p>
                    </div>
                  )}

                  {responding === r.id && (
                    <div className="mt-3 flex gap-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={2}
                        className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none resize-none"
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => submitResponse(r.id)}
                          className="px-3 py-2 bg-gold-500 text-coffee-950 text-sm hover:bg-gold-400 transition-colors"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => { setResponding(null); setResponseText(''); }}
                          className="px-3 py-2 border border-coffee-700 text-coffee-400 hover:text-cream transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setResponding(r.id); setResponseText(''); }}
                    className="p-2 text-coffee-400 hover:text-gold-500 transition-colors"
                    title="Responder"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  {!r.isApproved && (
                    <button
                      onClick={() => approve(r.id)}
                      className="p-2 text-coffee-400 hover:text-green-400 transition-colors"
                      title="Aprobar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(r.id)}
                    className="p-2 text-coffee-400 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar reseña"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDangerous
        loading={deleting}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
