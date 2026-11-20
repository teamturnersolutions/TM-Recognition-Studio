import { describe, expect, it } from 'vitest';
import {
  computeBackgroundDrawRect,
  computeCoverCropRect,
  denormalizeRect,
  fitTextToBox,
  wrapLines,
} from '../src/engine/geometry';
import type { TextFontSpec } from '../src/types/template';

const SAMPLE_FONT: TextFontSpec = {
  family: 'StudioSans',
  weight: 600,
  style: 'normal',
  maxSizePx: 28,
  minSizePx: 14,
  lineHeight: 1.25,
  color: '#111111',
};

// Deterministic linear width estimator for headless geometry unit tests
const measureMock = (text: string, fontSizePx: number): number => text.length * fontSizePx * 0.55;

describe('denormalizeRect', () => {
  it('maps normalized coordinates deterministically to 1920x1080 pixels', () => {
    const px = denormalizeRect({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, 1920, 1080);
    expect(px.x).toBe(480);
    expect(px.y).toBe(540);
    expect(px.width).toBe(960);
    expect(px.height).toBe(270);
  });
});

describe('computeBackgroundDrawRect', () => {
  it('centers 626x488 artwork cleanly inside 1920x1080 when fit=contain without distortion', () => {
    const rect = computeBackgroundDrawRect(626, 488, 1920, 1080, 'contain');
    expect(rect.dh).toBeCloseTo(1080, 5);
    expect(rect.dw / rect.dh).toBeCloseTo(626 / 488, 5);
    expect(rect.dx).toBeCloseTo((1920 - rect.dw) / 2, 5);
    expect(rect.dy).toBeCloseTo(0, 5);
  });
});

describe('computeCoverCropRect', () => {
  it('preserves target aspect ratio for wide landscape images without exceeding bounds', () => {
    const crop = computeCoverCropRect(2000, 1000, 200, 200, { x: 0.5, y: 0.35 });
    expect(crop.sw / crop.sh).toBeCloseTo(1, 5);
    expect(crop.sx).toBeCloseTo(500, 5);
    expect(crop.sy).toBe(0);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(2000);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(1000);
  });

  it('preserves target aspect ratio for tall portrait images with upper focal bias', () => {
    const crop = computeCoverCropRect(1000, 2000, 250, 200, { x: 0.5, y: 0.35 });
    expect(crop.sw / crop.sh).toBeCloseTo(250 / 200, 5);
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBeCloseTo((2000 - crop.sh) * 0.35, 5);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(2000);
  });
});

describe('wrapLines and fitTextToBox', () => {
  it('wraps long text and shrinks font size within configured limits to stay inside the box', () => {
    const text =
      'Recognized for extraordinary teamwork, positive attitude, and helping train three new cashiers during a high-volume holiday week.';
    const boxWidth = 560;
    const boxHeight = 82;

    const layout = fitTextToBox(
      text,
      boxWidth,
      boxHeight,
      SAMPLE_FONT,
      3,
      'shrink-then-ellipsis',
      measureMock,
    );

    expect(layout.fontSizePx).toBeGreaterThanOrEqual(SAMPLE_FONT.minSizePx);
    expect(layout.fontSizePx).toBeLessThanOrEqual(SAMPLE_FONT.maxSizePx);
    expect(layout.lines.length).toBeLessThanOrEqual(3);
    expect(layout.lines.length * layout.lineHeightPx).toBeLessThanOrEqual(boxHeight + 1);
    for (const line of layout.lines) {
      expect(measureMock(line, layout.fontSizePx)).toBeLessThanOrEqual(boxWidth + 0.5);
    }
  });

  it('truncates single-line names cleanly with ellipsis if still wider at minSizePx', () => {
    const veryLongName = 'ALEXANDER BARTHOLOMEW CHRISTOPHER MONTGOMERY III';
    const boxWidth = 180;
    const layout = fitTextToBox(
      veryLongName,
      boxWidth,
      40,
      { ...SAMPLE_FONT, maxSizePx: 24, minSizePx: 14 },
      1,
      'shrink-then-ellipsis',
      measureMock,
    );

    expect(layout.lines).toHaveLength(1);
    expect(layout.fontSizePx).toBe(14);
    expect(layout.truncated).toBe(true);
    expect(layout.lines[0]?.endsWith('…')).toBe(true);
    expect(measureMock(layout.lines[0] ?? '', layout.fontSizePx)).toBeLessThanOrEqual(
      boxWidth + 0.5,
    );
  });

  it('safely breaks an unbroken token that exceeds line width', () => {
    const lines = wrapLines('SUPERLONGUNBROKENTOKENVALUE', 80, (s) => s.length * 10);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length * 10).toBeLessThanOrEqual(80);
    }
  });
});
