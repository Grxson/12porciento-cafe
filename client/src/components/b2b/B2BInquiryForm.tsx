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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\d\s\-+()]{7,}$/;
const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const contactFields: Array<{
  field: keyof typeof initialContact;
  label: string;
  placeholder: string;
  required: boolean;
  type?: 'email';
  validate?: (value: string) => string | null;
  minLength?: number;
}> = [
  {
    field: 'businessName',
    label: 'Razón social',
    placeholder: 'Café Central SA de CV',
    required: true,
    minLength: 3,
    validate: (value) => {
      if (!value.trim()) return 'Campo obligatorio';
      if (value.trim().length < 3) return 'Mínimo 3 caracteres';
      return null;
    },
  },
  {
    field: 'rfc',
    label: 'RFC (opcional)',
    placeholder: 'CCE210101AA1',
    required: false,
    validate: (value) => {
      if (!value.trim()) return null;
      if (!rfcRegex.test(value.trim().toUpperCase())) return 'RFC no válido';
      return null;
    },
  },
  {
    field: 'contactName',
    label: 'Persona de contacto',
    placeholder: 'Nombre y apellido',
    required: true,
    minLength: 3,
    validate: (value) => {
      if (!value.trim()) return 'Campo obligatorio';
      if (value.trim().length < 3) return 'Mínimo 3 caracteres';
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim()))
        return 'Solo se permiten letras y espacios';
      return null;
    },
  },
  {
    field: 'contactEmail',
    label: 'Correo corporativo',
    placeholder: 'compras@empresa.com',
    required: true,
    type: 'email',
    validate: (value) => {
      if (!value.trim()) return 'Campo obligatorio';
      if (!emailRegex.test(value.trim())) return 'Correo no válido';
      return null;
    },
  },
  {
    field: 'contactPhone',
    label: 'Teléfono',
    placeholder: '55 1234 5678',
    required: true,
    validate: (value) => {
      if (!value.trim()) return 'Campo obligatorio';
      if (!phoneRegex.test(value.trim())) return 'Teléfono no válido (7 dígitos mín.)';
      return null;
    },
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
  }, [close, open, submitting]);

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

  const validate = (): string | null => {
    const requiredFields = contactFields.filter((f) => f.required);

    for (const field of requiredFields) {
      const value = contact[field.field];
      const error = field.validate?.(value);
      if (error) return error;
    }

    if (contact.rfc.trim()) {
      const rfcError = contactFields.find((f) => f.field === 'rfc')?.validate?.(contact.rfc);
      if (rfcError) return rfcError;
    }

    if (!draft.businessType) return 'Selecciona el tipo de negocio';
    if (!draft.items.length) return 'Agrega cafés a tu selección';

    return null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
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
          className="fixed inset-0 z-[70] flex items-end justify-center bg-coffee-950/75 backdrop-blur-sm md:items-center md:p-6 dark:bg-coffee-950/75"
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
              className="max-h-[92dvh] w-full overflow-y-auto bg-cream pb-[env(safe-area-inset-bottom)] text-coffee-950 dark:bg-coffee-900 dark:text-cream md:max-w-5xl md:border md:border-gold-500/60 dark:md:border-gold-500/40"
            >
              <header className="sticky top-0 z-10 flex items-center justify-between border-b border-coffee-200 bg-cream/95 backdrop-blur dark:border-coffee-700 dark:bg-coffee-900/95 px-5 py-4 md:px-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-coffee-600 dark:text-gold-400">
                    {receipt ? 'Solicitud registrada' : 'Último paso'}
                  </p>
                  <h2
                    id="b2b-form-title"
                    className="mt-1 font-serif text-2xl text-coffee-950 dark:text-cream"
                  >
                    {receipt ? 'Tu mesa quedó reservada' : 'Cuéntanos de tu operación'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  aria-label="Cerrar"
                  className="action-focus grid h-10 w-10 place-items-center border border-coffee-300 text-coffee-950 hover:bg-coffee-100 disabled:cursor-wait disabled:opacity-40 dark:border-coffee-700 dark:text-cream dark:hover:bg-coffee-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              {receipt ? (
                <div className="mx-auto max-w-2xl px-6 py-12 text-center md:py-16">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-coffee-600 dark:text-gold-400" />
                  <p className="mt-6 text-sm uppercase tracking-[0.2em] text-coffee-600 dark:text-gold-400">
                    Folio {receipt.folio}
                  </p>
                  <h3 className="mt-3 font-serif text-4xl text-coffee-950 dark:text-cream">
                    Gracias por elegir café con origen.
                  </h3>
                  <p className="mx-auto mt-4 max-w-lg leading-7 text-coffee-600 dark:text-coffee-300">
                    Recibimos tu selección estimada en {money.format(receipt.estimatedSubtotal)}{' '}
                    MXN. Un especialista la revisará y te contactará en menos de 24 horas hábiles.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="action-focus mt-8 bg-coffee-950 px-8 py-3 text-xs uppercase tracking-[0.18em] text-cream hover:bg-coffee-800 dark:bg-gold-500 dark:text-coffee-950 dark:hover:bg-gold-400"
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
                        <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-coffee-600 dark:text-gold-400">
                          {label}
                        </span>
                        <input
                          required={required}
                          type={type || 'text'}
                          value={contact[field]}
                          onChange={(event) => update(field, event.target.value)}
                          placeholder={placeholder}
                          className="action-focus w-full border border-coffee-200 bg-coffee-50 px-4 py-3 text-sm text-coffee-950 placeholder:text-coffee-400 dark:border-coffee-700 dark:bg-coffee-800 dark:text-cream dark:placeholder:text-coffee-500"
                        />
                      </label>
                    ))}
                    {error && (
                      <p
                        role="alert"
                        className="sm:col-span-2 text-sm text-red-700 dark:text-red-400"
                      >
                        {error}
                      </p>
                    )}
                  </div>

                  <aside className="border-t border-coffee-200 bg-coffee-100 px-6 py-7 dark:border-coffee-700 dark:bg-coffee-800 md:border-l md:border-t-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-coffee-600 dark:text-gold-400">
                      Resumen
                    </p>
                    <p className="mt-2 font-serif text-3xl text-coffee-950 dark:text-cream">
                      {money.format(estimate.subtotal)}
                    </p>
                    <p className="mt-1 text-xs text-coffee-600 dark:text-coffee-300">
                      Estimado antes de IVA
                    </p>
                    <dl className="mt-6 space-y-3 border-y border-coffee-200 py-5 text-sm dark:border-coffee-700">
                      <div className="flex justify-between gap-4 text-coffee-950 dark:text-cream">
                        <dt className="text-coffee-600 dark:text-coffee-300">Productos</dt>
                        <dd>{draft.items.length}</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-coffee-950 dark:text-cream">
                        <dt className="text-coffee-600 dark:text-coffee-300">Unidades</dt>
                        <dd>{estimate.itemCount}</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-coffee-950 dark:text-cream">
                        <dt className="text-coffee-600 dark:text-coffee-300">Frecuencia</dt>
                        <dd className="capitalize">{draft.frequency}</dd>
                      </div>
                    </dl>
                    <div className="mt-5 space-y-3 text-xs leading-5 text-coffee-600 dark:text-coffee-300">
                      <p className="flex gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-coffee-600 dark:text-gold-400" />
                        Respuesta en menos de 24 horas hábiles.
                      </p>
                      <p className="flex gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-coffee-600 dark:text-gold-400" />
                        El precio final se confirma con disponibilidad y logística.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="action-focus mt-6 w-full bg-coffee-950 px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream hover:bg-coffee-800 disabled:opacity-50 dark:bg-gold-500 dark:text-coffee-950 dark:hover:bg-gold-400"
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
