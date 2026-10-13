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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '../../../shared/domain/role';
import { Roles } from '../../../shared/infrastructure/auth/auth.decorators';
import { AvailabilityUseCases } from '../application/availability.use-cases';
import { ProviderProfileUseCases, ProviderView } from '../application/provider-profile.use-cases';
import { AvailabilityException, WeeklyAvailabilityRange } from '../domain/availability';
import {
  BankDetailsDto,
  CreateProviderDto,
  DateRangeQueryDto,
  ExceptionDto,
  ReplaceWeeklyDto,
  SetServicesDto,
  UpdateProviderDto,
} from './dto/staff.dto';
import { TargetProviderId } from './target-provider.decorator';

/**
 * Endpoints de un prestador. Se reutilizan (herencia) en `/staff/me` y en
 * `/admin/providers/:providerId`, cambiando sólo cómo se resuelve el prestador y el rol exigido.
 */
abstract class ProviderResourceController {
  protected constructor(
    protected readonly profiles: ProviderProfileUseCases,
    protected readonly availability: AvailabilityUseCases,
  ) {}

  @Put('bank-details')
  updateBankDetails(
    @TargetProviderId() id: string,
    @Body() dto: BankDetailsDto,
  ): Promise<ProviderView> {
    return this.profiles.updateBankDetails(id, dto);
  }

  @Put('services')
  setServices(@TargetProviderId() id: string, @Body() dto: SetServicesDto): Promise<ProviderView> {
    return this.profiles.setServices(id, dto.serviceIds);
  }

  @Get('weekly-availability')
  getWeekly(@TargetProviderId() id: string): Promise<WeeklyAvailabilityRange[]> {
    return this.availability.getWeekly(id);
  }

  @Put('weekly-availability')
  replaceWeekly(
    @TargetProviderId() id: string,
    @Body() dto: ReplaceWeeklyDto,
  ): Promise<WeeklyAvailabilityRange[]> {
    return this.availability.replaceWeekly(id, dto.ranges);
  }

  @Get('exceptions')
  listExceptions(
    @TargetProviderId() id: string,
    @Query() query: DateRangeQueryDto,
  ): Promise<AvailabilityException[]> {
    return this.availability.listExceptions(id, query.from, query.to);
  }

  @Post('exceptions')
  addException(
    @TargetProviderId() id: string,
    @Body() dto: ExceptionDto,
  ): Promise<AvailabilityException> {
    return this.availability.addException(id, dto);
  }

  @Delete('exceptions/:exceptionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeException(
    @TargetProviderId() id: string,
    @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
  ): Promise<void> {
    return this.availability.removeException(id, exceptionId);
  }
}

@ApiTags('Prestador (yo)')
@Roles(Role.PROVIDER)
@Controller('staff/me')
export class StaffMeController extends ProviderResourceController {
  constructor(profiles: ProviderProfileUseCases, availability: AvailabilityUseCases) {
    super(profiles, availability);
  }

  @Get()
  me(@TargetProviderId() id: string): Promise<ProviderView> {
    return this.profiles.get(id);
  }
}

@ApiTags('Admin · Prestadores')
@Roles(Role.ADMIN)
@Controller('admin/providers/:providerId')
export class AdminProviderResourceController extends ProviderResourceController {
  constructor(profiles: ProviderProfileUseCases, availability: AvailabilityUseCases) {
    super(profiles, availability);
  }

  @Get()
  get(@Param('providerId', ParseUUIDPipe) id: string): Promise<ProviderView> {
    return this.profiles.get(id);
  }

  @Put()
  update(
    @Param('providerId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
  ): Promise<ProviderView> {
    return this.profiles.update(id, dto);
  }
}

@ApiTags('Admin · Prestadores')
@Roles(Role.ADMIN)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly profiles: ProviderProfileUseCases) {}

  @Get()
  list(): Promise<ProviderView[]> {
    return this.profiles.list(true);
  }

  @Post()
  create(@Body() dto: CreateProviderDto): Promise<ProviderView> {
    return this.profiles.create(dto);
  }
}
