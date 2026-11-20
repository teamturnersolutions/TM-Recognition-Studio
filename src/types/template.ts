export type SlideKey = 'nominees' | 'winner';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface BackgroundFraming {
  asset: string;
  fit: 'cover' | 'contain' | 'fill';
  backdropColor: string;
}

export type ImageBinding =
  | 'nominee.0.photo'
  | 'nominee.1.photo'
  | 'nominee.2.photo'
  | 'nominee.3.photo'
  | 'nominee.4.photo'
  | 'nominee.5.photo'
  | 'winner.photo';

export type TextBinding =
  | 'nominee.0.name'
  | 'nominee.1.name'
  | 'nominee.2.name'
  | 'nominee.3.name'
  | 'nominee.4.name'
  | 'nominee.5.name'
  | 'winner.name'
  | 'winner.storeDepartment'
  | 'winner.category'
  | 'winner.summary';

export interface ImagePlaceholderSpec {
  mode: 'template-artwork' | 'neutral-silhouette';
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface ImageRegionSpec {
  id: string;
  binding: ImageBinding;
  rect: NormalizedRect;
  fit: 'cover';
  focalPoint?: {
    x: number;
    y: number;
  };
  placeholder: ImagePlaceholderSpec;
}

export interface TextFontSpec {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  maxSizePx: number;
  minSizePx: number;
  lineHeight: number;
  color: string;
  textTransform?: 'none' | 'uppercase';
}

export interface TextRegionSpec {
  id: string;
  binding: TextBinding;
  rect: NormalizedRect;
  prefix?: string;
  maskFill?: string;
  padding?: {
    x: number;
    y: number;
  };
  font: TextFontSpec;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  maxLines: number;
  overflow: 'shrink-then-ellipsis' | 'shrink-only';
}

export interface SlideDefinition {
  title: string;
  background: BackgroundFraming;
  imageRegions: ImageRegionSpec[];
  textRegions: TextRegionSpec[];
}

export interface TemplateFontAsset {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  src: string;
}

export interface TemplateManifest {
  schemaVersion: '1.0';
  id: string;
  name: string;
  version: string;
  description?: string;
  canvas: {
    width: number;
    height: number;
  };
  fonts: TemplateFontAsset[];
  slides: {
    nominees: SlideDefinition;
    winner: SlideDefinition;
  };
}

export interface TemplateRegistryEntry {
  id: string;
  manifestPath: string;
}

export interface TemplateRegistry {
  schemaVersion: '1.0';
  templates: TemplateRegistryEntry[];
}

export interface LoadedTemplatePackage {
  manifest: TemplateManifest;
  basePath: string;
  backgrounds: Record<SlideKey, HTMLImageElement>;
}
