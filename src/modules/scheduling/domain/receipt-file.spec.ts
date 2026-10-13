import { assertValidReceipt, UploadedReceipt } from './receipt-file';
import { InvalidReceiptError } from './scheduling.errors';

const MAX = 5 * 1024 * 1024;
const pdf = Buffer.from('%PDF-1.7\n...contenido...');
const file = (overrides: Partial<UploadedReceipt> = {}): UploadedReceipt => ({
  originalName: 'comprobante.pdf',
  declaredMimeType: 'application/pdf',
  sizeBytes: pdf.length,
  content: pdf,
  ...overrides,
});

describe('Validación de comprobantes', () => {
  it('acepta un PDF real', () => {
    expect(() => assertValidReceipt(file(), MAX)).not.toThrow();
  });

  it.each([
    ['extensión distinta de .pdf', { originalName: 'comprobante.jpg' }],
    ['MIME declarado distinto', { declaredMimeType: 'image/png' }],
    ['contenido que no es PDF (magic bytes)', { content: Buffer.from('MZ ejecutable') }],
    ['archivo vacío', { content: Buffer.alloc(0), sizeBytes: 0 }],
    ['más de 5 MB', { sizeBytes: MAX + 1, content: Buffer.concat([pdf, Buffer.alloc(MAX)]) }],
  ])('rechaza %s', (_, overrides) => {
    expect(() => assertValidReceipt(file(overrides), MAX)).toThrow(InvalidReceiptError);
  });
});
