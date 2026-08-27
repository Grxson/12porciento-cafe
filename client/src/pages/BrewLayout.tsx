/**
 * 12% Brew — Layout shell.
 *
 * Renders a sub-navigation bar (mobile-first, horizontally scrollable) and
 * an Outlet for the matched child route. Designed to live INSIDE the
 * existing PublicLayout (so the global Navbar/Footer/BottomNav remain).
 */

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Coffee, BookOpen, FlaskConical, Beaker, ChevronRight } from 'lucide-react';

interface SubItem {
  to: string;
  label: string;
  icon: typeof Coffee;
  /** When true, icon-only on mobile (saves space). */
  compact?: boolean;
}

const SUB_ITEMS: SubItem[] = [
  { to: '/brew', label: 'Inicio', icon: Coffee },
  { to: '/brew/preparar', label: 'Preparar', icon: Beaker },
  { to: '/brew/recetas', label: 'Recetas', icon: BookOpen },
  { to: '/brew/sesiones', label: 'Mis preparaciones', icon: FlaskConical },
  { to: '/brew/dial-in', label: 'Dial-in', icon: ChevronRight },
  { to: '/brew/cafes', label: 'Cafés', icon: Coffee },
  { to: '/brew/equipo', label: 'Mi equipo', icon: Coffee },
];

export default function BrewLayout() {
  const { pathname } = useLocation();

  return (
    <div className="brew-layout">
      {/* ── Sub-navigation ─────────────────────────────────────────── */}
      <nav
        aria-label="12% Brew"
        className="sticky top-[calc(var(--app-header-height)+var(--app-safe-top))] z-30 border-b border-coffee-200/60 bg-coffee-50/95 backdrop-blur dark:border-coffee-800/60 dark:bg-coffee-950/95"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-2 sm:gap-2 sm:px-4">
          <div className="flex shrink-0 items-center gap-2 pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
              <Coffee className="h-4 w-4" />
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-coffee-700 dark:text-coffee-300 sm:inline">
              12% Brew
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {SUB_ITEMS.map(({ to, label, icon: Icon }) => {
              // Match exact for /brew (Inicio) and prefix-match for the rest.
              const isActive = to === '/brew' ? pathname === '/brew' : pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/brew'}
                  className={() =>
                    [
                      'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                      'min-h-10 sm:min-h-9',
                      isActive
                        ? 'bg-gold-500 text-coffee-950 shadow-sm'
                        : 'text-coffee-600 hover:bg-coffee-100 hover:text-coffee-900 dark:text-coffee-300 dark:hover:bg-coffee-800 dark:hover:text-cream',
                    ].join(' ')
                  }
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="brew-main">
        <Outlet />
      </main>
    </div>
  );
}
