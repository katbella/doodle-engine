import { describe, expect, it } from 'vitest';
import type { OpenProject } from '../../../../shared/project';
import {
    filePathFor,
    lineInMessage,
    locateFile,
    sectionFileKey,
} from '../paths';

const project = {
    files: {
        'characters:hero': 'content/characters/custom-hero.yaml',
        'dialogues:intro': 'content/dialogues/custom-intro.dlg',
    },
} as unknown as OpenProject;

describe('renderer file paths', () => {
    it('maps every registry-backed section to its loader key', () => {
        expect(sectionFileKey('dialogues', 'intro')).toBe('dialogues:intro');
        expect(sectionFileKey('characters', 'hero')).toBe('characters:hero');
        expect(sectionFileKey('locations', 'town')).toBe('locations:town');
        expect(sectionFileKey('items', 'coin')).toBe('items:coin');
        expect(sectionFileKey('quests', 'main')).toBe('quests:main');
        expect(sectionFileKey('maps', 'world')).toBe('maps:world');
        expect(sectionFileKey('interludes', 'opening')).toBe(
            'interludes:opening'
        );
        expect(sectionFileKey('journal', 'clue')).toBe('journalEntries:clue');
        expect(sectionFileKey('locales', 'en')).toBeNull();
        expect(sectionFileKey('config', 'game')).toBeNull();
    });

    it('uses mapped files and documented conventional fallbacks', () => {
        expect(
            filePathFor(project, {
                key: 'characters:hero',
                label: 'Hero',
                section: 'characters',
                itemId: 'hero',
            })
        ).toBe('content/characters/custom-hero.yaml');
        expect(
            filePathFor(project, {
                key: 'config:game',
                label: 'Game',
                section: 'config',
                itemId: 'game',
            })
        ).toBe('content/game.yaml');
        expect(
            filePathFor(project, {
                key: 'locales:es',
                label: 'Spanish',
                section: 'locales',
                itemId: 'es',
            })
        ).toBe('content/locales/es.yaml');
        expect(
            filePathFor(project, {
                key: 'dialogues:broken',
                label: 'Broken',
                section: 'dialogues',
                itemId: 'broken',
            })
        ).toBe('content/dialogues/broken.dlg');
        expect(
            filePathFor(project, {
                key: 'items:missing',
                label: 'Missing',
                section: 'items',
                itemId: 'missing',
            })
        ).toBeNull();
    });

    it('locates config, dialogue, YAML, Windows, and typed problem files', () => {
        expect(locateFile('content/game.yaml')).toEqual({
            section: 'config',
            itemId: 'game',
        });
        expect(locateFile('content/dialogues/intro.dlg')).toEqual({
            section: 'dialogues',
            itemId: 'intro',
        });
        expect(locateFile('content/characters/hero.yml')).toEqual({
            section: 'characters',
            itemId: 'hero',
        });
        expect(locateFile('content\\locales\\es.yaml')).toEqual({
            section: 'locales',
            itemId: 'es',
        });
        expect(locateFile('journalEntries:clue')).toEqual({
            section: 'journal',
            itemId: 'clue',
        });
        expect(locateFile('unknown:file')).toBeNull();
        expect(locateFile('README.md')).toBeNull();
    });

    it('extracts line numbers without inventing one', () => {
        expect(lineInMessage('Invalid value at line 42, column 3')).toBe(42);
        expect(lineInMessage('LINE 7 is malformed')).toBe(7);
        expect(lineInMessage('No location available')).toBe(0);
    });
});
