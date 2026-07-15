/**
 * Tests that the loader and validator tell the author about every broken
 * file instead of quietly skipping it: malformed YAML, missing ids,
 * duplicate ids, a broken game.yaml, half-written entities, and content
 * problems that used to slip through (missing speakers, dialogue REQUIRE
 * targets, interlude trigger conditions, bad numbers, bad map scales).
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { loadProject } from '../load-project';
import { validateContent } from '../validate';
import type { LoadedContent } from '../load-project';

async function makeProject(files: Record<string, string>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'doodle-'));
    for (const [rel, content] of Object.entries(files)) {
        const full = join(dir, rel);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, content);
    }
    return dir;
}

async function loadAndValidate(
    files: Record<string, string>
): Promise<{ loaded: LoadedContent; all: string[] }> {
    const dir = await makeProject(files);
    try {
        const loaded = await loadProject(dir);
        const all = [
            ...loaded.parseErrors,
            ...validateContent(loaded.registry, loaded.fileMap, loaded.config),
        ].map((e) => `${e.file} :: ${e.message}`);
        return { loaded, all };
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

const GAME = `startLocation: town
startTime: { day: 1, hour: 8 }
startFlags: {}
startVariables: {}
startInventory: []
`;

const TOWN = `id: town
name: Town
description: A town.
`;

describe('loader diagnostics', () => {
    it('reports a malformed YAML file and still loads its siblings', async () => {
        const { loaded, all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/a_town.yaml': TOWN,
            'content/locations/m_broken.yaml': 'id: broken\nname: [unclosed\n  bad: {{{\n',
            'content/locations/z_later.yaml':
                'id: later\nname: Later\ndescription: Loads fine.\n',
        });

        expect(loaded.registry.locations.town).toBeDefined();
        expect(loaded.registry.locations.later).toBeDefined();
        expect(
            all.some((e) => e.includes('m_broken.yaml') && e.includes('YAML'))
        ).toBe(true);
    });

    it('reports a YAML file that has no id', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/items/no_id.yaml': 'name: Mystery\ndescription: Who am I\n',
        });
        expect(all.some((e) => e.includes('no_id.yaml') && e.includes('"id"'))).toBe(
            true
        );
    });

    it('reports two files of one type sharing an id, first file wins', async () => {
        const { loaded, all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/locations/a_first.yaml':
                'id: dup\nname: First\ndescription: first.\n',
            'content/locations/z_second.yaml':
                'id: dup\nname: Second\ndescription: second.\n',
        });

        expect(loaded.registry.locations.dup.name).toBe('First');
        expect(loaded.fileMap.get('locations:dup')).toContain('a_first.yaml');
        expect(
            all.some(
                (e) => e.includes('z_second.yaml') && e.includes('already used')
            )
        ).toBe(true);
    });

    it('lets two different types share an id, each mapped to its own file', async () => {
        const { loaded, all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/locations/shared.yaml':
                'id: shared\nname: Shared Place\ndescription: x.\n',
            'content/items/shared.yaml':
                'id: shared\nname: Shared Item\ndescription: x.\nlocation: inventory\n',
        });

        expect(loaded.registry.locations.shared).toBeDefined();
        expect(loaded.registry.items.shared).toBeDefined();
        expect(loaded.fileMap.get('locations:shared')).toContain(
            join('locations', 'shared.yaml')
        );
        expect(loaded.fileMap.get('items:shared')).toContain(
            join('items', 'shared.yaml')
        );
        expect(all).toEqual([]);
    });

    it('reports a game.yaml that cannot be parsed', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': 'startLocation: [unclosed\n  {{{\n',
            'content/locations/town.yaml': TOWN,
        });
        expect(
            all.some((e) => e.includes('game.yaml') && e.includes('YAML'))
        ).toBe(true);
    });

    it('reports a malformed locale file and keeps the others', async () => {
        const { loaded, all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/locales/broken.yaml': 'key: [unclosed\n  {{{\n',
            'content/locales/en.yaml': 'greeting: Hello\n',
        });
        expect(loaded.registry.locales.en).toBeDefined();
        expect(
            all.some((e) => e.includes('broken.yaml') && e.includes('YAML'))
        ).toBe(true);
    });
});

describe('validator coverage', () => {
    it('does not crash on a location that only has an id', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': 'id: town\n',
        });
        expect(all.some((e) => e.includes('missing required field "name"'))).toBe(
            true
        );
    });

    it('does not crash on a quest without stages', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/quests/q.yaml': 'id: q\nname: Quest\ndescription: d.\n',
            'content/dialogues/d.dlg': [
                'NODE start',
                '  CHOICE go',
                '    REQUIRE questAtStage q missing',
                '    END dialogue',
                '  END',
            ].join('\n'),
        });
        expect(all.some((e) => e.includes('has no stages'))).toBe(true);
    });

    it('reports a speaker that is not a character', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/dialogues/ghost.dlg': [
                'NODE start',
                '  GHOST: Boo.',
                '  END dialogue',
            ].join('\n'),
        });
        expect(
            all.some((e) => e.includes('speaker "ghost"'))
        ).toBe(true);
    });

    it('reports a missing item in a dialogue top-level REQUIRE', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/dialogues/gated.dlg': [
                'REQUIRE hasItem missing_key',
                'NODE start',
                '  NARRATOR: Hi.',
                '  END dialogue',
            ].join('\n'),
        });
        expect(
            all.some(
                (e) => e.includes('REQUIRE') && e.includes('missing_key')
            )
        ).toBe(true);
    });

    it('reports a missing item in an interlude trigger condition', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/interludes/intro.yaml': [
                'id: intro',
                'text: Chapter One',
                'triggerLocation: town',
                'triggerConditions:',
                '  - type: hasItem',
                '    itemId: missing_item',
            ].join('\n'),
        });
        expect(
            all.some(
                (e) =>
                    e.includes('trigger condition') &&
                    e.includes('missing_item')
            )
        ).toBe(true);
    });

    it('reports a number argument that is not a number', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/dialogues/pay.dlg': [
                'NODE start',
                '  NARRATOR: Payday.',
                '  ADD variable gold nope',
                '  END dialogue',
            ].join('\n'),
        });
        expect(
            all.some((e) => e.includes('not a usable number'))
        ).toBe(true);
    });

    it('reports a map scale of zero', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/locations/port.yaml':
                'id: port\nname: Port\ndescription: p.\n',
            'content/maps/world.yaml': [
                'id: world',
                'name: World',
                'image: map.png',
                'scale: 0',
                'locations:',
                '  - id: town',
                '    x: 0',
                '    y: 0',
                '  - id: port',
                '    x: 10',
                '    y: 0',
            ].join('\n'),
        });
        expect(all.some((e) => e.includes('scale greater than zero'))).toBe(true);
    });

    it('accepts a healthy project with none of these problems', async () => {
        const { all } = await loadAndValidate({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/dialogues/hello.dlg': [
                'NODE start',
                '  NARRATOR: Hello there.',
                '  END dialogue',
            ].join('\n'),
        });
        expect(all).toEqual([]);
    });
});

describe('createProject destination safety', () => {
    it('refuses a destination folder that is not empty', async () => {
        const { createProject } = await import('../create-project');
        const target = await mkdtemp(join(tmpdir(), 'doodle-create-'));
        try {
            await mkdir(join(target, 'existing', 'src'), { recursive: true });
            await writeFile(
                join(target, 'existing', 'src', 'App.tsx'),
                'my own work\n'
            );
            await expect(
                createProject('existing', {
                    targetDir: target,
                    useDefaultRenderer: true,
                    useStarterStyles: true,
                })
            ).rejects.toThrow('not empty');
            const kept = await import('node:fs/promises').then((fs) =>
                fs.readFile(join(target, 'existing', 'src', 'App.tsx'), 'utf-8')
            );
            expect(kept).toBe('my own work\n');
        } finally {
            await rm(target, { recursive: true, force: true });
        }
    });
});
