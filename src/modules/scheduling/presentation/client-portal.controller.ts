import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ForbiddenError } from '../../../shared/domain/domain-error';
import { Actor, Role } from '../../../shared/domain/role';
import { CurrentActor, Roles } from '../../../shared/infrastructure/auth/auth.decorators';
import {
  RecommendationUseCases,
  RecommendationView,
} from '../../recommendations/application/recommendation.use-cases';
import { AppointmentQueries } from '../application/appointment-queries.service';

/** Portal del cliente registrado. */
@ApiTags('Portal del cliente')
@Roles(Role.CLIENT)
@Controller('me')
export class ClientPortalController {
  constructor(
    private readonly queries: AppointmentQueries,
    private readonly recommendations: RecommendationUseCases,
  ) {}

  @Get('appointments')
  appointments(@CurrentActor() actor: Actor) {
    return this.queries.forClient(this.clientId(actor));
  }

  @Get('recommendations')
  history(@CurrentActor() actor: Actor): Promise<RecommendationView[]> {
    return this.recommendations.listForClient(this.clientId(actor));
  }

  private clientId(actor: Actor): string {
    if (!actor.clientId) throw new ForbiddenError('Tu usuario no tiene perfil de cliente');
    return actor.clientId;
  }
}
