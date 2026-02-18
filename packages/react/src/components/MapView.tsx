/**
 * MapView - Displays the map with travel destinations
 */

import React from 'react';
import type { SnapshotMap } from '@doodle-engine/core';

export interface MapViewProps {
    map: SnapshotMap | null;
    onTravelTo: (locationId: string) => void;
    className?: string;
}

export function MapView({ map, onTravelTo, className = '' }: MapViewProps) {
    if (!map) {
        return null;
    }

    return (
        <div className={`map-view ${className}`}>
            <h2>{map.name}</h2>

            <div className="map-container" style={{ position: 'relative' }}>
                {map.image && (
                    <img src={map.image} alt={map.name} className="map-image" />
                )}

                {map.locations.map((location) => (
                    <button
                        key={location.id}
                        className={`map-marker ${location.isCurrent ? 'current' : ''}`}
                        style={{
                            position: 'absolute',
                            left: `${location.x}px`,
                            top: `${location.y}px`,
                        }}
                        onClick={() =>
                            !location.isCurrent && onTravelTo(location.id)
                        }
                        disabled={location.isCurrent}
                        title={location.name}
                    >
                        {location.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
