/**
 * Tests for applyDialogueEdits — writing the visual editor's changes back to
 * .dlg source without damaging the rest of the file.
 */

import { describe, it, expect } from 'vitest';
import { parseDialogue } from '../parser';
import { applyDialogueEdits } from '../parser/edit';
import type { Dialogue } from '../types/entities';

const SOURCE = `# Header comment
NODE start
  BARTENDER: @greeting

  # a comment inside the start node
  CHOICE @ask
    GOTO rumors
  END

# a comment between nodes
NODE rumors
  BARTENDER: @rumors
  GOTO start
`;

describe('applyDialogueEdits', () => {
    it('edits one node and preserves comments and the other node', () => {
        const dialogue = parseDialogue(SOURCE, 'd');
        // Change the rumors node's line.
        dialogue.nodes[1].text = '@rumors_updated';

        const result = applyDialogueEdits(SOURCE, 'd', dialogue);

        // The comment between nodes and the header comment are still there.
        expect(result).toContain('# Header comment');
        expect(result).toContain('# a comment between nodes');
        // The start node, including its inner comment, is untouched.
        expect(result).toContain('# a comment inside the start node');
        // The edited node has the new text.
        expect(result).toContain('BARTENDER: @rumors_updated');
        // And it re-parses to the intended dialogue.
        expect(parseDialogue(result, 'd')).toEqual(dialogue);
    });

    it('leaves the file byte-identical when nothing changed', () => {
        const dialogue = parseDialogue(SOURCE, 'd');
        expect(applyDialogueEdits(SOURCE, 'd', dialogue)).toBe(SOURCE);
    });

    it('re-serializes when a node is added (structural change)', () => {
        const dialogue = parseDialogue(SOURCE, 'd');
        dialogue.nodes.push({
            id: 'extra',
            speaker: null,
            text: '@extra',
            choices: [],
        });

        const result = applyDialogueEdits(SOURCE, 'd', dialogue);
        // Correct output even though comments are not preserved for structural edits.
        expect(parseDialogue(result, 'd')).toEqual(dialogue);
        expect(result).toContain('NODE extra');
    });
});
