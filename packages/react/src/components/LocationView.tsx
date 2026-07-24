/**
 * LocationView - Displays current location
 */

import type { SnapshotLocation } from '@doodle-engine/core';
import { AssetImage } from './AssetImage';

export interface LocationViewProps {
    location: SnapshotLocation;
    /** Resolved UI strings; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

export function LocationView({
    location,
    ui,
    className = '',
}: LocationViewProps) {
    return (
        <div className={`location-view ${className}`}>
            <div className="location-banner">
                {location.banner ? (
                    <AssetImage src={location.banner} alt={location.name} />
                ) : (
                    <div className="location-banner-placeholder">
                        {ui?.['ui.location_banner'] ?? 'Location Banner'}
                    </div>
                )}
            </div>

            <div className="location-content">
                <h1 className="location-name">{location.name}</h1>
                <p className="location-description">{location.description}</p>
            </div>
        </div>
    );
}
