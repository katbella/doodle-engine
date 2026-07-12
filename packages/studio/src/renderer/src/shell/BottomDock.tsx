import type { OpenProject, StudioBuildResult } from '../../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';
import { Playtest } from './Playtest';

export type DockTab = 'problems' | 'symbols' | 'build' | 'playtest';

interface SymbolUsage {
    id: string;
    count: number;
}

export function BottomDock({
    project,
    activeTab,
    onTabChange,
    building,
    buildResult,
    onOpenProblem,
    flags,
    variables,
    onRenameFlagVar,
}: {
    project: OpenProject;
    activeTab: DockTab;
    onTabChange: (tab: DockTab) => void;
    building: boolean;
    buildResult: StudioBuildResult | null;
    onOpenProblem: (problem: ValidationError) => void;
    flags: SymbolUsage[];
    variables: SymbolUsage[];
    onRenameFlagVar: (kind: 'flag' | 'variable', id: string) => void;
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
                    label="Playtest"
                    active={activeTab === 'playtest'}
                    onClick={() => onTabChange('playtest')}
                />
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
                    />
                )}
                {activeTab === 'build' && (
                    <BuildView building={building} result={buildResult} />
                )}
                {activeTab === 'playtest' && <Playtest project={project} />}
            </div>
        </div>
    );
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
}: {
    flags: SymbolUsage[];
    variables: SymbolUsage[];
    onRename: (kind: 'flag' | 'variable', id: string) => void;
}) {
    if (flags.length === 0 && variables.length === 0) {
        return (
            <div className="dock__empty">
                No flags or variables are used yet.
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
                        <span className="symbol__count">
                            {s.count} use{s.count === 1 ? '' : 's'}
                        </span>
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
}: {
    building: boolean;
    result: StudioBuildResult | null;
}) {
    if (building) {
        return (
            <div className="dock__empty">
                <span className="spinner" />
                Building…
            </div>
        );
    }
    if (!result) {
        return (
            <div className="dock__empty">
                No build run yet. Click Build to produce a production bundle.
            </div>
        );
    }
    return (
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
                className={`buildlog__line ${
                    result.ok
                        ? 'buildlog__status--ok'
                        : 'buildlog__status--fail'
                }`}
            >
                {result.ok
                    ? `✓ Build complete in ${result.durationMs} ms → ${result.outDir}`
                    : '✗ Build failed'}
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
