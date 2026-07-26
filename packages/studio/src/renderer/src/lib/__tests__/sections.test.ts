import { describe, expect, it } from 'vitest';
import type { OpenProject } from '../../../../shared/project';
import { buildSections } from '../sections';

const project = {
    registry: {
        player: {
            name: 'Player',
            stats: {},
        },
        locations: {},
        dialogues: {},
        characters: {},
        items: {},
        maps: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: { en: {} },
    },
    config: {
        playerCreatesProfile: true,
    },
    files: {
        'player:player': 'content/player.yaml',
    },
    problems: [],
} as unknown as OpenProject;

describe('Studio sections', () => {
    it('lists the optional player singleton separately from characters', () => {
        const sections = buildSections(project);

        const characterIndex = sections.findIndex(
            (section) => section.key === 'characters'
        );
        expect(sections[characterIndex + 1]).toEqual({
            key: 'player',
            label: 'Player',
            items: [
                {
                    id: 'player',
                    label: 'player.yaml',
                    status: 'valid',
                },
            ],
        });
        expect(
            sections.find((section) => section.key === 'locales')?.items
        ).toEqual([{ id: 'en', label: 'en', status: 'none' }]);
    });

    it('omits the player section when player.yaml is absent', () => {
        const withoutPlayer = {
            ...project,
            registry: {
                ...project.registry,
                player: undefined,
            },
        } as unknown as OpenProject;

        expect(
            buildSections(withoutPlayer).some(
                (section) => section.key === 'player'
            )
        ).toBe(false);
    });

    it('keeps a dialogue visible when its parse error removes it from the registry', () => {
        const withBrokenDialogue = {
            ...project,
            problems: [
                {
                    file: 'content/dialogues/broken.dlg',
                    message: 'Could not parse dialogue',
                },
            ],
        } as unknown as OpenProject;

        expect(
            buildSections(withBrokenDialogue).find(
                (section) => section.key === 'dialogues'
            )?.items
        ).toEqual([
            {
                id: 'broken',
                label: 'broken',
                status: 'error',
            },
        ]);
    });
});
