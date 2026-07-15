import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadProject = vi.hoisted(() => vi.fn());
const generateAssetManifest = vi.hoisted(() => vi.fn());
const validateContent = vi.hoisted(() => vi.fn());
const importFromProject = vi.hoisted(() => vi.fn());
const watch = vi.hoisted(() => vi.fn());

vi.mock('../load-project', () => ({ loadProject }));
vi.mock('../manifest', () => ({ generateAssetManifest }));
vi.mock('../validate', () => ({ validateContent }));
vi.mock('../project-modules', () => ({ importFromProject }));
vi.mock('chokidar', () => ({ watch }));

import { startDevServer } from '../dev-server';

describe('development server', () => {
    let handlers: Record<string, (...args: any[]) => any>;
    let middleware: Record<string, (...args: any[]) => any>;
    let server: {
        middlewares: { use: ReturnType<typeof vi.fn> };
        ws: { send: ReturnType<typeof vi.fn> };
        listen: ReturnType<typeof vi.fn>;
        printUrls: ReturnType<typeof vi.fn>;
    };
    let createServer: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        handlers = {};
        middleware = {};
        const watcher = {
            on: vi.fn((event: string, callback: (...args: any[]) => void) => {
                handlers[event] = callback;
                return watcher;
            }),
        };
        watch.mockReset().mockReturnValue(watcher);
        server = {
            middlewares: {
                use: vi.fn(
                    (path: string, callback: (...args: any[]) => void) => {
                        middleware[path] = callback;
                    }
                ),
            },
            ws: { send: vi.fn() },
            listen: vi.fn(async () => {}),
            printUrls: vi.fn(),
        };
        createServer = vi.fn(async (config: any) => {
            config.plugins[1].configureServer(server);
            return server;
        });
        importFromProject
            .mockReset()
            .mockImplementation(
                async (_projectDir: string, moduleName: string) =>
                    moduleName === 'vite'
                        ? { createServer }
                        : { default: () => ({ name: 'react' }) }
            );
        loadProject.mockReset().mockResolvedValue({
            registry: { locations: {} },
            config: { startLocation: 'tavern' },
            fileMap: new Map(),
            parseErrors: [],
        });
        generateAssetManifest.mockReset().mockResolvedValue({
            version: 'dev',
            shell: [],
            game: [],
        });
        validateContent.mockReset().mockReturnValue([]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('serves current content and manifests through the project Vite server', async () => {
        const onError = vi.fn();
        const result = await startDevServer({
            projectDir: 'C:/games/story',
            port: 4173,
            open: false,
            onError,
        });

        expect(result).toBe(server);
        expect(importFromProject).toHaveBeenCalledWith(
            'C:/games/story',
            'vite'
        );
        expect(createServer).toHaveBeenCalledWith(
            expect.objectContaining({
                root: 'C:/games/story',
                server: { port: 4173, open: false },
            })
        );
        expect(server.listen).toHaveBeenCalledOnce();

        const contentResponse = response();
        await middleware['/api/content']({}, contentResponse);
        expect(contentResponse.setHeader).toHaveBeenCalledWith(
            'Content-Type',
            'application/json'
        );
        expect(JSON.parse(contentResponse.end.mock.calls[0][0])).toEqual({
            registry: { locations: {} },
            config: { startLocation: 'tavern' },
        });

        const manifestResponse = response();
        await middleware['/api/manifest']({}, manifestResponse);
        expect(generateAssetManifest).toHaveBeenCalledWith(
            expect.stringMatching(/[\\/]assets$/),
            'C:/games/story',
            { locations: {} },
            { startLocation: 'tavern' },
            'dev'
        );
        expect(JSON.parse(manifestResponse.end.mock.calls[0][0])).toEqual({
            version: 'dev',
            shell: [],
            game: [],
        });
        expect(onError).not.toHaveBeenCalled();
    });

    it('reports endpoint failures as JSON errors', async () => {
        const onError = vi.fn();
        await startDevServer({ projectDir: 'C:/games/story', onError });

        loadProject.mockRejectedValueOnce(new Error('bad content'));
        const contentResponse = response();
        await middleware['/api/content']({}, contentResponse);
        expect(contentResponse.statusCode).toBe(500);
        expect(contentResponse.end).toHaveBeenCalledWith(
            JSON.stringify({ error: 'Failed to load content' })
        );
        expect(onError).toHaveBeenCalledWith(
            'Error loading content',
            expect.any(Error)
        );

        generateAssetManifest.mockRejectedValueOnce(new Error('bad assets'));
        const manifestResponse = response();
        await middleware['/api/manifest']({}, manifestResponse);
        expect(manifestResponse.statusCode).toBe(500);
        expect(onError).toHaveBeenCalledWith(
            'Error generating manifest',
            expect.any(Error)
        );
    });

    it('debounces content changes, validates, and reloads after the initial scan', async () => {
        vi.useFakeTimers();
        const onContentChange = vi.fn();
        const onValidation = vi.fn();
        const onError = vi.fn();
        validateContent.mockReturnValue([
            { file: 'game.yaml', message: 'invalid start' },
        ]);
        loadProject.mockResolvedValue({
            registry: {},
            config: {},
            fileMap: new Map(),
            parseErrors: [{ file: 'bad.dlg', message: 'parse error' }],
        });

        await startDevServer({
            projectDir: 'C:/games/story',
            onContentChange,
            onValidation,
            onError,
        });

        handlers.add('existing.yaml');
        await vi.advanceTimersByTimeAsync(60);
        expect(onContentChange).not.toHaveBeenCalled();

        handlers.ready();
        handlers.change('first.yaml');
        handlers.unlink('removed.yaml');
        await vi.advanceTimersByTimeAsync(60);

        expect(onContentChange).toHaveBeenCalledExactlyOnceWith(
            'removed.yaml',
            'unlink'
        );
        expect(onValidation).toHaveBeenCalledWith([
            { file: 'bad.dlg', message: 'parse error' },
            { file: 'game.yaml', message: 'invalid start' },
        ]);
        expect(server.ws.send).toHaveBeenCalledWith({
            type: 'full-reload',
            path: '*',
        });
        expect(onError).not.toHaveBeenCalled();

        loadProject.mockRejectedValueOnce(new Error('reload failed'));
        handlers.add('new.yaml');
        await vi.advanceTimersByTimeAsync(60);
        expect(onError).toHaveBeenCalledWith(
            'Error running validation',
            expect.any(Error)
        );
        expect(server.ws.send).toHaveBeenCalledTimes(2);
    });
});

function response() {
    return {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn(),
    };
}
