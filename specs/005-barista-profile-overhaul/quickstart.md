# Quickstart — Barista Profile Overhaul

## Prerequisitos

- `pnpm dev` corriendo (client + server)
- Base de datos migrada (SQLite local o PostgreSQL)
- Usuario registrado con al menos 1 brew log

## Fase 1 — Identity

```bash
# 1. Migrar schema
cd server && npx prisma migrate dev --name add_barista_identity

# 2. Verificar endpoints
curl -X PUT http://localhost:3001/api/barista/me/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Amante del V60","flavorProfile":{"favorites":["citricos","florales"],"preferredOrigin":"AFRICA","preferredRoast":"MEDIO"}}'

curl http://localhost:3001/api/barista/me/equipment \
  -H "Authorization: Bearer $TOKEN"

# 3. Test visual
open http://localhost:5173/perfil/barista/$USER_ID
# → Verificar banner, bio, avatar frame, flavor radar chart
```

## Fase 2 — Social

```bash
# 1. Migrar
cd server && npx prisma migrate dev --name add_barista_social

# 2. Follow
curl -X POST http://localhost:3001/api/barista/follow/$OTHER_USER_ID \
  -H "Authorization: Bearer $TOKEN"

# 3. Feed
curl http://localhost:3001/api/barista/feed?limit=5 \
  -H "Authorization: Bearer $TOKEN"

# 4. Like
curl -X POST http://localhost:3001/api/barista/brews/$BREW_ID/like \
  -H "Authorization: Bearer $TOKEN"

# 5. Verificar visual
open http://localhost:5173/feed
open http://localhost:5173/perfil/barista/$USER_ID
# → Botón follow, contadores, likes
```

## Fase 3 — Analytics

```bash
# 1. Migrar
cd server && npx prisma migrate dev --name add_brew_log_fields

# 2. Brew con parámetros
curl -X POST http://localhost:3001/api/barista/brew-logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId":"$RECIPE_ID",
    "rating":8,
    "grindSize":"medio",
    "waterTemp":93,
    "brewTime":150,
    "coffeeWeight":15,
    "waterVolume":250,
    "tags":["pour-over","weekend"]
  }'

# 3. Verificar visual
open http://localhost:5173/perfil/barista/$USER_ID
# → Radar chart con datos reales, records, bean tracker
```

## Fase 4 — Commerce

```bash
# 1. Migrar
cd server && npx prisma migrate dev --name add_rewards

# 2. Admin: crear reward
curl -X POST http://localhost:3001/api/admin/rewards \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"5% OFF",
    "description":"5% de descuento en tu próximo pedido",
    "xpCost":200,
    "rewardType":"DISCOUNT",
    "discountPct":5,
    "isActive":true
  }'

# 3. User: claim
curl -X POST http://localhost:3001/api/barista/rewards/$REWARD_ID/claim \
  -H "Authorization: Bearer $TOKEN"

# 4. Verificar visual
open http://localhost:5173/canjear
# → Reward shop, claim flow, brew→purchase button
```

## Comandos útiles

```bash
# Ver migrations aplicadas
cd server && npx prisma migrate status

# Reset DB local (cuidado — borra datos)
cd server && npx prisma migrate reset

# Generar client después de schema changes
cd server && npx prisma generate

# Type check client
cd client && npx tsc --noEmit
```
