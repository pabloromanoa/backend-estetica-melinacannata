import { InvalidInputError } from '../../../shared/domain/domain-error';
import { BusinessTime } from '../../../shared/domain/business-time';

/**
 * Servicio ofrecido por la estética. Se llama `SalonService` para no confundirlo
 * con los "services" de NestJS.
 */
export interface SalonService {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  price: number;
  prepMinutes: number;
  cleanupMinutes: number;
  isActive: boolean;
  /** Etiquetas que usa el motor de recomendación (ej. "relajacion", "hidratacion"). */
  recommendationTags: string[];
  /** Si no está vacío, el servicio sólo se presta en estas fechas (YYYY-MM-DD). */
  specificDates: string[];
  categoryIds: string[];
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

/** Agrupación lógica de servicios recomendados para un objetivo (no es un paquete prepago). */
export interface Treatment {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  recommendationTags: string[];
  /** Orden sugerido de realización. */
  serviceIds: string[];
}

export function isOfferedOn(service: SalonService, date: string): boolean {
  return service.specificDates.length === 0 || service.specificDates.includes(date);
}

/** Minutos totales que el servicio bloquea la agenda (preparación + atención + limpieza). */
export function blockMinutes(
  service: Pick<SalonService, 'prepMinutes' | 'durationMinutes' | 'cleanupMinutes'>,
): number {
  return service.prepMinutes + service.durationMinutes + service.cleanupMinutes;
}

export function normalizeTags(tags: readonly string[]): string[] {
  return [
    ...new Set(
      tags.map((t) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')).filter(Boolean),
    ),
  ];
}

export function validateService(service: SalonService): void {
  if (!service.name.trim()) throw new InvalidInputError('El nombre es obligatorio');
  if (!Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0) {
    throw new InvalidInputError('La duración debe ser un entero positivo de minutos');
  }
  if (service.price < 0) throw new InvalidInputError('El precio no puede ser negativo');
  for (const minutes of [service.prepMinutes, service.cleanupMinutes]) {
    if (!Number.isInteger(minutes) || minutes < 0) {
      throw new InvalidInputError('Los tiempos de preparación y limpieza deben ser enteros ≥ 0');
    }
  }
  service.specificDates.forEach((d) => BusinessTime.assertDate(d));
}
