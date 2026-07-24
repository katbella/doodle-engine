import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pinDoodlePackages } from '../engine-update';

const tempDirs: string[] = [];

afterEach(async () => {
    while (tempDirs.length > 0) {
        await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('pinDoodlePackages', () => {
    it('updates all Doodle packages without changing unrelated dependencies', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-engine-update-'));
        tempDirs.push(dir);
        await writeFile(
            join(dir, 'package.json'),
            JSON.stringify(
                {
                    dependencies: {
                        '@doodle-engine/core': 'latest',
                        '@doodle-engine/react': '^0.1.3',
                        react: '^19.0.0',
                    },
                    devDependencies: {
                        '@doodle-engine/cli': '~0.1.3',
                    },
                },
                null,
                4
            ) + '\n'
        );

        await expect(pinDoodlePackages(dir, '0.2.1')).resolves.toEqual([
            '@doodle-engine/core',
            '@doodle-engine/react',
            '@doodle-engine/cli',
        ]);

        const pkg = JSON.parse(
            await readFile(join(dir, 'package.json'), 'utf-8')
        );
        expect(pkg.dependencies).toEqual({
            '@doodle-engine/core': '0.2.1',
            '@doodle-engine/react': '0.2.1',
            react: '^19.0.0',
        });
        expect(pkg.devDependencies['@doodle-engine/cli']).toBe('0.2.1');
    });
});
