# 008 — Offline Mode Toggle & UX Polish

## Problem

Offline mode funciona pero no da control al usuario. No hay forma de desactivar caché, no hay advertencias claras cuando los datos son stale, y el indicador offline actual es mínimo.

## Solution

4 fases incrementales:

### Phase A — Offline toggle en configuración

- Switch ON/OFF "Navegación sin conexión" en `/perfil/configuracion`
- Almacenar en `UserContext` (Zustand persist)
- Al OFF: SW ignora cache, siempre fetch online
- Al ON: comportamiento actual (default)

### Phase B — Enhanced offline warnings

- OfflineIndicator mejorado con tooltip "Algunas funciones pueden no estar disponibles"
- OfflineBanner extendido a páginas clave (tienda, checkout, producto)
- Badge "Datos guardados — pueden no estar actualizados" en wishlist/orders cuando vienen de caché

### Phase C — Stale-data indicators

- Badge visual en cards y listas cuando datos vienen de caché
- Timestamp "Última actualización: ..." en páginas offline
- Color tenue en datos cacheados vs frescos

### Phase D — Gestión de caché visible

- Sección en configuración: "Almacenamiento offline"
- Ver tamaño de caché por tipo (recetas, imágenes, API)
- Botón "Limpiar caché"
- Botón "Sincronizar ahora"

## Impact

- Archivos: 8-10
- Insertions: ~350
- Risk: Bajo (solo UI + store, sin cambios de schema ni API)
