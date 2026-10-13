import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Actor } from '../../../shared/domain/role';
import {
  CurrentActor,
  OptionalAuth,
  Public,
} from '../../../shared/infrastructure/auth/auth.decorators';
import {
  RecommendationUseCases,
  RecommendationView,
} from '../application/recommendation.use-cases';
import { Question } from '../domain/questionnaire';
import { CreateRecommendationDto, RecommendationOutcomeDto } from './dto/recommendation.dto';

@ApiTags('Recomendaciones (Laya)')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly useCases: RecommendationUseCases) {}

  @Public()
  @Get('questionnaire')
  questionnaire(): readonly Question[] {
    return this.useCases.questionnaire();
  }

  @OptionalAuth()
  @Post()
  create(
    @Body() dto: CreateRecommendationDto,
    @CurrentActor() actor: Actor | null,
  ): Promise<RecommendationView> {
    return this.useCases.create(dto.answers, actor);
  }

  @OptionalAuth()
  @Post(':id/outcome')
  @HttpCode(HttpStatus.OK)
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecommendationOutcomeDto,
    @CurrentActor() actor: Actor | null,
  ): Promise<RecommendationView> {
    return this.useCases.decide(id, dto.outcome, actor);
  }
}
