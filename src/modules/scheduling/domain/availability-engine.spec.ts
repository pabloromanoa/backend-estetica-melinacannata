import { parseTime } from '../../../shared/domain/interval';
import {
  blockStartsInGap,
  computeAvailability,
  generateProviderSlots,
  ProviderDay,
  providersAvailableAt,
} from './availability-engine';

const t = parseTime;
const range = (a: string, b: string) => ({ start: t(a), end: t(b) });
const day = (providerId: string, working: string[][], busy: string[][] = []): ProviderDay => ({
  providerId,
  working: working.map(([a, b]) => range(a, b)),
  busy: busy.map(([a, b]) => range(a, b)),
});
const starts = (slots: { start: number }[]) => slots.map((s) => s.start);

describe('Motor de disponibilidad', () => {
  describe('ejemplos del relevamiento', () => {
    it('servicio 90 min + 10 min de preparación: NO ofrece 16:30 si la empleada termina 18:00', () => {
      const timing = { durationMinutes: 90, prepMinutes: 0, cleanupMinutes: 10 };
      const ana = day('ana', [['14:00', '18:00']]);
      expect(providersAvailableAt([ana], timing, t('16:30'))).toEqual([]);
      expect(providersAvailableAt([ana], timing, t('16:20'))).toEqual(['ana']);
    });

    it('Masaje 60 min a las 17:00: Ana disponible, María tiene turno', () => {
      const timing = { durationMinutes: 60, prepMinutes: 0, cleanupMinutes: 0 };
      const ana = day('ana', [['09:00', '20:00']]);
      const maria = day('maria', [['09:00', '20:00']], [['16:30', '17:30']]);
      expect(providersAvailableAt([ana, maria], timing, t('17:00'))).toEqual(['ana']);
    });
  });

  describe('generación de horarios dentro de un hueco', () => {
    it('combina variantes hacia adelante y hacia atrás sin duplicados', () => {
      // Hueco 08:00-13:00 (300 min), bloque de 110 min
      expect(blockStartsInGap(range('08:00', '13:00'), 110)).toEqual([
        t('08:00'),
        t('09:20'),
        t('09:50'),
        t('11:10'),
      ]);
    });

    it('no propone nada si el servicio no entra completo', () => {
      expect(blockStartsInGap(range('08:00', '08:50'), 60)).toEqual([]);
    });

    it('si el hueco es múltiplo exacto del bloque, ambas direcciones coinciden', () => {
      expect(blockStartsInGap(range('09:00', '12:00'), 60)).toEqual([
        t('09:00'),
        t('10:00'),
        t('11:00'),
      ]);
    });
  });

  describe('generateProviderSlots', () => {
    const timing = { durationMinutes: 60, prepMinutes: 10, cleanupMinutes: 5 };

    it('respeta preparación y limpieza alrededor de turnos existentes', () => {
      // Turno existente bloquea 10:00-11:00. Bloque = 75 min.
      const slots = generateProviderSlots(
        day('p', [['09:00', '13:00']], [['10:00', '11:00']]),
        timing,
      );
      // Hueco 09:00-10:00 (60 min) no alcanza para 75. Hueco 11:00-13:00 (120) → 11:00 y 11:45.
      expect(starts(slots)).toEqual([t('11:10'), t('11:55')]);
      expect(slots.every((s) => s.end - s.start === 60)).toBe(true);
    });

    it('marca como "contiguo" el horario pegado a otro turno o al borde de la jornada', () => {
      const slots = generateProviderSlots(
        day('p', [['09:00', '13:00']], [['10:00', '11:00']]),
        timing,
      );
      expect(slots.map((s) => s.contiguous)).toEqual([true, true]);
    });

    it('no ofrece horarios anteriores al mínimo indicado (ej. "ahora")', () => {
      const slots = generateProviderSlots(day('p', [['09:00', '13:00']]), timing, t('11:30'));
      expect(Math.min(...starts(slots))).toBeGreaterThanOrEqual(t('11:30') + timing.prepMinutes);
    });

    it('sin jornada no hay horarios', () => {
      expect(generateProviderSlots(day('p', []), timing)).toEqual([]);
    });
  });

  describe('computeAvailability con varios prestadores', () => {
    it('agrupa por horario e informa qué prestadores pueden atender', () => {
      const timing = { durationMinutes: 60, prepMinutes: 0, cleanupMinutes: 0 };
      const slots = computeAvailability(
        [day('ana', [['09:00', '11:00']]), day('sofi', [['10:00', '12:00']])],
        timing,
      );
      expect(slots.map((s) => [s.start, s.providerIds])).toEqual([
        [t('09:00'), ['ana']],
        [t('10:00'), ['ana', 'sofi']],
        [t('11:00'), ['sofi']],
      ]);
    });
  });

  describe('providersAvailableAt (validación final antes de confirmar)', () => {
    const timing = { durationMinutes: 60, prepMinutes: 10, cleanupMinutes: 10 };

    it('acepta cualquier inicio cuyo bloque completo entre en un hueco libre', () => {
      expect(providersAvailableAt([day('p', [['09:00', '13:00']])], timing, t('09:37'))).toEqual([
        'p',
      ]);
    });

    it('rechaza si la preparación cae fuera de la jornada', () => {
      expect(providersAvailableAt([day('p', [['09:00', '13:00']])], timing, t('09:05'))).toEqual(
        [],
      );
    });

    it('rechaza horarios que se superponen con otro turno', () => {
      const p = day('p', [['09:00', '13:00']], [['10:30', '11:30']]);
      expect(providersAvailableAt([p], timing, t('10:00'))).toEqual([]);
      expect(providersAvailableAt([p], timing, t('11:40'))).toEqual(['p']);
    });

    it('rechaza horarios en el pasado', () => {
      expect(
        providersAvailableAt([day('p', [['09:00', '13:00']])], timing, t('10:00'), t('11:00')),
      ).toEqual([]);
    });
  });
});
