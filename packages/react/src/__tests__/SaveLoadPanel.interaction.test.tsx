// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { buildUIStrings } from '@doodle-engine/core';
import type { SaveData } from '@doodle-engine/core';
import { SaveLoadPanel } from '../components/SaveLoadPanel';
import { saveStorageKeyForProject, writeSave } from '../saves';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const ui = buildUIStrings({});
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const SAVE_KEY = saveStorageKeyForProject(PROJECT_ID);

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
                projectId={PROJECT_ID}
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
                projectId={PROJECT_ID}
            />
        );
        fireEvent.click(screen.getByText('New Save'));

        expect(onSave).toHaveBeenCalledOnce();
        expect(screen.queryByText('No saves yet')).toBeNull();
        expect(screen.getByText('Day 3')).toBeTruthy();
        expect(document.querySelector('.save-slot-info')?.textContent).toMatch(
            /^Day 3 · /
        );

        const stored = JSON.parse(localStorage.getItem(SAVE_KEY)!);
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
                projectId={PROJECT_ID}
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
                projectId={PROJECT_ID}
            />
        );
        fireEvent.click(screen.getByText('New Save'));
        expect(screen.getByText('Day 7')).toBeTruthy();

        fireEvent.click(screen.getByText('Delete'));
        expect(screen.queryByText('Day 7')).toBeNull();
        expect(screen.getByText('No saves yet')).toBeTruthy();
        expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual([]);
    });

    it('each New Save click adds another manual slot rather than overwriting', () => {
        let day = 1;
        render(
            <SaveLoadPanel
                ui={ui}
                onSave={() => makeSave(day++)}
                onLoad={() => {}}
                projectId={PROJECT_ID}
            />
        );
        fireEvent.click(screen.getByText('New Save'));
        fireEvent.click(screen.getByText('New Save'));

        const stored = JSON.parse(localStorage.getItem(SAVE_KEY)!);
        expect(stored).toHaveLength(2);
    });

    it('localizes the built-in quick, auto, and day labels', () => {
        writeSave(localStorage, SAVE_KEY, makeSave(2), 'quick');
        writeSave(localStorage, SAVE_KEY, makeSave(3), 'auto');
        writeSave(localStorage, SAVE_KEY, makeSave(4), 'manual');
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
                projectId={PROJECT_ID}
            />
        );

        expect(screen.getByText('Guardado rápido')).toBeTruthy();
        expect(screen.getByText('Autoguardado')).toBeTruthy();
        expect(screen.getByText('Día 4')).toBeTruthy();
    });

    it('localizes legacy generic labels without replacing named saves', () => {
        const save = makeSave(2);
        localStorage.setItem(
            SAVE_KEY,
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
                projectId={PROJECT_ID}
            />
        );

        expect(screen.getByText('Guardar')).toBeTruthy();
        expect(screen.getByText('Before the finale')).toBeTruthy();
    });
});
