import { Recommendation, RecommendationOption } from './recommendation';
import { invalidAnswers } from './questionnaire';
import { recommendByRules } from './rule-based-scoring';

const options: RecommendationOption[] = [
  { id: 'masaje', type: 'SERVICE', name: 'Masaje', tags: ['relajacion'], durationMinutes: 60 },
  { id: 'limpieza', type: 'SERVICE', name: 'Limpieza', tags: ['limpieza'], durationMinutes: 60 },
  { id: 'spa', type: 'SERVICE', name: 'Spa largo', tags: ['relajacion'], durationMinutes: 120 },
  {
    id: 'facial',
    type: 'TREATMENT',
    name: 'Facial integral',
    tags: ['limpieza', 'apariencia'],
    durationMinutes: 180,
  },
];

describe('Recomendador por reglas', () => {
  it('elige la opción que coincide con el objetivo y entra en el tiempo disponible', () => {
    const result = recommendByRules({
      answers: { objective: 'relajacion', time: '60', scope: 'puntual' },
      history: [],
      options,
    });
    expect(result).toMatchObject({ optionId: 'masaje', type: 'SERVICE', source: 'RULES' });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('prefiere tratamientos cuando se busca algo completo', () => {
    const result = recommendByRules({
      answers: { objective: 'limpieza', time: 'any', scope: 'completo' },
      history: [],
      options,
    });
    expect(result.optionId).toBe('facial');
  });

  it('nunca inventa opciones: siempre devuelve una del catálogo', () => {
    const result = recommendByRules({
      answers: { objective: 'no_seguro', time: '30', scope: 'no_seguro' },
      history: [],
      options,
    });
    expect(options.map((o) => o.id)).toContain(result.optionId);
    expect(() => recommendByRules({ answers: {}, history: [], options: [] })).toThrow();
  });

  it('valida que el cuestionario esté completo y con opciones válidas', () => {
    expect(invalidAnswers({ objective: 'relajacion', time: '60', scope: 'puntual' })).toEqual([]);
    expect(invalidAnswers({ objective: 'otra', time: '60' })).toEqual(['objective', 'scope']);
  });
});

describe('Recommendation (registro auditable)', () => {
  const rec = () =>
    Recommendation.record({
      id: 'r1',
      clientId: null,
      answers: { objective: 'relajacion' },
      type: 'SERVICE',
      serviceId: 'masaje',
      treatmentId: null,
      confidence: 0.8,
      source: 'RULES',
      createdAt: new Date(),
    });

  it('se decide una sola vez', () => {
    const r = rec();
    r.decide('DISCARDED');
    expect(() => r.decide('ACCEPTED')).toThrow();
  });

  it('marcar como reservada la acepta si estaba pendiente', () => {
    const r = rec();
    r.markBooked();
    expect(r.snapshot()).toMatchObject({ outcome: 'ACCEPTED', ledToBooking: true });
  });
});
