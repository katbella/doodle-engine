/**
 * Tests that visual-editor saves keep the author's comments and the file's
 * newline style, for content edits and for structural changes (adding,
 * removing, renaming, and reordering nodes, and header changes).
 */

import { describe, it, expect } from 'vitest';
import { parseDialogue } from '../parser';
import { applyDialogueEdits } from '../parser/edit';
import type { Dialogue } from '../types/entities';

const COMMENTED = [
    '# file header comment',
    'NODE start',
    '  # note above the spoken line',
    '  BARTENDER: Welcome back.',
    '  PORTRAIT neutral.png # inline comment on the portrait',
    '  GOTO second',
    '',
    '# comment between nodes',
    'NODE second',
    '  NARRATOR: The end. # trailing note',
    '  END dialogue',
    '',
].join('\n');

function edit(source: string, change: (d: Dialogue) => void): string {
    const dialogue = parseDialogue(source, 'd');
    change(dialogue);
    return applyDialogueEdits(source, 'd', dialogue);
}

describe('content edits keep comments', () => {
    it('keeps every comment when an unrelated field changes', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes[0].voice = 'hello.ogg';
        });
        expect(result).toContain('# file header comment');
        expect(result).toContain('# note above the spoken line');
        expect(result).toContain('# inline comment on the portrait');
        expect(result).toContain('# comment between nodes');
        expect(result).toContain('# trailing note');
        expect(result).toContain('VOICE hello.ogg');
    });

    it('keeps a standalone comment above the line it belongs to', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes[0].portrait = 'happy.png';
        });
        const lines = result.split('\n');
        const noteAt = lines.findIndex((l) =>
            l.includes('# note above the spoken line')
        );
        expect(lines[noteAt + 1]).toContain('BARTENDER: Welcome back.');
    });

    it('keeps an inline comment on a line that did not change', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes[0].text = 'Welcome back, friend.';
        });
        expect(result).toContain(
            'PORTRAIT neutral.png # inline comment on the portrait'
        );
    });

    it('keeps the comment from a line that changed, as its own line', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes[0].portrait = 'happy.png';
        });
        expect(result).toContain('# inline comment on the portrait');
        expect(result).toContain('PORTRAIT happy.png');
    });

    it('reparses to exactly the edited dialogue', () => {
        const dialogue = parseDialogue(COMMENTED, 'd');
        dialogue.nodes[0].portrait = 'happy.png';
        const result = applyDialogueEdits(COMMENTED, 'd', dialogue);
        expect(parseDialogue(result, 'd')).toEqual(dialogue);
    });
});

describe('structural edits keep comments', () => {
    it('adding a node leaves existing nodes byte-identical', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes.push({
                id: 'extra',
                speaker: null,
                text: 'More.',
                choices: [],
            });
        });
        expect(result).toContain('# file header comment');
        expect(result).toContain('# note above the spoken line');
        expect(result).toContain('# inline comment on the portrait');
        expect(result).toContain('# comment between nodes');
        expect(result).toContain('# trailing note');
        expect(result).toContain('NODE extra');
        expect(result).toContain('NARRATOR: More.');
    });

    it('deleting a node keeps the other nodes and their comments', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes = d.nodes.filter((n) => n.id !== 'second');
            d.nodes[0].next = undefined;
        });
        expect(result).toContain('# note above the spoken line');
        expect(result).toContain('# inline comment on the portrait');
        expect(result).not.toContain('NODE second');
    });

    it('moving a node to the front keeps comments with their nodes', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes = [d.nodes[1], d.nodes[0]];
            d.startNode = 'second';
        });
        expect(result).toContain('# trailing note');
        expect(result).toContain('# note above the spoken line');
        const parsed = parseDialogue(result, 'd');
        expect(parsed.startNode).toBe('second');
        expect(parsed.nodes.map((n) => n.id)).toEqual(['second', 'start']);
    });

    it('renaming a node keeps the comments inside it', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes[1] = { ...d.nodes[1], id: 'finale' };
            d.nodes[0] = { ...d.nodes[0], next: 'finale' };
        });
        expect(result).toContain('NODE finale');
        expect(result).toContain('# trailing note');
        expect(result).toContain('GOTO finale');
        expect(result).not.toContain('NODE second');
    });
});

describe('header edits', () => {
    const WITH_HEADER = [
        '# about this dialogue',
        'TRIGGER town',
        'REQUIRE hasFlag ready',
        '',
        'NODE start',
        '  # inner note',
        '  NARRATOR: Hello.',
        '  END dialogue',
        '',
    ].join('\n');

    it('changes just the TRIGGER line', () => {
        const result = edit(WITH_HEADER, (d) => {
            d.triggerLocation = 'harbor';
        });
        expect(result).toContain('TRIGGER harbor');
        expect(result).toContain('# about this dialogue');
        expect(result).toContain('# inner note');
        expect(result).toContain('REQUIRE hasFlag ready');
    });

    it('keeps comments when the header shape changes', () => {
        const result = edit(WITH_HEADER, (d) => {
            d.conditions = undefined;
        });
        expect(result).toContain('TRIGGER town');
        expect(result).not.toContain('REQUIRE');
        expect(result).toContain('# about this dialogue');
        expect(result).toContain('# inner note');
    });
});

describe('newline style', () => {
    const CRLF = COMMENTED.replace(/\n/g, '\r\n');

    function bareLineFeeds(text: string): number {
        return (text.match(/(?<!\r)\n/g) ?? []).length;
    }

    it('a content edit on a CRLF file stays pure CRLF', () => {
        const result = edit(CRLF, (d) => {
            d.nodes[0].portrait = 'happy.png';
        });
        expect(bareLineFeeds(result)).toBe(0);
        expect(result).toContain('\r\n');
    });

    it('adding a node to a CRLF file stays pure CRLF', () => {
        const result = edit(CRLF, (d) => {
            d.nodes.push({
                id: 'extra',
                speaker: null,
                text: 'More.',
                choices: [],
            });
        });
        expect(bareLineFeeds(result)).toBe(0);
        expect(result).toContain('\r\n');
    });

    it('an LF file stays pure LF', () => {
        const result = edit(COMMENTED, (d) => {
            d.nodes[0].portrait = 'happy.png';
        });
        expect(result).not.toContain('\r\n');
    });
});
