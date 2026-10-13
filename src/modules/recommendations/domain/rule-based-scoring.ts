import { RecommendationOption, RecommenderInput, RecommenderOutput } from './recommendation';

/**
 * Motor de reglas expertas (fallback cuando Laya no está disponible y base del cold-start).
 * Puntúa cada opción del catálogo según el cuestionario y devuelve la de mayor puntaje con
 * una confianza calculada por softmax. Nunca inventa opciones: sólo elige del conjunto dado.
 */
const objectiveScore = (option: RecommendationOption, objective?: string): number => {
  if (!objective) return 0;
  if (objective === 'no_seguro') return option.tags.includes('apariencia') ? 1 : 0;
  return option.tags.includes(objective) ? 3 : 0;
};

const timeScore = (option: RecommendationOption, time?: string): number => {
  const maxMinutes = Number(time);
  if (!Number.isFinite(maxMinutes)) return 0; // "sin preferencia"
  return option.durationMinutes <= maxMinutes ? 1 : -2;
};

const scopeScore = (option: RecommendationOption, scope?: string): number => {
  if (scope === 'completo' && option.type === 'TREATMENT') return 1.5;
  if (scope === 'puntual' && option.type === 'SERVICE') return 1;
  return 0;
};

/** Pequeño refuerzo a lo que el cliente ya conoce y le gustó. */
const historyScore = (option: RecommendationOption, history: string[]): number =>
  option.type === 'SERVICE' && history.includes(option.id) ? 0.5 : 0;

export function scoreOption(option: RecommendationOption, input: RecommenderInput): number {
  const { objective, time, scope } = input.answers;
  return (
    objectiveScore(option, objective) +
    timeScore(option, time) +
    scopeScore(option, scope) +
    historyScore(option, input.history)
  );
}

export function recommendByRules(input: RecommenderInput): RecommenderOutput {
  if (input.options.length === 0) {
    throw new Error('No hay servicios ni tratamientos activos para recomendar');
  }
  const scored = input.options.map((option) => ({ option, score: scoreOption(option, input) }));
  const max = Math.max(...scored.map((s) => s.score));
  const weights = scored.map((s) => Math.exp(s.score - max));
  const total = weights.reduce((a, b) => a + b, 0);
  const bestIndex = scored.findIndex((s) => s.score === max);
  const best = scored[bestIndex].option;
  return {
    optionId: best.id,
    type: best.type,
    confidence: Math.round((weights[bestIndex] / total) * 1000) / 1000,
    source: 'RULES',
  };
}
