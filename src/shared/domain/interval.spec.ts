import {
  formatTime,
  intersectIntervals,
  mergeIntervals,
  parseTime,
  subtractIntervals,
  totalMinutes,
} from './interval';

describe('interval', () => {
  it('parsea y formatea horas HH:mm', () => {
    expect(parseTime('08:30')).toBe(510);
    expect(parseTime('24:00')).toBe(1440);
    expect(formatTime(510)).toBe('08:30');
    expect(() => parseTime('25:00')).toThrow(RangeError);
  });

  it('fusiona intervalos solapados o contiguos', () => {
    expect(
      mergeIntervals([
        { start: 60, end: 120 },
        { start: 0, end: 60 },
        { start: 200, end: 300 },
        { start: 250, end: 280 },
      ]),
    ).toEqual([
      { start: 0, end: 120 },
      { start: 200, end: 300 },
    ]);
  });

  it('resta intervalos ocupados de la jornada', () => {
    const jornada = [{ start: 480, end: 780 }]; // 08:00-13:00
    const ocupados = [
      { start: 540, end: 600 }, // 09:00-10:00
      { start: 720, end: 800 }, // 12:00-13:20 (excede la jornada)
    ];
    expect(subtractIntervals(jornada, ocupados)).toEqual([
      { start: 480, end: 540 },
      { start: 600, end: 720 },
    ]);
  });

  it('calcula intersección y total de minutos', () => {
    expect(intersectIntervals([{ start: 0, end: 100 }], [{ start: 50, end: 150 }])).toEqual([
      { start: 50, end: 100 },
    ]);
    expect(
      totalMinutes([
        { start: 0, end: 30 },
        { start: 20, end: 60 },
      ]),
    ).toBe(60);
  });
});
