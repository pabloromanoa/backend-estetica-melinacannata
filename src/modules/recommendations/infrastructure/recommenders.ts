import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config';
import { Recommender, RecommenderInput, RecommenderOutput } from '../domain/recommendation';
import { recommendByRules } from '../domain/rule-based-scoring';

interface LayaResponse {
  option_id: string;
  option_type: 'SERVICE' | 'TREATMENT';
  confidence: number;
}

/**
 * Cliente HTTP del microservicio Python/FastAPI que ejecuta Laya (`laya-service/`).
 * El servicio NO se expone a Internet: sólo lo consume este backend.
 */
@Injectable()
export class LayaHttpClient {
  constructor(private readonly config: AppConfig) {}

  get isConfigured(): boolean {
    return this.config.laya.url.length > 0;
  }

  async recommend(input: RecommenderInput): Promise<RecommenderOutput> {
    const { url, timeoutMs } = this.config.laya;
    const response = await fetch(`${url.replace(/\/$/, '')}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        state: { answers: input.answers, history: input.history },
        options: input.options.map((o) => ({
          id: o.id,
          type: o.type,
          tags: o.tags,
          duration_minutes: o.durationMinutes,
        })),
      }),
    });
    if (!response.ok) throw new Error(`Laya respondió ${response.status}`);
    const body = (await response.json()) as LayaResponse;
    return {
      optionId: body.option_id,
      type: body.option_type,
      confidence: body.confidence,
      source: 'LAYA',
    };
  }
}

/**
 * Adaptador híbrido (patrón Composite): intenta Laya y, si no está configurado, falla, tarda o
 * devuelve una opción fuera del catálogo, usa las reglas expertas.
 * Laya nunca puede "inventar" un servicio: se valida contra el conjunto finito enviado.
 */
@Injectable()
export class HybridRecommender extends Recommender {
  private readonly logger = new Logger(HybridRecommender.name);

  constructor(private readonly laya: LayaHttpClient) {
    super();
  }

  async recommend(input: RecommenderInput): Promise<RecommenderOutput> {
    if (this.laya.isConfigured) {
      try {
        const result = await this.laya.recommend(input);
        const valid = input.options.some((o) => o.id === result.optionId && o.type === result.type);
        if (valid && result.confidence >= 0 && result.confidence <= 1) return result;
        this.logger.warn('Laya devolvió una opción fuera del catálogo; se usan reglas');
      } catch (error) {
        this.logger.warn(`Laya no disponible (${String(error)}); se usan reglas`);
      }
    }
    return recommendByRules(input);
  }
}
