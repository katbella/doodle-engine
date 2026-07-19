import type { OpenProject } from '../../../shared/project';
import type { Tab } from '../types';
import type {
    Reference,
    ReferenceIndex,
    SymbolType,
} from '@doodle-engine/core';
import { filePathFor } from '../lib/paths';

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
    const file = activeTab ? filePathFor(project, activeTab) : undefined;
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
                    References{activeTab ? ` · ${references.length}` : ''}
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
                    <ReferenceGroups
                        references={references}
                        onOpenFile={onOpenFile}
                    />
                )}
            </div>
            <div>
                <div className="panel__label">
                    Validation{activeTab ? ' · this item' : ''}
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

interface GroupedReference {
    label: string;
    details: string[];
}

function describeReferences(references: Reference[]): GroupedReference[] {
    const rows = new Map<string, { label: string; details: Set<string> }>();
    for (const reference of references) {
        const dialogueNode = reference.where.match(
            /^dialogue "[^"]+" node "([^"]+)"(?: (.+))?$/
        );
        const label = dialogueNode
            ? `node “${dialogueNode[1]}”`
            : reference.where;
        const detail = dialogueNode
            ? (dialogueNode[2] ?? 'condition or effect')
            : '';
        const row = rows.get(label) ?? { label, details: new Set<string>() };
        if (detail) row.details.add(detail);
        rows.set(label, row);
    }
    return [...rows.values()].map((row) => ({
        label: row.label,
        details: [...row.details],
    }));
}

/** A compact, file-grouped reference list shared by entity and symbol usages. */
export function ReferenceGroups({
    references,
    onOpenFile,
}: {
    references: Reference[];
    onOpenFile: (file: string) => void;
}) {
    const groups = new Map<string | null, Reference[]>();
    for (const reference of references) {
        const list = groups.get(reference.file) ?? [];
        list.push(reference);
        groups.set(reference.file, list);
    }

    return (
        <div className="reference-groups">
            {[...groups].map(([file, refs], groupIndex) => {
                const normalized = file?.replace(/\\/g, '/') ?? '';
                const slash = normalized.lastIndexOf('/');
                const directory =
                    slash >= 0 ? normalized.slice(0, slash + 1) : '';
                const filename =
                    slash >= 0 ? normalized.slice(slash + 1) : normalized;
                return (
                    <div className="reference-group" key={file ?? groupIndex}>
                        <button
                            className="reference-group__head"
                            disabled={!file}
                            title={file ?? undefined}
                            onClick={() => file && onOpenFile(file)}
                        >
                            {file ? (
                                <span className="reference-group__path mono">
                                    <span className="reference-group__dir">
                                        {directory}
                                    </span>
                                    <span className="reference-group__filename">
                                        {filename}
                                    </span>
                                </span>
                            ) : (
                                <span>Project configuration</span>
                            )}
                            <span className="reference-group__count">
                                {refs.length}
                            </span>
                        </button>
                        {describeReferences(refs).map((row) => (
                            <button
                                key={row.label}
                                className="reference"
                                disabled={!file}
                                onClick={() => file && onOpenFile(file)}
                            >
                                <span className="reference__where">
                                    {row.label}
                                    {row.details.length > 0 && (
                                        <span className="reference__details">
                                            {' · '}
                                            {row.details.join(', ')}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
