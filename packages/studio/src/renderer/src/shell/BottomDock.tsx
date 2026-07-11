import type { OpenProject, StudioBuildResult } from '../../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';

export type DockTab = 'problems' | 'build' | 'playtest';

export function BottomDock({
    project,
    activeTab,
    onTabChange,
    building,
    buildResult,
    onOpenProblem,
}: {
    project: OpenProject;
    activeTab: DockTab;
    onTabChange: (tab: DockTab) => void;
    building: boolean;
    buildResult: StudioBuildResult | null;
    onOpenProblem: (problem: ValidationError) => void;
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
                {activeTab === 'build' && (
                    <BuildView building={building} result={buildResult} />
                )}
                {activeTab === 'playtest' && (
                    <div className="dock__empty">
                        Playtest arrives in a later step.
                    </div>
                )}
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
