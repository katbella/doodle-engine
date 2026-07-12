import type { OpenProject } from '../../../shared/project';
import type { Tab } from '../types';
import type { ReferenceIndex, SymbolType } from '@doodle-engine/core';

/** The reference-index symbol type for each section, where one exists. */
const SECTION_SYMBOL: Partial<Record<Tab['section'], SymbolType>> = {
    characters: 'characters',
    items: 'items',
    locations: 'locations',
    quests: 'quests',
    dialogues: 'dialogues',
    interludes: 'interludes',
    journal: 'journalEntries',
};

export function RightPanel({
    project,
    activeTab,
    referenceIndex,
    onOpenFile,
}: {
    project: OpenProject;
    activeTab: Tab | null;
    referenceIndex: ReferenceIndex | null;
    /** Open a file by its project-relative path. */
    onOpenFile: (file: string) => void;
}) {
    const file = activeTab ? project.files[activeTab.itemId] : undefined;
    const itemProblems = file
        ? project.problems.filter((p) => p.file === file)
        : [];

    const symbol = activeTab ? SECTION_SYMBOL[activeTab.section] : undefined;
    const references =
        activeTab && symbol && referenceIndex
            ? referenceIndex.find(symbol, activeTab.itemId)
            : [];

    return (
        <aside className="rightpanel scroll">
            <div>
                <div className="panel__label">
                    References{activeTab ? ` — ${references.length}` : ''}
                </div>
                {!activeTab ? (
                    <div className="panel__muted">
                        Select an item to see its references.
                    </div>
                ) : !symbol ? (
                    <div className="panel__muted">
                        This item type isn’t referenced by other content.
                    </div>
                ) : references.length === 0 ? (
                    <div className="panel__muted">
                        Nothing references this item.
                    </div>
                ) : (
                    references.map((ref, i) => (
                        <button
                            key={i}
                            className="reference"
                            disabled={!ref.file}
                            onClick={() => ref.file && onOpenFile(ref.file)}
                        >
                            <span className="reference__where">
                                {ref.where}
                            </span>
                            {ref.file && (
                                <span className="reference__file">
                                    {ref.file}
                                </span>
                            )}
                        </button>
                    ))
                )}
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
