import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { AvailabilityUseCases } from './application/availability.use-cases';
import { ProviderProfileUseCases } from './application/provider-profile.use-cases';
import { AvailabilityRepository, ProviderRepository } from './domain/staff.repositories';
import {
  AvailabilityExceptionOrmEntity,
  ProviderOrmEntity,
  WeeklyAvailabilityOrmEntity,
} from './infrastructure/staff.orm-entities';
import { TypeOrmAvailabilityRepository } from './infrastructure/typeorm-availability.repository';
import { TypeOrmProviderRepository } from './infrastructure/typeorm-provider.repository';
import {
  AdminProviderResourceController,
  AdminProvidersController,
  StaffMeController,
} from './presentation/provider-resource.controllers';

/** Personal: perfiles de prestadores, datos bancarios, servicios habilitados y disponibilidad. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderOrmEntity,
      WeeklyAvailabilityOrmEntity,
      AvailabilityExceptionOrmEntity,
    ]),
    IdentityModule,
    CatalogModule,
  ],
  controllers: [StaffMeController, AdminProvidersController, AdminProviderResourceController],
  providers: [
    { provide: ProviderRepository, useClass: TypeOrmProviderRepository },
    { provide: AvailabilityRepository, useClass: TypeOrmAvailabilityRepository },
    ProviderProfileUseCases,
    AvailabilityUseCases,
  ],
  exports: [ProviderRepository, AvailabilityRepository],
})
export class StaffModule {}
