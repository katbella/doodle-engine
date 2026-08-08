import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn(async () => {}));
const dev = vi.hoisted(() => vi.fn(async () => {}));
const build = vi.hoisted(() => vi.fn(async () => {}));
const validate = vi.hoisted(() => vi.fn(async () => {}));
const theme = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../create', () => ({ create }));
vi.mock('../commands/dev', () => ({ dev }));
vi.mock('../commands/build', () => ({ build }));
vi.mock('../commands/validate', () => ({ validate }));
vi.mock('../commands/theme', () => ({ theme }));

import { createCli, runCli } from '../cli';

const packageVersion = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
).version;

describe('CLI program', () => {
    it('registers its version and commands', () => {
        const program = createCli();
        expect(program.name()).toBe('doodle-engine');
        expect(program.version()).toBe(packageVersion);
        expect(program.commands.map((command) => command.name())).toEqual([
            'create',
            'dev',
            'build',
            'validate',
            'theme',
        ]);
    });

    it('routes every command to its implementation', async () => {
        await runCli(['node', 'doodle-engine', 'create', 'story']);
        await runCli(['node', 'doodle-engine', 'dev']);
        await runCli(['node', 'doodle-engine', 'build']);
        await runCli(['node', 'doodle-engine', 'validate']);
        await runCli(['node', 'doodle-engine', 'theme', 'prose']);

        expect(create).toHaveBeenCalledWith('story');
        expect(dev).toHaveBeenCalledOnce();
        expect(build).toHaveBeenCalledOnce();
        expect(validate).toHaveBeenCalledOnce();
        expect(theme).toHaveBeenCalledWith('prose');
    });
});
