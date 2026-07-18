import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProject } from '@doodle-engine/toolkit';
import { validate } from '../commands/validate';

afterEach(() => vi.restoreAllMocks());

describe('validate command with authored dialogue', () => {
    it('accepts multiline dialogue loaded from the project folder', async () => {
        const base = await mkdtemp(join(tmpdir(), 'doodle-cli-'));

        try {
            const { projectPath } = await createProject('story', {
                targetDir: base,
                title: 'Story',
                useDefaultRenderer: true,
                useStarterStyles: false,
                localizationMode: 'literal',
            });
            await writeFile(
                join(projectPath, 'content/dialogues/multiline.dlg'),
                [
                    'NODE start',
                    '  NARRATOR: "First paragraph.',
                    '  ',
                    '  Second paragraph."',
                    '  END dialogue',
                ].join('\n')
            );
            vi.spyOn(process, 'cwd').mockReturnValue(projectPath);
            vi.spyOn(console, 'log').mockImplementation(() => {});
            const exit = vi.spyOn(process, 'exit');

            await validate();

            expect(exit).not.toHaveBeenCalled();
        } finally {
            await rm(base, { recursive: true, force: true });
        }
    });
});
