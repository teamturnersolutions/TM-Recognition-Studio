import { useRef, useState, type ChangeEvent } from 'react';
import { triggerBlobDownload } from '../export/pngExporter';
import { buildSampleRecognitionJson } from '../import/jsonImporter';
import type { RecognitionSessionController } from '../state/useRecognitionSession';
import { CHAR_LIMITS } from '../types/recognition';
import type { LoadedTemplatePackage } from '../types/template';
import { NomineeCard } from './NomineeCard';

interface BuilderViewProps {
  session: RecognitionSessionController;
  templates: LoadedTemplatePackage[];
  activeTemplate: LoadedTemplatePackage;
}

export function BuilderView({
  session,
  templates,
  activeTemplate,
}: BuilderViewProps) {
  const {
    state,
    showValidation,
    validation,
    photoErrors,
    nomineeUrlDrafts,
    setSelectedTemplateId,
    setRecognitionPeriod,
    setNomineeName,
    setNomineePhoto,
    setNomineePhotoError,
    setNomineeUrlDraft,
    setWinnerIndex,
    setWinnerCategory,
    setWinnerSummary,
    importFromJsonText,
    attemptPreview,
  } = session;

  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [importingJson, setImportingJson] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    warnings?: string[];
  } | null>(null);

  const fieldError = (key: string): string | undefined =>
    showValidation ? validation.fieldErrors[key] : undefined;

  const selectedWinner =
    state.winnerIndex !== null ? state.nominees[state.winnerIndex] ?? null : null;

  const periodRemaining = CHAR_LIMITS.recognitionPeriod - state.recognitionPeriod.length;
  const categoryRemaining = CHAR_LIMITS.category - state.winnerCategory.length;
  const summaryRemaining = CHAR_LIMITS.summary - state.winnerSummary.length;

  const handleJsonUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setImportingJson(true);
    setImportFeedback(null);
    try {
      const text = await file.text();
      const summary = await importFromJsonText(
        text,
        templates.map((t) => t.manifest.id),
      );

      const photoDetail =
        summary.photoUrlsRequested > 0
          ? ` Loaded ${summary.photoUrlsLoaded}/${summary.photoUrlsRequested} photo URL(s).`
          : '';

      setImportFeedback({
        type: 'success',
        message: `Populated form from "${file.name}" (${summary.populatedNominees}/6 nominees).${photoDetail} Review fields below before previewing slides.`,
        warnings: summary.warnings,
      });
    } catch (error) {
      setImportFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to import JSON file.',
      });
    } finally {
      setImportingJson(false);
    }
  };

  const handleDownloadSampleJson = () => {
    const blob = new Blob([buildSampleRecognitionJson()], { type: 'application/json' });
    triggerBlobDownload(blob, 'tm-spotlight-sample.json');
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: Presentation Setup & JSON Auto-Populate (Sky/Steel Accent) */}
      <section
        aria-labelledby="setup-heading"
        className="rounded-2xl border border-sky-500/25 border-l-4 border-l-sky-500 bg-[#0d1726] p-5 shadow-md sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/90 pb-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-xs font-bold text-sky-300 ring-1 ring-sky-500/35">
              01
            </span>
            <div>
              <h2 id="setup-heading" className="text-base font-bold text-white">
                Presentation Setup &amp; Quick Import
              </h2>
              <p className="text-xs text-slate-400">
                Choose the slide template, optional recognition period, or import a JSON file to
                auto-populate this form for review.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-xs font-medium text-sky-200">
            Output: {activeTemplate.manifest.canvas.width} &times;{' '}
            {activeTemplate.manifest.canvas.height} (16:9)
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="template-select"
              className="mb-1 block text-xs font-semibold text-slate-200"
            >
              Active Template
            </label>
            <select
              id="template-select"
              value={state.selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            >
              {templates.map((tpl) => (
                <option key={tpl.manifest.id} value={tpl.manifest.id}>
                  {tpl.manifest.name} (v{tpl.manifest.version})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {activeTemplate.manifest.description ?? 'Read-only versioned presentation template.'}
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="recognition-period"
                className="text-xs font-semibold text-slate-200"
              >
                Recognition Period <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {periodRemaining} left
              </span>
            </div>
            <input
              id="recognition-period"
              type="text"
              maxLength={CHAR_LIMITS.recognitionPeriod}
              value={state.recognitionPeriod}
              onChange={(e) => setRecognitionPeriod(e.target.value)}
              placeholder="e.g., November 2026"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            />
            <p className="mt-1 text-xs text-slate-400">
              Used for session labeling and exported filenames. Does not alter slide artwork.
            </p>
          </div>
        </div>

        {/* JSON Auto-Populate Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/20 bg-slate-950/75 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-sky-200">Auto-Populate from JSON</p>
            <p className="text-[11px] text-slate-400">
              Upload a recognition JSON file to fill all nominee names, photo URLs, and winner
              fields directly into the form for review.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleJsonUpload}
              className="hidden"
              aria-label="Import recognition JSON file"
            />
            <button
              type="button"
              onClick={handleDownloadSampleJson}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            >
              Sample JSON
            </button>
            <button
              type="button"
              disabled={importingJson}
              onClick={() => jsonInputRef.current?.click()}
              className="rounded-lg border border-sky-500/50 bg-sky-600/20 px-3.5 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-600/35 hover:text-white disabled:opacity-50"
            >
              {importingJson ? 'Importing…' : 'Import JSON File'}
            </button>
          </div>
        </div>

        {importFeedback && (
          <div
            role={importFeedback.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 rounded-lg border px-3.5 py-2.5 text-xs ${
              importFeedback.type === 'error'
                ? 'border-red-800/70 bg-red-950/60 text-red-200'
                : 'border-emerald-700/60 bg-emerald-950/50 text-emerald-200'
            }`}
          >
            <p className="font-medium">{importFeedback.message}</p>
            {importFeedback.warnings && importFeedback.warnings.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-amber-200">
                {importFeedback.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* SECTION 2: Six Team Member Nominees (Amber/Gold Accent) */}
      <section
        aria-labelledby="nominees-heading"
        className="rounded-2xl border border-amber-500/25 border-l-4 border-l-amber-500 bg-[#141310] p-5 shadow-md sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/90 pb-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-300 ring-1 ring-amber-500/35">
              02
            </span>
            <div>
              <h2 id="nominees-heading" className="text-base font-bold text-white">
                Slide 1 &mdash; Six Team Member Nominees
              </h2>
              <p className="text-xs text-slate-400">
                Enter all six nominees, upload photos or paste image URLs for live preview, and
                select one nominee as the Team Member of the Month.
              </p>
            </div>
          </div>

          {fieldError('winnerIndex') && (
            <span
              role="alert"
              className="rounded-md border border-red-800/70 bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-200"
            >
              {fieldError('winnerIndex')}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.nominees.map((nominee, idx) => (
            <NomineeCard
              key={nominee.id}
              index={idx}
              nominee={nominee}
              urlDraft={nomineeUrlDrafts[idx] ?? ''}
              isWinner={state.winnerIndex === idx}
              nameError={fieldError(`nominee.${idx}.name`)}
              photoError={photoErrors[idx]}
              onNameChange={(name) => setNomineeName(idx, name)}
              onPhotoChange={(photo) => setNomineePhoto(idx, photo)}
              onPhotoError={(err) => setNomineePhotoError(idx, err)}
              onUrlDraftChange={(val) => setNomineeUrlDraft(idx, val)}
              onSelectWinner={() => setWinnerIndex(idx)}
            />
          ))}
        </div>
      </section>

      {/* SECTION 3: Slide 2 Winner Details (BJ's Crimson Accent) */}
      <section
        aria-labelledby="winner-heading"
        className="rounded-2xl border border-red-900/55 border-l-4 border-l-[#d61f1f] bg-[#180d11] p-5 shadow-md sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-red-950/80 pb-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#b90404]/25 text-xs font-bold text-red-300 ring-1 ring-red-500/40">
              03
            </span>
            <div>
              <h2 id="winner-heading" className="text-base font-bold text-white">
                Slide 2 &mdash; Team Member of the Month Details
              </h2>
              <p className="text-xs text-slate-400">
                Winner name and photo are inherited automatically from the nominee selected in
                Section 02.
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 ${
              selectedWinner
                ? 'border-[#d61f1f]/60 bg-red-950/55'
                : 'border-dashed border-slate-700 bg-slate-950/80'
            }`}
          >
            {selectedWinner?.photo ? (
              <img
                src={selectedWinner.photo.objectUrl}
                alt="Selected winner portrait"
                className="h-10 w-10 rounded-md object-cover object-[50%_35%]"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-400">
                {selectedWinner ? `#${(state.winnerIndex ?? 0) + 1}` : '—'}
              </div>
            )}
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-red-300/80 uppercase">
                Inherited Winner
              </div>
              <div className="text-sm font-bold text-white">
                {selectedWinner
                  ? selectedWinner.name.trim() || `Nominee ${(state.winnerIndex ?? 0) + 1} (unnamed)`
                  : 'No nominee selected yet'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="winner-category"
                className="text-xs font-semibold text-slate-200"
              >
                Recognized for: <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {categoryRemaining} left
              </span>
            </div>
            <input
              id="winner-category"
              type="text"
              maxLength={CHAR_LIMITS.category}
              value={state.winnerCategory}
              onChange={(e) => setWinnerCategory(e.target.value)}
              placeholder="e.g., Go the Extra Mile"
              className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                fieldError('winnerCategory')
                  ? 'border-red-500/80 focus:border-red-400 focus:ring-red-900/50'
                  : 'border-slate-700 focus:border-red-500/70 focus:ring-red-500/20'
              }`}
            />
            {fieldError('winnerCategory') && (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {fieldError('winnerCategory')}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="winner-summary"
                className="text-xs font-semibold text-slate-200"
              >
                Recognition Summary <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {summaryRemaining} left
              </span>
            </div>
            <textarea
              id="winner-summary"
              rows={3}
              maxLength={CHAR_LIMITS.summary}
              value={state.winnerSummary}
              onChange={(e) => setWinnerSummary(e.target.value)}
              placeholder="Summarize the key achievements, teamwork, or member service impact..."
              className={`w-full resize-none rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
                fieldError('winnerSummary')
                  ? 'border-red-500/80 focus:border-red-400 focus:ring-red-900/50'
                  : 'border-slate-700 focus:border-red-500/70 focus:ring-red-500/20'
              }`}
            />
            {fieldError('winnerSummary') && (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {fieldError('winnerSummary')}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Validation summary & primary CTA */}
      {showValidation && !validation.valid && (
        <div
          role="alert"
          className="rounded-xl border border-red-800/70 bg-red-950/60 p-4 text-sm text-red-200"
        >
          <p className="font-semibold text-red-100">
            Please resolve the following before composing slides ({validation.errors.length}{' '}
            {validation.errors.length === 1 ? 'item' : 'items'}):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            {validation.errors.map((err, i) => (
              <li key={`${err.field}-${i}`}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/80 bg-slate-900 px-5 py-4 shadow-md">
        <p className="text-xs text-slate-400">
          All recognition data stays strictly in memory for this session and is cleared on refresh
          or reset.
        </p>
        <button
          type="button"
          onClick={attemptPreview}
          className="rounded-lg bg-[#b90404] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d11313] focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          Compose &amp; Preview Slides &rarr;
        </button>
      </div>
    </div>
  );
}
