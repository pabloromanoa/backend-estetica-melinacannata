import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';
import { AppointmentNotifier } from './application/appointment-notifier';
import { NotificationChannel } from './domain/notification-channel';
import { LogNotificationChannel } from './infrastructure/log-notification.channel';
import { WhatsAppCloudChannel } from './infrastructure/whatsapp-cloud.channel';

/** Notificaciones por WhatsApp, con el proveedor elegido por `NOTIFICATIONS_PROVIDER`. */
@Module({
  providers: [
    {
      provide: NotificationChannel,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        config.notifications.provider === 'whatsapp-cloud'
          ? new WhatsAppCloudChannel(config)
          : new LogNotificationChannel(),
    },
    AppointmentNotifier,
  ],
  exports: [AppointmentNotifier],
})
export class NotificationsModule {}
