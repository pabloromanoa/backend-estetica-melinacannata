import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { RecommendationUseCases } from './application/recommendation.use-cases';
import {
  ClientHistoryReader,
  RecommendationRepository,
  Recommender,
} from './domain/recommendation';
import { RecommendationOrmEntity } from './infrastructure/recommendation.orm-entity';
import { HybridRecommender, LayaHttpClient } from './infrastructure/recommenders';
import {
  SqlClientHistoryReader,
  TypeOrmRecommendationRepository,
} from './infrastructure/typeorm-recommendation.repository';
import { RecommendationsController } from './presentation/recommendations.controller';

/** Recomendación inteligente (Laya + reglas expertas) y su registro auditable. */
@Module({
  imports: [TypeOrmModule.forFeature([RecommendationOrmEntity]), CatalogModule],
  controllers: [RecommendationsController],
  providers: [
    LayaHttpClient,
    { provide: Recommender, useClass: HybridRecommender },
    { provide: RecommendationRepository, useClass: TypeOrmRecommendationRepository },
    { provide: ClientHistoryReader, useClass: SqlClientHistoryReader },
    RecommendationUseCases,
  ],
  exports: [RecommendationUseCases, RecommendationRepository],
})
export class RecommendationsModule {}
