import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  FileCheck2,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  Send,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { b2bApi } from '../api';
import type { B2BInquiry, B2BInquiryStatus, B2BQuote, B2BQuoteItem } from '../types';
import AdminErrorState from './components/AdminErrorState';
import AdminSkeleton from './components/AdminSkeleton';
import { useModuleToast } from './context/ModuleContext';
import { B2B_STATUS, QUOTE_STATUS, formatB2BMoney } from './b2b-ui';

type InquiryDetail = B2BInquiry & {
  company?: { id: string; businessName: string } | null;
  order?: { id: string; status: string; total: number } | null;
};

const transitions: Record<B2BInquiryStatus, B2BInquiryStatus[]> = {
  NEW: ['REVIEWING', 'LOST'],
  REVIEWING: ['QUOTED', 'LOST'],
  QUOTED: ['NEGOTIATING', 'WON', 'LOST'],
  NEGOTIATING: ['QUOTED', 'WON', 'LOST'],
  WON: [],
  LOST: [],
};

const defaultValidUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
};

export default function B2BInquiryDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addToast } = useModuleToast();
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [quoteItems, setQuoteItems] = useState<B2BQuoteItem[]>([]);
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [paymentTerms, setPaymentTerms] = useState('Pago a 15 días');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [note, setNote] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await b2bApi.inquiryDetail(id);
      const data = response.data.data as InquiryDetail;
      setInquiry(data);
      setQuoteItems(
        data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      );
    } catch {
      setError('No fue posible cargar la solicitud.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const quoteSubtotal = useMemo(
    () => quoteItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [quoteItems],
  );

  const updateStatus = async (status: B2BInquiryStatus) => {
    if (!inquiry) return;
    if (status === 'LOST' && !lostReason.trim()) {
      addToast('Escribe el motivo de pérdida.', 'error');
      return;
    }
    setWorking(`status-${status}`);
    try {
      await b2bApi.updateInquiryStatus(inquiry.id, {
        status,
        ...(status === 'LOST' ? { lostReason } : {}),
      });
      addToast(`Solicitud movida a ${B2B_STATUS[status].label}.`, 'success');
      await load();
    } catch {
      addToast('La transición no está permitida.', 'error');
    } finally {
      setWorking('');
    }
  };

  const addNote = async () => {
    if (!inquiry || !note.trim()) return;
    setWorking('note');
    try {
      await b2bApi.addActivity(inquiry.id, note.trim());
      setNote('');
      addToast('Nota agregada.', 'success');
      await load();
    } catch {
      addToast('No fue posible guardar la nota.', 'error');
    } finally {
      setWorking('');
    }
  };

  const createQuote = async () => {
    if (!inquiry) return;
    setWorking('quote');
    try {
      await b2bApi.createQuote(inquiry.id, {
        items: quoteItems.map((item) => ({
          ...item,
          subtotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
        })),
        validUntil: new Date(`${validUntil}T23:59:59`).toISOString(),
        paymentTerms,
        notes: quoteNotes,
      });
      addToast('Nueva versión de cotización creada.', 'success');
      await load();
    } catch {
      addToast('Revisa precios y vigencia.', 'error');
    } finally {
      setWorking('');
    }
  };

  const quoteAction = async (quote: B2BQuote, action: 'send' | 'accept') => {
    setWorking(`${action}-${quote.id}`);
    try {
      if (action === 'send') {
        await b2bApi.sendQuote(quote.id);
        addToast('Cotización enviada por correo.', 'success');
      } else {
        await b2bApi.acceptQuote(quote.id);
        addToast('Aceptación registrada.', 'success');
      }
      await load();
    } catch {
      addToast(
        action === 'send'
          ? 'El correo no pudo enviarse; el borrador se conservó.'
          : 'No fue posible registrar la aceptación.',
        'error',
      );
    } finally {
      setWorking('');
    }
  };

  const convert = async () => {
    if (!inquiry) return;
    setWorking('convert');
    try {
      await b2bApi.convertInquiry(inquiry.id);
      addToast('Empresa y pedido creados.', 'success');
      await load();
    } catch {
      addToast('Se requiere una cotización aceptada y no convertida.', 'error');
    } finally {
      setWorking('');
    }
  };

  if (loading) return <AdminSkeleton rows={8} />;
  if (error || !inquiry) return <AdminErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/b2b')}
        className="flex items-center gap-2 text-sm text-coffee-500 hover:text-gold-600"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al pipeline
      </button>

      <header className="flex flex-col justify-between gap-5 border-b border-coffee-200 pb-6 dark:border-coffee-800 xl:flex-row xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`border px-2.5 py-1 text-xs font-medium ${B2B_STATUS[inquiry.status].color}`}
            >
              {B2B_STATUS[inquiry.status].label}
            </span>
            <span className="text-xs uppercase tracking-wider text-gold-700 dark:text-gold-400">
              {inquiry.folio}
            </span>
          </div>
          <h1 className="mt-3 font-serif text-4xl text-coffee-950 dark:text-cream">
            {inquiry.empresa}
          </h1>
          <p className="mt-2 text-sm text-coffee-500">
            {formatB2BMoney(inquiry.estimatedSubtotal)} estimados · {inquiry.items.length} partidas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transitions[inquiry.status].map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => updateStatus(status)}
              disabled={Boolean(working)}
              className={`border px-4 py-2 text-xs font-semibold uppercase tracking-wider ${B2B_STATUS[status].color} disabled:opacity-50`}
            >
              {B2B_STATUS[status].label}
            </button>
          ))}
          {inquiry.status === 'WON' && !inquiry.order && (
            <button
              type="button"
              onClick={convert}
              disabled={Boolean(working)}
              className="bg-gold-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-coffee-950 disabled:opacity-50"
            >
              Convertir a empresa y pedido
            </button>
          )}
        </div>
      </header>

      {transitions[inquiry.status].includes('LOST') && (
        <label className="block max-w-xl">
          <span className="mb-1 block text-xs uppercase tracking-wider text-coffee-500">
            Motivo si se pierde
          </span>
          <input
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="Precio, tiempos, sin respuesta…"
            className="w-full border border-coffee-200 bg-white px-3 py-2 text-sm dark:border-coffee-700 dark:bg-coffee-900"
          />
        </label>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="border border-coffee-200 bg-white dark:border-coffee-800 dark:bg-coffee-900">
            <div className="border-b border-coffee-200 px-5 py-4 dark:border-coffee-800">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-400">
                Selección original
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-coffee-50 text-left text-xs uppercase tracking-wider text-coffee-500 dark:bg-coffee-950/40">
                  <tr>
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3">Cantidad</th>
                    <th className="px-5 py-3">Precio estimado</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiry.items.map((item) => (
                    <tr key={item.id} className="border-t border-coffee-100 dark:border-coffee-800">
                      <td className="px-5 py-4">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-coffee-500">{item.sku || 'Sin SKU'}</p>
                      </td>
                      <td className="px-5 py-4">{item.quantity}</td>
                      <td className="px-5 py-4">{formatB2BMoney(item.unitPrice)}</td>
                      <td className="px-5 py-4 text-right font-medium">
                        {formatB2BMoney(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-400">
                  Nueva cotización
                </p>
                <h2 className="mt-1 font-serif text-2xl">Preparar versión comercial</h2>
              </div>
              <p className="font-serif text-2xl">{formatB2BMoney(quoteSubtotal)}</p>
            </div>
            <div className="mt-5 space-y-2">
              {quoteItems.map((item, index) => (
                <div
                  key={item.productId}
                  className="grid gap-2 border border-coffee-100 p-3 dark:border-coffee-800 sm:grid-cols-[1fr_100px_130px]"
                >
                  <p className="self-center text-sm font-medium">{item.productName}</p>
                  <input
                    aria-label={`Cantidad ${item.productName}`}
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      setQuoteItems((current) =>
                        current.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, quantity: Number(event.target.value) || 1 }
                            : entry,
                        ),
                      )
                    }
                    className="border border-coffee-200 bg-transparent px-3 py-2 text-sm dark:border-coffee-700"
                  />
                  <input
                    aria-label={`Precio ${item.productName}`}
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(event) =>
                      setQuoteItems((current) =>
                        current.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, unitPrice: Number(event.target.value) || 0 }
                            : entry,
                        ),
                      )
                    }
                    className="border border-coffee-200 bg-transparent px-3 py-2 text-sm dark:border-coffee-700"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs text-coffee-500">Vigencia</span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  className="w-full border border-coffee-200 bg-transparent px-3 py-2 text-sm dark:border-coffee-700"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-coffee-500">Condiciones de pago</span>
                <input
                  value={paymentTerms}
                  onChange={(event) => setPaymentTerms(event.target.value)}
                  className="w-full border border-coffee-200 bg-transparent px-3 py-2 text-sm dark:border-coffee-700"
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-coffee-500">Notas comerciales</span>
              <textarea
                rows={3}
                value={quoteNotes}
                onChange={(event) => setQuoteNotes(event.target.value)}
                className="w-full resize-none border border-coffee-200 bg-transparent px-3 py-2 text-sm dark:border-coffee-700"
              />
            </label>
            <button
              type="button"
              onClick={createQuote}
              disabled={Boolean(working)}
              className="mt-4 flex items-center gap-2 bg-coffee-950 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-cream disabled:opacity-50 dark:bg-gold-500 dark:text-coffee-950"
            >
              <Plus className="h-4 w-4" /> Crear nueva versión
            </button>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Cotizaciones</h2>
            <div className="mt-3 space-y-3">
              {(inquiry.quotes || []).map((quote) => (
                <div
                  key={quote.id}
                  className="flex flex-col justify-between gap-4 border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-gold-600" />
                      <p className="font-medium">Cotización v{quote.version}</p>
                      <span className="border border-coffee-200 px-2 py-0.5 text-[10px] uppercase tracking-wider dark:border-coffee-700">
                        {QUOTE_STATUS[quote.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-coffee-500">
                      {formatB2BMoney(quote.total)} · vence{' '}
                      {new Date(quote.validUntil).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {quote.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => quoteAction(quote, 'send')}
                        disabled={Boolean(working)}
                        className="flex items-center gap-2 border border-gold-500 px-3 py-2 text-xs text-gold-700 dark:text-gold-400"
                      >
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </button>
                    )}
                    {quote.status === 'SENT' && (
                      <button
                        type="button"
                        onClick={() => quoteAction(quote, 'accept')}
                        disabled={Boolean(working)}
                        className="flex items-center gap-2 bg-emerald-600 px-3 py-2 text-xs text-white"
                      >
                        <Check className="h-3.5 w-3.5" /> Registrar aceptación
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!inquiry.quotes?.length && (
                <p className="border border-dashed border-coffee-300 p-6 text-center text-sm text-coffee-500 dark:border-coffee-700">
                  Aún no hay cotizaciones.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-400">
              Contacto
            </p>
            <div className="mt-4 space-y-4 text-sm">
              <p className="flex gap-3">
                <Building2 className="h-4 w-4 shrink-0 text-coffee-400" />
                <span>
                  {inquiry.contactoNombre}
                  <small className="block text-coffee-500">{inquiry.rfc}</small>
                </span>
              </p>
              <a
                href={`mailto:${inquiry.contactoEmail}`}
                className="flex gap-3 hover:text-gold-600"
              >
                <Mail className="h-4 w-4 shrink-0 text-coffee-400" />
                <span className="break-all">{inquiry.contactoEmail}</span>
              </a>
              <a
                href={`tel:${inquiry.contactoTelefono}`}
                className="flex gap-3 hover:text-gold-600"
              >
                <Phone className="h-4 w-4 shrink-0 text-coffee-400" />
                {inquiry.contactoTelefono}
              </a>
              <p className="flex gap-3">
                <CalendarClock className="h-4 w-4 shrink-0 text-coffee-400" />
                {new Date(inquiry.createdAt).toLocaleString('es-MX')}
              </p>
            </div>
            {inquiry.company && (
              <p className="mt-5 border-t border-coffee-100 pt-4 text-sm text-emerald-700 dark:border-coffee-800 dark:text-emerald-300">
                Empresa: {inquiry.company.businessName}
              </p>
            )}
            {inquiry.order && (
              <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                Pedido: {inquiry.order.id}
              </p>
            )}
          </section>

          <section className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-400">
              <MessageSquarePlus className="h-4 w-4" /> Nota interna
            </p>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Acuerdo de llamada, objeción, siguiente acción…"
              className="mt-3 w-full resize-none border border-coffee-200 bg-transparent px-3 py-2 text-sm dark:border-coffee-700"
            />
            <button
              type="button"
              onClick={addNote}
              disabled={!note.trim() || Boolean(working)}
              className="mt-2 w-full border border-coffee-300 py-2 text-xs font-medium disabled:opacity-40 dark:border-coffee-700"
            >
              Guardar nota
            </button>
          </section>

          <section className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-400">
              Actividad
            </p>
            <div className="mt-4 space-y-4">
              {(inquiry.activities || []).map((activity) => (
                <div
                  key={activity.id}
                  className="relative border-l border-coffee-200 pl-4 dark:border-coffee-700"
                >
                  <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-gold-500" />
                  <p className="text-sm leading-5">{activity.message}</p>
                  <p className="mt-1 text-[10px] text-coffee-500">
                    {new Date(activity.createdAt).toLocaleString('es-MX')}
                    {activity.admin ? ` · ${activity.admin.name}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
