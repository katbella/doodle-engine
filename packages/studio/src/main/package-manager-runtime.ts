import { execFile } from 'node:child_process';
import { isAbsolute } from 'node:path';
import type { PackageManager } from './package-manager';

const REQUIRED_NODE_MAJOR = 24;
const COMMAND_TIMEOUT_MS = 5_000;

type CommandRunner = (
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv
) => Promise<string>;

export interface DependencyInstallRuntime {
    ok: true;
    command: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    nodeVersion: string;
}

export interface DependencyInstallRuntimeError {
    ok: false;
    message: string;
}

interface RuntimeOptions {
    platform?: NodeJS.Platform;
    baseEnv?: NodeJS.ProcessEnv;
    runCommand?: CommandRunner;
}

function runCommand(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv
): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(
            command,
            args,
            {
                env,
                encoding: 'utf8',
                maxBuffer: 1024 * 1024,
                timeout: COMMAND_TIMEOUT_MS,
                windowsHide: true,
            },
            (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            }
        );
    });
}

/**
 * A GUI app launched from Finder or a Linux desktop does not necessarily
 * receive the environment initialized by the user's login shell. Read that
 * environment so package managers installed by nvm, Homebrew, Volta, asdf, and
 * similar tools remain visible.
 */
export function parseEnvironmentPath(output: string): string | null {
    let path: string | null = null;
    for (const line of output.split(/\r?\n/)) {
        if (line.startsWith('PATH=')) path = line.slice('PATH='.length);
    }
    return path;
}

async function unixLoginEnvironment(
    baseEnv: NodeJS.ProcessEnv,
    runner: CommandRunner,
    platform: NodeJS.Platform
): Promise<NodeJS.ProcessEnv> {
    const configuredShell = baseEnv.SHELL;
    const shell =
        configuredShell && isAbsolute(configuredShell)
            ? configuredShell
            : platform === 'darwin'
              ? '/bin/zsh'
              : '/bin/sh';
    try {
        const output = await runner(shell, ['-ilc', '/usr/bin/env'], baseEnv);
        const path = parseEnvironmentPath(output);
        return path ? { ...baseEnv, PATH: path } : { ...baseEnv };
    } catch {
        // Fall back to the app environment. The explicit Node/npm checks below
        // will then produce the actionable error the user needs.
        return { ...baseEnv };
    }
}

function versionCommand(
    executable: string,
    platform: NodeJS.Platform,
    env: NodeJS.ProcessEnv
): { command: string; args: string[] } {
    if (platform === 'win32') {
        return {
            command: env.ComSpec ?? 'cmd.exe',
            args: ['/d', '/s', '/c', executable, '--version'],
        };
    }
    return { command: executable, args: ['--version'] };
}

async function executableVersion(
    executable: string,
    platform: NodeJS.Platform,
    env: NodeJS.ProcessEnv,
    runner: CommandRunner
): Promise<string | null> {
    const check = versionCommand(executable, platform, env);
    try {
        const output = await runner(check.command, check.args, env);
        return output.trim().split(/\r?\n/, 1)[0] || null;
    } catch {
        return null;
    }
}

function nodeMajor(version: string): number | null {
    const match = /^v?(\d+)(?:\.|$)/.exec(version.trim());
    return match ? Number(match[1]) : null;
}

/**
 * Resolve and validate the external toolchain used only to install project
 * dependencies. Studio's build and preview workers use Electron's embedded
 * Node runtime, but npm/yarn/pnpm must still be available on the user's system.
 */
export async function resolveDependencyInstallRuntime(
    packageManager: PackageManager,
    options: RuntimeOptions = {}
): Promise<DependencyInstallRuntime | DependencyInstallRuntimeError> {
    const platform = options.platform ?? process.platform;
    const runner = options.runCommand ?? runCommand;
    let env = { ...(options.baseEnv ?? process.env) };
    if (platform === 'darwin' || platform === 'linux') {
        env = await unixLoginEnvironment(env, runner, platform);
    }

    const nodeVersion = await executableVersion('node', platform, env, runner);
    if (!nodeVersion) {
        return {
            ok: false,
            message:
                'Doodle Studio could not find Node.js. Install Node.js 24 or newer, then reopen Doodle Studio.',
        };
    }

    const major = nodeMajor(nodeVersion);
    if (major === null || major < REQUIRED_NODE_MAJOR) {
        return {
            ok: false,
            message: `Doodle Studio found Node.js ${nodeVersion}, but projects require Node.js 24 or newer. Update Node.js, then reopen Doodle Studio.`,
        };
    }

    const packageManagerVersion = await executableVersion(
        packageManager,
        platform,
        env,
        runner
    );
    if (!packageManagerVersion) {
        const guidance =
            packageManager === 'npm'
                ? 'Reinstall Node.js 24 or newer, then reopen Doodle Studio.'
                : `Install ${packageManager}, then reopen Doodle Studio.`;
        return {
            ok: false,
            message: `Doodle Studio found Node.js ${nodeVersion}, but could not find ${packageManager}. ${guidance}`,
        };
    }

    if (platform === 'win32') {
        return {
            ok: true,
            command: env.ComSpec ?? 'cmd.exe',
            args: ['/d', '/s', '/c', packageManager, 'install'],
            env,
            nodeVersion,
        };
    }
    return {
        ok: true,
        command: packageManager,
        args: ['install'],
        env,
        nodeVersion,
    };
}
