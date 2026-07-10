/**
 * Tests for the shared content loader, especially that one malformed .dlg is
 * reported without dropping the other dialogue files.
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { loadContent } from '../content-loader';

async function makeProject(
    files: Record<string, string>
): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'doodle-'));
    for (const [rel, content] of Object.entries(files)) {
        const full = join(dir, rel);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, content);
    }
    return dir;
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

describe('loadContent', () => {
    it('reports a broken .dlg by name and still loads the others', async () => {
        const dir = await makeProject({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/dialogues/a_broken.dlg': 'NODE start\n  BADKEYWORD foo\n',
            'content/dialogues/z_ok.dlg':
                'NODE start\n  NARRATOR: Hello.\n  CHOICE Bye\n    END dialogue\n  END\n',
        });

        try {
            const { registry, parseErrors } = await loadContent(
                join(dir, 'content')
            );

            // The good dialogue (which sorts after the broken one) still loaded.
            expect(registry.dialogues.z_ok).toBeDefined();
            // The broken one did not.
            expect(registry.dialogues.a_broken).toBeUndefined();
            // And it was reported by name.
            expect(parseErrors).toHaveLength(1);
            expect(parseErrors[0].file).toContain('a_broken.dlg');
            expect(parseErrors[0].message).toContain(
                'Failed to parse dialogue'
            );
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('loads a clean project with no parse errors', async () => {
        const dir = await makeProject({
            'content/game.yaml': GAME,
            'content/locations/town.yaml': TOWN,
            'content/dialogues/intro.dlg':
                'NODE start\n  NARRATOR: Hi.\n  CHOICE Bye\n    END dialogue\n  END\n',
        });

        try {
            const { registry, config, parseErrors } = await loadContent(
                join(dir, 'content')
            );

            expect(parseErrors).toEqual([]);
            expect(registry.dialogues.intro).toBeDefined();
            expect(registry.locations.town).toBeDefined();
            expect(config.startLocation).toBe('town');
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
