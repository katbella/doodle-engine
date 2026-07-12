import { useState } from 'react';
import type { ItemStatus, RailSection, SectionKey } from '../types';
import type { CreatableSection } from '../lib/new-content';

const STATUS_COLOR: Record<ItemStatus, string> = {
    valid: 'var(--valid)',
    warn: 'var(--warn)',
    error: 'var(--error)',
    none: 'transparent',
};

export function LeftRail({
    sections,
    activeKey,
    onOpenItem,
    onNewItem,
    onDeleteItem,
    onRenameItem,
}: {
    sections: RailSection[];
    activeKey: string | null;
    onOpenItem: (section: SectionKey, itemId: string, label: string) => void;
    onNewItem: (section: CreatableSection) => void;
    onDeleteItem: (
        section: CreatableSection,
        itemId: string,
        label: string
    ) => void;
    onRenameItem: (section: CreatableSection, id: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState<Set<SectionKey>>(
        () => new Set(sections.filter((s) => s.items.length === 0).map((s) => s.key))
    );

    const toggle = (key: SectionKey) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    const q = query.trim().toLowerCase();

    return (
        <div className="rail">
            <div className="rail__search">
                <input
                    className="rail__searchbox"
                    placeholder="Search project…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <div className="rail__list scroll">
                {sections.map((section) => {
                    const items = q
                        ? section.items.filter((i) =>
                              i.label.toLowerCase().includes(q)
                          )
                        : section.items;
                    if (q && items.length === 0) return null;

                    // A search always expands matching sections.
                    const isCollapsed = !q && collapsed.has(section.key);

                    const creatable = section.key !== 'config';

                    return (
                        <div key={section.key}>
                            <div className="rail__section-row">
                                <button
                                    className="rail__section"
                                    onClick={() => toggle(section.key)}
                                >
                                    <span className="rail__caret">
                                        {isCollapsed ? '▸' : '▾'}
                                    </span>
                                    <span style={{ flex: 1 }}>
                                        {section.label}
                                    </span>
                                    <span className="rail__count">
                                        {section.items.length}
                                    </span>
                                </button>
                                {creatable && (
                                    <button
                                        className="rail__section-add"
                                        title={`New ${section.label.replace(/s$/, '').toLowerCase()}`}
                                        onClick={() =>
                                            onNewItem(
                                                section.key as CreatableSection
                                            )
                                        }
                                    >
                                        +
                                    </button>
                                )}
                            </div>
                            {!isCollapsed &&
                                items.map((item) => {
                                    const key = `${section.key}:${item.id}`;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`rail__item ${
                                                key === activeKey
                                                    ? 'rail__item--active'
                                                    : ''
                                            }`}
                                        >
                                            <button
                                                className="rail__item-open"
                                                onClick={() =>
                                                    onOpenItem(
                                                        section.key,
                                                        item.id,
                                                        item.label
                                                    )
                                                }
                                            >
                                                <span className="rail__item-label">
                                                    {item.label}
                                                </span>
                                                {item.status !== 'none' && (
                                                    <span
                                                        className="status__dot"
                                                        style={{
                                                            background:
                                                                STATUS_COLOR[
                                                                    item.status
                                                                ],
                                                        }}
                                                        title={item.status}
                                                    />
                                                )}
                                            </button>
                                            {creatable && (
                                                <>
                                                    <button
                                                        className="rail__item-action"
                                                        title={`Rename ${item.label}`}
                                                        onClick={() =>
                                                            onRenameItem(
                                                                section.key as CreatableSection,
                                                                item.id
                                                            )
                                                        }
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        className="rail__item-action rail__item-delete"
                                                        title={`Delete ${item.label}`}
                                                        onClick={() =>
                                                            onDeleteItem(
                                                                section.key as CreatableSection,
                                                                item.id,
                                                                item.label
                                                            )
                                                        }
                                                    >
                                                        ×
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    );
                })}
            </div>
            <button
                className="rail__new"
                onClick={() => onNewItem('dialogues')}
            >
                + New content…
            </button>
        </div>
    );
}
