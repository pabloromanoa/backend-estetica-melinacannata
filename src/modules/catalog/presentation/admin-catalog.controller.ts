import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '../../../shared/domain/role';
import { Roles } from '../../../shared/infrastructure/auth/auth.decorators';
import { CatalogQueryService } from '../application/catalog-query.service';
import { ServiceView, TreatmentView } from '../application/catalog.views';
import { ManageCategoriesUseCase } from '../application/manage-categories.use-case';
import { ManageServicesUseCase } from '../application/manage-services.use-case';
import { ManageTreatmentsUseCase } from '../application/manage-treatments.use-case';
import { Category } from '../domain/catalog';
import { CategoryDto, ServiceDto, TreatmentDto } from './dto/catalog.dto';

@ApiTags('Admin · Servicios')
@Roles(Role.ADMIN)
@Controller('admin/services')
export class AdminServicesController {
  constructor(
    private readonly queries: CatalogQueryService,
    private readonly manage: ManageServicesUseCase,
  ) {}

  @Get()
  list(): Promise<ServiceView[]> {
    return this.queries.listServices({ includeInactive: true });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceView> {
    return this.queries.getService(id, { publicOnly: false });
  }

  @Post()
  create(@Body() dto: ServiceDto): Promise<ServiceView> {
    return this.manage.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ServiceDto): Promise<ServiceView> {
    return this.manage.update(id, dto);
  }
}

@ApiTags('Admin · Categorías')
@Roles(Role.ADMIN)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly manage: ManageCategoriesUseCase) {}

  @Get()
  list(): Promise<Category[]> {
    return this.manage.list(true);
  }

  @Post()
  create(@Body() dto: CategoryDto): Promise<Category> {
    return this.manage.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CategoryDto): Promise<Category> {
    return this.manage.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.manage.delete(id);
  }
}

@ApiTags('Admin · Tratamientos')
@Roles(Role.ADMIN)
@Controller('admin/treatments')
export class AdminTreatmentsController {
  constructor(
    private readonly queries: CatalogQueryService,
    private readonly manage: ManageTreatmentsUseCase,
  ) {}

  @Get()
  list(): Promise<TreatmentView[]> {
    return this.queries.listTreatments(true);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<TreatmentView> {
    return this.queries.getTreatment(id, { publicOnly: false });
  }

  @Post()
  create(@Body() dto: TreatmentDto): Promise<TreatmentView> {
    return this.manage.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TreatmentDto,
  ): Promise<TreatmentView> {
    return this.manage.update(id, dto);
  }
}
