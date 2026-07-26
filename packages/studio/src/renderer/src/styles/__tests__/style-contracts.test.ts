import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const stylesDir = fileURLToPath(new URL('..', import.meta.url));
const shell = readFileSync(`${stylesDir}/shell.css`, 'utf8');
const tokens = readFileSync(`${stylesDir}/tokens.css`, 'utf8');

describe('Studio style contracts', () => {
    it('defines every custom property used by the stylesheets', () => {
        const source = `${tokens}\n${shell}`;
        const definitions = new Set(
            [...source.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(
                (match) => match[1]
            )
        );
        const runtimeProperties = new Set([
            '--dock-h',
            '--rail-w',
            '--right-w',
        ]);
        const uses = new Set(
            [...source.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map(
                (match) => match[1]
            )
        );

        expect(
            [...uses].filter(
                (property) =>
                    !definitions.has(property) &&
                    !runtimeProperties.has(property)
            )
        ).toEqual([]);
    });

    it('does not rely on source order for field or delete-button variants', () => {
        expect(shell.match(/^\.field\s*\{/gm)).toHaveLength(1);
        expect(shell).toContain('.field.field--inline {');
        expect(shell).toContain('.dlg__add.node-editor__delete {');
    });
});
