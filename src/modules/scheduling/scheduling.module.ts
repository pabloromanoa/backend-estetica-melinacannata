import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app-config';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { StaffModule } from '../staff/staff.module';
import { AppointmentLocator } from './application/appointment-locator.service';
import { AppointmentNotices } from './application/appointment-notices';
import { AppointmentQueries } from './application/appointment-queries.service';
import { AppointmentReadModel } from './application/appointment-read-model';
import { AppointmentViews } from './application/appointment-views.service';
import { AvailabilityService } from './application/availability.service';
import { BookAppointmentUseCase } from './application/book-appointment.use-case';
import { CancelAppointmentUseCase } from './application/cancel-appointment.use-case';
import { DayAgendaQuery } from './application/day-agenda.query';
import { FinishAppointmentUseCase } from './application/finish-appointment.use-case';
import { RescheduleAppointmentUseCase } from './application/reschedule-appointment.use-case';
import { ReviewDepositUseCase } from './application/review-deposit.use-case';
import { SchedulingJobs } from './application/scheduling.jobs';
import { UploadReceiptUseCase } from './application/upload-receipt.use-case';
import { ReceiptPolicy } from './domain/receipt-file';
import {
  AppointmentCodeGenerator,
  AppointmentRepository,
  DepositRepository,
  GuestTokenService,
  RandomPicker,
  ReceiptStorage,
} from './domain/scheduling.ports';
import {
  CryptoRandomPicker,
  LocalReceiptStorage,
  RandomAppointmentCodeGenerator,
  Sha256GuestTokenService,
} from './infrastructure/adapters';
import { TypeOrmAppointmentReadModel } from './infrastructure/appointment-read-model.typeorm';
import { AppointmentOrmEntity, DepositOrmEntity } from './infrastructure/scheduling.orm-entities';
import {
  TypeOrmAppointmentRepository,
  TypeOrmDepositRepository,
} from './infrastructure/typeorm-scheduling.repositories';
import {
  AppointmentsController,
  AvailabilityController,
} from './presentation/appointments.controller';
import { ClientPortalController } from './presentation/client-portal.controller';
import { GuestAppointmentsController } from './presentation/guest-appointments.controller';
import {
  AdminClientsController,
  AgendaController,
  DepositsController,
} from './presentation/staff.controllers';

/**
 * Agenda y turnos: motor de disponibilidad, reservas con bloqueo temporal, señas con
 * comprobante, cancelaciones, reprogramaciones, agenda diaria y tareas programadas.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentOrmEntity, DepositOrmEntity]),
    IdentityModule,
    CatalogModule,
    StaffModule,
    RecommendationsModule,
    NotificationsModule,
  ],
  controllers: [
    AvailabilityController,
    AppointmentsController,
    GuestAppointmentsController,
    ClientPortalController,
    DepositsController,
    AgendaController,
    AdminClientsController,
  ],
  providers: [
    { provide: AppointmentRepository, useClass: TypeOrmAppointmentRepository },
    { provide: DepositRepository, useClass: TypeOrmDepositRepository },
    { provide: AppointmentReadModel, useClass: TypeOrmAppointmentReadModel },
    { provide: ReceiptStorage, useClass: LocalReceiptStorage },
    { provide: RandomPicker, useClass: CryptoRandomPicker },
    { provide: AppointmentCodeGenerator, useClass: RandomAppointmentCodeGenerator },
    { provide: GuestTokenService, useClass: Sha256GuestTokenService },
    {
      provide: ReceiptPolicy,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new ReceiptPolicy(config.receipts.maxBytes),
    },
    AvailabilityService,
    AppointmentLocator,
    AppointmentViews,
    AppointmentNotices,
    AppointmentQueries,
    BookAppointmentUseCase,
    UploadReceiptUseCase,
    ReviewDepositUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
    FinishAppointmentUseCase,
    DayAgendaQuery,
    SchedulingJobs,
  ],
  exports: [AppointmentReadModel, AvailabilityService],
})
export class SchedulingModule {}
