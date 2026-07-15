// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { buildUIStrings } from '@doodle-engine/core';
import type { SaveData } from '@doodle-engine/core';
import { SaveLoadPanel } from '../components/SaveLoadPanel';
import { writeSave } from '../saves';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const ui = buildUIStrings({});

function makeSave(day: number): SaveData {
    return {
        version: '1.0',
        timestamp: new Date(2026, 0, day).toISOString(),
        state: {
            currentLocation: 'tavern',
            currentTime: { day, hour: 8 },
            flags: {},
            variables: {},
            inventory: [],
            questProgress: {},
            unlockedJournalEntries: [],
            playerNotes: [],
            dialogueState: null,
            characterState: {},
            itemLocations: {},
            mapEnabled: true,
            notifications: [],
            pendingSounds: [],
            musicOverride: null,
            pendingVideo: null,
            pendingInterlude: null,
            currentLocale: 'en',
        },
    };
}

describe('SaveLoadPanel real interaction', () => {
    it('starts with no saves', () => {
        render(
            <SaveLoadPanel
                ui={ui}
                onSave={() => makeSave(1)}
                onLoad={() => {}}
                storageKey="test-saves"
            />
        );
        expect(screen.getByText('No saves yet')).toBeTruthy();
    });

    it('New Save writes a real slot to localStorage and lists it', () => {
        const onSave = vi.fn(() => makeSave(3));
        render(
            <SaveLoadPanel
                ui={ui}
                onSave={onSave}
                onLoad={() => {}}
                storageKey="test-saves"
            />
        );
        fireEvent.click(screen.getByText('New Save'));

        expect(onSave).toHaveBeenCalledOnce();
        expect(screen.queryByText('No saves yet')).toBeNull();
        expect(screen.getByText('Day 3')).toBeTruthy();

        const stored = JSON.parse(localStorage.getItem('test-saves')!);
        expect(stored).toHaveLength(1);
        expect(stored[0].kind).toBe('manual');
    });

    it('Load hands the stored save back to onLoad', () => {
        const onLoad = vi.fn();
        render(
            <SaveLoadPanel
                ui={ui}
                onSave={() => makeSave(5)}
                onLoad={onLoad}
                storageKey="test-saves"
            />
        );
        fireEvent.click(screen.getByText('New Save'));
        fireEvent.click(screen.getByText('Load'));

        expect(onLoad).toHaveBeenCalledOnce();
        const loaded = onLoad.mock.calls[0][0] as SaveData;
        expect(loaded.state.currentTime.day).toBe(5);
    });

    it('Delete removes the slot from the list and from localStorage', () => {
        render(
            <SaveLoadPanel
                ui={ui}
                onSave={() => makeSave(7)}
                onLoad={() => {}}
                storageKey="test-saves"
            />
        );
        fireEvent.click(screen.getByText('New Save'));
        expect(screen.getByText('Day 7')).toBeTruthy();

        fireEvent.click(screen.getByText('Delete'));
        expect(screen.queryByText('Day 7')).toBeNull();
        expect(screen.getByText('No saves yet')).toBeTruthy();
        expect(JSON.parse(localStorage.getItem('test-saves')!)).toEqual([]);
    });

    it('each New Save click adds another manual slot rather than overwriting', () => {
        let day = 1;
        render(
            <SaveLoadPanel
                ui={ui}
                onSave={() => makeSave(day++)}
                onLoad={() => {}}
                storageKey="test-saves"
            />
        );
        fireEvent.click(screen.getByText('New Save'));
        fireEvent.click(screen.getByText('New Save'));

        const stored = JSON.parse(localStorage.getItem('test-saves')!);
        expect(stored).toHaveLength(2);
    });

    it('localizes the built-in quick, auto, and day labels', () => {
        writeSave(localStorage, 'test-saves', makeSave(2), 'quick');
        writeSave(localStorage, 'test-saves', makeSave(3), 'auto');
        writeSave(localStorage, 'test-saves', makeSave(4), 'manual');
        render(
            <SaveLoadPanel
                ui={{
                    ...ui,
                    'ui.quick_save': 'Guardado rápido',
                    'ui.autosave': 'Autoguardado',
                    'ui.day': 'Día {day}',
                }}
                onSave={() => makeSave(5)}
                onLoad={() => {}}
                storageKey="test-saves"
            />
        );

        expect(screen.getByText('Guardado rápido')).toBeTruthy();
        expect(screen.getByText('Autoguardado')).toBeTruthy();
        expect(screen.getByText('Día 4')).toBeTruthy();
    });

    it('localizes legacy generic labels without replacing named saves', () => {
        const save = makeSave(2);
        localStorage.setItem(
            'test-saves',
            JSON.stringify([
                {
                    id: 'legacy',
                    kind: 'manual',
                    label: 'Save',
                    timestamp: save.timestamp,
                    save,
                },
                {
                    id: 'named',
                    kind: 'manual',
                    label: 'Before the finale',
                    timestamp: save.timestamp,
                    save,
                },
            ])
        );

        render(
            <SaveLoadPanel
                ui={{ ...ui, 'ui.save': 'Guardar' }}
                onSave={() => makeSave(3)}
                onLoad={() => {}}
                storageKey="test-saves"
            />
        );

        expect(screen.getByText('Guardar')).toBeTruthy();
        expect(screen.getByText('Before the finale')).toBeTruthy();
    });
});
