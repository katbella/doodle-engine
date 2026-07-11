import { useState } from 'react';
import type { ItemStatus, RailSection, SectionKey } from '../types';

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
}: {
    sections: RailSection[];
    activeKey: string | null;
    onOpenItem: (section: SectionKey, itemId: string, label: string) => void;
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

                    return (
                        <div key={section.key}>
                            <button
                                className="rail__section"
                                onClick={() => toggle(section.key)}
                            >
                                <span className="rail__caret">
                                    {isCollapsed ? '▸' : '▾'}
                                </span>
                                <span style={{ flex: 1 }}>{section.label}</span>
                                <span className="rail__count">
                                    {section.items.length}
                                </span>
                            </button>
                            {!isCollapsed &&
                                items.map((item) => {
                                    const key = `${section.key}:${item.id}`;
                                    return (
                                        <button
                                            key={item.id}
                                            className={`rail__item ${
                                                key === activeKey
                                                    ? 'rail__item--active'
                                                    : ''
                                            }`}
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
                                    );
                                })}
                        </div>
                    );
                })}
            </div>
            <button className="rail__new">+ New dialogue · character · item…</button>
        </div>
    );
}
