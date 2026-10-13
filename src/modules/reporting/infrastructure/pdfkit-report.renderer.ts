import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ReportPdfRenderer, ReportResult } from '../domain/reporting.model';

const BRAND = '#8B4A3C';
const MUTED = '#8A7A75';
const MARGIN = 40;

/**
 * Generador de PDF con pdfkit (liviano, sin navegador headless). Si en el futuro se necesitan
 * informes con el mismo diseño del frontend, se puede implementar este puerto con Puppeteer.
 */
@Injectable()
export class PdfKitReportRenderer extends ReportPdfRenderer {
  render(report: ReportResult): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: report.title } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.header(doc, report);
      this.summary(doc, report);
      report.tables.forEach((t) => this.table(doc, t));
      doc.end();
    });
  }

  private header(doc: PDFKit.PDFDocument, report: ReportResult): void {
    doc.fillColor(BRAND).fontSize(10).text('Melina Cannata · Salud & Estética Integral');
    doc.moveDown(0.3).fillColor('#2B2321').fontSize(18).text(report.title);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .text(
        `Período: ${report.from} al ${report.to} · Generado: ${report.generatedAt.toISOString()}`,
      );
    doc.moveDown();
  }

  private summary(doc: PDFKit.PDFDocument, report: ReportResult): void {
    doc.fillColor('#2B2321').fontSize(12).text('Resumen');
    doc.moveDown(0.3).fontSize(10);
    for (const item of report.summary) doc.text(`${item.label}: ${item.value}`);
    doc.moveDown();
  }

  private table(doc: PDFKit.PDFDocument, table: ReportResult['tables'][number]): void {
    const width = doc.page.width - MARGIN * 2;
    const colWidth = width / Math.max(table.columns.length, 1);
    doc.fillColor(BRAND).fontSize(12).text(table.title, MARGIN);
    doc.moveDown(0.3);

    const row = (cells: (string | number)[], bold: boolean) => {
      if (doc.y > doc.page.height - MARGIN * 2) doc.addPage();
      const y = doc.y;
      doc.fontSize(8).fillColor(bold ? BRAND : '#2B2321');
      cells.forEach((cell, i) =>
        doc.text(String(cell), MARGIN + i * colWidth, y, {
          width: colWidth - 4,
          ellipsis: true,
          height: 22,
        }),
      );
      doc.y = y + 16;
    };

    row(table.columns, true);
    if (table.rows.length === 0) row(['Sin datos para el período'], false);
    table.rows.forEach((r) => row(r, false));
    doc.x = MARGIN;
    doc.moveDown();
  }
}
