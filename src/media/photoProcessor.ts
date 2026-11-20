import type { DecodedImageSource, UploadedPhoto } from '../types/recognition';
import { validatePhotoFile } from '../validation/validateRecognition';

function loadHtmlImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error('Image has invalid dimensions.'));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error('The selected file could not be decoded as a valid image.'));
    };
    img.src = objectUrl;
  });
}

async function decodeImageSafely(
  file: File,
  objectUrl: string,
): Promise<{ source: DecodedImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return { source: bitmap, width: bitmap.width, height: bitmap.height };
      }
      bitmap.close();
    } catch {
      // Fall back to HTMLImageElement decoding below
    }
  }

  const img = await loadHtmlImage(objectUrl);
  return { source: img, width: img.naturalWidth, height: img.naturalHeight };
}

export async function processPhotoFile(file: File): Promise<UploadedPhoto> {
  const check = validatePhotoFile(file);
  if (!check.valid || !check.mimeType) {
    throw new Error(check.error ?? 'Invalid photo file.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const decoded = await decodeImageSafely(file, objectUrl);
    return {
      fileName: file.name,
      mimeType: check.mimeType,
      objectUrl,
      source: decoded.source,
      naturalWidth: decoded.width,
      naturalHeight: decoded.height,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to read this image. Please try another JPG, PNG, or WebP file.';
    throw new Error(message);
  }
}

export function releaseUploadedPhoto(photo: UploadedPhoto | null): void {
  if (!photo) {
    return;
  }
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(photo.objectUrl);
  }
  if (
    typeof ImageBitmap !== 'undefined' &&
    photo.source instanceof ImageBitmap &&
    typeof photo.source.close === 'function'
  ) {
    photo.source.close();
  }
}
