import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecognitionSession } from '../src/state/useRecognitionSession';
import type { UploadedPhoto } from '../src/types/recognition';

describe('useRecognitionSession reset and non-persistence behavior', () => {
  const revokeSpy = vi.fn();

  beforeEach(() => {
    if (typeof window.localStorage?.clear === 'function') {
      window.localStorage.clear();
    }
    if (typeof window.sessionStorage?.clear === 'function') {
      window.sessionStorage.clear();
    }
    revokeSpy.mockReset();
    vi.stubGlobal('URL', {
      ...URL,
      revokeObjectURL: revokeSpy,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears all form fields, revokes all uploaded photo ObjectURLs, returns to builder, and writes nothing to browser storage', () => {
    const { result } = renderHook(() => useRecognitionSession('bjs-spotlight'));

    const mockPhotos: UploadedPhoto[] = [0, 1].map((idx) => ({
      fileName: `tm-${idx}.jpg`,
      mimeType: 'image/jpeg',
      objectUrl: `blob:tm-photo-${idx}`,
      source: {} as HTMLImageElement,
      naturalWidth: 600,
      naturalHeight: 600,
    }));

    act(() => {
      result.current.setRecognitionPeriod('November 2026');
      for (let i = 0; i < 6; i++) {
        result.current.setNomineeName(i, `Team Member ${i + 1}`);
      }
      result.current.setNomineePhoto(0, mockPhotos[0]!);
      result.current.setNomineePhoto(1, mockPhotos[1]!);
      result.current.setWinnerIndex(0);
      result.current.setWinnerStoreDepartment('Club #205 - Bakery');
      result.current.setWinnerCategory('Integrity');
      result.current.setWinnerSummary('Led holiday bakery prep ahead of schedule with zero errors.');
    });

    act(() => {
      const ok = result.current.attemptPreview();
      expect(ok).toBe(true);
    });

    expect(result.current.view).toBe('preview');
    expect(result.current.hasContent).toBe(true);

    // Trigger Reset
    act(() => {
      result.current.resetSession();
    });

    expect(result.current.view).toBe('builder');
    expect(result.current.hasContent).toBe(false);
    expect(result.current.showValidation).toBe(false);
    expect(result.current.state.recognitionPeriod).toBe('');
    expect(result.current.state.winnerIndex).toBeNull();
    expect(result.current.state.winnerStoreDepartment).toBe('');
    expect(result.current.state.winnerCategory).toBe('');
    expect(result.current.state.winnerSummary).toBe('');
    expect(result.current.state.nominees.every((n) => n.name === '' && n.photo === null)).toBe(true);

    expect(revokeSpy).toHaveBeenCalledWith('blob:tm-photo-0');
    expect(revokeSpy).toHaveBeenCalledWith('blob:tm-photo-1');

    // Verify strict zero persistence in browser storage
    expect(window.localStorage?.length ?? 0).toBe(0);
    expect(window.sessionStorage?.length ?? 0).toBe(0);
  });

  it('revokes replaced photo URLs immediately when replacing or removing an individual photo', () => {
    const { result } = renderHook(() => useRecognitionSession('bjs-spotlight'));

    const firstPhoto: UploadedPhoto = {
      fileName: 'old.png',
      mimeType: 'image/png',
      objectUrl: 'blob:old-photo',
      source: {} as HTMLImageElement,
      naturalWidth: 400,
      naturalHeight: 400,
    };
    const secondPhoto: UploadedPhoto = {
      fileName: 'new.png',
      mimeType: 'image/png',
      objectUrl: 'blob:new-photo',
      source: {} as HTMLImageElement,
      naturalWidth: 400,
      naturalHeight: 400,
    };

    act(() => {
      result.current.setNomineePhoto(3, firstPhoto);
    });
    act(() => {
      result.current.setNomineePhoto(3, secondPhoto);
    });
    expect(revokeSpy).toHaveBeenCalledWith('blob:old-photo');

    act(() => {
      result.current.setNomineePhoto(3, null);
    });
    expect(revokeSpy).toHaveBeenCalledWith('blob:new-photo');
  });
});
