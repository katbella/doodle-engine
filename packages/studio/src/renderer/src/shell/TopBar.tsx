import type { OpenProject, PreviewStatus } from '../../../shared/project';
import { Play, Square, Monitor, ExternalLink, Search } from '../lib/icons';

export function TopBar({
    project,
    onValidate,
    validating,
    stale,
    onBuild,
    building,
    canBuild,
    preview,
    previewBusy,
    onStartPreview,
    onStopPreview,
    onOpenPreview,
    onPlaytest,
    onOpenPalette,
}: {
    project: OpenProject;
    onValidate: () => void;
    validating: boolean;
    stale: boolean;
    onBuild: () => void;
    building: boolean;
    /** False when the project's dependencies aren't installed yet. */
    canBuild: boolean;
    preview: PreviewStatus | null;
    previewBusy: boolean;
    onStartPreview: () => void;
    onStopPreview: () => void;
    onOpenPreview: () => void;
    onPlaytest: () => void;
    onOpenPalette: () => void;
}) {
    const count = project.problems.length;

    const status = validating
        ? { cls: 'status--info', label: 'Validating…', spin: true }
        : stale
          ? { cls: 'status--warn', label: 'Not validated', spin: false }
          : count > 0
            ? {
                  cls: 'status--error',
                  label: `${count} problem${count === 1 ? '' : 's'}`,
                  spin: false,
              }
            : { cls: 'status--valid', label: 'All valid', spin: false };

    return (
        <header className="topbar">
            <div className="topbar__project">
                <span className="topbar__name">{project.name}</span>
                <span
                    className={`status ${status.cls}`}
                    title={
                        stale && !validating
                            ? 'Changes since the last validation. Click Validate.'
                            : undefined
                    }
                >
                    {status.spin ? (
                        <span className="spinner spinner--sm" />
                    ) : (
                        <span className="status__dot" />
                    )}
                    {status.label}
                </span>
            </div>
            <button
                className="topbar__palette"
                onClick={onOpenPalette}
                title="Open the command palette"
            >
                <Search size={13} aria-hidden />
                <span>Command palette</span>
                <kbd>
                    {navigator.platform.startsWith('Mac') ? '⌘K' : 'Ctrl K'}
                </kbd>
            </button>
            <div className="topbar__actions">
                <button
                    className={`btn ${stale ? 'btn--accent' : ''}`}
                    onClick={onValidate}
                    disabled={validating}
                >
                    {validating ? 'Validating…' : 'Validate'}
                </button>
                <button
                    className="btn"
                    onClick={onBuild}
                    disabled={building || !canBuild}
                    title={
                        canBuild
                            ? undefined
                            : "Install the project's dependencies first"
                    }
                >
                    {building ? 'Building…' : 'Build'}
                </button>
                {preview ? (
                    <>
                        <button
                            className="btn"
                            onClick={onOpenPreview}
                            title={`Open ${preview.url} in your browser`}
                        >
                            <ExternalLink size={14} /> Preview :{preview.port}
                        </button>
                        <button
                            className="btn"
                            onClick={onStopPreview}
                            disabled={previewBusy}
                        >
                            <Square size={14} /> Stop
                        </button>
                    </>
                ) : (
                    <button
                        className="btn"
                        onClick={onStartPreview}
                        disabled={previewBusy || !canBuild}
                        title={
                            canBuild
                                ? 'Start the dev server and open the game in your browser'
                                : "Install the project's dependencies first"
                        }
                    >
                        {previewBusy ? (
                            'Starting…'
                        ) : (
                            <>
                                <Monitor size={14} /> Preview
                            </>
                        )}
                    </button>
                )}
                <button
                    className="btn btn--accent"
                    onClick={onPlaytest}
                    title="Run the game in the playtest panel"
                >
                    <Play size={14} /> Playtest
                </button>
            </div>
        </header>
    );
}
