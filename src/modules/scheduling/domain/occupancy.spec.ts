import { computeOccupancy, freeMinutesBetweenAppointments, percentage } from './occupancy';

describe('Ocupación de agenda', () => {
  const working = [
    { start: 480, end: 780 }, // 08-13
    { start: 840, end: 1080 }, // 14-18
  ];
  const busy = [
    { start: 480, end: 570 }, // 08:00-09:30
    { start: 600, end: 660 }, // 10:00-11:00
    { start: 1050, end: 1100 }, // 17:30-18:20 (excede jornada)
  ];

  it('calcula capacidad, ocupado, libre y huecos útiles', () => {
    const stats = computeOccupancy(working, busy);
    expect(stats.capacityMinutes).toBe(540);
    expect(stats.bookedMinutes).toBe(90 + 60 + 30);
    expect(stats.freeMinutes).toBe(540 - 180);
    expect(stats.gaps).toEqual([
      { start: 570, end: 600 },
      { start: 660, end: 780 },
      { start: 840, end: 1050 },
    ]);
  });

  it('minutos libres ENTRE turnos excluye antes del primero y después del último', () => {
    expect(freeMinutesBetweenAppointments(working, busy)).toBe(30 + 120 + 210);
    expect(freeMinutesBetweenAppointments(working, [busy[0]])).toBe(0);
  });

  it('porcentaje con un decimal y sin dividir por cero', () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(5, 0)).toBe(0);
  });
});
