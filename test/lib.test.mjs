// Tests para lib.js usando el runner nativo de Node.js (node:test, disponible desde Node 18+).
// Ejecutar con: node --test test/lib.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  isoToDisplay,
  displayToISO,
  normalizarFnac,
  calcularEdadConAnio,
  jaroWinkler,
  simNorm,
  formatFechaLarga,
} from '../lib.mjs';

describe('normalize', () => {
  it('elimina tildes y pasa a minúsculas', () => {
    assert.equal(normalize('Martínez'), 'martinez');
    assert.equal(normalize('ÁNGEL'), 'angel');
    assert.equal(normalize('  Ñoño  '), 'nono');
  });
  it('cadena vacía devuelve cadena vacía', () => {
    assert.equal(normalize(''), '');
  });
});

describe('isoToDisplay / displayToISO', () => {
  it('convierte ISO a DD/MM/AAAA', () => {
    assert.equal(isoToDisplay('2015-03-07'), '07/03/2015');
  });
  it('convierte DD/MM/AAAA a ISO', () => {
    assert.equal(displayToISO('07/03/2015'), '2015-03-07');
  });
  it('son inversas entre sí', () => {
    const iso = '2010-11-25';
    assert.equal(displayToISO(isoToDisplay(iso)), iso);
  });
  it('displayToISO devuelve vacío si el año tiene menos de 4 dígitos', () => {
    assert.equal(displayToISO('07/03/15'), '');
  });
  it('isoToDisplay devuelve vacío para entrada vacía o nula', () => {
    assert.equal(isoToDisplay(''), '');
    assert.equal(isoToDisplay(null), '');
  });
});

describe('normalizarFnac', () => {
  it('acepta formato ISO directamente', () => {
    assert.equal(normalizarFnac('2015-03-07'), '2015-03-07');
  });
  it('convierte formato display a ISO', () => {
    assert.equal(normalizarFnac('07/03/2015'), '2015-03-07');
  });
  it('devuelve vacío para entrada vacía o nula', () => {
    assert.equal(normalizarFnac(''), '');
    assert.equal(normalizarFnac(null), '');
  });
});

describe('calcularEdadConAnio', () => {
  it('calcula edad correcta antes del cumpleaños en el año de referencia', () => {
    // Ref: 31/12/2026. Nacido 15/06/2018 → cumple 8 en junio 2026 → 8 años
    assert.equal(calcularEdadConAnio('2018-06-15', 2026), 8);
  });
  it('calcula edad correcta después del cumpleaños', () => {
    // Nacido 15/01/2018 → cumple 8 en enero 2026 → 8 años a 31/12/2026
    assert.equal(calcularEdadConAnio('2018-01-15', 2026), 8);
  });
  it('cuenta el cumpleaños el mismo 31 de diciembre', () => {
    assert.equal(calcularEdadConAnio('2018-12-31', 2026), 8);
  });
  it('devuelve null para fecha inválida', () => {
    assert.equal(calcularEdadConAnio('no-es-fecha', 2026), null);
    assert.equal(calcularEdadConAnio('', 2026), null);
    assert.equal(calcularEdadConAnio(null, 2026), null);
  });
  it('devuelve null si falta anio', () => {
    assert.equal(calcularEdadConAnio('2018-06-15', null), null);
  });
});

describe('jaroWinkler', () => {
  it('cadenas idénticas dan 1', () => {
    assert.equal(jaroWinkler('garcia', 'garcia'), 1);
  });
  it('cadenas completamente distintas dan valor bajo', () => {
    assert.ok(jaroWinkler('abc', 'xyz') < 0.5);
  });
  it('cadenas similares dan valor alto', () => {
    assert.ok(jaroWinkler('martinez', 'martines') > 0.9);
  });
  it('cadena vacía devuelve 0', () => {
    assert.equal(jaroWinkler('', 'abc'), 0);
    assert.equal(jaroWinkler('abc', ''), 0);
  });
});

describe('simNorm', () => {
  it('misma cadena con y sin tildes da 1', () => {
    assert.equal(simNorm('Martínez', 'Martinez'), 1);
  });
  it('nombres muy similares dan score alto', () => {
    assert.ok(simNorm('González', 'Gonzalez') > 0.95);
  });
  it('nombres distintos dan score bajo', () => {
    assert.ok(simNorm('García', 'López') < 0.7);
  });
});

describe('formatFechaLarga', () => {
  it('formatea fecha ISO a texto largo en mayúsculas', () => {
    assert.equal(formatFechaLarga('2026-06-15'), '15 de JUNIO de 2026');
  });
  it('formatea enero correctamente', () => {
    assert.equal(formatFechaLarga('2026-01-01'), '1 de ENERO de 2026');
  });
  it('devuelve vacío para entrada vacía o nula', () => {
    assert.equal(formatFechaLarga(''), '');
    assert.equal(formatFechaLarga(null), '');
  });
});
