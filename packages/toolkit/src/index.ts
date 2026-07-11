/**
 * @doodle-engine/toolkit
 *
 * Reusable project services shared by the Doodle Engine CLI and Doodle Studio:
 * loading a project's content, validating it, generating the asset manifest,
 * building it, and scaffolding a new one. These are the engine operations that
 * used to live only inside CLI commands, moved here so both the command line
 * and the visual editor run the exact same code.
 */

// Loading a project's content
export { loadContent, loadProject } from './load-project';
export type { LoadedContent } from './load-project';

// Validation (pure — returns a list of problems, no printing)
export { validateContent } from './validate';
export type { ValidationError } from './validate';

// Asset manifest
export { generateAssetManifest } from './manifest';

// Service worker (offline asset caching)
export { generateServiceWorker } from './service-worker';

// Production build
export { buildProject, copyProjectAssets } from './build-project';
export type { BuildOptions, BuildResult } from './build-project';

// Development server
export { startDevServer } from './dev-server';
export type { DevServerOptions } from './dev-server';

// Project scaffolding
export { createProject } from './create-project';
export type {
    CreateProjectOptions,
    CreateProjectResult,
} from './create-project';

// Comment-preserving YAML edits (for Studio's visual entity forms)
export {
    applyYamlEdits,
    readYamlValue,
    isYamlMap,
    isYamlSeqAt,
} from './yaml-edit';
export type { YamlEdit } from './yaml-edit';
