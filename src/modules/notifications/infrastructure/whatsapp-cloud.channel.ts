import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config';
import {
  NotificationChannel,
  OutgoingMessage,
  toWhatsAppNumber,
} from '../domain/notification-channel';

/**
 * Adaptador para WhatsApp Cloud API (Meta).
 * IMPORTANTE: los mensajes iniciados por la empresa fuera de la ventana de 24 h requieren
 * plantillas aprobadas por Meta. Este adaptador envía texto libre y sirve como punto de partida:
 * al definir el proveedor final se reemplaza por envío de plantillas.
 */
@Injectable()
export class WhatsAppCloudChannel extends NotificationChannel {
  constructor(private readonly config: AppConfig) {
    super();
  }

  async send(message: OutgoingMessage): Promise<void> {
    const { whatsappApiUrl, whatsappToken, whatsappPhoneNumberId } = this.config.notifications;
    const response = await fetch(`${whatsappApiUrl}/${whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toWhatsAppNumber(message.to),
        type: 'text',
        text: { body: message.text },
      }),
    });
    if (!response.ok) {
      throw new Error(`WhatsApp API respondió ${response.status}`);
    }
  }
}
