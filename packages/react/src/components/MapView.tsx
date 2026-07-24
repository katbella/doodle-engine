/**
 * MapView - Displays the map with travel destinations
 */

import { useState } from 'react';
import type { SnapshotMap } from '@doodle-engine/core';
import { formatHour } from './GameTime';
import { AssetImage } from './AssetImage';

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
    const t = (key: string, fallback: string) => ui?.[key] ?? fallback;
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

        setPendingTravel({ locationId: destId, locationName: destName, hours, arrival });
    }

    return (
        <div className={`map-view ${className}`}>
            <h2>{map.name}</h2>

            <div className="map-container" style={{ position: 'relative' }}>
                {map.image && (
                    <AssetImage
                        src={map.image}
                        alt={map.name}
                        className="map-image"
                    />
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
                        {location.name}
                    </button>
                ))}
            </div>

            {pendingTravel && (
                <div
                    className="travel-confirm-overlay"
                    onClick={() => setPendingTravel(null)}
                >
                    <div
                        className="travel-confirm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="travel-confirm-title">
                            {t('ui.travel_to', 'Travel to {destination}?').replace(
                                '{destination}',
                                pendingTravel.locationName
                            )}
                        </h3>
                        <p className="travel-confirm-time">
                            {pendingTravel.hours === 1
                                ? t(
                                      'ui.travel_time_one',
                                      'The journey will take 1 hour.'
                                  )
                                : t(
                                      'ui.travel_time',
                                      'The journey will take {hours} hours.'
                                  ).replace(
                                      '{hours}',
                                      String(pendingTravel.hours)
                                  )}
                            {pendingTravel.arrival && (
                                <>
                                    <br />
                                    <span className="travel-confirm-arrival">
                                        {t('ui.arrive', 'Arrive: Day {day}, {time}')
                                            .replace(
                                                '{day}',
                                                String(pendingTravel.arrival.day)
                                            )
                                            .replace(
                                                '{time}',
                                                formatHour(
                                                    pendingTravel.arrival.hour
                                                )
                                            )}
                                    </span>
                                </>
                            )}
                        </p>
                        <div className="travel-confirm-buttons">
                            <button
                                className="travel-confirm-cancel"
                                onClick={() => setPendingTravel(null)}
                            >
                                {t('ui.cancel', 'Cancel')}
                            </button>
                            <button
                                className="travel-confirm-go"
                                onClick={() => {
                                    onTravelTo(pendingTravel.locationId);
                                    setPendingTravel(null);
                                }}
                            >
                                {t('ui.travel', 'Travel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
