import type { B2BInquiryStatus, B2BQuoteStatus } from '../types';

export const B2B_STATUS: Record<
  B2BInquiryStatus,
  { label: string; short: string; color: string; dot: string }
> = {
  NEW: {
    label: 'Solicitud nueva',
    short: 'Nuevas',
    color: 'border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  REVIEWING: {
    label: 'En revisión',
    short: 'Revisión',
    color: 'border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  QUOTED: {
    label: 'Cotización enviada',
    short: 'Cotizadas',
    color: 'border-violet-400/35 bg-violet-400/10 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  NEGOTIATING: {
    label: 'En negociación',
    short: 'Negociación',
    color: 'border-orange-400/35 bg-orange-400/10 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  WON: {
    label: 'Ganada',
    short: 'Ganadas',
    color: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  LOST: {
    label: 'Perdida',
    short: 'Perdidas',
    color: 'border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
};

export const B2B_STATUS_ORDER = Object.keys(B2B_STATUS) as B2BInquiryStatus[];

export const QUOTE_STATUS: Record<B2BQuoteStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  EXPIRED: 'Vencida',
  SUPERSEDED: 'Reemplazada',
};

export const formatB2BMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
