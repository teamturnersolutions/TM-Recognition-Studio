import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { releaseUploadedPhoto } from '../media/photoProcessor';
import {
  type AppView,
  type NomineeInput,
  type RecognitionSessionState,
  type SixNominees,
  type UploadedPhoto,
  type ValidationResult,
} from '../types/recognition';
import { validateRecognition } from '../validation/validateRecognition';

export function createInitialNominees(): SixNominees {
  return [
    { id: 'nominee-1', name: '', photo: null },
    { id: 'nominee-2', name: '', photo: null },
    { id: 'nominee-3', name: '', photo: null },
    { id: 'nominee-4', name: '', photo: null },
    { id: 'nominee-5', name: '', photo: null },
    { id: 'nominee-6', name: '', photo: null },
  ];
}

export function createInitialSessionState(templateId = 'bjs-spotlight'): RecognitionSessionState {
  return {
    selectedTemplateId: templateId,
    recognitionPeriod: '',
    nominees: createInitialNominees(),
    winnerIndex: null,
    winnerStoreDepartment: '',
    winnerCategory: '',
    winnerSummary: '',
  };
}

export function hasUnsavedRecognitionContent(state: RecognitionSessionState): boolean {
  return (
    state.recognitionPeriod.trim().length > 0 ||
    state.winnerIndex !== null ||
    state.winnerStoreDepartment.trim().length > 0 ||
    state.winnerCategory.trim().length > 0 ||
    state.winnerSummary.trim().length > 0 ||
    state.nominees.some((n) => n.name.trim().length > 0 || n.photo !== null)
  );
}

export interface RecognitionSessionController {
  state: RecognitionSessionState;
  view: AppView;
  showValidation: boolean;
  validation: ValidationResult;
  photoErrors: Record<number, string>;
  hasContent: boolean;
  setView: (view: AppView) => void;
  setSelectedTemplateId: (templateId: string) => void;
  setRecognitionPeriod: (value: string) => void;
  setNomineeName: (index: number, name: string) => void;
  setNomineePhoto: (index: number, photo: UploadedPhoto | null) => void;
  setNomineePhotoError: (index: number, error: string | null) => void;
  setWinnerIndex: (index: number) => void;
  setWinnerStoreDepartment: (value: string) => void;
  setWinnerCategory: (value: string) => void;
  setWinnerSummary: (value: string) => void;
  attemptPreview: () => boolean;
  resetSession: () => void;
}

export function useRecognitionSession(defaultTemplateId = 'bjs-spotlight'): RecognitionSessionController {
  const [state, setState] = useState<RecognitionSessionState>(() =>
    createInitialSessionState(defaultTemplateId),
  );
  const [view, setView] = useState<AppView>('builder');
  const [showValidation, setShowValidation] = useState(false);
  const [photoErrors, setPhotoErrors] = useState<Record<number, string>>({});

  // Track active photos in a ref so unmount cleanup revokes every ObjectURL reliably
  const activePhotosRef = useRef<Array<UploadedPhoto | null>>([]);
  activePhotosRef.current = state.nominees.map((nominee) => nominee.photo);

  useEffect(() => {
    return () => {
      for (const photo of activePhotosRef.current) {
        releaseUploadedPhoto(photo);
      }
    };
  }, []);

  const validation = useMemo(() => validateRecognition(state), [state]);
  const hasContent = useMemo(() => hasUnsavedRecognitionContent(state), [state]);

  const setSelectedTemplateId = useCallback((templateId: string) => {
    setState((prev) => ({ ...prev, selectedTemplateId: templateId }));
  }, []);

  const setRecognitionPeriod = useCallback((value: string) => {
    setState((prev) => ({ ...prev, recognitionPeriod: value }));
  }, []);

  const setNomineeName = useCallback((index: number, name: string) => {
    setState((prev) => {
      const updated = prev.nominees.map((nominee, idx): NomineeInput =>
        idx === index ? { ...nominee, name } : nominee,
      ) as SixNominees;
      return { ...prev, nominees: updated };
    });
  }, []);

  const setNomineePhoto = useCallback((index: number, photo: UploadedPhoto | null) => {
    setState((prev) => {
      const existing = prev.nominees[index]?.photo ?? null;
      if (existing && existing !== photo) {
        releaseUploadedPhoto(existing);
      }
      const updated = prev.nominees.map((nominee, idx): NomineeInput =>
        idx === index ? { ...nominee, photo } : nominee,
      ) as SixNominees;
      return { ...prev, nominees: updated };
    });
    setPhotoErrors((prev) => {
      if (!(index in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const setNomineePhotoError = useCallback((index: number, error: string | null) => {
    setPhotoErrors((prev) => {
      if (!error) {
        const next = { ...prev };
        delete next[index];
        return next;
      }
      return { ...prev, [index]: error };
    });
  }, []);

  const setWinnerIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, winnerIndex: index }));
  }, []);

  const setWinnerStoreDepartment = useCallback((value: string) => {
    setState((prev) => ({ ...prev, winnerStoreDepartment: value }));
  }, []);

  const setWinnerCategory = useCallback((value: string) => {
    setState((prev) => ({ ...prev, winnerCategory: value }));
  }, []);

  const setWinnerSummary = useCallback((value: string) => {
    setState((prev) => ({ ...prev, winnerSummary: value }));
  }, []);

  const attemptPreview = useCallback((): boolean => {
    setShowValidation(true);
    if (validation.valid) {
      setView('preview');
      return true;
    }
    return false;
  }, [validation.valid]);

  const resetSession = useCallback(() => {
    setState((prev) => {
      for (const nominee of prev.nominees) {
        releaseUploadedPhoto(nominee.photo);
      }
      return createInitialSessionState(prev.selectedTemplateId);
    });
    setPhotoErrors({});
    setShowValidation(false);
    setView('builder');
  }, []);

  return {
    state,
    view,
    showValidation,
    validation,
    photoErrors,
    hasContent,
    setView,
    setSelectedTemplateId,
    setRecognitionPeriod,
    setNomineeName,
    setNomineePhoto,
    setNomineePhotoError,
    setWinnerIndex,
    setWinnerStoreDepartment,
    setWinnerCategory,
    setWinnerSummary,
    attemptPreview,
    resetSession,
  };
}
