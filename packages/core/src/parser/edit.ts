/**
 * Apply the visual editor's changes back to .dlg source.
 *
 * Saving from the visual editor must not cost the author their comments or
 * reformat lines they did not touch. The rules:
 *
 *   - A node that did not change keeps its exact bytes, wherever it moves.
 *     Adding, removing, renaming, or reordering nodes moves whole node
 *     blocks, so comments travel with their nodes.
 *   - A changed node is re-serialized, then matched line by line against
 *     what was there before: lines whose code is unchanged keep their
 *     original text (trailing comments included), standalone comment lines
 *     are re-inserted beside the lines they sat next to, and comments from
 *     lines that no longer exist are kept as their own lines rather than
 *     dropped.
 *   - Changes to the TRIGGER/REQUIRE header replace just those lines when
 *     the shape allows it.
 *   - New text always uses the newline style the file already uses.
 */

import type { Dialogue, DialogueNode } from '../types/entities';
import {
    parseDialogueCst,
    cstToDialogue,
    printDialogueCst,
    type CstEdit,
    type CstLine,
    type CstNode,
    type DialogueCst,
} from './cst';
import { serializeNode, serializeCondition } from './serialize';

/** The newline style the file already uses (CRLF wins ties on CRLF files). */
function detectNewline(source: string): string {
    const crlf = (source.match(/\r\n/g) ?? []).length;
    const bare = (source.match(/(?<!\r)\n/g) ?? []).length;
    return crlf > 0 && crlf >= bare ? '\r\n' : '\n';
}

/** The TRIGGER/REQUIRE lines a dialogue's header serializes to, in order. */
function headerLines(
    dialogue: Dialogue
): { kind: 'trigger' | 'require'; text: string }[] {
    const lines: { kind: 'trigger' | 'require'; text: string }[] = [];
    if (dialogue.triggerLocation) {
        lines.push({
            kind: 'trigger',
            text: `TRIGGER ${dialogue.triggerLocation}`,
        });
    }
    for (const condition of dialogue.conditions ?? []) {
        lines.push({
            kind: 'require',
            text: `REQUIRE ${serializeCondition(condition)}`,
        });
    }
    return lines;
}

function headerText(dialogue: Dialogue): string {
    return headerLines(dialogue)
        .map((line) => line.text)
        .join('\n');
}

/**
 * Span replacements that update the header in place, or null when the
 * header's shape changed (a directive added or removed) and the lines
 * before the first node have to be rebuilt instead.
 */
function planHeaderEdits(
    cst: DialogueCst,
    original: Dialogue,
    edited: Dialogue
): CstEdit[] | null {
    if (headerText(original) === headerText(edited)) {
        return [];
    }

    const wanted = headerLines(edited);
    const have = cst.directives;
    const wantedTriggers = wanted.filter((l) => l.kind === 'trigger');
    const haveTriggers = have.filter((d) => d.kind === 'trigger');
    const wantedRequires = wanted.filter((l) => l.kind === 'require');
    const haveRequires = have.filter((d) => d.kind === 'require');

    if (
        wantedTriggers.length !== haveTriggers.length ||
        wantedRequires.length !== haveRequires.length
    ) {
        return null;
    }

    const edits: CstEdit[] = [];
    const pair = (
        directives: typeof have,
        lines: typeof wanted
    ) => {
        for (let i = 0; i < directives.length; i++) {
            const line = cst.lines[directives[i].lineIndex];
            if (line.content !== lines[i].text) {
                edits.push({ span: directives[i].span, text: lines[i].text });
            }
        }
    };
    pair(haveTriggers, wantedTriggers);
    pair(haveRequires, wantedRequires);
    return edits;
}

/** The code part of a line's original text, without any trailing comment. */
function rawCode(line: CstLine): string {
    const withoutComment = line.comment
        ? line.raw.slice(0, line.raw.length - line.comment.length)
        : line.raw;
    return withoutComment.trimEnd();
}

/** The original lines that make up a node's code block, header included. */
function nodeLines(cst: DialogueCst, cstNode: CstNode): CstLine[] {
    const lines: CstLine[] = [];
    for (let i = cstNode.headerLine; i < cst.lines.length; i++) {
        const line = cst.lines[i];
        if (line.start >= cstNode.contentEnd) break;
        lines.push(line);
    }
    return lines;
}

/**
 * Serialize a changed node, then bring the old node's comments and
 * untouched lines along:
 *
 *   1. Any new line whose code matches an old line exactly reuses the old
 *      line's text, so its trailing comment survives.
 *   2. Comments from changed or removed lines become their own comment
 *      lines above the first new or changed line, so no comment is lost.
 *   3. Standalone comment lines are re-inserted above the line they sat
 *      above; if that line is gone, they land under the node header.
 *
 * Returns node text without a trailing newline, joined with the file's
 * newline style.
 */
function renderNode(
    node: DialogueNode,
    cstNode: CstNode,
    cst: DialogueCst,
    newline: string
): string {
    const out = serializeNode(node).split('\n');
    const originals = nodeLines(cst, cstNode);

    // Step 1: reuse old lines whose code is identical to a new line.
    const reusedOriginals = new Set<number>();
    const matchedNew = new Set<number>();
    for (let n = 0; n < out.length; n++) {
        for (let o = 0; o < originals.length; o++) {
            if (reusedOriginals.has(o)) continue;
            const line = originals[o];
            if (line.blankOrComment) continue;
            if (rawCode(line) === out[n]) {
                out[n] = line.raw;
                reusedOriginals.add(o);
                matchedNew.add(n);
                break;
            }
        }
    }

    // Step 2: keep comments whose line changed or disappeared. They go
    // above the first new or changed line, while the reuse bookkeeping
    // from step 1 still points at the right positions.
    const orphaned: string[] = [];
    for (let o = 0; o < originals.length; o++) {
        const line = originals[o];
        if (line.blankOrComment || !line.comment) continue;
        if (reusedOriginals.has(o)) continue;
        orphaned.push(' '.repeat(line.indent) + line.comment);
    }
    if (orphaned.length > 0) {
        let at = out.findIndex(
            (_, index) => index > 0 && !matchedNew.has(index)
        );
        if (at < 0) at = 1;
        out.splice(at, 0, ...orphaned);
    }

    // Step 3: put standalone comment lines back beside their neighbors,
    // found by text so earlier insertions cannot throw them off.
    // Insertions walk forward so a group of comments keeps its order.
    let fallbackAt = 1; // right under the node header
    for (let o = 0; o < originals.length; o++) {
        const line = originals[o];
        if (!line.blankOrComment || !line.comment) continue;

        // The line this comment sat above, if it still exists.
        let anchorAt = -1;
        for (let next = o + 1; next < originals.length; next++) {
            const candidate = originals[next];
            if (candidate.blankOrComment) continue;
            const target = candidate.raw;
            anchorAt = out.findIndex(
                (text, index) => index >= fallbackAt && text === target
            );
            break;
        }

        const at = anchorAt >= 0 ? anchorAt : fallbackAt;
        out.splice(at, 0, line.raw);
        fallbackAt = at + 1;
    }

    return out.join(newline);
}

/** Append text so the result ends with at least one newline first. */
function joinPiece(acc: string, piece: string, newline: string): string {
    if (acc.length > 0 && !acc.endsWith('\n')) {
        acc += newline;
    }
    return acc + piece;
}

export function applyDialogueEdits(
    source: string,
    id: string,
    edited: Dialogue
): string {
    const cst = parseDialogueCst(source, id);
    const original = cstToDialogue(cst);
    const newline = detectNewline(source);

    const headerEdits = planHeaderEdits(cst, original, edited);
    const sameOrder =
        original.nodes.length === edited.nodes.length &&
        original.nodes.every((node, i) => node.id === edited.nodes[i].id);

    // The common case: the same nodes in the same order. Changed nodes are
    // spliced in place and everything else keeps its exact bytes.
    if (sameOrder && headerEdits !== null) {
        const cstById = new Map(cst.nodes.map((node) => [node.id, node]));
        const edits: CstEdit[] = [...headerEdits];
        for (let i = 0; i < edited.nodes.length; i++) {
            const node = edited.nodes[i];
            const before = original.nodes[i];
            const cstNode = cstById.get(node.id);
            if (!cstNode) continue;
            if (serializeNode(before) !== serializeNode(node)) {
                edits.push({
                    span: { start: cstNode.span.start, end: cstNode.contentEnd },
                    text: renderNode(node, cstNode, cst, newline),
                });
            }
        }
        return printDialogueCst(cst, edits);
    }

    // Nodes were added, removed, renamed, or reordered. Rebuild the file
    // from whole node blocks so untouched nodes keep their exact bytes.

    // When the count is unchanged but the ids differ, a node was renamed:
    // pair old and new nodes by position. Otherwise pair them by id.
    const sameCount = original.nodes.length === edited.nodes.length;
    const idMultisetEqual =
        sameCount &&
        [...original.nodes.map((n) => n.id)].sort().join('\n') ===
            [...edited.nodes.map((n) => n.id)].sort().join('\n');
    const indexById = new Map(original.nodes.map((node, i) => [node.id, i]));
    const matchFor = (editedIndex: number): number | undefined =>
        sameCount && !idMultisetEqual
            ? editedIndex
            : indexById.get(edited.nodes[editedIndex].id);

    // Everything before the first node: leading comments and the header.
    const preambleEnd = cst.nodes.length > 0 ? cst.nodes[0].span.start : source.length;
    let preamble = source.slice(0, preambleEnd);
    if (headerEdits === null) {
        // The header's shape changed; keep the leading comments and blank
        // lines, then write the new header lines.
        const kept: string[] = [];
        for (const line of cst.lines) {
            if (line.start >= preambleEnd) break;
            if (line.blankOrComment) kept.push(line.raw);
        }
        const header = headerLines(edited).map((line) => line.text);
        const parts = [...kept, ...header];
        preamble = parts.length > 0 ? parts.join(newline) + newline : '';
    } else if (headerEdits.length > 0) {
        // Same shape, different values: splice the changed directive lines.
        const sorted = [...headerEdits].sort((a, b) => a.span.start - b.span.start);
        let result = '';
        let cursor = 0;
        for (const edit of sorted) {
            result += source.slice(cursor, edit.span.start) + edit.text;
            cursor = edit.span.end;
        }
        preamble = result + source.slice(cursor, preambleEnd);
    }

    let result = preamble;
    for (let i = 0; i < edited.nodes.length; i++) {
        const node = edited.nodes[i];
        const originalIndex = matchFor(i);
        const cstNode =
            originalIndex !== undefined ? cst.nodes[originalIndex] : undefined;
        const before =
            originalIndex !== undefined
                ? original.nodes[originalIndex]
                : undefined;

        let piece: string;
        if (cstNode && before && serializeNode(before) === serializeNode(node)) {
            piece = source.slice(cstNode.span.start, cstNode.span.end);
        } else if (cstNode) {
            piece =
                renderNode(node, cstNode, cst, newline) +
                source.slice(cstNode.contentEnd, cstNode.span.end);
        } else {
            // A brand-new node; give it a blank line before it.
            const text = serializeNode(node).split('\n').join(newline);
            piece = (result.trim().length > 0 ? newline : '') + text + newline;
        }
        result = joinPiece(result, piece, newline);
    }

    if (result.length > 0 && !result.endsWith('\n')) {
        result += newline;
    }
    return result;
}
