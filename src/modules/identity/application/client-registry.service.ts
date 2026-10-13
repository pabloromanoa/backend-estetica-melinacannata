import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { Client, ClientContactData, normalizeDni } from '../domain/client';
import { ClientRepository } from '../domain/client.repository';

/**
 * Resuelve el `Client` de una reserva. Los invitados se identifican por DNI: si ya reservaron
 * antes se reutiliza su registro (actualizando el contacto), si no se crea uno nuevo.
 */
@Injectable()
export class ClientRegistry {
  constructor(
    private readonly clients: ClientRepository,
    private readonly ids: IdGenerator,
  ) {}

  async findOrCreateGuest(contact: ClientContactData): Promise<Client> {
    const dni = normalizeDni(contact.dni);
    const existing = await this.clients.findByDni(dni);
    if (existing) {
      // Un cliente con cuenta administra sus propios datos: no los pisamos.
      if (existing.userId) return existing;
      const updated: Client = {
        ...existing,
        firstName: contact.firstName.trim(),
        lastName: contact.lastName.trim(),
        phone: contact.phone.trim(),
        email: contact.email?.trim().toLowerCase() || existing.email,
      };
      await this.clients.save(updated);
      return updated;
    }
    const client: Client = {
      id: this.ids.next(),
      userId: null,
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim(),
      dni,
      phone: contact.phone.trim(),
      email: contact.email?.trim().toLowerCase() || null,
    };
    await this.clients.save(client);
    return client;
  }

  async getById(clientId: string): Promise<Client> {
    const client = await this.clients.findById(clientId);
    if (!client) throw new NotFoundError('Cliente', clientId);
    return client;
  }

  search(term: string, limit = 20): Promise<Client[]> {
    return this.clients.search(term.trim(), limit);
  }
}
