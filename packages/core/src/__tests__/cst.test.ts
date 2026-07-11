/**
 * Tests for the lossless concrete-syntax layer.
 *
 * The central guarantees:
 *   1. Round-trip identity: printDialogueCst(parseDialogueCst(x)) === x, exactly.
 *   2. Semantic parity: cstToDialogue(parseDialogueCst(x)) equals parseDialogue(x).
 *   3. Targeted edits splice only their span; everything else stays byte-identical.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDialogue } from '../parser';
import {
    parseDialogueCst,
    printDialogueCst,
    cstToDialogue,
    type CstEdit,
} from '../parser/cst';

// A realistic dialogue with comments, blank lines, quoted '#', GOTO location,
// an IF branch, a silent node, effects, and a trailing newline.
const RICH = `# Plays when the player clicks the bartender
TRIGGER tavern
REQUIRE notFlag seenIntro

NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.ask_rumors
    REQUIRE notFlag heardRumors
    SET flag heardRumors
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE "Head to the market."
    GOTO location market
  END

NODE rumors
  BARTENDER: "Room #3 is down the hall."   # inline comment kept
  ADD item old_coin

  IF variableGreaterThan gold 4
    SET flag rich
    GOTO start
  END

  GOTO start

# a trailing comment
NODE skill_check
  ROLL result 1 20
  GOTO start
`;

const SIMPLE = `NODE start
  NARRATOR: @intro
  CHOICE @go
    END dialogue
  END
`;

const fixtures: Record<string, string> = { RICH, SIMPLE };

describe('parseDialogueCst / printDialogueCst — round-trip identity', () => {
    for (const [name, src] of Object.entries(fixtures)) {
        it(`reproduces ${name} byte-for-byte`, () => {
            const cst = parseDialogueCst(src, name.toLowerCase());
            expect(printDialogueCst(cst)).toBe(src);
        });
    }

    it('handles edge-case sources exactly', () => {
        const edges = [
            '',
            '\n',
            'NODE a',
            'NODE a\n',
            'a\nb',
            'a\r\nb\r\n',
            '\n\n\n',
            '# just a comment\n',
            '  NODE indented\n',
        ];
        for (const src of edges) {
            const cst = parseDialogueCst(src, 'edge');
            expect(printDialogueCst(cst)).toBe(src);
        }
    });

    it('preserves CRLF newlines', () => {
        const src = 'NODE start\r\n  NARRATOR: @hi\r\n';
        const cst = parseDialogueCst(src, 'crlf');
        expect(printDialogueCst(cst)).toBe(src);
    });
});

describe('cstToDialogue — semantic parity with parseDialogue', () => {
    for (const [name, src] of Object.entries(fixtures)) {
        it(`matches parseDialogue for ${name}`, () => {
            const id = name.toLowerCase();
            const viaCst = cstToDialogue(parseDialogueCst(src, id));
            const direct = parseDialogue(src, id);
            expect(viaCst).toEqual(direct);
        });
    }
});

describe('parseDialogueCst — structure and spans', () => {
    it('finds directives, nodes, choices and IF blocks', () => {
        const cst = parseDialogueCst(RICH, 'rich');

        expect(cst.directives.map((d) => d.kind)).toEqual([
            'trigger',
            'require',
        ]);
        expect(cst.nodes.map((n) => n.id)).toEqual([
            'start',
            'rumors',
            'skill_check',
        ]);

        const start = cst.nodes[0];
        expect(start.choices).toHaveLength(2);
        expect(start.ifs).toHaveLength(0);

        const rumors = cst.nodes[1];
        expect(rumors.choices).toHaveLength(0);
        expect(rumors.ifs).toHaveLength(1);
    });

    it('node idSpan points at the id token in the source', () => {
        const cst = parseDialogueCst(RICH, 'rich');
        const rumors = cst.nodes[1];
        expect(RICH.slice(rumors.idSpan.start, rumors.idSpan.end)).toBe(
            'rumors'
        );
    });

    it('choice span covers the whole CHOICE ... END block', () => {
        const cst = parseDialogueCst(RICH, 'rich');
        const firstChoice = cst.nodes[0].choices[0];
        // The span covers the block including its leading indentation, so an
        // edit that replaces the block controls its own indentation.
        const text = RICH.slice(firstChoice.span.start, firstChoice.span.end);
        expect(text.trimStart().startsWith('CHOICE @bartender.choice.ask_rumors')).toBe(
            true
        );
        expect(text.trimEnd().endsWith('END')).toBe(true);
    });

    it('marks comment-only and blank lines as having no code', () => {
        const cst = parseDialogueCst(RICH, 'rich');
        const commentLine = cst.lines.find((l) =>
            l.raw.startsWith('# Plays when')
        );
        expect(commentLine?.blankOrComment).toBe(true);
        expect(commentLine?.comment).toBe(
            '# Plays when the player clicks the bartender'
        );
    });
});

describe('real starter dialogue fixtures', () => {
    // The real .dlg files that `doodle create` gives every new project. Testing
    // against these (not just hand-written samples) proves the parser works on
    // the exact content authors actually start from.
    const dialoguesDir = join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../toolkit/src/templates/content/dialogues'
    );
    const files = readdirSync(dialoguesDir).filter((f) => f.endsWith('.dlg'));

    it('finds the starter fixtures', () => {
        expect(files.length).toBeGreaterThanOrEqual(5);
    });

    for (const file of files) {
        const src = readFileSync(join(dialoguesDir, file), 'utf-8');
        const id = file.replace(/\.dlg$/, '');

        it(`round-trips ${file} byte-for-byte`, () => {
            expect(printDialogueCst(parseDialogueCst(src, id))).toBe(src);
        });

        it(`derives the same Dialogue as parseDialogue for ${file}`, () => {
            expect(cstToDialogue(parseDialogueCst(src, id))).toEqual(
                parseDialogue(src, id)
            );
        });
    }
});

describe('odd formatting is preserved exactly', () => {
    it('keeps unusual indentation, trailing spaces and extra blank lines', () => {
        // Deliberately messy but valid: mixed indent widths, trailing spaces,
        // multiple blank lines, a comment-only line, and an inline comment.
        const messy =
            'NODE start\n' +
            '\t\tNARRATOR: @intro   \n' + // tab indent + trailing spaces
            '\n' +
            '\n' +
            '   # a floating comment\n' +
            '      CHOICE @go        \n' + // odd indent + trailing spaces
            '            GOTO next\n' +
            '      END\n' + // END matches the CHOICE indent (DSL requirement)
            '\n' +
            'NODE next\n' +
            '  NARRATOR: done  # inline\n';

        const cst = parseDialogueCst(messy, 'messy');
        expect(printDialogueCst(cst)).toBe(messy);
        // And it still parses to a coherent dialogue.
        expect(cstToDialogue(cst)).toEqual(parseDialogue(messy, 'messy'));
    });
});

describe('printDialogueCst — targeted edits', () => {
    it('replaces one node id and leaves the rest byte-identical', () => {
        const cst = parseDialogueCst(RICH, 'rich');
        const rumors = cst.nodes[1];
        const edit: CstEdit = { span: rumors.idSpan, text: 'gossip' };

        const out = printDialogueCst(cst, [edit]);

        // Only the targeted id changed.
        expect(out).toBe(RICH.replace('NODE rumors', 'NODE gossip'));
        // Comments and blank lines around it are untouched.
        expect(out).toContain('# a trailing comment');
        expect(out).toContain('"Room #3 is down the hall."');
    });

    it('rejects overlapping edits', () => {
        const cst = parseDialogueCst(SIMPLE, 'simple');
        const overlapping: CstEdit[] = [
            { span: { start: 0, end: 10 }, text: 'X' },
            { span: { start: 5, end: 15 }, text: 'Y' },
        ];
        expect(() => printDialogueCst(cst, overlapping)).toThrow(/overlap/i);
    });
});
