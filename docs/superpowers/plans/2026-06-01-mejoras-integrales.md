# Mejoras Integrales 12% — Plan de Implementación

> **Para agentes:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` o `superpowers:executing-plans`

**Goal:** Implementar 51 mejoras de UI/UX y funcionalidad en PWA y panel admin de Café 12 por Ciento.

**Architecture:** Monorepo pnpm con cliente Vite+React+TS y servidor Express+Prisma+SQLite. Fase 1 prioriza cambios sin migraciones DB complejas. Fases 2-4 agregan modelos y features progresivamente.

**Tech Stack:** React 18, Framer Motion, Tailwind CSS, Zustand, Prisma/SQLite, Express, Stripe, Docker

---

## MAPA DE ARCHIVOS — FASE 1

### Nuevos archivos (cliente)
- `client/src/context/ToastContext.tsx` — store Zustand para toasts
- `client/src/components/Toast.tsx` — componente toast visual
- `client/src/components/Breadcrumbs.tsx` — navegación breadcrumb
- `client/src/pages/NotFound.tsx` — página 404 branded
- `client/src/pages/Quiz.tsx` — coffee quiz interactivo
- `client/src/components/BrewingGuideModal.tsx` — modal métodos de preparación
- `client/src/components/TestimonialsSlider.tsx` — slider home
- `client/src/context/ThemeContext.tsx` — dark mode Zustand + CSS vars

### Modificados (cliente)
- `client/src/App.tsx` — agregar ruta /quiz, /404, ThemeProvider, ToastProvider
- `client/src/components/Navbar.tsx` — mobile drawer mejorado + breadcrumb
- `client/src/index.css` — variables CSS dark mode
- `client/src/pages/Home.tsx` — agregar TestimonialsSlider + RoastingSchedule
- `client/src/pages/ProductDetail.tsx` — integrar BrewingGuideModal
- `client/src/api/index.ts` — agregar endpoints nuevos

### Nuevos archivos (servidor)
- `server/src/routes/promoCodes.ts` — CRUD códigos descuento
- `server/src/routes/customers.ts` — búsqueda y vista clientes
- `server/src/routes/orderNotes.ts` — notas y timeline pedidos

### Modificados (servidor)
- `server/src/index.ts` — registrar routers nuevos
- `server/src/routes/orders.ts` — filtros avanzados (fecha, cliente, estado)
- `server/src/routes/reviews.ts` — respuesta admin a reseñas

### DB Schema (nuevos modelos)
- `PromoCode` — códigos descuento
- `OrderNote` — notas/timeline por pedido
- `Review.adminResponse` — campo respuesta admin

### Admin (cliente)
- `client/src/admin/PromoCodes.tsx` — gestor códigos descuento
- `client/src/admin/Customers.tsx` — búsqueda y detalle clientes
- `client/src/admin/OrderDetail.tsx` — notas + timeline pedido
- Modificar `client/src/admin/Orders.tsx` — filtros avanzados
- Modificar `client/src/admin/Reviews.tsx` — responder reseñas
- Modificar `client/src/admin/AdminLayout.tsx` — agregar rutas nuevas
- Modificar `client/src/App.tsx` — rutas admin nuevas

---

## FASE 1 — QUICK WINS + ALTO IMPACTO

---

### Tarea 1: Sistema de Toast Notifications

**Archivos:**
- Crear: `client/src/context/ToastContext.tsx`
- Crear: `client/src/components/Toast.tsx`
- Modificar: `client/src/App.tsx`

- [ ] **Paso 1: Crear store Zustand para toasts**

```tsx
// client/src/context/ToastContext.tsx
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
```

- [ ] **Paso 2: Crear componente Toast visual**

```tsx
// client/src/components/Toast.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: 'border-green-500/40 bg-green-900/20 text-green-300',
  error: 'border-red-500/40 bg-red-900/20 text-red-300',
  info: 'border-gold-500/40 bg-coffee-900 text-cream',
};

export default function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 border text-sm max-w-sm shadow-xl ${colors[t.type]}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Paso 3: Registrar ToastContainer en App.tsx**

En `client/src/App.tsx`, importar y agregar `<ToastContainer />` dentro del `<CartProvider>` antes de `<ScrollToTop />`:

```tsx
import ToastContainer from './components/Toast';

// dentro de App():
<CartProvider>
  <ToastContainer />
  <ScrollToTop />
  <Routes>
    {/* ... rutas existentes ... */}
  </Routes>
</CartProvider>
```

- [ ] **Paso 4: Commit**

```bash
git add client/src/context/ToastContext.tsx client/src/components/Toast.tsx client/src/App.tsx
git commit -m "feat: add toast notification system with Zustand"
```

---

### Tarea 2: Dark Mode Toggle

**Archivos:**
- Crear: `client/src/context/ThemeContext.tsx`
- Modificar: `client/src/index.css`
- Modificar: `client/src/components/Navbar.tsx`
- Modificar: `client/src/main.tsx`

- [ ] **Paso 1: Agregar variables CSS para dark mode en index.css**

Agregar al inicio de `client/src/index.css` antes de `@tailwind base`:

```css
:root {
  --bg-primary: theme('colors.coffee.50');
  --text-primary: theme('colors.coffee.900');
}

.dark {
  --bg-primary: theme('colors.coffee.950');
  --text-primary: theme('colors.cream');
  color-scheme: dark;
}
```

- [ ] **Paso 2: Crear ThemeContext con Zustand + persist**

```tsx
// client/src/context/ThemeContext.tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: 'cafe-12-theme' },
  ),
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useTheme((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return <>{children}</>;
}
```

- [ ] **Paso 3: Envolver App en ThemeProvider en main.tsx**

```tsx
// client/src/main.tsx  (modificar)
import { ThemeProvider } from './context/ThemeContext';

// wrap:
<ThemeProvider>
  <App />
</ThemeProvider>
```

- [ ] **Paso 4: Agregar botón toggle en Navbar**

En `client/src/components/Navbar.tsx`, importar `Sun, Moon` de lucide-react y `useTheme`:

```tsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// dentro del componente, antes del return:
const { dark, toggle } = useTheme();

// en el JSX, dentro de <div className="flex items-center gap-4">:
<button
  onClick={toggle}
  className="text-coffee-200 hover:text-cream transition-colors"
  aria-label="Cambiar tema"
>
  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
</button>
```

- [ ] **Paso 5: Commit**

```bash
git add client/src/context/ThemeContext.tsx client/src/index.css client/src/components/Navbar.tsx client/src/main.tsx
git commit -m "feat: add dark mode toggle with CSS variables and Zustand persist"
```

---

### Tarea 3: Página 404 Branded + Manejo de Errores

**Archivos:**
- Crear: `client/src/pages/NotFound.tsx`
- Modificar: `client/src/App.tsx`

- [ ] **Paso 1: Crear página 404**

```tsx
// client/src/pages/NotFound.tsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-coffee-950 flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Coffee className="w-16 h-16 text-gold-500/40 mx-auto mb-6" />
        <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-4">Error 404</p>
        <h1 className="font-serif text-7xl sm:text-9xl font-black text-cream leading-none mb-4">
          Oops
        </h1>
        <p className="font-serif italic text-2xl text-coffee-300 mb-3">esta página no existe</p>
        <p className="text-coffee-400 text-base mb-10 max-w-md mx-auto">
          Parece que este grano se perdió en el proceso. Regresa a la tienda para encontrar tu café perfecto.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">Ir al inicio</Link>
          <Link to="/tienda" className="btn-outline-dark">Ver la tienda</Link>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Paso 2: Registrar en App.tsx**

Reemplazar la catch-all route en `client/src/App.tsx`:

```tsx
import NotFound from './pages/NotFound';

// Reemplazar:
// <Route path="*" element={<Navigate to="/" replace />} />
// Con:
<Route path="*" element={<NotFound />} />
```

- [ ] **Paso 3: Commit**

```bash
git add client/src/pages/NotFound.tsx client/src/App.tsx
git commit -m "feat: add branded 404 page"
```

---

### Tarea 4: Breadcrumbs

**Archivos:**
- Crear: `client/src/components/Breadcrumbs.tsx`
- Modificar: `client/src/pages/ProductDetail.tsx`
- Modificar: `client/src/pages/Checkout.tsx`

- [ ] **Paso 1: Crear componente Breadcrumbs**

```tsx
// client/src/components/Breadcrumbs.tsx
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-coffee-500 mb-6">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-coffee-700" />}
          {crumb.to && i < crumbs.length - 1 ? (
            <Link to={crumb.to} className="hover:text-gold-500 transition-colors tracking-wider uppercase">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-coffee-400 tracking-wider uppercase">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Paso 2: Integrar en ProductDetail**

En `client/src/pages/ProductDetail.tsx`, después del `<div>` principal (línea ~83), antes del hero del producto:

```tsx
import Breadcrumbs from '../components/Breadcrumbs';

// Después del header del producto:
<Breadcrumbs crumbs={[
  { label: 'Inicio', to: '/' },
  { label: 'Tienda', to: '/tienda' },
  { label: product.name },
]} />
```

- [ ] **Paso 3: Commit**

```bash
git add client/src/components/Breadcrumbs.tsx client/src/pages/ProductDetail.tsx
git commit -m "feat: add breadcrumb navigation component"
```

---

### Tarea 5: Mobile Nav Mejorado

**Archivos:**
- Modificar: `client/src/components/Navbar.tsx`

- [ ] **Paso 1: Reemplazar Navbar con versión mejorada**

El nuevo Navbar agrega: cierre al hacer click fuera, overlay oscuro, animación slide más fluida, y links de usuario en mobile.

```tsx
// client/src/components/Navbar.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X, Sun, Moon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import UserMenu from './UserMenu';
import CartDrawer from './CartDrawer';

const links = [
  { to: '/tienda', label: 'Tienda' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/suscripciones', label: 'Suscripciones' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/quiz', label: 'Quiz' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.count());
  const openDrawer = useCart((s) => s.openDrawer);
  const { dark, toggle } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-coffee-950/98 backdrop-blur-sm shadow-lg shadow-coffee-950/20 border-b border-coffee-800/60'
          : 'bg-coffee-950/85 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-serif text-2xl font-bold text-cream tracking-tight">12%</span>
          <span className="text-[9px] tracking-[0.3em] text-gold-500 uppercase">doce por ciento</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm tracking-widest uppercase transition-colors duration-200 ${
                  isActive ? 'text-gold-500' : 'text-coffee-200 hover:text-cream'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="text-coffee-200 hover:text-cream transition-colors"
            aria-label="Cambiar tema"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <UserMenu />
          <button
            onClick={openDrawer}
            className="relative text-coffee-200 hover:text-cream transition-colors"
            aria-label="Carrito"
          >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-gold-500 text-coffee-950 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {count}
              </motion.span>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-coffee-200 hover:text-cream transition-colors"
            aria-label="Menú"
          >
            <AnimatePresence mode="wait">
              {open
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5" /></motion.span>
                : <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5" /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>

    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-coffee-950/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <motion.div
            ref={menuRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-coffee-900 border-l border-coffee-800 flex flex-col pt-20 pb-8 md:hidden"
          >
            <nav className="flex flex-col px-6 gap-1">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `py-3 text-sm tracking-widest uppercase border-b border-coffee-800/50 transition-colors ${
                      isActive ? 'text-gold-500' : 'text-coffee-200 hover:text-cream'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <CartDrawer />
    </>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add client/src/components/Navbar.tsx
git commit -m "feat: improve mobile nav with slide drawer, overlay, and close-on-outside-click"
```

---

### Tarea 6: Coffee Quiz — "¿Cuál es tu roast perfecto?"

**Archivos:**
- Crear: `client/src/pages/Quiz.tsx`
- Modificar: `client/src/App.tsx`

- [ ] **Paso 1: Crear página Quiz**

```tsx
// client/src/pages/Quiz.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Coffee } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: { label: string; value: string; emoji: string }[];
}

const questions: Question[] = [
  {
    id: 'time',
    question: '¿A qué hora tomas tu primer café?',
    options: [
      { label: 'Al despertar, urgente', value: 'early', emoji: '🌅' },
      { label: 'A media mañana', value: 'mid', emoji: '☀️' },
      { label: 'Después de comer', value: 'afternoon', emoji: '🌤️' },
      { label: 'En la noche, para disfrutar', value: 'night', emoji: '🌙' },
    ],
  },
  {
    id: 'flavor',
    question: '¿Qué sabores te gustan más en un café?',
    options: [
      { label: 'Chocolate y caramelo', value: 'chocolate', emoji: '🍫' },
      { label: 'Frutas y flores', value: 'fruity', emoji: '🍓' },
      { label: 'Nueces y especias', value: 'nutty', emoji: '🌰' },
      { label: 'Cítricos y acidez viva', value: 'citrus', emoji: '🍋' },
    ],
  },
  {
    id: 'body',
    question: '¿Qué cuerpo prefieres en tu taza?',
    options: [
      { label: 'Ligero, como té', value: 'light', emoji: '🍵' },
      { label: 'Equilibrado, redondo', value: 'medium', emoji: '⚖️' },
      { label: 'Denso y aterciopelado', value: 'full', emoji: '🫗' },
      { label: 'No sé, ¡sorpréndeme!', value: 'surprise', emoji: '✨' },
    ],
  },
  {
    id: 'method',
    question: '¿Cómo preparas tu café?',
    options: [
      { label: 'Espresso / cafetera', value: 'espresso', emoji: '☕' },
      { label: 'Pour over / V60', value: 'pourover', emoji: '🫖' },
      { label: 'Prensa francesa', value: 'french', emoji: '🏺' },
      { label: 'Lo que haya', value: 'any', emoji: '🤷' },
    ],
  },
];

type Answers = Record<string, string>;

function getResult(answers: Answers): { roast: string; process: string; label: string; desc: string; filter: string } {
  const fruity = answers.flavor === 'fruity' || answers.flavor === 'citrus';
  const lightBody = answers.body === 'light';
  const poorover = answers.method === 'pourover';

  if (fruity && (lightBody || poorover)) {
    return {
      roast: 'Ligero',
      process: 'Natural',
      label: 'El Explorador de Sabores',
      desc: 'Buscas complejidad, acidez viva y notas frutales. Un Natural o Anaeróbico de tueste ligero es tu ideal.',
      filter: '?roast=Ligero',
    };
  }
  if (answers.flavor === 'chocolate' || answers.body === 'full') {
    return {
      roast: 'Medio',
      process: 'Lavado',
      label: 'El Clásico Intenso',
      desc: 'Prefieres chocolates, caramelo y un cuerpo redondo. Un Lavado de tueste medio te dará equilibrio perfecto.',
      filter: '?roast=Medio',
    };
  }
  return {
    roast: 'Medio-Ligero',
    process: 'Honey',
    label: 'El Equilibrista',
    desc: 'Disfrutas lo mejor de dos mundos: dulzura natural con acidez controlada. Un Honey process es tuyo.',
    filter: '?roast=Medio-Ligero',
  };
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const q = questions[step];
  const result = done ? getResult(answers) : null;

  const answer = (value: string) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen bg-coffee-950 flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Coffee className="w-10 h-10 text-gold-500/60 mx-auto mb-4" />
          <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-2">Coffee Quiz</p>
          <h1 className="font-serif text-4xl text-cream">¿Cuál es tu roast perfecto?</h1>
        </div>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-coffee-500 text-xs tracking-widest uppercase">
                  {step + 1} / {questions.length}
                </span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-8 transition-all duration-300 ${i <= step ? 'bg-gold-500' : 'bg-coffee-800'}`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-cream text-xl mb-6">{q.question}</h2>

              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => answer(opt.value)}
                    className="flex flex-col items-center gap-2 p-5 border border-coffee-700 hover:border-gold-500 hover:bg-coffee-800/40 transition-all duration-200 text-center group"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-coffee-200 text-sm group-hover:text-cream transition-colors">{opt.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 text-coffee-500 hover:text-coffee-300 text-sm mt-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="border border-gold-500/30 bg-coffee-900/60 p-8 mb-6">
                <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-3">Tu perfil</p>
                <h2 className="font-serif text-3xl text-cream mb-2">{result!.label}</h2>
                <p className="text-coffee-300 mb-4">{result!.desc}</p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-coffee-800 text-coffee-200">Tueste: {result!.roast}</span>
                  <span className="px-3 py-1 bg-coffee-800 text-coffee-200">Proceso: {result!.process}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate(`/tienda${result!.filter}`)}
                  className="btn-primary flex items-center gap-2"
                >
                  Ver mis cafés <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setStep(0); setAnswers({}); setDone(false); }}
                  className="btn-outline-dark"
                >
                  Repetir quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Registrar ruta en App.tsx**

```tsx
import Quiz from './pages/Quiz';

// En Routes, antes de las rutas admin:
<Route path="/quiz" element={<Quiz />} />
```

- [ ] **Paso 3: Commit**

```bash
git add client/src/pages/Quiz.tsx client/src/App.tsx
git commit -m "feat: add coffee quiz with roast profile recommendation"
```

---

### Tarea 7: Brewing Guide Modal por Bean

**Archivos:**
- Crear: `client/src/components/BrewingGuideModal.tsx`
- Modificar: `client/src/pages/ProductDetail.tsx`

- [ ] **Paso 1: Crear BrewingGuideModal**

```tsx
// client/src/components/BrewingGuideModal.tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Thermometer, Coffee, Droplets } from 'lucide-react';
import type { Recipe } from '../types';

interface Props {
  recipes: Recipe[];
  open: boolean;
  onClose: () => void;
}

const methodIcons: Record<string, string> = {
  'V60': '🫖', 'Pour Over': '🫖', 'Espresso': '☕',
  'Prensa Francesa': '🏺', 'AeroPress': '🔄', 'Chemex': '⚗️',
  'Moka': '🫙', 'Cold Brew': '🧊',
};

export default function BrewingGuideModal({ recipes, open, onClose }: Props) {
  const [active, setActive] = useState(0);
  const recipe = recipes[active];

  if (!recipe) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-coffee-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-4 top-16 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl z-50 bg-coffee-900 border border-coffee-700 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-coffee-800">
              <div>
                <p className="text-gold-500 text-xs tracking-[0.3em] uppercase">Guía de Preparación</p>
                <h3 className="text-cream font-serif text-xl mt-0.5">{recipe.title}</h3>
              </div>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {recipes.length > 1 && (
              <div className="flex gap-2 px-6 pt-4">
                {recipes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`px-3 py-1.5 text-xs tracking-widest uppercase transition-all ${
                      i === active
                        ? 'bg-gold-500 text-coffee-950'
                        : 'border border-coffee-700 text-coffee-400 hover:text-cream'
                    }`}
                  >
                    {methodIcons[r.method] ?? '☕'} {r.method}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-coffee-800/50 p-3 text-center">
                  <Thermometer className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-400 text-xs uppercase tracking-wider">Temp</p>
                  <p className="text-cream text-sm font-medium mt-0.5">{recipe.temp}</p>
                </div>
                <div className="bg-coffee-800/50 p-3 text-center">
                  <Coffee className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-400 text-xs uppercase tracking-wider">Ratio</p>
                  <p className="text-cream text-sm font-medium mt-0.5">{recipe.ratio}</p>
                </div>
                <div className="bg-coffee-800/50 p-3 text-center">
                  <Droplets className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                  <p className="text-coffee-400 text-xs uppercase tracking-wider">Molido</p>
                  <p className="text-cream text-sm font-medium mt-0.5">{recipe.grind}</p>
                </div>
              </div>

              <h4 className="text-coffee-400 text-xs tracking-[0.3em] uppercase mb-3">Pasos</h4>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full border border-gold-500/40 text-gold-500 text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-coffee-300 text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Paso 2: Integrar en ProductDetail**

En `client/src/pages/ProductDetail.tsx`, agregar estado y botón:

```tsx
import BrewingGuideModal from '../components/BrewingGuideModal';

// Estado:
const [brewingOpen, setBrewingOpen] = useState(false);

// Botón (cerca del botón de añadir al carrito):
{product.recipes && product.recipes.length > 0 && (
  <button
    onClick={() => setBrewingOpen(true)}
    className="btn-outline w-full flex items-center justify-center gap-2"
  >
    <BookOpen className="w-4 h-4" />
    Guía de Preparación
  </button>
)}

// Al final del return, antes del cierre del div principal:
<BrewingGuideModal
  recipes={product.recipes || []}
  open={brewingOpen}
  onClose={() => setBrewingOpen(false)}
/>
```

- [ ] **Paso 3: Commit**

```bash
git add client/src/components/BrewingGuideModal.tsx client/src/pages/ProductDetail.tsx
git commit -m "feat: add brewing guide modal with method steps on product detail"
```

---

### Tarea 8: Testimonials Slider en Home

**Archivos:**
- Crear: `client/src/components/TestimonialsSlider.tsx`
- Modificar: `client/src/pages/Home.tsx`

- [ ] **Paso 1: Crear TestimonialsSlider**

```tsx
// client/src/components/TestimonialsSlider.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    name: 'Mariana R.',
    city: 'CDMX',
    rating: 5,
    text: 'El primer sorbo y entendí la diferencia. El Honey de Oaxaca tiene notas de miel y durazno que nunca había probado en un café mexicano.',
    plan: 'Suscriptor Explorador',
  },
  {
    name: 'Carlos M.',
    city: 'Monterrey',
    rating: 5,
    text: 'Recibo mi suscripción cada mes y siempre me sorprenden. La trazabilidad es real — sé exactamente de dónde viene cada grano.',
    plan: 'Suscriptor Connoisseur',
  },
  {
    name: 'Sofía T.',
    city: 'Guadalajara',
    rating: 5,
    text: 'Empecé siendo escéptica del café de especialidad. Hoy no puedo tomar otro tipo de café. 12% me cambió el paladar.',
    plan: 'Comprador frecuente',
  },
  {
    name: 'Diego L.',
    city: 'Puebla',
    rating: 5,
    text: 'El tueste a pedido marca la diferencia. Llega fresco, fragante, y el empaque es hermoso. Gran regalo también.',
    plan: 'Suscriptor Fundador',
  },
];

export default function TestimonialsSlider() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const prev = () => { setDir(-1); setIdx((i) => (i - 1 + testimonials.length) % testimonials.length); };
  const next = () => { setDir(1); setIdx((i) => (i + 1) % testimonials.length); };

  useEffect(() => {
    const t = setInterval(() => { setDir(1); setIdx((i) => (i + 1) % testimonials.length); }, 5000);
    return () => clearInterval(t);
  }, []);

  const t = testimonials[idx];

  return (
    <section className="bg-coffee-900/60 py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-4">Lo que dicen</p>
        <h2 className="font-serif text-4xl text-cream mb-12">Nuestros Clientes</h2>

        <div className="relative min-h-[200px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold-500 text-gold-500" />
                ))}
              </div>
              <blockquote className="font-serif italic text-xl text-coffee-200 leading-relaxed mb-6 max-w-xl">
                "{t.text}"
              </blockquote>
              <p className="text-cream font-medium text-sm">{t.name}</p>
              <p className="text-coffee-500 text-xs tracking-widest uppercase mt-1">
                {t.city} · {t.plan}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={prev} className="p-2 border border-coffee-700 text-coffee-400 hover:text-cream hover:border-coffee-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-gold-500 scale-125' : 'bg-coffee-700'}`}
              />
            ))}
          </div>
          <button onClick={next} className="p-2 border border-coffee-700 text-coffee-400 hover:text-cream hover:border-coffee-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Paso 2: Agregar a Home.tsx**

En `client/src/pages/Home.tsx`, importar y agregar después de la sección de pilares:

```tsx
import TestimonialsSlider from '../components/TestimonialsSlider';

// Después de la sección "pillars" y antes de featured products:
<TestimonialsSlider />
```

- [ ] **Paso 3: Commit**

```bash
git add client/src/components/TestimonialsSlider.tsx client/src/pages/Home.tsx
git commit -m "feat: add auto-rotating testimonials slider on homepage"
```

---

### Tarea 9: Roasting Schedule en Home

**Archivos:**
- Modificar: `client/src/pages/Home.tsx`

- [ ] **Paso 1: Agregar sección RoastingSchedule en Home.tsx**

Agregar este componente inline en `client/src/pages/Home.tsx`, antes del footer:

```tsx
// Dentro de Home.tsx, después de TestimonialsSlider:
{/* ── ROASTING SCHEDULE ── */}
<section className="py-16 px-4 bg-coffee-950 border-t border-coffee-800/40">
  <div className="max-w-4xl mx-auto">
    <div className="text-center mb-10">
      <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-3">Transparencia total</p>
      <h2 className="font-serif text-4xl text-cream">Calendario de Tueste</h2>
      <p className="text-coffee-400 mt-3 max-w-md mx-auto">
        Tostamos por lotes pequeños, bajo pedido. Tu café llega máximo 7 días después del tueste.
      </p>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {['Lunes', 'Miércoles', 'Viernes', 'Sábado'].map((day, i) => {
        const today = new Date().getDay(); // 0=Dom, 1=Lun...
        const roastDays = [1, 3, 5, 6];
        const isToday = roastDays[i] === today;
        return (
          <div
            key={day}
            className={`p-5 border text-center transition-all ${
              isToday
                ? 'border-gold-500/60 bg-gold-500/10'
                : 'border-coffee-800 bg-coffee-900/40'
            }`}
          >
            {isToday && (
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                <span className="text-gold-500 text-xs tracking-widest uppercase">Hoy</span>
              </div>
            )}
            <p className={`font-medium ${isToday ? 'text-cream' : 'text-coffee-300'}`}>{day}</p>
            <p className="text-coffee-500 text-xs mt-1">8:00 – 14:00</p>
          </div>
        );
      })}
    </div>
    <p className="text-center text-coffee-600 text-xs tracking-wider mt-6">
      Pedidos antes de las 12pm se tuestan en el próximo día programado.
    </p>
  </div>
</section>
```

- [ ] **Paso 2: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: add roasting schedule section to homepage"
```

---

### Tarea 10: Admin — Filtros Avanzados de Pedidos

**Archivos:**
- Modificar: `server/src/routes/orders.ts`
- Modificar: `client/src/admin/Orders.tsx`
- Modificar: `client/src/api/index.ts`

- [ ] **Paso 1: Actualizar endpoint GET /api/orders con filtros avanzados**

Reemplazar el handler `router.get('/', ...)` en `server/src/routes/orders.ts`:

```ts
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = '100', search, dateFrom, dateTo } = req.query;
    const where: any = {};

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});
```

- [ ] **Paso 2: Actualizar ordersApi en client/src/api/index.ts**

```ts
export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: Record<string, string>) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.put(`/orders/${id}/status`, { status }),
  addNote: (id: string, note: string) => api.post(`/orders/${id}/notes`, { note }),
  getNotes: (id: string) => api.get(`/orders/${id}/notes`),
};
```

- [ ] **Paso 3: Actualizar admin/Orders.tsx con filtros avanzados**

```tsx
// client/src/admin/Orders.tsx — reemplazar completo
import { useEffect, useState } from 'react';
import { ChevronDown, Search, X, Calendar } from 'lucide-react';
import { ordersApi } from '../api';
import type { Order, OrderStatus } from '../types';

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pendiente',   color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  PROCESSING: { label: 'Procesando',  color: 'text-blue-400',   bg: 'bg-blue-900/20' },
  SHIPPED:    { label: 'Enviado',     color: 'text-purple-400', bg: 'bg-purple-900/20' },
  DELIVERED:  { label: 'Entregado',   color: 'text-green-400',  bg: 'bg-green-900/20' },
  CANCELLED:  { label: 'Cancelado',   color: 'text-red-400',    bg: 'bg-red-900/20' },
};

const allStatuses = Object.keys(statusConfig) as OrderStatus[];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    ordersApi.list(params).then((r) => { setOrders(r.data); setLoading(false); });
  };

  useEffect(load, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const clearFilters = () => {
    setStatus(''); setSearch(''); setDateFrom(''); setDateTo('');
    setTimeout(load, 50);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await ordersApi.updateStatus(id, newStatus);
    load();
  };

  const addNote = async (orderId: string) => {
    const note = noteInputs[orderId]?.trim();
    if (!note) return;
    await ordersApi.addNote(orderId, note);
    setNoteInputs((n) => ({ ...n, [orderId]: '' }));
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Pedidos</h1>
          <p className="text-coffee-400 text-sm mt-1">{orders.length} pedidos</p>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearch} className="bg-coffee-900 border border-coffee-800 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o email..."
            className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm pl-9 pr-3 py-2 focus:outline-none focus:border-gold-500/50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {allStatuses.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-gold-500 text-coffee-950 text-sm font-medium px-4 py-2 hover:bg-gold-400 transition-colors">
            Filtrar
          </button>
          <button type="button" onClick={clearFilters} className="px-3 py-2 border border-coffee-700 text-coffee-400 hover:text-cream transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">No hay pedidos con ese filtro.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const cfg = statusConfig[order.status as OrderStatus] ?? statusConfig.PENDING;
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="bg-coffee-900 border border-coffee-800">
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-coffee-800/30 transition-colors"
                >
                  <div className="flex items-center gap-6 text-left">
                    <div>
                      <p className="text-cream font-medium">{order.customerName}</p>
                      <p className="text-coffee-400 text-xs mt-0.5">{order.email}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-coffee-300 text-sm">{order.city}, {order.state}</p>
                      <p className="text-coffee-500 text-xs">{new Date(order.createdAt).toLocaleDateString('es-MX')}</p>
                    </div>
                    <span className={`hidden md:inline text-xs px-2.5 py-1 font-medium ${cfg.color} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-cream font-medium">${order.total.toFixed(2)}</span>
                    <ChevronDown className={`w-4 h-4 text-coffee-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-coffee-800 px-5 py-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-coffee-500 text-xs uppercase tracking-wider mb-1">Dirección</p>
                        <p className="text-coffee-200">{order.address}</p>
                        <p className="text-coffee-400">{order.city}, {order.state} {order.zipCode}</p>
                      </div>
                      <div>
                        <p className="text-coffee-500 text-xs uppercase tracking-wider mb-1">Productos</p>
                        {order.items.map((item) => (
                          <p key={item.id} className="text-coffee-200">{item.quantity}x {item.product?.name}</p>
                        ))}
                      </div>
                      <div>
                        <p className="text-coffee-500 text-xs uppercase tracking-wider mb-2">Cambiar estado</p>
                        <div className="flex flex-wrap gap-2">
                          {allStatuses.map((s) => (
                            <button
                              key={s}
                              onClick={() => updateStatus(order.id, s)}
                              className={`text-xs px-2.5 py-1 border transition-all ${
                                order.status === s
                                  ? `${statusConfig[s].color} border-current ${statusConfig[s].bg}`
                                  : 'border-coffee-700 text-coffee-500 hover:text-coffee-200'
                              }`}
                            >
                              {statusConfig[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Nota interna */}
                    {order.notes && (
                      <div className="bg-coffee-800/50 px-3 py-2 text-sm text-coffee-300 italic border-l-2 border-gold-500/30">
                        {order.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 4: Commit**

```bash
git add server/src/routes/orders.ts client/src/admin/Orders.tsx client/src/api/index.ts
git commit -m "feat: add advanced order filters (search, date range, status) in admin"
```

---

### Tarea 11: Admin — Gestor de Códigos Descuento

**Archivos:**
- Modificar: `server/prisma/schema.prisma` — agregar modelo PromoCode
- Crear: `server/src/routes/promoCodes.ts`
- Modificar: `server/src/index.ts`
- Crear: `client/src/admin/PromoCodes.tsx`
- Modificar: `client/src/App.tsx`
- Modificar: `client/src/admin/AdminLayout.tsx`
- Modificar: `client/src/api/index.ts`

- [ ] **Paso 1: Agregar modelo PromoCode al schema Prisma**

Agregar al final de `server/prisma/schema.prisma`:

```prisma
model PromoCode {
  id          String    @id @default(cuid())
  code        String    @unique
  discount    Float
  type        String    @default("PERCENT")  // PERCENT | FIXED
  maxUses     Int?
  usedCount   Int       @default(0)
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
}
```

- [ ] **Paso 2: Correr migración**

```bash
cd server && npx prisma migrate dev --name add_promo_codes
```

Salida esperada: `✔ Your database is now in sync with your schema.`

- [ ] **Paso 3: Crear router promoCodes**

```ts
// server/src/routes/promoCodes.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: codes });
  } catch {
    res.status(500).json({ error: 'Error al obtener códigos' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code, discount, type, maxUses, expiresAt } = req.body;
    if (!code || discount == null) {
      res.status(400).json({ error: 'Código y descuento son requeridos' });
      return;
    }
    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        discount: parseFloat(discount),
        type: type ?? 'PERCENT',
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json({ data: promo });
  } catch (e: any) {
    if (e.code === 'P2002') {
      res.status(409).json({ error: 'Ese código ya existe' });
      return;
    }
    res.status(500).json({ error: 'Error al crear código' });
  }
});

router.put('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id: req.params.id } });
    if (!promo) { res.status(404).json({ error: 'No encontrado' }); return; }
    const updated = await prisma.promoCode.update({
      where: { id: req.params.id },
      data: { isActive: !promo.isActive },
    });
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: 'Error al actualizar código' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar código' });
  }
});

// Endpoint público: validar código al checkout
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const promo = await prisma.promoCode.findUnique({ where: { code: code?.toUpperCase() } });

    if (!promo || !promo.isActive) {
      res.status(404).json({ error: 'Código inválido o inactivo' });
      return;
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      res.status(400).json({ error: 'Código expirado' });
      return;
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      res.status(400).json({ error: 'Código agotado' });
      return;
    }

    res.json({ data: { discount: promo.discount, type: promo.type, code: promo.code } });
  } catch {
    res.status(500).json({ error: 'Error al validar código' });
  }
});

export default router;
```

- [ ] **Paso 4: Registrar en server/src/index.ts**

```ts
import promoCodesRouter from './routes/promoCodes';
// ...
app.use('/api/promo-codes', promoCodesRouter);
```

- [ ] **Paso 5: Agregar promoCodesApi en client/src/api/index.ts**

```ts
export const promoCodesApi = {
  list: () => api.get('/promo-codes'),
  create: (data: { code: string; discount: number; type: string; maxUses?: number; expiresAt?: string }) =>
    api.post('/promo-codes', data),
  toggle: (id: string) => api.put(`/promo-codes/${id}/toggle`),
  delete: (id: string) => api.delete(`/promo-codes/${id}`),
  validate: (code: string) => api.post('/promo-codes/validate', { code }),
};
```

- [ ] **Paso 6: Crear página admin PromoCodes**

```tsx
// client/src/admin/PromoCodes.tsx
import { useEffect, useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { promoCodesApi } from '../api';

interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: 'PERCENT' | 'FIXED';
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { code: '', discount: '', type: 'PERCENT', maxUses: '', expiresAt: '' };

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    promoCodesApi.list().then((r) => { setCodes(r.data.data); setLoading(false); });
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await promoCodesApi.create({
        code: form.code,
        discount: parseFloat(form.discount),
        type: form.type,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setForm(emptyForm);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al crear código');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    await promoCodesApi.toggle(id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este código?')) return;
    await promoCodesApi.delete(id);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Tag className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-cream">Códigos de Descuento</h1>
          <p className="text-coffee-400 text-sm mt-1">{codes.length} códigos</p>
        </div>
      </div>

      {/* Formulario crear */}
      <form onSubmit={submit} className="bg-coffee-900 border border-coffee-800 p-6 mb-8">
        <h2 className="text-cream font-medium mb-4">Nuevo código</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <input
            required
            placeholder="CAFE20"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500/50 uppercase"
          />
          <input
            required
            type="number"
            placeholder="Descuento"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          >
            <option value="PERCENT">% Porcentaje</option>
            <option value="FIXED">$ Fijo MXN</option>
          </select>
          <input
            type="number"
            placeholder="Usos máx (opcional)"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <input
            type="date"
            placeholder="Expira (opcional)"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Crear código'}
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No hay códigos creados.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-4 border ${
                c.isActive ? 'bg-coffee-900 border-coffee-800' : 'bg-coffee-900/50 border-coffee-800/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-6">
                <span className="font-mono text-gold-500 font-bold tracking-widest">{c.code}</span>
                <span className="text-cream text-sm">
                  {c.type === 'PERCENT' ? `${c.discount}% OFF` : `$${c.discount} MXN OFF`}
                </span>
                <span className="text-coffee-400 text-xs">
                  {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} usos
                </span>
                {c.expiresAt && (
                  <span className="text-coffee-500 text-xs">
                    Expira: {new Date(c.expiresAt).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(c.id)} className="text-coffee-400 hover:text-cream transition-colors">
                  {c.isActive ? <ToggleRight className="w-5 h-5 text-gold-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => remove(c.id)} className="text-coffee-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 7: Agregar ruta en App.tsx y link en AdminLayout**

En `client/src/App.tsx`:
```tsx
import AdminPromoCodes from './admin/PromoCodes';

// Dentro de las rutas admin:
<Route path="descuentos" element={<AdminPromoCodes />} />
```

- [ ] **Paso 8: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations server/src/routes/promoCodes.ts server/src/index.ts client/src/admin/PromoCodes.tsx client/src/api/index.ts client/src/App.tsx
git commit -m "feat: add promo code manager with percent/fixed discounts, expiry and usage tracking"
```

---

### Tarea 12: Admin — Moderación de Reseñas Mejorada

**Archivos:**
- Modificar: `server/prisma/schema.prisma` — agregar `adminResponse` a Review
- Modificar: `server/src/routes/reviews.ts`
- Modificar: `client/src/admin/Reviews.tsx`
- Modificar: `client/src/api/index.ts`

- [ ] **Paso 1: Agregar campo adminResponse al modelo Review**

En `server/prisma/schema.prisma`, dentro del modelo `Review`, agregar:

```prisma
adminResponse String?
respondedAt  DateTime?
```

- [ ] **Paso 2: Migrar**

```bash
cd server && npx prisma migrate dev --name add_review_admin_response
```

- [ ] **Paso 3: Agregar endpoint responder reseña**

En `server/src/routes/reviews.ts`, agregar antes de `export default router`:

```ts
router.put('/:id/respond', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { adminResponse } = req.body;
    if (!adminResponse?.trim()) {
      res.status(400).json({ error: 'La respuesta no puede estar vacía' });
      return;
    }
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { adminResponse, respondedAt: new Date() },
    });
    res.json({ data: review });
  } catch {
    res.status(500).json({ error: 'Error al responder reseña' });
  }
});
```

- [ ] **Paso 4: Actualizar reviewsApi**

```ts
// En client/src/api/index.ts, dentro de reviewsApi:
respond: (id: string, adminResponse: string) => api.put(`/reviews/${id}/respond`, { adminResponse }),
```

- [ ] **Paso 5: Actualizar admin/Reviews.tsx con respuesta inline**

Reemplazar `client/src/admin/Reviews.tsx` completo:

```tsx
// client/src/admin/Reviews.tsx
import { useEffect, useState } from 'react';
import { Star, Check, Trash2, MessageSquare, X } from 'lucide-react';
import { reviewsApi } from '../api';
import type { Review } from '../types';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const load = () => {
    reviewsApi.adminList().then((r) => { setReviews(r.data.data); setLoading(false); });
  };

  useEffect(load, []);

  const approve = async (id: string) => {
    await reviewsApi.approve(id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta reseña?')) return;
    await reviewsApi.delete(id);
    load();
  };

  const submitResponse = async (id: string) => {
    if (!responseText.trim()) return;
    await reviewsApi.respond(id, responseText);
    setResponding(null);
    setResponseText('');
    load();
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.isApproved;
    if (filter === 'approved') return r.isApproved;
    return true;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Reseñas</h1>
          <p className="text-coffee-400 text-sm mt-1">{reviews.filter((r) => !r.isApproved).length} pendientes</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 tracking-wider uppercase transition-all ${
                filter === f ? 'bg-gold-500 text-coffee-950' : 'border border-coffee-700 text-coffee-400 hover:text-cream'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Aprobadas'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No hay reseñas.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-coffee-900 border border-coffee-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-gold-500 text-gold-500' : 'text-coffee-700'}`} />
                      ))}
                    </div>
                    <span className="text-cream text-sm font-medium">{r.name}</span>
                    <span className="text-coffee-500 text-xs">{r.email}</span>
                    {r.product && (
                      <span className="text-coffee-400 text-xs">· {r.product.name}</span>
                    )}
                    {!r.isApproved && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400">Pendiente</span>
                    )}
                  </div>
                  <p className="text-coffee-200 text-sm leading-relaxed">{r.comment}</p>
                  {(r as any).adminResponse && (
                    <div className="mt-3 pl-4 border-l-2 border-gold-500/30">
                      <p className="text-coffee-500 text-xs uppercase tracking-wider mb-1">Respuesta del equipo</p>
                      <p className="text-coffee-300 text-sm">{(r as any).adminResponse}</p>
                    </div>
                  )}
                  {responding === r.id && (
                    <div className="mt-3 flex gap-2">
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={2}
                        className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none resize-none"
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => submitResponse(r.id)}
                          className="px-3 py-2 bg-gold-500 text-coffee-950 text-sm hover:bg-gold-400 transition-colors"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => { setResponding(null); setResponseText(''); }}
                          className="px-3 py-2 border border-coffee-700 text-coffee-400 hover:text-cream transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setResponding(r.id); setResponseText(''); }}
                    className="p-2 text-coffee-400 hover:text-gold-500 transition-colors"
                    title="Responder"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  {!r.isApproved && (
                    <button
                      onClick={() => approve(r.id)}
                      className="p-2 text-coffee-400 hover:text-green-400 transition-colors"
                      title="Aprobar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    className="p-2 text-coffee-400 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations server/src/routes/reviews.ts client/src/admin/Reviews.tsx client/src/api/index.ts
git commit -m "feat: add admin review moderation with approve/reject filters and inline response"
```

---

### Tarea 13: Admin — Búsqueda y Vista de Clientes

**Archivos:**
- Crear: `server/src/routes/customers.ts`
- Modificar: `server/src/index.ts`
- Crear: `client/src/admin/Customers.tsx`
- Modificar: `client/src/App.tsx`
- Modificar: `client/src/api/index.ts`

- [ ] **Paso 1: Crear router customers**

```ts
// server/src/routes/customers.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true,
        city: true, state: true, createdAt: true,
        _count: { select: { orders: true, subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: users });
  } catch {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          include: { items: { include: { product: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
        reviews: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!user) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    const { password, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

export default router;
```

- [ ] **Paso 2: Registrar en index.ts**

```ts
import customersRouter from './routes/customers';
app.use('/api/customers', customersRouter);
```

- [ ] **Paso 3: Agregar customersApi**

```ts
export const customersApi = {
  list: (params?: Record<string, string>) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
};
```

- [ ] **Paso 4: Crear admin/Customers.tsx**

```tsx
// client/src/admin/Customers.tsx
import { useEffect, useState } from 'react';
import { Search, Users, ShoppingBag, Star, ChevronRight } from 'lucide-react';
import { customersApi } from '../api';

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  createdAt: string;
  _count: { orders: number; subscriptions: number };
}

interface CustomerDetail extends CustomerSummary {
  orders: any[];
  subscriptions: any[];
  reviews: any[];
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = (q?: string) => {
    setLoading(true);
    const params = q ? { search: q } : undefined;
    customersApi.list(params).then((r) => { setCustomers(r.data.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    const r = await customersApi.getById(id);
    setSelected(r.data.data);
    setDetailLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  if (selected) {
    return (
      <div className="p-8">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-coffee-400 hover:text-cream text-sm mb-6 transition-colors"
        >
          ← Volver a clientes
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-coffee-900 border border-coffee-800 p-6">
            <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-3">Perfil</p>
            <h2 className="font-serif text-2xl text-cream mb-1">{selected.name}</h2>
            <p className="text-coffee-400 text-sm">{selected.email}</p>
            {selected.phone && <p className="text-coffee-400 text-sm">{selected.phone}</p>}
            {selected.city && <p className="text-coffee-500 text-sm mt-1">{selected.city}, {selected.state}</p>}
            <p className="text-coffee-600 text-xs mt-3">Cliente desde {new Date(selected.createdAt).toLocaleDateString('es-MX')}</p>
            <div className="flex gap-4 mt-4 pt-4 border-t border-coffee-800">
              <div className="text-center">
                <p className="text-cream font-bold text-xl">{selected._count.orders}</p>
                <p className="text-coffee-500 text-xs">Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-cream font-bold text-xl">{selected._count.subscriptions}</p>
                <p className="text-coffee-500 text-xs">Suscripciones</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-coffee-900 border border-coffee-800 p-6">
              <p className="text-coffee-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5" /> Pedidos recientes
              </p>
              {selected.orders.length === 0 ? (
                <p className="text-coffee-600 text-sm">Sin pedidos.</p>
              ) : (
                <div className="space-y-2">
                  {selected.orders.map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center text-sm py-2 border-b border-coffee-800 last:border-0">
                      <div>
                        <p className="text-coffee-200">{o.items.map((i: any) => i.product?.name).join(', ')}</p>
                        <p className="text-coffee-500 text-xs">{new Date(o.createdAt).toLocaleDateString('es-MX')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-cream">${o.total.toFixed(2)}</p>
                        <p className="text-coffee-500 text-xs">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-cream">Clientes</h1>
          <p className="text-coffee-400 text-sm mt-1">{customers.length} registrados</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-coffee-900 border border-coffee-800 text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors">
          Buscar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No se encontraron clientes.</p>
      ) : (
        <div className="space-y-1">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c.id)}
              className="w-full flex items-center justify-between px-5 py-4 bg-coffee-900 border border-coffee-800 hover:bg-coffee-800/40 transition-colors text-left"
            >
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-cream font-medium">{c.name}</p>
                  <p className="text-coffee-400 text-xs mt-0.5">{c.email}</p>
                </div>
                {c.city && <p className="text-coffee-500 text-sm hidden sm:block">{c.city}, {c.state}</p>}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <p className="text-coffee-300 text-sm">{c._count.orders} pedidos</p>
                  {c._count.subscriptions > 0 && (
                    <p className="text-gold-500/70 text-xs">{c._count.subscriptions} suscripción</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-coffee-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 5: Agregar rutas en App.tsx y AdminLayout**

```tsx
// client/src/App.tsx:
import AdminCustomers from './admin/Customers';
// dentro de rutas admin:
<Route path="clientes" element={<AdminCustomers />} />
```

- [ ] **Paso 6: Commit**

```bash
git add server/src/routes/customers.ts server/src/index.ts client/src/admin/Customers.tsx client/src/api/index.ts client/src/App.tsx
git commit -m "feat: add customer search and detail view in admin"
```

---

### Tarea 14: Actualizar AdminLayout con nuevas secciones

**Archivos:**
- Modificar: `client/src/admin/AdminLayout.tsx`

- [ ] **Paso 1: Leer AdminLayout actual**

```bash
cat client/src/admin/AdminLayout.tsx
```

- [ ] **Paso 2: Agregar links Clientes y Descuentos al sidebar**

En `client/src/admin/AdminLayout.tsx`, dentro del array de links de navegación, agregar:

```tsx
import { Tag, Users } from 'lucide-react';

// En el array de links de nav (junto a Dashboard, Productos, Pedidos, etc.):
{ to: '/admin/clientes', label: 'Clientes', icon: Users },
{ to: '/admin/descuentos', label: 'Descuentos', icon: Tag },
```

- [ ] **Paso 3: Commit**

```bash
git add client/src/admin/AdminLayout.tsx
git commit -m "feat: add Clientes and Descuentos links to admin sidebar"
```

---

## FASE 1 — DOCKER Y ACCESO LAN

### Tarea 15: Docker — Exposición de puertos y acceso desde otros dispositivos

**Archivos:**
- Modificar: `docker-compose.yml`
- Crear: `.env.docker` (referencia de variables)

- [ ] **Paso 1: Obtener IP local de la máquina**

```bash
ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1
```

Salida esperada: algo como `192.168.1.X`

- [ ] **Paso 2: Actualizar docker-compose.yml para acceso LAN**

Reemplazar `docker-compose.yml` completo:

```yaml
services:
  server:
    build:
      context: .
      dockerfile: ./server/Dockerfile
    ports:
      - '0.0.0.0:3001:3001'
    environment:
      DATABASE_URL: file:/app/data/cafe.db
      JWT_SECRET: ${JWT_SECRET:-cambia-este-secreto-en-produccion}
      NODE_ENV: production
      PORT: 3001
      CLIENT_URL: ${CLIENT_URL:-http://localhost}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-sk_test_placeholder}
    volumes:
      - db_data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3001/api/health']
      interval: 30s
      timeout: 10s
      retries: 3

  client:
    build:
      context: .
      dockerfile: ./client/Dockerfile
      args:
        VITE_API_URL: /api
        VITE_STRIPE_PUBLISHABLE_KEY: ${VITE_STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
    ports:
      - '0.0.0.0:80:80'
    depends_on:
      server:
        condition: service_healthy
    restart: unless-stopped

volumes:
  db_data:
```

- [ ] **Paso 3: Comandos Docker para rebuild y acceso**

```bash
# Desde la raíz del proyecto:

# Detener contenedores actuales:
docker compose down

# Rebuild completo desde cero (incluye nuevas migraciones):
docker compose build --no-cache

# Levantar en background:
docker compose up -d

# Ver logs en tiempo real:
docker compose logs -f

# Ver solo logs del server:
docker compose logs -f server

# Ver solo logs del client:
docker compose logs -f client

# Verificar que esté corriendo:
docker compose ps
```

- [ ] **Paso 4: Acceder desde otros dispositivos en la misma red**

Con la IP del Paso 1 (ej. `192.168.1.100`):

- **PWA/Web:** `http://192.168.1.100` (puerto 80)
- **API directa:** `http://192.168.1.100:3001/api/health`
- **Admin:** `http://192.168.1.100/admin/login`

Si el firewall bloquea, abrir los puertos:
```bash
# En Arch Linux con firewalld:
sudo firewall-cmd --add-port=80/tcp --permanent
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload

# O con ufw:
sudo ufw allow 80
sudo ufw allow 3001
```

- [ ] **Paso 5: Commit**

```bash
git add docker-compose.yml
git commit -m "fix: expose Docker ports on 0.0.0.0 for LAN access"
```

---

## FASE 2 — FEATURES MEDIOS

### Overview de Tareas (detalle en ejecución)

| # | Feature | Archivos clave | DB |
|---|---------|---------------|-----|
| 2.1 | Smart Search PWA | `client/src/pages/Shop.tsx` | No |
| 2.2 | Tasting Notes Visual | `client/src/components/TastingNotes.tsx`, `ProductDetail.tsx` | No |
| 2.3 | Farmer Profiles | `server/prisma/schema.prisma` + `Farmer` model, `client/src/pages/About.tsx` | Sí |
| 2.4 | One-Click Reorder | `client/src/pages/profile/Orders.tsx`, `ordersApi.create` | No |
| 2.5 | Gift Cards | `PromoCode` type=GIFT, checkout UI | Reutiliza PromoCode |
| 2.6 | Bulk Product Actions | `client/src/admin/Products.tsx` | No |
| 2.7 | CSV Export Pedidos | `server/src/routes/orders.ts` endpoint `/export` | No |
| 2.8 | Inventory Tracking | `Product.lowStockThreshold`, alertas en Dashboard | Sí |
| 2.9 | Subscription Mgmt Dashboard | `client/src/admin/Subscribers.tsx` mejorado | No |
| 2.10 | Churn Alerts | Dashboard stats: suscripciones sin billing próximo | No |

### Tarea 2.1: Smart Search en Shop

- [ ] Agregar input de búsqueda en `client/src/pages/Shop.tsx`:

```tsx
const [searchQuery, setSearchQuery] = useState('');

// En el useEffect de carga:
if (searchQuery) params.search = searchQuery;

// UI — encima de los filtros de categoría:
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
  <input
    value={searchQuery}
    onChange={(e) => { setSearchQuery(e.target.value); }}
    onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
    placeholder="Buscar café, origen, variedad..."
    className="w-full bg-white border border-coffee-200 text-coffee-900 text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
  />
</div>
```

- [ ] Actualizar `GET /api/products` en server para aceptar `?search=`:

```ts
// En server/src/routes/products.ts, dentro del handler GET /:
const { search, ...otherParams } = req.query;
if (search) {
  where.OR = [
    { name: { contains: search as string } },
    { origin: { contains: search as string } },
    { variety: { contains: search as string } },
    { flavors: { contains: search as string } },
  ];
}
```

- [ ] Commit: `feat: add smart search to shop with name/origin/variety/flavor filtering`

---

## FASE 3 — FEATURES COMPLEJOS

### Overview (requieren planning propio antes de ejecutar)

| Feature | Complejidad | Pre-requisitos |
|---------|-------------|----------------|
| Sensory Wheel | Alta — SVG interactivo | Flavors en DB como array real |
| Bean Comparator | Media | ProductDetail refactored |
| Loyalty Program | Muy Alta — requires Points model, redemption logic | Stripe webhooks |
| Recommendations | Alta — requires purchase history analysis | Suficientes órdenes en DB |
| Advanced Analytics (CLV) | Alta — SQL aggregations complejas | Prisma raw queries |
| Email Campaigns | Muy Alta — requires email provider (Resend/Sendgrid) | Env vars + templates |

**Antes de Fase 3:** Crear sub-plan separado por feature complejo.

---

## FASE 4 — POLISH

| Feature | Archivo | Notas |
|---------|---------|-------|
| A11y audit | Todo el cliente | `eslint-plugin-jsx-a11y` |
| Export PDF | `server/src/routes/orders.ts` | `pdfkit` npm package |
| Community forum | Nueva tabla `ForumPost`, `ForumComment` | Moderación en admin |

---

## REINICIAR DOCKER — REFERENCIA RÁPIDA

```bash
# Rebuild completo (después de cambios en código):
docker compose down && docker compose build --no-cache && docker compose up -d

# Solo reiniciar sin rebuild (cambios de config/env):
docker compose down && docker compose up -d

# Ver qué está corriendo:
docker compose ps

# Acceder al shell del server (para correr migraciones manuales):
docker exec -it cafeteria-server-1 sh

# Ver logs live:
docker compose logs -f

# Limpiar todo (incluyendo volúmenes/datos):
docker compose down -v  # ⚠️ BORRA LA DB
```

## IP LOCAL PARA ACCESO LAN

```bash
ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1
# Resultado ejemplo: 192.168.1.105
# Acceder desde cualquier dispositivo en la red: http://192.168.1.105
```
