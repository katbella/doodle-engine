/**
 * Tests for the CLI's validation printer.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { printValidationErrors } from '../print-validation';

afterEach(() => {
    vi.restoreAllMocks();
});

function captureLog(fn: () => void): string {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    fn();
    return log.mock.calls.map((args) => args.join(' ')).join('\n');
}

describe('printValidationErrors', () => {
    it('reports success when there are no errors', () => {
        const output = captureLog(() => printValidationErrors([]));
        expect(output).toContain('No validation errors');
    });

    it('prints each error with its file, message, and suggestion', () => {
        const output = captureLog(() =>
            printValidationErrors([
                {
                    file: 'content/dialogues/bartender.dlg',
                    message: 'Start node "start" not found',
                    suggestion: 'Add a NODE start or fix the startNode reference',
                },
            ])
        );

        expect(output).toContain('content/dialogues/bartender.dlg');
        expect(output).toContain('Start node "start" not found');
        expect(output).toContain('Add a NODE start');
    });

    it('shows the count for multiple errors', () => {
        const output = captureLog(() =>
            printValidationErrors([
                { file: 'a.dlg', message: 'one' },
                { file: 'b.dlg', message: 'two' },
            ])
        );

        expect(output).toContain('2 validation errors');
    });
});
