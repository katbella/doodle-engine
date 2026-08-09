/**
 * Tests for generated project templates.
 */

import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { parseDialogue } from '@doodle-engine/core';
import defaultApp from '../templates/src/App.default.tsx?raw';
import customApp from '../templates/src/App.custom.tsx?raw';
import gameYaml from '../templates/content/game.yaml?raw';
import chapterOneYaml from '../templates/content/interludes/chapter_one.yaml?raw';
import tavernYaml from '../templates/content/locations/tavern.yaml?raw';
import marketYaml from '../templates/content/locations/market.yaml?raw';
import townMapYaml from '../templates/content/maps/town.yaml?raw';
import { getAvailableLocales } from '../templates/src/locale-options';

const templateFiles = import.meta.glob('../templates/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

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
        expect(customApp).toContain("fetch('api/manifest')");
        expect(customApp).toContain('useInputAction');
        expect(customApp).toContain('choiceIndex');
        expect(customApp).toContain('Interlude');
        expect(customApp).toContain('actions.dismissInterlude');
        expect(customApp).toContain('VideoPlayer');
        expect(customApp).toContain('snapshot.pendingVideo');
        expect(customApp).toContain('getAvailableLocales(');
        expect(customApp).toContain("snapshot.ui['ui.continue']");
        expect(customApp).toContain("snapshot.ui['ui.characters']");
        expect(customApp).not.toContain('Characters here');
        expect(customApp).not.toContain('Talk to {char.name}');
        expect(defaultApp).not.toContain('Made with Doodle Engine');
    });

    it('discovers locale options from loaded locale files', () => {
        expect(
            getAvailableLocales({ sv: {}, en: {}, fr: {} }).map(
                (locale) => locale.code
            )
        ).toEqual(['en', 'fr', 'sv']);
        expect(getAvailableLocales({ custom_locale: {} })).toEqual([
            { code: 'custom_locale', label: 'custom_locale' },
        ]);
    });

    it('localizes every quest journal and tracking label in starter locales', () => {
        for (const locale of ['en', 'sv']) {
            const source =
                templateFiles[`../templates/content/locales/${locale}.yaml`];
            expect(source).toContain('ui.completed_quests:');
            expect(source).toContain('ui.no_active_quests:');
            expect(source).toContain('ui.track_quest:');
            expect(source).toContain('ui.stop_tracking_quest:');
        }
    });

    it('generates a completable quest with working tracking dialogue', () => {
        const quest =
            templateFiles['../templates/content/quests/odd_jobs.yaml'];
        const bartender =
            templateFiles[
                '../templates/content/dialogues/bartender_greeting.dlg'
            ];
        const merchant =
            templateFiles[
                '../templates/content/dialogues/merchant_intro.dlg'
            ];

        expect(quest).toMatch(
            /- id: complete\s+completesQuest: true\s+description:/
        );
        expect(bartender).toContain('REQUIRE questStatus odd_jobs complete');
        expect(bartender).toContain('SET trackedQuest odd_jobs');
        expect(merchant).toContain(
            'REQUIRE questAtStage odd_jobs talked_to_merchant'
        );
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

    it('starter interlude leaves optional media unset', () => {
        expect(chapterOneYaml).not.toMatch(/^background:/m);
        expect(chapterOneYaml).not.toMatch(/^banner:/m);
        expect(chapterOneYaml).toContain('text: "@interlude.chapter_one.text"');
    });

    it('bundles every active local media asset referenced by starter content', () => {
        const assetTemplatePaths = Object.keys(templateFiles)
            .filter((path) => path.includes('/templates/assets/'))
            .map((path) => path.replace('../templates/', ''));
        const assetRefs: string[] = [];
        const assetRefPattern =
            /(?:^|[:\s])["']?([^"'\s#]+?\.(?:png|jpg|jpeg|svg|webp|gif|avif|ogg|mp3|wav|m4a|mp4|webm|ogv|mov))["']?/gi;

        for (const [path, source] of Object.entries(templateFiles)) {
            if (!path.includes('/templates/content/')) continue;

            for (const line of source.split(/\r?\n/)) {
                if (line.trimStart().startsWith('#')) continue;

                let match: RegExpExecArray | null;
                while ((match = assetRefPattern.exec(line)) !== null) {
                    const ref = match[1];
                    if (
                        ref.startsWith('http://') ||
                        ref.startsWith('https://') ||
                        ref.startsWith('data:') ||
                        ref.startsWith('blob:')
                    ) {
                        continue;
                    }
                    assetRefs.push(ref);
                }
            }
        }

        expect(assetRefs).toEqual([]);
        for (const ref of assetRefs) {
            const expectedPath = ref.startsWith('/assets/')
                ? ref.slice(1)
                : null;
            const bundled = expectedPath
                ? assetTemplatePaths.includes(expectedPath)
                : assetTemplatePaths.some((path) => path.endsWith(`/${ref}`));

            expect(
                bundled,
                `${ref} should be bundled in templates/assets`
            ).toBe(true);
        }
    });

    it('every starter .dlg parses cleanly', () => {
        const dialogues = Object.entries(templateFiles).filter(([path]) =>
            path.endsWith('.dlg')
        );

        expect(dialogues.length).toBeGreaterThan(0);
        for (const [path, source] of dialogues) {
            const id = path.split('/').pop()!.replace('.dlg', '');
            expect(() => parseDialogue(source, id), path).not.toThrow();
        }
    });

    it('starter shell config shows uiSounds as runtime-capable config', () => {
        expect(gameYaml).toContain('uiSounds:');
        expect(gameYaml).toContain('click: assets/audio/ui/click.ogg');
        expect(gameYaml).toContain('menuOpen: assets/audio/ui/menu_open.ogg');
    });
});
