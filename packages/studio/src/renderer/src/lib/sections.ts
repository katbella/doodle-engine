import type { OpenProject } from '../../../shared/project';
import type { RailSection, RailItem, ItemStatus } from '../types';
import type { SectionKey } from '../types';
import { sectionFileKey } from './paths';

const norm = (s: string) => s.replace(/\\/g, '/');

/**
 * Turn a loaded project into the left-rail sections. Items are marked with an
 * error when a validation problem points at their file. Dialogues that failed
 * to parse are dropped from the registry, so they're added back from the
 * problem list — otherwise a broken file would vanish and couldn't be reopened.
 */
export function buildSections(project: OpenProject): RailSection[] {
    const errorFiles = new Set(project.problems.map((p) => norm(p.file)));
    const files = project.files;

    const statusForPath = (path: string | undefined): ItemStatus =>
        path && errorFiles.has(norm(path)) ? 'error' : 'valid';

    const fileFor = (section: SectionKey, id: string): string | undefined => {
        const key = sectionFileKey(section, id);
        return key ? files[key] : undefined;
    };

    const listed = (
        section: SectionKey,
        ids: string[],
        label: (id: string) => string = (id) => id,
        status: (id: string) => ItemStatus = (id) =>
            statusForPath(fileFor(section, id))
    ): RailItem[] =>
        [...ids]
            .sort()
            .map((id) => ({ id, label: label(id), status: status(id) }));

    const r = project.registry;

    // Dialogue files that failed to parse: recover their ids from the problems.
    const brokenDialogueIds = project.problems
        .map((p) => norm(p.file).match(/content\/dialogues\/(.+)\.dlg$/)?.[1])
        .filter((id): id is string => !!id && !r.dialogues[id]);
    const dialogueIds = [
        ...new Set([...Object.keys(r.dialogues), ...brokenDialogueIds]),
    ];

    return [
        {
            key: 'dialogues',
            label: 'Dialogues',
            items: listed(
                'dialogues',
                dialogueIds,
                (id) => `${id}.dlg`,
                (id) =>
                    statusForPath(
                        fileFor('dialogues', id) ??
                            `content/dialogues/${id}.dlg`
                    )
            ),
        },
        {
            key: 'characters',
            label: 'Characters',
            items: listed('characters', Object.keys(r.characters)),
        },
        {
            key: 'locations',
            label: 'Locations',
            items: listed('locations', Object.keys(r.locations)),
        },
        {
            key: 'items',
            label: 'Items',
            items: listed('items', Object.keys(r.items)),
        },
        {
            key: 'quests',
            label: 'Quests',
            items: listed('quests', Object.keys(r.quests)),
        },
        {
            key: 'maps',
            label: 'Maps',
            items: listed('maps', Object.keys(r.maps)),
        },
        {
            key: 'interludes',
            label: 'Interludes',
            items: listed('interludes', Object.keys(r.interludes)),
        },
        {
            key: 'journal',
            label: 'Journal',
            items: listed('journal', Object.keys(r.journalEntries)),
        },
        {
            key: 'locales',
            label: 'Locales',
            items: listed('locales', Object.keys(r.locales), (id) => id, () => 'none'),
        },
        {
            key: 'config',
            label: 'Game config',
            items: [
                {
                    id: 'game',
                    label: 'game.yaml',
                    status: statusForPath('content/game.yaml'),
                },
            ],
        },
    ];
}
