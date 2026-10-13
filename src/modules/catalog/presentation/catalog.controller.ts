import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/infrastructure/auth/auth.decorators';
import { CatalogQueryService } from '../application/catalog-query.service';
import { ServiceView, TreatmentView } from '../application/catalog.views';
import { ManageCategoriesUseCase } from '../application/manage-categories.use-case';
import { Category } from '../domain/catalog';
import { ServiceQueryDto } from './dto/catalog.dto';

/** Catálogo público: se consulta sin iniciar sesión. */
@ApiTags('Catálogo público')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly queries: CatalogQueryService,
    private readonly categories: ManageCategoriesUseCase,
  ) {}

  @Get('categories')
  listCategories(): Promise<Category[]> {
    return this.categories.list(false);
  }

  @Get('services')
  listServices(@Query() query: ServiceQueryDto): Promise<ServiceView[]> {
    return this.queries.listServices({ categoryId: query.categoryId, search: query.search });
  }

  @Get('services/:id')
  getService(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceView> {
    return this.queries.getService(id, { publicOnly: true });
  }

  @Get('treatments/:id')
  getTreatment(@Param('id', ParseUUIDPipe) id: string): Promise<TreatmentView> {
    return this.queries.getTreatment(id, { publicOnly: true });
  }
}
