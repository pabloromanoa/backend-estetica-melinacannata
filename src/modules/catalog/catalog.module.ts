import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogQueryService } from './application/catalog-query.service';
import { ManageCategoriesUseCase } from './application/manage-categories.use-case';
import { ManageServicesUseCase } from './application/manage-services.use-case';
import { ManageTreatmentsUseCase } from './application/manage-treatments.use-case';
import {
  CategoryRepository,
  ProviderAssignmentRepository,
  ProviderDirectory,
  ServiceRepository,
  TreatmentRepository,
} from './domain/catalog.repositories';
import {
  CategoryOrmEntity,
  ProviderServiceOrmEntity,
  ServiceDateOrmEntity,
  ServiceOrmEntity,
  TreatmentOrmEntity,
  TreatmentServiceOrmEntity,
} from './infrastructure/catalog.orm-entities';
import {
  TypeOrmCategoryRepository,
  TypeOrmProviderAssignmentRepository,
  TypeOrmProviderDirectory,
  TypeOrmServiceRepository,
  TypeOrmTreatmentRepository,
} from './infrastructure/typeorm-catalog.repositories';
import {
  AdminCategoriesController,
  AdminServicesController,
  AdminTreatmentsController,
} from './presentation/admin-catalog.controller';
import { CatalogController } from './presentation/catalog.controller';

/** Catálogo: servicios, categorías (M:N), tratamientos y prestadores habilitados. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryOrmEntity,
      ServiceOrmEntity,
      ServiceDateOrmEntity,
      ProviderServiceOrmEntity,
      TreatmentOrmEntity,
      TreatmentServiceOrmEntity,
    ]),
  ],
  controllers: [
    CatalogController,
    AdminServicesController,
    AdminCategoriesController,
    AdminTreatmentsController,
  ],
  providers: [
    { provide: ServiceRepository, useClass: TypeOrmServiceRepository },
    { provide: CategoryRepository, useClass: TypeOrmCategoryRepository },
    { provide: TreatmentRepository, useClass: TypeOrmTreatmentRepository },
    { provide: ProviderAssignmentRepository, useClass: TypeOrmProviderAssignmentRepository },
    { provide: ProviderDirectory, useClass: TypeOrmProviderDirectory },
    CatalogQueryService,
    ManageServicesUseCase,
    ManageCategoriesUseCase,
    ManageTreatmentsUseCase,
  ],
  exports: [
    ServiceRepository,
    TreatmentRepository,
    ProviderAssignmentRepository,
    CatalogQueryService,
  ],
})
export class CatalogModule {}
