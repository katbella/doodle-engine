// Filled from package.json by electron-vite, keeping application and engine
// version checks tied to the release metadata.
declare const __DOODLE_VERSION__: string;

export const STUDIO_VERSION =
    typeof __DOODLE_VERSION__ === 'string'
        ? __DOODLE_VERSION__
        : '0.0.0-development';
