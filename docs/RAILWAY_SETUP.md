# Railway Setup Guide

Configuración de infraestructura en Railway para 12% Café.

## Servicios en Railway

El proyecto se despliega en **3 servicios independientes + 1 base de datos**:

| Servicio               | Dockerfile              | Propósito                | Puerto |
| ---------------------- | ----------------------- | ------------------------ | ------ |
| **12porciento-server** | `server/Dockerfile`     | Backend API              | 3001   |
| **12porciento-web**    | `client/Dockerfile`     | Tienda pública (React)   | 80     |
| **12porciento-admin**  | `apps/admin/Dockerfile` | Admin dashboard (React)  | 80     |
| **postgres**           | (Managed DB)            | Base de datos PostgreSQL | 5432   |

**Cada servicio es independiente** — cambios en una carpeta solo rebuildan ese servicio.

## Secretos Requeridos en Railway UI

⚠️ **Estos secretos DEBEN configurarse en Railway Dashboard, no en código:**

Para `12porciento-server`:

- `JWT_SECRET` — clave para JWT tokens (generar con: `openssl rand -base64 32`)
- `STRIPE_SECRET_KEY` — clave secreta Stripe
- `STRIPE_WEBHOOK_SECRET` — webhook secret Stripe

## Variables de Entorno

### server (12porciento-server)

```
DATABASE_URL          → auto-inyectada por DB
NODE_ENV             = production
PORT                 = 3001
UPLOAD_DIR           = /app/data/uploads
CLIENT_URL           = https://12porciento-web-production.up.railway.app,https://12porciento-admin-production.up.railway.app
JWT_SECRET           → [Secreto en UI]
STRIPE_SECRET_KEY    → [Secreto en UI]
STRIPE_WEBHOOK_SECRET→ [Secreto en UI]
```

### web (12porciento-web)

```
VITE_API_URL                 = /api (proxied by nginx)
VITE_STRIPE_PUBLISHABLE_KEY  = pk_test_...
VITE_VAPID_PUBLIC_KEY        = BM4F... (push notifications)
```

### admin (12porciento-admin)

```
VITE_API_URL       = /api (proxied by nginx)
```

## Configuración en Railway UI

1. **Crear proyecto** (si no existe)

   ```bash
   railway init
   ```

2. **Agregar secretos** en Railway Dashboard → Variables:
   - Ir a `12porciento-server` → Variables → Add Variable
   - Seleccionar "Raw" para JWT_SECRET, STRIPE_*
   - Pegar valores seguros

3. **Database**: Railway auto-crea PostgreSQL con `postgres` service
   - `DATABASE_URL` se inyecta automáticamente

4. **Volumen para uploads** (opcional):
   - Railway → `12porciento-server` → Volumes
   - Crear volumen: `/app/data/uploads` (10GB recomendado)
   - Los uploads persisten entre redeploys

## Deploy Manual

```bash
# Conectar local a Railway
railway link

# Deployar cambios
railway deploy

# Ver logs
railway logs --service 12porciento-server
railway logs --service 12porciento-web
railway logs --service 12porciento-admin
```

## Auto-deploy

✅ Habilitado automáticamente:

- **Push a main** → todos los servicios se rebuildan si hay cambios en sus carpetas
- **CI/CD**: GitHub Actions ejecuta lint/test antes (ver `.github/workflows/ci.yml`)

## Health Checks

- **server**: GET `/api/health` (configurable en `.railway/railway.ts`)
- **web**: Nginx heartbeat (automático)
- **admin**: Nginx heartbeat (automático)

Railway reinicia servicios que fallen healthcheck.

## Troubleshooting

### Server no arranca

```bash
railway logs --service 12porciento-server --tail
```

Verificar:

- `DATABASE_URL` configurada ✓
- Secretos (JWT_SECRET, STRIPE_*) presentes ✓
- Migrations: `prisma migrate deploy` ejecutado ✓

### Web/Admin en blanco

```bash
railway logs --service 12porciento-web
```

Revisar:

- `VITE_API_URL=/api` ✓
- `VITE_STRIPE_PUBLISHABLE_KEY` presente (web) ✓
- Build ejecutado sin errores ✓

### Uploads se pierden

Crear volume en `12porciento-server` → Volumes → `/app/data/uploads`

## Referenciar Servicios Internamente

Entre servicios usa DNS interno de Railway:

```
http://12porciento-server.railway.internal:3001
```

(no puedes usar URLs públicas internas por costo)

---

**Última actualización**: 2026-07-05
