import type { OpenProject, PreviewStatus } from '../../../shared/project';
import {
    Play,
    Square,
    Monitor,
    ExternalLink,
    Search,
    Flag,
} from '../lib/icons';
import { Tooltip } from './Tooltip';

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
    symbolCount,
    onOpenSymbols,
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
    symbolCount: number;
    onOpenSymbols: () => void;
}) {
    const count = project.problems.length;
    const buildShortcut = navigator.platform.startsWith('Mac')
        ? '⌘⇧B'
        : 'Ctrl Shift B';
    const paletteShortcut = navigator.platform.startsWith('Mac')
        ? '⌘K'
        : 'Ctrl K';

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
                <span className={`status ${status.cls}`}>
                    {status.spin ? (
                        <span className="spinner spinner--sm" />
                    ) : (
                        <span className="status__dot" />
                    )}
                    {status.label}
                </span>
            </div>
            <div className="topbar__nav">
                <Tooltip
                    label="Open the command palette"
                    shortcut={paletteShortcut}
                >
                    <button className="topbar__palette" onClick={onOpenPalette}>
                        <Search size={13} aria-hidden />
                        <span>Command palette</span>
                        <kbd>{paletteShortcut}</kbd>
                    </button>
                </Tooltip>
                <Tooltip label="Review project flags and variables">
                    <button
                        className="btn topbar__flags"
                        onClick={onOpenSymbols}
                    >
                        <Flag size={13} aria-hidden />
                        <span>Flags &amp; vars</span>
                        <span className="topbar__flags-count">
                            {symbolCount}
                        </span>
                    </button>
                </Tooltip>
            </div>
            <div className="topbar__actions">
                <Tooltip
                    label={
                        validating
                            ? 'Project validation is running'
                            : stale
                              ? 'Validate changes made since the last check'
                              : 'Validate project content'
                    }
                    shortcut="F7"
                >
                    <button
                        className={`btn ${stale ? 'btn--accent' : ''}`}
                        onClick={onValidate}
                        disabled={validating}
                    >
                        {validating ? 'Validating…' : 'Validate'}
                    </button>
                </Tooltip>
                <Tooltip
                    label={
                        canBuild
                            ? 'Create a production build'
                            : "Install the project's dependencies before building"
                    }
                    shortcut={buildShortcut}
                >
                    <button
                        className="btn"
                        onClick={onBuild}
                        disabled={building || !canBuild}
                    >
                        {building ? 'Building…' : 'Build'}
                    </button>
                </Tooltip>
                {preview ? (
                    <>
                        <Tooltip
                            label={`Open ${preview.url} in your browser`}
                            shortcut="F6"
                        >
                            <button className="btn" onClick={onOpenPreview}>
                                <ExternalLink size={14} /> Preview :
                                {preview.port}
                            </button>
                        </Tooltip>
                        <Tooltip
                            label="Stop the preview server"
                            shortcut="Shift F6"
                        >
                            <button
                                className="btn"
                                onClick={onStopPreview}
                                disabled={previewBusy}
                            >
                                <Square size={14} /> Stop
                            </button>
                        </Tooltip>
                    </>
                ) : (
                    <Tooltip
                        label={
                            canBuild
                                ? 'Start the preview server and open the game'
                                : "Install the project's dependencies before previewing"
                        }
                        shortcut="F6"
                    >
                        <button
                            className="btn"
                            onClick={onStartPreview}
                            disabled={previewBusy || !canBuild}
                        >
                            {previewBusy ? (
                                'Starting…'
                            ) : (
                                <>
                                    <Monitor size={14} /> Preview
                                </>
                            )}
                        </button>
                    </Tooltip>
                )}
                <Tooltip label="Open the in-Studio playtest" shortcut="F5">
                    <button className="btn btn--accent" onClick={onPlaytest}>
                        <Play size={14} /> Playtest
                    </button>
                </Tooltip>
            </div>
        </header>
    );
}
