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
    setSelectedTemplateId,
    setRecognitionPeriod,
    setNomineeName,
    setNomineePhoto,
    setNomineePhotoError,
    setWinnerIndex,
    setWinnerCategory,
    setWinnerSummary,
    attemptPreview,
  } = session;

  const fieldError = (key: string): string | undefined =>
    showValidation ? validation.fieldErrors[key] : undefined;

  const selectedWinner =
    state.winnerIndex !== null ? state.nominees[state.winnerIndex] ?? null : null;

  const periodRemaining = CHAR_LIMITS.recognitionPeriod - state.recognitionPeriod.length;
  const categoryRemaining = CHAR_LIMITS.category - state.winnerCategory.length;
  const summaryRemaining = CHAR_LIMITS.summary - state.winnerSummary.length;

  return (
    <div className="space-y-6">
      {/* Top configuration card: Template selection & optional period metadata */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Presentation Setup</h2>
            <p className="text-xs text-slate-400">
              Select an installed read-only slide template and optional recognition period metadata.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300">
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
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
            <p className="mt-1 text-xs text-slate-400">
              Used for session labeling and exported filenames. Does not alter slide artwork.
            </p>
          </div>
        </div>
      </section>

      {/* Nominees 3x2 Grid */}
      <section aria-labelledby="nominees-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="nominees-heading" className="text-base font-bold text-white">
              Slide 1 &mdash; Six Team Member Nominees
            </h2>
            <p className="text-xs text-slate-400">
              Enter all six nominees and select one as the Team Member of the Month. Photos are
              optional (JPG, PNG, or WebP).
            </p>
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
              isWinner={state.winnerIndex === idx}
              nameError={fieldError(`nominee.${idx}.name`)}
              photoError={photoErrors[idx]}
              onNameChange={(name) => setNomineeName(idx, name)}
              onPhotoChange={(photo) => setNomineePhoto(idx, photo)}
              onPhotoError={(err) => setNomineePhotoError(idx, err)}
              onSelectWinner={() => setWinnerIndex(idx)}
            />
          ))}
        </div>
      </section>

      {/* Slide 2: Winner Details */}
      <section
        aria-labelledby="winner-heading"
        className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="winner-heading" className="text-base font-bold text-white">
              Slide 2 &mdash; Team Member of the Month Details
            </h2>
            <p className="text-xs text-slate-400">
              Winner name and photo are inherited automatically from the nominee selected above.
            </p>
          </div>

          <div
            className={`flex items-center gap-3 rounded-lg border px-3.5 py-2 ${
              selectedWinner
                ? 'border-[#b90404]/60 bg-red-950/40'
                : 'border-dashed border-slate-700 bg-slate-950'
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
              <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
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
                  : 'border-slate-700 focus:border-slate-500 focus:ring-slate-700'
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
                  : 'border-slate-700 focus:border-slate-500 focus:ring-slate-700'
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

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-sm">
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
