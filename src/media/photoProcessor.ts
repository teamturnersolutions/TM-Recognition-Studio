import {
  MAX_PHOTO_FILE_SIZE_BYTES,
  type DecodedImageSource,
  type UploadedPhoto,
} from '../types/recognition';
import {
  inferImageMimeType,
  validatePhotoFile,
} from '../validation/validateRecognition';

function loadHtmlImage(
  src: string,
  crossOrigin?: 'anonymous',
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error('Image has invalid dimensions.'));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error('The selected image could not be decoded.'));
    };
    img.src = src;
  });
}

async function decodeBlobSafely(
  blob: Blob,
  objectUrl: string,
): Promise<{ source: DecodedImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
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

export function validatePhotoUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Enter an image URL starting with https:// or http://.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Enter a valid image URL (e.g., https://example.com/photo.jpg).' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Only http:// and https:// image URLs are supported.' };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

function deriveUrlFileName(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      return decodeURIComponent(last).slice(0, 64);
    }
    return parsed.hostname;
  } catch {
    return 'remote-image';
  }
}

export async function processPhotoFile(file: File): Promise<UploadedPhoto> {
  const check = validatePhotoFile(file);
  if (!check.valid || !check.mimeType) {
    throw new Error(check.error ?? 'Invalid photo file.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const decoded = await decodeBlobSafely(file, objectUrl);
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

export async function processPhotoUrl(rawUrl: string): Promise<UploadedPhoto> {
  const check = validatePhotoUrl(rawUrl);
  if (!check.valid || !check.normalizedUrl) {
    throw new Error(check.error ?? 'Invalid image URL.');
  }

  const normalizedUrl = check.normalizedUrl;
  const displayName = deriveUrlFileName(normalizedUrl);

  // 1. Prefer CORS fetch -> local Blob URL so Canvas export stays 100% untainted
  try {
    const response = await fetch(normalizedUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0 && blob.size <= MAX_PHOTO_FILE_SIZE_BYTES) {
        const inferredMime =
          inferImageMimeType({ name: displayName, type: blob.type }) ?? 'image/url';
        const objectUrl = URL.createObjectURL(blob);
        try {
          const decoded = await decodeBlobSafely(blob, objectUrl);
          return {
            fileName: displayName,
            mimeType: inferredMime,
            objectUrl,
            sourceUrl: normalizedUrl,
            corsRestricted: false,
            source: decoded.source,
            naturalWidth: decoded.width,
            naturalHeight: decoded.height,
          };
        } catch {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }
  } catch {
    // Fall through to <img> loading attempts
  }

  // 2. Try CORS-enabled <img> load (untainted canvas)
  try {
    const img = await loadHtmlImage(normalizedUrl, 'anonymous');
    return {
      fileName: displayName,
      mimeType: inferImageMimeType({ name: displayName, type: '' }) ?? 'image/url',
      objectUrl: normalizedUrl,
      sourceUrl: normalizedUrl,
      corsRestricted: false,
      source: img,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    };
  } catch {
    // Fall through to non-CORS preview load
  }

  // 3. Fallback: load directly for live form/slide preview (may restrict canvas export if host blocks CORS)
  try {
    const img = await loadHtmlImage(normalizedUrl);
    return {
      fileName: displayName,
      mimeType: inferImageMimeType({ name: displayName, type: '' }) ?? 'image/url',
      objectUrl: normalizedUrl,
      sourceUrl: normalizedUrl,
      corsRestricted: true,
      source: img,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    };
  } catch {
    throw new Error(
      'Unable to load image from URL. Verify the link points directly to an accessible JPG, PNG, or WebP image.',
    );
  }
}

export function releaseUploadedPhoto(photo: UploadedPhoto | null): void {
  if (!photo) {
    return;
  }
  if (
    photo.objectUrl.startsWith('blob:') &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
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
