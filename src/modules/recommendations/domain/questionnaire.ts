/**
 * Cuestionario del recomendador. ⚠️ ILUSTRATIVO: las preguntas definitivas deben validarse
 * con la dueña/personal (ver docs/requerimientos.md). Está centralizado acá para que
 * cambiarlo no requiera tocar el resto del código.
 */
export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export const QUESTIONNAIRE: readonly Question[] = [
  {
    id: 'objective',
    text: '¿Cuál es tu principal objetivo?',
    options: [
      { value: 'hidratacion', label: 'Hidratación' },
      { value: 'relajacion', label: 'Relajación' },
      { value: 'limpieza', label: 'Limpieza' },
      { value: 'tonificacion', label: 'Tonificación' },
      { value: 'apariencia', label: 'Mejorar apariencia general' },
      { value: 'no_seguro', label: 'No estoy seguro/a' },
    ],
  },
  {
    id: 'time',
    text: '¿Cuánto tiempo querés dedicar al tratamiento?',
    options: [
      { value: '30', label: 'Hasta 30 minutos' },
      { value: '60', label: 'Hasta 60 minutos' },
      { value: '90', label: 'Hasta 90 minutos' },
      { value: 'any', label: 'Sin preferencia' },
    ],
  },
  {
    id: 'scope',
    text: '¿Buscás algo puntual o un tratamiento más completo?',
    options: [
      { value: 'puntual', label: 'Algo puntual' },
      { value: 'completo', label: 'Tratamiento completo' },
      { value: 'no_seguro', label: 'No estoy seguro/a' },
    ],
  },
];

export type Answers = Record<string, string>;

/** Verifica que estén todas las preguntas y que cada respuesta sea una opción válida. */
export function invalidAnswers(answers: Answers): string[] {
  return QUESTIONNAIRE.filter((q) => !q.options.some((o) => o.value === answers[q.id])).map(
    (q) => q.id,
  );
}
