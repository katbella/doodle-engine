import { copyFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionDirectory = join(root, 'extensions', 'vscode-dlg');
const extensionArtifact = join(extensionDirectory, 'doodle-dlg-syntax.vsix');
const extensionLicense = join(extensionDirectory, 'LICENSE');
const cliArtifact = join(
    root,
    'packages',
    'cli',
    'extensions',
    'doodle-dlg-syntax.vsix'
);
await copyFile(join(root, 'LICENSE'), extensionLicense);
try {
    const vsceArguments = [
        'dlx',
        '@vscode/vsce@3.9.1',
        'package',
        '--no-dependencies',
        '--out',
        extensionArtifact,
    ];
    const command =
        process.platform === 'win32'
            ? (process.env.ComSpec ?? 'cmd.exe')
            : 'yarn';
    const commandArguments =
        process.platform === 'win32'
            ? ['/d', '/s', '/c', 'yarn', ...vsceArguments]
            : vsceArguments;
    const packaged = spawnSync(command, commandArguments, {
        cwd: extensionDirectory,
        encoding: 'utf8',
        stdio: 'inherit',
    });

    if (packaged.error) throw packaged.error;
    if (packaged.status !== 0) {
        throw new Error(
            `VS Code extension packaging exited ${packaged.status}`
        );
    }
} finally {
    await rm(extensionLicense, { force: true });
}

await Promise.all([
    copyFile(extensionArtifact, cliArtifact),
    copyFile(
        join(root, 'packages', 'studio', 'build', 'icon.png'),
        join(root, 'packages', 'studio', 'resources', 'icon.png')
    ),
]);
