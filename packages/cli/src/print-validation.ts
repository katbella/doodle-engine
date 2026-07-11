/**
 * Colored console printer for validation problems.
 *
 * The validation logic itself lives in @doodle-engine/toolkit and returns a
 * plain list. This printer is CLI-only presentation, kept here so the toolkit
 * stays free of console and color output (Doodle Studio renders the same list
 * its own way).
 */

import { crayon } from 'crayon.js';
import type { ValidationError } from '@doodle-engine/toolkit';

/**
 * Print validation errors to the console.
 */
export function printValidationErrors(errors: ValidationError[]): void {
    if (errors.length === 0) {
        console.log(crayon.green('✓ No validation errors'));
        return;
    }

    console.log(
        crayon.red(
            `\n✗ Found ${errors.length} validation error${errors.length === 1 ? '' : 's'}:\n`
        )
    );

    for (const error of errors) {
        console.log(
            crayon.bold(error.file) + (error.line ? `:${error.line}` : '')
        );
        console.log('  ' + crayon.red(error.message));
        if (error.suggestion) {
            console.log('  ' + crayon.dim(error.suggestion));
        }
        console.log();
    }
}
