# Diseño del flujo híbrido de cotización B2B

**Fecha:** 2026-07-26  
**Estado:** Aprobado para planificación  
**Superficies:** cliente web/PWA, API y panel administrativo

## Objetivo

Convertir el B2B actual, que funciona principalmente como formulario de contacto, en un canal comercial real: la empresa puede explorar únicamente productos disponibles para mayoreo, construir una solicitud con cantidades y frecuencia, ver un estimado transparente y enviarla para aprobación. El equipo comercial recibe información estructurada, prepara una cotización versionada y, cuando la oportunidad se gana, la convierte en empresa y pedido B2B.

El sistema no intentará sustituir un CRM completo. Sí debe cubrir el recorrido operativo mínimo desde interés hasta pedido sin perder contexto ni historial.

## Decisiones aprobadas

- Se usará un modelo híbrido: precio estimado para el comprador y aprobación comercial para el precio formal.
- La experiencia principal será catálogo + constructor, complementada con filtros guiados por tipo de negocio y consumo.
- Una solicitud no crea inmediatamente un cliente.
- El flujo será `Solicitud → Cotización versionada → Negociación → Empresa → Pedido`.
- No se incluyen firma electrónica, CFDI automático ni portal de autoservicio empresarial en esta entrega.
- El tiempo de respuesta se comunicará de forma consistente como “menos de 24 horas hábiles”.

## Flujo del comprador

### 1. Orientación

La cabecera presenta el programa B2B con una propuesta concreta y un CTA hacia el catálogo. Un bloque breve permite indicar:

- tipo de operación: oficina, cafetería, hotel/restaurante o distribuidor;
- consumo mensual aproximado;
- preferencia de tueste o perfil;
- frecuencia: compra única, quincenal o mensual.

Las respuestas filtran y ordenan el catálogo; no impiden explorar todos los productos habilitados.

### 2. Catálogo B2B

El catálogo sólo muestra productos con `isB2BEnabled = true` y al menos un tier válido. Cada tarjeta contiene:

- imagen, nombre, origen, presentación y notas principales;
- precio “desde” y rangos por volumen;
- disponibilidad;
- control para agregar al borrador.

Productos activos en la tienda D2C pero no disponibles para mayoreo no aparecen. El orden inicial prioriza recomendación y después nombre.

### 3. Constructor

Cada selección guarda:

- producto y presentación;
- cantidad de unidades por entrega;
- frecuencia;
- tier aplicado;
- precio unitario estimado;
- subtotal estimado.

En escritorio el constructor permanece en un panel lateral fijo. En PWA se resume en una barra inferior que abre una hoja deslizable. No debe existir desplazamiento horizontal.

El estimado siempre muestra moneda, subtotal y la leyenda: “Estimado antes de impuestos. El precio final será validado por un asesor”.

El borrador se conserva localmente con una versión de esquema para poder descartarlo de forma segura si cambia su estructura.

### 4. Datos y envío

El formulario final se divide en tres pasos:

1. empresa: razón social o nombre comercial, RFC opcional hasta la cotización formal y giro;
2. contacto: nombre, correo y teléfono;
3. revisión: productos, cantidades, frecuencia, estimado y notas.

Empresa, contacto, correo, teléfono y al menos un producto son obligatorios. RFC será obligatorio antes de convertir la oportunidad en empresa/pedido.

Al enviar:

- el servidor recalcula los tiers y estimados; nunca confía en precios enviados por el navegador;
- el navegador conserva y reenvía un `requestId` estable hasta recibir confirmación;
- se genera un folio legible, por ejemplo `B2B-2026-000123`;
- se muestra confirmación con folio, resumen y SLA;
- se intenta enviar un correo de recepción al contacto;
- el borrador local se elimina sólo después de una respuesta exitosa.

## Operación administrativa

### Navegación

El área B2B se separará en:

- Pipeline;
- Cotizaciones;
- Empresas;
- Pedidos;
- Precios por volumen.

“Clientes B2B” dejará de nombrar la pantalla de precios y pedidos.

### Pipeline

Estados permitidos:

- `NEW`: nuevo;
- `REVIEWING`: en revisión;
- `QUOTED`: cotización enviada;
- `NEGOTIATING`: negociación;
- `WON`: ganado;
- `LOST`: perdido.

La vista principal muestra:

- nuevos;
- oportunidades con seguimiento vencido;
- valor estimado del pipeline;
- cotizaciones enviadas;
- tasa de cierre;
- columnas por estado con tarjetas resumidas.

Los filtros incluyen responsable, estado, fecha, búsqueda y SLA.

### Detalle de solicitud

El detalle contiene:

- empresa, contacto y contexto;
- productos y estimado originales inmutables;
- responsable;
- próxima acción y fecha;
- notas internas;
- historial de cambios;
- cotizaciones relacionadas.

Cambiar estado, responsable, próxima acción o notas crea una entrada de actividad y un registro de auditoría administrativa.

### Cotización formal

Una cotización contiene líneas editables, subtotal, impuestos, total, vigencia, condiciones y notas. Al guardarla:

- se crea una nueva versión; no se sobrescribe una versión enviada;
- los nombres, SKU y precios se guardan como snapshot;
- una versión anterior queda `SUPERSEDED` cuando se envía una nueva;
- la cotización puede previsualizarse e imprimirse/guardarse como PDF desde una vista preparada para impresión;
- “Enviar cotización” remite un correo HTML con el resumen completo y marca `SENT` sólo si el envío se completa;
- el administrador registra la aceptación recibida por su canal comercial antes de convertir la oportunidad. Esta entrega no expone una URL pública ni implementa firma electrónica.

Estados de cotización: `DRAFT`, `SENT`, `ACCEPTED`, `EXPIRED` y `SUPERSEDED`.

### Conversión

Marcar una oportunidad como ganada requiere RFC y una cotización aceptada. La operación transaccional:

1. crea o reutiliza la empresa por RFC;
2. crea un pedido B2B desde el snapshot aceptado;
3. vincula solicitud, cotización, empresa y pedido;
4. marca solicitud `WON` y cotización `ACCEPTED`;
5. registra actividad y auditoría.

Una oportunidad perdida requiere motivo. No se eliminan solicitudes ni cotizaciones del historial comercial.

## Modelo de datos

### Product

Agregar `isB2BEnabled Boolean @default(false)` y un campo opcional de prioridad B2B. La migración habilita automáticamente los productos que ya tengan tiers, para no vaciar el catálogo existente. El catálogo público requiere habilitación y al menos un tier válido.

### B2BInquiry

Extender el modelo existente con:

- `folio` único;
- `requestId` único para idempotencia;
- estado ampliado;
- datos comerciales existentes;
- tipo de negocio y frecuencia;
- subtotal estimado y moneda;
- responsable opcional;
- próxima acción y fecha;
- motivo de pérdida;
- relaciones con líneas, actividades, cotizaciones, empresa y pedido.

### B2BInquiryItem

Guardar producto, cantidad, frecuencia, tier aplicado y precio/subtotal estimados. Estos valores representan la solicitud original y no se reescriben al preparar la cotización.

### B2BActivity

Registrar tipo, texto, autor, fecha y metadatos mínimos para estado, nota, asignación, seguimiento, creación/envío de cotización y conversión.

### B2BQuote y B2BQuoteItem

Guardar versión, estado, vigencia, importes, condiciones, notas, envío y aceptación. Las líneas conservan snapshot de producto, SKU, cantidad y precio.

### B2BCompany

Guardar razón social, RFC único, nombre comercial, contactos, condiciones de pago y fecha de alta. Sólo se crea durante conversión ganada o mediante una acción administrativa explícita.

### Order

Mantener `orderType = B2B` y añadir referencias opcionales a empresa y cotización de origen. Las líneas se crean desde la cotización aceptada.

## Contrato API

Se elimina el uso cliente de `/api/subscriptions/b2b-inquiry`. Toda la funcionalidad B2B vive bajo `/api/b2b`.

### Público

- `GET /api/b2b/catalog`: catálogo habilitado, tiers válidos y filtros.
- `POST /api/b2b/inquiries`: crea solicitud estructurada y devuelve folio/resumen.

La creación pública tendrá validación compartida, límite de frecuencia, honeypot y mensajes de error por campo. No expondrá datos administrativos.

### Administración

- listado, métricas y detalle de solicitudes;
- actualización controlada de pipeline;
- asignación, seguimiento y notas;
- creación/versionado/envío de cotizaciones;
- conversión ganada a empresa y pedido;
- listado de empresas y pedidos;
- CRUD validado de tiers.

Los endpoints administrativos usan `requireAuth`, limitador administrativo y `logAdminAction`.

## Validación de tiers

Un tier debe cumplir:

- `minQty` entero mayor que cero;
- `maxQty` nulo o entero mayor o igual a `minQty`;
- `pricePerUnit` mayor que cero;
- ningún rango puede solaparse con otro rango del mismo producto;
- sólo puede existir un rango abierto (`maxQty = null`) y debe ser el último.

El servidor aplica estas reglas; la interfaz las anticipa y explica el conflicto.

## Dirección visual

Concepto: **Mesa de selección**.

La superficie del catálogo utiliza “papel algodón” para transmitir claridad y tactilidad; el constructor usa espresso oscuro para concentrar la decisión. La interfaz administrativa reutiliza la zona oscura con mayor densidad de información.

Paleta:

- Espresso `#27170F`;
- Latón `#D0A45D`;
- Papel algodón `#F4EFE5`;
- Cáscara `#7D4D1F`;
- Tostado suave `#725F50`.

La tipografía serif se reserva para títulos, folios e importes. La tipografía sans actual del proyecto se usa para controles, datos y lectura continua. No se incorporará una fuente adicional que incremente el peso de la PWA.

La firma visual es el constructor tratado como una ficha de cata comercial: selección, frecuencia, cantidades y estimado se leen como una sola unidad.

## Responsive y PWA

- Escritorio desde `1024px`: catálogo y constructor en dos columnas.
- Tablet: catálogo de dos columnas y resumen compacto.
- Móvil/PWA: catálogo de una columna, CTA inferior seguro para `safe-area-inset-bottom` y hoja de resumen.
- Los modales no superan el viewport y el contenido largo desplaza sólo el cuerpo.
- El footer no aparece en modo instalado cuando compite con la navegación PWA.
- Estados y controles no dependen únicamente de hover.
- Se respetan `prefers-reduced-motion`, foco visible y contraste AA.

## Manejo de errores

- Catálogo: skeleton, reintento explícito y estado vacío accionable.
- Borrador: productos deshabilitados o tiers modificados se recalculan y se señalan antes de enviar.
- Envío: errores por campo permanecen junto al control; errores de red conservan el borrador.
- Doble envío: botón bloqueado e idempotencia de servidor.
- Correo: si la solicitud se guarda pero falla el correo, la confirmación sigue mostrando folio y el fallo se registra para reintento.
- Administración: mutaciones optimistas sólo cuando puedan revertirse; cotizaciones y conversión esperan confirmación del servidor.

## Seguridad y privacidad

- Lista blanca de campos y límites de longitud.
- Recalcular precios y totales en servidor.
- Rate limiting e indicador honeypot en la ruta pública.
- No registrar datos personales completos en logs de consola.
- Acciones comerciales y cambios de precio quedan auditados.
- No se envían credenciales ni datos fiscales a servicios no configurados.

## Pruebas

### Unitarias

- selección correcta de tier;
- detección de solapamientos;
- cálculo de estimados;
- transición válida de estados;
- creación de una nueva versión;
- validación y normalización de solicitud.

### API

- catálogo sólo con productos B2B válidos;
- servidor ignora precios manipulados;
- idempotencia de solicitud;
- autenticación de rutas administrativas;
- conversión transaccional a empresa/pedido;
- fallo de correo sin pérdida de solicitud.

### Interfaz

- agregar, actualizar y eliminar líneas;
- persistir/rehidratar borrador;
- filtros guiados;
- formulario por pasos y errores;
- pipeline, detalle y creación de cotización;
- estados vacíos, carga y reintento.

### Verificación manual

- escritorio ancho, laptop, tablet y PWA móvil;
- tema claro/oscuro;
- navegación por teclado;
- instalación PWA y safe areas;
- solicitud en producción y aparición inmediata en admin;
- impresión de cotización y conversión en pedido.

## Criterios de aceptación

1. El catálogo público no muestra productos sin disponibilidad B2B.
2. Una empresa puede armar una solicitud con dos o más productos y ver un estimado correcto.
3. Refrescar o reabrir la PWA conserva el borrador.
4. El servidor recalcula y guarda las líneas originales con folio único.
5. El lead aparece en el pipeline con valor y SLA.
6. El administrador puede generar dos versiones sin sobrescribir la primera.
7. Una cotización enviada puede convertirse transaccionalmente en empresa y pedido.
8. Los tiers inválidos o solapados se rechazan.
9. Cliente y admin funcionan sin desplazamiento horizontal en los breakpoints definidos.
10. Las pruebas automatizadas y compilaciones de cliente, servidor y admin pasan.
