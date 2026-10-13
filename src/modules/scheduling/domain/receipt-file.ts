import { InvalidReceiptError } from './scheduling.errors';

export interface UploadedReceipt {
  originalName: string;
  declaredMimeType: string;
  sizeBytes: number;
  content: Buffer;
}

/** Reglas configurables de comprobantes. */
export class ReceiptPolicy {
  constructor(public readonly maxBytes: number) {}
}

/** Firma ("magic bytes") de un PDF: `%PDF-`. */
const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');

/**
 * Validación de comprobantes según el relevamiento: sólo PDF, ≤ 5 MB, extensión .pdf,
 * tipo MIME declarado y — lo importante — contenido real verificado por su firma.
 * No confiamos en lo que declara el navegador.
 */
export function assertValidReceipt(file: UploadedReceipt, maxBytes: number): void {
  if (file.sizeBytes <= 0 || file.content.length === 0) {
    throw new InvalidReceiptError('El archivo está vacío');
  }
  if (file.sizeBytes > maxBytes || file.content.length > maxBytes) {
    throw new InvalidReceiptError(
      `El comprobante supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB`,
    );
  }
  if (!/\.pdf$/i.test(file.originalName.trim())) {
    throw new InvalidReceiptError('Sólo se aceptan comprobantes con extensión .pdf');
  }
  if (file.declaredMimeType !== 'application/pdf') {
    throw new InvalidReceiptError('El comprobante debe ser un PDF');
  }
  const header = file.content.subarray(0, 1024);
  if (header.indexOf(PDF_SIGNATURE) !== 0) {
    throw new InvalidReceiptError('El contenido del archivo no corresponde a un PDF válido');
  }
}
