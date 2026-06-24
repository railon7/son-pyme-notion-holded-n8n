# Problemas resueltos (aprendizaje técnico)

La sección más útil de un proyecto: los baches reales y cómo se resolvieron. Todos los datos
(nombres, importes, identificadores) son **ficticios o genéricos**.

---

## 1. Paginación olvidada al importar el histórico

**Síntoma.** Tras el volcado masivo de Holded a Notion, sólo aparecía una fracción del
histórico de facturas (del orden del 25 %). Faltaban importes de varios años.

**Causa raíz.** La API de Holded devuelve **100 documentos por página** por defecto. El flujo
de importación leía la primera página y no recorría las siguientes. Además, ese flujo se había
diseñado para *sincronización en tiempo real* (cobros del día, presupuestos ganados), con un
filtro tipo "sólo del día / del mes actual" que descartaba permanentemente todo lo que no
encajara en esa ventana.

**Solución.**
1. Separar dos flujos con responsabilidades distintas: uno de **volcado masivo histórico** y
   otro de **sincronización en tiempo real**. Mezclarlos fue el error de diseño de fondo.
2. Implementar **paginación explícita**: mientras `response.hasMore` (o `pages > 1`), iterar y
   acumular todas las páginas antes de escribir en Notion.
3. En el flujo de volcado, permitir **crear** filas (no sólo actualizar): bifurcación
   `¿Encontrada?` → *True* actualiza, *False* crea con los campos mínimos.

**Lección.** Antes de dar por buena una importación, **cuadra los totales** contra la fuente
(por año o por mes). Un flujo "que funciona" puede estar trayendo sólo la primera página.

---

## 2. `??` (nullish coalescing) con la prioridad invertida

**Síntoma.** En facturas con varios productos, Notion guardaba un importe menor que el real.

**Causa raíz.** El código de preparación tomaba el importe así:

```js
// INCORRECTO: el primer operando casi siempre existe y "gana"
const importe = num(h?.products?.[0]?.price ?? h?.subtotal ?? 0);
```

`??` evalúa de izquierda a derecha y devuelve el primer valor no nulo. Como
`products[0].price` siempre existe, se grababa el precio del **primer producto** en lugar del
**subtotal** (suma de todos). En una factura ficticia de dos líneas (397,50 € + 185,00 €) se
guardaba 397,50 € en vez de 582,50 €.

**Solución.** Invertir la prioridad para que el subtotal mande:

```js
// CORRECTO
const importe = num(h?.subtotal ?? h?.products?.[0]?.price ?? 0);
```

Y un *backfill* que reescribe el `Importe Factura` de los registros ya creados con el subtotal
correcto de la fuente.

**Lección.** Con `??` el **orden importa**. Si el primer operando "casi siempre existe",
nunca caerás en el *fallback*: ponlo al final, no al principio.

---

## 3. Whitelist de estados incompleta marcaba registros válidos como `Error`

**Síntoma.** Tras añadir estados nuevos válidos (p. ej. `Cobrada`, `Borrador`), esos registros
aparecían como `Error`.

**Causa raíz.** Un nodo de filtrado validaba contra una **lista blanca** de estados conocidos.
Cualquier estado que no estuviera explícitamente en ella se reescribía a `Error`. Los estados
nuevos no se habían añadido a la lista.

**Solución (de fondo).** Cambiar el enfoque: en lugar de una **whitelist** de estados válidos
(que hay que mantener cada vez que se crea una opción nueva), usar una **blacklist** de los
pocos estados que *sí* deben considerarse error. Así, un estado nuevo se trata como válido por
defecto.

**Lección.** Si tu dominio de valores crece con el tiempo (opciones de un *select*), una
*whitelist* genera deuda de mantenimiento silenciosa. Invierte la lógica.

---

## 4. Bucles en la sincronización bidireccional

**Síntoma.** Riesgo de que la escritura del flujo A en Notion disparara al flujo B, que volvía
a escribir en Holded, que disparaba a A… en bucle.

**Solución.** Dos defensas combinadas:
- **`origin_marker`**: cada flujo marca lo que él mismo escribe; si al dispararse detecta su
  propio marcador, hace *skip* silencioso.
- **`sync_hash`**: antes de escribir, compara un hash del contenido nuevo con el actual; si
  coinciden, aborta sin escribir (no hay nada que cambiar).

**Lección.** Toda sincronización bidireccional necesita, desde el día uno, un mecanismo para
distinguir "esto lo cambió una persona" de "esto lo escribí yo".

---

## 5. Campos que NO deben rellenarse automáticamente

**Síntoma.** Tentación de autocompletar el campo `Negocio` de una factura importada desde el
ERP cruzando por cliente.

**Decisión.** Dejarlo **vacío** y completarlo a mano. El ERP no tiene el concepto de
"oportunidad/negocio"; emparejar automáticamente por cliente asociaría facturas al negocio
equivocado cuando un cliente tiene varios. Igual criterio para el enlace Persona ↔ Empresa.

**Lección.** Automatizar un emparejamiento ambiguo es peor que no automatizarlo: introduce
errores silenciosos difíciles de detectar. Cuando la confianza del *match* es baja, deja el
hueco para revisión humana.

---

## Patrón transversal

Casi todos estos baches comparten una raíz: **un flujo diseñado para un caso de uso se reutilizó
para otro distinto** (tiempo real vs. histórico), o **una suposición sobre los datos dejó de
cumplirse** (un producto vs. varios; estados fijos vs. crecientes). La defensa práctica es
cuadrar totales contra la fuente y desconfiar de los operadores que "casi siempre" toman la
primera rama.
