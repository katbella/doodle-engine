/**
 * Apply the visual editor's changes back to .dlg source.
 *
 * When only node contents changed (same nodes, same order — the common case),
 * each changed node is spliced into its original span, so comments, blank lines,
 * and untouched nodes are preserved exactly. Structural changes (adding,
 * removing, or reordering nodes, or editing the dialogue's TRIGGER/REQUIRE) fall
 * back to a full canonical re-serialize, which is correct but does not preserve
 * comments.
 */

import type { Dialogue } from '../types/entities';
import {
    parseDialogueCst,
    printDialogueCst,
    cstToDialogue,
    type CstEdit,
} from './cst';
import {
    serializeNode,
    serializeDialogue,
    serializeCondition,
} from './serialize';

function headerText(dialogue: Dialogue): string {
    const parts: string[] = [];
    if (dialogue.triggerLocation) {
        parts.push(`TRIGGER ${dialogue.triggerLocation}`);
    }
    for (const condition of dialogue.conditions ?? []) {
        parts.push(`REQUIRE ${serializeCondition(condition)}`);
    }
    return parts.join('\n');
}

export function applyDialogueEdits(
    source: string,
    id: string,
    edited: Dialogue
): string {
    const cst = parseDialogueCst(source, id);
    const original = cstToDialogue(cst);

    const sameOrder =
        original.nodes.length === edited.nodes.length &&
        original.nodes.every((node, i) => node.id === edited.nodes[i].id);

    if (!sameOrder || headerText(original) !== headerText(edited)) {
        return serializeDialogue(edited);
    }

    const cstById = new Map(cst.nodes.map((node) => [node.id, node]));
    const edits: CstEdit[] = [];
    for (let i = 0; i < edited.nodes.length; i++) {
        const node = edited.nodes[i];
        const before = original.nodes[i];
        const cstNode = cstById.get(node.id);
        if (!cstNode) continue;
        if (serializeNode(before) !== serializeNode(node)) {
            edits.push({
                span: { start: cstNode.span.start, end: cstNode.contentEnd },
                text: serializeNode(node),
            });
        }
    }

    return printDialogueCst(cst, edits);
}
