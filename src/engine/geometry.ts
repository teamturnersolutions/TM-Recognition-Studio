import type { NormalizedRect, TextFontSpec } from '../types/template';

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface DrawRect extends SourceRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface FittedTextLayout {
  fontSizePx: number;
  lineHeightPx: number;
  lines: string[];
  truncated: boolean;
}

export function denormalizeRect(
  rect: NormalizedRect,
  canvasWidth: number,
  canvasHeight: number,
): PixelRect {
  return {
    x: rect.x * canvasWidth,
    y: rect.y * canvasHeight,
    width: rect.width * canvasWidth,
    height: rect.height * canvasHeight,
    borderRadius: (rect.borderRadius ?? 0) * Math.min(canvasWidth, canvasHeight),
  };
}

export function computeCoverCropRect(
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
  focalPoint: { x: number; y: number } = { x: 0.5, y: 0.35 },
): SourceRect {
  if (imageWidth <= 0 || imageHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(0, imageWidth), sh: Math.max(0, imageHeight) };
  }

  const clampedFocalX = Math.min(1, Math.max(0, focalPoint.x));
  const clampedFocalY = Math.min(1, Math.max(0, focalPoint.y));

  const imageAspect = imageWidth / imageHeight;
  const targetAspect = targetWidth / targetHeight;

  if (Math.abs(imageAspect - targetAspect) < 1e-6) {
    return { sx: 0, sy: 0, sw: imageWidth, sh: imageHeight };
  }

  if (imageAspect > targetAspect) {
    // Source is wider than target -> crop horizontally
    const sw = imageHeight * targetAspect;
    const maxOffset = imageWidth - sw;
    const sx = Math.min(maxOffset, Math.max(0, clampedFocalX * maxOffset));
    return { sx, sy: 0, sw, sh: imageHeight };
  }

  // Source is taller than target -> crop vertically
  const sh = imageWidth / targetAspect;
  const maxOffset = imageHeight - sh;
  const sy = Math.min(maxOffset, Math.max(0, clampedFocalY * maxOffset));
  return { sx: 0, sy, sw: imageWidth, sh };
}

export function computeBackgroundDrawRect(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fit: 'cover' | 'contain' | 'fill',
): DrawRect {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: canvasWidth, dh: canvasHeight };
  }

  if (fit === 'fill') {
    return {
      sx: 0,
      sy: 0,
      sw: imageWidth,
      sh: imageHeight,
      dx: 0,
      dy: 0,
      dw: canvasWidth,
      dh: canvasHeight,
    };
  }

  if (fit === 'cover') {
    const crop = computeCoverCropRect(imageWidth, imageHeight, canvasWidth, canvasHeight, {
      x: 0.5,
      y: 0.5,
    });
    return {
      ...crop,
      dx: 0,
      dy: 0,
      dw: canvasWidth,
      dh: canvasHeight,
    };
  }

  // contain: scale proportionally to fit completely inside canvas without distortion
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const dw = imageWidth * scale;
  const dh = imageHeight * scale;
  const dx = (canvasWidth - dw) / 2;
  const dy = (canvasHeight - dh) / 2;

  return {
    sx: 0,
    sy: 0,
    sw: imageWidth,
    sh: imageHeight,
    dx,
    dy,
    dw,
    dh,
  };
}

function breakLongToken(
  token: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string[] {
  const parts: string[] = [];
  let current = '';

  for (const ch of token) {
    const candidate = current + ch;
    if (current.length > 0 && measureWidth(candidate) > maxWidth) {
      parts.push(current);
      current = ch;
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }
  return parts;
}

export function wrapLines(
  rawText: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (measureWidth(candidate) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }

      if (measureWidth(word) <= maxWidth) {
        currentLine = word;
      } else {
        const broken = breakLongToken(word, maxWidth, measureWidth);
        for (let i = 0; i < broken.length - 1; i++) {
          const piece = broken[i];
          if (piece !== undefined) {
            lines.push(piece);
          }
        }
        currentLine = broken[broken.length - 1] ?? '';
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function truncateLineWithEllipsis(
  line: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string {
  const ellipsis = '…';
  if (measureWidth(line + ellipsis) <= maxWidth) {
    return line + ellipsis;
  }

  let candidate = line.trimEnd();
  while (candidate.length > 0 && measureWidth(candidate + ellipsis) > maxWidth) {
    candidate = candidate.slice(0, -1).trimEnd();
  }
  return candidate.length > 0 ? candidate + ellipsis : ellipsis;
}

export function fitTextToBox(
  text: string,
  boxWidth: number,
  boxHeight: number,
  font: TextFontSpec,
  maxLines: number,
  overflow: 'shrink-then-ellipsis' | 'shrink-only',
  measureWidth: (text: string, fontSizePx: number) => number,
): FittedTextLayout {
  const safeMaxWidth = Math.max(1, boxWidth);
  const safeMaxHeight = Math.max(1, boxHeight);
  const minSize = Math.max(6, Math.min(font.minSizePx, font.maxSizePx));
  const maxSize = Math.max(minSize, font.maxSizePx);
  const step = 0.5;

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      fontSizePx: maxSize,
      lineHeightPx: maxSize * font.lineHeight,
      lines: [],
      truncated: false,
    };
  }

  for (let size = maxSize; size >= minSize - 1e-6; size -= step) {
    const roundedSize = Math.max(minSize, Math.round(size * 2) / 2);
    const measureAtSize = (sample: string): number => measureWidth(sample, roundedSize);
    const lineHeightPx = roundedSize * font.lineHeight;

    if (maxLines === 1) {
      const singleLineText = trimmed.replace(/\s+/g, ' ');
      if (measureAtSize(singleLineText) <= safeMaxWidth && lineHeightPx <= safeMaxHeight + 0.5) {
        return {
          fontSizePx: roundedSize,
          lineHeightPx,
          lines: [singleLineText],
          truncated: false,
        };
      }
      continue;
    }

    const wrapped = wrapLines(trimmed, safeMaxWidth, measureAtSize);
    const totalHeight = wrapped.length * lineHeightPx;
    if (wrapped.length <= maxLines && totalHeight <= safeMaxHeight + 0.5) {
      return {
        fontSizePx: roundedSize,
        lineHeightPx,
        lines: wrapped,
        truncated: false,
      };
    }
  }

  // Minimum font size reached
  const measureMin = (sample: string): number => measureWidth(sample, minSize);
  const lineHeightPx = minSize * font.lineHeight;
  const maxAllowedLinesByHeight = Math.max(1, Math.floor((safeMaxHeight + 0.5) / lineHeightPx));
  const allowedLines = Math.max(1, Math.min(maxLines, maxAllowedLinesByHeight));

  if (maxLines === 1) {
    const single = trimmed.replace(/\s+/g, ' ');
    if (overflow === 'shrink-then-ellipsis' && measureMin(single) > safeMaxWidth) {
      return {
        fontSizePx: minSize,
        lineHeightPx,
        lines: [truncateLineWithEllipsis(single, safeMaxWidth, measureMin)],
        truncated: true,
      };
    }
    return {
      fontSizePx: minSize,
      lineHeightPx,
      lines: [single],
      truncated: false,
    };
  }

  const wrapped = wrapLines(trimmed, safeMaxWidth, measureMin);
  if (wrapped.length <= allowedLines) {
    return {
      fontSizePx: minSize,
      lineHeightPx,
      lines: wrapped,
      truncated: false,
    };
  }

  const clamped = wrapped.slice(0, allowedLines);
  if (overflow === 'shrink-then-ellipsis') {
    const lastIdx = clamped.length - 1;
    const lastLine = clamped[lastIdx] ?? '';
    clamped[lastIdx] = truncateLineWithEllipsis(lastLine, safeMaxWidth, measureMin);
  }

  return {
    fontSizePx: minSize,
    lineHeightPx,
    lines: clamped,
    truncated: true,
  };
}
