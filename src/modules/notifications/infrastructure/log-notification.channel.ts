import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, OutgoingMessage } from '../domain/notification-channel';

/** Canal de desarrollo: escribe los mensajes en el log en lugar de enviarlos. */
@Injectable()
export class LogNotificationChannel extends NotificationChannel {
  private readonly logger = new Logger('WhatsApp(simulado)');

  async send(message: OutgoingMessage): Promise<void> {
    this.logger.log(`→ ${message.to}: ${message.text}`);
  }
}
