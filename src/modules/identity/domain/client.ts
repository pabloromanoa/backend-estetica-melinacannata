/**
 * Persona que reserva turnos. Existe aunque no tenga cuenta (invitado): se identifica por DNI.
 * Cuando se registra, el `Client` existente con ese DNI se vincula a su `User`.
 */
export interface Client {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string | null;
}

export interface ClientContactData {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email?: string | null;
}

/** DNI sin puntos ni espacios. */
export const normalizeDni = (dni: string): string => dni.replace(/[.\s-]/g, '').trim();
