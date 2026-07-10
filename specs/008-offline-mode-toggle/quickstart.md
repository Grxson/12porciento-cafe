# 008 Offline Mode Toggle — Quickstart

## Dev setup

```bash
pnpm dev  # client + server
```

## Validation checklist

### Phase A — Toggle

- [ ] Abrir `/perfil/configuracion` → ver sección "Modo sin conexión"
- [ ] Toggle ON por defecto
- [ ] Desactivar toggle → recargar → sigue OFF (persistencia)
- [ ] Activar/desactivar 5 veces seguidas → sin errores

### Phase B — Warnings

- [ ] Poner offline (DevTools > Network > Offline)
- [ ] Badge "Sin conexión" aparece arriba a la derecha
- [ ] Ir a `/tienda` → banner contextual
- [ ] Ir a `/checkout` → banner "Stripe requiere conexión"
- [ ] Desactivar toggle → indicadores desaparecen
- [ ] Volver online → indicadores desaparecen

### Phase C — Stale Data

- [ ] Estando online, abrir wishlist → sin badge
- [ ] Poner offline, abrir wishlist → badge "Datos guardados"
- [ ] Badge muestra timestamp relativo
- [ ] Desactivar toggle → badge desaparece

### Phase D — SW behavior

- [ ] Toggle OFF: Desactivar DevTools offline, recargar página → error de red (sin fallback a cache)
- [ ] Toggle ON: Desactivar DevTools offline, recargar → datos cacheados visibles
