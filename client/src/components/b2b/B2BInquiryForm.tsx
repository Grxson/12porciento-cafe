import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, ShieldCheck, X } from 'lucide-react';
import { b2bApi } from '../../api';
import type { B2BInquiryReceipt, B2BQuoteDraft, B2BProduct } from '../../types';
import { calculateDraftEstimate } from '../../lib/b2b-quote';
import FocusTrap from '../FocusTrap';

interface Props {
  open: boolean;
  draft: B2BQuoteDraft;
  products: B2BProduct[];
  onClose: () => void;
  onCompleted: () => void;
}

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const initialContact = {
  businessName: '',
  rfc: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

const CONTACT_STORAGE_KEY = '12pct:b2b-contact:v1';

const contactFields: Array<{
  field: keyof typeof initialContact;
  label: string;
  placeholder: string;
  required: boolean;
  type?: 'email';
}> = [
  {
    field: 'businessName',
    label: 'Razón social',
    placeholder: 'Café Central SA de CV',
    required: true,
  },
  { field: 'rfc', label: 'RFC (opcional)', placeholder: 'CCE210101AA1', required: false },
  {
    field: 'contactName',
    label: 'Persona de contacto',
    placeholder: 'Nombre y apellido',
    required: true,
  },
  {
    field: 'contactEmail',
    label: 'Correo corporativo',
    placeholder: 'compras@empresa.com',
    required: true,
    type: 'email',
  },
  {
    field: 'contactPhone',
    label: 'Teléfono',
    placeholder: '55 1234 5678',
    required: true,
  },
];

const loadContactPrefill = () => {
  try {
    const value = window.localStorage.getItem(CONTACT_STORAGE_KEY);
    if (!value) return initialContact;
    const parsed = JSON.parse(value) as Partial<typeof initialContact>;
    return {
      businessName: parsed.businessName || '',
      rfc: parsed.rfc || '',
      contactName: parsed.contactName || '',
      contactEmail: parsed.contactEmail || '',
      contactPhone: parsed.contactPhone || '',
    };
  } catch {
    return initialContact;
  }
};

export default function B2BInquiryForm({ open, draft, products, onClose, onCompleted }: Props) {
  const [contact, setContact] = useState(loadContactPrefill);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<B2BInquiryReceipt | null>(null);
  const estimate = calculateDraftEstimate(draft.items, products);

  const close = useCallback(() => {
    if (submitting) return;
    setReceipt(null);
    if (receipt) setContact(initialContact);
    setError('');
    onClose();
  }, [onClose, receipt, submitting]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, open]);

  const update = (field: keyof typeof contact, value: string) => {
    setContact((current) => {
      const next = { ...current, [field]: value };
      try {
        const stored = window.localStorage.getItem(CONTACT_STORAGE_KEY);
        const existing = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
        window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify({ ...existing, ...next }));
      } catch {
        window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (
      !contact.businessName.trim() ||
      !contact.contactName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.contactEmail) ||
      !contact.contactPhone.trim() ||
      !draft.businessType ||
      !draft.items.length
    ) {
      setError('Completa los datos obligatorios para enviar la solicitud.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await b2bApi.createInquiry({
        requestId: draft.requestId,
        ...contact,
        businessType: draft.businessType,
        frequency: draft.frequency,
        items: draft.items,
      });
      setReceipt(response.data.data);
      window.localStorage.removeItem(CONTACT_STORAGE_KEY);
      onCompleted();
    } catch {
      setError('No pudimos enviar la solicitud. Tu selección sigue guardada para reintentar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[#160d09]/75 backdrop-blur-sm md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && close()}
        >
          <FocusTrap active={open} className="contents">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="b2b-form-title"
              initial={{ y: 36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 36, opacity: 0 }}
              className="max-h-[92dvh] w-full overflow-y-auto bg-[#F4EFE5] pb-[env(safe-area-inset-bottom)] text-[#27170F] md:max-w-5xl md:border md:border-[#D0A45D]/60"
            >
              <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d9cbb9] bg-[#F4EFE5]/95 px-5 py-4 backdrop-blur md:px-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#7D4D1F]">
                    {receipt ? 'Solicitud registrada' : 'Último paso'}
                  </p>
                  <h2 id="b2b-form-title" className="mt-1 font-serif text-2xl">
                    {receipt ? 'Tu mesa quedó reservada' : 'Cuéntanos de tu operación'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  aria-label="Cerrar"
                  className="action-focus grid h-10 w-10 place-items-center border border-[#cdbca6] disabled:cursor-wait disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {receipt ? (
                <div className="mx-auto max-w-2xl px-6 py-12 text-center md:py-16">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-[#7D4D1F]" />
                  <p className="mt-6 text-sm uppercase tracking-[0.2em] text-[#725F50]">
                    Folio {receipt.folio}
                  </p>
                  <h3 className="mt-3 font-serif text-4xl">Gracias por elegir café con origen.</h3>
                  <p className="mx-auto mt-4 max-w-lg leading-7 text-[#725F50]">
                    Recibimos tu selección estimada en {money.format(receipt.estimatedSubtotal)}{' '}
                    MXN. Un especialista la revisará y te contactará en menos de 24 horas hábiles.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="action-focus mt-8 bg-[#27170F] px-8 py-3 text-xs uppercase tracking-[0.18em] text-[#F4EFE5]"
                  >
                    Volver al catálogo
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={submit}
                  aria-busy={submitting}
                  className="grid min-w-0 md:grid-cols-[minmax(0,1fr)_320px]"
                >
                  <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 md:px-8 md:py-8">
                    {contactFields.map(({ field, label, placeholder, required, type }, index) => (
                      <label key={field} className={index === 0 ? 'sm:col-span-2' : undefined}>
                        <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#7D4D1F]">
                          {label}
                        </span>
                        <input
                          required={required}
                          type={type || 'text'}
                          value={contact[field]}
                          onChange={(event) => update(field, event.target.value)}
                          placeholder={placeholder}
                          className="action-focus w-full border border-[#cdbca6] bg-[#fffdf8] px-4 py-3 text-sm placeholder:text-[#9b8979]"
                        />
                      </label>
                    ))}
                    {error && (
                      <p role="alert" className="sm:col-span-2 text-sm text-red-700">
                        {error}
                      </p>
                    )}
                  </div>

                  <aside className="border-t border-[#d9cbb9] bg-[#eadfce] px-6 py-7 md:border-l md:border-t-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#7D4D1F]">
                      Resumen
                    </p>
                    <p className="mt-2 font-serif text-3xl">{money.format(estimate.subtotal)}</p>
                    <p className="mt-1 text-xs text-[#725F50]">Estimado antes de IVA</p>
                    <dl className="mt-6 space-y-3 border-y border-[#cdbca6] py-5 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#725F50]">Productos</dt>
                        <dd>{draft.items.length}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#725F50]">Unidades</dt>
                        <dd>{estimate.itemCount}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#725F50]">Frecuencia</dt>
                        <dd className="capitalize">{draft.frequency}</dd>
                      </div>
                    </dl>
                    <div className="mt-5 space-y-3 text-xs leading-5 text-[#725F50]">
                      <p className="flex gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#7D4D1F]" />
                        Respuesta en menos de 24 horas hábiles.
                      </p>
                      <p className="flex gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7D4D1F]" />
                        El precio final se confirma con disponibilidad y logística.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="action-focus mt-6 w-full bg-[#27170F] px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#F4EFE5] disabled:opacity-50"
                    >
                      {submitting ? 'Enviando…' : 'Solicitar revisión'}
                    </button>
                  </aside>
                </form>
              )}
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
