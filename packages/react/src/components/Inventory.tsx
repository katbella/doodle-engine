/**
 * Inventory - Displays player's items with click-to-inspect
 */

import { useState } from 'react';
import type { SnapshotItem } from '@doodle-engine/core';
import { AssetImage } from './AssetImage';
import { DialogOverlay } from './DialogOverlay';
import { uiText } from '../uiText';

export interface InventoryProps {
    items: SnapshotItem[];
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

export function Inventory({ items, ui, className = '' }: InventoryProps) {
    const [inspecting, setInspecting] = useState<SnapshotItem | null>(null);

    return (
        <div className={`inventory ${className}`}>
            <h2>{uiText(ui, 'ui.inventory')}</h2>
            {items.length === 0 ? (
                <p className="inventory-empty">{uiText(ui, 'ui.no_items')}</p>
            ) : (
                <div className="inventory-grid">
                    {items.map((item) => (
                        <button
                            type="button"
                            key={item.id}
                            className="inventory-item"
                            onClick={() => setInspecting(item)}
                        >
                            {item.icon && (
                                <AssetImage
                                    src={item.icon}
                                    alt={item.name}
                                    className="item-icon"
                                />
                            )}
                            <span className="item-name">{item.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {inspecting && (
                <DialogOverlay
                    overlayClassName="item-modal-overlay"
                    className="item-modal"
                    ariaLabel={inspecting.name}
                    onDismiss={() => setInspecting(null)}
                >
                    {inspecting.image && (
                        <AssetImage
                            src={inspecting.image}
                            alt={inspecting.name}
                            className="item-modal-image"
                        />
                    )}
                    <h3 className="item-modal-name">{inspecting.name}</h3>
                    <p className="item-modal-description">
                        {inspecting.description}
                    </p>
                    <button
                        className="item-modal-close"
                        onClick={() => setInspecting(null)}
                    >
                        {uiText(ui, 'ui.close')}
                    </button>
                </DialogOverlay>
            )}
        </div>
    );
}
