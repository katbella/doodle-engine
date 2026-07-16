import { afterEach, describe, expect, it, vi } from 'vitest';

const buildProject = vi.hoisted(() => vi.fn());
vi.mock('@doodle-engine/toolkit', () => ({ buildProject }));

describe('build worker', () => {
    afterEach(() => {
        delete (process as unknown as { parentPort?: unknown }).parentPort;
        vi.resetModules();
    });

    it('streams logs and reports success and failures to its parent', async () => {
        let handleMessage:
            | ((event: { data: unknown }) => Promise<void>)
            | undefined;
        const parentPort = {
            once: vi.fn((_event: string, callback: typeof handleMessage) => {
                handleMessage = callback;
            }),
            postMessage: vi.fn(),
        };
        Object.defineProperty(process, 'parentPort', {
            configurable: true,
            value: parentPort,
        });
        buildProject.mockImplementationOnce(async (options: any) => {
            options.onLog('building');
            return { ok: true, outDir: 'dist' };
        });

        await import('../build-worker');
        await handleMessage!({
            data: {
                projectDir: 'C:/games/story',
                outDir: 'release',
                engineSourceRoot: 'C:/code/doodle-engine',
            },
        });
        expect(buildProject).toHaveBeenCalledWith(
            expect.objectContaining({
                projectDir: 'C:/games/story',
                outDir: 'release',
                engineSourceRoot: 'C:/code/doodle-engine',
            })
        );
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'log',
            line: 'building',
        });
        expect(parentPort.postMessage).toHaveBeenCalledWith({
            type: 'done',
            result: { ok: true, outDir: 'dist' },
        });

        buildProject.mockRejectedValueOnce(new Error('build exploded'));
        await handleMessage!({ data: { projectDir: 'bad' } });
        expect(parentPort.postMessage).toHaveBeenLastCalledWith({
            type: 'error',
            message: 'build exploded',
        });
        buildProject.mockRejectedValueOnce('unknown failure');
        await handleMessage!({ data: { projectDir: 'bad' } });
        expect(parentPort.postMessage).toHaveBeenLastCalledWith({
            type: 'error',
            message: 'unknown failure',
        });
    });
});
