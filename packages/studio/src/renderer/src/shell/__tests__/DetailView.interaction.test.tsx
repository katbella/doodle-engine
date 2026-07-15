import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OpenProject } from '../../../../shared/project';
import type { SectionKey, Tab } from '../../types';
import { DetailView } from '../DetailView';

const project = {
    registry: {
        dialogues: {
            intro: {
                id: 'intro',
                startNode: 'start',
                triggerLocation: 'town',
                nodes: [
                    {
                        id: 'start',
                        speaker: null,
                        text: 'Hello',
                        choices: [{ id: 'go', text: 'Continue', next: 'end' }],
                    },
                    { id: 'end', speaker: 'hero', text: '', choices: [] },
                ],
            },
        },
        characters: { hero: { id: 'hero', name: 'Hero', biography: null } },
        locations: { town: { id: 'town', name: 'Town' } },
        items: { coin: { id: 'coin', name: 'Coin' } },
        quests: { main: { id: 'main', name: 'Main' } },
        maps: { world: { id: 'world', name: 'World' } },
        interludes: { opening: { id: 'opening', text: 'Opening' } },
        journalEntries: { clue: { id: 'clue', title: 'Clue' } },
        locales: { en: { greeting: 'Hello' } },
    },
    config: {
        startLocation: 'town',
        startInventory: [],
        optional: undefined,
        empty: '',
        nested: { enabled: true },
    },
} as unknown as OpenProject;

function tab(section: SectionKey, itemId: string): Tab {
    return { key: `${section}:${itemId}`, label: itemId, section, itemId };
}

describe('DetailView', () => {
    it('renders dialogue structure, trigger, start node, narrator, and choices', () => {
        const html = renderToStaticMarkup(
            <DetailView project={project} tab={tab('dialogues', 'intro')} />
        );
        expect(html).toContain('intro.dlg');
        expect(html).toContain('dialogue · 2 nodes');
        expect(html).toContain('town');
        expect(html).toContain('Narrator');
        expect(html).toContain('Continue (next: end)');
        expect(html).toContain('node--start');
    });

    it('renders every registry entity section', () => {
        const cases: Array<[SectionKey, string, string]> = [
            ['characters', 'hero', 'character'],
            ['locations', 'town', 'location'],
            ['items', 'coin', 'item'],
            ['quests', 'main', 'quest'],
            ['maps', 'world', 'map'],
            ['interludes', 'opening', 'interlude'],
            ['journal', 'clue', 'journal entry'],
        ];
        for (const [section, id, kind] of cases) {
            const html = renderToStaticMarkup(
                <DetailView project={project} tab={tab(section, id)} />
            );
            expect(html).toContain(kind);
            expect(html).toContain(id);
        }
    });

    it('renders locales and config values of every supported shape', () => {
        const locale = renderToStaticMarkup(
            <DetailView project={project} tab={tab('locales', 'en')} />
        );
        expect(locale).toContain('greeting');
        expect(locale).toContain('Hello');

        const config = renderToStaticMarkup(
            <DetailView project={project} tab={tab('config', 'game')} />
        );
        expect(config).toContain('game.yaml');
        expect(config).toContain('—');
        expect(config).toContain('&quot;&quot;');
        expect(config).toContain('{&quot;enabled&quot;:true}');
    });

    it('renders a not-found state for every missing category', () => {
        for (const section of ['dialogues', 'locales', 'characters'] as const) {
            const html = renderToStaticMarkup(
                <DetailView project={project} tab={tab(section, 'missing')} />
            );
            expect(html).toContain('Not found in the loaded project.');
        }
    });
});
