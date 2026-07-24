import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn(async () => {}));
const dev = vi.hoisted(() => vi.fn(async () => {}));
const build = vi.hoisted(() => vi.fn(async () => {}));
const validate = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../create', () => ({ create }));
vi.mock('../commands/dev', () => ({ dev }));
vi.mock('../commands/build', () => ({ build }));
vi.mock('../commands/validate', () => ({ validate }));

import { createCli, runCli } from '../cli';

const packageVersion = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
).version;

describe('CLI program', () => {
    it('registers its version and commands', () => {
        const program = createCli();
        expect(program.name()).toBe('doodle');
        expect(program.version()).toBe(packageVersion);
        expect(program.commands.map((command) => command.name())).toEqual([
            'create',
            'dev',
            'build',
            'validate',
        ]);
    });

    it('routes every command to its implementation', async () => {
        await runCli(['node', 'doodle', 'create', 'story']);
        await runCli(['node', 'doodle', 'dev']);
        await runCli(['node', 'doodle', 'build']);
        await runCli(['node', 'doodle', 'validate']);

        expect(create).toHaveBeenCalledWith('story');
        expect(dev).toHaveBeenCalledOnce();
        expect(build).toHaveBeenCalledOnce();
        expect(validate).toHaveBeenCalledOnce();
    });
});
