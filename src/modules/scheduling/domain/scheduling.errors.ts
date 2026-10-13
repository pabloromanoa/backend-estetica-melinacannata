import { BusinessRuleError, ConflictError } from '../../../shared/domain/domain-error';

export class SlotNotAvailableError extends ConflictError {
  constructor() {
    super('SLOT_NOT_AVAILABLE', 'El horario elegido ya no está disponible. Elegí otro, por favor.');
  }
}

export class HoldExpiredError extends BusinessRuleError {
  constructor() {
    super(
      'HOLD_EXPIRED',
      'Venció el tiempo para adjuntar el comprobante. Tenés que iniciar la reserva nuevamente.',
    );
  }
}

export class InvalidStatusTransitionError extends BusinessRuleError {
  constructor(action: string, status: string) {
    super('INVALID_STATUS_TRANSITION', `No se puede ${action} un turno en estado ${status}`, {
      status,
    });
  }
}

export class ReasonRequiredError extends BusinessRuleError {
  constructor(action: string) {
    super('CANCELLATION_REASON_REQUIRED', `Indicá el motivo para ${action}`);
  }
}

export class ProviderNotQualifiedError extends BusinessRuleError {
  constructor() {
    super('PROVIDER_NOT_QUALIFIED', 'El prestador elegido no realiza este servicio');
  }
}

export class InvalidReceiptError extends BusinessRuleError {
  constructor(reason: string) {
    super('INVALID_RECEIPT_FILE', reason);
  }
}
