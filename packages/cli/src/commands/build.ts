/**
 * Build command
 *
 * Thin wrapper over the toolkit's buildProject: this file only handles the
 * console presentation (colors, headers, exit codes). The actual build runs in
 * @doodle-engine/toolkit so `doodle build` and Doodle Studio's Build button run
 * the same code and produce the same output.
 */

import { crayon } from 'crayon.js';
import { buildProject } from '@doodle-engine/toolkit';
import { printValidationErrors } from '../print-validation.js';

export async function build() {
    const cwd = process.cwd();

    console.log('');
    console.log(crayon.bold.magenta('🐕 Building Doodle Engine game...'));
    console.log('');

    let result;
    try {
        result = await buildProject({
            projectDir: cwd,
            onLog: (message) => console.log(crayon.dim(message)),
        });
    } catch (error) {
        console.error(crayon.red('Build failed:'), error);
        process.exit(1);
    }

    if (!result.ok) {
        printValidationErrors(result.errors);
        console.log(crayon.red('Build failed due to validation errors.'));
        console.log('');
        process.exit(1);
    }

    console.log('');
    console.log(crayon.green('✅ Build complete! Output in dist/'));
    console.log('');
    console.log('To preview the build:');
    console.log(crayon.dim('  yarn preview'));
    console.log('');
}
