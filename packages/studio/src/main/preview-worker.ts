/**
 * Preview worker (Electron utility process).
 *
 * Runs the project's real dev server — the same one `doodle dev` runs — in its
 * own Node process. Like the build, a dev server loads the project's Vite config
 * and source, so it stays out of the main process. The worker reports the URL
 * the server is listening on; Studio opens that URL in the user's default
 * browser. Studio's own live renderer preview is a later effort, so for now the
 * project's game runs where it always has: a normal browser tab.
 *
 * Message in:   { type: 'start', projectDir, port? } | { type: 'stop' }
 * Messages out: { type: 'ready', url } | { type: 'log', line }
 *               | { type: 'error', message } | { type: 'stopped' }
 */

import type { ViteDevServer } from 'vite';
import { startDevServer } from '@doodle-engine/toolkit';

const parentPort = (process as unknown as { parentPort: Electron.ParentPort })
    .parentPort;

let server: ViteDevServer | null = null;

parentPort.on('message', async (event) => {
    const msg = event.data as
        | { type: 'start'; projectDir: string; port?: number }
        | { type: 'stop' };

    if (msg.type === 'start') {
        if (server) return;
        try {
            server = await startDevServer({
                projectDir: msg.projectDir,
                port: msg.port ?? 3000,
                open: false,
                onContentChange: (path, kind) =>
                    parentPort.postMessage({
                        type: 'log',
                        line: `${kind === 'add' ? 'added' : 'changed'} ${path}`,
                    }),
                onValidation: (errors) => {
                    if (errors.length > 0) {
                        parentPort.postMessage({
                            type: 'log',
                            line: `${errors.length} problem${errors.length === 1 ? '' : 's'} — the preview will still reload, but fix these before building`,
                        });
                    }
                },
                onError: (message) =>
                    parentPort.postMessage({ type: 'log', line: message }),
            });
            const url =
                server.resolvedUrls?.local?.[0] ??
                `http://localhost:${msg.port ?? 3000}/`;
            parentPort.postMessage({ type: 'ready', url });
        } catch (error) {
            parentPort.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    } else if (msg.type === 'stop') {
        try {
            await server?.close();
        } finally {
            server = null;
            parentPort.postMessage({ type: 'stopped' });
        }
    }
});
