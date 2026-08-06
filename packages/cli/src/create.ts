/**
 * doodle-engine create
 *
 * Thin wrapper over the toolkit's createProject: this file handles the
 * interactive prompts and console output. The files are written by
 * @doodle-engine/toolkit so the CLI and Doodle Studio scaffold projects from the
 * same templates.
 */

import prompts from 'prompts';
import { crayon } from 'crayon.js';
import { createProject } from '@doodle-engine/toolkit';
import type { RendererTemplate } from '@doodle-engine/toolkit';

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

    const { title } = await prompts({
        type: 'text',
        name: 'title',
        message: 'Game title?',
        initial: projectName,
        validate: (value: string) =>
            value.trim().length > 0 || 'Enter a game title',
    });

    if (title === undefined) {
        console.log(
            crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
        );
        process.exit(0);
    }

    const { subtitle } = await prompts({
        type: 'text',
        name: 'subtitle',
        message: 'Game subtitle? (optional)',
        initial: '',
    });

    if (subtitle === undefined) {
        console.log(
            crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
        );
        process.exit(0);
    }

    const { contentMode } = await prompts({
        type: 'select',
        name: 'contentMode',
        message: 'What should the project start with?',
        choices: [
            {
                title: 'Playable example story',
                description:
                    'Connected locations, characters, dialogue, quests, and more',
                value: 'starter',
            },
            {
                title: 'Minimal project with one starting location',
                description: 'Empty sections ready for your content',
                value: 'minimal',
            },
        ],
        initial: 0,
    });

    if (contentMode === undefined) {
        console.log(
            crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
        );
        process.exit(0);
    }

    const { localizationMode } = await prompts({
        type: 'select',
        name: 'localizationMode',
        message: 'How should starter text be stored?',
        choices: [
            {
                title: 'English text with a locale starter file',
                value: 'literal',
            },
            {
                title: 'English and Swedish localization example',
                value: 'localized',
            },
        ],
        initial: 0,
    });

    if (localizationMode === undefined) {
        console.log(
            crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
        );
        process.exit(0);
    }

    // Prompt for renderer choice
    const { useDefaultRenderer } = await prompts({
        type: 'confirm',
        name: 'useDefaultRenderer',
        message:
            'Use the default React renderer? (ready to use and customizable)',
        initial: true,
    });

    if (useDefaultRenderer === undefined) {
        console.log(
            crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
        );
        process.exit(0);
    }

    // If using the default renderer, choose its presentation preset.
    let rendererTemplate: RendererTemplate = 'minimal';
    if (useDefaultRenderer) {
        const answer = await prompts({
            type: 'select',
            name: 'rendererTemplate',
            message: 'Choose a renderer template',
            choices: [
                {
                    title: 'Starter RPG',
                    description:
                        'Complete neutral RPG interface, ready to customize',
                    value: 'starter-rpg',
                },
                {
                    title: 'Minimal',
                    description:
                        'Browser-native clean slate with modal positioning only',
                    value: 'minimal',
                },
                {
                    title: 'Prose',
                    description:
                        'Reading-first layout for narrative and choice games',
                    value: 'prose',
                },
                {
                    title: 'Fable',
                    description:
                        'Dark folktale styling with forest and parchment surfaces',
                    value: 'fable',
                },
            ],
            initial: 0,
        });

        if (answer.rendererTemplate === undefined) {
            console.log(
                crayon.yellow(`\n  ${bone} No worries, maybe next time! Woof!`)
            );
            process.exit(0);
        }

        rendererTemplate = answer.rendererTemplate as RendererTemplate;
    }

    console.log('');
    console.log(`  ${folder} ${crayon.bold('Creating project files...')}`);

    let projectPath: string;
    try {
        ({ projectPath } = await createProject(projectName, {
            targetDir: process.cwd(),
            title: title.trim(),
            subtitle: subtitle.trim(),
            useDefaultRenderer,
            rendererTemplate,
            contentMode,
            localizationMode,
        }));
    } catch (error) {
        console.log('');
        console.log(
            crayon.red(
                `  ${bone} ${error instanceof Error ? error.message : String(error)}`
            )
        );
        process.exit(1);
    }

    console.log(crayon.green(`  ${check} Files created`));
    console.log('');
    console.log(
        `  ${bone} ${crayon.bold(
            contentMode === 'starter'
                ? 'Starter story written'
                : 'Minimal content written'
        )}`
    );
    console.log('');
    console.log(crayon.dim('  Content includes:'));
    if (contentMode === 'starter') {
        console.log(crayon.dim('    2 locations  (tavern, market)'));
        console.log(crayon.dim('    2 characters (bartender, merchant)'));
        console.log(crayon.dim('    1 item       (old coin)'));
        console.log(crayon.dim('    1 map        (town with 2 locations)'));
        console.log(crayon.dim('    1 quest      (odd jobs, 3 stages)'));
        console.log(crayon.dim('    3 journal entries'));
        console.log(
            crayon.dim(
                '    1 interlude  (chapter one, auto-triggers at tavern)'
            )
        );
        console.log(
            crayon.dim(
                '    5 dialogues  (2 narrator intros, 2 NPC conversations, 1 skill check)'
            )
        );
    } else {
        console.log(crayon.dim('    1 starting location'));
        console.log(crayon.dim('    Empty folders for the rest of your story'));
    }
    console.log(
        crayon.dim(
            localizationMode === 'localized'
                ? '    English and Swedish locales'
                : '    Literal English text and a commented locale starter'
        )
    );

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
            '    3. Select: node_modules/@doodle-engine/cli/extensions/doodle-dlg-syntax.vsix'
        )
    );
    console.log('');
}
