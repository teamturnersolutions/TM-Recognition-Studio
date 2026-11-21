import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  parseRecognitionJson,
  type ImportedRecognitionDraft,
} from '../import/jsonImporter';
import { processPhotoUrl, releaseUploadedPhoto } from '../media/photoProcessor';
import {
  type AppView,
  type NomineeInput,
  type RecognitionSessionState,
  type SixNominees,
  type UploadedPhoto,
  type ValidationResult,
} from '../types/recognition';
import { validateRecognition } from '../validation/validateRecognition';

export type SixUrlDrafts = [string, string, string, string, string, string];

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

export function createEmptyUrlDrafts(): SixUrlDrafts {
  return ['', '', '', '', '', ''];
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

export interface JsonImportSummary {
  populatedNominees: number;
  photoUrlsRequested: number;
  photoUrlsLoaded: number;
  warnings: string[];
}

export interface RecognitionSessionController {
  state: RecognitionSessionState;
  view: AppView;
  showValidation: boolean;
  validation: ValidationResult;
  photoErrors: Record<number, string>;
  nomineeUrlDrafts: SixUrlDrafts;
  hasContent: boolean;
  setView: (view: AppView) => void;
  setSelectedTemplateId: (templateId: string) => void;
  setRecognitionPeriod: (value: string) => void;
  setNomineeName: (index: number, name: string) => void;
  setNomineePhoto: (index: number, photo: UploadedPhoto | null) => void;
  setNomineePhotoError: (index: number, error: string | null) => void;
  setNomineeUrlDraft: (index: number, value: string) => void;
  setWinnerIndex: (index: number) => void;
  setWinnerStoreDepartment: (value: string) => void;
  setWinnerCategory: (value: string) => void;
  setWinnerSummary: (value: string) => void;
  importFromJsonText: (
    rawText: string,
    availableTemplateIds?: string[],
  ) => Promise<JsonImportSummary>;
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
  const [nomineeUrlDrafts, setNomineeUrlDrafts] = useState<SixUrlDrafts>(() =>
    createEmptyUrlDrafts(),
  );

  // Monotonic generation counter to ignore stale async URL loads after Reset or a newer import
  const sessionGenerationRef = useRef(0);

  // Track active photos in a ref so unmount cleanup revokes every ObjectURL reliably
  const activePhotosRef = useRef<Array<UploadedPhoto | null>>([]);
  activePhotosRef.current = state.nominees.map((nominee) => nominee.photo);

  useEffect(() => {
    return () => {
      sessionGenerationRef.current += 1;
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

  const setNomineeUrlDraft = useCallback((index: number, value: string) => {
    setNomineeUrlDrafts((prev) => {
      const next = [...prev] as SixUrlDrafts;
      next[index] = value;
      return next;
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
    setNomineeUrlDrafts((prev) => {
      const next = [...prev] as SixUrlDrafts;
      next[index] = photo?.sourceUrl ?? '';
      return next;
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

  const applyDraftFields = useCallback(
    (draft: ImportedRecognitionDraft, availableTemplateIds?: string[]) => {
      setState((prev) => {
        for (const nominee of prev.nominees) {
          releaseUploadedPhoto(nominee.photo);
        }

        const nextTemplateId =
          draft.selectedTemplateId &&
          (!availableTemplateIds || availableTemplateIds.includes(draft.selectedTemplateId))
            ? draft.selectedTemplateId
            : prev.selectedTemplateId;

        const nextNominees = draft.nominees.map((entry, idx): NomineeInput => ({
          id: `nominee-${idx + 1}`,
          name: entry.name,
          photo: null,
        })) as SixNominees;

        return {
          selectedTemplateId: nextTemplateId,
          recognitionPeriod: draft.recognitionPeriod ?? '',
          nominees: nextNominees,
          winnerIndex: draft.winnerIndex,
          winnerStoreDepartment: draft.winnerStoreDepartment ?? '',
          winnerCategory: draft.winnerCategory ?? '',
          winnerSummary: draft.winnerSummary ?? '',
        };
      });

      setNomineeUrlDrafts(
        draft.nominees.map((entry) => entry.photoUrl ?? '') as SixUrlDrafts,
      );
      setPhotoErrors({});
      setShowValidation(false);
      // Explicitly remain in the form view for user review
      setView('builder');
    },
    [],
  );

  const importFromJsonText = useCallback(
    async (rawText: string, availableTemplateIds?: string[]): Promise<JsonImportSummary> => {
      const draft = parseRecognitionJson(rawText);
      const generation = ++sessionGenerationRef.current;

      applyDraftFields(draft, availableTemplateIds);

      const warnings = [...draft.warnings];
      const populatedNominees = draft.nominees.filter((n) => n.name.trim().length > 0).length;

      const urlJobs = draft.nominees
        .map((entry, index) => ({ index, photoUrl: entry.photoUrl }))
        .filter((item): item is { index: number; photoUrl: string } => Boolean(item.photoUrl));

      let photoUrlsLoaded = 0;

      if (urlJobs.length > 0) {
        await Promise.all(
          urlJobs.map(async ({ index, photoUrl }) => {
            try {
              const loadedPhoto = await processPhotoUrl(photoUrl);
              if (sessionGenerationRef.current !== generation) {
                releaseUploadedPhoto(loadedPhoto);
                return;
              }
              photoUrlsLoaded += 1;
              setState((prev) => {
                const existing = prev.nominees[index]?.photo ?? null;
                if (existing && existing !== loadedPhoto) {
                  releaseUploadedPhoto(existing);
                }
                const updated = prev.nominees.map((nominee, idx): NomineeInput =>
                  idx === index ? { ...nominee, photo: loadedPhoto } : nominee,
                ) as SixNominees;
                return { ...prev, nominees: updated };
              });
            } catch (error) {
              if (sessionGenerationRef.current !== generation) {
                return;
              }
              const msg =
                error instanceof Error ? error.message : 'Unable to load image from URL.';
              setNomineePhotoError(index, msg);
              warnings.push(`Nominee ${index + 1} photo URL failed to load.`);
            }
          }),
        );
      }

      return {
        populatedNominees,
        photoUrlsRequested: urlJobs.length,
        photoUrlsLoaded,
        warnings,
      };
    },
    [applyDraftFields, setNomineePhotoError],
  );

  const attemptPreview = useCallback((): boolean => {
    setShowValidation(true);
    if (validation.valid) {
      setView('preview');
      return true;
    }
    return false;
  }, [validation.valid]);

  const resetSession = useCallback(() => {
    sessionGenerationRef.current += 1;
    setState((prev) => {
      for (const nominee of prev.nominees) {
        releaseUploadedPhoto(nominee.photo);
      }
      return createInitialSessionState(prev.selectedTemplateId);
    });
    setNomineeUrlDrafts(createEmptyUrlDrafts());
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
    nomineeUrlDrafts,
    hasContent,
    setView,
    setSelectedTemplateId,
    setRecognitionPeriod,
    setNomineeName,
    setNomineePhoto,
    setNomineePhotoError,
    setNomineeUrlDraft,
    setWinnerIndex,
    setWinnerStoreDepartment,
    setWinnerCategory,
    setWinnerSummary,
    importFromJsonText,
    attemptPreview,
    resetSession,
  };
}
