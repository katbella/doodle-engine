/**
 * A second parser for .dlg files that keeps everything the runtime parser drops.
 *
 * The parser in ./index.ts is built for *running* a game, so it throws away
 * comments, blank lines, indentation, and character positions and hands back a
 * clean Dialogue object. Doodle Studio's visual editor needs the opposite: it
 * reads a .dlg file into forms and writes it back, and it must not delete the
 * author's comments or reshuffle their formatting. So this module holds the
 * file exactly as it was written.
 *
 *   - parseDialogueCst(source, id) → a tree that holds every line of the file
 *     (code, comment, and blank) with its position, plus enough structure
 *     (directives, nodes, choice/IF blocks) to jump around and edit one piece.
 *   - printDialogueCst(cst, edits) → the file text back. With no edits it returns
 *     the original bytes unchanged; with edits it drops the new text into the
 *     given positions and leaves every other byte untouched.
 *   - cstToDialogue(cst, edits) → the Dialogue object. It gets there by printing
 *     the tree back to text and handing that to the runtime parseDialogue, so a
 *     file's meaning is decided in one place only and this tree can never drift
 *     from what the engine actually does.
 */

import type { Dialogue } from '../types/entities';
import { parseDialogue } from './index';
import { findUnescapedQuote, splitComment } from './comment';

/** A byte range [start, end) into the CST's original source string. */
export interface Span {
    start: number;
    end: number;
}

/**
 * One physical line of the source, retained exactly.
 *
 * `raw` is the line without its newline; `newline` is the terminator that
 * followed it ('\n', '\r\n', or '' for the final line). Joining every line's
 * `raw + newline` in order reproduces the source byte-for-byte.
 */
export interface CstLine {
    /** Exact line text, including indentation, excluding the newline. */
    raw: string;
    /** The line terminator that followed this line ('\n', '\r\n', or ''). */
    newline: string;
    /** Offset of `raw` in the source. */
    start: number;
    /** Leading-whitespace width of the code portion. */
    indent: number;
    /** Trimmed, comment-stripped code for this line ('' for blank/comment-only). */
    content: string;
    /** Offset where `content` begins in the source (start of the trimmed code). */
    contentStart: number;
    /** Trailing or standalone comment text including '#', or null if none. */
    comment: string | null;
    /** True when the line has no code — it is blank or only a comment. */
    blankOrComment: boolean;
    multilineContinuation: boolean;
}

/** A top-level TRIGGER or REQUIRE directive (before the first NODE). */
export interface CstDirective {
    kind: 'trigger' | 'require';
    /** Index into `DialogueCst.lines`. */
    lineIndex: number;
    span: Span;
}

/** A CHOICE ... END block inside a node. */
export interface CstChoice {
    /** Index of the `CHOICE` line. */
    headerLine: number;
    /** Index of the matching `END` line (or the last line of the block). */
    endLine: number;
    span: Span;
}

/** An IF ... END block inside a node. */
export interface CstIf {
    headerLine: number;
    endLine: number;
    span: Span;
}

/** A NODE block. */
export interface CstNode {
    id: string;
    /** Index of the `NODE <id>` header line. */
    headerLine: number;
    /** Range of the node id token, for click-to-navigate and rename. */
    idSpan: Span;
    /** The whole node, header through the line before the next node/EOF. */
    span: Span;
    /** End of the node's last code line (excludes trailing blank/comment lines). */
    contentEnd: number;
    /** Index of the single speaker/narration line, if present. */
    speakerLine?: number;
    choices: CstChoice[];
    ifs: CstIf[];
}

/** The lossless tree for one .dlg file. */
export interface DialogueCst {
    id: string;
    source: string;
    lines: CstLine[];
    directives: CstDirective[];
    nodes: CstNode[];
}

/** A targeted replacement: put `text` in place of `span`. */
export interface CstEdit {
    span: Span;
    text: string;
}

/**
 * Split source into physical lines, preserving exact newlines and offsets.
 * Rejoining `raw + newline` for every returned line reproduces `source`.
 */
function splitPhysicalLines(
    source: string
): { raw: string; newline: string; start: number }[] {
    // Capturing split keeps the separators: ["a", "\n", "b", "", ...].
    const parts = source.split(/(\r\n|\n)/);
    const out: { raw: string; newline: string; start: number }[] = [];
    let offset = 0;
    for (let i = 0; i < parts.length; i += 2) {
        const raw = parts[i];
        const newline = parts[i + 1] ?? '';
        out.push({ raw, newline, start: offset });
        offset += raw.length + newline.length;
    }
    return out;
}

/** Build the per-line model from raw source. */
function buildLines(source: string): CstLine[] {
    let insideQuotedText = false;
    return splitPhysicalLines(source).map(({ raw, newline, start }) => {
        const multilineContinuation = insideQuotedText;
        let code: string;
        let comment: string | null;

        if (insideQuotedText) {
            const closingQuote = findUnescapedQuote(raw);
            if (closingQuote === -1) {
                code = raw;
                comment = null;
            } else {
                const afterQuote = raw.substring(closingQuote + 1);
                const hash = afterQuote.indexOf('#');
                if (hash === -1) {
                    code = raw;
                    comment = null;
                } else {
                    const commentStart = closingQuote + 1 + hash;
                    code = raw.substring(0, commentStart);
                    comment = raw.substring(commentStart);
                }
                insideQuotedText = false;
            }
        } else {
            ({ code, comment } = splitComment(raw));
            const openingQuote = findUnescapedQuote(code);
            insideQuotedText =
                openingQuote !== -1 &&
                findUnescapedQuote(code, openingQuote + 1) === -1;
        }

        const trimmedStart = code.length - code.trimStart().length;
        const content = code.trim();
        return {
            raw,
            newline,
            start,
            indent: trimmedStart,
            content,
            contentStart: start + trimmedStart,
            comment,
            blankOrComment: !multilineContinuation && content.length === 0,
            multilineContinuation,
        };
    });
}

/** End offset of a line's raw text (exclusive of its newline). */
function lineEnd(line: CstLine): number {
    return line.start + line.raw.length;
}

/**
 * Within a node's code lines, find CHOICE/IF blocks and their matching END.
 *
 * The runtime parser matches END by equal indentation; we do the same, mapping
 * each block back to the physical line indices so callers get real spans.
 */
function collectBlocks(
    lines: CstLine[],
    codeIndices: number[]
): { choices: CstChoice[]; ifs: CstIf[]; speakerLine?: number } {
    const choices: CstChoice[] = [];
    const ifs: CstIf[] = [];
    let speakerLine: number | undefined;

    for (let k = 0; k < codeIndices.length; k++) {
        const idx = codeIndices[k];
        const line = lines[idx];
        if (line.multilineContinuation) continue;
        const first = line.content.split(/\s+/)[0];

        if (first === 'CHOICE' || first === 'IF') {
            // Find the matching END at the same indent, scanning later code lines.
            let endIndex = idx;
            for (let j = k + 1; j < codeIndices.length; j++) {
                const cand = lines[codeIndices[j]];
                if (cand.content === 'END' && cand.indent === line.indent) {
                    endIndex = codeIndices[j];
                    break;
                }
                // A new NODE or a sibling block header at the same indent closes
                // an unterminated block defensively (best-effort, never throws).
                if (
                    cand.indent <= line.indent &&
                    cand.content.startsWith('NODE ')
                ) {
                    endIndex = codeIndices[j - 1] ?? idx;
                    break;
                }
            }
            const block = {
                headerLine: idx,
                endLine: endIndex,
                span: { start: line.start, end: lineEnd(lines[endIndex]) },
            };
            if (first === 'CHOICE') choices.push(block);
            else ifs.push(block);
        } else if (
            speakerLine === undefined &&
            line.content.includes(':') &&
            !isStructuralOrEffect(first)
        ) {
            // First speaker/narration line in the node (best-effort; the
            // authoritative single-speaker rule lives in the runtime parser).
            speakerLine = idx;
        }
    }

    return { choices, ifs, speakerLine };
}

/** Leading keywords that are structure or effects, not speaker lines. */
const NON_SPEAKER_KEYWORDS = new Set([
    'NODE',
    'CHOICE',
    'IF',
    'END',
    'GOTO',
    'REQUIRE',
    'TRIGGER',
    'VOICE',
    'PORTRAIT',
    'SET',
    'CLEAR',
    'ADD',
    'REMOVE',
    'MOVE',
    'ADVANCE',
    'START',
    'MUSIC',
    'SOUND',
    'VIDEO',
    'INTERLUDE',
    'NOTIFY',
    'ROLL',
]);

function isStructuralOrEffect(keyword: string): boolean {
    return NON_SPEAKER_KEYWORDS.has(keyword);
}

/**
 * Parse a .dlg source into a lossless CST.
 *
 * This is best-effort structural parsing: it never throws on ordinary input and
 * degrades gracefully on odd input, because the authoritative errors come from
 * the runtime parser (via cstToDialogue) and the validator. Its job is to
 * retain every byte and expose navigable structure with real source spans.
 */
export function parseDialogueCst(source: string, id: string): DialogueCst {
    const lines = buildLines(source);
    const directives: CstDirective[] = [];
    const nodes: CstNode[] = [];

    // Positions of the lines that hold code, in order. We skip blank and
    // comment lines here because only code lines carry structure to parse.
    const codeIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i].blankOrComment) codeIndices.push(i);
    }

    // Node header positions within codeIndices.
    const nodeHeaderPositions: number[] = [];
    for (let k = 0; k < codeIndices.length; k++) {
        const line = lines[codeIndices[k]];
        if (line.multilineContinuation) continue;
        if (line.content.startsWith('NODE ')) {
            nodeHeaderPositions.push(k);
        } else if (nodeHeaderPositions.length === 0) {
            // Top-level directives appear before the first node.
            if (line.content.startsWith('TRIGGER ')) {
                directives.push({
                    kind: 'trigger',
                    lineIndex: codeIndices[k],
                    span: { start: line.start, end: lineEnd(line) },
                });
            } else if (line.content.startsWith('REQUIRE ')) {
                directives.push({
                    kind: 'require',
                    lineIndex: codeIndices[k],
                    span: { start: line.start, end: lineEnd(line) },
                });
            }
        }
    }

    for (let n = 0; n < nodeHeaderPositions.length; n++) {
        const headerPos = nodeHeaderPositions[n];
        const headerIndex = codeIndices[headerPos];
        const headerLine = lines[headerIndex];

        const nodeId = headerLine.content.substring(5).trim();
        const idOffset =
            headerLine.contentStart + headerLine.content.indexOf(nodeId);

        // The node owns code lines up to (but not including) the next node header.
        const nextHeaderPos = nodeHeaderPositions[n + 1];
        const bodyCodeIndices = codeIndices.slice(
            headerPos + 1,
            nextHeaderPos ?? codeIndices.length
        );

        // The node's span ends at the start of the next node's header line, or
        // at end of file for the last node (any trailing blank/comment lines
        // stay attached to it).
        const spanEnd =
            nextHeaderPos !== undefined
                ? lines[codeIndices[nextHeaderPos]].start
                : source.length;

        const { choices, ifs, speakerLine } = collectBlocks(
            lines,
            bodyCodeIndices
        );

        // The node's content ends at its last code line; trailing blank and
        // comment lines belong to the gap before the next node and are left
        // untouched when the node is spliced.
        const lastCodeIndex =
            bodyCodeIndices.length > 0
                ? bodyCodeIndices[bodyCodeIndices.length - 1]
                : headerIndex;

        nodes.push({
            id: nodeId,
            headerLine: headerIndex,
            idSpan: { start: idOffset, end: idOffset + nodeId.length },
            span: { start: headerLine.start, end: spanEnd },
            contentEnd: lineEnd(lines[lastCodeIndex]),
            speakerLine,
            choices,
            ifs,
        });
    }

    return { id, source, lines, directives, nodes };
}

/**
 * Serialize a CST back to .dlg text.
 *
 * With no edits, returns the original source unchanged (byte-for-byte). With
 * edits, applies them as non-overlapping splices into the original source, so
 * every untouched region — including comments and blank lines — is preserved
 * exactly. Edits are sorted by position; overlapping edits throw.
 */
export function printDialogueCst(
    cst: DialogueCst,
    edits: CstEdit[] = []
): string {
    if (edits.length === 0) {
        return cst.source;
    }

    const sorted = [...edits].sort((a, b) => a.span.start - b.span.start);
    let result = '';
    let cursor = 0;
    for (const edit of sorted) {
        if (edit.span.start < cursor) {
            throw new Error(
                `Overlapping CST edits at offset ${edit.span.start} (previous edit ended at ${cursor}).`
            );
        }
        result += cst.source.slice(cursor, edit.span.start);
        result += edit.text;
        cursor = edit.span.end;
    }
    result += cst.source.slice(cursor);
    return result;
}

/**
 * Turn the tree (with any pending edits) into a Dialogue object.
 *
 * It prints the tree back to text and parses that with the runtime
 * parseDialogue, so a file's meaning is decided in one place only and this tree
 * can never drift from what the engine actually does.
 */
export function cstToDialogue(
    cst: DialogueCst,
    edits: CstEdit[] = []
): Dialogue {
    return parseDialogue(printDialogueCst(cst, edits), cst.id);
}
