import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const mexicanStates = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz',
  'Yucatán','Zacatecas',
];

export default function ProfileSettings() {
  const user = useUser((s) => s.user);
  const updateProfile = useUser((s) => s.updateProfile);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', state: '', zipCode: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        zipCode: user.zipCode ?? '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Error al guardar cambios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="font-serif text-2xl text-cream mb-6">Datos personales</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Nombre *</label>
          <input name="name" required value={form.name} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Teléfono</label>
          <input name="phone" value={form.phone} onChange={handleChange} type="tel"
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="55 1234 5678" />
        </div>

        <h3 className="font-serif text-lg text-cream pt-4 border-t border-coffee-800">Dirección de envío</h3>

        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Calle y número</label>
          <input name="address" value={form.address} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="Calle, número, colonia" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Ciudad</label>
            <input name="city" value={form.city} onChange={handleChange}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">CP</label>
            <input name="zipCode" value={form.zipCode} onChange={handleChange}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
              placeholder="12345" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Estado</label>
          <select name="state" value={form.state} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors">
            <option value="">Seleccionar</option>
            {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> Guardado</> : loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </motion.div>
  );
}
