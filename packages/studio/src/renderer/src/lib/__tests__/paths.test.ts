import { describe, expect, it } from 'vitest';
import type { Dialogue } from '@doodle-engine/core';
import type { OpenProject } from '../../../../shared/project';
import {
    dialogueProblemTarget,
    filePathFor,
    lineInMessage,
    locateFile,
    problemNodeId,
    quotedTokenInMessage,
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

    it('extracts the quoted token from a problem message', () => {
        expect(
            quotedTokenInMessage(
                'Localization key "@intro.greet" not found in any locale file'
            )
        ).toBe('@intro.greet');
        expect(quotedTokenInMessage('No quotes here')).toBeNull();
    });

    it('finds the node a problem points at, by name or quoted token', () => {
        const dialogue = {
            id: 'intro',
            startNode: 'start',
            nodes: [
                {
                    id: 'start',
                    speaker: null,
                    text: 'Hello.',
                    effects: [{ type: 'setFlag', flag: 'metHero' }],
                    conditionalBranches: [
                        {
                            condition: { type: 'hasFlag', flag: 'ready' },
                            next: 'end',
                        },
                    ],
                    choices: [
                        {
                            id: 'greet',
                            text: '@intro.greet',
                            conditions: [{ type: 'hasItem', itemId: 'coin' }],
                            next: 'end',
                        },
                    ],
                },
                { id: 'end', speaker: null, text: '@intro.end', choices: [] },
            ],
        } as unknown as Dialogue;

        expect(problemNodeId('Node "end" has no way out', dialogue)).toBe(
            'end'
        );
        expect(
            problemNodeId(
                'Localization key "@intro.greet" not found in any locale file',
                dialogue
            )
        ).toBe('start');
        expect(problemNodeId('Nothing to find here', dialogue)).toBeNull();
        expect(
            problemNodeId('Node "end" has no way out', undefined)
        ).toBeNull();

        expect(
            dialogueProblemTarget(
                'Node "start" GOTO "missing" points to non-existent node',
                dialogue
            )
        ).toEqual({ nodeId: 'start', area: 'next' });
        expect(
            dialogueProblemTarget(
                'Node "start" IF block GOTO "missing" points to non-existent node',
                dialogue
            )
        ).toEqual({ nodeId: 'start', area: 'branches' });
        expect(
            dialogueProblemTarget(
                'Node "start" choice "greet" GOTO "missing" points to non-existent node',
                dialogue
            )
        ).toEqual({ nodeId: 'start', area: 'choice:greet' });
        expect(
            dialogueProblemTarget(
                'Localization key "@intro.greet" not found in any locale file',
                dialogue
            )
        ).toEqual({ nodeId: 'start', area: 'choice:greet' });
        expect(
            dialogueProblemTarget(
                'Node "start" effect "setFlag" missing required "flag" argument',
                dialogue
            )
        ).toEqual({ nodeId: 'start', area: 'effects' });
        expect(
            dialogueProblemTarget('Node "end" has no way out', dialogue)
        ).toEqual({ nodeId: 'end', area: 'node' });
    });
});
