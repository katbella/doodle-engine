import {
    expect,
    test,
    _electron as electron,
    type ElectronApplication,
    type Locator,
    type Page,
} from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const studioDir = process.cwd();
const workspaceDir = resolve(studioDir, '../..');
const fixturePrefix = join(workspaceDir, '.build-test-e2e-');
const profilePrefix = join(workspaceDir, '.build-test-studio-profile-');
const tourDir = join(workspaceDir, '.build-test-studio-tour');
const docsScreenshotDir = join(workspaceDir, 'docs/public/images/studio');
const publishDocsScreenshots =
    process.env.DOODLE_PUBLISH_DOCS_SCREENSHOTS === '1';
const preservedLocationComment = '# The tavern is busiest after sunset.';

let fixtureDir = '';
let profileDir = '';

async function writeFixture(path: string, content: string): Promise<void> {
    const target = join(fixtureDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
}

async function quitApp(app: ElectronApplication): Promise<void> {
    const child = app.process();
    if (child.exitCode !== null) return;
    const exited = new Promise<void>((resolve) => {
        child.once('exit', () => resolve());
    });
    await app.evaluate(({ app: electronApp }) => electronApp.quit());
    await exited;
}

async function setStudioTheme(
    app: ElectronApplication,
    window: Page,
    theme: string
): Promise<void> {
    await app.evaluate(({ BrowserWindow }, value) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
            'menu:themeMode',
            value
        );
    }, theme);
    await expect
        .poll(() =>
            window.evaluate(() =>
                document.documentElement.getAttribute('data-theme')
            )
        )
        .toBe(theme);
    await window.evaluate(() => document.fonts.ready);
}

async function writeWebpScreenshot(
    window: Page,
    target: Page | Locator,
    filename: string,
    maxHeight?: number
): Promise<void> {
    if (!publishDocsScreenshots) return;
    const png = await target.screenshot({ animations: 'disabled' });
    const encoded = await window.evaluate(
        async ({ base64, cropHeight }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = Math.min(
                image.naturalHeight,
                cropHeight ?? image.naturalHeight
            );
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Could not create screenshot canvas');
            context.drawImage(image, 0, 0);
            return canvas.toDataURL('image/webp', 0.86).split(',')[1];
        },
        { base64: png.toString('base64'), cropHeight: maxHeight }
    );
    await mkdir(docsScreenshotDir, { recursive: true });
    await writeFile(
        join(docsScreenshotDir, filename),
        Buffer.from(encoded, 'base64')
    );
}

async function publishThemePair(
    app: ElectronApplication,
    window: Page,
    target: Page | Locator,
    basename: string,
    maxHeight?: number
): Promise<void> {
    if (!publishDocsScreenshots) return;
    await setStudioTheme(app, window, 'dark');
    await writeWebpScreenshot(window, target, `${basename}.webp`, maxHeight);
    await setStudioTheme(app, window, 'light');
    await writeWebpScreenshot(
        window,
        target,
        `${basename}-light.webp`,
        maxHeight
    );
    await setStudioTheme(app, window, 'dark');
}

test.beforeEach(async () => {
    await rm(tourDir, { recursive: true, force: true });
    await mkdir(tourDir, { recursive: true });
    fixtureDir = await mkdtemp(fixturePrefix);
    profileDir = await mkdtemp(profilePrefix);
    await mkdir(join(fixtureDir, 'node_modules'), { recursive: true });
    await writeFixture(
        'package.json',
        JSON.stringify({
            name: 'the-salty-dog',
            version: '1.0.0',
            dependencies: { '@doodle-engine/core': 'workspace:*' },
        })
    );
    await writeFixture(
        'index.html',
        '<!doctype html><html><body><main>Doodle Studio fixture</main></body></html>'
    );
    await writeFixture(
        'content/game.yaml',
        `startLocation: tavern
startTime:
  day: 1
  hour: 8
startFlags: {}
startVariables: {}
startInventory: []
`
    );
    await writeFixture(
        'content/locations/tavern.yaml',
        `${preservedLocationComment}
id: tavern
name: Tavern
description: Warm and busy.
banner: ""
music: ""
ambient: ""
`
    );
    await writeFixture(
        'content/locations/market.yaml',
        `id: market
name: Market
description: Open stalls.
banner: ""
music: ""
ambient: ""
`
    );
    await writeFixture(
        'content/characters/bartender.yaml',
        `id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: ""
location: tavern
dialogue: audit
stats: {}
`
    );
    await writeFixture(
        'content/locales/en.yaml',
        `character.bartender.name: Marcus
character.bartender.bio: A patient keeper of the Salty Dog.
bartender.greeting: Welcome to the Salty Dog, stranger.
choice.one: Ask about the docks.
choice.two: Order a drink.
choice.three: Ask for work.
choice.four: Ask about the market.
choice.five: Ask about the weather.
choice.six: Say goodbye.
`
    );
    await writeFixture(
        'content/locales/sv.yaml',
        `bartender.greeting: Välkommen till Salty Dog, främling.
choice.six: Säg adjö.
`
    );
    await writeFixture('assets/images/banners/opening.png', 'png-bytes');
    await writeFixture('assets/audio/sfx/wind.ogg', 'ogg-bytes');
    await writeFixture('assets/audio/sfx/rain.ogg', 'ogg-bytes');
    await writeFixture(
        'content/interludes/opening.yaml',
        `id: opening
background: opening.png
sounds:
  - wind.ogg
  - rain.ogg
text: A storm rolls in over the harbor.
`
    );
    await writeFixture(
        'content/maps/world.yaml',
        `id: world
name: World
image: ""
scale: 100
locations:
  - id: tavern
    x: 100
    y: 200
  - id: market
    x: 300
    y: 150
`
    );
    await writeFixture(
        'content/dialogues/audit.dlg',
        `NODE start
  BARTENDER: @bartender.greeting

  CHOICE @choice.one
    REQUIRE hasFlag ready
    SET flag askedDocks
    GOTO end
  END

  CHOICE @choice.two
    SET flag metBartender
    GOTO end
  END

  CHOICE @choice.three
    GOTO end
  END

  CHOICE @choice.four
    GOTO end
  END

  CHOICE @choice.five
    GOTO end
  END

  CHOICE @choice.six
    GOTO end
  END

NODE end
  BARTENDER: Goodbye.
  GOTO start
`
    );
});

test.afterEach(async () => {
    if (fixtureDir.startsWith(fixturePrefix)) {
        await rm(fixtureDir, { recursive: true, force: true });
    }
    if (profileDir.startsWith(profilePrefix)) {
        await rm(profileDir, { recursive: true, force: true });
    }
});

test('opens, edits, and saves through Electron, preload, IPC, and the filesystem', async () => {
    test.setTimeout(publishDocsScreenshots ? 180_000 : 30_000);
    const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...launchEnv } =
        process.env;
    const app = await test.step('launch Studio', () =>
        electron.launch({
            // Keep the test out of the user's real Studio profile. The app and
            // fixture are local-only, so disable Chromium's nested sandbox and
            // hardware GPU path for reliable child-process startup in CI.
            args: [
                join(studioDir, 'out/main/index.js'),
                `--user-data-dir=${profileDir}`,
                '--disable-gpu',
                '--no-sandbox',
            ],
            cwd: studioDir,
            env: {
                ...launchEnv,
                ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
            },
        }));
    let appClosed = false;

    try {
        const window =
            await test.step('wait for the renderer and preload', async () => {
                const firstWindow = await app.firstWindow();
                await expect(
                    firstWindow.getByText('Doodle Studio')
                ).toBeVisible();
                await expect
                    .poll(() =>
                        firstWindow.evaluate(
                            () =>
                                typeof window.studio?.openProjectPath ===
                                    'function' && !('require' in window)
                        )
                    )
                    .toBe(true);
                await firstWindow.screenshot({
                    path: join(tourDir, '01-welcome-dark.png'),
                    animations: 'disabled',
                });
                await publishThemePair(
                    app,
                    firstWindow,
                    firstWindow.locator('.welcome'),
                    'welcome'
                );
                return firstWindow;
            });

        await test.step('capture the new-project form', async () => {
            if (!publishDocsScreenshots) return;
            await window.getByRole('button', { name: 'New project…' }).click();
            const modal = window.locator('.modal');
            await expect(modal).toBeVisible();
            await publishThemePair(app, window, modal, 'new-project');
            await modal.getByRole('button', { name: 'Cancel' }).click();
        });

        await test.step('open the fixture through the menu event', async () => {
            await app.evaluate(({ BrowserWindow }, projectPath) => {
                BrowserWindow.getAllWindows()[0]?.webContents.send(
                    'menu:openRecent',
                    projectPath
                );
            }, fixtureDir);
            await expect(
                window.getByText('the-salty-dog').first()
            ).toBeVisible();
            await window.screenshot({
                path: join(tourDir, '02-project-overview-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(app, window, window, 'workspace');
            await publishThemePair(
                app,
                window,
                window.locator('.topbar'),
                'studio-toolbar'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.rail'),
                'project-rail'
            );
        });

        await test.step('keep app-level modals above the page', async () => {
            await window
                .getByRole('button', { name: /Command palette/ })
                .click();
            const palette = window.getByRole('dialog', {
                name: 'Command palette',
            });
            await expect(palette).toBeVisible();
            // The search control keeps its fixed height when the results list
            // overflows.
            const searchHeight = await window
                .locator('.palette__search')
                .evaluate((el) => el.getBoundingClientRect().height);
            expect(searchHeight).toBeGreaterThanOrEqual(55);
            await expect
                .poll(() =>
                    palette.evaluate((element) => {
                        const rect = element.getBoundingClientRect();
                        const painted = document.elementFromPoint(
                            rect.left + rect.width / 2,
                            rect.top + rect.height / 2
                        );
                        return Boolean(painted && element.contains(painted));
                    })
                )
                .toBe(true);
            await expect
                .poll(() =>
                    window
                        .locator('.modal-backdrop')
                        .evaluate(
                            (element) => element.parentElement === document.body
                        )
                )
                .toBe(true);
            await window.screenshot({
                path: join(tourDir, '03-command-palette-dark.png'),
                animations: 'disabled',
            });
            await window.keyboard.press('Escape');
        });

        await test.step('keep toolbar actions visible at the minimum window width', async () => {
            await app.evaluate(({ BrowserWindow }) => {
                BrowserWindow.getAllWindows()[0]?.setSize(960, 700);
            });
            await expect
                .poll(() =>
                    window.evaluate(() => {
                        const bar = document.querySelector('.topbar');
                        if (!bar) return false;
                        const bounds = bar.getBoundingClientRect();
                        return Array.from(bar.querySelectorAll('button')).every(
                            (button) => {
                                const buttonBounds =
                                    button.getBoundingClientRect();
                                return (
                                    buttonBounds.left >= bounds.left &&
                                    buttonBounds.right <= bounds.right
                                );
                            }
                        );
                    })
                )
                .toBe(true);
            await app.evaluate(({ BrowserWindow }) => {
                BrowserWindow.getAllWindows()[0]?.setSize(1440, 900);
            });
        });

        await test.step('edit the location and change tabs', async () => {
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'tavern' })
                .click();
            const name = window.locator('input[value="Tavern"]');
            await expect(name).toBeVisible();
            await window.screenshot({
                path: join(tourDir, '04-location-editor-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(
                app,
                window,
                window.locator('.editor'),
                'location-editor'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.rightpanel'),
                'references-panel'
            );
            if (publishDocsScreenshots) {
                await window.getByRole('button', { name: 'Source' }).click();
                await expect(
                    window.locator('.editor__source-body .monaco-editor')
                ).toBeVisible();
                await publishThemePair(
                    app,
                    window,
                    window.locator('.editor'),
                    'source-editor'
                );
                await window.getByRole('button', { name: 'Visual' }).click();
                await expect(name).toBeVisible();
            }
            await name.fill('Renamed Tavern');
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'market' })
                .click();
            await expect(window.locator('input[value="Market"]')).toBeVisible();
        });

        await test.step('place and drag a marker in the map preview', async () => {
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'world' })
                .click();
            const preview = window.locator('.map-preview');
            const xInput = window.locator('input[title="x"]').first();
            await expect(preview).toBeVisible();
            await xInput.click();
            const beforeClick = await xInput.inputValue();
            await preview.click({ position: { x: 80, y: 80 } });
            await expect.poll(() => xInput.inputValue()).not.toBe(beforeClick);

            const previewBox = await preview.boundingBox();
            const dot = window.locator('.map-preview__dot').first();
            const dotBox = await dot.boundingBox();
            expect(previewBox).not.toBeNull();
            expect(dotBox).not.toBeNull();
            expect(dotBox!.x).toBeGreaterThanOrEqual(previewBox!.x);
            expect(dotBox!.y).toBeGreaterThanOrEqual(previewBox!.y);
            expect(dotBox!.x + dotBox!.width).toBeLessThanOrEqual(
                previewBox!.x + previewBox!.width
            );
            expect(dotBox!.y + dotBox!.height).toBeLessThanOrEqual(
                previewBox!.y + previewBox!.height
            );

            const marker = window.locator('.map-preview__marker').first();
            const markerBox = await marker.boundingBox();
            expect(markerBox).not.toBeNull();
            const beforeDrag = await xInput.inputValue();
            await window.mouse.move(
                markerBox!.x + markerBox!.width / 2,
                markerBox!.y + markerBox!.height / 2
            );
            await window.mouse.down();
            await window.mouse.move(
                previewBox!.x + previewBox!.width * 0.7,
                previewBox!.y + previewBox!.height * 0.4,
                { steps: 4 }
            );
            await window.mouse.up();
            await expect.poll(() => xInput.inputValue()).not.toBe(beforeDrag);
            await window.screenshot({
                path: join(tourDir, '05-map-marker-interaction-dark.png'),
                animations: 'disabled',
            });
        });

        await test.step('align localized key chips across character controls', async () => {
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'bartender' })
                .click();
            const chips = window.locator('.localized-key-chip');
            await expect(chips).toHaveCount(2);
            const chipLefts = await chips.evaluateAll((elements) =>
                elements.map((element) => element.getBoundingClientRect().left)
            );
            expect(
                Math.max(...chipLefts) - Math.min(...chipLefts)
            ).toBeLessThanOrEqual(1);
            await window.screenshot({
                path: join(tourDir, '06-character-key-chips-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(
                app,
                window,
                window.locator('.editor'),
                'localized-fields'
            );
        });

        await test.step('capture the localization editor', async () => {
            if (!publishDocsScreenshots) return;
            await window
                .getByRole('button', { name: 'en', exact: true })
                .click();
            await expect(window.locator('.locale-editor')).toBeVisible();
            await publishThemePair(
                app,
                window,
                window.locator('.editor'),
                'localization'
            );
        });

        await test.step('keep every control in an asset row the same height', async () => {
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'opening' })
                .click();
            const row = window.locator('.asset-list__row').first();
            await expect(row.locator('input')).toBeVisible();
            const heights = await row.evaluate((element) =>
                Array.from(element.children).map(
                    (child) => child.getBoundingClientRect().height
                )
            );
            expect(heights.length).toBeGreaterThanOrEqual(2);
            for (const height of heights) {
                expect(Math.abs(height - heights[0])).toBeLessThanOrEqual(1);
            }
            await window
                .locator('.asset-list')
                .first()
                .screenshot({
                    path: join(tourDir, '06b-interlude-sound-rows-dark.png'),
                    animations: 'disabled',
                });
            await publishThemePair(
                app,
                window,
                window.locator('.asset-list').first(),
                'asset-fields'
            );
        });

        await test.step('capture flags and variables', async () => {
            if (!publishDocsScreenshots) return;
            await window.getByRole('button', { name: /Flags & vars/ }).click();
            await expect(
                window.getByRole('heading', { name: 'Flags & variables' })
            ).toBeVisible();
            await publishThemePair(
                app,
                window,
                window.locator('.flag-vars-page'),
                'flags-variables'
            );
        });

        await test.step('keep deep editor overlays portaled, visible, and anchored', async () => {
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'audit' })
                .click();
            await expect(window.locator('.node-editor')).toBeVisible();
            await window.screenshot({
                path: join(tourDir, '07-dialogue-editor-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(
                app,
                window,
                window,
                'studio-dialogue-workspace'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.editor'),
                'dialogue-editor'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.dlg__outline'),
                'dialogue-nodes'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.node-editor__head'),
                'dialogue-node-header'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.dlg__main'),
                'dialogue-node-fields',
                452
            );

            const lineField = window
                .getByRole('textbox', { name: 'Line' })
                .locator('..');
            await lineField.getByRole('button', { name: 'literal' }).click();
            await expect(
                lineField.locator('.localized-text__unlink-notice')
            ).toContainText(
                'The key and its Swedish translation stay in the locale files'
            );
            await window.screenshot({
                path: join(tourDir, '08-unlinked-key-warning-dark.png'),
                animations: 'disabled',
            });
            await lineField.getByRole('button', { name: '@key' }).click();
            await expect(
                lineField.locator('.localized-key-chip')
            ).toContainText('@bartender.greeting');

            const deepChoice = window.locator('.dlg__card').last();
            await deepChoice.scrollIntoViewIfNeeded();
            const keyChip = deepChoice.locator('.localized-key-chip');
            await keyChip.click();
            const keyMenu = window.locator('.localized-key-menu');
            await expect(keyMenu).toBeVisible();
            expect(
                await keyMenu.evaluate(
                    (element) => element.parentElement === document.body
                )
            ).toBe(true);
            await keyMenu.getByRole('button', { name: 'Change key…' }).click();

            const picker = window.locator('.locale-key-picker');
            await expect(picker).toBeVisible();
            expect(
                await picker.evaluate(
                    (element) =>
                        element.parentElement?.parentElement === document.body
                )
            ).toBe(true);
            expect(
                await picker.evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    const painted = document.elementFromPoint(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2
                    );
                    return Boolean(painted && element.contains(painted));
                })
            ).toBe(true);
            await window.screenshot({
                path: join(tourDir, '09-key-picker-choice-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(
                app,
                window,
                picker,
                'localization-key-picker'
            );
            await picker.getByRole('button', { name: 'Cancel' }).click();

            await deepChoice.scrollIntoViewIfNeeded();
            await publishThemePair(app, window, deepChoice, 'dialogue-choice');
            if (publishDocsScreenshots) {
                const firstChoice = window.locator('.dlg__card').first();
                await firstChoice
                    .getByRole('button', { name: /Add requirement/ })
                    .click();
                const conditionBuilder = window.locator('.builder-modal');
                await expect(conditionBuilder).toBeVisible();
                await publishThemePair(
                    app,
                    window,
                    conditionBuilder,
                    'condition-builder'
                );
                await conditionBuilder
                    .getByRole('button', { name: 'Cancel' })
                    .click();
                await deepChoice.scrollIntoViewIfNeeded();
            }
            const builderTrigger = deepChoice.getByRole('button', {
                name: /Add effect/,
            });
            await builderTrigger.click();
            // The builder is a centered modal: portaled to the body, dimmed
            // backdrop, nothing painting over it, fully inside the viewport.
            const builder = window.locator('.builder-modal');
            await expect(builder).toBeVisible();
            expect(
                await builder.evaluate(
                    (element) =>
                        element.parentElement?.parentElement === document.body
                )
            ).toBe(true);
            expect(
                await builder.evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    const painted = document.elementFromPoint(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2
                    );
                    return Boolean(painted && element.contains(painted));
                })
            ).toBe(true);
            const insideViewport = await builder.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth
                );
            });
            expect(insideViewport).toBe(true);
            await window.screenshot({
                path: join(tourDir, '10-builder-deep-choice-dark.png'),
                animations: 'disabled',
            });
            if (publishDocsScreenshots) {
                await builder
                    .getByRole('button', { name: 'Play sound' })
                    .click();
                await publishThemePair(
                    app,
                    window,
                    builder,
                    'effect-media-file'
                );
            }
            await builder.getByRole('button', { name: 'Cancel' }).click();
        });

        await test.step('keep the node header aligned and its delete action red', async () => {
            const head = window.locator('.node-editor__head');
            // Element crop: header alignment regressions vanish in full-page
            // shots and jump out in close-ups.
            await head.screenshot({
                path: join(tourDir, '07b-node-header-crop-dark.png'),
                animations: 'disabled',
            });
            const badge = head.locator('.dlg__node-badge');
            const badgeBox = await badge.boundingBox();
            const idBox = await window
                .locator('.node-editor__id-field')
                .boundingBox();
            expect(badgeBox).not.toBeNull();
            expect(idBox).not.toBeNull();
            // The badge centers on the id input's vertical midline.
            const badgeMid = badgeBox!.y + badgeBox!.height / 2;
            const idMid = idBox!.y + idBox!.height / 2;
            expect(Math.abs(badgeMid - idMid)).toBeLessThanOrEqual(2);

            // The delete button keeps its danger color: same class family as
            // the add-node button, so stylesheet order cannot make them match.
            const [deleteColor, addColor] = await window.evaluate(() => {
                const del = document.querySelector('.node-editor__delete');
                const add = document.querySelector('.dlg__outline .dlg__add');
                return [
                    del ? getComputedStyle(del).color : '',
                    add ? getComputedStyle(add).color : '',
                ];
            });
            expect(deleteColor).not.toBe('');
            expect(deleteColor).not.toBe(addColor);
        });

        await test.step('reveal rail actions on keyboard focus and resize the node outline', async () => {
            const action = window
                .locator('.rail__item')
                .filter({ hasText: 'tavern' })
                .locator('.rail__item-action')
                .first();
            await action.focus();
            expect(
                await action.evaluate(
                    (element) => getComputedStyle(element).opacity
                )
            ).toBe('1');

            const outline = window.locator('.dlg__outline');
            const before = (await outline.boundingBox())!.width;
            const handle = window.locator('.dlg .resize-handle--x');
            const handleBox = (await handle.boundingBox())!;
            await window.mouse.move(
                handleBox.x + handleBox.width / 2,
                handleBox.y + handleBox.height / 2
            );
            await window.mouse.down();
            await window.mouse.move(
                handleBox.x + handleBox.width / 2 + 80,
                handleBox.y + handleBox.height / 2,
                { steps: 4 }
            );
            await window.mouse.up();
            await expect
                .poll(async () => (await outline.boundingBox())!.width)
                .toBeGreaterThan(before + 40);
        });

        await test.step('jump the playtest session from a node', async () => {
            await window
                .getByRole('button', { name: 'Play from here' })
                .click();
            const playback = window.locator('.playback__node-value');
            await expect(playback).toBeVisible();
            await expect(playback).toContainText('audit / start');
            await window.screenshot({
                path: join(tourDir, '10b-play-from-here-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(
                app,
                window,
                window.locator('.playtest__toolbar'),
                'playtest-toolbar'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.playtest__body'),
                'playtest-choices'
            );
            await publishThemePair(
                app,
                window,
                window.locator('.inspector'),
                'playtest-state'
            );
            if (publishDocsScreenshots) {
                await window
                    .getByRole('button', { name: 'Save test state' })
                    .click();
                const saveStateModal = window
                    .locator('.modal')
                    .filter({ hasText: 'Save test state' });
                await expect(saveStateModal).toBeVisible();
                await publishThemePair(
                    app,
                    window,
                    saveStateModal,
                    'save-test-state'
                );
                await saveStateModal
                    .getByRole('button', { name: 'Cancel' })
                    .click();

                await window
                    .getByRole('button', { name: 'Start at node…' })
                    .click();
                const startNodeModal = window
                    .locator('.modal')
                    .filter({ hasText: 'Start at node' });
                await expect(startNodeModal).toBeVisible();
                await publishThemePair(
                    app,
                    window,
                    startNodeModal,
                    'start-node-picker'
                );
                await startNodeModal
                    .getByRole('button', { name: 'Cancel' })
                    .click();
            }
        });

        await test.step('read the semantic trace across contrasting themes', async () => {
            await window
                .getByRole('button', { name: 'Order a drink.' })
                .click();
            await window.getByRole('button', { name: 'Debug trace' }).click();

            const effectRow = window
                .locator('.trace__row')
                .filter({ hasText: 'EFFECT' });
            await expect(
                effectRow.locator('.trace__tok--keyword').filter({
                    hasText: 'SET',
                })
            ).toBeVisible();
            await expect(
                effectRow.locator('.trace__tok--id').filter({
                    hasText: 'metBartender',
                })
            ).toBeVisible();

            await expect(
                window.locator('.trace__result--fail').first()
            ).toHaveText('FAIL');

            const transitionRow = window
                .locator('.trace__row')
                .filter({ hasText: 'TRANSITION' });
            await expect(transitionRow.locator('svg.trace__to')).toBeVisible();
            await expect(transitionRow).not.toContainText('start to end');

            const search = window.getByRole('textbox', {
                name: 'Search trace by id',
            });
            await search.fill('start to end');
            await expect(transitionRow).toBeVisible();
            await search.fill('');
            await publishThemePair(
                app,
                window,
                window.locator('.trace'),
                'debug-trace'
            );

            const setTheme = (theme: string) =>
                app.evaluate(({ BrowserWindow }, value) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send(
                        'menu:themeMode',
                        value
                    );
                }, theme);
            const usesThemeToken = (selector: string, token: string) =>
                window
                    .locator(selector)
                    .first()
                    .evaluate((element, variable) => {
                        const probe = document.createElement('span');
                        probe.style.color = `var(${variable})`;
                        document.body.append(probe);
                        const matches =
                            getComputedStyle(element).color ===
                            getComputedStyle(probe).color;
                        probe.remove();
                        return matches;
                    }, token);

            for (const [theme, label] of [
                ['dark', 'doodle-dark'],
                ['parchment', 'parchment'],
                ['terminal', 'terminal'],
            ] as const) {
                await setTheme(theme);
                await expect
                    .poll(() =>
                        window.evaluate(() =>
                            document.documentElement.getAttribute('data-theme')
                        )
                    )
                    .toBe(theme);
                await expect
                    .poll(() =>
                        usesThemeToken('.trace__tok--keyword', '--text-faint')
                    )
                    .toBe(true);
                await expect
                    .poll(() => usesThemeToken('.trace__tok--id', '--text'))
                    .toBe(true);
                await expect
                    .poll(() =>
                        usesThemeToken('.trace__result--fail', '--error')
                    )
                    .toBe(true);
                await window.locator('.trace').screenshot({
                    path: join(tourDir, `10e-debug-trace-${label}.png`),
                    animations: 'disabled',
                });
            }
            await setTheme('dark');
        });

        await test.step('tour the dialogue graph and jump back to a node', async () => {
            await window.getByRole('button', { name: 'Graph' }).click();
            const startNode = window.locator('[data-node-id="start"]');
            const endNode = window.locator('[data-node-id="end"]');
            await expect(startNode).toBeVisible();
            await expect(endNode).toBeVisible();
            // Six forward choice edges; end's GOTO back to start is a chip,
            // not a line.
            await expect(window.locator('.graph__edge')).toHaveCount(6);
            await expect(
                startNode.locator('.graph__badge--start')
            ).toBeVisible();
            // Choice rows carry their localized text at the edge's source.
            await expect(startNode.locator('.graph__row')).toHaveCount(6);
            await expect(startNode).toContainText('Ask about the docks.');
            await expect(endNode.locator('.graph__chip')).toHaveText(
                'to start'
            );
            // Hit-test: the node paints above the edge layer and owns clicks.
            const box = (await endNode.boundingBox())!;
            const painted = await window.evaluate(
                ([x, y]) =>
                    document
                        .elementFromPoint(x, y)
                        ?.closest('[data-node-id]')
                        ?.getAttribute('data-node-id') ?? null,
                [box.x + box.width / 2, box.y + box.height / 2]
            );
            expect(painted).toBe('end');
            await window.screenshot({
                path: join(tourDir, '10d-dialogue-graph-dark.png'),
                animations: 'disabled',
            });
            await publishThemePair(
                app,
                window,
                window.locator('.editor'),
                'dialogue-graph'
            );
            // Click selects in place; the pencil opens the Visual editor.
            await endNode.click();
            await expect(endNode).toHaveClass(/graph__node--selected/);
            await endNode
                .getByRole('button', {
                    name: 'Open node end in the Visual editor',
                })
                .click();
            await expect(window.locator('.node-editor')).toBeVisible();
            await expect(window.locator('.dlg__node--active')).toContainText(
                'end'
            );
            // Later steps expect the start node selected again.
            await window
                .getByRole('button', { name: 'start', exact: true })
                .click();
            if (publishDocsScreenshots) {
                await window.getByRole('button', { name: 'Source' }).click();
                await expect(
                    window.locator('.editor__source-body .monaco-editor')
                ).toBeVisible();
                await publishThemePair(
                    app,
                    window,
                    window.locator('.editor'),
                    'dialogue-source'
                );
                const requirementLine = window
                    .locator('.editor__source-body .view-line')
                    .filter({ hasText: 'REQUIRE hasFlag ready' });
                await requirementLine.click();
                await window.keyboard.press('End');
                await window.keyboard.press('Control+ArrowLeft');
                await window.keyboard.press('Control+Space');
                const suggestions = window.locator(
                    '.editor__source-body .suggest-widget.visible'
                );
                await expect(suggestions).toBeVisible();
                await expect(suggestions).toContainText('askedDocks');
                await expect(suggestions).toContainText('metBartender');
                await publishThemePair(
                    app,
                    window,
                    window.locator('.source__monaco'),
                    'dialogue-intellisense',
                    600
                );
                await window.keyboard.press('Escape');
                await window.getByRole('button', { name: 'Visual' }).click();
                await expect(window.locator('.node-editor')).toBeVisible();
            }
        });

        await test.step('show the status area on the dock strip', async () => {
            const status = window.locator('.dock__status');
            await expect(
                status.locator('.dock__status-when').filter({
                    hasText: 'validated',
                })
            ).toBeVisible();
            await status.screenshot({
                path: join(tourDir, '10c-dock-status-area-dark.png'),
                animations: 'disabled',
            });
            await expect(
                status.getByRole('button', {
                    name: 'Open Doodle Studio documentation',
                })
            ).toBeVisible();
        });

        await test.step('show delete confirmation above the editor', async () => {
            await window.getByRole('button', { name: 'Delete node' }).click();
            const confirm = window.locator('.modal').filter({
                hasText: 'Delete node “start”?',
            });
            await expect(confirm).toBeVisible();
            expect(
                await confirm.evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    const painted = document.elementFromPoint(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2
                    );
                    return Boolean(painted && element.contains(painted));
                })
            ).toBe(true);
            await window.screenshot({
                path: join(tourDir, '11-delete-confirm-dark.png'),
                animations: 'disabled',
            });
            await confirm.getByRole('button', { name: 'Cancel' }).click();
        });

        await test.step('capture a completed production build', async () => {
            if (!publishDocsScreenshots) return;
            await window
                .getByRole('button', { name: 'Build', exact: true })
                .click();
            await expect(window.getByText(/Build complete in/)).toBeVisible({
                timeout: 30_000,
            });
            await window.locator('.build__dest').evaluate((element) => {
                element.textContent = 'dist';
            });
            await publishThemePair(
                app,
                window,
                window.locator('.dock__body'),
                'build-output'
            );
            await window
                .locator('.dock__tab')
                .filter({ hasText: 'Problems' })
                .click();
            await window.mouse.move(700, 350);
            await expect(window.locator('.tooltip__bubble--open')).toHaveCount(
                0
            );
        });

        await test.step('tour the bundled themes and their default accents', async () => {
            const setTheme = (theme: string) =>
                app.evaluate(({ BrowserWindow }, value) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send(
                        'menu:themeMode',
                        value
                    );
                }, theme);
            const setAccent = (color: string) =>
                app.evaluate(({ BrowserWindow }, value) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send(
                        'menu:themeColor',
                        value
                    );
                }, color);
            const accent = () =>
                window.evaluate(() =>
                    getComputedStyle(document.documentElement)
                        .getPropertyValue('--accent')
                        .trim()
                );

            for (const [theme, themeAccent] of [
                ['dark', '#0076ff'],
                ['light', '#006ae5'],
                ['forest', '#d9a514'],
                ['space', '#a855f7'],
                ['deep-sea', '#2dd4bf'],
                ['terminal', '#33ff77'],
                ['storm', '#ffd23f'],
                ['royal-velvet', '#d9a514'],
                ['pumpkin', '#e8631c'],
                ['blueprint', '#eaf4ff'],
                ['sepia-noir', '#c8a06a'],
                ['firelight', '#e6552d'],
                ['high-contrast', '#4da6ff'],
                ['parchment', '#a4321e'],
                ['sakura', '#c02677'],
                ['glacier', '#0b7ea6'],
                ['neon', '#35e6ff'],
            ] as const) {
                await setTheme(theme);
                await expect
                    .poll(() =>
                        window.evaluate(() =>
                            document.documentElement.getAttribute('data-theme')
                        )
                    )
                    .toBe(theme);
                await expect.poll(accent).toBe(themeAccent);
                await window.screenshot({
                    path: join(tourDir, `14-theme-${theme}.png`),
                    animations: 'disabled',
                });
                await writeWebpScreenshot(
                    window,
                    window,
                    `theme-${theme}.webp`
                );
            }

            // A named accent beats the theme default; Default restores it.
            await setAccent('red');
            await expect.poll(accent).toBe('#ec3013');
            await window.screenshot({
                path: join(tourDir, '14d-theme-neon-accent-red.png'),
                animations: 'disabled',
            });
            await setAccent('default');
            await expect.poll(accent).toBe('#35e6ff');
            await setTheme('dark');
            await expect.poll(accent).toBe('#0076ff');
        });

        await test.step('show the Studio update results', async () => {
            if (!publishDocsScreenshots) return;
            const sendUpdateState = (state: Record<string, unknown>) =>
                app.evaluate(({ BrowserWindow }, value) => {
                    BrowserWindow.getAllWindows()[0]?.webContents.send(
                        'update:state',
                        value
                    );
                }, state);

            await sendUpdateState({
                status: 'available',
                currentVersion: '0.2.0',
                manual: false,
                version: '0.3.0',
                releaseNotes:
                    'Adds dialogue Source suggestions and clearer validation results.',
                platform: 'windows',
            });
            const updateModal = window.getByRole('dialog');
            await expect(updateModal).toContainText('Update available');
            await expect(updateModal).toContainText('Version 0.3.0');
            await publishThemePair(
                app,
                window,
                updateModal,
                'studio-update-available'
            );
            await updateModal.getByRole('button', { name: 'Close' }).click();

            await sendUpdateState({
                status: 'current',
                currentVersion: '0.3.0',
                manual: true,
            });
            await expect(updateModal).toContainText(
                'Doodle Studio is up to date'
            );
            await publishThemePair(
                app,
                window,
                updateModal,
                'studio-update-current'
            );
            await updateModal.getByRole('button', { name: 'Close' }).click();
        });

        await test.step('repeat the key-picker overlay check in light theme', async () => {
            await app.evaluate(({ BrowserWindow }) => {
                BrowserWindow.getAllWindows()[0]?.webContents.send(
                    'menu:themeMode',
                    'light'
                );
            });
            await expect
                .poll(() =>
                    window.evaluate(() =>
                        document.documentElement.getAttribute('data-theme')
                    )
                )
                .toBe('light');
            await window.locator('.node-editor__head').screenshot({
                path: join(tourDir, '12b-node-header-crop-light.png'),
                animations: 'disabled',
            });
            const deepChoice = window.locator('.dlg__card').last();
            await deepChoice.scrollIntoViewIfNeeded();
            await deepChoice.locator('.localized-key-chip').click();
            await window
                .locator('.localized-key-menu')
                .getByRole('button', { name: 'Change key…' })
                .click();
            const picker = window.locator('.locale-key-picker');
            await expect(picker).toBeVisible();
            expect(
                await picker.evaluate((element) => {
                    const rect = element.getBoundingClientRect();
                    const painted = document.elementFromPoint(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2
                    );
                    return Boolean(painted && element.contains(painted));
                })
            ).toBe(true);
            await window.screenshot({
                path: join(tourDir, '12-key-picker-choice-light.png'),
                animations: 'disabled',
            });
            await picker.getByRole('button', { name: 'Cancel' }).click();

            await window.locator('.tab--active').click({ button: 'right' });
            const tabMenu = window.locator('.tabs__menu--context');
            await expect(tabMenu).toBeVisible();
            expect(
                await tabMenu.evaluate(
                    (element) => element.parentElement === document.body
                )
            ).toBe(true);
            await window.locator('.topbar__name').click();
        });

        await test.step('verify the saved YAML', async () => {
            await expect
                .poll(() =>
                    readFile(
                        join(fixtureDir, 'content/locations/tavern.yaml'),
                        'utf8'
                    )
                )
                .toContain('name: Renamed Tavern');
            const saved = await readFile(
                join(fixtureDir, 'content/locations/tavern.yaml'),
                'utf8'
            );
            expect(saved).toContain(preservedLocationComment);
        });

        await test.step('show a validation problem in both themes', async () => {
            const auditTab = window
                .locator('.tab')
                .filter({ hasText: 'audit' });
            await expect(auditTab.locator('.tab__dirty')).toHaveCount(0);
            await auditTab.getByRole('button', { name: 'Close audit' }).click();

            const dialoguePath = join(
                fixtureDir,
                'content/dialogues/audit.dlg'
            );
            const dialogue = await readFile(dialoguePath, 'utf8');
            await writeFile(
                dialoguePath,
                dialogue.replace(
                    'REQUIRE hasFlag ready',
                    'REQUIRE hasItem brass_key'
                ),
                'utf8'
            );

            await window.getByRole('button', { name: 'Validate' }).click();
            const problemMessage =
                'Node "start" condition "hasItem" references non-existent item "brass_key"';
            const problemsTab = window
                .locator('.dock__tab')
                .filter({ hasText: 'Problems' });
            await expect(problemsTab).toContainText('1');
            await problemsTab.click();

            const problemsDock = window.locator('.dock');
            await problemsDock
                .getByRole('button', { name: new RegExp(problemMessage) })
                .click();
            await expect(window.locator('.dlg__node--active')).toContainText(
                'start'
            );
            await expect(window.locator('.problem-reveal')).toBeVisible();
            await expect(
                problemsDock.getByRole('button', { name: 'Copy problem' })
            ).toBeVisible();

            const lightPng = join(tourDir, 'validator-problems-light.png');
            await window.screenshot({
                path: lightPng,
                animations: 'disabled',
            });

            await app.evaluate(({ BrowserWindow }) => {
                BrowserWindow.getAllWindows()[0]?.webContents.send(
                    'menu:themeMode',
                    'dark'
                );
            });
            await expect
                .poll(() =>
                    window.evaluate(() =>
                        document.documentElement.getAttribute('data-theme')
                    )
                )
                .toBe('dark');
            await problemsDock
                .getByRole('button', { name: new RegExp(problemMessage) })
                .click();
            await expect(window.locator('.problem-reveal')).toBeVisible();
            const darkPng = join(tourDir, 'validator-problems-dark.png');
            await window.screenshot({
                path: darkPng,
                animations: 'disabled',
            });
            await publishThemePair(app, window, window, 'validation-problems');

            await app.evaluate(({ BrowserWindow }) => {
                BrowserWindow.getAllWindows()[0]?.webContents.send(
                    'menu:themeMode',
                    'light'
                );
            });
            await expect
                .poll(() =>
                    window.evaluate(() =>
                        document.documentElement.getAttribute('data-theme')
                    )
                )
                .toBe('light');
        });

        await test.step('show a long recent path without clipping under remove', async () => {
            await quitApp(app);
            appClosed = true;
            const reopened = await electron.launch({
                args: [
                    join(studioDir, 'out/main/index.js'),
                    `--user-data-dir=${profileDir}`,
                    '--disable-gpu',
                    '--no-sandbox',
                ],
                cwd: studioDir,
                env: {
                    ...launchEnv,
                    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
                },
            });
            try {
                const welcome = await reopened.firstWindow();
                const recentItem = welcome.locator('.recent__item').first();
                await expect(recentItem).toBeVisible();
                const separated = await recentItem.evaluate((item) => {
                    const open = item.querySelector('.recent__open')!;
                    const remove = item.querySelector('.recent__remove')!;
                    const path = item.querySelector('.recent__path')!;
                    const openRect = open.getBoundingClientRect();
                    const removeRect = remove.getBoundingClientRect();
                    return (
                        openRect.right <= removeRect.left &&
                        getComputedStyle(path).overflowX !== 'visible'
                    );
                });
                await welcome.screenshot({
                    path: join(tourDir, '13-welcome-recent-light.png'),
                    animations: 'disabled',
                });
                expect(separated).toBe(true);
            } finally {
                await quitApp(reopened);
            }
        });
    } finally {
        if (!appClosed) await quitApp(app);
    }
});
