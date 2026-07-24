import { useEffect, useMemo, useRef, useState } from 'react';
import type { Reference } from '@doodle-engine/core';
import type { FlagVarNotes } from '../../../shared/project';
import {
    closestExistingName,
    nearIdenticalNames,
    prefixForName,
    usageSummary,
    type FlagVarKind,
    type NameCatalog,
    type NameSummary,
} from '../lib/flag-vars';
import {
    ChevronDown,
    ChevronRight,
    Pencil,
    Search,
    Trash2,
    TriangleAlert,
} from '../lib/icons';

export interface FlagVarSelection {
    kind: FlagVarKind;
    id: string;
}

type ListEntry =
    | { type: 'group'; prefix: string; count: number }
    | { type: 'name'; summary: NameSummary };

type HealthCategory =
    | 'checked-only'
    | 'set-only'
    | 'near-identical'
    | 'orphaned-notes';

const ROW_HEIGHT = 42;
const OVERSCAN = 6;

function noteSection(kind: FlagVarKind): keyof FlagVarNotes {
    return kind === 'flag' ? 'flags' : 'variables';
}

function groupedReferences(references: Reference[]) {
    const groups = new Map<string | null, Reference[]>();
    for (const reference of references) {
        const list = groups.get(reference.file) ?? [];
        list.push(reference);
        groups.set(reference.file, list);
    }
    return [...groups];
}

export function FlagsVariablesPage({
    catalog,
    notes,
    notesError,
    selected,
    onSelect,
    onRename,
    onNoteChange,
    onNoteMove,
    onOpenReference,
}: {
    catalog: NameCatalog;
    notes: FlagVarNotes;
    notesError?: string | null;
    selected: FlagVarSelection | null;
    onSelect: (selection: FlagVarSelection) => void;
    onRename: (kind: FlagVarKind, id: string) => void;
    onNoteChange: (kind: FlagVarKind, id: string, note: string) => void;
    onNoteMove: (kind: FlagVarKind, from: string, to: string) => void;
    onOpenReference: (reference: Reference) => void;
}) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'name' | 'uses'>('name');
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(480);
    const listRef = useRef<HTMLDivElement>(null);
    const revealedSelectionRef = useRef<string | null>(null);
    const pendingRevealRef = useRef(false);

    const all = useMemo(
        () => [...catalog.flags, ...catalog.variables],
        [catalog.flags, catalog.variables]
    );
    const selectedSummary = selected
        ? ((selected.kind === 'flag' ? catalog.flags : catalog.variables).find(
              (item) => item.id === selected.id
          ) ?? null)
        : null;
    const selectedKey = selected ? `${selected.kind}:${selected.id}` : null;

    useEffect(() => {
        if (!selectedSummary && all[0]) {
            onSelect({ kind: all[0].kind, id: all[0].id });
        }
    }, [all, onSelect, selectedSummary]);

    useEffect(() => {
        if (revealedSelectionRef.current === selectedKey) return;
        revealedSelectionRef.current = selectedKey;
        if (!selectedSummary) return;
        pendingRevealRef.current = true;
        const prefix = prefixForName(selectedSummary.id);
        setCollapsed((current) => {
            if (!current.has(prefix)) return current;
            const next = new Set(current);
            next.delete(prefix);
            return next;
        });
        setQuery((current) => {
            const normalized = current.trim().toLocaleLowerCase();
            return !normalized ||
                selectedSummary.id.toLocaleLowerCase().includes(normalized) ||
                selectedSummary.note.toLocaleLowerCase().includes(normalized)
                ? current
                : '';
        });
    });

    useEffect(() => {
        const list = listRef.current;
        if (!list || typeof ResizeObserver === 'undefined') return;
        const measure = () => setViewportHeight(list.clientHeight || 480);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(list);
        return () => observer.disconnect();
    }, []);

    const entries = useMemo<ListEntry[]>(() => {
        const normalized = query.trim().toLocaleLowerCase();
        const visible = all.filter(
            (item) =>
                !normalized ||
                item.id.toLocaleLowerCase().includes(normalized) ||
                item.note.toLocaleLowerCase().includes(normalized)
        );
        const groups = new Map<string, NameSummary[]>();
        for (const item of visible) {
            const prefix = prefixForName(item.id);
            const group = groups.get(prefix) ?? [];
            group.push(item);
            groups.set(prefix, group);
        }
        const result: ListEntry[] = [];
        const sortedGroups = [...groups].sort(([a, aItems], [b, bItems]) => {
            if (sort === 'uses') {
                const aUses = Math.max(...aItems.map((item) => item.count));
                const bUses = Math.max(...bItems.map((item) => item.count));
                if (aUses !== bUses) return bUses - aUses;
            }
            return a === 'No prefix'
                ? 1
                : b === 'No prefix'
                  ? -1
                  : a.localeCompare(b);
        });
        for (const [prefix, items] of sortedGroups) {
            result.push({ type: 'group', prefix, count: items.length });
            if (collapsed.has(prefix)) continue;
            items
                .sort((a, b) =>
                    sort === 'uses'
                        ? b.count - a.count || a.id.localeCompare(b.id)
                        : a.id.localeCompare(b.id) ||
                          a.kind.localeCompare(b.kind)
                )
                .forEach((summary) => result.push({ type: 'name', summary }));
        }
        return result;
    }, [all, collapsed, query, sort]);

    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(
        entries.length,
        Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
    );
    const visibleEntries = entries.slice(start, end);

    useEffect(() => {
        if (!pendingRevealRef.current || !selected) return;
        const index = entries.findIndex(
            (entry) =>
                entry.type === 'name' &&
                entry.summary.kind === selected.kind &&
                entry.summary.id === selected.id
        );
        if (index < 0 || !listRef.current) return;
        const nextScrollTop = Math.max(
            0,
            index * ROW_HEIGHT - (viewportHeight - ROW_HEIGHT) / 2
        );
        listRef.current.scrollTop = nextScrollTop;
        setScrollTop(nextScrollTop);
        pendingRevealRef.current = false;
    }, [entries, selected, viewportHeight]);

    return (
        <div className="flag-vars-page">
            <header className="flag-vars-page__header">
                <div>
                    <h1>Flags &amp; variables</h1>
                    <p>
                        Review every project name, its usage, and its optional
                        note.
                    </p>
                </div>
                <span className="flag-vars-page__total">
                    {all.length} name{all.length === 1 ? '' : 's'}
                </span>
            </header>

            <HealthShelf
                catalog={catalog}
                notes={notes}
                notesReadOnly={Boolean(notesError)}
                onSelect={onSelect}
                onNoteChange={onNoteChange}
                onNoteMove={onNoteMove}
            />

            <div className="flag-vars-page__workspace">
                <section className="flag-vars-list" aria-label="Project names">
                    <div className="flag-vars-list__controls">
                        <label className="flag-vars-list__search">
                            <Search size={15} aria-hidden />
                            <input
                                value={query}
                                placeholder="Search names or notes..."
                                aria-label="Search flags and variables"
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setScrollTop(0);
                                    if (listRef.current)
                                        listRef.current.scrollTop = 0;
                                }}
                            />
                        </label>
                        <select
                            className="dlg__select"
                            value={sort}
                            aria-label="Sort flags and variables"
                            onChange={(event) =>
                                setSort(event.target.value as 'name' | 'uses')
                            }
                        >
                            <option value="name">Name</option>
                            <option value="uses">Most used</option>
                        </select>
                    </div>
                    <div
                        ref={listRef}
                        className="flag-vars-list__viewport scroll"
                        onScroll={(event) =>
                            setScrollTop(event.currentTarget.scrollTop)
                        }
                    >
                        {entries.length === 0 ? (
                            <div className="flag-vars-list__empty">
                                {all.length === 0
                                    ? 'No flags or variables are used yet.'
                                    : 'No names match this search.'}
                            </div>
                        ) : (
                            <div
                                className="flag-vars-list__window"
                                style={{ height: entries.length * ROW_HEIGHT }}
                            >
                                <div
                                    style={{
                                        transform: `translateY(${start * ROW_HEIGHT}px)`,
                                    }}
                                >
                                    {visibleEntries.map((entry) =>
                                        entry.type === 'group' ? (
                                            <button
                                                key={`group:${entry.prefix}`}
                                                className="flag-vars-list__group"
                                                onClick={() =>
                                                    setCollapsed((current) => {
                                                        const next = new Set(
                                                            current
                                                        );
                                                        if (
                                                            next.has(
                                                                entry.prefix
                                                            )
                                                        )
                                                            next.delete(
                                                                entry.prefix
                                                            );
                                                        else
                                                            next.add(
                                                                entry.prefix
                                                            );
                                                        return next;
                                                    })
                                                }
                                            >
                                                {collapsed.has(entry.prefix) ? (
                                                    <ChevronRight size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                                <span>{entry.prefix}</span>
                                                <span>{entry.count}</span>
                                            </button>
                                        ) : (
                                            <button
                                                key={`${entry.summary.kind}:${entry.summary.id}`}
                                                className={`flag-vars-list__row ${selected?.kind === entry.summary.kind && selected.id === entry.summary.id ? 'flag-vars-list__row--selected' : ''}`}
                                                aria-current={
                                                    selected?.kind ===
                                                        entry.summary.kind &&
                                                    selected.id ===
                                                        entry.summary.id
                                                }
                                                onClick={() =>
                                                    onSelect({
                                                        kind: entry.summary
                                                            .kind,
                                                        id: entry.summary.id,
                                                    })
                                                }
                                            >
                                                <span className="mono">
                                                    {entry.summary.id}
                                                </span>
                                                <span className="flag-vars-list__kind">
                                                    {entry.summary.kind}
                                                </span>
                                                <span className="flag-vars-list__uses">
                                                    {entry.summary.count}
                                                </span>
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <SymbolDetail
                    summary={selectedSummary}
                    notesError={notesError}
                    notesReadOnly={Boolean(notesError)}
                    onRename={onRename}
                    onNoteChange={onNoteChange}
                    onOpenReference={onOpenReference}
                />
            </div>
        </div>
    );
}

function HealthShelf({
    catalog,
    notes,
    notesReadOnly,
    onSelect,
    onNoteChange,
    onNoteMove,
}: {
    catalog: NameCatalog;
    notes: FlagVarNotes;
    notesReadOnly: boolean;
    onSelect: (selection: FlagVarSelection) => void;
    onNoteChange: (kind: FlagVarKind, id: string, note: string) => void;
    onNoteMove: (kind: FlagVarKind, from: string, to: string) => void;
}) {
    const all = [...catalog.flags, ...catalog.variables];
    const checkedOnly = all.filter(
        (item) => item.checkCount > 0 && item.setCount === 0
    );
    const setOnly = all.filter(
        (item) => item.setCount > 0 && item.checkCount === 0
    );
    const pairs = useMemo(() => nearIdenticalNames(catalog), [catalog]);
    const stale = (['flag', 'variable'] as const).flatMap((kind) => {
        const section = noteSection(kind);
        const owners = new Set(
            (kind === 'flag' ? catalog.flags : catalog.variables).map(
                (item) => item.id
            )
        );
        return Object.keys(notes[section])
            .filter((id) => !owners.has(id))
            .map((id) => ({ kind, id }));
    });
    const counts: Record<HealthCategory, number> = {
        'checked-only': checkedOnly.length,
        'set-only': setOnly.length,
        'near-identical': pairs.length,
        'orphaned-notes': stale.length,
    };
    const [selectedCategory, setSelectedCategory] =
        useState<HealthCategory>('checked-only');
    const firstCategoryWithIssues = (
        Object.keys(counts) as HealthCategory[]
    ).find((category) => counts[category] > 0);
    const activeCategory =
        counts[selectedCategory] > 0
            ? selectedCategory
            : (firstCategoryWithIssues ?? null);
    const totalFindings = Object.values(counts).reduce(
        (total, count) => total + count,
        0
    );

    const issueButton = (summary: NameSummary) => (
        <button
            key={`${summary.kind}:${summary.id}`}
            className="health-shelf__issue"
            onClick={() => onSelect({ kind: summary.kind, id: summary.id })}
        >
            <span className="mono">{summary.id}</span>
            <span>{summary.kind}</span>
        </button>
    );

    const categories: Array<{
        id: HealthCategory;
        title: string;
        description: string;
    }> = [
        {
            id: 'checked-only',
            title: 'Checked, never set',
            description: 'Tested in conditions but never assigned.',
        },
        {
            id: 'set-only',
            title: 'Set, never checked',
            description: 'Assigned but never used by a condition.',
        },
        {
            id: 'near-identical',
            title: 'Possible name collisions',
            description: 'Names that differ by only a few characters.',
        },
        {
            id: 'orphaned-notes',
            title: 'Orphaned notes',
            description: 'Notes that no longer match a project name.',
        },
    ];
    const activeIssues =
        activeCategory === 'checked-only'
            ? checkedOnly.map(issueButton)
            : activeCategory === 'set-only'
              ? setOnly.map(issueButton)
              : activeCategory === 'near-identical'
                ? pairs.map((pair) => (
                      <div
                          key={`${pair.kind}:${pair.first}:${pair.second}`}
                          className="health-shelf__pair"
                      >
                          <button
                              className="mono"
                              onClick={() =>
                                  onSelect({
                                      kind: pair.kind,
                                      id: pair.first,
                                  })
                              }
                          >
                              {pair.first}
                          </button>
                          <button
                              className="mono"
                              onClick={() =>
                                  onSelect({
                                      kind: pair.kind,
                                      id: pair.second,
                                  })
                              }
                          >
                              {pair.second}
                          </button>
                      </div>
                  ))
                : activeCategory === 'orphaned-notes'
                  ? stale.map(({ kind, id }) => {
                        const possibleOwner = closestExistingName(
                            kind,
                            id,
                            catalog
                        );
                        const section = noteSection(kind);
                        const closest =
                            possibleOwner && !notes[section][possibleOwner]
                                ? possibleOwner
                                : null;
                        return (
                            <div
                                key={`${kind}:${id}`}
                                className="health-shelf__stale"
                            >
                                <span className="mono">{id}</span>
                                {closest && (
                                    <button
                                        className="btn"
                                        disabled={notesReadOnly}
                                        aria-label={`Move note to ${closest}`}
                                        onClick={() =>
                                            onNoteMove(kind, id, closest)
                                        }
                                    >
                                        Move to {closest}
                                    </button>
                                )}
                                <button
                                    className="btn btn--icon"
                                    disabled={notesReadOnly}
                                    aria-label={`Delete note for ${id}`}
                                    onClick={() => onNoteChange(kind, id, '')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })
                  : null;

    return (
        <section className="health-shelf" aria-label="Name health">
            <div className="health-shelf__heading">
                <h2>Name health</h2>
                <span
                    className={
                        totalFindings > 0
                            ? 'health-shelf__total health-shelf__total--issues'
                            : 'health-shelf__total'
                    }
                >
                    {totalFindings > 0
                        ? `${totalFindings} finding${totalFindings === 1 ? '' : 's'}`
                        : 'All clear'}
                </span>
            </div>
            <div className="health-shelf__summary">
                {categories.map((category) => {
                    const count = counts[category.id];
                    if (count === 0) {
                        return (
                            <div
                                key={category.id}
                                className="health-shelf__check health-shelf__check--empty"
                            >
                                <span className="health-shelf__check-copy">
                                    <strong id={`name-health-${category.id}`}>
                                        {category.title}
                                    </strong>
                                    <span>{category.description}</span>
                                </span>
                                <span className="health-shelf__status">
                                    No issues
                                </span>
                            </div>
                        );
                    }
                    const expanded = activeCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            className={`health-shelf__check ${expanded ? 'health-shelf__check--active' : ''}`}
                            aria-expanded={expanded}
                            aria-controls="name-health-details"
                            onClick={() => setSelectedCategory(category.id)}
                        >
                            <span className="health-shelf__check-copy">
                                <strong id={`name-health-${category.id}`}>
                                    {category.title}
                                </strong>
                                <span>{category.description}</span>
                            </span>
                            <span className="health-shelf__status health-shelf__status--issues">
                                {count} {count === 1 ? 'finding' : 'findings'}
                            </span>
                        </button>
                    );
                })}
            </div>
            {activeCategory && (
                <div
                    id="name-health-details"
                    className="health-shelf__tray"
                    role="region"
                    aria-labelledby={`name-health-${activeCategory}`}
                >
                    <div className="health-shelf__tray-heading">
                        <h3>Findings</h3>
                        <span>{counts[activeCategory]} total</span>
                    </div>
                    <div className="health-shelf__issues">{activeIssues}</div>
                </div>
            )}
        </section>
    );
}

function SymbolDetail({
    summary,
    notesError,
    notesReadOnly,
    onRename,
    onNoteChange,
    onOpenReference,
}: {
    summary: NameSummary | null;
    notesError?: string | null;
    notesReadOnly: boolean;
    onRename: (kind: FlagVarKind, id: string) => void;
    onNoteChange: (kind: FlagVarKind, id: string, note: string) => void;
    onOpenReference: (reference: Reference) => void;
}) {
    const [draft, setDraft] = useState('');
    useEffect(
        () => setDraft(summary?.note ?? ''),
        [summary?.id, summary?.note]
    );

    if (!summary) {
        return (
            <section className="flag-var-detail flag-var-detail--empty">
                Select a flag or variable to inspect it.
            </section>
        );
    }
    const saveNote = () => {
        if (notesReadOnly) return;
        const value = draft.trim();
        if (value === summary.note) return;
        onNoteChange(summary.kind, summary.id, value);
    };

    return (
        <section className="flag-var-detail">
            <div className="flag-var-detail__head">
                <div>
                    <span className="flag-var-detail__kind">
                        {summary.kind}
                    </span>
                    <h2 className="mono">{summary.id}</h2>
                    <p>{usageSummary(summary)}</p>
                </div>
                <button
                    className="btn"
                    onClick={() => onRename(summary.kind, summary.id)}
                >
                    <Pencil size={14} /> Rename
                </button>
            </div>

            {notesError ? (
                <div className="flag-var-detail__note-unavailable" role="alert">
                    <TriangleAlert size={16} aria-hidden />
                    <span>
                        Notes could not be read. Fix or delete
                        metadata/flags-and-vars.yaml to edit notes.
                    </span>
                </div>
            ) : (
                <>
                    <label className="flag-var-detail__note">
                        <span>Note</span>
                        <textarea
                            value={draft}
                            placeholder={`What does ${summary.id} mean?`}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={saveNote}
                        />
                    </label>
                    {draft.trim() !== summary.note && (
                        <button
                            className="btn btn--accent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={saveNote}
                        >
                            Save note
                        </button>
                    )}
                </>
            )}

            <div className="flag-var-detail__references">
                <h3>Uses</h3>
                {summary.references.length === 0 ? (
                    <p>No uses in the current project scan.</p>
                ) : (
                    groupedReferences(summary.references).map(
                        ([file, refs]) => (
                            <div
                                className="flag-var-detail__file"
                                key={file ?? 'project'}
                            >
                                <div className="flag-var-detail__file-head">
                                    <span className="mono">
                                        {file ?? 'Project configuration'}
                                    </span>
                                    <span>{refs.length}</span>
                                </div>
                                {refs.map((reference, index) => (
                                    <button
                                        key={`${reference.where}:${index}`}
                                        disabled={!reference.file}
                                        onClick={() =>
                                            onOpenReference(reference)
                                        }
                                    >
                                        <span>{reference.where}</span>
                                        <span className="flag-vars-list__kind">
                                            {reference.access ?? 'use'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )
                    )
                )}
            </div>
        </section>
    );
}
