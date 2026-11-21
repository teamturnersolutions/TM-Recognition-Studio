import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { processPhotoFile, processPhotoUrl } from '../media/photoProcessor';
import {
  CHAR_LIMITS,
  type NomineeInput,
  type UploadedPhoto,
} from '../types/recognition';

interface NomineeCardProps {
  index: number;
  nominee: NomineeInput;
  urlDraft: string;
  isWinner: boolean;
  nameError?: string;
  photoError?: string;
  onNameChange: (name: string) => void;
  onPhotoChange: (photo: UploadedPhoto | null) => void;
  onPhotoError: (error: string | null) => void;
  onUrlDraftChange: (value: string) => void;
  onSelectWinner: () => void;
}

export function NomineeCard({
  index,
  nominee,
  urlDraft,
  isWinner,
  nameError,
  photoError,
  onNameChange,
  onPhotoChange,
  onPhotoError,
  onUrlDraftChange,
  onSelectWinner,
}: NomineeCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const remaining = CHAR_LIMITS.nomineeName - nominee.name.length;
  const isBusy = isProcessingFile || isLoadingUrl;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset input value so selecting the same file again triggers onChange
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsProcessingFile(true);
    onPhotoError(null);
    try {
      const processed = await processPhotoFile(file);
      onPhotoChange(processed);
    } catch (error) {
      onPhotoError(error instanceof Error ? error.message : 'Unable to process image file.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleLoadPhotoUrl = async () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      onPhotoError('Enter an image URL starting with https:// or http://.');
      return;
    }

    setIsLoadingUrl(true);
    onPhotoError(null);
    try {
      const processed = await processPhotoUrl(trimmed);
      onPhotoChange(processed);
    } catch (error) {
      onPhotoError(error instanceof Error ? error.message : 'Unable to load image from URL.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleUrlKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleLoadPhotoUrl();
    }
  };

  return (
    <div
      className={`flex flex-col rounded-xl border bg-slate-800/90 p-4 shadow-md transition ${
        isWinner
          ? 'border-[#e02424] ring-2 ring-[#b90404]/45'
          : nameError
            ? 'border-red-500/80'
            : 'border-slate-700/90 hover:border-amber-500/40'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-300/90 uppercase">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-amber-300 ring-1 ring-amber-500/30">
            {index + 1}
          </span>
          Nominee {index + 1}
        </span>

        <button
          type="button"
          onClick={onSelectWinner}
          aria-pressed={isWinner}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
            isWinner
              ? 'bg-[#b90404] text-white shadow-xs'
              : 'border border-slate-600 bg-slate-900 text-slate-200 hover:border-red-500/60 hover:text-white'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isWinner ? 'bg-amber-300' : 'bg-slate-500'}`}
          />
          {isWinner ? 'Selected Winner' : 'Select as Winner'}
        </button>
      </div>

      {/* Live Photo Preview + Local Upload Controls */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-600 bg-slate-900">
          {nominee.photo ? (
            <img
              src={nominee.photo.objectUrl}
              alt={nominee.name ? `${nominee.name} portrait` : `Nominee ${index + 1} portrait`}
              className="h-full w-full object-cover object-[50%_35%]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              <svg
                viewBox="0 0 64 64"
                className="h-12 w-12"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="32" cy="23" r="10" />
                <path d="M14 52c3-10 11-15 18-15s15 5 18 15" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-label={`Upload photo for Nominee ${index + 1}`}
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
            >
              {isProcessingFile
                ? 'Loading…'
                : nominee.photo
                  ? 'Upload File'
                  : 'Upload Photo'}
            </button>
            {nominee.photo && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onPhotoChange(null)}
                className="rounded-md border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/60 hover:bg-red-950/60 hover:text-red-200 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="truncate text-xs text-slate-300">
            {nominee.photo
              ? `${nominee.photo.fileName} (${nominee.photo.naturalWidth}×${nominee.photo.naturalHeight})`
              : 'Optional · Upload file or paste URL'}
          </p>
        </div>
      </div>

      {/* Photo URL Input */}
      <div className="mb-3">
        <label
          htmlFor={`nominee-photo-url-${index}`}
          className="mb-1 block text-[11px] font-medium text-slate-300"
        >
          Or Image URL
        </label>
        <div className="flex gap-1.5">
          <input
            id={`nominee-photo-url-${index}`}
            type="url"
            value={urlDraft}
            onChange={(e) => onUrlDraftChange(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://example.com/photo.jpg"
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          />
          <button
            type="button"
            disabled={isBusy || urlDraft.trim().length === 0}
            onClick={() => void handleLoadPhotoUrl()}
            className="shrink-0 rounded-lg border border-sky-500/40 bg-sky-950/70 px-2.5 py-1.5 text-xs font-semibold text-sky-200 transition hover:border-sky-400 hover:bg-sky-900/70 hover:text-white disabled:opacity-40"
          >
            {isLoadingUrl ? 'Loading…' : 'Load'}
          </button>
        </div>
      </div>

      {nominee.photo?.corsRestricted && (
        <p className="mb-2.5 rounded-md border border-amber-700/60 bg-amber-950/50 px-2.5 py-1.5 text-[11px] text-amber-200">
          Preview loaded, but this URL host blocks cross-origin export. Upload the file locally if
          PNG/PDF export is blocked.
        </p>
      )}

      {photoError && (
        <p
          role="alert"
          className="mb-2.5 rounded-md border border-red-800/70 bg-red-950/60 px-2.5 py-1.5 text-xs text-red-200"
        >
          {photoError}
        </p>
      )}

      {/* Nominee Name Input */}
      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor={`nominee-name-${index}`}
            className="text-xs font-semibold text-slate-100"
          >
            Team Member Name <span className="text-red-400">*</span>
          </label>
          <span
            className={`text-[11px] tabular-nums ${
              remaining < 0 ? 'font-semibold text-red-400' : 'text-slate-400'
            }`}
          >
            {remaining} left
          </span>
        </div>
        <input
          id={`nominee-name-${index}`}
          type="text"
          maxLength={CHAR_LIMITS.nomineeName}
          value={nominee.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={`Enter nominee ${index + 1} full name`}
          className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
            nameError
              ? 'border-red-500/80 focus:border-red-400 focus:ring-red-900/50'
              : 'border-slate-600 focus:border-amber-400/70 focus:ring-amber-500/20'
          }`}
        />
        {nameError && (
          <p role="alert" className="mt-1 text-xs text-red-400">
            {nameError}
          </p>
        )}
      </div>
    </div>
  );
}
