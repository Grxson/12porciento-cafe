import { useCallback, useEffect, useState } from 'react';
import { Building2, Mail, Phone, Search, ShoppingBag } from 'lucide-react';
import { b2bApi } from '../api';
import type { B2BCompany } from '../types';
import AdminErrorState from './components/AdminErrorState';
import AdminSkeleton from './components/AdminSkeleton';

type CompanyWithOrders = B2BCompany & {
  orders?: Array<{ id: string; total: number; status: string; createdAt: string }>;
};

export default function B2BCompanies() {
  const [companies, setCompanies] = useState<CompanyWithOrders[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await b2bApi.companies(search ? { search } : undefined);
      setCompanies(response.data.data);
    } catch {
      setError('No fue posible cargar las empresas B2B.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold-600">Cartera B2B</p>
          <h1 className="mt-2 font-serif text-4xl">Empresas</h1>
          <p className="mt-1 text-sm text-coffee-500">
            Sólo aparecen al ganar una oportunidad y aceptar su cotización.
          </p>
        </div>
        <label className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Empresa, RFC o email…"
            className="w-full border border-coffee-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-coffee-700 dark:bg-coffee-900"
          />
        </label>
      </header>

      {loading ? (
        <AdminSkeleton rows={6} />
      ) : error ? (
        <AdminErrorState error={error} onRetry={load} />
      ) : companies.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {companies.map((company) => (
            <article
              key={company.id}
              className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center bg-gold-500/15 text-gold-700 dark:text-gold-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-right text-xs text-coffee-500">
                  <p>{company._count?.orders || 0} pedidos</p>
                  <p>{company._count?.inquiries || 0} oportunidades</p>
                </div>
              </div>
              <h2 className="mt-5 font-serif text-2xl">{company.businessName}</h2>
              <p className="mt-1 text-xs uppercase tracking-wider text-coffee-500">{company.rfc}</p>
              <div className="mt-5 space-y-3 border-t border-coffee-100 pt-4 text-sm dark:border-coffee-800">
                <p className="font-medium">{company.contactName}</p>
                <a
                  href={`mailto:${company.contactEmail}`}
                  className="flex items-center gap-2 break-all text-coffee-600 hover:text-gold-600 dark:text-coffee-300"
                >
                  <Mail className="h-4 w-4 shrink-0" /> {company.contactEmail}
                </a>
                <a
                  href={`tel:${company.contactPhone}`}
                  className="flex items-center gap-2 text-coffee-600 hover:text-gold-600 dark:text-coffee-300"
                >
                  <Phone className="h-4 w-4" /> {company.contactPhone}
                </a>
              </div>
              {company.orders?.[0] && (
                <div className="mt-5 flex items-center justify-between bg-coffee-50 px-3 py-2 text-xs dark:bg-coffee-950/40">
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5" /> Último pedido
                  </span>
                  <span>{company.orders[0].status}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-coffee-300 py-20 text-center dark:border-coffee-700">
          <Building2 className="mx-auto h-10 w-10 text-coffee-400" />
          <p className="mt-3 text-sm text-coffee-500">Aún no hay empresas convertidas.</p>
        </div>
      )}
    </div>
  );
}
