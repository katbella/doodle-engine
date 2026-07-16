/**
 * Development server for a Doodle Engine project.
 *
 * This is the same server the CLI's `doodle dev` runs, moved out of the command
 * so Doodle Studio can start the exact same server for its live preview. It
 * serves the project's content and asset manifest over HTTP, watches the content
 * folder, and reloads the browser on change. Progress and validation are
 * reported through callbacks so the caller (a terminal or a desktop app) decides
 * how to show them.
 */

import type { ViteDevServer, Plugin, PluginOption } from 'vite';
import type * as Vite from 'vite';
import { join } from 'path';
import { generateAssetManifest } from './manifest';
import { loadProject } from './load-project';
import { validateContent } from './validate';
import { importFromProject } from './project-modules';
import type { ValidationError } from './validate';
import { engineSourceAliases } from './engine-source';

export interface DevServerOptions {
    /** Absolute path to the project root (the folder that holds content/ and assets/). */
    projectDir: string;
    /** Port to listen on. Defaults to 3000. */
    port?: number;
    /** Whether to open a browser on start. Defaults to true. */
    open?: boolean;
    /** Called when a content file changes, before the browser reloads. */
    onContentChange?: (path: string, kind: 'change' | 'add' | 'unlink') => void;
    /** Called after each change with the current validation problems (empty when clean). */
    onValidation?: (errors: ValidationError[]) => void;
    /** Called when loading, manifest generation, or validation throws. */
    onError?: (message: string, error: unknown) => void;
    /** Monorepo root whose engine sources should replace installed packages. */
    engineSourceRoot?: string;
}

/**
 * Start the dev server and begin watching the project's content.
 *
 * Returns the listening Vite server so the caller can print its URLs or close
 * it. The content and manifest are loaded fresh on each request, so edits are
 * always reflected without restarting.
 */
export async function startDevServer(
    options: DevServerOptions
): Promise<ViteDevServer> {
    const {
        projectDir,
        port = 3000,
        open = true,
        onContentChange,
        onValidation,
        onError,
        engineSourceRoot,
    } = options;

    const contentDir = join(projectDir, 'content');
    const assetsDir = join(projectDir, 'assets');

    // Vite comes from the project, not from here.
    const { createServer } = await importFromProject<typeof Vite>(
        projectDir,
        'vite'
    );
    const { default: react } = await importFromProject<{
        default: () => PluginOption;
    }>(projectDir, '@vitejs/plugin-react');
    const { watch } = await import('chokidar');

    const contentPlugin: Plugin = {
        name: 'doodle-content-loader',

        configureServer(server: ViteDevServer) {
            // Serve all content as JSON. Loaded fresh each request so edits show
            // up without a restart.
            server.middlewares.use('/api/content', async (_req, res) => {
                try {
                    const { registry, config } = await loadProject(projectDir);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ registry, config }));
                } catch (error) {
                    onError?.('Error loading content', error);
                    res.statusCode = 500;
                    res.end(
                        JSON.stringify({ error: 'Failed to load content' })
                    );
                }
            });

            // Serve the asset manifest, generated on the fly from current content.
            server.middlewares.use('/api/manifest', async (_req, res) => {
                try {
                    const { registry, config } = await loadProject(projectDir);
                    const manifest = await generateAssetManifest(
                        assetsDir,
                        projectDir,
                        registry,
                        config,
                        'dev'
                    );
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(manifest));
                } catch (error) {
                    onError?.('Error generating manifest', error);
                    res.statusCode = 500;
                    res.end(
                        JSON.stringify({ error: 'Failed to generate manifest' })
                    );
                }
            });

            // Watch content files and trigger a reload.
            // Pass the directory directly. Chokidar watches recursively by
            // default. Passing a glob with join() produces backslash paths on
            // Windows that chokidar's glob matcher doesn't handle correctly.
            const watcher = watch(contentDir, {
                ignored: /(^|[\/\\])\../,
                persistent: true,
            });

            // Suppress add events during the initial directory scan. Chokidar
            // fires 'add' for every existing file on startup, and we don't want
            // those to trigger repeated validation.
            let ready = false;
            watcher.on('ready', () => {
                ready = true;
            });

            // Debounce so multiple rapid events from one save don't run
            // validation and reload several times.
            let reloadTimer: ReturnType<typeof setTimeout> | null = null;
            const scheduleReload = (
                path: string,
                kind: 'change' | 'add' | 'unlink'
            ) => {
                if (reloadTimer) clearTimeout(reloadTimer);
                reloadTimer = setTimeout(async () => {
                    reloadTimer = null;
                    onContentChange?.(path, kind);
                    try {
                        const { registry, fileMap, config, parseErrors } =
                            await loadProject(projectDir);
                        const errors = [
                            ...parseErrors,
                            ...validateContent(registry, fileMap, config),
                        ];
                        onValidation?.(errors);
                    } catch (error) {
                        onError?.('Error running validation', error);
                    }
                    server.ws.send({ type: 'full-reload', path: '*' });
                }, 50);
            };

            watcher.on('change', (path) => scheduleReload(path, 'change'));
            watcher.on('add', (path) => {
                if (!ready) return;
                scheduleReload(path, 'add');
            });
            // Deleting a file is a content change too: the browser reloads
            // without it and anything still pointing at it becomes a
            // validation problem.
            watcher.on('unlink', (path) => scheduleReload(path, 'unlink'));
        },
    };

    const server = await createServer({
        root: projectDir,
        plugins: [react(), contentPlugin],
        resolve: engineSourceRoot
            ? {
                  alias: engineSourceAliases(engineSourceRoot),
                  dedupe: ['react', 'react-dom'],
              }
            : undefined,
        server: {
            port,
            open,
            ...(engineSourceRoot
                ? { fs: { allow: [projectDir, engineSourceRoot] } }
                : {}),
        },
    });

    await server.listen();
    return server;
}
