import { Link } from 'react-router-dom';
import { Instagram, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-coffee-900 border-t border-coffee-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex flex-col leading-none mb-4">
              <span className="font-serif text-3xl font-bold text-cream">12%</span>
              <span className="text-[9px] tracking-[0.3em] text-gold-500 uppercase">doce por ciento</span>
            </Link>
            <p className="text-coffee-300 text-sm leading-relaxed max-w-xs">
              Solo el 12% del café producido en el mundo es de especialidad. Ese es nuestro universo.
              Origen único, trazabilidad total, directo del productor a tu taza.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-coffee-400 hover:text-gold-500 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:hola@12porciento.com" className="text-coffee-400 hover:text-gold-500 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs tracking-widest uppercase text-gold-500 mb-5">Tienda</h4>
            <ul className="space-y-3">
              {[
                { to: '/tienda', label: 'Todos los cafés' },
                { to: '/recetas', label: 'Recetas de preparación' },
                { to: '/suscripciones', label: 'Suscripciones' },
                { to: '/carrito', label: 'Carrito' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-coffee-300 hover:text-cream text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-widest uppercase text-gold-500 mb-5">Marca</h4>
            <ul className="space-y-3">
              {[
                { to: '/nosotros', label: 'Nosotros' },
                { to: '/nosotros#proceso', label: 'Nuestro proceso' },
                { to: '/nosotros#origenes', label: 'Orígenes' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-coffee-300 hover:text-cream text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-coffee-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-coffee-500 text-xs">
            © {new Date().getFullYear()} Café 12% — Todos los derechos reservados.
          </p>
          <p className="text-coffee-500 text-xs">
            Café de especialidad · México
          </p>
        </div>
      </div>
    </footer>
  );
}
