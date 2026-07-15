// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MapView } from '../components/MapView';
import type { SnapshotMap } from '@doodle-engine/core';

afterEach(cleanup);

const map: SnapshotMap = {
    id: 'town',
    name: 'Town',
    image: '',
    scale: 10,
    locations: [
        { id: 'tavern', name: 'Tavern', x: 0, y: 0, isCurrent: true },
        { id: 'market', name: 'Market', x: 100, y: 0, isCurrent: false },
    ],
};

describe('MapView real interaction', () => {
    it('clicking a destination opens a confirmation dialog, Cancel closes it without traveling', () => {
        const onTravelTo = vi.fn();
        render(
            <MapView
                map={map}
                currentLocation="tavern"
                currentTime={{ day: 1, hour: 8 }}
                onTravelTo={onTravelTo}
            />
        );

        fireEvent.click(screen.getByText('Market'));
        expect(screen.getByText('Travel to Market?')).toBeTruthy();

        fireEvent.click(screen.getByText('Cancel'));
        expect(onTravelTo).not.toHaveBeenCalled();
        expect(screen.queryByText('Travel to Market?')).toBeNull();
    });

    it('confirming travel calls onTravelTo with the destination id and closes the dialog', () => {
        const onTravelTo = vi.fn();
        render(
            <MapView
                map={map}
                currentLocation="tavern"
                currentTime={{ day: 1, hour: 8 }}
                onTravelTo={onTravelTo}
            />
        );

        fireEvent.click(screen.getByText('Market'));
        fireEvent.click(screen.getByText('Travel'));

        expect(onTravelTo).toHaveBeenCalledExactlyOnceWith('market');
        expect(screen.queryByText('Travel to Market?')).toBeNull();
    });

    it('skips the confirmation dialog when confirmTravel is false', () => {
        const onTravelTo = vi.fn();
        render(
            <MapView
                map={map}
                currentLocation="tavern"
                currentTime={{ day: 1, hour: 8 }}
                onTravelTo={onTravelTo}
                confirmTravel={false}
            />
        );

        fireEvent.click(screen.getByText('Market'));
        expect(onTravelTo).toHaveBeenCalledExactlyOnceWith('market');
        expect(screen.queryByText('Travel to Market?')).toBeNull();
    });

    it('uses localized travel dialog text when a ui catalog is supplied', () => {
        render(
            <MapView
                map={map}
                currentLocation="tavern"
                currentTime={{ day: 1, hour: 8 }}
                onTravelTo={() => {}}
                ui={{
                    'ui.travel_to': 'Viajar a {destination}?',
                    'ui.cancel': 'Cancelar',
                    'ui.travel': 'Viajar',
                }}
            />
        );
        fireEvent.click(screen.getByText('Market'));
        expect(screen.getByText('Viajar a Market?')).toBeTruthy();
        expect(screen.getByText('Cancelar')).toBeTruthy();
        expect(screen.getByText('Viajar')).toBeTruthy();
    });
});
