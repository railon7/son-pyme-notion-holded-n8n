# Sistema Operativo de Negocio (SON) para PYMEs · Notion + Holded + n8n

[![n8n](https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io)
[![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white)](https://www.json.org)
[![Notion](https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=notion&logoColor=white)](https://www.notion.com)
[![Holded](https://img.shields.io/badge/Holded-0E9F6E?style=for-the-badge&logoColor=white)](https://www.holded.com)

Implantación de un **Sistema Operativo de Negocio**: una arquitectura que integra tres
herramientas cloud para que una PYME gestione su operación, su contabilidad y la
sincronización entre ambas sin intervención manual.

- **Notion** — el *cerebro*: CRM, proyectos, tareas, reuniones y vigilancia competitiva.
- **Holded** — el *sistema contable*: facturación, contabilidad y fiscalidad.
- **n8n** — el *orquestador*: sincroniza Notion ↔ Holded aplicando las reglas de negocio.

> Este repositorio es una **versión genérica y sin datos sensibles** de un proyecto real de
> implantación. No contiene credenciales, identificadores reales, nombres de clientes ni los
> workflows de producción. Es material de referencia y portafolio: documenta *cómo* se diseñó
> el sistema, *qué problemas* aparecieron y *cómo* se resolvieron, con ejemplos ficticios
> reutilizables en otros proyectos.

## Qué resuelve

Una PYME suele tener su operación comercial en una herramienta (CRM/proyectos) y su
contabilidad en otra (ERP), con doble tecleo y datos que se desincronizan. El SON elimina ese
doble tecleo: un presupuesto que se gana en Notion se convierte automáticamente en una factura
en Holded, y los cobros vuelven reflejados a Notion. Además, un módulo de **vigilancia
competitiva** clasifica noticias del sector cada día sin coste por uso.

## Arquitectura en una frase

```
Contacto ─▶ Empresa ─▶ Negocio/Presupuesto ─▶ Tareas · Reuniones · Facturas
   (Notion: fuente de verdad operativa)        (n8n sincroniza)      (Holded: fuente contable)
```

Cada dato vive en un único sitio (su *fuente de verdad*) y el resto lo refleja. La
sincronización es **bidireccional y por lotes** (cada 10–30 min según el módulo), no
transaccional, para tolerar fallos de API sin romper la experiencia del usuario.

Ver detalle en [`docs/arquitectura.md`](docs/arquitectura.md).

## Contenido del repositorio

| Ruta | Qué es |
|------|--------|
| `docs/arquitectura.md` | Modelo de datos, bases de Notion, catálogo de flujos n8n y reglas de normalización. |
| `docs/vigilancia-competitiva.md` | Motor de clasificación de noticias por densidad de palabras clave (sin LLM). |
| `docs/SOP-uso.md` | Procedimiento paso a paso para montar el sistema desde cero. |
| `docs/aprendizaje.md` | **Problemas reales y sus soluciones** (lo más valioso). |
| `examples/` | Ejemplos `*.example.*` con datos ficticios: esquema de Notion, snippet de workflow, reglas de vigilancia y utilidades de normalización. |

## Requisitos

- Cuenta de **Notion** (con integración interna y token de API).
- Cuenta de **Holded** con API key.
- Instancia de **n8n** (recomendado self-hosted en un VPS para control de credenciales).
- Node.js disponible en los nodos *Function/Code* de n8n.

## Uso rápido (con datos ficticios)

1. Crea en Notion las bases de datos del esquema de ejemplo
   ([`examples/notion-schema.example.json`](examples/notion-schema.example.json)).
2. Copia [`examples/.env.example`](examples/.env.example) a `.env` y rellena tus credenciales
   (este archivo **no** se sube: está en `.gitignore`).
3. Importa en n8n el flujo de ejemplo
   ([`examples/n8n-presupuesto-a-factura.example.json`](examples/n8n-presupuesto-a-factura.example.json))
   y conéctalo a tus credenciales.
4. Para la vigilancia, carga las reglas de ejemplo
   ([`examples/filtros-vigilancia.example.csv`](examples/filtros-vigilancia.example.csv))
   en tu base de Filtros.

> Los identificadores de bases de datos, tokens y URLs de los ejemplos son **ficticios**.
> Sustitúyelos por los tuyos. Nunca publiques los valores reales.

## Reglas de oro (estándares técnicos)

- **NIF/CIF normalizado**: sin espacios, puntos ni guiones, siempre en mayúsculas
  (`B12345678`). Ver [`examples/normalizar-nif.example.js`](examples/normalizar-nif.example.js).
- **Fechas en ISO 8601** (`YYYY-MM-DD`) en todas las propiedades y *payloads*.
- **Trazabilidad obligatoria**: todo registro cuelga de la cadena
  Contacto → Empresa → Negocio → Tarea/Reunión/Factura.

## Problemas resueltos (aprendizaje)

Resumen — detalle completo en [`docs/aprendizaje.md`](docs/aprendizaje.md):

- **Paginación olvidada en la API** → solo se importaba la primera página (100 registros) del
  histórico. Solución: iterar todas las páginas (`hasMore`) y separar el flujo de *volcado
  masivo* del de *sincronización en tiempo real*.
- **`??` con prioridad invertida** → en facturas multi-producto se grababa el precio del primer
  producto en lugar del subtotal. Solución: invertir el orden del *nullish coalescing*.
- **Whitelist de estados incompleta** → estados nuevos válidos se marcaban como `Error`.
  Solución: pasar de *whitelist* a *blacklist* de estados.
- **Bucles de sincronización bidireccional** → resueltos con marcador de origen y *hash* de
  cambios para abortar escrituras redundantes.

## Licencia

[MIT](LICENSE).
