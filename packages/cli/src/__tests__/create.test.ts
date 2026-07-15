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
            .mockResolvedValueOnce({ useDefaultRenderer: true })
            .mockResolvedValueOnce({ starterStyles: true });

        await create('story');

        expect(createProject).toHaveBeenCalledWith('story', {
            targetDir: 'C:/games',
            useDefaultRenderer: true,
            useStarterStyles: true,
        });
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('Project created successfully')
        );
    });

    it('creates a custom-renderer project without asking about styles', async () => {
        prompts.mockResolvedValueOnce({ useDefaultRenderer: false });

        await create('custom-story');

        expect(prompts).toHaveBeenCalledOnce();
        expect(createProject).toHaveBeenCalledWith('custom-story', {
            targetDir: 'C:/games',
            useDefaultRenderer: false,
            useStarterStyles: false,
        });
    });

    it('stops when either prompt is cancelled', async () => {
        prompts.mockResolvedValueOnce({ useDefaultRenderer: undefined });
        await expect(create('cancelled')).rejects.toBe(exitError);
        expect(createProject).not.toHaveBeenCalled();

        prompts
            .mockResolvedValueOnce({ useDefaultRenderer: true })
            .mockResolvedValueOnce({ starterStyles: undefined });
        await expect(create('cancelled-styles')).rejects.toBe(exitError);
        expect(createProject).not.toHaveBeenCalled();
    });

    it('reports project creation failures', async () => {
        prompts.mockResolvedValueOnce({ useDefaultRenderer: false });
        createProject.mockRejectedValueOnce(new Error('already exists'));

        await expect(create('story')).rejects.toBe(exitError);
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('already exists')
        );
    });
});
