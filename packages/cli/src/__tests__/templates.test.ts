/**
 * Tests for generated project templates.
 */

import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import defaultApp from '../templates/src/App.default.tsx?raw';
import customApp from '../templates/src/App.custom.tsx?raw';
import gameYaml from '../templates/content/game.yaml?raw';
import tavernYaml from '../templates/content/locations/tavern.yaml?raw';
import marketYaml from '../templates/content/locations/market.yaml?raw';
import townMapYaml from '../templates/content/maps/town.yaml?raw';

function expectTsxTemplateToParse(source: string, fileName: string) {
    const output = ts.transpileModule(source, {
        fileName,
        reportDiagnostics: true,
        compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
        },
    });

    expect(output.diagnostics ?? []).toEqual([]);
}

describe('scaffold templates', () => {
    it('default app uses GameShell, which owns renderer providers', () => {
        expect(defaultApp).toContain('GameShell');
        expect(defaultApp).toContain('manifest={manifest}');
        expect(defaultApp).toContain('devTools={import.meta.env.DEV}');
    });

    it('custom app wires input routing and transient presentation surfaces', () => {
        expect(customApp).toContain('InputProvider');
        expect(customApp).toContain('AssetProvider');
        expect(customApp).toContain("fetch('/api/manifest')");
        expect(customApp).toContain('useInputAction');
        expect(customApp).toContain('choiceIndex');
        expect(customApp).toContain('Interlude');
        expect(customApp).toContain('actions.dismissInterlude');
        expect(customApp).toContain('VideoPlayer');
        expect(customApp).toContain('snapshot.pendingVideo');
    });

    it('app TSX templates parse', () => {
        expectTsxTemplateToParse(defaultApp, 'App.default.tsx');
        expectTsxTemplateToParse(customApp, 'App.custom.tsx');
    });

    it('starter map includes location markers', () => {
        expect(tavernYaml).toContain('id: tavern');
        expect(marketYaml).toContain('id: market');
        expect(townMapYaml).toContain('- id: tavern');
        expect(townMapYaml).toContain('- id: market');
    });

    it('starter shell config shows uiSounds as runtime-capable config', () => {
        expect(gameYaml).toContain('uiSounds:');
        expect(gameYaml).toContain('click: /assets/audio/ui/click.ogg');
        expect(gameYaml).toContain('menuOpen: /assets/audio/ui/menu_open.ogg');
    });
});
