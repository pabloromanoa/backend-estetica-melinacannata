export interface OutgoingMessage {
  /** Teléfono del destinatario tal como lo cargó el cliente. */
  to: string;
  text: string;
}

/**
 * Puerto del canal de notificación. La lógica de negocio no conoce al proveedor concreto
 * (WhatsApp Cloud API de Meta, Twilio, etc.): se cambia por configuración.
 */
export abstract class NotificationChannel {
  abstract send(message: OutgoingMessage): Promise<void>;
}

/** Normaliza un teléfono argentino a formato E.164 sin "+" (ej. 5491148291102). */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('549')) return digits;
  if (digits.startsWith('54')) return `549${digits.slice(2)}`;
  return `549${digits.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1')}`;
}
