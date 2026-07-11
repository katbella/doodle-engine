/**
 * Dev server command
 *
 * Thin wrapper over the toolkit's startDevServer: this file only handles the
 * console presentation. The server, content loading, watching, and validation
 * all run in @doodle-engine/toolkit so `doodle dev` and Doodle Studio's preview
 * run the same code.
 */

import { crayon } from 'crayon.js';
import { startDevServer } from '@doodle-engine/toolkit';
import { printValidationErrors } from '../print-validation.js';

const paw = '🐾';
const sparkle = '✨';
const pencil = '✏️';
const plus = '➕';

export async function dev() {
    const cwd = process.cwd();

    console.log('');
    console.log(
        crayon.bold.magenta(`  ${paw} Doodle Engine Dev Server ${paw}`)
    );
    console.log('');

    const server = await startDevServer({
        projectDir: cwd,
        port: 3000,
        open: true,
        onContentChange: (path, kind) => {
            if (kind === 'change') {
                console.log(
                    crayon.yellow(`  ${pencil} Content changed: ${path}`)
                );
            } else {
                console.log(crayon.green(`  ${plus} Content added: ${path}`));
            }
        },
        onValidation: (errors) => {
            if (errors.length > 0) {
                console.log('');
                printValidationErrors(errors);
                console.log('');
            }
        },
        onError: (message, error) => {
            console.error(crayon.red(`  ${message}:`), error);
        },
    });

    server.printUrls();
    console.log('');
    console.log(
        crayon.dim(`  ${sparkle} Watching content files for changes...`)
    );
    console.log('');
}
