import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { AppointmentReadModel } from './appointment-read-model';
import { AppointmentView } from './appointment.views';

/** Atajo para obtener la vista de un turno que debe existir. */
@Injectable()
export class AppointmentViews {
  constructor(private readonly readModel: AppointmentReadModel) {}

  async get(id: string): Promise<AppointmentView> {
    const view = await this.readModel.getById(id);
    if (!view) throw new NotFoundError('Turno', id);
    return view;
  }
}
