import { serializeNode } from '@doodle-engine/core';
import type { Dialogue } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import type { SectionKey, Tab } from '../types';

/**
 * The registry collection behind each browser section. The loader's file map
 * is keyed "<collection>:<id>", so looking up a file always goes through
 * this mapping. Locales and the game config have no registry collection;
 * their paths are derived by convention instead.
 */
const SECTION_TO_COLLECTION: Partial<Record<SectionKey, string>> = {
    dialogues: 'dialogues',
    characters: 'characters',
    locations: 'locations',
    items: 'items',
    quests: 'quests',
    maps: 'maps',
    interludes: 'interludes',
    journal: 'journalEntries',
};

/** The file-map key for a section item, or null for locales/config. */
export function sectionFileKey(
    section: SectionKey,
    itemId: string
): string | null {
    const collection = SECTION_TO_COLLECTION[section];
    return collection ? `${collection}:${itemId}` : null;
}

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
    const key = sectionFileKey(tab.section, tab.itemId);
    if (key && project.files[key]) return project.files[key];
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

const COLLECTION_TO_SECTION: Record<string, SectionKey> = {
    dialogues: 'dialogues',
    characters: 'characters',
    locations: 'locations',
    items: 'items',
    quests: 'quests',
    maps: 'maps',
    interludes: 'interludes',
    journalEntries: 'journal',
};

/**
 * Which browser item a validation problem's file refers to, or null if it can't
 * be mapped. Handles real relative paths (forward or backslash) and the
 * `collection:id` form the validator uses when a file path isn't known.
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
    if (typed && COLLECTION_TO_SECTION[typed[1]]) {
        return { section: COLLECTION_TO_SECTION[typed[1]], itemId: typed[2] };
    }

    return null;
}

/** Line number embedded in a problem message (e.g. "... line 12 ..."), or 0. */
export function lineInMessage(message: string): number {
    const match = message.match(/line (\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
}

/** The first double-quoted token in a problem message, or null. */
export function quotedTokenInMessage(message: string): string | null {
    const match = message.match(/"([^"]+)"/);
    return match ? match[1] : null;
}

export type DialogueProblemArea =
    | 'node'
    | 'speaker'
    | 'line'
    | 'effects'
    | 'branches'
    | 'choices'
    | 'next'
    | `choice:${string}`;

export interface DialogueProblemTarget {
    nodeId: string;
    area: DialogueProblemArea;
}

function findProblemNode(
    message: string,
    dialogue: Dialogue | undefined
): Dialogue['nodes'][number] | null {
    if (!dialogue) return null;
    const named = message.match(/Node "([^"]+)"/i);
    if (named) {
        return dialogue.nodes.find((node) => node.id === named[1]) ?? null;
    }
    const token = quotedTokenInMessage(message);
    if (!token) return null;
    return (
        dialogue.nodes.find((node) => serializeNode(node).includes(token)) ??
        null
    );
}

/**
 * The closest visual-editor destination described by a dialogue problem.
 * Messages that identify only a node land at its header; more specific known
 * forms land at the matching field or section.
 */
export function dialogueProblemTarget(
    message: string,
    dialogue: Dialogue | undefined
): DialogueProblemTarget | null {
    const node = findProblemNode(message, dialogue);
    if (!node) return null;

    const choiceMatch = message.match(/choice(?: ID)? "([^"]+)"/i);
    if (
        choiceMatch &&
        node.choices.some((choice) => choice.id === choiceMatch[1])
    ) {
        return { nodeId: node.id, area: `choice:${choiceMatch[1]}` };
    }

    const token = quotedTokenInMessage(message);
    if (token?.startsWith('@')) {
        if (node.text === token) return { nodeId: node.id, area: 'line' };
        const choice = node.choices.find((item) => item.text === token);
        if (choice) return { nodeId: node.id, area: `choice:${choice.id}` };
    }

    if (/\bspeaker\b/i.test(message)) {
        return { nodeId: node.id, area: 'speaker' };
    }
    if (/\bIF block\b/i.test(message)) {
        return { nodeId: node.id, area: 'branches' };
    }

    const typed = message.match(/\b(condition|effect) "([^"]+)"/i);
    if (typed) {
        const [, kind, type] = typed;
        const areas = new Set<DialogueProblemArea>();
        if (
            kind.toLowerCase() === 'effect' &&
            (node.effects ?? []).some((effect) => effect.type === type)
        ) {
            areas.add('effects');
        }
        for (const branch of node.conditionalBranches ?? []) {
            if (
                (kind.toLowerCase() === 'condition' &&
                    branch.condition.type === type) ||
                (kind.toLowerCase() === 'effect' &&
                    (branch.effects ?? []).some(
                        (effect) => effect.type === type
                    ))
            ) {
                areas.add('branches');
            }
        }
        for (const choice of node.choices) {
            const matches =
                kind.toLowerCase() === 'condition'
                    ? (choice.conditions ?? []).some(
                          (condition) => condition.type === type
                      )
                    : (choice.effects ?? []).some(
                          (effect) => effect.type === type
                      );
            if (matches) areas.add(`choice:${choice.id}`);
        }
        if (areas.size === 1) {
            return { nodeId: node.id, area: [...areas][0] };
        }
    }

    if (/\bGOTO\b/i.test(message)) {
        return { nodeId: node.id, area: 'next' };
    }
    return { nodeId: node.id, area: 'node' };
}

/**
 * The dialogue node a validation problem points at, or null. Uses the node
 * named in the message when there is one; otherwise finds the node whose
 * serialized source contains the message's quoted token.
 */
export function problemNodeId(
    message: string,
    dialogue: Dialogue | undefined
): string | null {
    return findProblemNode(message, dialogue)?.id ?? null;
}
