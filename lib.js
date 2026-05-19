/* lib.js — Funciones puras compartidas entre el renderer y los tests.
 * Compatible con CommonJS (Node/Vitest) y con carga directa via <script src>.
 */

function normalize(str) {
  return str.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function displayToISO(display) {
  if (!display) return '';
  const p = display.split('/');
  if (p.length !== 3 || p[2].length < 4) return '';
  return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
}

function normalizarFnac(fnac) {
  if (!fnac) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fnac)) return fnac;
  return displayToISO(fnac);
}

/* anio: año de inicio del curso escolar (ej. 2026 para 26-27).
 * La referencia es el 31 de diciembre de ese año. */
function calcularEdadConAnio(isoFnac, anio) {
  if (!isoFnac || !anio) return null;
  const ref = new Date(anio, 11, 31);
  const nac = new Date(isoFnac);
  if (isNaN(nac.getTime())) return null;
  let e = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) e--;
  return e;
}

function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  const l1 = s1.length, l2 = s2.length;
  if (!l1 || !l2) return 0;
  const dist = Math.max(Math.floor(Math.max(l1, l2) / 2) - 1, 0);
  const m1 = new Array(l1).fill(false), m2 = new Array(l2).fill(false);
  let matches = 0;
  for (let i = 0; i < l1; i++) {
    for (let j = Math.max(0, i - dist); j < Math.min(l2, i + dist + 1); j++) {
      if (!m2[j] && s1[i] === s2[j]) { m1[i] = m2[j] = true; matches++; break; }
    }
  }
  if (!matches) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  const jaro = (matches / l1 + matches / l2 + (matches - t / 2) / matches) / 3;
  let p = 0;
  for (let i = 0; i < Math.min(4, l1, l2); i++) { if (s1[i] === s2[i]) p++; else break; }
  return jaro + p * 0.1 * (1 - jaro);
}

function simNorm(a, b) {
  const na = normalize(a), nb = normalize(b);
  return na === nb ? 1 : jaroWinkler(na, nb);
}

const MESES_LARGO = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

function formatFechaLarga(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d)} de ${MESES_LARGO[parseInt(m) - 1]} de ${y}`;
}

// CJS (Node/tests via createRequire). Ignorado en el navegador.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalize, isoToDisplay, displayToISO, normalizarFnac, calcularEdadConAnio, jaroWinkler, simNorm, formatFechaLarga, MESES_LARGO };
}
