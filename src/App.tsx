import { useEffect, useState } from 'react';
import { BuilderView } from './components/BuilderView';
import { Header } from './components/Header';
import { PreviewExportView } from './components/PreviewExportView';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { useRecognitionSession } from './state/useRecognitionSession';
import { loadTemplatePackage, loadTemplateRegistry } from './templates/templateLoader';
import type { AppView } from './types/recognition';
import type { LoadedTemplatePackage } from './types/template';

export function App() {
  const [templates, setTemplates] = useState<LoadedTemplatePackage[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateLoadError, setTemplateLoadError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const session = useRecognitionSession();

  useEffect(() => {
    let active = true;

    const loadAllTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const registry = await loadTemplateRegistry();
        const loaded = await Promise.all(
          registry.templates.map((entry) => loadTemplatePackage(entry.manifestPath)),
        );
        if (!active) {
          return;
        }
        setTemplates(loaded);
        const firstTemplate = loaded[0];
        if (firstTemplate) {
          session.setSelectedTemplateId(firstTemplate.manifest.id);
        }
        setTemplateLoadError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        setTemplateLoadError(
          error instanceof Error ? error.message : 'Unable to load template packages.',
        );
      } finally {
        if (active) {
          setLoadingTemplates(false);
        }
      }
    };

    void loadAllTemplates();
    return () => {
      active = false;
    };
    // Run once on initial boot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTemplate =
    templates.find((tpl) => tpl.manifest.id === session.state.selectedTemplateId) ??
    templates[0] ??
    null;

  const handleSelectView = (nextView: AppView) => {
    if (nextView === 'preview') {
      session.attemptPreview();
    } else {
      session.setView('builder');
    }
  };

  const handleConfirmReset = () => {
    session.resetSession();
    setResetModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        view={session.view}
        canPreview={session.validation.valid}
        onSelectView={handleSelectView}
        onRequestReset={() => setResetModalOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loadingTemplates && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-300">
              Loading read-only presentation templates&hellip;
            </p>
          </div>
        )}

        {!loadingTemplates && templateLoadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-800/70 bg-red-950/60 p-6 text-sm text-red-200"
          >
            <h2 className="font-bold text-red-100">Template Package Error</h2>
            <p className="mt-1">{templateLoadError}</p>
          </div>
        )}

        {!loadingTemplates && !templateLoadError && activeTemplate && (
          <>
            {session.view === 'builder' ? (
              <BuilderView
                session={session}
                templates={templates}
                activeTemplate={activeTemplate}
              />
            ) : (
              <PreviewExportView
                validation={session.validation}
                activeTemplate={activeTemplate}
                onReturnToEdit={() => session.setView('builder')}
              />
            )}
          </>
        )}
      </main>

      <ResetConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}

export default App;
