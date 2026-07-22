import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { ContentRegistry, Dialogue } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import type { SectionKey, Tab } from '../types';

/** Read-only fallback for content without a dedicated editor. */
export function DetailView({
    project,
    tab,
}: {
    project: OpenProject;
    tab: Tab;
}) {
    const { registry } = project;

    if (tab.section === 'dialogues') {
        const dialogue = registry.dialogues[tab.itemId];
        return dialogue ? <DialogueDetail dialogue={dialogue} /> : <NotFound />;
    }
    if (tab.section === 'locales') {
        const locale = registry.locales[tab.itemId];
        return locale ? (
            <FieldList title={tab.itemId} kind="locale" fields={locale} />
        ) : (
            <NotFound />
        );
    }
    if (tab.section === 'config') {
        return (
            <FieldList
                title="game.yaml"
                kind="game config"
                fields={project.config as unknown as Record<string, unknown>}
            />
        );
    }

    const entity = pickEntity(registry, tab.section, tab.itemId);
    return entity ? (
        <FieldList
            title={tab.itemId}
            kind={SINGULAR[tab.section]}
            fields={entity as Record<string, unknown>}
        />
    ) : (
        <NotFound />
    );
}

const SINGULAR: Record<SectionKey, string> = {
    dialogues: 'dialogue',
    characters: 'character',
    locations: 'location',
    items: 'item',
    quests: 'quest',
    maps: 'map',
    interludes: 'interlude',
    journal: 'journal entry',
    locales: 'locale',
    config: 'game config',
    'flags-vars': 'flags and variables',
};

function pickEntity(
    registry: ContentRegistry,
    section: SectionKey,
    id: string
): object | undefined {
    switch (section) {
        case 'characters':
            return registry.characters[id];
        case 'locations':
            return registry.locations[id];
        case 'items':
            return registry.items[id];
        case 'quests':
            return registry.quests[id];
        case 'maps':
            return registry.maps[id];
        case 'interludes':
            return registry.interludes[id];
        case 'journal':
            return registry.journalEntries[id];
        default:
            return undefined;
    }
}

function DialogueDetail({ dialogue }: { dialogue: Dialogue }) {
    return (
        <div>
            <div className="detail__head">
                <span className="detail__title">{dialogue.id}.dlg</span>
                <span className="detail__kind">
                    dialogue · {dialogue.nodes.length} node
                    {dialogue.nodes.length === 1 ? '' : 's'}
                </span>
            </div>
            {dialogue.triggerLocation && (
                <div className="detail__row">
                    <span className="detail__key">triggers at</span>
                    <span className="detail__value">
                        {dialogue.triggerLocation}
                    </span>
                </div>
            )}
            {dialogue.nodes.map((node) => (
                <div
                    key={node.id}
                    className={`node ${node.id === dialogue.startNode ? 'node--start' : ''}`}
                >
                    <div className="node__id">
                        {node.id}
                        {node.id === dialogue.startNode && (
                            <span className="node__badge">start</span>
                        )}
                    </div>
                    {node.text && (
                        <>
                            <div className="node__speaker">
                                {node.speaker ?? 'Narrator'}
                            </div>
                            <div className="node__text">{node.text}</div>
                        </>
                    )}
                    {node.choices.map((choice) => (
                        <div key={choice.id} className="node__choice">
                            {choice.text}
                            {choice.next ? ` (next: ${choice.next})` : ''}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function FieldList({
    title,
    kind,
    fields,
}: {
    title: string;
    kind: string;
    fields: Record<string, unknown>;
}) {
    const [keyWidth, setKeyWidth] = useState(220);
    const tableRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startWidth: number;
    } | null>(null);

    const clampWidth = (width: number) => {
        const tableWidth = tableRef.current?.getBoundingClientRect().width ?? 0;
        const maxWidth = tableWidth > 0 ? tableWidth - 120 : 600;
        return Math.min(Math.max(width, 100), Math.max(maxWidth, 100));
    };

    const startResize = (event: PointerEvent<HTMLDivElement>) => {
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: keyWidth,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const resize = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setKeyWidth(clampWidth(drag.startWidth + event.clientX - drag.startX));
    };

    const stopResize = (event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        setKeyWidth((width) =>
            clampWidth(width + (event.key === 'ArrowLeft' ? -12 : 12))
        );
    };

    return (
        <div>
            <div className="detail__head">
                <span className="detail__title">{title}</span>
                <span className="detail__kind">{kind}</span>
            </div>
            <div
                ref={tableRef}
                className="detail__field-table"
                role="table"
                aria-label={`${title} fields`}
                style={
                    {
                        '--detail-key-width': `${keyWidth}px`,
                    } as CSSProperties
                }
            >
                {Object.entries(fields).map(([key, value]) => {
                    const displayValue = formatValue(value);
                    return (
                        <div
                            key={key}
                            className="detail__row detail__field-row"
                            role="row"
                        >
                            <span
                                className="detail__key detail__field-cell"
                                role="rowheader"
                                title={key}
                            >
                                {key}
                            </span>
                            <span
                                className="detail__value detail__field-cell"
                                role="cell"
                                title={displayValue}
                            >
                                {displayValue}
                            </span>
                        </div>
                    );
                })}
                <div
                    className="detail__resize-handle"
                    role="separator"
                    aria-label="Resize key column"
                    aria-orientation="vertical"
                    aria-valuemin={100}
                    aria-valuemax={600}
                    aria-valuenow={keyWidth}
                    tabIndex={0}
                    onPointerDown={startResize}
                    onPointerMove={resize}
                    onPointerUp={stopResize}
                    onPointerCancel={stopResize}
                    onKeyDown={resizeWithKeyboard}
                />
            </div>
        </div>
    );
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return value === '' ? '""' : value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function NotFound() {
    return (
        <div className="editor__empty">
            <span>Not found in the loaded project.</span>
        </div>
    );
}
