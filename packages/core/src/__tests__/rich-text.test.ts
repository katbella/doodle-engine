import { describe, expect, it } from 'vitest';
import { resolveText } from '../localization';
import { parseRichText } from '../rich-text';

describe('parseRichText', () => {
    it('returns plain text as one segment', () => {
        expect(parseRichText('An ordinary sentence.')).toEqual([
            { text: 'An ordinary sentence.' },
        ]);
    });

    it('parses bold, italic, and color formatting', () => {
        expect(
            parseRichText(
                'Take the *key*, move _quietly_, and follow cE5c453[me].'
            )
        ).toEqual([
            { text: 'Take the ' },
            { text: 'key', bold: true },
            { text: ', move ' },
            { text: 'quietly', italic: true },
            { text: ', and follow ' },
            { text: 'me', color: '#E5C453' },
            { text: '.' },
        ]);
    });

    it('combines nested formatting', () => {
        expect(parseRichText('cE5C453[*important _key_*]')).toEqual([
            { text: 'important ', bold: true, color: '#E5C453' },
            {
                text: 'key',
                bold: true,
                italic: true,
                color: '#E5C453',
            },
        ]);
    });

    it('preserves escaped formatting punctuation', () => {
        expect(
            parseRichText(
                String.raw`\*bold\* \_italic\_ \cE5C453[color] \\ path`
            )
        ).toEqual([
            { text: String.raw`*bold* _italic_ cE5C453[color] \ path` },
        ]);
    });

    it('leaves incomplete formatting as literal text', () => {
        expect(parseRichText('*open _also c123456[color')).toEqual([
            { text: '*open _also c123456[color' },
        ]);
    });

    it('preserves newlines and unicode text', () => {
        expect(parseRichText('*第一行*\n_مرحبا_ 👋')).toEqual([
            { text: '第一行', bold: true },
            { text: '\n' },
            { text: 'مرحبا', italic: true },
            { text: ' 👋' },
        ]);
    });

    it('parses formatting after localization and interpolation', () => {
        const resolved = resolveText(
            '@dialogue.key',
            {
                'dialogue.key':
                    'Welcome, *{player.name}*. Take the cE5C453[key].',
            },
            {},
            {
                player: {
                    name: 'Avery',
                    title: '',
                    biography: '',
                    stats: {},
                    literalProfile: true,
                },
            }
        );

        expect(parseRichText(resolved)).toEqual([
            { text: 'Welcome, ' },
            { text: 'Avery', bold: true },
            { text: '. Take the ' },
            { text: 'key', color: '#E5C453' },
            { text: '.' },
        ]);
    });

    it('returns no segments for empty text', () => {
        expect(parseRichText('')).toEqual([]);
    });
});
