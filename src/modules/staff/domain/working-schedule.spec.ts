import { ExceptionType, validateException, validateWeeklyRanges } from './availability';
import { resolveWorkingIntervals } from './working-schedule';

// 2026-10-13 es martes (dayOfWeek = 2)
const weekly = [
  { dayOfWeek: 2 as const, startTime: '08:00', endTime: '13:00' },
  { dayOfWeek: 2 as const, startTime: '14:00', endTime: '18:00' },
];
const exception = (overrides: object) => ({
  id: 'e',
  providerId: 'p',
  date: '2026-10-13',
  type: ExceptionType.UNAVAILABLE,
  startTime: null,
  endTime: null,
  reason: null,
  ...overrides,
});

describe('resolveWorkingIntervals', () => {
  it('usa el horario semanal habitual (con corte de almuerzo)', () => {
    expect(resolveWorkingIntervals('2026-10-13', weekly, [])).toEqual([
      { start: 480, end: 780 },
      { start: 840, end: 1080 },
    ]);
  });

  it('"Martes 13/10 — No disponible" anula el día completo', () => {
    expect(resolveWorkingIntervals('2026-10-13', weekly, [exception({})])).toEqual([]);
  });

  it('descuenta una indisponibilidad parcial', () => {
    const result = resolveWorkingIntervals('2026-10-13', weekly, [
      exception({ startTime: '10:00', endTime: '11:00' }),
    ]);
    expect(result).toEqual([
      { start: 480, end: 600 },
      { start: 660, end: 780 },
      { start: 840, end: 1080 },
    ]);
  });

  it('"Disponible excepcionalmente 14 a 18" reemplaza el horario del día', () => {
    // 2026-10-16 es viernes y no tiene horario habitual
    const result = resolveWorkingIntervals('2026-10-16', weekly, [
      exception({
        date: '2026-10-16',
        type: ExceptionType.AVAILABLE,
        startTime: '14:00',
        endTime: '18:00',
      }),
    ]);
    expect(result).toEqual([{ start: 840, end: 1080 }]);
  });

  it('ignora excepciones de otras fechas', () => {
    expect(
      resolveWorkingIntervals('2026-10-13', weekly, [exception({ date: '2026-10-14' })]),
    ).toHaveLength(2);
  });
});

describe('validaciones de disponibilidad', () => {
  it('rechaza franjas superpuestas en el mismo día', () => {
    expect(() =>
      validateWeeklyRanges([
        { dayOfWeek: 1, startTime: '08:00', endTime: '13:00' },
        { dayOfWeek: 1, startTime: '12:00', endTime: '14:00' },
      ]),
    ).toThrow('superpuestas');
  });

  it('rechaza rangos invertidos y excepciones AVAILABLE sin horario', () => {
    expect(() =>
      validateWeeklyRanges([{ dayOfWeek: 1, startTime: '13:00', endTime: '08:00' }]),
    ).toThrow();
    expect(() =>
      validateException({
        date: '2026-10-13',
        type: ExceptionType.AVAILABLE,
        startTime: null,
        endTime: null,
        reason: null,
      }),
    ).toThrow('requiere un rango');
  });
});
