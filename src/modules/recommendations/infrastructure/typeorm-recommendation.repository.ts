import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import {
  ClientHistoryReader,
  Recommendation,
  RecommendationRepository,
} from '../domain/recommendation';
import { RecommendationOrmEntity } from './recommendation.orm-entity';

@Injectable()
export class TypeOrmRecommendationRepository extends RecommendationRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(RecommendationOrmEntity);
  }

  async findById(id: string): Promise<Recommendation | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async listByClient(clientId: string): Promise<Recommendation[]> {
    const rows = await this.repo.find({ where: { clientId }, order: { createdAt: 'DESC' } });
    return rows.map(toDomain);
  }

  async save(recommendation: Recommendation): Promise<void> {
    await this.repo.save(this.repo.create({ ...recommendation.snapshot() }));
  }
}

function toDomain(row: RecommendationOrmEntity): Recommendation {
  return Recommendation.restore({
    id: row.id,
    clientId: row.clientId,
    answers: row.answers,
    type: row.type,
    serviceId: row.serviceId,
    treatmentId: row.treatmentId,
    confidence: row.confidence,
    source: row.source,
    outcome: row.outcome,
    ledToBooking: row.ledToBooking,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class SqlClientHistoryReader extends ClientHistoryReader {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  async serviceIdsDoneBy(clientId: string): Promise<string[]> {
    const rows = await this.ctx.manager.query<{ service_id: string }[]>(
      `SELECT DISTINCT service_id FROM appointments
        WHERE client_id = ? AND status IN ('DEPOSIT_PAID', 'FINISHED')`,
      [clientId],
    );
    return rows.map((r) => r.service_id);
  }
}
