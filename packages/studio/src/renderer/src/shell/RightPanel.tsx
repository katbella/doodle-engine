import type { OpenProject } from '../../../shared/project';
import type { Tab } from '../types';

export function RightPanel({
    project,
    activeTab,
}: {
    project: OpenProject;
    activeTab: Tab | null;
}) {
    const file = activeTab ? project.files[activeTab.itemId] : undefined;
    const itemProblems = file
        ? project.problems.filter((p) => p.file === file)
        : [];

    return (
        <aside className="rightpanel scroll">
            <div>
                <div className="panel__label">References</div>
                <div className="panel__muted">
                    {activeTab
                        ? 'References are not indexed yet.'
                        : 'Select an item to see its references.'}
                </div>
            </div>
            <div>
                <div className="panel__label">
                    Validation{activeTab ? ' — this item' : ''}
                </div>
                {!activeTab ? (
                    <div className="panel__muted">
                        Open an item to see its validation.
                    </div>
                ) : itemProblems.length === 0 ? (
                    <span className="status status--valid">
                        <span className="status__dot" />
                        No issues
                    </span>
                ) : (
                    itemProblems.map((problem, i) => (
                        <div key={i} className="problem">
                            <span className="problem__msg">
                                {problem.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}
