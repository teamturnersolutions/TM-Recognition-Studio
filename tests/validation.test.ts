import { describe, expect, it } from 'vitest';
import { createInitialSessionState } from '../src/state/useRecognitionSession';
import { CHAR_LIMITS, type RecognitionSessionState, type UploadedPhoto } from '../src/types/recognition';
import { validatePhotoFile, validateRecognition } from '../src/validation/validateRecognition';

function createValidSession(): RecognitionSessionState {
  const state = createInitialSessionState();
  const names = [
    'Jordan Rivera',
    'Avery Chen',
    'Marcus Patel',
    'Elena Morales',
    'Devon Brooks',
    'Priya Nair',
  ];
  names.forEach((name, idx) => {
    const slot = state.nominees[idx];
    if (slot) {
      slot.name = name;
    }
  });
  state.winnerIndex = 2;
  state.winnerStoreDepartment = 'Club #104 - Front End';
  state.winnerCategory = 'Go the Extra Mile';
  state.winnerSummary =
    'Consistently supports teammates during peak weekend traffic and delivers warm, efficient member checkout experiences.';
  state.recognitionPeriod = 'November 2026';
  return state;
}

describe('validateRecognition', () => {
  it('passes for 6 valid nominees without photos and inherits winner name & photo', () => {
    const session = createValidSession();
    const mockPhoto: UploadedPhoto = {
      fileName: 'marcus.jpg',
      mimeType: 'image/jpeg',
      objectUrl: 'blob:mock-marcus',
      source: {} as HTMLImageElement,
      naturalWidth: 800,
      naturalHeight: 1000,
    };
    session.nominees[2].photo = mockPhoto;

    const result = validateRecognition(session);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.normalized).not.toBeNull();
    expect(result.normalized?.nominees).toHaveLength(6);
    expect(result.normalized?.winner.slotIndex).toBe(2);
    expect(result.normalized?.winner.name).toBe('Marcus Patel');
    expect(result.normalized?.winner.photo).toBe(mockPhoto.source);
    expect(result.normalized?.recognitionPeriod).toBe('November 2026');
  });

  it('fails when any nominee name is blank or whitespace', () => {
    const session = createValidSession();
    session.nominees[4].name = '   ';

    const result = validateRecognition(session);

    expect(result.valid).toBe(false);
    expect(result.normalized).toBeNull();
    expect(result.fieldErrors['nominee.4.name']).toContain('Nominee 5 name is required');
  });

  it('fails when no winner is selected', () => {
    const session = createValidSession();
    session.winnerIndex = null;

    const result = validateRecognition(session);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors.winnerIndex).toBeDefined();
  });

  it('allows omitting Store / Department while requiring Recognized for and Summary', () => {
    const session = createValidSession();
    session.winnerStoreDepartment = '';

    const okResult = validateRecognition(session);
    expect(okResult.valid).toBe(true);

    session.winnerCategory = '   ';
    session.winnerSummary = '';

    const failResult = validateRecognition(session);

    expect(failResult.valid).toBe(false);
    expect(failResult.fieldErrors.winnerStoreDepartment).toBeUndefined();
    expect(failResult.fieldErrors.winnerCategory).toContain('Recognized for is required');
    expect(failResult.fieldErrors.winnerSummary).toBeDefined();
  });

  it('enforces character limits across fields', () => {
    const session = createValidSession();
    session.nominees[0].name = 'A'.repeat(CHAR_LIMITS.nomineeName + 1);
    session.winnerSummary = 'B'.repeat(CHAR_LIMITS.summary + 1);

    const result = validateRecognition(session);

    expect(result.valid).toBe(false);
    expect(result.fieldErrors['nominee.0.name']).toContain(`${CHAR_LIMITS.nomineeName}`);
    expect(result.fieldErrors.winnerSummary).toContain(`${CHAR_LIMITS.summary}`);
  });
});

describe('validatePhotoFile', () => {
  it('accepts JPG, JPEG, PNG, and WebP files within size limits', () => {
    expect(validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 1024 }).valid).toBe(true);
    expect(validatePhotoFile({ name: 'b.jpeg', type: '', size: 2048 }).valid).toBe(true);
    expect(validatePhotoFile({ name: 'c.png', type: 'image/png', size: 4096 }).valid).toBe(true);
    expect(validatePhotoFile({ name: 'd.webp', type: 'image/webp', size: 4096 }).valid).toBe(true);
  });

  it('rejects unsupported file formats, empty files, and oversized files', () => {
    expect(validatePhotoFile({ name: 'doc.pdf', type: 'application/pdf', size: 1024 }).valid).toBe(
      false,
    );
    expect(validatePhotoFile({ name: 'empty.jpg', type: 'image/jpeg', size: 0 }).valid).toBe(false);
    expect(
      validatePhotoFile({ name: 'huge.png', type: 'image/png', size: 25 * 1024 * 1024 }).valid,
    ).toBe(false);
  });
});
