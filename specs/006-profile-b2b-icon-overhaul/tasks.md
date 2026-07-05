# Tasks: Profile, Banner, B2B & PWA Icons

## Fase A — Navegación de Perfil

- [x] A1 Rediseñar Profile.tsx: grid de iconos por categorías en vez de scroll horizontal
- [x] A2 Mejorar header de perfil: avatar + nombre + email + link barista más prominente

## Fase B — Banner tipo red social

- [x] B1 Crear `processBannerImage()` en uploads.ts con crop 1200×400
- [x] B2 Crear endpoint POST /api/uploads/banner en uploads route
- [x] B3 Actualizar Settings.tsx con preview + guía de crop para banner
- [x] B4 Rediseñar BaristaProfile.tsx header: banner overlay, avatar montado, layout responsive
- [x] B5 Añadir fallback banner animado con gradiente gold/coffee

## Fase C — Página B2B atractiva

- [x] C1 Rediseñar B2BCatalog.tsx: hero visual, beneficios, fotos grandes, formulario compacto
- [x] C2 Añadir botón flotante "Cotizar ahora" sticky en mobile
- [x] C3 Añadir link a Empresas en BottomNav

## Fase D — Iconos PWA correctos

- [x] D1 Fijar regenerate-icons.mjs para usar logo.svg como fuente con padding maskable correcto
- [ ] D2 Regenerar todos los PNGs ejecutando el script
- [x] D3 Añadir icon.png o size 1024 al manifest en vite.config.ts
- [ ] D4 Verificar instalación PWA en dispositivo real

## Total

| Fase      | Tasks  | Prioridad |
| --------- | ------ | --------- |
| A         | 2      | Alta      |
| B         | 5      | Alta      |
| C         | 3      | Media     |
| D         | 4      | Alta      |
| **Total** | **14** |           |
