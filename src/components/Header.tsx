import type { AppView } from '../types/recognition';

interface HeaderProps {
  view: AppView;
  canPreview: boolean;
  onSelectView: (view: AppView) => void;
  onRequestReset: () => void;
}

export function Header({
  view,
  canPreview,
  onSelectView,
  onRequestReset,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 text-white shadow-md backdrop-blur-xs">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-64.png"
            alt="BJ's TM Spotlight Studio"
            className="h-10 w-10 shrink-0 object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
              TM Spotlight Studio
            </h1>
            <p className="text-xs text-slate-400">
              Local-First Slide Compositor &middot; Session Memory Only
            </p>
          </div>
        </div>

        <nav aria-label="Workflow steps" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectView('builder')}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
              view === 'builder'
                ? 'bg-slate-800 text-white ring-1 ring-slate-600'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            1. Recognition Builder
          </button>
          <button
            type="button"
            onClick={() => onSelectView('preview')}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
              view === 'preview'
                ? 'bg-slate-800 text-white ring-1 ring-slate-600'
                : canPreview
                  ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            2. Preview &amp; Export
          </button>

          <div className="mx-1 hidden h-6 w-px bg-slate-800 sm:block" />

          <button
            type="button"
            onClick={onRequestReset}
            className="rounded-md border border-red-500/40 bg-red-950/50 px-3.5 py-2 text-sm font-medium text-red-200 transition hover:border-red-400 hover:bg-red-900/70 hover:text-white"
          >
            Reset / New Recognition
          </button>
        </nav>
      </div>
    </header>
  );
}
