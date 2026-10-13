import { ApiProperty } from '@nestjs/swagger';
import { UploadedReceipt } from '../domain/receipt-file';
import { InvalidReceiptError } from '../domain/scheduling.errors';

/**
 * Límite duro del parser multipart (algo mayor al de negocio para poder responder con un
 * mensaje claro). El tamaño real permitido lo valida el dominio (RECEIPT_MAX_BYTES).
 */
export const MULTIPART_HARD_LIMIT_BYTES = 6 * 1024 * 1024;

export const RECEIPT_UPLOAD_OPTIONS = {
  limits: { fileSize: MULTIPART_HARD_LIMIT_BYTES, files: 1, fields: 5 },
};

export class ReceiptUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Comprobante PDF (máx. 5 MB)' })
  file: unknown;
}

export function toUploadedReceipt(file: Express.Multer.File | undefined): UploadedReceipt {
  if (!file) throw new InvalidReceiptError('Adjuntá el comprobante en el campo "file"');
  return {
    originalName: file.originalname,
    declaredMimeType: file.mimetype,
    sizeBytes: file.size,
    content: file.buffer,
  };
}
