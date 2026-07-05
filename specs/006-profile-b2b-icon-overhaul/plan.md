# Plan de Mejora: Perfil de Usuario, Banner, B2B e Iconos PWA

## Problemas Identificados

### 1. Navegación del Perfil (Profile.tsx)

**Diagnóstico:**

- 9 tabs en barra horizontal deslizante (Pedidos, Reseñas, Wishlist, Suscripción, Pago, Mi Perfil, Gift Cards, Equipo, Cafés)
- En mobile, tabs tan angostos que apenas se lee el label
- Scroll horizontal no intuitivo — usuario no sabe que hay más tabs
- No hay jerarquía visual entre secciones principales y secundarias

### 2. Banner de Portada

**Diagnóstico:**

- **Upload genérico**: Usa `processImage()` que redimensiona a 1200×1200 max (`fit: 'inside'`), sin crop a 1200×400 para banner
- **No previsualiza correctamente**: No hay crop tool ni preview del aspect ratio correcto
- **Display pobre en BaristaProfile**: Solo un div con `backgroundImage`, altura fija h-48/h-64, sin overlay text, sin gradiente
- **No es responsive**: En mobile, banner muy grande; en desktop, muy pequeño. Sin diseño tipo Facebook/Instagram
- **Falta relación banner-avatar**: Avatar no se monta sobre el banner (posición absoluta)

### 3. Página B2B (B2BCatalog.tsx)

**Diagnóstico:**

- **Catálogo genérico**: Solo muestra lista de productos con precios, sin fotos atractivas ni storytelling
- **Formulario al final**: Largo scroll hasta el formulario — el usuario ve productos, después decide si cotiza. Mucho texto.
- **Sin valor agregado**: No muestra beneficios, testimonios, casos de uso, ni por qué elegir este café
- **Diseño plano**: Sin hero visual, sin imágenes de oficinas/tazas, sin diferenciación B2B
- **Sin CTA temprano**: No hay botón "Cotizar ahora" flotante o visible sin scroll extremo

### 4. Icono PWA (vite.config.ts + icons)

**Diagnóstico:**

- **Maskable icon incorrecto**: `regenerate-icons.mjs` genera el maskable icon con solo texto "12%" en vez de usar el logo real con padding seguro
- **icon.png no referenciado**: El archivo `icon.png` (1024×1024, 1.46MB) no aparece en el manifest, solo se usa como fuente para regenerar. No es servido como icon de la app
- **Source PNG sin transparencia**: El `icon.png` puede tener área no segura para iconos adaptables de Android
- **Sin badge/monochrome icon**: Faltan variantes para notificaciones, shortcuts, widgets
- **Icons desactualizados**: Necesitan regenerarse desde `logo.svg` con padding correcto para maskable

---

## Plan de Implementación

### Fase A: Rediseño de navegación del perfil

**A1** — Rediseñar Profile.tsx con layout de sidebar/categorías:

- Reemplazar scroll horizontal con grid de iconos grandes tipo menú de apps (3-4 columnas en desktop, 2 en mobile)
- Agrupar secciones: **Pedidos** (Pedidos, Gift Cards), **Perfil** (Mi perfil, Reseñas), **Barista** (Equipo, Cafés), **Cuenta** (Suscripción, Pago, Wishlist)
- Cada grupo con cabecera `h3` + cards clickeables con icono grande + label
- Mantener rutas existentes (está bien anidadas en `<Routes>`)
- Añadir breadcrumb o migajón: "Perfil > Pedidos > #1234"

**A2** — Header de perfil rediseñado:

- Banner como fondo del header (más abajo)
- Avatar + nombre + email sobre el banner
- Link a Perfil Barista con nivel/XP más prominente

**Archivos afectados:** `client/src/pages/Profile.tsx`

---

### Fase B: Banner tipo red social

**B1** — Upload de banner con crop dedicado:

- Nuevo endpoint o modo en uploads.ts: `processBannerImage()` que force crop 1200×400 con `sharp.resize(1200, 400, { fit: 'cover' })`
- En Settings.tsx: preview con overlay de guía de crop (líneas punteadas del area visible)
- Upload progress bar y compresión automática a WebP

**B2** — BaristaProfile.tsx rediseño completo del header:

- Banner full-width con `aspect-[3/1]` en mobile, `aspect-[4/1]` en desktop
- Gradiente overlay sobre el banner (coffee-950/60 a transparente en esquina inferior derecha)
- Avatar montado sobre el banner con posición absoluta (bottom-[-40px] left-[24px])
- Nombre, nivel, XP alineados junto al avatar (flex row)
- Info del perfil (brews, racha, bio) debajo en cards separadas

**B3** — Banner fallback con gradiente gold/coffee animado

**Archivos afectados:**

- `server/src/lib/uploads.ts` (nueva función `processBannerImage`)
- `server/src/routes/uploads.ts` (nuevo endpoint `POST /banner`)
- `client/src/pages/profile/Settings.tsx`
- `client/src/pages/BaristaProfile.tsx`
- `client/src/api/index.ts` (nuevo `bannerApi`)

---

### Fase C: Página B2B atractiva

**C1** — Rediseñar B2BCatalog.tsx:

- Hero visual: imagen grande de oficina/grano/taza con overlay gradiente + CTA "Solicitar cotización"
- Sección "¿Por qué nuestro café?" con 3-4 cards de beneficios (icono + título + descripción):
  - Grano 100% mexicano
  - Precios preferenciales por volumen
  - Asesoría personalizada
  - Envío a toda la república
- Catálogo de productos con fotos grandes en grid (no solo texto), con precio B2B visible sin click
- Formulario más compacto en modal/lateral, no al final de scroll infinito
- Botón flotante "Cotizar ahora" sticky en mobile
- Sección de confianza: logos de clientes, estadísticas, testimonial

**C2** — Opcional: galería de fotos de empresas/clientes satisfechos

**C3** — Añadir navegación a B2B desde BottomNav (reemplazar o añadir link)

**Archivos afectados:**

- `client/src/pages/B2BCatalog.tsx` (reescritura completa)
- `client/src/components/BottomNav.tsx` (añadir link a B2B)

---

### Fase D: Iconos PWA correctos

**D1** — Regenerar todos los iconos PWA desde `logo.svg`:

- Fijar `regenerate-icons.mjs` para usar `logo.svg` como fuente principal en lugar de `icon.png`
- Maskable icon: usar logo con padding 10% (safe zone 81.6%), NO reemplazar con texto plano
- Añadir padding al SVG source para iconos maskables con fondo coffee-950 redondeado
- Forzar RGBA (no colormap) para todos los PNGs

**D2** — Verificar sizes: asegurar 48x48, 72x72, 96x96, 144x144, 192x192, 512x512 para cubrir todos los dispositivos

**D3** — Añadir `icon.png` al manifest como fallback 1024x1024 (aunque algunos launchers lo usan)

**D4** — Re-ejecutar script de regeneración y verificar:

```bash
node client/scripts/regenerate-icons.mjs
```

**Archivos afectados:**

- `client/scripts/regenerate-icons.mjs`
- `client/public/icons/*` (archivos regenerados)
- `client/vite.config.ts` (añadir icon.png o size 1024 al manifest)

---

## Resumen de fases y archivos

| Fase | Archivos                                                                            | Tipo       | Prioridad |
| ---- | ----------------------------------------------------------------------------------- | ---------- | --------- |
| A    | `Profile.tsx`                                                                       | Modificar  | Alta      |
| B    | `uploads.ts`, `uploads route`, `Settings.tsx`, `BaristaProfile.tsx`, `api/index.ts` | Modificar  | Alta      |
| C    | `B2BCatalog.tsx`, `BottomNav.tsx`                                                   | Reescribir | Media     |
| D    | `regenerate-icons.mjs`, `icons/*`, `vite.config.ts`                                 | Modificar  | Alta      |

## Dependencias

- B depende de: endpoint de banner upload (crear o modificar processImage)
- C puede ir en paralelo con A y B
- D independiente, puede ir en cualquier momento
- A es independiente

## Verificación

- Cada fase verificar TS errors 0
- Banner: probar upload + display en mobile y desktop
- Perfil: navegar entre todas las secciones en mobile y desktop
- B2B: flujo completo sin scroll excesivo
- PWA: `railway run npx prisma migrate status` OK, probar install en Android/iOS
