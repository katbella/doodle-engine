import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prompts = vi.hoisted(() => vi.fn());
const createProject = vi.hoisted(() => vi.fn());

vi.mock('prompts', () => ({ default: prompts }));
vi.mock('@doodle-engine/toolkit', () => ({ createProject }));

import { create } from '../create';

const exitError = new Error('process exited');

describe('create command', () => {
    beforeEach(() => {
        prompts.mockReset();
        createProject.mockReset().mockResolvedValue({
            projectPath: 'C:/games/story',
        });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(process, 'cwd').mockReturnValue('C:/games');
        vi.spyOn(process, 'exit').mockImplementation(() => {
            throw exitError;
        });
    });

    afterEach(() => vi.restoreAllMocks());

    it('creates a default-renderer project with the selected styles', async () => {
        prompts
            .mockResolvedValueOnce({ title: 'Story Title' })
            .mockResolvedValueOnce({ subtitle: 'A Story Subtitle' })
            .mockResolvedValueOnce({ contentMode: 'starter' })
            .mockResolvedValueOnce({ localizationMode: 'literal' })
            .mockResolvedValueOnce({ useDefaultRenderer: true })
            .mockResolvedValueOnce({ starterStyles: true });

        await create('story');

        expect(createProject).toHaveBeenCalledWith('story', {
            targetDir: 'C:/games',
            title: 'Story Title',
            subtitle: 'A Story Subtitle',
            useDefaultRenderer: true,
            useStarterStyles: true,
            contentMode: 'starter',
            localizationMode: 'literal',
        });
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('Project created successfully')
        );

        const titlePrompt = prompts.mock.calls[0][0];
        expect(titlePrompt.validate('')).toBe('Enter a game title');
        expect(titlePrompt.validate('A title')).toBe(true);
    });

    it('creates a custom-renderer project without asking about styles', async () => {
        prompts
            .mockResolvedValueOnce({ title: 'Custom Story' })
            .mockResolvedValueOnce({ subtitle: '' })
            .mockResolvedValueOnce({ contentMode: 'minimal' })
            .mockResolvedValueOnce({ localizationMode: 'localized' })
            .mockResolvedValueOnce({ useDefaultRenderer: false });

        await create('custom-story');

        expect(prompts).toHaveBeenCalledTimes(5);
        expect(createProject).toHaveBeenCalledWith('custom-story', {
            targetDir: 'C:/games',
            title: 'Custom Story',
            subtitle: '',
            useDefaultRenderer: false,
            useStarterStyles: false,
            contentMode: 'minimal',
            localizationMode: 'localized',
        });
    });

    it.each([
        ['title', [{ title: undefined }]],
        ['subtitle', [{ title: 'Cancelled' }, { subtitle: undefined }]],
        [
            'starting content',
            [
                { title: 'Cancelled' },
                { subtitle: '' },
                { contentMode: undefined },
            ],
        ],
        [
            'localization',
            [
                { title: 'Cancelled' },
                { subtitle: '' },
                { contentMode: 'starter' },
                { localizationMode: undefined },
            ],
        ],
        [
            'renderer',
            [
                { title: 'Cancelled' },
                { subtitle: '' },
                { contentMode: 'starter' },
                { localizationMode: 'literal' },
                { useDefaultRenderer: undefined },
            ],
        ],
        [
            'styles',
            [
                { title: 'Cancelled' },
                { subtitle: '' },
                { contentMode: 'starter' },
                { localizationMode: 'literal' },
                { useDefaultRenderer: true },
                { starterStyles: undefined },
            ],
        ],
    ])('stops when the %s prompt is cancelled', async (_name, responses) => {
        for (const response of responses) {
            prompts.mockResolvedValueOnce(response);
        }

        await expect(create('cancelled')).rejects.toBe(exitError);
        expect(createProject).not.toHaveBeenCalled();
    });

    it('reports project creation failures', async () => {
        prompts
            .mockResolvedValueOnce({ title: 'Story' })
            .mockResolvedValueOnce({ subtitle: '' })
            .mockResolvedValueOnce({ contentMode: 'minimal' })
            .mockResolvedValueOnce({ localizationMode: 'literal' })
            .mockResolvedValueOnce({ useDefaultRenderer: false });
        createProject.mockRejectedValueOnce(new Error('already exists'));

        await expect(create('story')).rejects.toBe(exitError);
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('already exists')
        );
    });
});
