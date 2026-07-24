// Filled from package.json by Vite and Vitest. Changesets only need to update
// the package version; generated projects then receive that exact release.
declare const __DOODLE_VERSION__: string;

export const DOODLE_VERSION =
    typeof __DOODLE_VERSION__ === 'string'
        ? __DOODLE_VERSION__
        : '0.0.0-development';
