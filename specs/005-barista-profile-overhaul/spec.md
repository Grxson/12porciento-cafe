# Barista Profile Overhaul — Identity, Social, Analytics & Commerce

## Descripción

Transformar el perfil barista de funcional a identitario. Añadir personalización visual, interacción social, analytics profundos e integración comercial. Ejecutar en 4 fases incrementales.

---

## Fase 1 — Identidad Barista (Personalización)

### Qué construye

Capa de identidad visual y personal sobre el perfil barista existente.

### Componentes

**1.1 Bio Barista**

- Campo "sobre mí" editable desde settings
- Límite: 280 caracteres
- Markdown básico (negritas, itálicas)

**1.2 Banner de portada**

- Imagen de cabecera 1200×400px
- Upload con crop + preview
- Defecto: gradiente gold/coffee

**1.3 Título personalizable**

- Sistema de "titles" desbloqueables por logros
- Título activo visible en perfil + leaderboard
- Gestión desde achievement gallery
- Títulos ejemplo: "Maestro V60", "Aventurero del Origen", "Catador Nocturno"

**1.4 Avatar frames por nivel**

- Nv 1-5: borde simple gold
- Nv 6-10: borde doble gold + glow
- Nv 11-15: borde con granos de café SVG
- Nv 16-20: escudo animado
- Nv 21+: corona legendaria con partículas

**1.5 Equipo / Setup showcase**

- CRUD de equipos: nombre, marca, foto, categoría (molino, kettle, dripper, báscula)
- Visible en perfil como grid
- Equipo favorito destacado

**1.6 Perfil de sabor**

- Selección de flavors favoritos (de lista curada: chocolate, frutos rojos, cítricos, florales, etc.)
- Origen preferido: África, América Latina, Asia
- Toast level preferido: claro, medio, oscuro
- Radar chart visual en perfil público

### UX / Diseño

- Banner 1200×400 con overlay degradado
- Avatar circular sobre banner (posición absoluta)
- Bio debajo del nombre
- Grid de equipo 2 columnas mobile, 4 desktop
- Radar chart de sabor con Recharts
- Selector de título en modal con preview

---

## Fase 2 — Social (Comunidad)

### Qué construye

Sistema social entre baristas: follows, feed, reacciones.

### Componentes

**2.1 Follow system**

- Modelo: Follow (followerId, followingId, createdAt)
- Botón Follow/Unfollow en perfil barista
- Contadores: "Siguiendo" / "Seguidores"
- API: POST /barista/follow, DELETE /barista/follow/:userId, GET /barista/followers, GET /barista/following

**2.2 Social feed**

- Ruta: `/feed` (requiere auth)
- Timeline de brews de seguidos (más recientes)
- Infinite scroll con paginación
- Cada card: foto, rating, receta, XP, fecha
- CTA: "Registra tu brew" si feed vacío

**2.3 Reacciones a brews**

- Like en brew log (corazón)
- Contador de likes visible
- API: POST /barista/brews/:brewId/like, DELETE /barista/brews/:brewId/like

**2.4 Compartir perfil**

- Botón "Compartir" en perfil
- Web Share API (navigator.share) en mobile
- Copiar link en desktop
- Card de preview generada con OG tags dinámicos

### UX / Diseño

- Feed estilo Instagram: card limpia, foto grande, métricas abajo
- Like animation (heart pop + color transition)
- Seguir/Dejar de seguir con animación
- Share sheet nativo en mobile
- Toast feedback en todas las acciones sociales

---

## Fase 3 — Analytics & Data Richness (Profundidad)

### Qué construye

Datos más ricos en brew logging, dashboard analítico personal, summary reports.

### Componentes

**3.1 Brew logging avanzado**

- Nuevos campos opcionales:
  - grindSize (string)
  - waterTemp (number)
  - brewTime (number, segundos)
  - coffeeWeight (number, gramos)
  - waterVolume (number, ml)
  - beanId (FK → Product opcional)
  - equipmentUsed (JSON array de equipment IDs)
  - tags (string[]: "pour-over", "weekend", "experimento")
- UI: sección expandible "Parámetros técnicos"
- Pre-llenado inteligente desde receta base

**3.2 Taste profile evolution**

- Radar chart comparativo: período actual vs anterior
- Flavors más usados en notas (word cloud básico)
- Evolución de rating promedio por mes (line chart)
- Método preferido over time (bar chart)

**3.3 Personal records dashboard**

- Sección "Records" en perfil:
  - Mejor rating (con link al brew)
  - Racha más larga
  - Más XP en un día
  - Más brews en un mes
  - Método con más brews
  - Origen más repetido
- Animación de "New Record!" al superar

**3.4 Monthly wrap / Summary**

- Trigger: cada 1ro del mes (o manual "Ver mi resumen")
- Stats del mes: brews, XP ganados, nivel alcanzado, logros, método top, rating promedio, café favorito
- Shareable: generar imagen de resumen (html2canvas)
- Toast al inicio del mes: "Tu resumen de Marzo está listo"

**3.5 Bean / Coffee tracker**

- Cada brew puede linkearse a un producto (café) comprado en la tienda
- "Cafés probados": grid de coffees con count de brews
- Total gastado estimado (gramos × precio)

### UX / Diseño

- Radar chart Recharts con 6 dimensiones
- Line chart 3 meses de rating
- Dashboard tipo "Wrapped": cards grandes con iconos
- Monthly wrap: modal con transiciones animadas
- Bean grid: mosaic de etiquetas de café

---

## Fase 4 — Commerce & Gamification (Monetización)

### Qué construye

Puente entre sistema barista y tienda: XP canjeable, recomendaciones, loyalty.

### Componentes

**4.1 XP Rewards Shop**

- Ruta: `/canjear` (requiere auth)
- Tabla: Reward (id, name, description, xpCost, discountPct, maxClaims, expiresAt, isActive)
- Tabla: RewardClaim (id, userId, rewardId, claimedAt, usedAt, expiresAt)
- Catálogo de rewards:
  - 200 XP → 5% OFF en próximo pedido
  - 500 XP → Envío gratis
  - 1000 XP → 10% OFF en suscripción 1 mes
  - 2000 XP → Café edición limitada GRATIS
- API CRUD admin para rewards
- UI: grid de rewards con XP cost, barra "Tienes X XP disponibles"
- Claim flow: confirmación → código de descuento generado

**4.2 Brew → Purchase flow**

- En brew log detail: botón "Comprar este café" si beanId presente
- Si no hay beanId: "Café recomendado para esta receta" (desde recipe.productId)
- Tracking: orden creada desde brew log

**4.3 Equipment recommendations**

- Basado en métodos más usados → sugerencias de equipo
- Ej: "Usas V60 constante → Fellow Stagg EKG"
- Links a productos en tienda con affiliate tracking interno

**4.4 Subscription matching**

- Basado en perfil de sabor + frecuencia de brews → plan de suscripción ideal
- Banner en perfil: "Según tu perfil, el plan EXPLORADOR es ideal para ti"
- Si ya tiene suscripción: upgrade recomendado

### UX / Diseño

- Reward shop: grid tipo tienda, cards con costo XP
- Brew→Purchase: botón gold con icono de carrito
- Recomendaciones: cards pequeñas con producto + "Ver en tienda"
- Subscription banner: dismissible, con tooltip explicativo

---

## Priorización

```
Fase 1 (Identidad):    Alta — base visual, sin esto el perfil es genérico
Fase 2 (Social):       Alta — engagement, comunidad, viralidad
Fase 3 (Analytics):    Media — profundidad, data richness
Fase 4 (Commerce):     Media-baja — monetización, depende de fases anteriores
```

## Dependencias

- Fase 1 depende de: perfil barista existente (completo)
- Fase 2 depende de: Fase 1 (banner/bio necesario para perfil público atractivo)
- Fase 3 depende de: schema brew log extendido (migración Prisma)
- Fase 4 depende de: Fase 3 (bean tracking), sistema de promocodes existente

## Stack técnico

| Capa          | Tecnología                      | Notas                                          |
| ------------- | ------------------------------- | ---------------------------------------------- |
| UI            | React 19 + Tailwind + Shadcn    | Existente                                      |
| Animaciones   | Framer Motion + canvas-confetti | Ya tiene framer-motion, añadir canvas-confetti |
| Charts        | Recharts                        | Ya instalado                                   |
| Data fetching | TanStack React Query            | Nueva dependencia                              |
| Compartir     | Web Share API + react-share     | Navegador nativo + fallback                    |
| Export imagen | html2canvas                     | Para monthly wrap                              |
| PWA offline   | Workbox + IndexedDB             | Extender caching a profile                     |
| Server        | Express + Prisma                | Existente                                      |

## Notas técnicas

- TanStack React Query reemplazará `useBarista` hook actual para caching y stale-while-revalidate
- canvas-confetti se usa para level up celebration, new record, achievement unlock
- Migraciones Prisma por fase para evitar schema drift
- OG tags dinámicos con react-helmet-async (ya instalado)
- Safe-area-inset respetado en todas las nuevas páginas
