# SOP — Montar el SON desde cero

Procedimiento paso a paso para reproducir el sistema en un cliente nuevo. Usa siempre datos de
prueba primero; pasa a producción sólo tras validar.

## Fase 0 — Requisitos previos

- Notion con una **integración interna** creada y su token (`secret_…`).
- Holded con **API key** generada en el panel de desarrollador.
- n8n operativo (recomendado self-hosted en VPS) con acceso a Internet saliente.

## Fase 1 — Modelar Notion

1. Crear las bases: Empresas, Contactos, Negocios/Presupuestos, Tareas, Reuniones, Facturas,
   Productos y Servicios. Esquema de referencia:
   [`../examples/notion-schema.example.json`](../examples/notion-schema.example.json).
2. Definir las **relaciones** (Contacto→Empresa, Negocio→Empresa, Factura→Negocio…).
3. Añadir a Empresas/Contactos/Facturas las propiedades de control que usan los flujos:
   `Traspasar` (checkbox), `Holded ID`, `Última Sync`, `Sync Hash`, `Reintentos Sync`.
4. Compartir cada base con la integración de Notion (botón *Connections*).

## Fase 2 — Conectar credenciales en n8n

1. Copiar [`../examples/.env.example`](../examples/.env.example) a `.env` y rellenar tokens.
2. En n8n, crear las credenciales de Notion (token de la integración) y de Holded (API key).
3. **Nunca** escribir tokens dentro de los nodos: usar siempre el gestor de credenciales.

## Fase 3 — Volcado histórico (one-shot)

1. Importar el flujo de volcado, conectarlo a las credenciales.
2. Activar **paginación** (recorrer todas las páginas de la API, no sólo la primera).
3. Ejecutar manualmente. Al terminar, **cuadrar totales** por año contra el ERP (tolerancia
   ±3 %). Repetir por rangos los años que queden cortos.
4. Dejar este flujo **inactivo** tras la migración: ya no se usa en el día a día.

## Fase 4 — Sincronización en tiempo real

1. Importar el flujo de ejemplo Presupuesto → Factura:
   [`../examples/n8n-presupuesto-a-factura.example.json`](../examples/n8n-presupuesto-a-factura.example.json).
2. Validar la cadena con un presupuesto de prueba: marcar `Estado = Ganado` y comprobar que se
   crea la factura en Holded y vuelve el nº y la URL a Notion.
3. Activar el resto de flujos de sincronización (contactos, empresas, cobros) uno a uno,
   verificando cada uno antes de pasar al siguiente.

## Fase 5 — Vigilancia competitiva

1. Crear las bases Fuentes RSS, Filtros y Actualidad.
2. Cargar reglas iniciales: [`../examples/filtros-vigilancia.example.csv`](../examples/filtros-vigilancia.example.csv).
3. Programar el cron de madrugada y lanzar una ejecución manual de prueba.
4. Ajustar umbrales en la base de Filtros según los falsos positivos observados.

## Checklist de calidad antes de dar por cerrado

- [ ] Todos los NIF/CIF normalizados (`^[A-Z0-9]{8,9}$`).
- [ ] Todas las fechas en ISO 8601.
- [ ] Totales de facturación cuadrados contra el ERP (±3 %).
- [ ] Sin duplicados por `Holded ID` en la base de Facturas.
- [ ] Base de *Errores de Sync* vacía tras 24 h de funcionamiento.
- [ ] Ningún token ni ID real en archivos versionados.
