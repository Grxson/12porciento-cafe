import { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Users } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import { adminUsersApi } from '../api';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import AdminModal from './components/AdminModal';
import FormField from './components/FormField';
import ConfirmDialog from './components/ConfirmDialog';
import { useModuleToast } from './context/ModuleContext';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

function getAdminEmail(): string | null {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || null;
  } catch {
    return null;
  }
}

const emptyForm = { name: '', email: '', password: '' };

export default function AdminUsers() {
  const { addToast } = useModuleToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentEmail = getAdminEmail();

  const load = () => {
    setLoading(true);
    setListError('');
    adminUsersApi.list()
      .then((r) => setUsers(r.data))
      .catch(() => {
        setListError('Error al cargar usuarios admin');
        addToast('Error al cargar usuarios admin', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'El nombre es requerido';
    if (!form.email.trim()) return 'El email es requerido';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return 'Email inválido';
    if (!form.password) return 'La contraseña es requerida';
    if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      addToast(validationError, 'error');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await adminUsersApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setForm(emptyForm);
      setFormOpen(false);
      addToast('Usuario admin creado', 'success');
      load();
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Error al crear usuario admin';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await adminUsersApi.delete(id);
      addToast('Usuario admin eliminado', 'success');
      load();
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Error al eliminar usuario admin';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-8">
      <PageMeta title="Usuarios Admin" noSuffix />

      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Usuarios Admin</h1>
        </div>
      </div>
      <p className="text-coffee-500 dark:text-coffee-400 text-sm mb-6">
        Gestiona los usuarios con acceso al panel de administración.
      </p>

      <div className="mb-6">
        <button
          onClick={() => { setForm(emptyForm); setFormError(''); setFormOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear Admin
        </button>
      </div>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : listError ? (
        <AdminErrorState error={listError} onRetry={load} />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay usuarios admin registrados.</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-200 dark:border-coffee-800 text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Nombre</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Creado</th>
                <th className="text-right px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-coffee-200/50 dark:border-coffee-800/50 last:border-b-0 hover:bg-coffee-200/40 dark:hover:bg-coffee-800/40 transition-colors"
                >
                  <td className="px-5 py-4 text-coffee-900 dark:text-cream font-medium">{u.name}</td>
                  <td className="px-5 py-4 text-coffee-700 dark:text-coffee-300">{u.email}</td>
                  <td className="px-5 py-4 text-coffee-600 dark:text-coffee-400">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-4 text-right">
                    {u.email !== currentEmail && (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="text-coffee-600 dark:text-coffee-400 hover:text-red-400 transition-colors"
                        aria-label="Eliminar usuario admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={formOpen}
        title="Crear Admin"
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="create-admin-form"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-coffee-950 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="create-admin-form">
          <div className="space-y-4">
            <FormField
              label="Nombre"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v as string })}
              required
              placeholder="Nombre del admin"
            />
            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v as string })}
              required
              placeholder="admin@12porciento.com"
            />
            <FormField
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v as string })}
              required
              placeholder="Mínimo 6 caracteres"
            />
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar usuario admin"
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
