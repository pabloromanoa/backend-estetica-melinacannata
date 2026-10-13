import { BusinessTime } from './business-time';

describe('BusinessTime (America/Argentina/Buenos_Aires, UTC-3)', () => {
  const time = new BusinessTime('America/Argentina/Buenos_Aires');

  it('convierte fecha local + minutos a instante UTC', () => {
    expect(time.toInstant('2026-10-25', 14 * 60 + 30).toISOString()).toBe(
      '2026-10-25T17:30:00.000Z',
    );
  });

  it('obtiene la fecha local y los minutos desde la medianoche local', () => {
    const instant = new Date('2026-10-26T01:00:00.000Z'); // 25/10 22:00 local
    expect(time.localDate(instant)).toBe('2026-10-25');
    expect(time.minutesFromStartOf('2026-10-25', instant)).toBe(22 * 60);
  });

  it('opera con fechas de calendario', () => {
    expect(BusinessTime.dayOfWeek('2026-10-25')).toBe(0); // domingo
    expect(BusinessTime.addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(BusinessTime.startOfWeek('2026-10-25')).toBe('2026-10-19');
    expect(BusinessTime.datesBetween('2026-10-30', '2026-11-01')).toHaveLength(3);
    expect(() => BusinessTime.assertDate('2026-13-45')).toThrow(RangeError);
  });
});
