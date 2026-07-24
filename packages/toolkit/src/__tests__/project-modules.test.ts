import { describe, it, expect } from 'vitest';
import { esmEntry } from '../project-modules';

describe('esmEntry', () => {
    it("picks Vite's import entry, not its require (.cjs) entry", () => {
        const vite = {
            name: 'vite',
            exports: {
                '.': {
                    'module-sync': './dist/node/index.js',
                    import: './dist/node/index.js',
                    require: './index.cjs',
                },
            },
        };
        expect(esmEntry(vite)).toBe('./dist/node/index.js');
    });

    it('follows nested import conditions', () => {
        const plugin = {
            name: '@vitejs/plugin-react',
            exports: {
                '.': {
                    types: './dist/index.d.ts',
                    import: { default: './dist/index.mjs' },
                    require: './dist/index.cjs',
                },
            },
        };
        expect(esmEntry(plugin)).toBe('./dist/index.mjs');
    });

    it('handles the exports sugar form (no "." key)', () => {
        const pkg = {
            name: 'thing',
            exports: { import: './esm/index.js', require: './cjs/index.js' },
        };
        expect(esmEntry(pkg)).toBe('./esm/index.js');
    });

    it('falls back to module, then main, when there are no exports', () => {
        expect(esmEntry({ name: 'a', module: './m.js', main: './c.js' })).toBe(
            './m.js'
        );
        expect(esmEntry({ name: 'b', main: './c.js' })).toBe('./c.js');
    });

    it('never returns a .cjs entry when an ESM one exists', () => {
        const pkg = {
            name: 'x',
            exports: { '.': { import: './x.js', require: './x.cjs' } },
        };
        expect(esmEntry(pkg).endsWith('.cjs')).toBe(false);
    });
});
