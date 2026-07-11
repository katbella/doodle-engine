/**
 * doodle create
 *
 * Thin wrapper over the toolkit's createProject: this file handles the
 * interactive prompts and console output. The files are written by
 * @doodle-engine/toolkit so the CLI and Doodle Studio scaffold projects from the
 * same templates.
 */

import prompts from 'prompts';
import { crayon } from 'crayon.js';
import { createProject } from '@doodle-engine/toolkit';

const paw = '🐾';
const dog = '🐕';
const bone = '🦴';
const sparkle = '✨';
const folder = '📁';
const check = '✅';
const rocket = '🚀';

export async function create(projectName: string) {
    console.log('');
    console.log(crayon.bold.yellow(`  ${paw} Doodle Engine ${paw}`));
    console.log(crayon.dim('  Text-based RPG and Adventure Game Scaffolder'));
    console.log('');
    console.log(`  ${dog} Creating new game: ${crayon.bold.cyan(projectName)}`);
    console.log('');

    // Prompt for renderer choice
    const { useDefaultRenderer } = await prompts({
        type: 'confirm',
        name: 'useDefaultRenderer',
        message: 'Use default renderer?',
        initial: true,
    });

    if (useDefaultRenderer === undefined) {
        console.log(
            crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
        );
        process.exit(0);
    }

    // If using the default renderer, ask about starter styles
    let useStarterStyles = false;
    if (useDefaultRenderer) {
        const { starterStyles } = await prompts({
            type: 'select',
            name: 'starterStyles',
            message: 'Include starter styles?',
            choices: [
                {
                    title: 'Yes: styled UI with dark theme and gold accents',
                    value: true,
                },
                {
                    title: 'No: minimal CSS, build your own',
                    value: false,
                },
            ],
            initial: 0,
        });

        if (starterStyles === undefined) {
            console.log(
                crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
            );
            process.exit(0);
        }

        useStarterStyles = starterStyles;
    }

    console.log('');
    console.log(`  ${folder} ${crayon.bold('Creating project files...')}`);

    const { projectPath } = await createProject(projectName, {
        targetDir: process.cwd(),
        useDefaultRenderer,
        useStarterStyles,
    });

    console.log(crayon.green(`  ${check} Files created`));
    console.log('');
    console.log(`  ${bone} ${crayon.bold('Starter content written')}`);
    console.log('');
    console.log(crayon.dim('  Content includes:'));
    console.log(crayon.dim('    2 locations  (tavern, market)'));
    console.log(crayon.dim('    2 characters (bartender, merchant)'));
    console.log(crayon.dim('    1 item       (old coin)'));
    console.log(crayon.dim('    1 map        (town with 2 locations)'));
    console.log(crayon.dim('    1 quest      (odd jobs, 3 stages)'));
    console.log(crayon.dim('    3 journal entries'));
    console.log(
        crayon.dim('    1 interlude  (chapter one, auto-triggers at tavern)')
    );
    console.log(
        crayon.dim(
            '    5 dialogues  (2 narrator intros, 2 NPC conversations, 1 skill check)'
        )
    );
    console.log(crayon.dim('    English locale with all strings'));

    console.log('');
    console.log(crayon.bold.green(`  ${check} Project created successfully!`));
    console.log('');
    console.log(crayon.dim(`  ${folder} ${projectPath}`));
    console.log('');
    console.log(crayon.bold('  Next steps:'));
    console.log(crayon.cyan(`    cd ${projectName}`));
    console.log(
        crayon.cyan('    npm install       ') +
            crayon.dim('# or: yarn install / pnpm install')
    );
    console.log(
        crayon.cyan('    npm run dev        ') +
            crayon.dim('# or: yarn dev / pnpm dev')
    );
    console.log('');
    console.log(crayon.dim(`  ${rocket} Happy game making! ${paw}`));
    console.log('');
    console.log(
        crayon.dim(
            `  ${sparkle} ${crayon.bold.dim('VS Code tip:')} A syntax highlighting extension for .dlg files is included.`
        )
    );
    console.log(crayon.dim('  To install it in VS Code:'));
    console.log(
        crayon.dim(
            '    1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)'
        )
    );
    console.log(crayon.dim('    2. Run "Extensions: Install from VSIX..."'));
    console.log(
        crayon.dim(
            '    3. Select: node_modules/@doodle-engine/cli/extensions/doodle-dlg-syntax-1.1.0.vsix'
        )
    );
    console.log('');
}
