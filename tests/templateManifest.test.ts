import { describe, expect, it } from 'vitest';
import manifestJson from '../public/templates/bjs-spotlight/manifest.json';
import { validateTemplateManifest } from '../src/templates/templateLoader';
import type { NormalizedRect } from '../src/types/template';

function rectsOverlap(a: NormalizedRect, b: NormalizedRect): boolean {
  return (
    a.x < b.x + b.width - 1e-6 &&
    a.x + a.width > b.x + 1e-6 &&
    a.y < b.y + b.height - 1e-6 &&
    a.y + a.height > b.y + 1e-6
  );
}

describe('bjs-spotlight template manifest', () => {
  const rawJson: unknown = manifestJson;

  it('validates against the template manifest schema', () => {
    const manifest = validateTemplateManifest(rawJson);
    expect(manifest.id).toBe('bjs-spotlight');
    expect(manifest.canvas.width).toBe(1920);
    expect(manifest.canvas.height).toBe(1080);
    expect(manifest.fonts.length).toBeGreaterThan(0);
  });

  it('keeps all 6 nominee photo cards equal in dimensions and non-overlapping', () => {
    const manifest = validateTemplateManifest(rawJson);
    const photos = manifest.slides.nominees.imageRegions;
    expect(photos).toHaveLength(6);

    const first = photos[0];
    expect(first).toBeDefined();
    for (const region of photos) {
      expect(region.rect.width).toBeCloseTo(first!.rect.width, 6);
      expect(region.rect.height).toBeCloseTo(first!.rect.height, 6);
    }

    for (let i = 0; i < photos.length; i++) {
      for (let j = i + 1; j < photos.length; j++) {
        expect(rectsOverlap(photos[i]!.rect, photos[j]!.rect)).toBe(false);
      }
    }
  });

  it('keeps all Slide 2 winner regions strictly non-overlapping', () => {
    const manifest = validateTemplateManifest(rawJson);
    const allWinnerRects = [
      ...manifest.slides.winner.imageRegions.map((r) => r.rect),
      ...manifest.slides.winner.textRegions.map((r) => r.rect),
    ];

    for (let i = 0; i < allWinnerRects.length; i++) {
      for (let j = i + 1; j < allWinnerRects.length; j++) {
        expect(rectsOverlap(allWinnerRects[i]!, allWinnerRects[j]!)).toBe(false);
      }
    }
  });
});
