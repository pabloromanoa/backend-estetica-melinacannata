import { Client } from './client';

export abstract class ClientRepository {
  abstract findById(id: string): Promise<Client | null>;
  abstract findByDni(dni: string): Promise<Client | null>;
  abstract findByUserId(userId: string): Promise<Client | null>;
  abstract search(term: string, limit: number): Promise<Client[]>;
  abstract save(client: Client): Promise<void>;
  abstract countAppointments(clientId: string): Promise<number>;
}
