import { useState, type ReactNode } from 'react';
import { Check, CircleHelp, Moon, Sun, X } from '../lib/icons';
import type {
    OpenProject,
    PreviewStatus,
    StudioBuildResult,
} from '../../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';
import type { Reference } from '@doodle-engine/core';
import { Playtest } from './Playtest';
import { ReferenceGroups } from './RightPanel';

export type DockTab =
    | 'problems'
    | 'symbols'
    | 'build'
    | 'devserver'
    | 'playtest';

interface SymbolUsage {
    id: string;
    count: number;
    references: Reference[];
}

export function BottomDock({
    project,
    activeTab,
    onTabChange,
    building,
    buildResult,
    buildLog,
    installing,
    installLog,
    onCancelBuild,
    onRebuild,
    onOpenOutput,
    preview,
    previewBusy,
    previewLog,
    onOpenProblem,
    flags,
    variables,
    onRenameFlagVar,
    onOpenReference,
    lastValidatedAt,
    lastSavedAt,
    theme,
    onToggleTheme,
    playtestStart,
}: {
    project: OpenProject;
    activeTab: DockTab;
    onTabChange: (tab: DockTab) => void;
    building: boolean;
    buildResult: StudioBuildResult | null;
    buildLog: string[];
    installing: boolean;
    installLog: string[];
    onCancelBuild: () => void;
    onRebuild: () => void;
    onOpenOutput: () => void;
    preview: PreviewStatus | null;
    /** True while the dev server is being started or stopped. */
    previewBusy: boolean;
    previewLog: string[];
    onOpenProblem: (problem: ValidationError) => void;
    flags: SymbolUsage[];
    variables: SymbolUsage[];
    onRenameFlagVar: (kind: 'flag' | 'variable', id: string) => void;
    onOpenReference: (file: string) => void;
    /** When the shown validation results were computed. */
    lastValidatedAt: Date | null;
    /** When an editor last wrote this project's content to disk. */
    lastSavedAt: Date | null;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    /** A "Play from here" request for the playtest session. */
    playtestStart: {
        dialogueId: string;
        nodeId: string;
        seq: number;
    } | null;
}) {
    const problems = project.problems;

    return (
        <div className="dock">
            <div className="dock__tabs">
                <DockTabButton
                    label="Problems"
                    count={problems.length}
                    active={activeTab === 'problems'}
                    onClick={() => onTabChange('problems')}
                />
                <DockTabButton
                    label="Flags & vars"
                    count={flags.length + variables.length}
                    active={activeTab === 'symbols'}
                    onClick={() => onTabChange('symbols')}
                />
                <DockTabButton
                    label="Build log"
                    active={activeTab === 'build'}
                    onClick={() => onTabChange('build')}
                />
                <DockTabButton
                    label="Dev server"
                    active={activeTab === 'devserver'}
                    onClick={() => onTabChange('devserver')}
                />
                <DockTabButton
                    label="Playtest"
                    active={activeTab === 'playtest'}
                    onClick={() => onTabChange('playtest')}
                />
                <div className="dock__status">
                    {lastSavedAt && (
                        <span className="dock__status-when">
                            saved {formatWhen(lastSavedAt)}
                        </span>
                    )}
                    {lastValidatedAt && (
                        <span className="dock__status-when">
                            validated {formatWhen(lastValidatedAt)}
                        </span>
                    )}
                    {preview && (
                        <button
                            className="dock__status-server"
                            onClick={() => onTabChange('devserver')}
                            title={`Dev server running at ${preview.url}`}
                        >
                            <span className="status__dot status__dot--ok" />:
                            {preview.port}
                        </button>
                    )}
                    <button
                        className="btn btn--icon"
                        onClick={() => void window.studio.openDocumentation()}
                        aria-label="Open Doodle Studio documentation"
                        title="Open Doodle Studio documentation"
                    >
                        <CircleHelp size={15} />
                    </button>
                    <button
                        className="btn btn--icon"
                        onClick={onToggleTheme}
                        aria-label={
                            theme === 'dark'
                                ? 'Switch to light mode'
                                : 'Switch to dark mode'
                        }
                        title={
                            theme === 'dark'
                                ? 'Switch to light mode'
                                : 'Switch to dark mode'
                        }
                    >
                        {theme === 'dark' ? (
                            <Sun size={14} />
                        ) : (
                            <Moon size={14} />
                        )}
                    </button>
                </div>
            </div>
            <div className="dock__body scroll">
                {activeTab === 'problems' && (
                    <ProblemsView
                        problems={problems}
                        onOpenProblem={onOpenProblem}
                    />
                )}
                {activeTab === 'symbols' && (
                    <SymbolsView
                        flags={flags}
                        variables={variables}
                        onRename={onRenameFlagVar}
                        onOpenReference={onOpenReference}
                    />
                )}
                {activeTab === 'build' && (
                    <BuildView
                        building={building}
                        result={buildResult}
                        liveLog={buildLog}
                        installing={installing}
                        installLog={installLog}
                        onCancel={onCancelBuild}
                        onRebuild={onRebuild}
                        onOpenOutput={onOpenOutput}
                    />
                )}
                {activeTab === 'devserver' && (
                    <DevServerView
                        preview={preview}
                        starting={previewBusy && !preview}
                        log={previewLog}
                    />
                )}
                {activeTab === 'playtest' && (
                    <Playtest project={project} startRequest={playtestStart} />
                )}
            </div>
        </div>
    );
}

/** Full date + time ("Jul 18, 9:41 AM"): a clock time alone turns ambiguous
 * when Studio stays open past midnight, and this label is never refreshed. */
function formatWhen(date: Date): string {
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function ProblemsView({
    problems,
    onOpenProblem,
}: {
    problems: ValidationError[];
    onOpenProblem: (problem: ValidationError) => void;
}) {
    if (problems.length === 0) {
        return <div className="dock__empty">No problems in this project.</div>;
    }
    return (
        <>
            {problems.map((problem, i) => (
                <button
                    key={i}
                    className="problem problem--button"
                    onClick={() => onOpenProblem(problem)}
                >
                    <span className="problem__file">{problem.file}</span>
                    <span className="problem__msg">{problem.message}</span>
                </button>
            ))}
        </>
    );
}

function SymbolsView({
    flags,
    variables,
    onRename,
    onOpenReference,
}: {
    flags: SymbolUsage[];
    variables: SymbolUsage[];
    onRename: (kind: 'flag' | 'variable', id: string) => void;
    onOpenReference: (file: string) => void;
}) {
    const [selected, setSelected] = useState<{
        kind: 'flag' | 'variable';
        id: string;
    } | null>(null);
    if (flags.length === 0 && variables.length === 0) {
        return (
            <div className="dock__empty">
                No flags or variables are used yet.
            </div>
        );
    }
    const selectedUsage = selected
        ? (selected.kind === 'flag' ? flags : variables).find(
              (usage) => usage.id === selected.id
          )
        : null;
    if (selected && selectedUsage) {
        return (
            <div className="symbol-uses">
                <div className="symbol-uses__head">
                    <button
                        className="symbol-uses__back"
                        onClick={() => setSelected(null)}
                    >
                        ← Flags &amp; vars
                    </button>
                    <span className="mono">{selected.id}</span>
                    <span className="symbol__count">
                        {selectedUsage.count} use
                        {selectedUsage.count === 1 ? '' : 's'}
                    </span>
                </div>
                <ReferenceGroups
                    references={selectedUsage.references}
                    onOpenFile={onOpenReference}
                />
            </div>
        );
    }
    const group = (kind: 'flag' | 'variable', list: SymbolUsage[]) =>
        list.length === 0 ? null : (
            <div className="symbols__group">
                <div className="symbols__head">
                    {kind === 'flag' ? 'Flags' : 'Variables'}
                </div>
                {list.map((s) => (
                    <div key={s.id} className="symbol">
                        <span className="symbol__id mono">{s.id}</span>
                        <button
                            className="symbol__count symbol__count--link"
                            onClick={() => setSelected({ kind, id: s.id })}
                        >
                            {s.count} use{s.count === 1 ? '' : 's'}
                        </button>
                        <button
                            className="symbol__rename"
                            onClick={() => onRename(kind, s.id)}
                        >
                            Rename
                        </button>
                    </div>
                ))}
            </div>
        );
    return (
        <>
            {group('flag', flags)}
            {group('variable', variables)}
        </>
    );
}

function BuildView({
    building,
    result,
    liveLog,
    installing,
    installLog,
    onCancel,
    onRebuild,
    onOpenOutput,
}: {
    building: boolean;
    result: StudioBuildResult | null;
    liveLog: string[];
    installing: boolean;
    installLog: string[];
    onCancel: () => void;
    onRebuild: () => void;
    onOpenOutput: () => void;
}) {
    // Dependency install shares this panel — it's the step that unblocks a build.
    const install =
        installing || installLog.length > 0 ? (
            <div className="build">
                <div className="build__head">
                    {installing && <span className="spinner spinner--sm" />}
                    <span>
                        {installing
                            ? 'Installing dependencies…'
                            : 'Dependency install'}
                    </span>
                </div>
                <div className="buildlog">
                    {installLog.map((line, i) => (
                        <div key={i} className="buildlog__line">
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        ) : null;

    let build: ReactNode;
    if (building) {
        build = (
            <div className="build">
                <div className="build__head">
                    <span className="spinner spinner--sm" />
                    <span>Building</span>
                    <span className="build__dest mono">./dist</span>
                    <div className="build__spacer" />
                    <button className="btn" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
                <div className="buildlog">
                    {liveLog.map((line, i) => (
                        <div key={i} className="buildlog__line">
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        );
    } else if (result) {
        const status = result.cancelled
            ? {
                  cls: 'buildlog__status--fail',
                  icon: <X size={13} />,
                  label: 'Build cancelled',
              }
            : result.ok
              ? {
                    cls: 'buildlog__status--ok',
                    icon: <Check size={13} />,
                    label: `Build complete in ${result.durationMs} ms`,
                }
              : {
                    cls: 'buildlog__status--fail',
                    icon: <X size={13} />,
                    label: 'Build failed',
                };
        build = (
            <div className="build">
                {result.outDir && (
                    <div className="build__head">
                        <span>Output</span>
                        <span className="build__dest mono">
                            {result.outDir}
                        </span>
                    </div>
                )}
                <div className="buildlog">
                    {result.logs.map((line, i) => (
                        <div key={i} className="buildlog__line">
                            {line}
                        </div>
                    ))}
                    {result.errors.map((error, i) => (
                        <div
                            key={`error-${i}`}
                            className="buildlog__line buildlog__status--fail"
                        >
                            {error.file}: {error.message}
                        </div>
                    ))}
                    <div
                        className={`buildlog__line buildlog__status ${status.cls}`}
                    >
                        {status.icon} {status.label}
                    </div>
                </div>
                {result.ok && result.outputFiles.length > 0 && (
                    <div className="build__files">
                        <span className="build__files-label">
                            Generated files ({result.outputFiles.length})
                        </span>
                        <span className="build__files-list mono">
                            {result.outputFiles.join(' · ')}
                        </span>
                    </div>
                )}
                <div className="build__actions">
                    {result.ok && (
                        <button className="btn" onClick={onOpenOutput}>
                            Open output folder
                        </button>
                    )}
                    <button className="btn btn--accent" onClick={onRebuild}>
                        Rebuild
                    </button>
                </div>
            </div>
        );
    } else if (!install) {
        build = (
            <div className="dock__empty">Build output will appear here.</div>
        );
    } else {
        build = null;
    }

    return (
        <>
            {install}
            {build}
        </>
    );
}

function DevServerView({
    preview,
    starting,
    log,
}: {
    preview: PreviewStatus | null;
    starting: boolean;
    log: string[];
}) {
    if (!preview && !starting && log.length === 0) {
        return (
            <div className="dock__empty">
                No dev server running. Click Preview to start it and open the
                game in your browser.
            </div>
        );
    }
    return (
        <div className="build">
            {starting && (
                <div className="build__head">
                    <span className="spinner spinner--sm" />
                    <span>Starting the dev server…</span>
                </div>
            )}
            {preview && (
                <div className="build__head">
                    <span className="status__dot status__dot--ok" />
                    <span>Running at</span>
                    <a
                        className="build__dest mono"
                        href={preview.url}
                        onClick={(e) => {
                            e.preventDefault();
                            window.studio.openPreview();
                        }}
                    >
                        {preview.url}
                    </a>
                </div>
            )}
            <div className="buildlog">
                {log.map((line, i) => (
                    <div key={i} className="buildlog__line">
                        {line}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DockTabButton({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`dock__tab ${active ? 'dock__tab--active' : ''}`}
            onClick={onClick}
        >
            {label}
            {count !== undefined && (
                <span className="dock__count">{count}</span>
            )}
        </button>
    );
}
