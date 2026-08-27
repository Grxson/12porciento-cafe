# 12% Brew — referencia de API

> Endpoints REST bajo `/api/brew`. Convenios:
> - Auth via header `Authorization: Bearer <token>`.
> - Admin: JWT sin `role: USER`. User: JWT con `role: USER`.
> - Paginación: `?page=1&pageSize=50` (max 100).
> - Respuesta paginada: `{ data, total, page, pageSize, totalPages }`.
> - Errores: `{ error: string, details?: any }`.

## Auth headers

| Rol | Header |
| --- | --- |
| Anónimo | (ninguno) |
| User | `Authorization: Bearer <user_jwt>` |
| Admin | `Authorization: Bearer <admin_jwt>` |

---

## Público

### `GET /api/brew/methods`

Lista métodos activos.

```json
{ "data": [ { "id": "...", "slug": "v60", "name": "V60", "category": "POUR_OVER", ... } ] }
```

### `GET /api/brew/methods/:slug`

Detalle de un método. 404 si no existe o está inactivo.

### `GET /api/brew/recipes`

Filtros: `method`, `profile`, `difficulty`, `coffeeId`, `recipeType`, `featured=true`, `search`.

```json
{
  "data": [
    {
      "id": "...",
      "slug": "12-sweet-v60",
      "title": "12% Sweet",
      "brewMethod": { "id": "...", "slug": "v60", "name": "V60", "icon": "☕" },
      "product": { "id": "...", "slug": "...", "name": "...", "imageUrl": "..." },
      "coffeeDoseGrams": 20,
      "waterGrams": 300,
      "waterTemperatureCelsius": 92,
      "profile": "SWEET",
      "recipeType": "OFFICIAL_12_PERCENT",
      "featured": true,
      "_count": { "steps": 9, "brewSessions": 12 }
    }
  ],
  "total": 6, "page": 1, "pageSize": 24, "totalPages": 1
}
```

### `GET /api/brew/recipes/:slug`

Detalle con `steps[]`, `parentRecipe`, `variants`.

### `GET /api/brew/coffees/:slug/recipes`

QR-ready. Devuelve el café + recetas linkeadas.

```json
{
  "coffee": { "id": "...", "slug": "volcan-de-jalisco", "name": "...", "imageUrl": "...", "category": "CAFÉ" },
  "data": [ /* Recipe[] */ ]
}
```

### `POST /api/brew/recipes/:id/scale`

Body: `{ coffeeDoseGrams: 17 }` (número > 0).

Respuesta:

```json
{
  "data": {
    "coffeeDoseGrams": 17,
    "waterGrams": 255,
    "ratio": 15,
    "scale": 0.85,
    "steps": [
      { "order": 3, "type": "BLOOM", "waterAmountGrams": 42.5, "targetTotalWaterGrams": 42.5, ... },
      ...
      { "order": 7, "type": "POUR", "waterAmountGrams": 51, "targetTotalWaterGrams": 255, ... }
    ]
  }
}
```

Errores:
- `400 { error: "coffeeDoseGrams debe ser > 0" }` — body inválido
- `400 { error: "La receta no tiene parámetros estructurados (...)" }` — recipe no apta para scaling
- `400 { error: "Receta inconsistente", details: ConsistencyError[] }` — recipe estructural rota
- `404 { error: "Receta no encontrada" }`

### `POST /api/brew/recipes/:id/dial-in`

Body: `{ result: "SOUR", current?: { temperatureCelsius, agitation, ratio, ... } }`. Acepta también `id = "ad-hoc"` para recomendaciones sin receta asociada.

`result` permitidos: `SOUR | BITTER | WATERY | STRONG | ASTRINGENT | UNDEREXTRACTED | OVEREXTRACTED | BALANCED | GOOD | EXCELLENT`.

Respuesta:

```json
{
  "data": {
    "primaryChange": "Muele ligeramente más fino.",
    "reason": "Un café marcadamente ácido suele indicar subextracción...",
    "reasonCode": "GRIND_FINER",
    "suggestions": [
      "Sube la temperatura de 92 °C a 93–94 °C.",
      "Incrementa el tiempo total de contacto 10–15 s."
    ]
  }
}
```

---

## User (auth)

### `POST /api/brew/sessions`

Inicia una sesión. Captura `recipeSnapshot` si hay `recipeId`.

Body: `{ recipeId?, coffeeId?, brewMethodId?, coffeeDoseGrams?, waterGrams?, ratio?, temperatureCelsius?, grindSetting?, grindMicrons?, equipmentSnapshot? }`.

Respuesta: `201 { data: BrewSession }` con `status = "PREPARING"`.

### `GET /api/brew/sessions`

Lista mis sesiones. Filtros: `coffeeId`, `recipeId`, `brewMethodId`, `status`, `minRating`, `from` (ISO date), `to`.

### `GET /api/brew/sessions/:id`

Detalle. Propietario o admin.

### `PUT /api/brew/sessions/:id`

Actualiza parámetros en curso. Whitelist:
- `coffeeDoseGrams`, `waterGrams`, `ratio`, `temperatureCelsius`, `grindSetting`, `grindMicrons`, `brewTimeSeconds`, `status`, `notes`.

Solo owner.

### `POST /api/brew/sessions/:id/complete`

Finaliza la sesión con feedback.

Body: `{ rating?, notes?, result?, sweetnessRating?, acidityRating?, bodyRating?, clarityRating?, brewTimeSeconds? }`.

- `rating` ∈ 1..5 (validado).
- `result` ∈ mismos valores que `/dial-in`.
- Cambia `status = COMPLETED`, `completedAt = now`.

### `DELETE /api/brew/sessions/:id`

Elimina (cascade sus favorites). Solo owner.

### `POST /api/brew/sessions/:id/favorite`

Toggle. Devuelve `{ data: { favorited: boolean } }`.

### `DELETE /api/brew/sessions/:id/favorite`

Quita favorito.

---

## Equipment (user)

### `GET /api/brew/equipment`

Lista mi equipo.

### `POST /api/brew/equipment`

Body: `{ name, brand?, category?, photoUrl?, isFavorite? }`.

`category` permitidos: `GRINDER | KETTLE | DRIPPER | SCALE | ESPRESSO_MACHINE | FILTER | OTHER`.

### `PUT /api/brew/equipment/:id`

Update parcial. Solo owner.

### `DELETE /api/brew/equipment/:id`

Solo owner.

---

## Water Profiles

### `GET /api/brew/water-profiles`

- Anónimo: solo oficiales.
- User: oficiales + propios.

### `POST /api/brew/water-profiles`

Body: `{ name, tds?, gh?, kh?, calcium?, magnesium?, sodium?, description? }`.

User-only. `official` siempre `false` al crear desde este endpoint.

### `DELETE /api/brew/water-profiles/:id`

Owner o admin. Admin puede eliminar oficiales.

---

## Admin (auth + adminLimiter + AdminLog)

### `GET /api/brew/admin/methods`

Lista TODOS los métodos (incluyendo inactivos) con `_count.recipes` y `_count.brewSessions`.

### `POST /api/brew/admin/methods`

Body (whitelist):
```
slug, name, description?, shortDescription?,
category (POUR_OVER | IMMERSION | PRESSURE | STOVETOP | COLD | TRADITIONAL | EVALUATION),
icon?, image?, difficulty?,
defaultRatioMin?, defaultRatioMax?, defaultTemperatureMin?, defaultTemperatureMax?,
defaultGrindMin?, defaultGrindMax?, active?
```

201 + AdminLog CREATE.

### `PUT /api/brew/admin/methods/:id`

Update parcial. AdminLog UPDATE con `before/after`.

### `DELETE /api/brew/admin/methods/:id`

AdminLog DELETE.

---

## Recipes admin (extendido)

`POST/PUT /api/recipes/admin` ahora acepta adicionalmente:
```
brewMethodId, coffeeDoseGrams, waterGrams, waterTemperatureCelsius,
grindTargetMicrons, profile, recipeType, featured, official, parentRecipeId
```

Para que una receta funcione en 12% Brew, debe tener **al menos**: `brewMethodId`, `coffeeDoseGrams`, `waterGrams`, `ratio` (string `"15"` o `"1:15"` — coerced por el servidor) y `recipeType`. Sin esos, el endpoint `/scale` devolverá 400.

---

## Códigos de error frecuentes

| HTTP | Mensaje | Causa |
| --- | --- | --- |
| 400 | `coffeeDoseGrams debe ser > 0` | Body de `/scale` inválido |
| 400 | `result inválido` | `/dial-in` con resultado desconocido |
| 400 | `rating debe estar entre 1 y 5` | `/sessions/:id/complete` con rating fuera de rango |
| 400 | `Receta inconsistente` | Validación de RecipeEngine falla |
| 401 | `No autorizado` | Falta JWT |
| 403 | `Acceso denegado` | User intenta admin endpoint |
| 403 | `Sin permiso` | user intentando agua-profile ajeno |
| 404 | `Receta no encontrada` / `Sesión no encontrada` / `Café no encontrado` | |
| 409 | `slug ya existe` | BrewMethod con slug duplicado |
| 500 | `Error al ...` | Falla genérica; ver `console.error` en server |

## Ejemplo end-to-end (con `curl`)

```bash
# 1. Listar métodos
curl https://api.12porciento.cafe/api/brew/methods

# 2. Escalar receta 12% Sweet (id=X) a 17 g
curl -X POST https://api.12porciento.cafe/api/brew/recipes/X/scale \
  -H 'Content-Type: application/json' \
  -d '{"coffeeDoseGrams":17}'

# 3. Dial-in ad-hoc
curl -X POST https://api.12porciento.cafe/api/brew/recipes/ad-hoc/dial-in \
  -H 'Content-Type: application/json' \
  -d '{"result":"SOUR","current":{"temperatureCelsius":92}}'

# 4. Iniciar sesión (user)
curl -X POST https://api.12porciento.cafe/api/brew/sessions \
  -H "Authorization: Bearer $USER_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"recipeId":"X","coffeeDoseGrams":17,"waterGrams":255}'

# 5. Completar sesión (user)
curl -X POST https://api.12porciento.cafe/api/brew/sessions/$SESSION_ID/complete \
  -H "Authorization: Bearer $USER_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"rating":4,"result":"SOUR","notes":"Un poco ácido"}'
```
