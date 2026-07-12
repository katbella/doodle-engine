import type { OpenProject, PreviewStatus } from '../../../shared/project';

export function TopBar({
    project,
    onOpen,
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
    theme,
    onToggleTheme,
}: {
    project: OpenProject;
    onOpen: () => void;
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
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
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
            <span className="topbar__name">{project.name}</span>
            <span
                className={`status ${status.cls}`}
                title={
                    stale && !validating
                        ? 'Changes since the last validation — click Validate'
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
            <div className="topbar__spacer" />
            <div className="topbar__palette">
                <span>Command palette</span>
                <kbd>⌘K</kbd>
            </div>
            <div className="topbar__spacer" />
            <button
                className="btn"
                onClick={onToggleTheme}
                title={
                    theme === 'dark'
                        ? 'Switch to light mode'
                        : 'Switch to dark mode'
                }
            >
                {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button className="btn" onClick={onOpen}>
                Open project…
            </button>
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
                        ⧉ Preview :{preview.port}
                    </button>
                    <button
                        className="btn"
                        onClick={onStopPreview}
                        disabled={previewBusy}
                    >
                        ◼ Stop
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
                    {previewBusy ? 'Starting…' : '◐ Preview'}
                </button>
            )}
            <button
                className="btn btn--accent"
                onClick={onPlaytest}
                title="Run the game in the playtest panel"
            >
                ▶ Playtest
            </button>
        </header>
    );
}
