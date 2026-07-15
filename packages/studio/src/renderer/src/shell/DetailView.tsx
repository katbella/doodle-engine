import type { ContentRegistry, Dialogue } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import type { SectionKey, Tab } from '../types';

/**
 * Read-only view of the selected item. This is the browse surface for now; the
 * dialogue and form editors replace these views in later steps.
 */
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
    return (
        <div>
            <div className="detail__head">
                <span className="detail__title">{title}</span>
                <span className="detail__kind">{kind}</span>
            </div>
            {Object.entries(fields).map(([key, value]) => (
                <div key={key} className="detail__row">
                    <span className="detail__key">{key}</span>
                    <span className="detail__value">{formatValue(value)}</span>
                </div>
            ))}
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
