import { AppConfig } from '../../../config/app-config';
import { RecommenderInput } from '../domain/recommendation';
import { HybridRecommender, LayaHttpClient } from './recommenders';

const input: RecommenderInput = {
  answers: { objective: 'relajacion', time: '60', scope: 'puntual' },
  history: [],
  options: [
    { id: 'masaje', type: 'SERVICE', name: 'Masaje', tags: ['relajacion'], durationMinutes: 60 },
    { id: 'limpieza', type: 'SERVICE', name: 'Limpieza', tags: ['limpieza'], durationMinutes: 60 },
  ],
};

const layaReturning = (impl: () => Promise<unknown>, configured = true) =>
  Object.assign(Object.create(LayaHttpClient.prototype), {
    config: { laya: { url: configured ? 'http://laya' : '', timeoutMs: 100 } } as AppConfig,
    recommend: jest.fn(impl),
  }) as LayaHttpClient;

describe('HybridRecommender (Laya + reglas)', () => {
  it('usa Laya cuando responde una opción válida del catálogo', async () => {
    const laya = layaReturning(async () => ({
      optionId: 'limpieza',
      type: 'SERVICE',
      confidence: 0.9,
      source: 'LAYA',
    }));
    await expect(new HybridRecommender(laya).recommend(input)).resolves.toMatchObject({
      optionId: 'limpieza',
      source: 'LAYA',
    });
  });

  it('cae a reglas si Laya falla', async () => {
    const laya = layaReturning(async () => {
      throw new Error('timeout');
    });
    await expect(new HybridRecommender(laya).recommend(input)).resolves.toMatchObject({
      optionId: 'masaje',
      source: 'RULES',
    });
  });

  it('cae a reglas si Laya "inventa" una opción fuera del catálogo', async () => {
    const laya = layaReturning(async () => ({
      optionId: 'botox',
      type: 'SERVICE',
      confidence: 0.99,
      source: 'LAYA',
    }));
    await expect(new HybridRecommender(laya).recommend(input)).resolves.toMatchObject({
      source: 'RULES',
    });
  });

  it('no llama a Laya si no está configurado', async () => {
    const laya = layaReturning(async () => ({}), false);
    await new HybridRecommender(laya).recommend(input);
    expect(laya.recommend).not.toHaveBeenCalled();
  });
});
