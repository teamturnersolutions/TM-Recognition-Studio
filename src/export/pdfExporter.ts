import type { NormalizedRecognitionData } from '../types/recognition';
import type { LoadedTemplatePackage } from '../types/template';
import {
  buildExportFilename,
  renderSlidePngBlob,
  triggerBlobDownload,
} from './pngExporter';

// Standard 16:9 widescreen presentation page size (13.333 in x 7.5 in = 960 x 540 PDF points)
const PDF_PAGE_WIDTH_PT = 960;
const PDF_PAGE_HEIGHT_PT = 540;

export async function buildCombinedPdfBytes(
  data: NormalizedRecognitionData,
  pkg: LoadedTemplatePackage,
): Promise<Uint8Array> {
  const [{ PDFDocument }, nomineesBlob, winnerBlob] = await Promise.all([
    import('pdf-lib'),
    renderSlidePngBlob(data, pkg, 'nominees'),
    renderSlidePngBlob(data, pkg, 'winner'),
  ]);

  const [nomineesBytes, winnerBytes] = await Promise.all([
    nomineesBlob.arrayBuffer(),
    winnerBlob.arrayBuffer(),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('BJ’s Team Member Spotlight Slides');
  pdfDoc.setCreator('TM Spotlight Studio v0.2.0');
  pdfDoc.setProducer('TM Spotlight Studio');

  const nomineesImage = await pdfDoc.embedPng(new Uint8Array(nomineesBytes));
  const nomineesPage = pdfDoc.addPage([PDF_PAGE_WIDTH_PT, PDF_PAGE_HEIGHT_PT]);
  nomineesPage.drawImage(nomineesImage, {
    x: 0,
    y: 0,
    width: PDF_PAGE_WIDTH_PT,
    height: PDF_PAGE_HEIGHT_PT,
  });

  const winnerImage = await pdfDoc.embedPng(new Uint8Array(winnerBytes));
  const winnerPage = pdfDoc.addPage([PDF_PAGE_WIDTH_PT, PDF_PAGE_HEIGHT_PT]);
  winnerPage.drawImage(winnerImage, {
    x: 0,
    y: 0,
    width: PDF_PAGE_WIDTH_PT,
    height: PDF_PAGE_HEIGHT_PT,
  });

  return pdfDoc.save();
}

export async function exportCombinedPdf(
  data: NormalizedRecognitionData,
  pkg: LoadedTemplatePackage,
): Promise<void> {
  const pdfBytes = await buildCombinedPdfBytes(data, pkg);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const filename = buildExportFilename('bjs-tm-recognition-slides', 'pdf', data.recognitionPeriod);
  triggerBlobDownload(blob, filename);
}
