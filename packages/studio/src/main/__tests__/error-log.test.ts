import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ErrorLog } from '../error-log';

const directories: string[] = [];

afterEach(async () => {
    await Promise.all(
        directories
            .splice(0)
            .map((directory) => rm(directory, { recursive: true, force: true }))
    );
});

describe('ErrorLog', () => {
    it('creates the log and appends timestamped error details', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'doodle-studio-log-'));
        directories.push(directory);
        const path = join(directory, 'logs', 'studio.log');
        const log = new ErrorLog(path);

        await log.initialize();
        await log.write('project:create', new Error('folder is not empty'));
        await log.write('renderer:error', 'render failed');

        const content = await readFile(path, 'utf-8');
        expect(content).toContain('project:create');
        expect(content).toContain('folder is not empty');
        expect(content).toContain('renderer:error');
        expect(content).toContain('render failed');
        expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
});
