/**
 * Build worker (Electron utility process).
 *
 * Runs a production build in its own Node process, separate from the main
 * process, because a build executes the project's own Vite config and source —
 * untrusted code that must not share the process that owns Studio's windows and
 * filesystem access. The worker streams each log line back to the parent as it
 * happens and posts the final result, so the Build panel can show progress live
 * and stay cancellable (the parent kills this process to cancel).
 *
 * Message in (once):  { projectDir, outDir? }
 * Messages out:       { type: 'log', line } … then { type: 'done', result }
 *                     or { type: 'error', message }
 */

import { buildProject } from '@doodle-engine/toolkit';

// process.parentPort is provided by Electron in a utility process.
const parentPort = (process as unknown as { parentPort: Electron.ParentPort })
    .parentPort;

parentPort.once('message', async (event) => {
    const { projectDir, outDir, engineSourceRoot } = event.data as {
        projectDir: string;
        outDir?: string;
        engineSourceRoot?: string;
    };
    try {
        const result = await buildProject({
            projectDir,
            outDir,
            engineSourceRoot,
            onLog: (line) => parentPort.postMessage({ type: 'log', line }),
        });
        parentPort.postMessage({ type: 'done', result });
    } catch (error) {
        parentPort.postMessage({
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
