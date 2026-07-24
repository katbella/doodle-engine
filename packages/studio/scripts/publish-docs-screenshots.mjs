import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const studioDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const playwrightCli = require.resolve('@playwright/test/cli');
const result = spawnSync(
    process.execPath,
    [playwrightCli, 'test', 'studio.e2e.ts'],
    {
        cwd: studioDir,
        env: {
            ...process.env,
            DOODLE_PUBLISH_DOCS_SCREENSHOTS: '1',
        },
        stdio: 'inherit',
    }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
