import { renderSlideToOffscreenCanvas } from '../engine/slideRenderer';
import type { NormalizedRecognitionData } from '../types/recognition';
import type { LoadedTemplatePackage, SlideKey } from '../types/template';

export function sanitizeFilenameSegment(input?: string): string {
  if (!input) {
    return '';
  }
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function buildExportFilename(
  base: string,
  extension: 'png' | 'pdf',
  period?: string,
): string {
  const suffix = sanitizeFilenameSegment(period);
  return suffix ? `${base}-${suffix}.${extension}` : `${base}.${extension}`;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to encode slide as PNG.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'SecurityError') {
        reject(
          new Error(
            'Export blocked because a remote photo URL does not allow cross-origin canvas access. Download that image and upload it locally to export.',
          ),
        );
        return;
      }
      reject(error instanceof Error ? error : new Error('Failed to encode slide as PNG.'));
    }
  });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Release temporary object URL shortly after browser initiates download
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export async function renderSlidePngBlob(
  data: NormalizedRecognitionData,
  pkg: LoadedTemplatePackage,
  slideKey: SlideKey,
): Promise<Blob> {
  if (document.fonts) {
    await document.fonts.ready;
  }
  const offscreen = renderSlideToOffscreenCanvas(data, pkg, slideKey);
  try {
    return await canvasToPngBlob(offscreen);
  } finally {
    // Release backing store immediately after export
    offscreen.width = 0;
    offscreen.height = 0;
  }
}

export async function exportSlidePng(
  data: NormalizedRecognitionData,
  pkg: LoadedTemplatePackage,
  slideKey: SlideKey,
): Promise<void> {
  const blob = await renderSlidePngBlob(data, pkg, slideKey);
  const base = slideKey === 'nominees' ? 'bjs-tm-nominees' : 'bjs-tm-of-the-month';
  const filename = buildExportFilename(base, 'png', data.recognitionPeriod);
  triggerBlobDownload(blob, filename);
}
