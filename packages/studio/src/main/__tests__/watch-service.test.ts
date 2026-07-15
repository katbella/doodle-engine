import { beforeEach, describe, expect, it, vi } from 'vitest';

const watch = vi.hoisted(() => vi.fn());
vi.mock('chokidar', () => ({ watch }));

import { WatchService } from '../watch-service';

describe('WatchService', () => {
    let callbacks: Record<string, (path: string) => void>;
    let closes: ReturnType<typeof vi.fn>[];

    beforeEach(() => {
        callbacks = {};
        closes = [];
        watch.mockReset().mockImplementation(() => {
            const close = vi.fn(async () => {});
            closes.push(close);
            const watcher = {
                close,
                on: vi.fn((event: string, callback: (path: string) => void) => {
                    callbacks[event] = callback;
                    return watcher;
                }),
            };
            return watcher;
        });
    });

    it('reports add, change, and delete paths relative to the project', async () => {
        const service = new WatchService();
        const onFileChanged = vi.fn();
        await service.watch('C:/games/story', onFileChanged, () => false);

        expect(watch).toHaveBeenCalledWith(
            expect.stringMatching(/games[\\/]story[\\/]content$/),
            expect.objectContaining({
                ignoreInitial: true,
                persistent: true,
            })
        );
        callbacks.change('C:/games/story/content/game.yaml');
        callbacks.add('C:/games/story/content/items/coin.yaml');
        callbacks.unlink('C:/games/story/content/old.yaml');
        expect(onFileChanged.mock.calls.map(([path]) => path)).toEqual([
            'content\\game.yaml',
            'content\\items\\coin.yaml',
            'content\\old.yaml',
        ]);
    });

    it('filters self-writes and closes the previous and current watchers', async () => {
        const service = new WatchService();
        const onFileChanged = vi.fn();
        await service.watch('C:/games/story', onFileChanged, (path) =>
            path.endsWith('mine.yaml')
        );
        callbacks.change('C:/games/story/content/mine.yaml');
        expect(onFileChanged).not.toHaveBeenCalled();

        const firstClose = closes[0];
        await service.watch('C:/games/other', onFileChanged, () => false);
        expect(firstClose).toHaveBeenCalledOnce();
        service.stop();
        expect(closes[1]).toHaveBeenCalledOnce();
        service.stop();
        expect(closes[1]).toHaveBeenCalledOnce();
    });
});
