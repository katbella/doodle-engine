import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const buildProject = vi.hoisted(() => vi.fn());
const startDevServer = vi.hoisted(() => vi.fn());
const loadContent = vi.hoisted(() => vi.fn());
const validateContent = vi.hoisted(() => vi.fn());
const printValidationErrors = vi.hoisted(() => vi.fn());

vi.mock('@doodle-engine/toolkit', () => ({
    buildProject,
    startDevServer,
    loadContent,
    validateContent,
}));
vi.mock('../print-validation', () => ({ printValidationErrors }));

import { build } from '../commands/build';
import { dev } from '../commands/dev';
import { validate } from '../commands/validate';

const exitError = new Error('process exited');

describe('CLI command adapters', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(process, 'cwd').mockReturnValue('C:/games/story');
        vi.spyOn(process, 'exit').mockImplementation(() => {
            throw exitError;
        });
        buildProject.mockReset();
        startDevServer.mockReset();
        loadContent.mockReset();
        validateContent.mockReset();
        printValidationErrors.mockReset();
    });

    afterEach(() => vi.restoreAllMocks());

    it('builds the current project and streams toolkit output', async () => {
        buildProject.mockImplementation(async (options: any) => {
            options.onLog('bundling');
            return { ok: true, errors: [] };
        });

        await build();

        expect(buildProject).toHaveBeenCalledWith(
            expect.objectContaining({ projectDir: 'C:/games/story' })
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining('bundling')
        );
        expect(process.exit).not.toHaveBeenCalled();
    });

    it('reports validation and thrown build failures', async () => {
        const errors = [{ file: 'game.yaml', message: 'invalid' }];
        buildProject.mockResolvedValueOnce({ ok: false, errors });
        await expect(build()).rejects.toBe(exitError);
        expect(printValidationErrors).toHaveBeenCalledWith(errors);

        buildProject.mockRejectedValueOnce(new Error('vite failed'));
        await expect(build()).rejects.toBe(exitError);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Build failed:'),
            expect.any(Error)
        );
    });

    it('starts the development server and presents change callbacks', async () => {
        const server = { printUrls: vi.fn() };
        startDevServer.mockImplementation(async (options: any) => {
            options.onContentChange('changed.dlg', 'change');
            options.onContentChange('added.dlg', 'add');
            options.onContentChange('removed.dlg', 'unlink');
            options.onValidation([]);
            options.onValidation([{ file: 'bad.dlg', message: 'bad' }]);
            options.onError('Preview failed', new Error('port busy'));
            return server;
        });

        await dev();

        expect(startDevServer).toHaveBeenCalledWith(
            expect.objectContaining({
                projectDir: 'C:/games/story',
                port: 3000,
                open: true,
            })
        );
        expect(printValidationErrors).toHaveBeenCalledWith([
            { file: 'bad.dlg', message: 'bad' },
        ]);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Preview failed'),
            expect.any(Error)
        );
        expect(server.printUrls).toHaveBeenCalledOnce();
    });

    it('validates clean content and reports content problems', async () => {
        loadContent.mockResolvedValue({
            registry: {},
            fileMap: new Map(),
            config: {},
            parseErrors: [],
        });
        validateContent.mockReturnValue([]);
        await validate();
        expect(loadContent).toHaveBeenCalledWith(
            expect.stringMatching(/games[\\/]story[\\/]content$/)
        );
        expect(process.exit).not.toHaveBeenCalled();

        const parseError = { file: 'bad.dlg', message: 'parse error' };
        const validationError = { file: 'game.yaml', message: 'invalid' };
        loadContent.mockResolvedValueOnce({
            registry: {},
            fileMap: new Map(),
            config: {},
            parseErrors: [parseError],
        });
        validateContent.mockReturnValueOnce([validationError]);
        await expect(validate()).rejects.toBe(exitError);
        expect(printValidationErrors).toHaveBeenLastCalledWith([
            parseError,
            validationError,
        ]);
    });

    it('reports content loading failures', async () => {
        loadContent.mockRejectedValueOnce(new Error('missing content'));
        await expect(validate()).rejects.toBe(exitError);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Error loading content:'),
            expect.any(Error)
        );
    });
});
