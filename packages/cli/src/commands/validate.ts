/**
 * Validate command
 *
 * Validates all content in the content directory and reports errors.
 */

import { join } from 'path';
import { crayon } from 'crayon.js';
import { validateContent, loadContent } from '@doodle-engine/toolkit';
import { printValidationErrors } from '../print-validation.js';

export async function validate() {
    const cwd = process.cwd();
    const contentDir = join(cwd, 'content');

    console.log('');
    console.log(crayon.bold.magenta('🐾 Validating Doodle Engine content...'));
    console.log('');

    try {
        const { registry, fileMap, config, parseErrors } =
            await loadContent(contentDir);
        const errors = [
            ...parseErrors,
            ...validateContent(registry, fileMap, config),
        ];

        printValidationErrors(errors);

        if (errors.length > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error(crayon.red('Error loading content:'), error);
        process.exit(1);
    }
}
