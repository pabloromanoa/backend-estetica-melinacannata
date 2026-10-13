import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/domain/clock';
import {
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
} from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { Actor, isAdmin } from '../../../shared/domain/role';
import { CatalogQueryService } from '../../catalog/application/catalog-query.service';
import { ServiceView, TreatmentView } from '../../catalog/application/catalog.views';
import { blockMinutes } from '../../catalog/domain/catalog';
import { Answers, invalidAnswers, Question, QUESTIONNAIRE } from '../domain/questionnaire';
import {
  ClientHistoryReader,
  Recommendation,
  RecommendationOption,
  RecommendationOutcome,
  RecommendationRepository,
  RecommendationSource,
  Recommender,
  OptionType,
} from '../domain/recommendation';

export interface RecommendationView {
  id: string;
  createdAt: Date;
  answers: Answers;
  type: OptionType;
  confidence: number;
  source: RecommendationSource;
  service: ServiceView | null;
  treatment: TreatmentView | null;
  outcome: RecommendationOutcome;
  ledToBooking: boolean;
}

/** Recomendación inteligente de servicios/tratamientos. Siempre sugiere, nunca reserva sola. */
@Injectable()
export class RecommendationUseCases {
  constructor(
    private readonly recommender: Recommender,
    private readonly recommendations: RecommendationRepository,
    private readonly history: ClientHistoryReader,
    private readonly catalog: CatalogQueryService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  questionnaire(): readonly Question[] {
    return QUESTIONNAIRE;
  }

  async create(answers: Answers, actor: Actor | null): Promise<RecommendationView> {
    const invalid = invalidAnswers(answers);
    if (invalid.length) throw new InvalidInputError('Respuestas incompletas o inválidas', invalid);

    const clientId = actor?.clientId ?? null;
    const [options, history] = await Promise.all([
      this.options(),
      clientId ? this.history.serviceIdsDoneBy(clientId) : Promise.resolve([]),
    ]);
    const result = await this.recommender.recommend({ answers, history, options });

    const recommendation = Recommendation.record({
      id: this.ids.next(),
      clientId,
      answers: { ...answers },
      type: result.type,
      serviceId: result.type === 'SERVICE' ? result.optionId : null,
      treatmentId: result.type === 'TREATMENT' ? result.optionId : null,
      confidence: result.confidence,
      source: result.source,
      createdAt: this.clock.now(),
    });
    await this.recommendations.save(recommendation);
    return this.toView(recommendation);
  }

  async decide(
    id: string,
    outcome: 'ACCEPTED' | 'DISCARDED',
    actor: Actor | null,
  ): Promise<RecommendationView> {
    const recommendation = await this.require(id);
    // Las recomendaciones de un cliente registrado sólo las decide él (o un admin).
    if (recommendation.clientId && recommendation.clientId !== actor?.clientId && !isAdmin(actor)) {
      throw new ForbiddenError();
    }
    recommendation.decide(outcome);
    await this.recommendations.save(recommendation);
    return this.toView(recommendation);
  }

  async listForClient(clientId: string): Promise<RecommendationView[]> {
    const list = await this.recommendations.listByClient(clientId);
    return Promise.all(list.map((r) => this.toView(r)));
  }

  /** Lo invoca el módulo de turnos cuando se reserva a partir de una recomendación. */
  async markBooked(id: string): Promise<void> {
    const recommendation = await this.recommendations.findById(id);
    if (!recommendation) return;
    recommendation.markBooked();
    await this.recommendations.save(recommendation);
  }

  private async options(): Promise<RecommendationOption[]> {
    const [services, treatments] = await Promise.all([
      this.catalog.listServices(),
      this.catalog.listTreatments(false),
    ]);
    return [
      ...services.map((s) => ({
        id: s.id,
        type: 'SERVICE' as const,
        name: s.name,
        tags: s.recommendationTags,
        durationMinutes: s.durationMinutes,
      })),
      ...treatments
        .filter((t) => t.services.length > 0)
        .map((t) => ({
          id: t.id,
          type: 'TREATMENT' as const,
          name: t.name,
          tags: t.recommendationTags,
          durationMinutes: t.services.reduce((sum, s) => sum + blockMinutes(s), 0),
        })),
    ];
  }

  private async require(id: string): Promise<Recommendation> {
    const recommendation = await this.recommendations.findById(id);
    if (!recommendation) throw new NotFoundError('Recomendación', id);
    return recommendation;
  }

  private async toView(recommendation: Recommendation): Promise<RecommendationView> {
    const r = recommendation.snapshot();
    const [service, treatment] = await Promise.all([
      r.serviceId
        ? this.catalog.getService(r.serviceId, { publicOnly: false }).catch(() => null)
        : null,
      r.treatmentId
        ? this.catalog.getTreatment(r.treatmentId, { publicOnly: false }).catch(() => null)
        : null,
    ]);
    return {
      id: r.id,
      createdAt: r.createdAt,
      answers: r.answers,
      type: r.type,
      confidence: r.confidence,
      source: r.source,
      service,
      treatment,
      outcome: r.outcome,
      ledToBooking: r.ledToBooking,
    };
  }
}
