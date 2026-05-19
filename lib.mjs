// Wrapper ESM de lib.js para que los tests .mjs puedan importarlo.
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const lib = _require('./lib.js');
export const {
  normalize, isoToDisplay, displayToISO, normalizarFnac,
  calcularEdadConAnio, jaroWinkler, simNorm, formatFechaLarga, MESES_LARGO,
} = lib;
