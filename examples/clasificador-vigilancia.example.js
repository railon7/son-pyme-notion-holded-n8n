/**
 * Clasificador determinista de noticias para el módulo de vigilancia.
 * Sin LLM: densidad de palabras clave x peso de la regla.
 *
 * Pensado para un nodo Code de n8n. Datos de ejemplo ficticios.
 */

const crypto = require('crypto');

/**
 * @param {{title:string, link:string, snippet:string, pubDate:string}} noticia
 * @param {Array<{regla:string, keywords:string[], categoria:string,
 *                peso:number, umbralAlta:number, umbralMedia:number}>} filtros
 * @returns {null | {categoria, impacto, hash, densidad, keywordsDetectadas}}
 */
function clasificar(noticia, filtros) {
  const texto = `${noticia.title} ${noticia.snippet}`.toLowerCase();
  const hash = crypto.createHash('sha1').update(noticia.link).digest('hex');

  let ganadora = null;
  let mejorScore = -1;

  for (const f of filtros) {
    const encontradas = f.keywords.filter((k) => texto.includes(k.toLowerCase()));
    const densidad = (encontradas.length / f.keywords.length) * 100;

    if (densidad < f.umbralMedia) continue; // descarte silencioso

    const impacto = densidad >= f.umbralAlta ? 'Alta' : 'Media';
    const score = f.peso * densidad;

    if (score > mejorScore) {
      mejorScore = score;
      ganadora = {
        categoria: f.categoria,
        impacto,
        hash,
        densidad: Math.round(densidad),
        keywordsDetectadas: encontradas,
      };
    }
  }

  return ganadora; // null = ninguna regla supera el umbral
}

// Ejemplo de uso:
const filtros = [
  { regla: 'Ayudas públicas', keywords: ['subvención', 'convocatoria', 'ayuda', 'feder'],
    categoria: 'Ayudas Públicas', peso: 8, umbralAlta: 75, umbralMedia: 50 },
  { regla: 'IA aplicada', keywords: ['inteligencia artificial', 'llm', 'automatización'],
    categoria: 'IA', peso: 6, umbralAlta: 66, umbralMedia: 33 },
];

const noticia = {
  title: 'Nueva convocatoria de subvención para digitalización de pymes',
  link: 'https://example.com/noticia/123',
  snippet: 'La convocatoria de ayuda FEDER abre el plazo...',
  pubDate: '2026-06-24',
};

// clasificar(noticia, filtros)
// -> { categoria: 'Ayudas Públicas', impacto: 'Alta', densidad: 75, ... }

module.exports = { clasificar };
