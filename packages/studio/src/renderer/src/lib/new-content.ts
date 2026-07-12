import type { SectionKey } from '../types';

/** Content types the user can create a new item for. */
export type CreatableSection = Exclude<SectionKey, 'config'>;

export const CREATABLE_SECTIONS: {
    key: CreatableSection;
    label: string;
}[] = [
    { key: 'dialogues', label: 'Dialogue' },
    { key: 'characters', label: 'Character' },
    { key: 'locations', label: 'Location' },
    { key: 'items', label: 'Item' },
    { key: 'quests', label: 'Quest' },
    { key: 'maps', label: 'Map' },
    { key: 'interludes', label: 'Interlude' },
    { key: 'journal', label: 'Journal entry' },
    { key: 'locales', label: 'Locale' },
];

/** Project-relative file path for a new item of the given type and id. */
export function pathForNewItem(section: CreatableSection, id: string): string {
    const dir: Record<CreatableSection, string> = {
        dialogues: 'content/dialogues',
        characters: 'content/characters',
        locations: 'content/locations',
        items: 'content/items',
        quests: 'content/quests',
        maps: 'content/maps',
        interludes: 'content/interludes',
        journal: 'content/journal',
        locales: 'content/locales',
    };
    const ext = section === 'dialogues' ? 'dlg' : 'yaml';
    return `${dir[section]}/${id}.${ext}`;
}

/**
 * Starter file contents for a new item. Reference fields are left empty so a new
 * item validates cleanly (the validator skips empty references); the author
 * fills them in. Text fields carry the id as a readable placeholder.
 */
export function templateForNewItem(
    section: CreatableSection,
    id: string
): string {
    switch (section) {
        case 'dialogues':
            return `NODE start\n  NARRATOR: @${id}.start\n`;
        case 'characters':
            return [
                `id: ${id}`,
                `name: ${id}`,
                `biography: ""`,
                `portrait: ""`,
                `location: ""`,
                `dialogue: ""`,
                `stats: {}`,
                '',
            ].join('\n');
        case 'locations':
            return [
                `id: ${id}`,
                `name: ${id}`,
                `description: ""`,
                `banner: ""`,
                `music: ""`,
                `ambient: ""`,
                '',
            ].join('\n');
        case 'items':
            return [
                `id: ${id}`,
                `name: ${id}`,
                `description: ""`,
                `icon: ""`,
                `image: ""`,
                `location: inventory`,
                `stats: {}`,
                '',
            ].join('\n');
        case 'quests':
            return [
                `id: ${id}`,
                `name: ${id}`,
                `description: ""`,
                `stages:`,
                `  - id: started`,
                `    description: ""`,
                '',
            ].join('\n');
        case 'maps':
            return [
                `id: ${id}`,
                `name: ${id}`,
                `image: ""`,
                `scale: 1`,
                `locations: []`,
                '',
            ].join('\n');
        case 'interludes':
            return [
                `id: ${id}`,
                `background: ""`,
                `text: ""`,
                '',
            ].join('\n');
        case 'journal':
            return [
                `id: ${id}`,
                `title: ${id}`,
                `text: ""`,
                `category: ""`,
                '',
            ].join('\n');
        case 'locales':
            return `# ${id} locale — flat key: value pairs\n`;
    }
}
