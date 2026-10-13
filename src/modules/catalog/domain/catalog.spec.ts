import { aService } from '../../../../test/support/builders';
import { blockMinutes, isOfferedOn, normalizeTags, validateService } from './catalog';

describe('Catálogo (dominio)', () => {
  it('normaliza etiquetas de recomendación (minúsculas, sin acentos, sin duplicados)', () => {
    expect(normalizeTags([' Relajación ', 'relajacion', 'Hidratación', ''])).toEqual([
      'relajacion',
      'hidratacion',
    ]);
  });

  it('un servicio sin fechas específicas se ofrece siempre; con fechas, sólo esos días', () => {
    expect(isOfferedOn(aService(), '2026-10-21')).toBe(true);
    const special = aService({ specificDates: ['2026-12-24'] });
    expect(isOfferedOn(special, '2026-12-24')).toBe(true);
    expect(isOfferedOn(special, '2026-12-23')).toBe(false);
  });

  it('el bloque de agenda incluye preparación y limpieza', () => {
    expect(blockMinutes({ prepMinutes: 10, durationMinutes: 90, cleanupMinutes: 5 })).toBe(105);
  });

  it.each([
    [{ name: ' ' }, 'nombre'],
    [{ durationMinutes: 0 }, 'duración'],
    [{ price: -1 }, 'precio'],
    [{ prepMinutes: -5 }, 'preparación'],
  ])('valida datos inválidos %p', (overrides, message) => {
    expect(() => validateService(aService(overrides))).toThrow(message);
  });

  it('rechaza fechas específicas inválidas', () => {
    expect(() => validateService(aService({ specificDates: ['2026-02-30x'] }))).toThrow();
  });
});
