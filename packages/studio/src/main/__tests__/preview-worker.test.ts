import { afterEach, describe, expect, it, vi } from 'vitest';

const startDevServer = vi.hoisted(() => vi.fn());
vi.mock('@doodle-engine/toolkit', () => ({ startDevServer }));

describe('preview worker', () => {
    afterEach(() => {
        delete (process as unknown as { parentPort?: unknown }).parentPort;
        vi.resetModules();
    });

    it('starts, reports activity, ignores duplicate starts, and stops', async () => {
        let handleMessage:
            | ((event: { data: any }) => Promise<void>)
            | undefined;
        const parentPort = {
            on: vi.fn((_event: string, callback: typeof handleMessage) => {
                handleMessage = callback;
            }),
            postMessage: vi.fn(),
        };
        Object.defineProperty(process, 'parentPort', {
            configurable: true,
            value: parentPort,
        });
        const server = {
            resolvedUrls: { local: ['http://localhost:4173/'] },
            close: vi.fn(async () => {}),
        };
        startDevServer.mockImplementationOnce(async (options: any) => {
            options.onContentChange('new.dlg', 'add');
            options.onContentChange('changed.dlg', 'change');
            options.onValidation([]);
            options.onValidation([{}, {}]);
            options.onError('reload failed');
            return server;
        });

        await import('../preview-worker');
        await handleMessage!({
            data: {
                type: 'start',
                projectDir: 'C:/games/story',
                port: 4173,
                engineSourceRoot: 'C:/code/doodle-engine',
            },
        });
        expect(startDevServer).toHaveBeenCalledWith(
            expect.objectContaining({
                projectDir: 'C:/games/story',
                engineSourceRoot: 'C:/code/doodle-engine',
            })
        );
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'ready',
            url: 'http://localhost:4173/',
        });
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'log',
            line: 'added new.dlg',
        });
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'log',
            line: expect.stringContaining('2 problems'),
        });
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'log',
            line: 'reload failed',
        });

        await handleMessage!({
            data: { type: 'start', projectDir: 'ignored' },
        });
        expect(startDevServer).toHaveBeenCalledOnce();
        await handleMessage!({ data: { type: 'stop' } });
        expect(server.close).toHaveBeenCalledOnce();
        expect(parentPort.postMessage).toHaveBeenLastCalledWith({
            type: 'stopped',
        });
    });

    it('uses fallback URLs and reports startup failures', async () => {
        let handleMessage:
            | ((event: { data: any }) => Promise<void>)
            | undefined;
        const parentPort = {
            on: vi.fn((_event: string, callback: typeof handleMessage) => {
                handleMessage = callback;
            }),
            postMessage: vi.fn(),
        };
        Object.defineProperty(process, 'parentPort', {
            configurable: true,
            value: parentPort,
        });
        startDevServer
            .mockResolvedValueOnce({ resolvedUrls: null, close: vi.fn() })
            .mockRejectedValueOnce('cannot start');

        await import('../preview-worker');
        await handleMessage!({
            data: { type: 'start', projectDir: 'story' },
        });
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'ready',
            url: 'http://localhost:3000/',
        });
        await handleMessage!({ data: { type: 'stop' } });
        await handleMessage!({
            data: { type: 'start', projectDir: 'broken' },
        });
        expect(parentPort.postMessage).toHaveBeenLastCalledWith({
            type: 'error',
            message: 'cannot start',
        });
    });
});
