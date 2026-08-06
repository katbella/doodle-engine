/**
 * Inventory - Displays items with an embedded inspection pane.
 */

import { useState } from 'react';
import type { SnapshotItem } from '@doodle-engine/core';
import { uiText } from '../uiText';

export interface InventoryProps {
    items: SnapshotItem[];
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

export function Inventory({ items, ui, className = '' }: InventoryProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const inspecting =
        items.find((item) => item.id === selectedId) ?? items[0] ?? null;

    return (
        <div className={`inventory ${className}`}>
            <h2>{uiText(ui, 'ui.inventory')}</h2>
            {items.length === 0 ? (
                <p className="inventory-empty">{uiText(ui, 'ui.no_items')}</p>
            ) : (
                <div className="inventory-grid doodle-scroll">
                    {items.map((item) => (
                        <button
                            type="button"
                            key={item.id}
                            className={`inventory-item ${item.id === inspecting?.id ? 'is-selected' : ''}`}
                            onClick={() => setSelectedId(item.id)}
                            aria-pressed={item.id === inspecting?.id}
                        >
                            {item.icon ? (
                                <img
                                    src={item.icon}
                                    alt=""
                                    className="item-icon"
                                />
                            ) : (
                                <span
                                    className="item-icon item-icon-placeholder"
                                    aria-hidden="true"
                                />
                            )}
                            <span className="item-name">{item.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {inspecting && (
                <aside className="item-modal doodle-scroll">
                    <div className="item-modal-image">
                        {inspecting.image ? (
                            <img
                                src={inspecting.image}
                                alt={inspecting.name}
                                className="item-modal-image-asset"
                            />
                        ) : (
                            <span
                                className="item-modal-image-placeholder"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <h3 className="item-modal-name">{inspecting.name}</h3>
                    <p className="item-modal-description">
                        {inspecting.description}
                    </p>
                </aside>
            )}
        </div>
    );
}
