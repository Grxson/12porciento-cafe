# Especificación: Mejora de Perfil, Banner, B2B e Iconos PWA

## Resumen

Corregir 4 áreas de UX/UI identificadas post-sprint: navegación del perfil, banner de portada tipo red social, página B2B atractiva para empresas, e iconos PWA correctos.

## Alcance

### 1. Navegación de Perfil (Fase A)

- Reemplazar barra deslizante horizontal con grid de acceso rápido
- Agrupar secciones por categoría (Pedidos, Perfil, Barista, Cuenta)
- Mantener rutas existentes, solo cambiar layout de navegación

### 2. Banner de Portada (Fase B)

- Endpoint dedicado para banner con crop 1200×400
- Preview en settings con overlay de guía
- Header tipo Facebook: banner full-width + avatar montado + info
- Responsive: aspect ratio 3:1 mobile, 4:1 desktop
- Gradiente overlay y fallback animado

### 3. Página B2B (Fase C)

- Hero visual con CTA
- Sección de beneficios (cards)
- Catálogo con fotos grandes
- Formulario en modal/lateral (no scroll infinito)
- Botón flotante sticky en mobile
- Sección de confianza/estadísticas

### 4. Iconos PWA (Fase D)

- Regenerar todos los iconos desde logo.svg
- Maskable icon con padding correcto (NO solo texto)
- Añadir size 1024×1024 al manifest
- Verificar en dispositivo real

## No Incluye

- Nuevas secciones de perfil
- Backend B2B (solo frontend)
- Nuevas funcionalidades PWA (solo iconos)
