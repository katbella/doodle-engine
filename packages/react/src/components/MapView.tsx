/**
 * MapView - Displays the map with travel destinations
 */

import { useState } from 'react';
import type { SnapshotMap } from '@doodle-engine/core';
import { formatHour } from './GameTime';
import { DialogOverlay } from './DialogOverlay';
import { uiText } from '../uiText';

export interface MapViewProps {
    map: SnapshotMap | null;
    currentLocation?: string;
    currentTime?: { day: number; hour: number };
    onTravelTo: (locationId: string) => void;
    confirmTravel?: boolean;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

function calculateTravelTime(
    from: { x: number; y: number },
    to: { x: number; y: number },
    scale: number
): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(1, Math.round(distance / scale));
}

function calculateArrivalTime(
    currentTime: { day: number; hour: number },
    travelHours: number
): { day: number; hour: number } {
    let hour = currentTime.hour + travelHours;
    let day = currentTime.day;
    while (hour >= 24) {
        hour -= 24;
        day += 1;
    }
    return { day, hour };
}

export function MapView({
    map,
    currentLocation,
    currentTime,
    onTravelTo,
    confirmTravel = true,
    ui,
    className = '',
}: MapViewProps) {
    const t = (key: string) => uiText(ui, key);
    const [pendingTravel, setPendingTravel] = useState<{
        locationId: string;
        locationName: string;
        hours: number;
        arrival: { day: number; hour: number } | null;
    } | null>(null);

    if (!map) {
        return null;
    }

    function handleLocationClick(
        destId: string,
        destName: string,
        destX: number,
        destY: number
    ) {
        if (!confirmTravel) {
            onTravelTo(destId);
            return;
        }

        let hours = 1;
        if (currentLocation) {
            const currentLoc = map!.locations.find(
                (l) => l.id === currentLocation
            );
            if (currentLoc) {
                hours = calculateTravelTime(
                    currentLoc,
                    { x: destX, y: destY },
                    map!.scale
                );
            }
        }

        const arrival = currentTime
            ? calculateArrivalTime(currentTime, hours)
            : null;

        setPendingTravel({
            locationId: destId,
            locationName: destName,
            hours,
            arrival,
        });
    }

    return (
        <div className={`map-view doodle-parchment-surface ${className}`}>
            <h2 className="map-title">{map.name}</h2>

            <div className="map-container" style={{ position: 'relative' }}>
                {map.image && (
                    <img src={map.image} alt={map.name} className="map-image" />
                )}

                {map.locations.map((location) => (
                    <button
                        key={location.id}
                        className={`map-marker map-location-button ${location.isCurrent ? 'current is-current' : ''}`}
                        style={{
                            position: 'absolute',
                            left: `${location.x}px`,
                            top: `${location.y}px`,
                        }}
                        onClick={() => {
                            if (!location.isCurrent) {
                                handleLocationClick(
                                    location.id,
                                    location.name,
                                    location.x,
                                    location.y
                                );
                            }
                        }}
                        disabled={location.isCurrent}
                        title={location.name}
                    >
                        <span className="map-location-dot" aria-hidden="true" />
                        <span className="map-location-name">
                            {location.name}
                        </span>
                    </button>
                ))}
            </div>

            {pendingTravel && (
                <DialogOverlay
                    overlayClassName="travel-confirm-overlay"
                    className="travel-confirm"
                    ariaLabel={t('ui.travel_to').replace(
                        '{destination}',
                        pendingTravel.locationName
                    )}
                    onDismiss={() => setPendingTravel(null)}
                >
                    <h3 className="travel-confirm-title">
                        {t('ui.travel_to').replace(
                            '{destination}',
                            pendingTravel.locationName
                        )}
                    </h3>
                    <div className="travel-confirm-meta">
                        <p className="travel-confirm-time">
                            {pendingTravel.hours === 1
                                ? t('ui.travel_time_one')
                                : t('ui.travel_time').replace(
                                      '{hours}',
                                      String(pendingTravel.hours)
                                  )}
                        </p>
                        {pendingTravel.arrival && (
                            <p className="travel-confirm-arrival">
                                {t('ui.arrive')
                                    .replace(
                                        '{day}',
                                        String(pendingTravel.arrival.day)
                                    )
                                    .replace(
                                        '{time}',
                                        formatHour(pendingTravel.arrival.hour)
                                    )}
                            </p>
                        )}
                    </div>
                    <div className="travel-confirm-buttons">
                        <button
                            className="travel-confirm-cancel"
                            onClick={() => setPendingTravel(null)}
                        >
                            {t('ui.cancel')}
                        </button>
                        <button
                            className="travel-confirm-go"
                            onClick={() => {
                                onTravelTo(pendingTravel.locationId);
                                setPendingTravel(null);
                            }}
                        >
                            {t('ui.travel')}
                        </button>
                    </div>
                </DialogOverlay>
            )}
        </div>
    );
}
