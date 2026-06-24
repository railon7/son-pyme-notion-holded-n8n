/**
 * Normalizador de NIF/CIF para nodos Function/Code de n8n.
 * Regla: mayúsculas, sin espacios, puntos ni guiones.
 * Formato válido: una letra/dígito inicial + 7-8 alfanuméricos (8-9 en total).
 *
 * Datos de ejemplo ficticios.
 */

function normalizarNIF(valor) {
  if (valor == null) return { ok: false, error: 'E-NIF-VACIO', nif: '' };

  const limpio = String(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // quita espacios, puntos, guiones, etc.

  const valido = /^[A-Z0-9]{8,9}$/.test(limpio);

  return valido
    ? { ok: true, nif: limpio }
    : { ok: false, error: 'E-NIF-FORMATO', nif: limpio };
}

// Ejemplos:
//   "b-12.345.678"   -> { ok: true,  nif: "B12345678" }
//   "  x 1234567 l "  -> { ok: true,  nif: "X1234567L" }
//   "123"             -> { ok: false, error: "E-NIF-FORMATO", nif: "123" }

module.exports = { normalizarNIF };
