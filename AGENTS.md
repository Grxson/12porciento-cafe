<!-- headroom:rtk-instructions -->

# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. Reduces context usage 60-90%.

## Key Commands

```bash
rtk git status         rtk git diff           rtk git log
rtk ls <path>          rtk read <file>        rtk grep <pattern>
rtk find <pattern>     rtk diff <file>        rtk tsc
rtk pytest tests/      rtk cargo test         rtk test <cmd>
rtk err <cmd>          rtk log <file>         rtk summary <cmd>
rtk gh pr view <n>     rtk docker ps          rtk pnpm install
```

Rules: prefix each cmd in chain; raw cmd for debugging; `rtk proxy <cmd>` tracks only.
<!-- /headroom:rtk-instructions -->

---

# 12% Café — Complete Project Context

Updated: 2026-07-09

## Overview

Full-stack specialty coffee ecommerce + barista gamification platform. Mexican specialty coffee brand ("Solo el 12% del café..."). Monorepo with 4 services: public storefront, admin dashboard, API server, PostgreSQL database.

## Architecture

### Monorepo (pnpm workspaces)

```
D:\Proyectos\12porciento-cafe/
├── client/           # Public storefront (React SPA + PWA)
├── server/           # Express API (Prisma ORM + PostgreSQL)
├── apps/admin/       # Admin dashboard (React SPA)
├── packages/
│   ├── shared/       # Shared types, API client, utils, hooks
│   ├── ui/           # Shared UI components (ConfirmDialog, ErrorBoundary, FocusTrap)
│   └── config-tailwind/ # Shared Tailwind theme config
├── specs/            # Feature specs & plans (7 features)
│   └── 005-barista-profile-overhaul/ # Active sprint
├── .railway/         # Railway IaC config
├── .claude/          # Claude Code settings
└── .github/          # GH Actions workflows
```

### Infrastructure (Production)

- **Railway** (primary): 4 resources via IaC `.railway/railway.ts`
  - `12porciento-server` — Express API (Docker, port 3001)
  - `12porciento-web` — Public storefront (Docker nginx, port 80)
  - `12porciento-admin` — Admin dashboard (Docker nginx, port 80)
  - `Postgres` — PostgreSQL 16 database
- **Render** (secondary): `render.yaml` for fallback deployment
- **Local dev**: `docker compose up` starts PostgreSQL 16, `pnpm dev` runs client+server concurrently

## Tech Stack

### Server (`server/`)

- Runtime: Node.js 24 (bullseye Docker), TypeScript
- Framework: Express 4 with express-rate-limit, cors, multer
- ORM: Prisma 5 with PostgreSQL (production) / SQLite (local dev)
- Auth: JWT (jsonwebtoken + bcryptjs) — dual auth (admin + user)
- Payments: Stripe SDK (charges, subscriptions, webhooks)
- Real-time: Socket.IO (events + push notifications)
- Push: web-push (VAPID for PWA push)
- Email: nodemailer + resend
- Media: sharp (image processing), multer (uploads)
- Scheduler: node-cron (daily billing sync at 3 AM)
- Rate limiting: express-rate-limit on all admin + auth endpoints

### Client (`client/`) — Public Storefront

- Build: Vite 5 + React 18 + TypeScript + Tailwind CSS 3
- Routing: react-router-dom 6 with nested layouts
- State: Zustand (cart, user, theme, wishlist, order history, toast, notifications)
- Data fetching: @tanstack/react-query
- HTTP client: Axios (via shared package)
- UI: framer-motion (animations), lucide-react (icons), recharts (charts)
- PWA: vite-plugin-pwa + workbox (offline cache, push notifications, install prompt)
- Forms: Controlled components with Zod-like validation patterns
- Canvas: html2canvas, jspdf (receipts), canvas-confetti
- Social: react-share (social sharing)

### Admin Dashboard (`apps/admin/`)

- Stack: React 18 + TypeScript + Vite + Tailwind CSS
- Architecture: Lazy-loaded routes, 26 modules (CRUD pages)
- Admin pattern: `useModuleList` + `usePagination` + `ModuleContext` for consistent CRUD
- Logging: AdminLog audit trail for all entity mutations
- Shared packages: `@12porciento/shared` (API, types), `@12porciento/ui` (components), `@12porciento/tailwind-config`

### Shared Packages

- **`@12porciento/shared`**: API client (axios instance with auth interceptor), types (Product, Order, User, Subscription, etc.), utils (base64, imageUrl, api-error), lib (IndexedDB storage, queryClient), hooks (useBrewQueue, useRecipeDraft, useRecipeForm, useInstallPrompt), constants (mexicanStates)
- **`@12porciento/ui`**: Reusable UI components (ConfirmDialog, ErrorBoundary, FocusTrap)
- **`@12porciento/tailwind-config`**: Shared Tailwind theme (coffee-950→50, gold-500, cream colors)

## Database Schema (Prisma — PostgreSQL)

30 models across 5 domains:

### Ecommerce Core

- **Product**: Full coffee catalog (origin, altitude, SCA score, roast level, flavors, certifications, brew recommendations, member exclusive)
- **Order/OrderItem**: D2C (default) + B2B orders, tracking (carrier, trackingNumber, estimatedDelivery), status workflow
- **Cart/AbandonedCart**: JSON items, coupon tracking, recovery flow
- **PromoCode**: Percent/fixed discounts, max uses, expiry
- **Bundle/BundleItem**: Product bundles with discount stacking
- **GiftCard**: Sendable credit with balance tracking, sender/recipient

### Subscriptions & Billing

- **Subscription**: Plans (monthly), Stripe integration (sub ID, customer ID, payment method), pause/skip logic, failed payment tracking
- **SubscriptionItem**: Linked products per subscription
- **SubscriptionPayment**: Invoice tracking per billing cycle, Stripe webhook sync
- **PriceRecord**: Historical price tracking per product

### Users & Auth

- **User**: Customer accounts with Stripe customer ID, email verification, password reset, avatar
- **AdminUser**: Admin accounts with audit trail
- **AdminLog**: All CRUD actions tracked (action, entity, entityId, metadata JSON)

### Barista Gamification

- **BaristaProfile**: Level, XP, brew count, favorite method, bio, banner, flavor profile (JSON), active title
- **BrewLog**: Brew records with extended F3 fields (grind size, water temp, brew time, coffee/water weight, bean link, equipment IDs, flavor tags), XP calculation, rating
- **Achievement/AchievementUnlock**: Badge system (slug, name, icon, rarity, XP reward), 4 seeded achievements
- **BaristaTitle**: Equippable titles (slug, name, icon, requirement)
- **BaristaEquipment**: User gear (grinder, kettle, dripper, scale) with photos
- **Reward/RewardClaim**: XP-to-discount shop, generated codes

### Supply Chain & Traceability

- **Caficultor**: Farmer profiles (region, altitude, variety, pricing agreement, fair trade)
- **Lote**: Batch tracking (quantity, cost, origin, humidity, defects, sensory scores, quarantine→approved workflow)
- **Ubicacion**: Location hierarchy (pais, estado) linked to lots
- **TipoCata**: Cupping type categories linked to farmers
- **ProductVersion**: Harvest versioning per product
- **PricingConfig**: Cost breakdown (roasting, packaging, overhead, margin config)
- **B2BPriceTier**: Bulk pricing (tiered by quantity)
- **StockMovement**: Inventory tracking (SALE, RESTOCK, ADJUSTMENT, etc.)

### Social & Content

- **Recipe/RecipeStep**: Brewing recipes (V60, AeroPress, Espresso, etc.), step-by-step with images/video, difficulty, prep time
- **Review/ReviewReply**: Product reviews with admin approval, replies
- **RecipeRating/RecipeFavorite**: User ratings and favorites
- **WishlistItem**: User saved products

### PWA & Notifications

- **PushSubscription**: Web push subscriptions per user/admin with endpoint keys
- **AdminNotificationPreference**: Per-event-type admin toggle (new_order, review_approved, low_stock, etc.)

## API Structure (Express Router — 34 route files)

### Public Routes

| Prefix                       | Module         | Key Endpoints                                                      |
| ---------------------------- | -------------- | ------------------------------------------------------------------ |
| `/api/products`              | Products       | CRUD, public list, slug detail, category filter                    |
| `/api/orders`                | Orders         | Create (whitelist fields), user orders, admin list                 |
| `/api/subscriptions`         | Subscriptions  | CRUD, plans, pause/skip                                            |
| `/api/auth`                  | Admin Auth     | login, /me, rate-limited 10/15min                                  |
| `/api/bundles`               | Bundles        | Product bundles                                                    |
| `/api/reviews`               | Reviews        | Create, approve, reply                                             |
| `/api/recipes`               | Recipes        | List (difficulty filter, method grouping), detail, CRUD            |
| `/api/payments`              | Payments       | Stripe payment intent, confirm                                     |
| `/api/promo-codes`           | Promos         | Validate (rate-limited 30/15min), CRUD                             |
| `/api/uploads`               | Uploads        | File upload (multer/sharp), static serving                         |
| `/api/push`                  | Push           | Subscribe, bulk preferences                                        |
| `/api/wishlist`              | Wishlist       | User CRUD                                                          |
| `/api/recipe-ratings`        | Ratings        | Rate recipes                                                       |
| `/api/recipe-favorites`      | Favorites      | Toggle favorites                                                   |
| `/api/gift-cards`            | Gift Cards     | Purchase, send, check balance                                      |
| `/api/abandoned-cart`        | Cart Recovery  | Reminder triggers, recovery                                        |
| `/api/b2b`                   | B2B            | Catalog, inquiries                                                 |
| `/api/barista`               | Barista        | Brew logs, profiles, leaderboard, achievements, rewards, equipment |
| `/api/sitemap`               | Sitemap        | SEO                                                                |
| `/api/subscription-payments` | Sub Payments   | Webhook, payment history                                           |
| `/api/lotes`                 | Lots           | Batch CRUD (admin)                                                 |
| `/api/caficultores`          | Farmers        | CRUD (admin)                                                       |
| `/api/ubicaciones`           | Locations      | CRUD (admin)                                                       |
| `/api/tipos-cata`            | Cupping Types  | CRUD (admin)                                                       |
| `/api/pricing`               | Pricing Config | CRUD (admin)                                                       |
| `/api/product-versions`      | Versions       | CRUD (admin)                                                       |

### Admin Routes

| Prefix               | Module                         |
| -------------------- | ------------------------------ |
| `/api/admin/orders`  | Order management               |
| `/api/admin/logs`    | Audit log viewer               |
| `/api/admin/rewards` | Reward/barista management      |
| `/api/dashboard`     | Dashboard stats (rate-limited) |
| `/api/customers`     | Customer management            |
| `/api/inventory`     | Inventory management           |
| `/api/admin-users`   | Admin account management       |

### Internal Routes

- `/api/health` — Health check (Docker/Railway)
- `/api/webhooks/stripe` — Stripe webhooks (raw body, REQUIRED before express.json)

### Auth Middleware (2 systems — DO NOT MIX)

1. **`requireAuth`/`AuthRequest`** — Admin-only (rejects USER role with 403)
2. **`requireUserAuth`/`UserAuthRequest`** — User-only (rejects non-USER role with 403)
3. **`requireAnyAuth`/`AnyAuthRequest`** — Either admin or user

## Client Structure (`client/src/`)

### Pages (26 routes)

- Public: Home, Shop, ProductDetail, Cart, Checkout, Subscriptions, About, Bundles, Recipes, RecipeDetail, Gallery, NotFound
- Auth: Login, Register, ForgotPassword, ResetPassword, VerifyEmail
- User: Profile (multi-section), BaristaProfile, Leaderboard, RewardShop, AchievementGallery, GiftCardPurchase
- Special: Quiz (coffee recommendation), B2BCatalog

### Components (53 files)

- Layout: Navbar (4 primary links + "Más" dropdown), Footer, BottomNav (5-column mobile nav)
- UI: Toast, InstallPrompt, OfflineBanner/Indicator, ScrollReveal, PageSkeleton, PasswordField, StarRating, Breadcrumbs, ErrorBoundary
- Product: ProductCard, ProductGallery, PriceHistory, CoffeeTimeline, CoffeePicker
- Cart: CartDrawer (slide-over), StripePaymentForm
- Barista: BrewLogForm, BrewingGuideModal, BrewPurchaseButton, EquipmentCard, FlavorRadarChart, FlavorSelector, StreakHeatmap/Widget, RankBadge, TitleSelector, MonthlyWrap, BaristaRecords
- Social: ReviewThread, NotificationBell, TestimonialsSlider
- Admin-style: SearchableProductSelect, SearchableCaficultorSelect, SearchableUbicacionSelect
- PWA: UpdateNotificationModal, InstallPrompt, PushPermissionBanner

### Context (8 Zustand stores)

- CartContext — Cart items, add/remove/update, persisted
- UserContext — Auth state, token, profile
- ThemeContext — Dark/light mode sync
- ToastContext — Notification toasts
- NotificationsContext — Push notification prefs
- OrderHistoryContext — Offline-first order history (IndexedDB)
- WishlistContext — Offline-first wishlist (IndexedDB)
- RecipesContext — Recipe state

### Services

- `brewSync.ts` — Offline brew log queue, syncs when online
- `paymentRetry.ts` — Retry failed Stripe payments

### Hooks (12)

- useBarista, useBrewedRecipes, useBrewQueue, useInstallPrompt, useMonthlyWrap, usePageMeta, usePushNotifications, useRecipeDraft, useRecipeFavorites, useRecipeForm, useRecipes, useUpdateNotification

### PWA Support

- Service worker via vite-plugin-pwa (registerType: 'prompt')
- CacheFirst for recipes API (50 entries, 7-day TTL)
- IndexedDB for cart, wishlist, order history
- iOS splash screens (6 sizes)
- Push notifications (VAPID)
- Update prompt flow (not autoUpdate)
- Offline banners/indicators

## Admin Structure (`apps/admin/`)

### Pages (26 modules, all lazy-loaded)

- Dashboard — Financial metrics (profit, margin, MRR), charts (recharts)
- CRUD: Productos, Pedidos, Suscriptores, Reseñas, Paquetes, Descuentos, Usuarios, Clientes, Inventario, Recetas, Logros, Pagos Suscripciones, Lotes, Caficultores, Ubicaciones, Tipos Cata, Gift Cards, Pricing
- Operations: B2B Orders, B2B Inquiries, Carritos Abandonados, Logística, Auditoría
- Settings: Notificaciones (notification preferences)

### Admin Patterns

- `useModuleList` — Consistent list/table state management
- `usePagination` — Server/client-side pagination
- `ModuleContext` — Shared module state
- CSV export support
- AdminSkeleton/AdminErrorState loading patterns
- AdminLog audit viewer

## Key Flows

### Payment Flow

1. User adds items → CartContext (IndexedDB persisted)
2. Checkout → POST /api/payments/create-payment-intent (Stripe)
3. User fills Stripe card form → confirmPayment (Stripe Elements)
4. Webhook: POST /api/webhooks/stripe → Order created, stock deducted
5. Abandoned cart: CRON + reminder logic via POST /api/abandoned-cart

### Subscription Flow

1. User picks plan + coffee preferences → CoffeePicker (region, flavor)
2. POST /api/subscriptions → Stripe subscription created
3. Daily billing cron (3 AM) syncs with Stripe
4. Subscription pause/skip supported (maxSkips, skipCount)
5. B2B: Empresarial plan → consultation form → B2BInquiry model

### Barista Gamification Flow

1. User brews coffee → BrewLogForm modal (difficulty, rating, grind, temp, time, weight, equipment, flavor tags)
2. POST /api/barista/brew-logs → XP calculated, achievements checked
3. Level = floor(totalXp/100) + 1
4. Achievements unlock → toast notification
5. Leaderboard by total XP
6. Reward Shop: Redeem XP for discount codes

### Auth Flow

- User: Register → email verification → login → JWT (user role)
- Admin: Separate login → JWT (no role field)
- Dual middleware: requireAuth (admin) vs requireUserAuth (user)

### PWA Update Flow

1. SW detected → show UpdateNotificationModal (prompt, not autoUpdate)
2. User clicks "Update" → skipWaiting + reload
3. Toast: "Hemos actualizado el diseño de la app ✨"
4. Cart/critical state preserved via localStorage + IndexedDB

## Active Sprint: Barista Profile Overhaul (005)

- **Spec**: `specs/005-barista-profile-overhaul/spec.md` — 4 phases
- **Plan**: `specs/005-barista-profile-overhaul/plan.md` — subagent calls, Context7 research
- **Tasks**: `specs/005-barista-profile-overhaul/tasks.md` — 38 tasks
- **Validation**: `specs/005-barista-profile-overhaul/quickstart.md`
- **Location**: `apps/` placeholder — actual code in `client/` + `server/` + `packages/`

## Deployment

- **Railway**: IaC via `.railway/railway.ts` — auto-deploys from GitHub
- **Docker**: Each service has own Dockerfile (multi-stage for client: node→nginx)
- **Health check**: `/api/health` endpoint
- **Internal networking**: `.railway.internal` DNS for inter-service
- **Env vars**: JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET via Railway UI
- **DB migrations**: `prisma migrate deploy` at server startup

## Development Scripts

```bash
pnpm dev              # Concurrent client (vite) + server (ts-node-dev)
pnpm setup            # Install + DB setup
pnpm build            # Build client + server
pnpm typecheck        # TypeScript check both
pnpm test             # Vitest runs
pnpm lint             # ESLint
pnpm format:fix       # Prettier
pnpm docker:up        # PostgreSQL 16 via docker compose
pnpm docker:build     # Docker compose build
```

## Key Dev Gotchas

1. **Two auth middlewares**: `requireAuth` (admin) vs `requireUserAuth` (user) — DO NOT mix
2. **Webhooks raw body**: Register BEFORE `express.json()`
3. **AnimatePresence mode="wait"** breaks jsdom tests — use default sync
4. **Dark mode**: Every color needs `dark:` variant except always-dark components (admin modals, recipe live mode)
5. **Safe-area inset**: Fixed headers need `env(safe-area-inset-top)`; bottom elements need `env(safe-area-inset-bottom)`
6. **PWA update**: `registerType: 'prompt'` — do NOT add `skipWaiting: true`
7. **Two ConfirmDialog bug**: Only one rendered at a time in modals
8. **Prisma CI**: Use `prisma db push`, not `migrate dev`
9. **IDOR patterns**: Always verify resource ownership (e.g., `pm.customer === user.stripeCustomerId`)
10. **API validation**: Whitelist fields, not `...req.body` spread
