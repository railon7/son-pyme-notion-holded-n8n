# Vigilancia competitiva sin LLM — motor determinista

Módulo que cada madrugada lee fuentes RSS del sector, clasifica las noticias por relevancia y
escribe un radar diario en Notion. Lo característico: **no usa ningún modelo de lenguaje**. La
clasificación es un algoritmo determinista de *densidad de palabras clave × peso*.

## Por qué sin IA

Una primera versión usaba un LLM por noticia. Se sustituyó por un motor propio:

| Aspecto | Versión con LLM | Versión determinista |
|---------|-----------------|----------------------|
| Coste | Variable (tokens por noticia) | **0 € de coste marginal** |
| Reproducibilidad | Baja | 100 % (mismas reglas ⇒ mismo resultado) |
| Mantenimiento | Tocar código | Editar palabras clave en una tabla de Notion |
| Auditabilidad | Opaca | Total: se sabe qué keyword casó y con qué densidad |

El *trade-off* es menor sofisticación semántica, aceptable cuando el dominio está bien acotado
(p. ej. ayudas públicas, IA, automatización, marketing digital, tendencias del sector).

## Bases de datos en Notion

- **Fuentes RSS** — `Fuente`, `RSS (url)`, `Categoría`, `Activo`, `Última ejecución`,
  `Errores consecutivos`.
- **Filtros** — `Regla`, `Keywords` (separadas por comas), `Categoría`, `Peso (1–10)`,
  `Umbral Alta (%)`, `Umbral Media (%)`, `Activo`.
- **Actualidad** — `Noticia`, `Categoría`, `Fuente`, `Fecha de Publicación`, `Impacto`,
  `Resumen`, `Acción Recomendada`, `Keywords detectadas`, `Hash`.

Reglas y fuentes se editan **en Notion**, sin tocar n8n.

## Algoritmo (núcleo del flujo)

Por cada noticia con `pubDate ≥ ahora − 48 h`:

1. **Normalizar**: título ≤ 200 car., enlace obligatorio, resumen ≤ 500 car., fecha ISO 8601.
2. **Hash**: `SHA-1(enlace_canónico)` para deduplicar contra las últimas N noticias.
3. **Matching**: por cada regla activa, contar cuántas de sus *keywords* aparecen en
   `(título + ' ' + resumen).toLowerCase()`.
4. **Densidad**: `keywords_encontradas / keywords_totales_de_la_regla × 100`.
5. **Impacto**:
   - `Alta` si densidad ≥ *Umbral Alta*.
   - `Media` si *Umbral Media* ≤ densidad < *Umbral Alta*.
   - **Descarte silencioso** si densidad < *Umbral Media*.
6. **Regla ganadora**: la de mayor `Peso × densidad`; su categoría se asigna a la noticia.
7. **Acción recomendada**: tabla determinista `accion[Impacto][Categoría]`.

La implementación de referencia del clasificador está en
[`../examples/clasificador-vigilancia.example.js`](../examples/clasificador-vigilancia.example.js).

## Gestión de errores

| Código | Caso | Tratamiento |
|--------|------|-------------|
| `E-FETCH` | La fuente no responde | `continueOnFail`; suma 1 a *Errores consecutivos* |
| `E-DUP` | Hash ya existente | *skip* silencioso |
| `E-EMPTY` | Feed 200 pero sin ítems | Marca activa sin contenido reciente |
| `E-PROP` | Propiedad Notion ausente | *Fallbacks* tolerantes en los nodos Code |

## Rollback sin redeploy

Si aparecen falsos positivos en masa, basta **subir el `Umbral Media`** en la tabla de Filtros
(p. ej. de 50 a 65). El flujo lo lee en caliente en la siguiente ejecución; no hace falta
volver a desplegar nada en n8n. Esa es la ventaja de tener las reglas como datos y no como
código.
