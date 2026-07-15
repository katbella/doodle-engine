import {
    expect,
    test,
    _electron as electron,
    type ElectronApplication,
} from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const studioDir = process.cwd();
const workspaceDir = resolve(studioDir, '../..');
const fixturePrefix = join(workspaceDir, '.build-test-e2e-');

let fixtureDir = '';

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

test.beforeEach(async () => {
    fixtureDir = await mkdtemp(fixturePrefix);
    await writeFixture(
        'package.json',
        JSON.stringify({
            name: 'studio-e2e-story',
            version: '1.0.0',
            dependencies: { '@doodle-engine/core': 'workspace:*' },
        })
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
        `# This comment must survive Studio's field edit.
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
});

test.afterEach(async () => {
    if (fixtureDir.startsWith(fixturePrefix)) {
        await rm(fixtureDir, { recursive: true, force: true });
    }
});

test('opens, edits, and saves through Electron, preload, IPC, and the filesystem', async () => {
    const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...launchEnv } =
        process.env;
    const app = await test.step('launch Studio', () =>
        electron.launch({
            args: [join(studioDir, 'out/main/index.js')],
            cwd: studioDir,
            env: {
                ...launchEnv,
                ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
            },
        })
    );

    try {
        const window = await test.step('wait for the renderer and preload', async () => {
            const firstWindow = await app.firstWindow();
            await expect(firstWindow.getByText('Doodle Studio')).toBeVisible();
            await expect
                .poll(() =>
                    firstWindow.evaluate(
                        () =>
                            typeof window.studio?.openProjectPath ===
                                'function' && !('require' in window)
                    )
                )
                .toBe(true);
            return firstWindow;
        });

        await test.step('open the fixture through the menu event', async () => {
            await app.evaluate(({ BrowserWindow }, projectPath) => {
                BrowserWindow.getAllWindows()[0]?.webContents.send(
                    'menu:openRecent',
                    projectPath
                );
            }, fixtureDir);
            await expect(
                window.getByText('studio-e2e-story').first()
            ).toBeVisible();
        });

        await test.step('edit the location and change tabs', async () => {
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'tavern' })
                .click();
            const name = window.locator('input[value="Tavern"]');
            await expect(name).toBeVisible();
            await name.fill('Renamed Tavern');
            await window
                .locator('.rail__item-open')
                .filter({ hasText: 'market' })
                .click();
            await expect(
                window.locator('input[value="Market"]')
            ).toBeVisible();
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
            expect(saved).toContain(
                "# This comment must survive Studio's field edit."
            );
        });
    } finally {
        await quitApp(app);
    }
});
