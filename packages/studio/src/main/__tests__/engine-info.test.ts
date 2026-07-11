import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { readEngineInfo } from '../engine-info';

async function makeProject(files: Record<string, string>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'doodle-engineinfo-'));
    for (const [rel, content] of Object.entries(files)) {
        const full = join(dir, rel);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, content);
    }
    return dir;
}

describe('readEngineInfo', () => {
    it('reads declared and installed versions and detects installed deps', async () => {
        const dir = await makeProject({
            'package.json': JSON.stringify({
                dependencies: { '@doodle-engine/core': '^0.2.0' },
            }),
            'node_modules/@doodle-engine/core/package.json': JSON.stringify({
                version: '0.2.0',
            }),
        });
        try {
            const info = await readEngineInfo(dir);
            expect(info.declared).toBe('^0.2.0');
            expect(info.installed).toBe('0.2.0');
            expect(info.depsInstalled).toBe(true);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('reports not-installed when node_modules is missing', async () => {
        const dir = await makeProject({
            'package.json': JSON.stringify({
                devDependencies: { '@doodle-engine/core': 'latest' },
            }),
        });
        try {
            const info = await readEngineInfo(dir);
            expect(info.declared).toBe('latest');
            expect(info.installed).toBe(null);
            expect(info.depsInstalled).toBe(false);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
