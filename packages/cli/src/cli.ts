/**
 * Doodle Engine CLI
 *
 * Main command-line interface for Doodle Engine development
 */

import { Command } from 'commander';
import { crayon } from 'crayon.js';
import { pathToFileURL } from 'node:url';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';
import { validate } from './commands/validate.js';
import { create } from './create.js';

// Filled in from package.json at build time (see vite.config.ts), so the
// reported version always matches the installed package.
declare const __DOODLE_VERSION__: string;

export function createCli(): Command {
    const program = new Command();

    program
        .name('doodle')
        .description(
            crayon.magenta('🐾 Doodle Engine') +
                crayon.dim(': Narrative RPG development tools')
        )
        .version(
            typeof __DOODLE_VERSION__ === 'string'
                ? __DOODLE_VERSION__
                : '0.0.0-dev'
        );

    program
        .command('create <project-name>')
        .description('Scaffold a new Doodle Engine game project')
        .action(async (projectName: string) => {
            await create(projectName);
        });

    program
        .command('dev')
        .description('Start development server with hot reload')
        .action(async () => {
            await dev();
        });

    program
        .command('build')
        .description('Build game for production')
        .action(async () => {
            await build();
        });

    program
        .command('validate')
        .description('Validate game content')
        .action(async () => {
            await validate();
        });

    return program;
}

export async function runCli(argv = process.argv): Promise<void> {
    await createCli().parseAsync(argv);
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    void runCli();
}
