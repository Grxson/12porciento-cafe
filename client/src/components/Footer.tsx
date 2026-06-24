import { Link } from 'react-router-dom';
import { Instagram, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-coffee-100 to-coffee-50 dark:from-coffee-900 dark:to-coffee-950 border-t border-coffee-200/60 dark:border-coffee-800/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex flex-col leading-none mb-4">
              <span className="font-serif text-3xl font-bold text-coffee-900 dark:text-cream">12%</span>
              <span className="text-[9px] tracking-[0.3em] text-gold-600 dark:text-gold-500 uppercase">doce por ciento</span>
            </Link>
            <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed max-w-xs">
              Solo el 12% del café producido en el mundo es de especialidad. Ese es nuestro universo.
              Origen único, trazabilidad total, directo del productor a tu taza.
            </p>
            <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-[0.25em] mt-4">
              Tostado en México · Desde 2024
            </p>
            <div className="flex gap-4 mt-6">
              <div className="w-11 h-11 border border-coffee-200 dark:border-coffee-700 hover:border-gold-500/40 flex items-center justify-center transition-colors">
                <a href="#" aria-label="Instagram" className="text-coffee-600 dark:text-coffee-400 hover:text-gold-500 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
              <div className="w-11 h-11 border border-coffee-200 dark:border-coffee-700 hover:border-gold-500/40 flex items-center justify-center transition-colors">
                <a href="mailto:hola@12porciento.com" aria-label="Correo electrónico" className="text-coffee-600 dark:text-coffee-400 hover:text-gold-500 transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs tracking-widest uppercase text-gold-600 dark:text-gold-500 mb-5">Tienda</h4>
            <ul className="space-y-3">
              {[
                { to: '/tienda', label: 'Todos los cafés' },
                { to: '/paquetes', label: 'Paquetes' },
                { to: '/recetas', label: 'Recetas de preparación' },
                { to: '/suscripciones', label: 'Suscripciones' },
                { to: '/carrito', label: 'Carrito' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-coffee-700 dark:text-coffee-300 hover:text-coffee-950 dark:hover:text-cream text-sm transition-colors inline-flex items-center min-h-[44px]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs tracking-widest uppercase text-gold-600 dark:text-gold-500 mb-5">Marca</h4>
            <ul className="space-y-3">
              {[
                { to: '/nosotros', label: 'Nosotros' },
                { to: '/nosotros#proceso', label: 'Nuestro proceso' },
                { to: '/nosotros#origenes', label: 'Orígenes' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-coffee-700 dark:text-coffee-300 hover:text-coffee-950 dark:hover:text-cream text-sm transition-colors inline-flex items-center min-h-[44px]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-coffee-200 dark:border-coffee-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-coffee-600 dark:text-coffee-400 text-xs">
            © {new Date().getFullYear()} Café 12% — Todos los derechos reservados.
          </p>
          <p className="text-coffee-600 dark:text-coffee-400 text-xs">
            Café de especialidad · México
          </p>
        </div>
      </div>
    </footer>
  );
}
