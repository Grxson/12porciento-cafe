# Auditoría integral — 12% Café

**Sistema:** 12% Café
**Frontend producción:** `12porciento-web-production.up.railway.app`
**Repositorio:** `Grxson/12porciento-cafe`
**Alcance:** Producto, UX, frontend, backend, API, seguridad, pagos, infraestructura, SEO, PWA, CI/CD y 12% Brew.

---

# 1. Resumen ejecutivo

La aplicación tiene una base técnica bastante avanzada:

* e-commerce;
* Stripe;
* cuentas;
* suscripciones;
* inventario;
* B2B;
* PWA;
* notificaciones;
* gamificación;
* 12% Brew;
* administración;
* tracking de pedidos;
* recetas;
* historial de preparación.

Sin embargo, la cantidad de funcionalidades ha crecido más rápido que el endurecimiento de algunos flujos críticos.

Mi valoración actual sería:

| Área                  | Estado                              |
| --------------------- | ----------------------------------- |
| Experiencia visual    | Buena base                          |
| Arquitectura frontend | Buena                               |
| Arquitectura backend  | Aceptable/Buena                     |
| 12% Brew              | Prometedor, necesita consolidación  |
| E-commerce            | Necesita correcciones               |
| Checkout              | Riesgo alto                         |
| Stripe                | Riesgo alto                         |
| Suscripciones         | Riesgo crítico                      |
| Gift Cards            | Riesgo crítico                      |
| Autenticación         | Mejorable                           |
| Push notifications    | Riesgo crítico                      |
| PWA                   | Buena idea, problemas de privacidad |
| SEO                   | Necesita refactor                   |
| CI/CD                 | No aceptable para producción        |
| Gestión de secretos   | Crítica                             |
| Seguridad HTTP        | Insuficiente                        |
| Observabilidad        | Mejorable                           |

## Diagnóstico global

**Riesgo actual: ALTO / CRÍTICO para producción con dinero real.**

Los problemas más importantes no son visuales.

Son:

1. credencial de PostgreSQL expuesta en el repositorio;
2. Gift Cards que pueden crearse sin verificar realmente el pago;
3. notificaciones administrativas potencialmente enviadas a suscripciones push de usuarios normales;
4. upgrades de suscripción capaces de crear una nueva suscripción Stripe sin cancelar/modificar la anterior;
5. estados de suscripción modificables localmente sin sincronización Stripe;
6. storefront configurado con Stripe `pk_test_...`;
7. CI roto y `main` sin protección;
8. exposición pública de información interna de productos;
9. uploads con autorización demasiado permisiva;
10. varios bugs de checkout y 12% Brew.

---

# 2. P0 — Credencial de base de datos comprometida

Este es el primer problema que arreglaría.

El archivo:

```text
.claude/settings.local.json
```

está versionado y contiene dentro de su historial de comandos una cadena de conexión PostgreSQL/Railway con usuario, host, puerto y contraseña.

No reproduzco la credencial en este reporte.

Debe considerarse **comprometida**, independientemente de que todavía funcione o no.

## Riesgo

Alguien con acceso al repositorio/historial podría potencialmente:

* conectarse a PostgreSQL;
* leer clientes;
* leer órdenes;
* leer usuarios;
* alterar stock;
* alterar precios;
* modificar pedidos;
* borrar información;
* extraer datos personales.

## Acción inmediata

### Hoy

Rotar:

```text
DATABASE_URL
```

o al menos las credenciales PostgreSQL involucradas.

Después actualizar:

```text
Railway
GitHub Actions secrets
entornos locales autorizados
```

Eliminar:

```text
.claude/settings.local.json
```

del repositorio.

Añadir:

```gitignore
.claude/
```

y comprobar que realmente no quede trackeado.

Pero **borrar el archivo del último commit no elimina la credencial del historial Git**.

Después de rotar la credencial se puede limpiar el historial con `git filter-repo` o BFG si vale la pena.

La rotación es lo realmente urgente.

---

# 3. P0 — Gift Cards pueden emitirse sin validar el pago

Este es un bug financiero crítico.

El frontend hace correctamente:

```text
crear PaymentIntent
↓
confirmar Stripe
↓
POST /gift-cards/purchase
```

Pero el backend de Gift Cards recibe:

```text
paymentIntentId
```

y no utiliza ese PaymentIntent para comprobar que:

```text
existe
status = succeeded
monto = amount solicitado
currency = MXN
metadata.type = gift_card
```

La tarjeta se crea directamente.

## Impacto

La emisión del dinero virtual de la tienda no está vinculada de manera autoritativa al pago.

Eso debe considerarse un **P0 financiero**.

## Solución correcta

No confiar en:

```text
POST /gift-cards/purchase
```

como autoridad para emitir saldo.

El flujo debería ser:

```text
Crear PaymentIntent
        ↓
Stripe procesa pago
        ↓
payment_intent.succeeded
        ↓
Webhook firmado
        ↓
validar metadata.type = gift_card
        ↓
validar monto
        ↓
crear GiftCard
```

La relación debería almacenar:

```text
GiftCard
stripePaymentIntentId UNIQUE
```

para garantizar idempotencia.

La UI sólo debería consultar:

```text
/payment-status
```

o esperar la confirmación del servidor.

---

# 4. P0 — Posible fuga de notificaciones administrativas

Hay un error conceptual serio en Push.

Existe:

```ts
getAdminSubscriptions()
```

pero actualmente hace:

```text
findMany()
```

sobre **todas las PushSubscriptions**.

Después `emitEvent()` decide:

```text
si tiene targetUserId
    → usuario
si NO tiene targetUserId
    → getAdminSubscriptions()
```

Eventos como:

```text
new_order
low_stock
subscription_created
```

son precisamente eventos globales/administrativos.

Por ejemplo, cuando se crea una orden se genera:

```text
Nuevo pedido
Pedido de <cliente> — $<total> MXN
```

con:

```text
orderId
total
customerName
```

## Impacto

Potencial exposición de:

* nombres de clientes;
* monto de pedidos;
* información de stock;
* actividad administrativa;
* nuevas suscripciones.

## Diseño correcto

`PushSubscription` debe distinguir explícitamente:

```text
subjectType

ADMIN
USER
ANONYMOUS
```

o relaciones independientes:

```text
adminId?
userId?
```

Entonces:

```text
getAdminSubscriptions()
```

debe ser realmente:

```text
WHERE adminId IS NOT NULL
```

Nunca:

```text
findMany()
```

---

# 5. P0 — Upgrades de suscripción pueden generar doble cobro

Este es uno de los bugs más delicados.

El frontend detecta que el usuario ya está suscrito y para hacer upgrade vuelve a ejecutar:

```text
subscriptionsApi.create(...)
```

En backend se detecta correctamente que existe la suscripción.

Pero después el código continúa y crea:

```text
stripe.subscriptions.create(...)
```

otra vez.

Después actualiza la misma fila local:

```text
stripeSubscriptionId = nuevaStripeSubscription
```

No veo que la anterior se cancele o modifique antes.

## Resultado potencial

```text
Stripe subscription OLD
        ACTIVE

Stripe subscription NEW
        ACTIVE

BD local
        apunta solamente a NEW
```

El cliente podría acabar con:

```text
dos suscripciones Stripe
dos cobros
una sola suscripción visible
```

## Solución

Upgrade:

```text
stripe.subscriptions.update(existing.stripeSubscriptionId)
```

No:

```text
stripe.subscriptions.create()
```

Hay que modificar:

```text
price
frequency
items
proration
```

sobre la suscripción existente.

---

# 6. P0 — Cancelación/pausa local no garantiza cancelación Stripe

El usuario puede modificar estados como:

```text
CANCELLED
PAUSED
ACTIVE
```

desde la aplicación.

Pero el flujo detectado actualiza la BD local sin obligatoriamente efectuar la operación equivalente en Stripe.

Esto puede producir:

```text
12% Café:
CANCELLED

Stripe:
ACTIVE
```

Resultado:

> la aplicación le dice al usuario que canceló, pero Stripe podría continuar facturando.

O la situación inversa.

## Principio obligatorio

Stripe debería ser la autoridad de billing.

Flujo:

```text
Usuario solicita cancelar
        ↓
Backend llama Stripe
        ↓
Stripe confirma
        ↓
Webhook
        ↓
BD local actualizada
```

Nunca:

```text
Frontend
↓
UPDATE status = CANCELLED
```

como única acción.

---

# 7. P0/P1 — Precio mostrado de suscripción y precio cobrado no comparten fuente

El frontend declara precios fijos:

```text
Fundador      $350
Explorador    $650
Connoisseur   $890
```

Pero en backend Stripe calcula:

```ts
productRecords.reduce(
    (sum, product) => sum + product.price
)
```

Por lo tanto el precio real cobrado depende del precio individual de los cafés elegidos.

No necesariamente del precio anunciado del plan.

## Riesgo

Un cliente podría ver:

```text
Explorador
$650 / mes
```

pero Stripe podría intentar cobrar otro importe.

## Solución

Crear entidad:

```text
SubscriptionPlan
```

con:

```text
id
name
price
currency
frequency
stripePriceId
minItems
maxItems
```

Y tanto frontend como backend deben consumirla.

No hardcodear planes en React.

---

# 8. P0 — Stripe está configurado en modo test en el storefront de producción

La configuración Railway actual incluye:

```text
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
```

para:

```text
12porciento-web
```

Esto significa una de dos:

### Caso A

Backend usa también:

```text
sk_test
```

Entonces producción realmente procesa pagos de prueba.

### Caso B

Backend usa:

```text
sk_live
```

y frontend:

```text
pk_test
```

Entonces Stripe puede fallar por mezcla de ambientes.

## Recomendación

Separar claramente:

```text
staging
production
```

Staging:

```text
pk_test
sk_test
```

Production:

```text
pk_live
sk_live
```

Con proyectos/variables independientes.

---

# 9. P1 — PaymentMethod y StripeCustomer vienen desde el cliente

`/create-intent` correctamente deriva:

```text
userId
```

del JWT.

Eso está bien.

Sin embargo acepta del body:

```text
stripeCustomerId
paymentMethodId
```

y los pasa a Stripe.

## Riesgo

Es una brecha de ownership/IDOR potencial.

El servidor no debería confiar en:

```text
este es mi Stripe Customer
este es mi método guardado
```

porque lo diga React.

## Solución

Para usuario autenticado:

```text
JWT userId
↓
DB User
↓
stripeCustomerId real
↓
Stripe paymentMethods.list(customer)
↓
validar paymentMethodId
```

Para guest:

```text
no permitir saved payment method
```

---

# 10. P1 — Bug de promociones después de cobrar

Hay un bug claro en Orders.

Después de recuperar el PaymentIntent se calcula:

```text
subtotal + shipping
```

y se compara directamente contra:

```text
intent.amount
```

antes de descontar la promoción.

Sólo después se ejecuta:

```text
applyPromo()
```

## Ejemplo conceptual

```text
Productos        $500
Envío             $50
Promo -10%        -$50

Cobrado Stripe    $500
```

Primera validación:

```text
550 != 500
```

→ error.

Aunque el PaymentIntent sea completamente correcto.

## Efecto UX

El usuario puede ver:

> Pago procesado pero no pudimos registrar tu pedido.

aunque Stripe haya cobrado correctamente.

## Solución

Calcular una única vez:

```text
server subtotal
→ promo
→ shipping
→ expected amount
```

y comparar esa cantidad con Stripe.

---

# 11. P1 — Se cobra antes de reservar stock

El flujo actual:

```text
Create PaymentIntent
↓
Stripe confirma
↓
crear orden
↓
validar stock otra vez
↓
descontar stock
```

La validación de stock es buena y utiliza un `updateMany` condicionado para evitar stock negativo.

Pero sigue existiendo una ventana:

```text
Cliente A comprueba último producto
Cliente B comprueba último producto

A paga
B paga

A crea orden
B intenta crear orden

stock insuficiente para B
```

B ya pagó.

## Arquitectura recomendable

Crear:

```text
InventoryReservation
```

por ejemplo:

```text
15 minutos
```

antes del pago.

O crear:

```text
Order PENDING_PAYMENT
```

con stock reservado.

Webhook:

```text
payment succeeded
→ CONFIRMED

payment failed/timeout
→ libera stock
```

---

# 12. P1 — Cancelar una orden no implica refund

Al pasar una orden a:

```text
CANCELLED
```

se restaura stock correctamente.

Pero no aparece una llamada asociada a:

```text
stripe.refunds.create()
```

en ese flujo.

## Riesgo

```text
Order = CANCELLED
stock = restaurado
payment = PAID
```

Si la intención del negocio es que “cancelar” implique reembolso, el flujo está incompleto.

## Recomendación

Separar:

```text
Cancel fulfillment
Refund payment
```

y manejar:

```text
PAID
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

---

# 13. P1 — Dinero almacenado como Float

El schema utiliza `Float` para valores como:

```text
Product.price
Order.total
SubscriptionPayment.amount
shippingCost
```

JavaScript + IEEE floating point no es ideal para dinero.

## Mejor opción

Guardar:

```text
integer cents
```

Ejemplo:

```text
$299.90 MXN
↓
29990
```

o PostgreSQL:

```text
DECIMAL(12,2)
```

Nunca confiar en `Float` como representación financiera canónica.

---

# 14. P1 — Productos públicos exponen campos internos

La API pública de products utiliza Prisma sin un `select` público estricto.

Pero `Product` contiene campos internos como:

```text
costPrice
supplier
lowStockThreshold
stock
sku
b2bPriority
```

## Impacto

Un visitante puede potencialmente conocer:

* costo interno;
* margen aproximado;
* proveedor;
* inventario exacto;
* umbrales operativos.

Además el detalle por slug no debería devolver productos inactivos únicamente porque alguien conozca la URL.

## Solución

Crear:

```ts
PUBLIC_PRODUCT_SELECT
```

y devolver únicamente:

```text
id
name
slug
description
price
image
origin
region
variety
process
roast
notes
publicAvailability
...
```

Nunca serializar entidades Prisma directamente hacia API pública.

---

# 15. P1 — Uploads permiten demasiadas acciones a usuario normal

La implementación de upload tiene buenas defensas técnicas:

* límite de tamaño;
* MIME allowlist;
* `sharp`;
* conversión a WebP;
* nombres aleatorios;
* `path.basename`.

Pero autorización y ownership son insuficientes.

Con `requireAnyAuth`, un usuario normal puede alcanzar rutas destinadas conceptualmente a operaciones administrativas.

Especialmente:

```text
banner upload
DELETE /uploads/:file
```

## Riesgo

Un usuario autenticado podría borrar un archivo que no sea suyo si conoce su filename.

## Solución

Separar:

```text
POST /users/avatar
```

con ownership.

Y:

```text
POST /admin/uploads
DELETE /admin/uploads/:id
```

con:

```text
requireAdmin
```

Los archivos deberían tener además registro DB:

```text
ownerId
purpose
createdAt
```

---

# 16. P1 — JWT almacenado en localStorage durante 30 días

El token de usuario se guarda tanto en:

```text
localStorage.user_token
```

como dentro del estado persistido de Zustand.

La duración actual es aproximadamente:

```text
30 días
```

y la contraseña mínima sigue siendo 6 caracteres.

## Impacto

Ante cualquier XSS futuro:

```text
localStorage
→ JWT
→ sesión robada
```

Además cambiar contraseña no necesariamente revoca tokens ya emitidos.

## Arquitectura recomendable

```text
Access token
5–15 minutos

Refresh token
HttpOnly
Secure
SameSite=Lax/Strict

rotation
revocation
```

O una sesión tradicional HttpOnly.

Si se mantiene JWT bearer:

```text
15–60 min máximo
```

más token version/revocation.

---

# 17. P1 — Falta CSP/Helmet y security headers

En el servidor Express no veo configuración equivalente a:

```text
helmet()
```

El nginx del storefront tampoco configura headers como:

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

## Recomendación

Implementar Helmet en backend.

Y nginx:

```text
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
CSP
```

HSTS sólo después de confirmar HTTPS/certificados correctamente en todos los dominios.

Una CSP será especialmente importante mientras el JWT siga en localStorage.

---

# 18. P1 — El Service Worker cachea información privada

El Service Worker tiene:

```text
/api/users/me
```

en caché.

Y además existe una regla genérica:

```text
url.pathname.startsWith('/api/')
→ NetworkFirst
→ api-runtime
```

Esto puede incluir respuestas autenticadas.

El Cache Storage del navegador usa principalmente URL/request para la clave y no debería utilizarse ingenuamente como caché compartida entre sesiones.

## Escenario

```text
Usuario A inicia sesión
↓
/api/users/me cacheado
↓
logout
↓
Usuario B entra
↓
offline / backend falla
↓
respuesta anterior disponible
```

## Solución

Nunca cachear genéricamente:

```text
/api/users/*
/api/orders/*
/api/subscriptions/*
/api/brew/sessions/*
```

El SW debería cachear únicamente allowlists públicas:

```text
products públicos
recipes públicas
brew methods
assets
```

Y limpiar cachés privadas al hacer logout.

---

# 19. P1 — Socket.IO probablemente no funciona correctamente detrás de nginx

Cliente:

```text
VITE_API_URL = /api
```

y el socket elimina `/api`, quedando:

```text
baseUrl = ""
path = /socket.io
```

Eso hace que Socket.IO intente conectarse al host del frontend.

Pero nginx sólo proxya:

```text
/api/
```

No hay:

```text
location /socket.io/
```

## Solución

Añadir nginx:

```text
location /socket.io/ {
    proxy_pass $upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

# 20. Bug de notificaciones después de login/logout

`NotificationsProvider` ejecuta su conexión Socket dentro de:

```text
useEffect(..., [])
```

Esto significa:

### Usuario entra sin login

```text
provider monta
token = null
return
```

Después hace login.

Pero el efecto no vuelve a ejecutarse.

→ Socket puede no conectarse hasta refrescar.

### Usuario ya estaba conectado y hace logout

El provider tampoco depende del estado del usuario.

→ puede mantener una conexión vieja durante la misma sesión de página.

## Solución

Dependencia explícita:

```text
user?.id
token
```

Y:

```text
logout
→ disconnectSocket
→ clear notifications
```

---

# 21. Bug — reenviar verificación de email

`resend-verification` intenta obtener:

```text
req.user.id
```

pero la ruta no monta correctamente el middleware que llena `req.user`.

El resultado esperado para una petición normal es 401 aunque el cliente mande JWT.

## Solución

Agregar:

```ts
requireUserAuth
```

a la ruta.

Y test de integración:

```text
authenticated + unverified
→ 200

anonymous
→ 401

verified
→ 400
```

---

# 22. Verificación de email no actúa como frontera real

El registro puede devolver sesión/JWT aunque:

```text
emailVerified = false
```

y `requireUserAuth` comprueba token/rol, no email verificado.

Esto significa que la verificación puede estar actuando más como decoración que como control.

## Recomendación

Definir explícitamente qué exige email verificado.

Por ejemplo:

Puede sin verificar:

```text
explorar
guardar carrito
usar Brew
```

Exige verificar:

```text
compras
Gift Cards
suscripciones
reviews
funciones sociales
```

---

# 23. Abandoned Cart tiene varios problemas

El frontend intenta enviar datos en `beforeunload` mediante:

```text
navigator.sendBeacon()
```

Pero la API necesita JWT Bearer.

`sendBeacon` no está añadiendo ese Authorization header.

Por tanto ese evento de salida probablemente falla.

Además el backend acepta:

```text
email
```

proporcionado por el cliente aunque ya tiene el usuario autenticado.

Debería obtener:

```text
email = req.user.email
```

del backend.

## Privacidad

También debe existir una política clara sobre:

```text
qué carritos se almacenan
duración
uso para marketing
consentimiento
```

---

# 24. Cron jobs ejecutándose dentro del servidor web

Billing y abandoned cart scheduler se inician junto al servidor Express.

Esto funciona con una instancia.

Pero con:

```text
2 réplicas
3 réplicas
autoscaling
```

cada instancia ejecutará sus jobs.

Resultado potencial:

```text
job × 3
emails duplicados
billing sync duplicado
```

## Solución

Mover cron a:

```text
worker service
```

o usar:

```text
PostgreSQL advisory lock
Redis distributed lock
BullMQ
Temporal
```

---

# 25. Stripe webhooks deberían tener secrets independientes

Existen endpoints de webhook distintos para checkout y suscripciones.

La configuración muestra principalmente:

```text
STRIPE_WEBHOOK_SECRET
```

como una sola variable.

Cada endpoint Stripe registrado normalmente tiene su propio signing secret.

## Recomendación

```text
STRIPE_CHECKOUT_WEBHOOK_SECRET

STRIPE_SUBSCRIPTION_WEBHOOK_SECRET
```

O consolidar todos los eventos Stripe en:

```text
/api/webhooks/stripe
```

y enrutar internamente.

---

# 26. Webhook de suscripción puede perder eventos

En algunos errores de persistencia del webhook de invoices, el handler responde exitosamente al webhook aun cuando el procesamiento interno falló.

Eso le dice a Stripe:

> evento procesado correctamente.

Stripe entonces no tiene razón para reintentarlo.

## Regla

Error transitorio:

```text
500
```

para que Stripe reintente.

Error permanente conocido:

```text
200
```

sólo si realmente decidimos ignorarlo.

---

# 27. Promo maxUses tiene carrera concurrente

La comprobación:

```text
usedCount >= maxUses
```

y posteriormente:

```text
usedCount increment
```

no forman una operación atómica.

Dos checkouts concurrentes pueden validar el último cupón disponible antes del incremento.

## Solución

`UPDATE ... WHERE usedCount < maxUses`

o transacción Serializable/locking.

---

# 28. Gift Card todavía no está correctamente integrada al checkout

La UI de Gift Card dice:

> El destinatario puede usar este código al pagar en nuestra tienda.

Pero el Checkout auditado no presenta un campo de Gift Card ni integra su saldo dentro del cálculo de PaymentIntent.

Por tanto la funcionalidad actualmente parece incompleta desde la experiencia del usuario.

Necesitamos:

```text
Gift Card code
↓
server validation
↓
reserve balance
↓
Stripe charges remainder
↓
order completes
↓
consume gift balance
```

de manera transaccional.

---

# 29. Gift Card permite HTML dentro del email

Campos como:

```text
senderName
message
```

deben escaparse antes de interpolarlos dentro del HTML del correo.

El B2B ya tiene una función `escapeHtml`, lo cual es un buen patrón a reutilizar.

---

# 30. CI/CD no está en condiciones de proteger producción

La última ejecución que revisé tiene:

```text
Tests Client     ✅

Lint             ❌
Tests Server     ❌
TypeCheck        ❌
Format Check     ❌
```

Y `main` no tiene protección obligatoria configurada.

## Causa importante del TypeCheck

El workflow ejecuta:

```text
pnpm install
pnpm typecheck
```

pero no genera el Prisma Client primero.

El Docker de producción sí ejecuta:

```text
prisma generate
```

antes del build.

Por eso el CI genera una enorme cascada de errores Prisma.

## Nuevo pipeline

```text
Install
↓
Prisma generate
↓
Format
↓
Lint
↓
TypeCheck
↓
Unit tests
↓
Integration tests
↓
Build
↓
E2E
↓
Security scan
```

---

# 31. `main` debe estar protegida

Activar:

```text
Require pull request
Require CI
Require branch up to date
Block force push
Block branch deletion
```

Y Railway no debería desplegar una revisión que no tenga CI verde.

---

# 32. Falta análisis de seguridad automatizado

No encontré en `.github` workflows dedicados a:

```text
CodeQL
Dependabot
dependency audit
secret scanning personalizado
container scan
```

Debe añadirse.

Especialmente después de encontrar una credencial real en Git.

---

# 33. Configuración local de agentes no debe estar en Git

`.claude/settings.local.json` no sólo contiene la credencial mencionada.

También contiene una gran lista de:

```text
permisos
comandos
paths locales
operaciones Railway
operaciones Git
```

Eso es configuración local.

No pertenece al repositorio.

También aparecen worktrees `.claude` causando incluso warnings durante GitHub Actions.

---

# 34. Uploads probablemente no son persistentes

Railway configura:

```text
UPLOAD_DIR=/app/data/uploads
```

El Docker crea:

```text
/app/data/uploads
```

pero en la IaC revisada no aparece un volumen persistente asociado.

Si no existe uno configurado manualmente en Railway:

```text
redeploy
restart
nuevo container
```

puede eliminar uploads.

## Mejor arquitectura

Utilizar:

```text
Cloudflare R2
S3
Cloudinary
Supabase Storage
```

o un Railway Volume explícito.

Para e-commerce prefiero object storage.

---

# 35. Sitemap está roto conceptualmente

El sitemap todavía genera rutas:

```text
/producto/{slug}
```

pero React utiliza:

```text
/tienda/:slug
```

También conserva:

```text
/recetas
```

cuando ahora queremos consolidar en 12% Brew.

## Problema adicional

El sitemap usa:

```ts
BASE_URL = process.env.CLIENT_URL
```

Pero Railway configura `CLIENT_URL` con dos orígenes separados por coma:

```text
web,admin
```

Eso puede producir `<loc>` inválidos.

## Solución

Crear:

```text
PUBLIC_SITE_URL=https://12porciento.cafe
```

independiente de:

```text
CORS_ALLOWED_ORIGINS
```

---

# 36. Robots depende de un dominio distinto al actual Railway

`robots.txt` apunta a:

```text
https://12porciento.cafe/api/sitemap.xml
```

Esto estará bien cuando el dominio canónico sea realmente ése.

Mientras se prueba con Railway, hay que definir claramente:

```text
production canonical domain
staging noindex
```

---

# 37. SPA + client-side Helmet limita SEO

La aplicación es una SPA Vite.

El HTML inicial contiene principalmente:

```text
<div id="root"></div>
```

Las meta etiquetas específicas se actualizan mediante `react-helmet-async`.

Google puede ejecutar JavaScript.

Pero otros crawlers/social previews son menos confiables.

Especialmente queremos indexar:

```text
productos
cafés
recetas
12% Brew
artículos futuros
```

## Opciones

Sin migrar todo necesariamente:

```text
prerender
```

para contenido público.

O eventualmente:

```text
Astro
Next.js
React Router SSR
```

si el SEO se vuelve prioritario.

---

# 38. Falta canonical URL

`PageMeta` genera:

```text
title
description
OG
Twitter
```

pero no:

```text
<link rel="canonical">
```

Hay que agregarlo.

Especialmente porque existen redirects:

```text
/recetas
/brew/recetas
```

---

# 39. OG image sigue siendo Unsplash genérico

El fallback de OpenGraph es una foto de Unsplash.

Para branding debería existir:

```text
12percent-og-default.jpg
```

y OG dinámico por:

```text
producto
café
receta
Brew
```

---

# 40. El argumento central “sólo el 12%” necesita revisión

La frase aparece repetidamente:

```text
Solo el 12% del café producido en el mundo es de especialidad
```

en:

* Home;

* metadata;

* footer.

La definición actual de Specialty Coffee de la SCA no se basa en que un porcentaje fijo de la producción mundial sea specialty ni exclusivamente en superar 80 puntos. La SCA actualmente lo define alrededor de **atributos distintivos y valor adicional**, y su Coffee Value Assessment combina evaluaciones físicas, descriptivas, afectivas y extrínsecas.

Eso no significa necesariamente que el “12%” no pueda ser parte de la historia de marca.

Pero necesitamos:

### Opción A

tener una fuente verificable para el dato.

### Opción B

reformularlo.

Por ejemplo:

> **12% representa nuestra obsesión por ese pequeño universo de cafés que destacan por su origen, atributos y cuidado en cada etapa.**

Así no dependemos de una estadística difícil de sostener.

---

# 41. También revisaría claims de SCA en Home

Hay textos como:

```text
SCA ≥ 84 pts
```

y:

> “alcanzan los estándares de la Specialty Coffee Association con puntajes superiores a 80 puntos.”

La SCA actual está migrando el foco de un único puntaje hacia CVA.

Podemos seguir mostrando scores si son datos reales de catación.

Pero evitaría presentarlos como:

> la definición oficial completa de specialty.

---

# 42. Home tiene una buena identidad pero demasiadas promesas fuertes

Visualmente, por estructura de código, la Home está bien trabajada:

```text
Hero
Trust strip
Story
Value proposition
Origin process
Products
...
```

Pero varias afirmaciones deberían estar respaldadas:

```text
Comercio directo
Sin intermediarios
Orígenes certificados
Tueste a pedido
Máx. 7 días del tueste
Envío 24–48h
```

Si todavía estamos en etapa inicial, prefiero promesas más verificables.

---

# 43. Catálogo seed usa muchas imágenes genéricas de Unsplash

El seed contiene pools enormes de fotografías de Unsplash usadas como diferentes cafés/productos.

Esto sirve para prototipar.

No lo usaría como catálogo definitivo.

Para specialty coffee la confianza se construye con:

```text
foto real del lote
bolsa real
productor
finca
cereza
proceso
tostado
```

Esto puede diferenciar muchísimo 12% Café.

---

# 44. Navegación: demasiadas experiencias secundarias

La navegación actualmente incluye:

```text
Tienda
12% Brew
Suscripciones
Nosotros

Más:
Bean Catcher
Paquetes
Galería
Empresas
Ranking
Feed
Logros
Quiz
```

No están mal individualmente.

El problema es jerarquía de producto.

Yo definiría tres pilares:

```text
COMPRAR
Tienda

PREPARAR
12% Brew

DESCUBRIR
Marca / origen
```

Todo lo demás debería ser secundario.

---

# 45. El punto rojo animado en “Más” parece una notificación aunque no lo sea

El botón:

```text
Más
```

siempre muestra un dot con `animate-ping`.

Esto comunica:

> Hay algo nuevo que debes revisar.

aunque no exista ninguna novedad.

Lo eliminaría o lo conectaría a un estado real:

```text
newFeature = true
```

y después desaparecería cuando el usuario lo visite.

---

# 46. Drawer móvil necesita focus trap

El menú móvil:

* bloquea body scroll;
* soporta Escape;
* tiene overlay.

Eso está bien.

Pero no encontré un focus trap equivalente al que sí existe en el modal B2B de subscriptions.

Un usuario de teclado puede potencialmente tabular detrás del drawer.

Implementar:

```text
focus first item
trap Tab
restore focus to opener
aria-expanded
aria-controls
```

---

# 47. Bottom Navigation está bien simplificada

Actualmente sólo:

```text
Tienda
12% Brew
Carrito
Perfil
```

Eso me parece bastante mejor.

Mantendría esa simplicidad.

---

# 48. Checkout — link de soporte roto

Cuando un pago fue procesado pero falla el pedido aparece:

```text
/contacto
```

como enlace de soporte.

Pero no aparece una ruta `/contacto` en el router público auditado.

Esto es especialmente malo porque ocurre en el peor momento posible:

> cliente cobrado + pedido no registrado.

Debe existir un canal real:

```text
/contacto
WhatsApp
correo
ticket con paymentIntentId
```

---

# 49. Checkout vacío tiene copy incompleto

En el estado:

```text
Carrito vacío
```

hay un `<p>` vacío.

Agregar algo como:

> Todavía no agregas ningún café. Explora nuestros lotes y encuentra uno para tu próxima taza.

---

# 50. Checkout guarda PII en localStorage

Se guarda:

```text
nombre
email
teléfono
dirección
ciudad
estado
CP
```

en:

```text
checkout_shipping_draft
```

Conveniente, pero sensible en equipos compartidos.

Preferir:

```text
sessionStorage
```

para guest.

Y para usuario autenticado, obtener la dirección del perfil.

---

# 51. Faltan páginas legales y de confianza

En Footer veo:

```text
Tienda
Paquetes
Recetas
Suscripciones
Carrito
Nosotros
Proceso
Orígenes
```

pero no:

```text
Aviso de privacidad
Términos y condiciones
Política de envíos
Cambios y devoluciones
Reembolsos
Contacto
Preguntas frecuentes
```

Para una tienda real esto reduce confianza y puede generar problemas operativos/regulatorios.

Debería revisarse el contenido final con asesoría legal aplicable en México.

---

# 52. 12% Brew — problemas funcionales encontrados

12% Brew tiene una arquitectura interesante, pero todavía hay bugs en el loop principal.

## A. Calculator → StartSession

Cambiar:

```text
20 g → 17 g
```

puede recalcular visualmente:

```text
255 g
```

pero `startSession()` todavía utiliza parámetros del `recipe` original en vez del estado modificado.

Necesitamos el:

```text
BrewConfiguration
```

que ya propusimos.

---

## B. RatioCalculator no controla completamente steps

El estado de la calculadora es interno.

Al cambiar agua o ratio no existe una única configuración externa que garantice que:

```text
steps
water
ratio
dose
```

estén sincronizados.

---

## C. GuidedBrew mezcla steps originales y escalados

Parte utiliza:

```text
scaledSteps
```

y otra parte calcula acumulados con:

```text
recipe.steps
```

Puede mostrar targets incoherentes.

---

## D. Tiempo total

`brewTimeSeconds` se deriva del tiempo inicial del step actual.

Como ese timestamp se reinicia al cambiar de paso, el historial puede guardar sólo parte del tiempo real.

Necesitamos:

```text
brewStartedAt
stepStartedAt
```

separados.

---

## E. Restore después de refresh

El draft guarda:

```text
step
timestamps
pause
```

pero el estado `RUNNING/PAUSED` no se restaura completamente.

---

## F. Dial-in pierde contexto

Session Detail manda:

```text
?result=SOUR
```

pero no necesariamente:

```text
session=<id>
```

Y Dial-in termina ejecutándose de forma genérica:

```text
ad-hoc
```

Debe utilizar:

```text
BrewSession completa
```

---

## G. Texto roto

Existe texto:

```text
que建议你 cambiar
```

en Dial-in.

Corregir inmediatamente.

---

## H. Comparador casi no es descubrible

Existe una buena página de comparación.

Pero Historial no tiene selección de dos sesiones.

Agregar:

```text
Seleccionar
☐ Brew A
☐ Brew B

Comparar
```

---

## I. “Continuar preparando”

Brew Home utiliza simplemente la última sesión como:

```text
Continuar preparando
```

sin distinguir de forma fiable si ya terminó.

Debe filtrar:

```text
status = IN_PROGRESS
```

---

# 53. 12% Brew — UX objetivo

El flujo correcto debería terminar siendo:

```text
12% Brew
   ↓
¿Qué café tienes?
   ↓
¿Cómo quieres prepararlo?
   ↓
¿Qué perfil buscas?
   ↓
Receta recomendada
   ↓
¿Cuánto café usarás?
   ↓
BrewConfiguration
   ↓
Guided Brew
   ↓
¿Cómo quedó?
   ↓
Dial-In
   ↓
Segundo intento
   ↓
Comparar
```

Ese debería convertirse en uno de los pilares principales de la marca.

---

# 54. PWA necesita una política explícita de caché

Ahora tiene bastante inteligencia offline, lo cual es bueno.

Pero hay que separar:

### PUBLIC CACHEABLE

```text
assets
products public
recipes public
brew methods
public coffees
```

### PRIVATE NEVER SHARED

```text
profile
orders
subscriptions
payment methods
addresses
brew sessions
admin
```

### MUTATIONS NEVER CACHE

```text
POST
PUT
PATCH
DELETE
```

---

# 55. Seguridad de admin

Admin JWT dura menos que user JWT, lo cual es bueno.

Pero reforzaría:

```text
MFA / passkeys
explicit ADMIN role
audience
issuer
tokenType
short sessions
session revocation
```

Actualmente la lógica considera:

```text
role === USER
→ user

cualquier otro token válido
→ admin
```

Ese supuesto es demasiado implícito para largo plazo.

---

# 56. Validación debe centralizarse

Actualmente diferentes rutas tienen validaciones manuales.

Hay buenos ejemplos, especialmente B2B.

Pero recomendaría introducir:

```text
Zod
Valibot
```

o equivalente para schemas compartidos.

Ejemplo:

```text
CreateOrderSchema
CreatePaymentIntentSchema
CreateSubscriptionSchema
GiftCardPurchaseSchema
BrewSessionSchema
```

Así frontend/backend comparten contratos.

---

# 57. Dinero y dominios deberían salir de controllers

Hoy hay bastante lógica financiera directamente en rutas Express:

```text
discount
Stripe amount
subscription price
shipping
inventory
```

Separaría:

```text
CheckoutService
OrderService
SubscriptionService
GiftCardService
InventoryService
PaymentService
```

y domain functions puras testeables.

B2B y RecipeEngine ya muestran una dirección similar.

---

# 58. Observabilidad

Antes de aceptar pagos reales añadiría:

```text
requestId
structured logging
error tracking
payment correlation IDs
Stripe event IDs
order IDs
user IDs anonimizados
latency metrics
```

Ideal:

```text
OpenTelemetry
Sentry
Grafana/Loki/Tempo
```

No registrar:

```text
password
JWT
full card information
database credentials
```

Y minimizar PII en logs.

---

# 59. Readiness y Health

Actualmente `/api/health` sirve para saber:

> Node responde.

Pero añadiría:

```text
/api/live
```

para process liveness.

Y:

```text
/api/ready
```

que compruebe:

```text
PostgreSQL
critical migrations
```

Stripe no necesita bloquear readiness necesariamente.

---

# 60. Performance

Implementaría después del P0/P1:

```text
immutable caching para assets Vite
AVIF/WebP propios
responsive images
lazy images
font self-hosting
query caching
HTTP caching controlado
```

Nginx actualmente tiene gzip, lo cual está bien.

Podríamos añadir Brotli si el stack lo permite.

---

# 61. Cosas que están bien implementadas

No todo está mal. Hay decisiones buenas que conservaría:

* el servidor recalcula precios de productos antes de cobrar;
* cantidades máximas están validadas;
* Stripe PaymentIntent usa idempotency key;
* órdenes tienen `paymentIntentId UNIQUE`;
* stock se decrementa condicionalmente;
* webhook principal de Stripe verifica firma;
* existe deduplicación de eventos Stripe;
* reset tokens se almacenan hasheados;
* passwords usan bcrypt;
* uploads se reprocesan con Sharp;
* B2B recalcula precios del servidor y tiene idempotencia;
* React evita `dangerouslySetInnerHTML` en el cliente auditado;
* hay reduced-motion;
* hay skip-to-content;
* el BottomNav está simplificado;
* Product Detail tiene JSON-LD;
* 12% Brew tiene RecipeEngine y snapshots;
* Guided Brew usa timestamps y Wake Lock;
* existen tests de frontend;
* existe PWA/offline handling.

El problema es principalmente **cerrar correctamente las fronteras de seguridad y consistencia entre estas piezas**.

---

# 62. Orden exacto de corrección

## P0 — Antes de continuar desarrollando

| #  | Acción                                                 |
| -- | ------------------------------------------------------ |
| 1  | Rotar credencial PostgreSQL expuesta                   |
| 2  | Eliminar `.claude/settings.local.json` del repo        |
| 3  | Deshabilitar temporalmente Gift Card issuance          |
| 4  | Corregir `getAdminSubscriptions()`                     |
| 5  | Auditar/eliminar push admin enviados a users           |
| 6  | Bloquear upgrades de suscripción actuales              |
| 7  | Rehacer upgrade usando `stripe.subscriptions.update()` |
| 8  | Hacer cancel/pause vía Stripe                          |
| 9  | Confirmar Stripe live/test en Railway                  |
| 10 | Proteger `main`                                        |
| 11 | Dejar CI verde                                         |

---

# 63. Sprint de seguridad

Después:

```text
Product DTO público
Upload ownership/admin
JWT/session hardening
Helmet/CSP
PWA private cache
PaymentMethod ownership
secrets scan
MFA admin
webhook secrets
```

---

# 64. Sprint financiero

Después:

```text
money cents/Decimal
promo race
promo amount bug
inventory reservation
refund workflow
Gift Cards webhook
Gift Card checkout
Subscription plans server-side
Stripe plan upgrade
billing consistency
```

---

# 65. Sprint de infraestructura

```text
Socket.IO nginx proxy
persistent object storage
worker/cron service
readiness probes
structured logs
observability
backups
restore drill
rate-limit shared store
```

---

# 66. Sprint 12% Brew

Aplicar el plan anterior:

```text
BrewConfiguration
calculator controlled
session exact params
scaled steps unified
global brew timer
draft recovery
Coffee-first wizard
Dial-In contextual
iteration chain
comparison selection
history filters
visual polish
```

---

# 67. Sprint UX/SEO

```text
legal pages
contact/support
sitemap
canonical
prerender
brand OG images
rewrite 12% claim
real product photography
navigation hierarchy
mobile accessibility
checkout polish
```

---

# 68. Definition of Done antes de pagos reales

Yo no habilitaría Stripe live hasta cumplir mínimo:

```text
0 credenciales expuestas

0 P0 financieros

Gift Card segura

subscriptions Stripe-sync

checkout promo probado

stock race contemplado

refund workflow

security headers

private data fuera de PWA cache

Socket funcionando

CI verde

main protegida

server tests verdes

client tests verdes

build verde

Playwright checkout verde

Stripe webhook tests verdes

backup de DB probado

observabilidad activa
```

---

# Conclusión

12% Café no necesita una reescritura.

La arquitectura tiene suficiente base para convertirse en un producto serio.

El problema es que ha crecido horizontalmente muy rápido:

```text
tienda
suscripciones
B2B
Brew
gamificación
push
PWA
Gift Cards
checkout
inventario
```

y ahora necesitamos una etapa de **hardening y consolidación**.

La prioridad no debería ser añadir más features durante unas iteraciones.

Debería ser:

```text
SECURITY
   ↓
MONEY CONSISTENCY
   ↓
RELIABILITY
   ↓
CORE FLOWS
   ↓
UX
   ↓
NEW FEATURES
```

Si se corrigen los P0/P1 encontrados, la situación cambia bastante: la base actual es perfectamente aprovechable y 12% Brew puede convertirse en una de las partes más diferenciadoras del producto.
