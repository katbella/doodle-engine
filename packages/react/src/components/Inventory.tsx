/**
 * Inventory - Displays player's items with click-to-inspect
 */

import { useState } from 'react'
import type { SnapshotItem } from '@doodle-engine/core'

export interface InventoryProps {
  items: SnapshotItem[]
  className?: string
}

export function Inventory({ items, className = '' }: InventoryProps) {
  const [inspecting, setInspecting] = useState<SnapshotItem | null>(null)

  return (
    <div className={`inventory ${className}`}>
      <h2>Inventory</h2>
      {items.length === 0 ? (
        <p className="inventory-empty">No items</p>
      ) : (
        <div className="inventory-grid">
          {items.map((item) => (
            <div
              key={item.id}
              className="inventory-item"
              onClick={() => setInspecting(item)}
            >
              {item.icon && (
                <img src={item.icon} alt={item.name} className="item-icon" />
              )}
              <div className="item-name">{item.name}</div>
            </div>
          ))}
        </div>
      )}

      {inspecting && (
        <div className="item-modal-overlay" onClick={() => setInspecting(null)}>
          <div className="item-modal" onClick={(e) => e.stopPropagation()}>
            {inspecting.image && (
              <img src={inspecting.image} alt={inspecting.name} className="item-modal-image" />
            )}
            <h3 className="item-modal-name">{inspecting.name}</h3>
            <p className="item-modal-description">{inspecting.description}</p>
            <button className="item-modal-close" onClick={() => setInspecting(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
