import { useRef, useState, type ChangeEvent } from 'react';
import { processPhotoFile } from '../media/photoProcessor';
import {
  CHAR_LIMITS,
  type NomineeInput,
  type UploadedPhoto,
} from '../types/recognition';

interface NomineeCardProps {
  index: number;
  nominee: NomineeInput;
  isWinner: boolean;
  nameError?: string;
  photoError?: string;
  onNameChange: (name: string) => void;
  onPhotoChange: (photo: UploadedPhoto | null) => void;
  onPhotoError: (error: string | null) => void;
  onSelectWinner: () => void;
}

export function NomineeCard({
  index,
  nominee,
  isWinner,
  nameError,
  photoError,
  onNameChange,
  onPhotoChange,
  onPhotoError,
  onSelectWinner,
}: NomineeCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const remaining = CHAR_LIMITS.nomineeName - nominee.name.length;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset input value so selecting the same file again triggers onChange
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsProcessing(true);
    onPhotoError(null);
    try {
      const processed = await processPhotoFile(file);
      onPhotoChange(processed);
    } catch (error) {
      onPhotoError(error instanceof Error ? error.message : 'Unable to process image file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-xl border bg-slate-900 p-4 shadow-sm transition ${
        isWinner
          ? 'border-[#d61f1f] ring-2 ring-[#b90404]/40'
          : nameError
            ? 'border-red-500/70'
            : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          Nominee {index + 1}
        </span>

        <button
          type="button"
          onClick={onSelectWinner}
          aria-pressed={isWinner}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
            isWinner
              ? 'bg-[#b90404] text-white shadow-xs'
              : 'border border-slate-700 bg-slate-800 text-slate-200 hover:border-red-500/60 hover:text-white'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isWinner ? 'bg-amber-300' : 'bg-slate-500'}`}
          />
          {isWinner ? 'Selected Winner' : 'Select as Winner'}
        </button>
      </div>

      {/* Photo Preview Area */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
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
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
            >
              {isProcessing
                ? 'Loading…'
                : nominee.photo
                  ? 'Replace Photo'
                  : 'Upload Photo'}
            </button>
            {nominee.photo && (
              <button
                type="button"
                onClick={() => onPhotoChange(null)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/60 hover:bg-red-950/60 hover:text-red-200"
              >
                Remove
              </button>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">
            {nominee.photo
              ? `${nominee.photo.fileName} (${nominee.photo.naturalWidth}×${nominee.photo.naturalHeight})`
              : 'Optional · Uses placeholder if omitted'}
          </p>
        </div>
      </div>

      {photoError && (
        <p
          role="alert"
          className="mb-2.5 rounded-md border border-red-800/70 bg-red-950/60 px-2.5 py-1.5 text-xs text-red-200"
        >
          {photoError}
        </p>
      )}

      {/* Nominee Name Input */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor={`nominee-name-${index}`}
            className="text-xs font-semibold text-slate-200"
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
              : 'border-slate-700 focus:border-slate-500 focus:ring-slate-700'
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
