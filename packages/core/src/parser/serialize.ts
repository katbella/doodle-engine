/**
 * Serialize dialogue entities back to .dlg source.
 *
 * This is the inverse of the parser in ./index.ts, used by the visual editor to
 * write a node it changed back to the file. Output is canonical (two-space
 * indentation); comment and formatting preservation for the rest of the file is
 * handled by the concrete-syntax layer, which splices a serialized node into
 * its original span and leaves everything else untouched.
 */

import type {
    Dialogue,
    DialogueNode,
    Choice,
    ConditionalBranch,
} from '../types/entities';
import type { Condition } from '../types/conditions';
import type { Effect } from '../types/effects';
import {
    conditionDescriptor,
    effectDescriptor,
    type ArgKind,
    type ConditionDescriptor,
    type EffectDescriptor,
} from './descriptors';

const INDENT = '  ';

/** Display text for a speaker/choice/notify line: @keys and plain words pass
 * through; text containing '#' or '"' is wrapped in quotes so it isn't read
 * as a comment, with backslashes and double quotes escaped so the parser
 * reads back exactly the same text. */
function displayText(text: string): string {
    if (text.startsWith('@')) return text;
    if (text.includes('\n') || text.includes('#') || text.includes('"')) {
        return `"${text.replace(/[\\"]/g, (ch) => '\\' + ch)}"`;
    }
    return text;
}

export interface DlgToken {
    /** Reserved word, author identifier, scalar value, or display text. */
    kind: 'keyword' | 'id' | 'value' | 'text';
    text: string;
}

function tokenKind(kind: ArgKind): DlgToken['kind'] {
    if (
        kind === 'number' ||
        kind === 'hours' ||
        kind === 'boolean' ||
        kind === 'value'
    ) {
        return 'value';
    }
    if (kind === 'text') return 'text';
    return 'id';
}

function descriptorTokens(
    entity: Condition | Effect,
    descriptor: ConditionDescriptor | EffectDescriptor
): DlgToken[] {
    const tokens: DlgToken[] = descriptor.keyword
        .split(/\s+/)
        .map((text) => ({ kind: 'keyword', text }));
    const values = entity as unknown as Record<string, unknown>;

    for (const arg of descriptor.args) {
        const value = values[arg.name];
        if (
            arg.optional &&
            (value === undefined || value === null || value === '')
        ) {
            continue;
        }
        const text = String(value);
        tokens.push({
            kind: tokenKind(arg.kind),
            text: arg.kind === 'text' ? displayText(text) : text,
        });
    }

    return tokens;
}

/** Split a condition's canonical `.dlg` form into semantic tokens. */
export function conditionTokens(condition: Condition): DlgToken[] {
    return descriptorTokens(condition, conditionDescriptor(condition.type));
}

/** Split an effect's canonical `.dlg` form into semantic tokens. */
export function effectTokens(effect: Effect): DlgToken[] {
    return descriptorTokens(effect, effectDescriptor(effect.type));
}

/** Serialize a condition to its `.dlg` form (e.g. `hasFlag metBartender`). */
export function serializeCondition(condition: Condition): string {
    return conditionTokens(condition)
        .map((token) => token.text)
        .join(' ');
}

/** Serialize an effect to its `.dlg` form (e.g. `SET flag metBartender`). */
export function serializeEffect(effect: Effect): string {
    return effectTokens(effect)
        .map((token) => token.text)
        .join(' ');
}

/**
 * Serialize an effect list, re-sugaring `GOTO location` (which the parser
 * desugars into goToLocation + endDialogue) back to one line.
 */
function effectLines(effects: Effect[] | undefined, indent: string): string[] {
    const lines: string[] = [];
    const list = effects ?? [];
    for (let i = 0; i < list.length; i++) {
        const effect = list[i];
        if (
            effect.type === 'goToLocation' &&
            list[i + 1]?.type === 'endDialogue'
        ) {
            lines.push(`${indent}GOTO location ${effect.locationId}`);
            i++; // consume the paired endDialogue
        } else {
            lines.push(indent + serializeEffect(effect));
        }
    }
    return lines;
}

function branchLines(branch: ConditionalBranch): string[] {
    const lines = [`${INDENT}IF ${serializeCondition(branch.condition)}`];
    lines.push(...effectLines(branch.effects, INDENT + INDENT));
    if (branch.next) lines.push(`${INDENT + INDENT}GOTO ${branch.next}`);
    lines.push(`${INDENT}END`);
    return lines;
}

function choiceLines(choice: Choice): string[] {
    const lines = [`${INDENT}CHOICE ${displayText(choice.text)}`];
    for (const condition of choice.conditions ?? []) {
        lines.push(
            `${INDENT + INDENT}REQUIRE ${serializeCondition(condition)}`
        );
    }
    lines.push(...effectLines(choice.effects, INDENT + INDENT));

    // A choice that terminates via an effect (END dialogue / GOTO location /
    // START dialogue) has no GOTO of its own.
    const terminates = choice.effects?.some(
        (e) =>
            e.type === 'endDialogue' ||
            e.type === 'goToLocation' ||
            e.type === 'startDialogue'
    );
    if (choice.next && !terminates) {
        lines.push(`${INDENT + INDENT}GOTO ${choice.next}`);
    }
    lines.push(`${INDENT}END`);
    return lines;
}

/** Serialize a single node to its `.dlg` text (no trailing newline). */
export function serializeNode(node: DialogueNode): string {
    const lines = [`NODE ${node.id}`];

    if (node.text) {
        const who =
            node.speaker === null ? 'NARRATOR' : node.speaker.toUpperCase();
        const text = displayText(node.text).replace(/\n/g, `\n${INDENT}`);
        lines.push(`${INDENT}${who}: ${text}`);
    }
    if (node.voice) lines.push(`${INDENT}VOICE ${node.voice}`);
    if (node.portrait) lines.push(`${INDENT}PORTRAIT ${node.portrait}`);

    lines.push(...effectLines(node.effects, INDENT));

    for (const branch of node.conditionalBranches ?? []) {
        lines.push(...branchLines(branch));
    }
    for (const choice of node.choices) {
        lines.push(...choiceLines(choice));
    }
    if (node.next) lines.push(`${INDENT}GOTO ${node.next}`);

    return lines.join('\n');
}

/** Serialize a whole dialogue to `.dlg` text (used for new files). */
export function serializeDialogue(dialogue: Dialogue): string {
    const header: string[] = [];
    if (dialogue.triggerLocation) {
        header.push(`TRIGGER ${dialogue.triggerLocation}`);
    }
    for (const condition of dialogue.conditions ?? []) {
        header.push(`REQUIRE ${serializeCondition(condition)}`);
    }

    const blocks = dialogue.nodes.map(serializeNode);
    const parts = header.length > 0 ? [header.join('\n'), ...blocks] : blocks;
    return parts.join('\n\n') + '\n';
}
