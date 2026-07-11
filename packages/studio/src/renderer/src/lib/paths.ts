import type { OpenProject } from '../../../shared/project';
import type { SectionKey, Tab } from '../types';

/**
 * The project-relative file path backing a tab, or null when the tab has no
 * single source file to edit. Most items come from the loader's file map;
 * config, locales, and dialogues that failed to parse (and so are missing from
 * the map) are derived by convention so a broken file can still be opened.
 */
export function filePathFor(project: OpenProject, tab: Tab): string | null {
    if (tab.section === 'config') return 'content/game.yaml';
    if (tab.section === 'locales') {
        return `content/locales/${tab.itemId}.yaml`;
    }
    if (project.files[tab.itemId]) return project.files[tab.itemId];
    if (tab.section === 'dialogues') {
        return `content/dialogues/${tab.itemId}.dlg`;
    }
    return null;
}

const DIR_TO_SECTION: Record<string, SectionKey> = {
    dialogues: 'dialogues',
    characters: 'characters',
    locations: 'locations',
    items: 'items',
    quests: 'quests',
    maps: 'maps',
    interludes: 'interludes',
    journal: 'journal',
    locales: 'locales',
};

const TYPE_TO_SECTION: Record<string, SectionKey> = {
    dialogue: 'dialogues',
    character: 'characters',
    location: 'locations',
    item: 'items',
    quest: 'quests',
    map: 'maps',
    interlude: 'interludes',
    journal: 'journal',
};

/**
 * Which browser item a validation problem's file refers to, or null if it can't
 * be mapped. Handles real relative paths (forward or backslash) and the
 * `type:id` form the validator uses when a file path isn't known.
 */
export function locateFile(
    file: string
): { section: SectionKey; itemId: string } | null {
    const f = file.replace(/\\/g, '/');

    if (f === 'content/game.yaml') return { section: 'config', itemId: 'game' };

    const dlg = f.match(/content\/dialogues\/(.+)\.dlg$/);
    if (dlg) return { section: 'dialogues', itemId: dlg[1] };

    const yaml = f.match(/content\/([^/]+)\/(.+)\.ya?ml$/);
    if (yaml && DIR_TO_SECTION[yaml[1]]) {
        return { section: DIR_TO_SECTION[yaml[1]], itemId: yaml[2] };
    }

    const typed = f.match(/^(\w+):(.+)$/);
    if (typed && TYPE_TO_SECTION[typed[1]]) {
        return { section: TYPE_TO_SECTION[typed[1]], itemId: typed[2] };
    }

    return null;
}

/** Line number embedded in a problem message (e.g. "... line 12 ..."), or 0. */
export function lineInMessage(message: string): number {
    const match = message.match(/line (\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
}
