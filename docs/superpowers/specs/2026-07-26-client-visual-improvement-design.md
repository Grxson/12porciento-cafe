# Diseño: Mejora visual completa del cliente y PWA

Fecha: 2026-07-26  
Estado: aprobado para documentación; pendiente de revisión de la especificación

## 1. Alcance y objetivo

Este documento define la evolución visual del storefront React/PWA de 12% Café. El alcance incluye `client/`, sus assets públicos y los componentes compartidos que consume el cliente. No incluye backend, Prisma, reglas de negocio, contratos de API ni rediseño del panel administrativo.

El objetivo es que la aplicación se perciba como una marca de café de especialidad coherente, confiable y editorial, con una experiencia de compra clara en móvil y escritorio. La prioridad es conversión: checkout, carrito, catálogo, detalle de producto, suscripciones y paquetes. Después se cubren cuenta, barista/gamificación, recetas, comunidad, galería, PWA, responsive y accesibilidad.

## 2. Diagnóstico de partida

La auditoría visual se realizó sobre las rutas públicas y autenticadas del cliente, en light/dark y en viewport móvil y desktop. Se revisaron 30 rutas y sus principales estados.

Hallazgos confirmados:

- `/checkout` con productos muestra el encabezado, pero el contenido principal queda en blanco; es el riesgo visual y comercial más grave.
- El catálogo, paquetes, recetas y galería repiten arte de placeholder del 12% en lugar de comunicar productos o contenido real.
- En móvil, `/perfil` tiene solapamiento entre banner, avatar y nombre.
- En 390 px, `/nosotros` presenta 16 px de overflow horizontal.
- El banner fallback de barista es un gradiente vacío y no una composición de marca.
- Logros y algunas recompensas pueden mostrar identificadores de icono crudos (`coffee`, `flame`, `target`, etc.).
- Los estados vacíos de recompensas y otras áreas tienen demasiado espacio sin jerarquía ni siguiente acción.
- Header y bottom navigation consumen una parte importante del viewport móvil.
- Checkout emite advertencias de dimensiones inválidas en gráficas y errores de permisos durante el render; deben aislarse para que nunca produzcan una pantalla vacía.

## 3. Principios de diseño

1. Conversión primero: cada pantalla comercial debe responder qué es, por qué importa, cuánto cuesta y cuál es la siguiente acción.
2. Contenido real antes que decoración: los placeholders solo aparecen como fallback explícito y con tratamiento de carga/error.
3. Una marca, dos densidades: storefront editorial y cálido; zonas operativas compactas, sin crear un segundo lenguaje visual.
4. Mobile first: el diseño parte de 320–390 px y escala hacia desktop.
5. Estados completos: loading, vacío, error, offline, éxito, contenido largo e imagen rota son parte del diseño.
6. Accesibilidad integrada: foco visible, teclado, contraste, targets táctiles de al menos 44 px, labels y reduced motion.
7. Cambios de frontend solamente: si falta información o media, se documenta el contrato mínimo requerido sin inventar lógica de servidor.

## 4. Dirección visual aprobada

La dirección es “especialidad cálida y editorial”: crema y café profundo como base, terracota/cobre para acción y acentos dorados usados con moderación. La interfaz debe sentirse artesanal, pero mantener la precisión de una tienda digital.

### 4.1 Sistema de tokens

Centralizar gradualmente en una única fuente de tokens:

- colores de superficie, texto, borde, acción, éxito, advertencia, error e información;
- variantes light/dark y estados hover, pressed, disabled y focus;
- tipografía de display para titulares y sans legible para UI/cuerpo;
- escala de espaciado, radios, sombras, alturas de control y breakpoints;
- z-index para header, drawer, modal, toast y navegación móvil;
- safe areas para header y bottom navigation;
- paleta de gráficas compatible con ambos temas.

Se conservará la identidad coffee/gold existente donde sea útil, pero se eliminarán colores sueltos y duplicados que generen inconsistencias. La migración se hará mediante primitives para no reescribir todas las páginas a la vez.

### 4.2 Primitives compartidos

Crear o consolidar: `Button`, `IconButton`, `Card`, `Badge`, `Input`, `Select`, `Tabs`, `Modal`, `Drawer`, `Toast`, `EmptyState`, `ErrorState`, `Skeleton`, `PageHeader`, `Breadcrumbs`, `StickyActionBar` y `MediaFrame`.

Cada primitive debe documentar variantes, tamaños, estados, soporte dark mode y comportamiento responsive. `MediaFrame` debe controlar ratio, object-fit, loading, imagen rota, alt y fallback visual sin convertir el fallback en contenido principal.

## 5. Estrategia de entrega

Se implementará por cortes verticales, siempre dejando una ruta utilizable al terminar cada corte:

1. Checkout y carrito.
2. Media, catálogo y detalle de producto.
3. Suscripciones, paquetes y B2B.
4. Sistema visual y migración de componentes.
5. Cuenta, perfil barista y gamificación.
6. Recetas, galería y comunidad.
7. PWA, instalación, actualización y offline.
8. Responsive, accesibilidad y QA visual integral.

## 6. Fase 1 — Checkout y carrito (P0)

### Diseño

- Estructurar checkout como pasos visibles: Datos, Envío, Pago y Confirmación.
- En desktop: formulario a la izquierda y resumen persistente a la derecha.
- En móvil: resumen colapsable y barra inferior fija con total y CTA, respetando `safe-area-inset-bottom`.
- Mostrar estados de carga, error de pago, datos incompletos, sesión expirada, carrito modificado y éxito.
- Mantener el carrito y permitir recuperar el checkout tras recarga o volver desde Stripe.

### Corrección técnica visual

- Aislar el componente que deja `/checkout` en blanco con boundary de error y fallback accionable.
- Garantizar que el render directo de `/checkout` tenga contenido aunque Stripe, una gráfica o una dependencia externa no cargue.
- Dar dimensiones explícitas a cualquier `ResponsiveContainer` y evitar montar gráficas no necesarias en checkout.
- Verificar lazy loading, errores de red, navegación atrás y viewport pequeño.

### Carrito/drawer

- Imagen real o `MediaFrame` con fallback, nombre, variante, cantidad, precio unitario y subtotal por línea.
- Subtotal fijo y CTA claramente separado de eliminar/seguir comprando.
- Overlay, Escape, foco atrapado, scroll interno y cierre táctil consistente.

### Aceptación

- No existe pantalla blanca en checkout con carrito lleno, recarga directa o conexión lenta.
- El flujo es utilizable a 390, 768, 1024 y desktop amplio.
- Cada error muestra explicación y siguiente acción.
- Cart drawer y checkout comparten tokens y estados.

## 7. Fase 2 — Catálogo, media y producto (P0)

- Introducir `MediaFrame` con ratios: producto 4:5, receta 4:3, banner 3:1, avatar 1:1.
- Sustituir el placeholder repetido por imágenes reales disponibles; si un recurso no existe, usar un fallback diferenciado y etiquetado como carga/error.
- Rediseñar `ProductCard` con imagen, origen, notas sensoriales, precio, disponibilidad, badge contextual y CTA. Evitar exceso de texto y botones ambiguos.
- En tienda, separar filtros, orden, búsqueda y resultados; en móvil usar panel de filtros y chips con scroll controlado.
- En detalle, priorizar galería, nombre, precio, prueba sensorial, origen, recomendaciones de preparación, disponibilidad y CTA sticky móvil.
- Diseñar estados de stock, producto no encontrado, imagen rota, carga y error.
- En paquetes, mostrar productos incluidos, ahorro, precio anterior/nuevo, imagen y CTA; no depender de tarjetas vacías.
- En recetas y galería, corregir composición, proporción y jerarquía para que el arte no domine el contenido.

## 8. Fase 3 — Suscripciones, paquetes y B2B (P1)

- Comparar planes con precio, frecuencia, beneficios, flexibilidad, recomendación y CTA.
- Apilar tarjetas en móvil sin perder precio ni acción principal.
- Hacer evidente pausa, salto y gestión de suscripción sin competir con la compra inicial.
- En B2B, presentar propuesta de valor, métricas, tipos de cliente, catálogo y formulario con campos agrupados y feedback visible.
- Mantener una sola jerarquía de botones para iniciar compra, solicitar asesoría y consultar detalles.

## 9. Fase 4 — Sistema visual transversal (P1)

- Consolidar tokens y primitives antes de migrar páginas completas.
- Definir patrones para page header, secciones, cards, tablas ligeras, formularios, tabs, drawers, modales, toasts y skeletons.
- Normalizar copy de botones, estados y mensajes en español.
- Aplicar dark mode real a cada superficie, borde, icono, placeholder, gráfica y estado; no usar inversión automática como sustituto.
- Reducir sombras, gradientes y adornos donde compitan con imágenes o CTA.
- Mantener la personalidad editorial en portada y storytelling, pero elevar densidad informativa en compra y cuenta.

## 10. Fase 5 — Cuenta, barista y gamificación (P1)

- Corregir el solapamiento móvil de `/perfil` separando banner, avatar, nombre y tabs; probar nombres largos y avatar ausente.
- Crear composición de fallback de banner barista con textura, color, patrón o mensaje de marca, sin dejar un gradiente vacío.
- Reorganizar perfil barista: identidad, nivel/XP, racha, estadísticas, registros, equipo y radar en orden de importancia.
- Hacer que leaderboard, feed, logros y recompensas compartan cards, badges y estados.
- Mapear identificadores de icono a iconos seguros; cualquier valor desconocido debe tener fallback visual, nunca texto crudo.
- Rediseñar empty states de recompensas, equipo, cafés, reseñas y wishlist con explicación, CTA y ejemplo visual.
- Verificar gráficos en light/dark, labels, tooltips y dimensiones mínimas.

## 11. Fase 6 — Recetas, galería y comunidad (P1)

- Usar imágenes reales y una composición editorial controlada, no una cuadrícula de placeholders repetidos.
- Añadir filtros y agrupación por método/dificultad con estados activos legibles.
- En detalle de receta, separar hero, metadata, ingredientes, pasos, video/media, rating, favorito y CTA de compra.
- En galería, usar masonry solo cuando preserve lectura y rendimiento; permitir abrir media con contexto y cierre accesible.
- Diferenciar claramente contenido inspiracional, receta guardada, favorito y acción comercial.

## 12. Fase 7 — PWA (P1)

- Revisar nombre corto/largo, theme/background color, iconos, maskable icon, favicon y splash screens.
- Diseñar install prompt con frecuencia controlada, beneficio claro y cierre accesible.
- Diseñar actualización disponible con copy útil, acción primaria y opción posterior; conservar la estrategia prompt existente.
- Mejorar offline banner/indicator para distinguir sin conexión, datos en caché, cola pendiente y sincronización completada.
- Verificar navegación de rutas profundas al abrir desde icono, recarga offline y restauración de carrito/wishlist/historial.
- Evitar que cache stale muestre una vista visualmente rota o contenido sin indicación.

## 13. Fase 8 — Responsive, accesibilidad y rendimiento visual (P0/P1)

Probar como mínimo 320, 375, 390, 414, 768, 1024, 1280 y 1440 px, además de landscape móvil. Corregir explícitamente el overflow de 16 px de `/nosotros`.

Checklist transversal:

- sin overflow horizontal accidental;
- targets táctiles de al menos 44 px;
- foco visible y orden de tabulación lógico;
- labels y nombres accesibles para icon buttons;
- contraste en light/dark y estados disabled;
- zoom de 200% sin pérdida de contenido;
- `prefers-reduced-motion` respetado;
- safe areas en elementos fijos;
- imágenes con dimensiones, `alt`, lazy loading y ratio estable;
- skeletons que no salten al contenido final;
- header/bottom nav que no oculten contenido ni CTA.

## 14. Fase 9 — QA visual por rutas y estados

Crear una matriz de verificación para todas las rutas públicas y autenticadas. Cada ruta se revisará en light/dark y, cuando aplique, con usuario nuevo, usuario activo, datos largos, carga lenta, offline, error, vacío, éxito e imagen rota.

Rutas críticas para regresión visual: `/`, `/tienda`, detalle de producto, `/carrito`, `/checkout`, `/suscripciones`, `/paquetes`, `/perfil`, `/perfil/barista`, `/leaderboard`, `/recompensas`, `/logros`, `/recetas`, detalle de receta, `/galeria`, `/b2b`, `/quiz`, login/registro y las rutas 404/offline.

Guardar capturas comparables de los cortes críticos y verificar especialmente: checkout sin blanco, media real, perfil móvil sin overlap, `/nosotros` sin overflow, iconos no crudos y PWA instalable.

## 15. Orden recomendado de implementación

1. Reproducir y aislar el blank de checkout; añadir boundary, estados y layout base.
2. Resolver carrito/drawer y barra de acción móvil.
3. Implementar `MediaFrame` y conectar media real/fallback controlado.
4. Rediseñar cards, tienda, producto y paquetes.
5. Resolver suscripciones y B2B.
6. Consolidar tokens/primitives y migrar superficies repetidas.
7. Corregir perfil, barista, iconos y empty states.
8. Mejorar recetas, galería y comunidad.
9. Auditar manifest, install/update/offline y safe areas.
10. Ejecutar matriz responsive, accesibilidad, light/dark y regresión visual.

## 16. Criterios globales de terminado

- Ninguna pantalla principal queda en blanco ante una dependencia fallida.
- No se muestran placeholders repetidos cuando existe contenido o media utilizable.
- No persiste overflow conocido en los tamaños definidos.
- Todo estado vacío o de error explica qué ocurre y ofrece una acción.
- Los CTA principales son identificables y consistentes.
- Light/dark mantienen contraste y jerarquía equivalentes.
- Checkout, carrito y PWA funcionan con recarga, conexión lenta y offline donde corresponda.
- Las rutas profundas se pueden abrir directamente sin perder layout ni contenido.
- El trabajo no cambia backend ni contratos salvo que una ausencia de media/metadata quede documentada como dependencia explícita.

## 17. Riesgos y mitigaciones

| Riesgo                                       | Mitigación                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dependencia externa de pagos rompe el layout | Boundary, fallback, dimensiones y pruebas de carga/recarga                                 |
| No hay assets reales para algunos productos  | `MediaFrame` y lista de assets faltantes; no ocultar el problema con un placeholder global |
| Migración de CSS rompe páginas existentes    | Tokens/primitives por corte y regresión por rutas                                          |
| Light/dark divergen                          | Checklist por componente y capturas en ambos temas                                         |
| Viewport móvil recorta elementos fijos       | safe areas, scroll tests y barra sticky contextual                                         |
| Datos contienen iconos como strings          | mapa de iconos + fallback seguro + prueba con valor desconocido                            |

## 18. Fuera de alcance

No se rediseñará el admin en este ciclo, no se modificarán modelos o endpoints por conveniencia visual, no se cambiarán reglas de checkout/pagos, no se alterará la lógica de gamificación y no se incorporará una librería de componentes externa sin justificarlo frente a los primitives existentes.
