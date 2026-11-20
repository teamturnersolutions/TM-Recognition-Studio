import type { DecodedImageSource, NormalizedRecognitionData } from '../types/recognition';
import type {
  ImageBinding,
  ImageRegionSpec,
  LoadedTemplatePackage,
  SlideKey,
  TextBinding,
  TextRegionSpec,
} from '../types/template';
import {
  computeBackgroundDrawRect,
  computeCoverCropRect,
  denormalizeRect,
  fitTextToBox,
  type PixelRect,
} from './geometry';
import { drawNeutralPlaceholder } from './placeholder';

function getSourceDimensions(source: DecodedImageSource): { width: number; height: number } {
  if ('naturalWidth' in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

export function resolveImageBinding(
  data: NormalizedRecognitionData,
  binding: ImageBinding,
): DecodedImageSource | null {
  if (binding === 'winner.photo') {
    return data.winner.photo;
  }
  const match = /^nominee\.(\d)\.photo$/.exec(binding);
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  return data.nominees[index]?.photo ?? null;
}

export function resolveTextBinding(
  data: NormalizedRecognitionData,
  binding: TextBinding,
): string {
  switch (binding) {
    case 'winner.name':
      return data.winner.name;
    case 'winner.storeDepartment':
      return data.winner.storeDepartment;
    case 'winner.category':
      return data.winner.category;
    case 'winner.summary':
      return data.winner.summary;
    default: {
      const match = /^nominee\.(\d)\.name$/.exec(binding);
      if (!match) {
        return '';
      }
      const index = Number(match[1]);
      return data.nominees[index]?.name ?? '';
    }
  }
}

function buildRoundedRectPath(ctx: CanvasRenderingContext2D, rect: PixelRect): void {
  const radius = Math.min(rect.borderRadius, rect.width / 2, rect.height / 2);
  ctx.beginPath();
  if (radius <= 0) {
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    return;
  }
  ctx.moveTo(rect.x + radius, rect.y);
  ctx.lineTo(rect.x + rect.width - radius, rect.y);
  ctx.quadraticCurveTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + radius);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - radius);
  ctx.quadraticCurveTo(
    rect.x + rect.width,
    rect.y + rect.height,
    rect.x + rect.width - radius,
    rect.y + rect.height,
  );
  ctx.lineTo(rect.x + radius, rect.y + rect.height);
  ctx.quadraticCurveTo(rect.x, rect.y + rect.height, rect.x, rect.y + rect.height - radius);
  ctx.lineTo(rect.x, rect.y + radius);
  ctx.quadraticCurveTo(rect.x, rect.y, rect.x + radius, rect.y);
  ctx.closePath();
}

function formatCanvasFont(region: TextRegionSpec, fontSizePx: number): string {
  const family = region.font.family.includes(' ')
    ? `"${region.font.family}"`
    : region.font.family;
  return `${region.font.style} ${region.font.weight} ${fontSizePx}px ${family}, system-ui, -apple-system, sans-serif`;
}

function renderImageRegion(
  ctx: CanvasRenderingContext2D,
  region: ImageRegionSpec,
  source: DecodedImageSource | null,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const rect = denormalizeRect(region.rect, canvasWidth, canvasHeight);
  ctx.save();
  buildRoundedRectPath(ctx, rect);
  ctx.clip();

  if (source) {
    const dims = getSourceDimensions(source);
    const crop = computeCoverCropRect(
      dims.width,
      dims.height,
      rect.width,
      rect.height,
      region.focalPoint ?? { x: 0.5, y: 0.35 },
    );
    ctx.drawImage(
      source,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  } else if (region.placeholder.mode === 'neutral-silhouette') {
    drawNeutralPlaceholder(
      ctx,
      rect,
      region.placeholder.backgroundColor,
      region.placeholder.foregroundColor,
    );
  }

  ctx.restore();
}

function renderTextRegion(
  ctx: CanvasRenderingContext2D,
  region: TextRegionSpec,
  rawValue: string,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const rect = denormalizeRect(region.rect, canvasWidth, canvasHeight);
  ctx.save();
  buildRoundedRectPath(ctx, rect);
  ctx.clip();

  if (region.maskFill) {
    ctx.fillStyle = region.maskFill;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  const combined = `${region.prefix ?? ''}${rawValue}`;
  const formatted =
    region.font.textTransform === 'uppercase' ? combined.toUpperCase() : combined;

  const padX = (region.padding?.x ?? 0) * canvasWidth;
  const padY = (region.padding?.y ?? 0) * canvasHeight;
  const innerX = rect.x + padX;
  const innerY = rect.y + padY;
  const innerW = Math.max(1, rect.width - padX * 2);
  const innerH = Math.max(1, rect.height - padY * 2);

  const layout = fitTextToBox(
    formatted,
    innerW,
    innerH,
    region.font,
    region.maxLines,
    region.overflow,
    (sample, fontSizePx) => {
      ctx.font = formatCanvasFont(region, fontSizePx);
      return ctx.measureText(sample).width;
    },
  );

  ctx.font = formatCanvasFont(region, layout.fontSizePx);
  ctx.fillStyle = region.font.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = region.align;

  const anchorX =
    region.align === 'left'
      ? innerX
      : region.align === 'right'
        ? innerX + innerW
        : innerX + innerW / 2;

  const totalTextHeight = layout.lines.length * layout.lineHeightPx;
  let startY = innerY + layout.lineHeightPx / 2;
  if (region.verticalAlign === 'middle') {
    startY = innerY + (innerH - totalTextHeight) / 2 + layout.lineHeightPx / 2;
  } else if (region.verticalAlign === 'bottom') {
    startY = innerY + innerH - totalTextHeight + layout.lineHeightPx / 2;
  }

  layout.lines.forEach((line, lineIndex) => {
    const y = startY + lineIndex * layout.lineHeightPx;
    ctx.fillText(line, anchorX, y);
  });

  ctx.restore();
}

export function renderSlide(
  canvas: HTMLCanvasElement,
  data: NormalizedRecognitionData,
  pkg: LoadedTemplatePackage,
  slideKey: SlideKey,
): void {
  const { width, height } = pkg.manifest.canvas;
  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D rendering context.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const slideDef = pkg.manifest.slides[slideKey];
  const bgImage = pkg.backgrounds[slideKey];

  // 1. Backdrop + template background
  ctx.fillStyle = slideDef.background.backdropColor;
  ctx.fillRect(0, 0, width, height);

  const bgRect = computeBackgroundDrawRect(
    bgImage.naturalWidth,
    bgImage.naturalHeight,
    width,
    height,
    slideDef.background.fit,
  );
  ctx.drawImage(
    bgImage,
    bgRect.sx,
    bgRect.sy,
    bgRect.sw,
    bgRect.sh,
    bgRect.dx,
    bgRect.dy,
    bgRect.dw,
    bgRect.dh,
  );

  // 2. Dynamic image regions
  for (const imageRegion of slideDef.imageRegions) {
    const source = resolveImageBinding(data, imageRegion.binding);
    renderImageRegion(ctx, imageRegion, source, width, height);
  }

  // 3. Dynamic text regions
  for (const textRegion of slideDef.textRegions) {
    const value = resolveTextBinding(data, textRegion.binding);
    renderTextRegion(ctx, textRegion, value, width, height);
  }
}

export function renderSlideToOffscreenCanvas(
  data: NormalizedRecognitionData,
  pkg: LoadedTemplatePackage,
  slideKey: SlideKey,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = pkg.manifest.canvas.width;
  canvas.height = pkg.manifest.canvas.height;
  renderSlide(canvas, data, pkg, slideKey);
  return canvas;
}
