import { BusinessRuleError } from '../../../shared/domain/domain-error';
import { Answers } from './questionnaire';

export type OptionType = 'SERVICE' | 'TREATMENT';
export type RecommendationSource = 'LAYA' | 'RULES';
export type RecommendationOutcome = 'PENDING' | 'ACCEPTED' | 'DISCARDED';

/** Opción del conjunto FINITO que puede recomendarse (servicio o tratamiento del catálogo). */
export interface RecommendationOption {
  id: string;
  type: OptionType;
  name: string;
  tags: string[];
  durationMinutes: number;
}

export interface RecommenderInput {
  answers: Answers;
  /** Ids de servicios que el cliente ya realizó (vacío para invitados). */
  history: string[];
  options: RecommendationOption[];
}

export interface RecommenderOutput {
  optionId: string;
  type: OptionType;
  confidence: number;
  source: RecommendationSource;
}

/** Puerto del motor de recomendación. La implementación por defecto es híbrida (Laya + reglas). */
export abstract class Recommender {
  abstract recommend(input: RecommenderInput): Promise<RecommenderOutput>;
}

export interface RecommendationProps {
  id: string;
  clientId: string | null;
  answers: Answers;
  type: OptionType;
  serviceId: string | null;
  treatmentId: string | null;
  confidence: number;
  source: RecommendationSource;
  outcome: RecommendationOutcome;
  ledToBooking: boolean;
  createdAt: Date;
}

/**
 * Fotografía auditable de una recomendación: las respuestas NO se editan después.
 * Sirve a la vez como historial del cliente y como dataset de reentrenamiento.
 */
export class Recommendation {
  private constructor(private props: RecommendationProps) {}

  static record(props: Omit<RecommendationProps, 'outcome' | 'ledToBooking'>): Recommendation {
    return new Recommendation({ ...props, outcome: 'PENDING', ledToBooking: false });
  }

  static restore(props: RecommendationProps): Recommendation {
    return new Recommendation({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get clientId(): string | null {
    return this.props.clientId;
  }

  snapshot(): Readonly<RecommendationProps> {
    return { ...this.props };
  }

  decide(outcome: 'ACCEPTED' | 'DISCARDED'): void {
    if (this.props.outcome !== 'PENDING') {
      throw new BusinessRuleError(
        'INVALID_STATUS_TRANSITION',
        'Esta recomendación ya fue aceptada o descartada',
      );
    }
    this.props.outcome = outcome;
  }

  /** El cliente terminó reservando a partir de esta recomendación. */
  markBooked(): void {
    this.props.ledToBooking = true;
    if (this.props.outcome === 'PENDING') this.props.outcome = 'ACCEPTED';
  }
}

export abstract class RecommendationRepository {
  abstract findById(id: string): Promise<Recommendation | null>;
  abstract listByClient(clientId: string): Promise<Recommendation[]>;
  abstract save(recommendation: Recommendation): Promise<void>;
}

/** Servicios ya realizados por el cliente (para personalizar la recomendación). */
export abstract class ClientHistoryReader {
  abstract serviceIdsDoneBy(clientId: string): Promise<string[]>;
}
