# Arquitectura del Sistema Operativo de Negocio (SON)

## 1. Los tres pilares

| Pilar | Herramienta | Rol | Fuente de verdad de… |
|-------|-------------|-----|----------------------|
| Cerebro | Notion | Operación y decisión | CRM, proyectos, tareas, reuniones, registro horario, vigilancia |
| Sistema contable | Holded | Facturación y fiscalidad | Facturas emitidas/recibidas, modelos fiscales, tesorería |
| Orquestador | n8n (self-hosted) | Integración | Reglas de sincronización Notion ↔ Holded |

**Principio rector:** cada dato vive en un único pilar. El resto lo refleja. Notion no inventa
contabilidad y Holded no inventa oportunidades comerciales.

## 2. Modelo de datos en Notion

Se modela como un esquema en estrella: tablas de *hechos* (eventos) y tablas de *dimensión*
(contexto), conectadas con propiedades de relación, y agregadas con *rollups* y fórmulas.

**Tablas de hechos**
- **Negocios / Presupuestos** — oportunidades comerciales (lead, prospecto, ganado, perdido).
- **Reuniones** — con transcripción y extracción de tareas.
- **Registro horario** — intervalos de trabajo.
- **Facturas** — espejo bidireccional de Holded.

**Tablas de dimensión**
- **Empresas** — maestro de clientes/proveedores/partners.
- **Contactos** — personas, con **clave única por email** (imprescindible para evitar
  duplicados en la sincronización).
- **Tareas** — operativa diaria.
- **Productos y Servicios** — catálogo.

**Bases auxiliares**
- **Fuentes RSS**, **Filtros**, **Actualidad** — módulo de vigilancia (ver
  [`vigilancia-competitiva.md`](vigilancia-competitiva.md)).
- **Errores de Sync** — cola de auditoría de fallos del orquestador.

**Jerarquía de trazabilidad**

```
Contacto → Empresa → Negocio → Tareas / Reuniones / Facturas
```

Gracias a las relaciones, una Empresa "ve" todos sus Negocios, Contactos, Reuniones, Facturas
y horas trabajadas sin duplicar ningún dato.

## 3. Catálogo de flujos n8n (genérico)

El sistema real tenía ~8 flujos. Estos son sus patrones, sin IDs ni credenciales:

| Patrón | Dirección | Disparador | Función |
|--------|-----------|------------|---------|
| Volcado histórico | Holded → Notion | Manual (one-shot) | Carga masiva inicial. **Inactivo por diseño** tras la migración. |
| Sync contactos/empresas | Holded → Notion | Schedule (10–30 min) | Refleja altas y cambios. |
| Sync inverso | Notion → Holded | Notion trigger | Propaga cambios marcados con `Traspasar = TRUE`. |
| Presupuesto → Factura | Notion → Holded | `Estado = Ganado` | Genera la factura en Holded y devuelve nº y URL a Notion. |
| Lead-to-Cash | Notion → Holded | Cambio en BD Facturas | Pipeline completo con modalidades Ordinaria / Recurrente / Única. |
| Cobros | Holded ↔ Notion | Webhook + Schedule | Refleja el estado de pago en ambos sentidos. |

### Patrones técnicos comunes

- **Deduplicación en cascada** (al sincronizar personas): (1) buscar por ID de Holded →
  (2) buscar por Email + NIF → (3) crear nueva sólo si no existe.
- **Anti-bucle**: cada flujo compara un `sync_hash` antes/después y aborta si no hay cambios; y
  marca sus escrituras con un `origin_marker` para no reprocesar lo que él mismo escribió.
- **Enlace Persona ↔ Empresa manual**: el flujo no lo deduce solo (evita falsos emparejamientos).
- **Facturación recurrente "dormida"**: se crea una factura futura con `Fecha de Imputación`; un
  cron la "despierta" en su fecha, la sube a Holded y genera la siguiente de la serie hasta la
  fecha de fin.

## 4. Reglas de normalización de datos

| Regla | Estándar | Dónde se aplica |
|-------|----------|-----------------|
| NIF/CIF | `^[A-Z0-9]{8,9}$`, sin espacios/puntos/guiones, en mayúsculas | Empresas, Contactos, Facturas |
| Fechas | ISO 8601 `YYYY-MM-DD` | Todas las propiedades fecha y *payloads* JSON |
| Timestamp Unix | `Math.floor(new Date(iso).getTime() / 1000)` | Llamadas a APIs que lo requieran |
| Trazabilidad | Contacto → Empresa → Negocio → … | Toda creación de registro |

La implementación de referencia del normalizador de NIF está en
[`../examples/normalizar-nif.example.js`](../examples/normalizar-nif.example.js).

## 5. Resiliencia: por qué sincronización por lotes y no transaccional

La sincronización cada 10–30 minutos (no inmediata) da consistencia *eventual*: los datos
pueden estar unos minutos desactualizados, pero nunca "rotos". Cuando una llamada a la API
falla, se reintenta; si falla de forma permanente, se registra en la base **Errores de Sync**
(una *dead-letter queue*) para revisión humana, en lugar de reintentar de forma infinita. En
condiciones normales esa base está vacía: es, en sí misma, un indicador de calidad.
