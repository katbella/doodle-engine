/**
 * LocationView - Displays current location
 */

import React from 'react';
import type { SnapshotLocation } from '@doodle-engine/core';

export interface LocationViewProps {
    location: SnapshotLocation;
    className?: string;
}

export function LocationView({ location, className = '' }: LocationViewProps) {
    return (
        <div className={`location-view ${className}`}>
            {location.banner && (
                <div className="location-banner">
                    <img src={location.banner} alt={location.name} />
                </div>
            )}

            <div className="location-content">
                <h1 className="location-name">{location.name}</h1>
                <p className="location-description">{location.description}</p>
            </div>
        </div>
    );
}
