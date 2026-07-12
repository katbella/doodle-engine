/**
 * The debug-trace tab: a chronological, filterable log of what the engine did
 * during the playtest session — nodes entered, conditions evaluated (with their
 * live values and pass/fail), effects run, and transitions. Rows are filtered
 * by kind and searched by id.
 */
import { useMemo, useState } from 'react';
import {
    serializeCondition,
    serializeEffect,
    type TraceEvent,
} from '@doodle-engine/core';

type KindFilter = 'all' | 'nodeEnter' | 'condition' | 'effect' | 'transition';

const FILTERS: { key: KindFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'nodeEnter', label: 'Nodes' },
    { key: 'condition', label: 'Conditions' },
    { key: 'effect', label: 'Effects' },
    { key: 'transition', label: 'Transitions' },
];

export function DebugTrace({ trace }: { trace: readonly TraceEvent[] }) {
    const [filter, setFilter] = useState<KindFilter>('all');
    const [search, setSearch] = useState('');

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return trace
            .map((event) => ({ event, row: describe(event) }))
            .filter(({ event }) => filter === 'all' || event.kind === filter)
            .filter(
                ({ row }) =>
                    query === '' || row.text.toLowerCase().includes(query)
            );
    }, [trace, filter, search]);

    return (
        <div className="trace">
            <div className="trace__bar">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        className={`trace__filter ${
                            filter === f.key ? 'trace__filter--active' : ''
                        }`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
                <input
                    className="trace__search"
                    placeholder="Search by id…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search trace by id"
                />
            </div>
            <div className="trace__log scroll">
                {rows.length === 0 ? (
                    <div className="dock__empty">
                        {trace.length === 0
                            ? 'Nothing traced yet. Start a dialogue or make a choice.'
                            : 'No trace rows match this filter.'}
                    </div>
                ) : (
                    rows.map(({ event, row }) => (
                        <div key={event.seq} className="trace__row">
                            <span
                                className={`trace__kind trace__kind--${event.kind}`}
                            >
                                {row.tag}
                            </span>
                            <span className="trace__text">{row.text}</span>
                            {row.result !== undefined && (
                                <span
                                    className={`trace__result trace__result--${
                                        row.result ? 'pass' : 'fail'
                                    }`}
                                >
                                    {row.result ? 'PASS' : 'FAIL'}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

interface Row {
    tag: string;
    text: string;
    result?: boolean;
}

/** Render one trace event as a display row: a kind tag, a description, and an
 * optional pass/fail badge for conditions. */
function describe(event: TraceEvent): Row {
    switch (event.kind) {
        case 'nodeEnter':
            return { tag: 'NODE', text: event.nodeId };
        case 'condition': {
            const values = Object.entries(event.resolvedValues)
                .map(([, v]) => String(v))
                .join(', ');
            const source = serializeCondition(event.condition);
            return {
                tag: 'CONDITION',
                text: values ? `${source} → ${values}` : source,
                result: event.result,
            };
        }
        case 'effect':
            return { tag: 'EFFECT', text: serializeEffect(event.effect) };
        case 'transition':
            return {
                tag: 'TRANSITION',
                text: `${event.fromNode} → ${event.toNode ?? 'end'}`,
            };
        case 'choiceFiltered':
            return {
                tag: 'HIDDEN',
                text: `${event.choiceId}: ${serializeCondition(event.failedCondition)}`,
                result: false,
            };
        case 'error':
            return { tag: 'ERROR', text: event.message, result: false };
    }
}
