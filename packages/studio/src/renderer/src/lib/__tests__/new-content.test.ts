import { describe, it, expect } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { parseDialogue } from '@doodle-engine/core';
import {
    CREATABLE_SECTIONS,
    pathForNewItem,
    templateForNewItem,
    type CreatableSection,
} from '../new-content';

describe('pathForNewItem', () => {
    it('puts dialogues in content/dialogues with a .dlg extension', () => {
        expect(pathForNewItem('dialogues', 'intro')).toBe(
            'content/dialogues/intro.dlg'
        );
    });

    it('puts YAML entities in their content folder', () => {
        expect(pathForNewItem('characters', 'guard')).toBe(
            'content/characters/guard.yaml'
        );
        expect(pathForNewItem('journal', 'note')).toBe(
            'content/journal/note.yaml'
        );
    });
});

describe('templateForNewItem', () => {
    it('produces a parseable dialogue whose start node id matches', () => {
        const dialogue = parseDialogue(
            templateForNewItem('dialogues', 'intro'),
            'intro'
        );
        expect(dialogue.startNode).toBe('start');
        expect(dialogue.nodes).toHaveLength(1);
    });

    it('produces valid YAML carrying the id for every entity type', () => {
        const yamlSections = CREATABLE_SECTIONS.map((s) => s.key).filter(
            (key): key is Exclude<CreatableSection, 'dialogues' | 'locales'> =>
                key !== 'dialogues' && key !== 'locales'
        );

        for (const section of yamlSections) {
            const parsed = parseYaml(templateForNewItem(section, 'thing')) as {
                id: string;
            };
            expect(parsed.id, section).toBe('thing');
        }
    });

    it('leaves reference fields empty so a new item validates cleanly', () => {
        const character = parseYaml(
            templateForNewItem('characters', 'guard')
        ) as { location: string; dialogue: string };
        expect(character.location).toBe('');
        expect(character.dialogue).toBe('');
    });
});
