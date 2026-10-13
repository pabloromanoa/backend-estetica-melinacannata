import { Injectable, Logger } from '@nestjs/common';
import { BusinessTime } from '../../../shared/domain/business-time';
import { NotificationChannel } from '../domain/notification-channel';

/** Datos mínimos de un turno para notificar (no depende del módulo de turnos). */
export interface AppointmentNotice {
  clientFirstName: string;
  clientPhone: string;
  serviceName: string;
  providerName: string;
  startAt: Date;
  depositAmount: number;
  bankAlias: string | null;
  trackingUrl: string | null;
}

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/**
 * Arma y envía los mensajes de WhatsApp previstos en el relevamiento. Un fallo del canal
 * NUNCA rompe el caso de uso que lo invoca: se registra y se continúa.
 */
@Injectable()
export class AppointmentNotifier {
  private readonly logger = new Logger(AppointmentNotifier.name);

  constructor(
    private readonly channel: NotificationChannel,
    private readonly time: BusinessTime,
  ) {}

  bookingCreated(n: AppointmentNotice): Promise<void> {
    const alias = n.bankAlias ? ` al alias ${n.bankAlias}` : '';
    const link = n.trackingUrl ? `\nSeguí tu turno acá: ${n.trackingUrl}` : '';
    return this.send(
      n,
      `¡Hola ${n.clientFirstName}! Reservamos tu turno de ${n.serviceName} con ${n.providerName} ` +
        `el ${this.when(n.startAt)}. Para confirmarlo transferí la seña de ${money.format(n.depositAmount)}` +
        `${alias} y adjuntá el comprobante.${link}`,
    );
  }

  depositConfirmed(n: AppointmentNotice): Promise<void> {
    return this.send(
      n,
      `¡Listo ${n.clientFirstName}! Verificamos tu seña. Tu turno de ${n.serviceName} ` +
        `con ${n.providerName} queda confirmado para el ${this.when(n.startAt)}.`,
    );
  }

  depositRejected(n: AppointmentNotice, reason: string): Promise<void> {
    return this.send(
      n,
      `Hola ${n.clientFirstName}, no pudimos validar el comprobante de tu turno de ${n.serviceName} ` +
        `(${reason}). El horario fue liberado; podés volver a reservar cuando quieras.`,
    );
  }

  cancelled(n: AppointmentNotice, detail: string): Promise<void> {
    return this.send(
      n,
      `Hola ${n.clientFirstName}, tu turno de ${n.serviceName} del ${this.when(n.startAt)} fue cancelado. ${detail}`,
    );
  }

  rescheduled(n: AppointmentNotice, reason: string): Promise<void> {
    return this.send(
      n,
      `Hola ${n.clientFirstName}, reprogramamos tu turno de ${n.serviceName}: ahora es el ` +
        `${this.when(n.startAt)} con ${n.providerName}. Motivo: ${reason}.`,
    );
  }

  reminder(n: AppointmentNotice): Promise<void> {
    return this.send(
      n,
      `¡Hola ${n.clientFirstName}! Te recordamos tu turno de ${n.serviceName} con ${n.providerName} ` +
        `mañana, ${this.when(n.startAt)}. ¡Te esperamos!`,
    );
  }

  private when(date: Date): string {
    return (
      new Intl.DateTimeFormat('es-AR', {
        timeZone: this.time.timezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(date) + ' h'
    );
  }

  private async send(n: AppointmentNotice, text: string): Promise<void> {
    try {
      await this.channel.send({ to: n.clientPhone, text });
    } catch (error) {
      this.logger.warn(`No se pudo enviar la notificación a ${n.clientPhone}: ${String(error)}`);
    }
  }
}
