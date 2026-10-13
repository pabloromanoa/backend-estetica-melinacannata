import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config';
import {
  AppointmentNotice,
  AppointmentNotifier,
} from '../../notifications/application/appointment-notifier';
import { DepositOutcome } from '../domain/appointment-status';
import { AppointmentView } from './appointment.views';

const CANCELLATION_DETAIL: Record<DepositOutcome, string> = {
  [DepositOutcome.REFUND]:
    'Corresponde la devolución de la seña; te vamos a contactar para gestionarla.',
  [DepositOutcome.FORFEIT]:
    'Como se canceló con menos de 24 h de anticipación, la seña no es reembolsable.',
  [DepositOutcome.NOT_APPLICABLE]: '',
};

/** Traduce vistas de turnos a notificaciones (adaptador entre Turnos y Notificaciones). */
@Injectable()
export class AppointmentNotices {
  constructor(
    private readonly notifier: AppointmentNotifier,
    private readonly config: AppConfig,
  ) {}

  guestLink(token: string): string {
    return `${this.config.frontendUrl}/turno/${token}`;
  }

  private notice(view: AppointmentView, trackingUrl: string | null = null): AppointmentNotice {
    return {
      clientFirstName: view.client.firstName,
      clientPhone: view.client.phone,
      serviceName: view.service.name,
      providerName: view.provider.displayName,
      startAt: view.startAt,
      depositAmount: view.depositAmount,
      bankAlias: view.provider.bankDetails.alias,
      trackingUrl:
        trackingUrl ??
        (view.client.hasAccount ? `${this.config.frontendUrl}/mi-cuenta/turnos/${view.id}` : null),
    };
  }

  bookingCreated(view: AppointmentView, guestToken: string | null): Promise<void> {
    return this.notifier.bookingCreated(
      this.notice(view, guestToken ? this.guestLink(guestToken) : null),
    );
  }

  depositConfirmed(view: AppointmentView): Promise<void> {
    return this.notifier.depositConfirmed(this.notice(view));
  }

  depositRejected(view: AppointmentView, reason: string): Promise<void> {
    return this.notifier.depositRejected(this.notice(view), reason);
  }

  cancelled(view: AppointmentView): Promise<void> {
    const detail = view.depositOutcome ? CANCELLATION_DETAIL[view.depositOutcome] : '';
    return this.notifier.cancelled(this.notice(view), detail);
  }

  rescheduled(view: AppointmentView, reason: string): Promise<void> {
    return this.notifier.rescheduled(this.notice(view), reason);
  }

  reminder(view: AppointmentView): Promise<void> {
    return this.notifier.reminder(this.notice(view));
  }
}
