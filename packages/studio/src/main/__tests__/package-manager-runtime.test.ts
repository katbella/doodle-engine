import { describe, expect, it, vi } from 'vitest';
import {
    npmCachePath,
    parseEnvironmentPath,
    resolveDependencyInstallRuntime,
} from '../package-manager-runtime';

describe('package manager runtime', () => {
    it('uses each platform standard per-user cache location', () => {
        expect(
            npmCachePath('darwin', { HOME: '/Users/writer' }, '/Users/writer')
        ).toBe('/Users/writer/Library/Caches/com.doodle-engine.studio/npm');
        expect(
            npmCachePath(
                'win32',
                {
                    LOCALAPPDATA: 'C:\\Users\\writer\\AppData\\Local',
                },
                'C:\\Users\\writer'
            )
        ).toBe(
            'C:\\Users\\writer\\AppData\\Local\\com.doodle-engine.studio\\npm'
        );
        expect(
            npmCachePath(
                'linux',
                { XDG_CACHE_HOME: '/home/writer/.local/cache' },
                '/home/writer'
            )
        ).toBe('/home/writer/.local/cache/com.doodle-engine.studio/npm');
    });

    it('ignores relative cache roots from the environment', () => {
        expect(
            npmCachePath(
                'linux',
                { XDG_CACHE_HOME: 'relative/cache' },
                '/home/writer'
            )
        ).toBe('/home/writer/.cache/com.doodle-engine.studio/npm');
        expect(
            npmCachePath(
                'win32',
                { LOCALAPPDATA: 'relative\\cache' },
                'C:\\Users\\writer'
            )
        ).toBe(
            'C:\\Users\\writer\\AppData\\Local\\com.doodle-engine.studio\\npm'
        );
    });

    it('recovers PATH from noisy login-shell output', () => {
        expect(
            parseEnvironmentPath(
                'shell startup message\nHOME=/Users/writer\nPATH=/opt/homebrew/bin:/usr/bin\n'
            )
        ).toBe('/opt/homebrew/bin:/usr/bin');
    });

    it('uses the macOS login PATH to find Node and npm', async () => {
        const runCommand = vi.fn(
            async (command: string, args: string[], env: NodeJS.ProcessEnv) => {
                if (command === '/bin/zsh') {
                    expect(args).toEqual(['-ilc', '/usr/bin/env']);
                    return 'HOME=/Users/writer\nPATH=/Users/writer/.nvm/versions/node/v24.4.0/bin:/usr/bin\n';
                }
                expect(env.PATH).toBe(
                    '/Users/writer/.nvm/versions/node/v24.4.0/bin:/usr/bin'
                );
                if (command === 'node') return 'v24.4.0\n';
                if (command === 'npm') return '11.4.2\n';
                throw new Error(`Unexpected command: ${command}`);
            }
        );

        await expect(
            resolveDependencyInstallRuntime('npm', {
                platform: 'darwin',
                baseEnv: {
                    PATH: '/usr/bin:/bin',
                    SHELL: '/bin/zsh',
                    HOME: '/Users/writer',
                    npm_config_cache: '/Users/writer/.npm',
                },
                homeDir: '/Users/writer',
                runCommand,
            })
        ).resolves.toEqual({
            ok: true,
            command: 'npm',
            args: ['install'],
            env: {
                PATH: '/Users/writer/.nvm/versions/node/v24.4.0/bin:/usr/bin',
                SHELL: '/bin/zsh',
                HOME: '/Users/writer',
                npm_config_cache:
                    '/Users/writer/Library/Caches/com.doodle-engine.studio/npm',
            },
            nodeVersion: 'v24.4.0',
        });
    });

    it('uses the Linux login PATH and the existing package-manager choice', async () => {
        const runCommand = vi.fn(
            async (command: string, args: string[], env: NodeJS.ProcessEnv) => {
                if (command === '/bin/bash') {
                    expect(args).toEqual(['-ilc', '/usr/bin/env']);
                    return 'PATH=/home/writer/.volta/bin:/usr/bin\n';
                }
                expect(env.PATH).toBe('/home/writer/.volta/bin:/usr/bin');
                if (command === 'node') return 'v24.4.0\n';
                if (command === 'pnpm') return '10.12.1\n';
                throw new Error(`Unexpected command: ${command}`);
            }
        );

        const result = await resolveDependencyInstallRuntime('pnpm', {
            platform: 'linux',
            baseEnv: {
                PATH: '/usr/bin',
                SHELL: '/bin/bash',
                HOME: '/home/writer',
            },
            runCommand,
        });

        expect(result).toMatchObject({
            ok: true,
            command: 'pnpm',
            args: ['install'],
            env: { PATH: '/home/writer/.volta/bin:/usr/bin' },
            nodeVersion: 'v24.4.0',
        });
        if (result.ok) {
            expect(result.env).not.toHaveProperty('npm_config_cache');
        }
    });

    it('runs Windows package-manager shims through cmd.exe', async () => {
        const runCommand = vi.fn(async (command: string, args: string[]) => {
            expect(command).toBe('C:\\Windows\\System32\\cmd.exe');
            if (args.at(-2) === 'node') return 'v24.4.0\r\n';
            if (args.at(-2) === 'npm') return '11.4.2\r\n';
            throw new Error(`Unexpected arguments: ${args.join(' ')}`);
        });

        await expect(
            resolveDependencyInstallRuntime('npm', {
                platform: 'win32',
                baseEnv: {
                    PATH: 'C:\\Program Files\\nodejs',
                    ComSpec: 'C:\\Windows\\System32\\cmd.exe',
                    LOCALAPPDATA: 'C:\\Users\\writer\\AppData\\Local',
                },
                homeDir: 'C:\\Users\\writer',
                runCommand,
            })
        ).resolves.toMatchObject({
            ok: true,
            command: 'C:\\Windows\\System32\\cmd.exe',
            args: ['/d', '/s', '/c', 'npm', 'install'],
            env: {
                npm_config_cache:
                    'C:\\Users\\writer\\AppData\\Local\\com.doodle-engine.studio\\npm',
            },
            nodeVersion: 'v24.4.0',
        });
        expect(runCommand).toHaveBeenCalledTimes(2);
    });

    it('explains when Node is not installed or visible', async () => {
        const runCommand = vi.fn(async (command: string) => {
            if (command === '/bin/zsh') return 'PATH=/usr/bin:/bin\n';
            throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        });

        const result = await resolveDependencyInstallRuntime('npm', {
            platform: 'darwin',
            baseEnv: { PATH: '/usr/bin:/bin', SHELL: '/bin/zsh' },
            runCommand,
        });
        expect(result).toEqual({
            ok: false,
            message:
                'Doodle Studio could not find Node.js. Install Node.js 24 or newer, then reopen Doodle Studio.',
        });
    });

    it('rejects an outdated Node version before running npm', async () => {
        const runCommand = vi.fn(async (command: string) => {
            if (command === 'node') return 'v22.18.0\n';
            throw new Error(`Unexpected command: ${command}`);
        });

        const result = await resolveDependencyInstallRuntime('npm', {
            platform: 'freebsd',
            baseEnv: { PATH: '/usr/bin' },
            runCommand,
        });
        expect(result).toEqual({
            ok: false,
            message:
                'Doodle Studio found Node.js v22.18.0, but projects require Node.js 24 or newer. Update Node.js, then reopen Doodle Studio.',
        });
        expect(runCommand).toHaveBeenCalledTimes(1);
    });

    it('distinguishes a missing package manager from missing Node', async () => {
        const runCommand = vi.fn(async (command: string) => {
            if (command === 'node') return 'v24.4.0\n';
            throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        });

        const result = await resolveDependencyInstallRuntime('npm', {
            platform: 'freebsd',
            baseEnv: { PATH: '/usr/bin' },
            runCommand,
        });
        expect(result).toEqual({
            ok: false,
            message:
                'Doodle Studio found Node.js v24.4.0, but could not find npm. Reinstall Node.js 24 or newer, then reopen Doodle Studio.',
        });
    });
});
