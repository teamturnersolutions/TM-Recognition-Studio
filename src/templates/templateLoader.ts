import type {
  LoadedTemplatePackage,
  NormalizedRect,
  TemplateManifest,
  TemplateRegistry,
} from '../types/template';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidNormalizedRect(rect: unknown): rect is NormalizedRect {
  if (!isRecord(rect)) {
    return false;
  }
  const { x, y, width, height } = rect;
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof width === 'number' &&
    typeof height === 'number' &&
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x + width <= 1.0001 &&
    y + height <= 1.0001
  );
}

export function validateTemplateManifest(raw: unknown): TemplateManifest {
  if (!isRecord(raw)) {
    throw new Error('Template manifest must be a JSON object.');
  }

  if (raw.schemaVersion !== '1.0') {
    throw new Error(`Unsupported template manifest schemaVersion: ${String(raw.schemaVersion)}`);
  }

  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    throw new Error('Template manifest is missing a valid "id".');
  }

  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error('Template manifest is missing a valid "name".');
  }

  if (typeof raw.version !== 'string' || !raw.version.trim()) {
    throw new Error('Template manifest is missing a valid "version".');
  }

  if (
    !isRecord(raw.canvas) ||
    typeof raw.canvas.width !== 'number' ||
    typeof raw.canvas.height !== 'number' ||
    raw.canvas.width <= 0 ||
    raw.canvas.height <= 0
  ) {
    throw new Error('Template manifest must define positive numeric canvas dimensions.');
  }

  if (!isRecord(raw.slides) || !isRecord(raw.slides.nominees) || !isRecord(raw.slides.winner)) {
    throw new Error('Template manifest must define both "nominees" and "winner" slides.');
  }

  const nomineesSlide = raw.slides.nominees;
  const winnerSlide = raw.slides.winner;

  if (!Array.isArray(nomineesSlide.imageRegions) || nomineesSlide.imageRegions.length !== 6) {
    throw new Error('Nominees slide must define exactly 6 imageRegions.');
  }
  if (!Array.isArray(nomineesSlide.textRegions) || nomineesSlide.textRegions.length !== 6) {
    throw new Error('Nominees slide must define exactly 6 textRegions.');
  }
  if (!Array.isArray(winnerSlide.imageRegions) || winnerSlide.imageRegions.length < 1) {
    throw new Error('Winner slide must define at least 1 imageRegion.');
  }
  if (!Array.isArray(winnerSlide.textRegions) || winnerSlide.textRegions.length < 3) {
    throw new Error('Winner slide must define name, recognized-for, and summary textRegions.');
  }

  const allRegions = [
    ...nomineesSlide.imageRegions,
    ...nomineesSlide.textRegions,
    ...winnerSlide.imageRegions,
    ...winnerSlide.textRegions,
  ];
  for (const region of allRegions) {
    if (!isRecord(region) || !isValidNormalizedRect(region.rect)) {
      throw new Error(
        `Template region "${isRecord(region) ? String(region.id) : 'unknown'}" has invalid normalized coordinates.`,
      );
    }
  }

  return raw as unknown as TemplateManifest;
}

function getBaseDirectory(manifestPath: string): string {
  const lastSlash = manifestPath.lastIndexOf('/');
  return lastSlash >= 0 ? manifestPath.slice(0, lastSlash + 1) : '/';
}

function loadTemplateImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error(`Template background "${src}" has invalid dimensions.`));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load template background asset: ${src}`));
    };
    img.src = src;
  });
}

async function loadTemplateFonts(manifest: TemplateManifest, basePath: string): Promise<void> {
  if (typeof FontFace === 'undefined' || !document.fonts) {
    return;
  }

  await Promise.all(
    manifest.fonts.map(async (fontAsset) => {
      const fontUrl = `${basePath}${fontAsset.src}`;
      const face = new FontFace(fontAsset.family, `url(${fontUrl}) format('woff2')`, {
        weight: String(fontAsset.weight),
        style: fontAsset.style,
      });
      const loadedFace = await face.load();
      document.fonts.add(loadedFace);
    }),
  );

  await document.fonts.ready;
}

export async function loadTemplateRegistry(): Promise<TemplateRegistry> {
  const response = await fetch('/templates/index.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load template registry (HTTP ${response.status}).`);
  }
  const raw = (await response.json()) as unknown;
  if (!isRecord(raw) || !Array.isArray(raw.templates) || raw.templates.length === 0) {
    throw new Error('Template registry is invalid or contains no templates.');
  }
  return raw as unknown as TemplateRegistry;
}

export async function loadTemplatePackage(manifestPath: string): Promise<LoadedTemplatePackage> {
  const response = await fetch(manifestPath, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load template manifest at ${manifestPath} (HTTP ${response.status}).`);
  }

  const rawManifest = (await response.json()) as unknown;
  const manifest = validateTemplateManifest(rawManifest);
  const basePath = getBaseDirectory(manifestPath);

  const [nomineesBg, winnerBg] = await Promise.all([
    loadTemplateImage(`${basePath}${manifest.slides.nominees.background.asset}`),
    loadTemplateImage(`${basePath}${manifest.slides.winner.background.asset}`),
    loadTemplateFonts(manifest, basePath),
  ]);

  return {
    manifest,
    basePath,
    backgrounds: {
      nominees: nomineesBg,
      winner: winnerBg,
    },
  };
}
