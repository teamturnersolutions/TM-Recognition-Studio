export const NOMINEE_COUNT = 6 as const;

export const CHAR_LIMITS = {
  nomineeName: 40,
  recognitionPeriod: 32,
  storeDepartment: 48,
  category: 48,
  summary: 260,
} as const;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export const MAX_PHOTO_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export type DecodedImageSource = ImageBitmap | HTMLImageElement;

export interface UploadedPhoto {
  fileName: string;
  mimeType: AcceptedImageMimeType;
  objectUrl: string;
  source: DecodedImageSource;
  naturalWidth: number;
  naturalHeight: number;
}

export interface NomineeInput {
  id: string;
  name: string;
  photo: UploadedPhoto | null;
}

export type SixNominees = [
  NomineeInput,
  NomineeInput,
  NomineeInput,
  NomineeInput,
  NomineeInput,
  NomineeInput,
];

export interface RecognitionSessionState {
  selectedTemplateId: string;
  recognitionPeriod: string;
  nominees: SixNominees;
  winnerIndex: number | null;
  winnerStoreDepartment: string;
  winnerCategory: string;
  winnerSummary: string;
}

export interface NormalizedNominee {
  slotIndex: number;
  name: string;
  photo: DecodedImageSource | null;
}

export interface NormalizedWinner {
  slotIndex: number;
  name: string;
  photo: DecodedImageSource | null;
  storeDepartment: string;
  category: string;
  summary: string;
}

export interface NormalizedRecognitionData {
  recognitionPeriod?: string;
  nominees: ReadonlyArray<NormalizedNominee>;
  winner: NormalizedWinner;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
  normalized: NormalizedRecognitionData | null;
}

export type AppView = 'builder' | 'preview';
