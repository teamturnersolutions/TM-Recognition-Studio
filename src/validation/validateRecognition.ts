import {
  ACCEPTED_IMAGE_MIME_TYPES,
  CHAR_LIMITS,
  MAX_PHOTO_FILE_SIZE_BYTES,
  NOMINEE_COUNT,
  type AcceptedImageMimeType,
  type NormalizedRecognitionData,
  type RecognitionSessionState,
  type ValidationError,
  type ValidationResult,
} from '../types/recognition';

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export function isAcceptedImageMimeType(mime: string): mime is AcceptedImageMimeType {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export function inferImageMimeType(file: { name: string; type: string }): AcceptedImageMimeType | null {
  const normalizedType = file.type.trim().toLowerCase();
  if (normalizedType === 'image/jpg') {
    return 'image/jpeg';
  }
  if (isAcceptedImageMimeType(normalizedType)) {
    return normalizedType;
  }
  const lowerName = file.name.trim().toLowerCase();
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerName.endsWith('.webp')) {
    return 'image/webp';
  }
  return null;
}

export interface PhotoFileValidationResult {
  valid: boolean;
  mimeType?: AcceptedImageMimeType;
  error?: string;
}

export function validatePhotoFile(file: {
  name: string;
  type: string;
  size: number;
}): PhotoFileValidationResult {
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    return { valid: false, error: 'The selected image file is empty.' };
  }

  if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image exceeds the ${Math.round(MAX_PHOTO_FILE_SIZE_BYTES / (1024 * 1024))} MB size limit.`,
    };
  }

  const mimeType = inferImageMimeType(file);
  if (!mimeType) {
    return {
      valid: false,
      error: `Unsupported image format. Please choose a ${ACCEPTED_EXTENSIONS.join(', ')} file.`,
    };
  }

  return { valid: true, mimeType };
}

export function validateRecognition(state: RecognitionSessionState): ValidationResult {
  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, string> = {};

  const addError = (field: string, message: string): void => {
    errors.push({ field, message });
    if (!fieldErrors[field]) {
      fieldErrors[field] = message;
    }
  };

  if (state.nominees.length !== NOMINEE_COUNT) {
    addError('nominees', `Exactly ${NOMINEE_COUNT} nominees are required.`);
  }

  const trimmedPeriod = state.recognitionPeriod.trim();
  if (trimmedPeriod.length > CHAR_LIMITS.recognitionPeriod) {
    addError(
      'recognitionPeriod',
      `Recognition period must be ${CHAR_LIMITS.recognitionPeriod} characters or fewer.`,
    );
  }

  const normalizedNominees = state.nominees.map((nominee, idx) => {
    const trimmedName = nominee.name.trim();
    const fieldKey = `nominee.${idx}.name`;
    if (trimmedName.length === 0) {
      addError(fieldKey, `Nominee ${idx + 1} name is required.`);
    } else if (trimmedName.length > CHAR_LIMITS.nomineeName) {
      addError(
        fieldKey,
        `Nominee ${idx + 1} name must be ${CHAR_LIMITS.nomineeName} characters or fewer.`,
      );
    }

    return {
      slotIndex: idx,
      name: trimmedName,
      photo: nominee.photo ? nominee.photo.source : null,
    };
  });

  if (
    state.winnerIndex === null ||
    !Number.isInteger(state.winnerIndex) ||
    state.winnerIndex < 0 ||
    state.winnerIndex >= NOMINEE_COUNT
  ) {
    addError('winnerIndex', 'Select one of the six nominees as the Team Member of the Month.');
  }

  const trimmedStore = state.winnerStoreDepartment.trim();
  if (trimmedStore.length > CHAR_LIMITS.storeDepartment) {
    addError(
      'winnerStoreDepartment',
      `Store / Department must be ${CHAR_LIMITS.storeDepartment} characters or fewer.`,
    );
  }

  const trimmedCategory = state.winnerCategory.trim();
  if (trimmedCategory.length === 0) {
    addError('winnerCategory', 'Recognized for is required.');
  } else if (trimmedCategory.length > CHAR_LIMITS.category) {
    addError(
      'winnerCategory',
      `Recognized for must be ${CHAR_LIMITS.category} characters or fewer.`,
    );
  }

  const trimmedSummary = state.winnerSummary.trim();
  if (trimmedSummary.length === 0) {
    addError('winnerSummary', 'Recognition summary is required.');
  } else if (trimmedSummary.length > CHAR_LIMITS.summary) {
    addError(
      'winnerSummary',
      `Recognition summary must be ${CHAR_LIMITS.summary} characters or fewer.`,
    );
  }

  if (errors.length > 0 || state.winnerIndex === null) {
    return {
      valid: false,
      errors,
      fieldErrors,
      normalized: null,
    };
  }

  const winnerNominee = normalizedNominees[state.winnerIndex];
  if (!winnerNominee) {
    addError('winnerIndex', 'Selected winner does not match a valid nominee slot.');
    return { valid: false, errors, fieldErrors, normalized: null };
  }

  const normalized: NormalizedRecognitionData = {
    recognitionPeriod: trimmedPeriod.length > 0 ? trimmedPeriod : undefined,
    nominees: normalizedNominees,
    winner: {
      slotIndex: state.winnerIndex,
      name: winnerNominee.name,
      photo: winnerNominee.photo,
      storeDepartment: trimmedStore,
      category: trimmedCategory,
      summary: trimmedSummary,
    },
  };

  return {
    valid: true,
    errors: [],
    fieldErrors: {},
    normalized,
  };
}
