/**
 * Round-trip tests: serializing a dialogue and parsing the result must give
 * back the same display text, for every kind of text the parser accepts.
 */

import { describe, it, expect } from 'vitest';
import { parseDialogue } from '../parser';
import { serializeDialogue } from '../parser/serialize';
import type { Dialogue } from '../types/entities';

function narratorDialogue(text: string): Dialogue {
    return {
        id: 'd',
        startNode: 'a',
        nodes: [{ id: 'a', speaker: null, text, choices: [] }],
    };
}

function roundTrip(text: string): string {
    const source = serializeDialogue(narratorDialogue(text));
    return parseDialogue(source, 'd').nodes[0].text;
}

describe('serialize/parse round trip for display text', () => {
    const cases = [
        'Plain text with no special characters.',
        'A line with a colon: like this.',
        'He said "yes" # then left',
        'Quote at the end: "done"',
        '"Quoted" at the start',
        'She said "one" and "two" in a row',
        'A number sign #3 with no quotes',
        'Both a backslash \\ and a "quote" # and a hash',
        'Trailing backslash in quoted text \\',
        'Text with {gold} interpolation and a #tag',
    ];

    it.each(cases)('round-trips %j', (text) => {
        expect(roundTrip(text)).toBe(text);
    });

    it('quotes multiline text without quoting ordinary lines', () => {
        const multiline = serializeDialogue(
            narratorDialogue('First paragraph.\n\nSecond paragraph.')
        );
        const singleLine = serializeDialogue(narratorDialogue('One line.'));

        expect(multiline).toContain(
            'NARRATOR: "First paragraph.\n  \n  Second paragraph."'
        );
        expect(roundTrip('First paragraph.\n\nSecond paragraph.')).toBe(
            'First paragraph.\n\nSecond paragraph.'
        );
        expect(singleLine).toContain('NARRATOR: One line.');
        expect(singleLine).not.toContain('NARRATOR: "One line."');
    });

    it('round-trips choice text with quotes and hashes', () => {
        const dialogue: Dialogue = {
            id: 'd',
            startNode: 'a',
            nodes: [
                {
                    id: 'a',
                    speaker: null,
                    text: 'Pick one.',
                    choices: [
                        {
                            id: 'c0',
                            text: 'Say "hello" # politely',
                            effects: [{ type: 'endDialogue' }],
                            next: '',
                        },
                    ],
                },
            ],
        };
        const reparsed = parseDialogue(serializeDialogue(dialogue), 'd');
        expect(reparsed.nodes[0].choices[0].text).toBe(
            'Say "hello" # politely'
        );
    });

    it('round-trips NOTIFY text with quotes and hashes', () => {
        const dialogue: Dialogue = {
            id: 'd',
            startNode: 'a',
            nodes: [
                {
                    id: 'a',
                    speaker: null,
                    text: 'Hi.',
                    choices: [],
                    effects: [
                        { type: 'notify', message: 'Found "it" # finally' },
                    ],
                },
            ],
        };
        const reparsed = parseDialogue(serializeDialogue(dialogue), 'd');
        expect(reparsed.nodes[0].effects?.[0]).toEqual({
            type: 'notify',
            message: 'Found "it" # finally',
        });
    });

    it('keeps a real comment after quoted text a comment', () => {
        const source = [
            'NODE a',
            '  NARRATOR: "Room #3 is ready." # authors note',
        ].join('\n');
        const parsed = parseDialogue(source, 'd');
        expect(parsed.nodes[0].text).toBe('Room #3 is ready.');
    });

    it('reads escaped quotes written by hand', () => {
        const source = [
            'NODE a',
            '  NARRATOR: "He said \\"yes\\" # then left"',
        ].join('\n');
        const parsed = parseDialogue(source, 'd');
        expect(parsed.nodes[0].text).toBe('He said "yes" # then left');
    });
});
