import type { PixelRect } from './geometry';

export function drawNeutralPlaceholder(
  ctx: CanvasRenderingContext2D,
  rect: PixelRect,
  backgroundColor = '#D0D0D0',
  foregroundColor = '#636363',
): void {
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

  const cx = rect.x + rect.width / 2;
  const minDim = Math.min(rect.width, rect.height);
  const strokeWidth = Math.max(3, minDim * 0.036);

  ctx.strokeStyle = foregroundColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Head circle
  const headRadius = minDim * 0.145;
  const headCenterY = rect.y + rect.height * 0.37;
  ctx.beginPath();
  ctx.arc(cx, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Shoulders arc
  const shoulderRadiusX = minDim * 0.285;
  const shoulderRadiusY = minDim * 0.24;
  const shoulderCenterY = rect.y + rect.height * 0.82;
  ctx.beginPath();
  ctx.ellipse(cx, shoulderCenterY, shoulderRadiusX, shoulderRadiusY, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  ctx.restore();
}
