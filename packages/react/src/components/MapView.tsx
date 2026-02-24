/**
 * MapView - Displays the map with travel destinations
 */

import { useState } from 'react';
import type { SnapshotMap } from '@doodle-engine/core';
import { formatHour } from './GameTime';

export interface MapViewProps {
    map: SnapshotMap | null;
    currentLocation?: string;
    currentTime?: { day: number; hour: number };
    onTravelTo: (locationId: string) => void;
    confirmTravel?: boolean;
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
    return Math.round(distance * scale);
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
    className = '',
}: MapViewProps) {
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
                            Travel to {pendingTravel.locationName}?
                        </h3>
                        <p className="travel-confirm-time">
                            The journey will take {pendingTravel.hours}{' '}
                            {pendingTravel.hours === 1 ? 'hour' : 'hours'}.
                            {pendingTravel.arrival && (
                                <>
                                    <br />
                                    <span className="travel-confirm-arrival">
                                        Arrive: Day{' '}
                                        {pendingTravel.arrival.day},{' '}
                                        {formatHour(pendingTravel.arrival.hour)}
                                    </span>
                                </>
                            )}
                        </p>
                        <div className="travel-confirm-buttons">
                            <button
                                className="travel-confirm-cancel"
                                onClick={() => setPendingTravel(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="travel-confirm-go"
                                onClick={() => {
                                    onTravelTo(pendingTravel.locationId);
                                    setPendingTravel(null);
                                }}
                            >
                                Travel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
