import { useEffect, useRef, useState } from 'react';
import { renderSlide } from '../engine/slideRenderer';
import { exportCombinedPdf } from '../export/pdfExporter';
import { exportSlidePng } from '../export/pngExporter';
import type { ValidationResult } from '../types/recognition';
import type { LoadedTemplatePackage, SlideKey } from '../types/template';

interface PreviewExportViewProps {
  validation: ValidationResult;
  activeTemplate: LoadedTemplatePackage;
  onReturnToEdit: () => void;
}

export function PreviewExportView({
  validation,
  activeTemplate,
  onReturnToEdit,
}: PreviewExportViewProps) {
  const [activeSlide, setActiveSlide] = useState<SlideKey>('nominees');
  const [exporting, setExporting] = useState<'nominees' | 'winner' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (!validation.valid || !validation.normalized) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    let cancelled = false;
    const draw = async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
      if (cancelled || !canvasRef.current || !validation.normalized) {
        return;
      }
      renderSlide(canvasRef.current, validation.normalized, activeTemplate, activeSlide);
    };

    void draw();

    return () => {
      cancelled = true;
    };
  }, [validation, activeTemplate, activeSlide]);

  // Clear preview render buffer on unmount
  useEffect(() => {
    const canvas = canvasRef.current;
    return () => {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, []);

  if (!validation.valid || !validation.normalized) {
    return (
      <section className="rounded-xl border border-amber-800/70 bg-slate-900 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-white">Recognition Data Incomplete</h2>
        <p className="mt-1 text-sm text-slate-300">
          Complete all required fields in the Recognition Builder before previewing or exporting
          slides.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-300">
          {validation.errors.map((err, i) => (
            <li key={`${err.field}-${i}`}>{err.message}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onReturnToEdit}
          className="mt-5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          &larr; Return to Recognition Builder
        </button>
      </section>
    );
  }

  const normalizedData = validation.normalized;
  const { width, height } = activeTemplate.manifest.canvas;

  const handleExportPng = async (slideKey: SlideKey) => {
    setExportError(null);
    setExportSuccess(null);
    setExporting(slideKey);
    try {
      await exportSlidePng(normalizedData, activeTemplate, slideKey);
      setExportSuccess(
        slideKey === 'nominees'
          ? 'Downloaded Slide 1 PNG (1920 × 1080).'
          : 'Downloaded Slide 2 PNG (1920 × 1080).',
      );
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'PNG export failed.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExportError(null);
    setExportSuccess(null);
    setExporting('pdf');
    try {
      await exportCombinedPdf(normalizedData, activeTemplate);
      setExportSuccess('Downloaded combined 2-page PDF (16:9 widescreen).');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'PDF export failed.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top toolbar: Slide switcher + Return to editing */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div role="tablist" aria-label="Slide selector" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeSlide === 'nominees'}
            onClick={() => setActiveSlide('nominees')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeSlide === 'nominees'
                ? 'bg-[#b90404] text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Slide 1: {activeTemplate.manifest.slides.nominees.title}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSlide === 'winner'}
            onClick={() => setActiveSlide('winner')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeSlide === 'winner'
                ? 'bg-[#b90404] text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            Slide 2: {activeTemplate.manifest.slides.winner.title}
          </button>
        </div>

        <button
          type="button"
          onClick={onReturnToEdit}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
        >
          &larr; Return to Editing
        </button>
      </div>

      {/* Live 1920x1080 deterministic preview stage */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span className="font-semibold text-white">
            {activeSlide === 'nominees'
              ? `Slide 1 of 2 — ${activeTemplate.manifest.slides.nominees.title}`
              : `Slide 2 of 2 — ${activeTemplate.manifest.slides.winner.title}`}
            {normalizedData.recognitionPeriod ? ` (${normalizedData.recognitionPeriod})` : ''}
          </span>
          <span className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-200">
            Rendered Canvas: {width} &times; {height} px &middot; 16:9
          </span>
        </div>

        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/10">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            aria-label={
              activeSlide === 'nominees'
                ? 'Preview of BJ’s Team Member Nominees slide'
                : 'Preview of BJ’s Team Member of the Month slide'
            }
            className="block aspect-video h-auto w-full"
          />
        </div>
      </section>

      {/* Export Actions */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Export Finished Slides</h2>
            <p className="text-xs text-slate-400">
              Exports are generated directly from the fixed {width} &times; {height} composition
              engine with zero UI chrome.
            </p>
          </div>
          <span className="rounded-full bg-emerald-950/70 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-800">
            Export Resolution: {width} &times; {height} (16:9)
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => handleExportPng('nominees')}
            className="flex flex-col items-start rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-left transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-60"
          >
            <span className="text-sm font-semibold text-white">
              {exporting === 'nominees' ? 'Exporting Slide 1…' : 'Download Slide 1 (PNG)'}
            </span>
            <span className="mt-0.5 text-xs text-slate-400">
              Nominees 3&times;2 Grid &middot; 1920&times;1080
            </span>
          </button>

          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => handleExportPng('winner')}
            className="flex flex-col items-start rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-left transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-60"
          >
            <span className="text-sm font-semibold text-white">
              {exporting === 'winner' ? 'Exporting Slide 2…' : 'Download Slide 2 (PNG)'}
            </span>
            <span className="mt-0.5 text-xs text-slate-400">
              Team Member of the Month &middot; 1920&times;1080
            </span>
          </button>

          <button
            type="button"
            disabled={exporting !== null}
            onClick={handleExportPdf}
            className="flex flex-col items-start rounded-lg bg-[#b90404] px-4 py-3 text-left text-white shadow-xs transition hover:bg-[#d11313] disabled:opacity-60"
          >
            <span className="text-sm font-semibold">
              {exporting === 'pdf' ? 'Building PDF…' : 'Download Combined PDF'}
            </span>
            <span className="mt-0.5 text-xs text-red-100">
              Both slides &middot; 2 pages (16:9)
            </span>
          </button>
        </div>

        {exportSuccess && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-800/70 bg-emerald-950/60 px-3 py-2 text-xs font-medium text-emerald-200"
          >
            {exportSuccess}
          </p>
        )}

        {exportError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-800/70 bg-red-950/60 px-3 py-2 text-xs font-medium text-red-200"
          >
            {exportError}
          </p>
        )}
      </section>
    </div>
  );
}
