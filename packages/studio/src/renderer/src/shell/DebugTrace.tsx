/**
 * The debug-trace tab: a chronological, filterable log of what the engine did
 * during the playtest session — nodes entered, conditions evaluated (with their
 * live values and pass/fail), effects run, and transitions. Rows are filtered
 * by kind and searched by id.
 */
import { useState, type ReactNode } from 'react';
import {
    conditionTokens,
    effectTokens,
    serializeCondition,
    serializeEffect,
    type DlgToken,
    type TraceEvent,
} from '@doodle-engine/core';
import { ArrowRight } from '../lib/icons';

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

    const query = search.trim().toLowerCase();
    const rows = trace
        .map((event) => ({ event, row: describe(event) }))
        .filter(({ event }) => filter === 'all' || event.kind === filter)
        .filter(
            ({ row }) => query === '' || row.text.toLowerCase().includes(query)
        );
    const selectedFilter = FILTERS.find(({ key }) => key === filter)!;

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
                        aria-pressed={filter === f.key}
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
                        {trace.length === 0 ? (
                            'Start a dialogue to begin the trace.'
                        ) : (
                            <>
                                <span>
                                    {query
                                        ? `No results for “${search.trim()}”.`
                                        : `No ${selectedFilter.label.toLowerCase()} were recorded in this playtest.`}
                                </span>
                                <button
                                    className="trace__clear"
                                    onClick={() =>
                                        query ? setSearch('') : setFilter('all')
                                    }
                                >
                                    {query ? 'Clear search' : 'Show all events'}
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    rows.map(({ event, row }) => (
                        <div
                            key={event.seq}
                            className={`trace__row ${
                                event.kind === 'nodeEnter'
                                    ? 'trace__row--node'
                                    : ''
                            }`}
                        >
                            <span
                                className={`trace__kind trace__kind--${event.kind}`}
                            >
                                {row.tag}
                            </span>
                            <span className="trace__text">
                                {row.display ?? row.text}
                            </span>
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
    /** Plain text, used for search matching (and display when no `display`). */
    text: string;
    /** Styled variant shown instead of `text` when present. */
    display?: ReactNode;
    result?: boolean;
}

function TokenList({ tokens }: { tokens: readonly DlgToken[] }) {
    return tokens.map((token, index) => (
        <span
            key={`${index}-${token.kind}`}
            className={`trace__tok trace__tok--${token.kind}`}
        >
            {index > 0 ? ' ' : ''}
            {token.text}
        </span>
    ));
}

/** Render one trace event as a display row: a kind tag, a description, and an
 * optional pass/fail badge for conditions. */
function describe(event: TraceEvent): Row {
    switch (event.kind) {
        case 'nodeEnter':
            return {
                tag: 'NODE',
                text: event.nodeId,
                display: (
                    <span className="trace__tok trace__tok--id">
                        {event.nodeId}
                    </span>
                ),
            };
        case 'condition': {
            const values = Object.entries(event.resolvedValues)
                .map(([, v]) => String(v))
                .join(', ');
            const source = serializeCondition(event.condition);
            return {
                tag: 'CONDITION',
                text: values ? `${source} = ${values}` : source,
                display: (
                    <>
                        <TokenList tokens={conditionTokens(event.condition)} />
                        {values && (
                            <>
                                {' '}
                                <span className="trace__tok trace__tok--keyword">
                                    =
                                </span>{' '}
                                <span className="trace__tok trace__tok--value">
                                    {values}
                                </span>
                            </>
                        )}
                    </>
                ),
                result: event.result,
            };
        }
        case 'effect':
            return {
                tag: 'EFFECT',
                text: serializeEffect(event.effect),
                display: <TokenList tokens={effectTokens(event.effect)} />,
            };
        case 'transition': {
            const toNode = event.toNode ?? 'end';
            return {
                tag: 'TRANSITION',
                text: `${event.fromNode} to ${toNode}`,
                display: (
                    <>
                        <span className="trace__tok trace__tok--id">
                            {event.fromNode}
                        </span>{' '}
                        <ArrowRight
                            className="trace__to"
                            size={12}
                            aria-hidden="true"
                        />{' '}
                        <span className="trace__tok trace__tok--id">
                            {toNode}
                        </span>
                    </>
                ),
            };
        }
        case 'choiceFiltered':
            return {
                tag: 'HIDDEN',
                text: `${event.choiceId}: ${serializeCondition(event.failedCondition)}`,
                display: (
                    <>
                        <span className="trace__tok trace__tok--id">
                            {event.choiceId}
                        </span>
                        <span className="trace__tok trace__tok--keyword">
                            :{' '}
                        </span>
                        <TokenList
                            tokens={conditionTokens(event.failedCondition)}
                        />
                    </>
                ),
                result: false,
            };
        case 'error':
            return { tag: 'ERROR', text: event.message, result: false };
    }
}
