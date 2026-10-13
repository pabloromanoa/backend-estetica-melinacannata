import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { BookingPolicy } from '../../../shared/domain/booking-policy';
import { Clock } from '../../../shared/domain/clock';
import { AppointmentRepository } from '../domain/scheduling.ports';
import { AppointmentNotices } from './appointment-notices';
import { AppointmentViews } from './appointment-views.service';

const HOLD_SWEEP_INTERVAL_MS = 30_000;
const SWEEP_BATCH = 200;
/** Ventana de búsqueda del recordatorio (el cron corre cada 5 min). */
const REMINDER_WINDOW_MINUTES = 10;

/**
 * Tareas programadas (node-cron vía @nestjs/schedule):
 * - Expira turnos CREATED cuyo bloqueo de 5 min venció (el motor ya los ignora; esto persiste el estado).
 * - Envía el recordatorio 24 h antes, sólo si el turno se creó con más de 24 h de anticipación.
 */
@Injectable()
export class SchedulingJobs {
  private readonly logger = new Logger(SchedulingJobs.name);

  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly views: AppointmentViews,
    private readonly notices: AppointmentNotices,
    private readonly policy: BookingPolicy,
    private readonly clock: Clock,
  ) {}

  @Interval(HOLD_SWEEP_INTERVAL_MS)
  async expireHolds(): Promise<number> {
    const now = this.clock.now();
    const pending = await this.appointments.findWithElapsedHold(now, SWEEP_BATCH);
    let expired = 0;
    for (const appointment of pending) {
      if (appointment.expireIfHoldElapsed(now)) {
        await this.appointments.save(appointment);
        expired++;
      }
    }
    if (expired) this.logger.log(`${expired} reserva(s) temporal(es) expirada(s)`);
    return expired;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendReminders(): Promise<number> {
    const now = this.clock.now();
    const hours = this.policy.reminderHoursBefore;
    const from = new Date(now.getTime() + hours * 3_600_000);
    const to = new Date(from.getTime() + REMINDER_WINDOW_MINUTES * 60_000);
    const due = await this.appointments.findDueForReminder(from, to, hours);
    for (const appointment of due) {
      await this.notices.reminder(await this.views.get(appointment.id));
      appointment.markReminderSent(now);
      await this.appointments.save(appointment);
    }
    return due.length;
  }
}
