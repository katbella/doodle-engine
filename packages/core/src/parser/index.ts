/**
 * Dialogue DSL Parser
 *
 * Parses .dlg files written in the custom DSL syntax into Dialogue entities.
 * Supports:
 * - Structure keywords: NODE, END, GOTO, TRIGGER, REQUIRE
 * - Dialogue keywords: SPEAKER:, NARRATOR:, VOICE
 * - Choice blocks with conditions and effects
 * - Conditional blocks (IF/END)
 * - All 15 condition types
 * - All 27 effect types
 * - @localization keys and "inline text"
 */

import type {
    Dialogue,
    DialogueNode,
    ConditionalBranch,
    Choice,
} from '../types/entities';
import type { Condition } from '../types/conditions';
import type { Effect } from '../types/effects';
import { findUnescapedQuote, splitComment } from './comment';

/**
 * Token represents a line of DSL code with metadata
 */
interface Token {
    line: string;
    lineNumber: number;
    indent: number;
}

/**
 * Leading keywords that start an effect line. Used so that keyword detection
 * takes precedence over the generic "line contains ':' → speaker line" rule.
 * GOTO is intentionally excluded: it is routing, handled separately by node and
 * choice parsing. NOTIFY is included so a NOTIFY whose text contains ':' is
 * still parsed as an effect rather than mistaken for a speaker line.
 */
const EFFECT_KEYWORDS = new Set([
    'SET',
    'CLEAR',
    'ADD',
    'REMOVE',
    'MOVE',
    'ADVANCE',
    'START',
    'END',
    'MUSIC',
    'SOUND',
    'VIDEO',
    'INTERLUDE',
    'NOTIFY',
    'ROLL',
]);

/**
 * True if a line begins with a recognized effect keyword.
 */
function isEffectLine(line: string): boolean {
    return EFFECT_KEYWORDS.has(line.split(/\s+/)[0]);
}

/**
 * Tokenize input string into processable tokens
 * - Removes comments (anything after #)
 * - Removes blank lines
 * - Tracks line numbers for error reporting
 * - Tracks indentation for nested structures
 */
function tokenize(input: string): Token[] {
    const physicalLines = input.replace(/\r\n?/g, '\n').split('\n');
    const tokens: Token[] = [];

    for (let i = 0; i < physicalLines.length; i++) {
        const original = physicalLines[i];
        const lineNumber = i + 1;
        const { code: withoutComment } = splitComment(original);
        const indent =
            withoutComment.length - withoutComment.trimStart().length;
        let line = withoutComment.trim();
        if (line.length === 0) continue;

        const openingQuote = findUnescapedQuote(line);
        if (
            openingQuote !== -1 &&
            findUnescapedQuote(line, openingQuote + 1) === -1
        ) {
            const parts = [line];
            let closed = false;

            while (++i < physicalLines.length) {
                const continuation = stripIndent(physicalLines[i], indent);
                const closingQuote = findUnescapedQuote(continuation);
                if (closingQuote === -1) {
                    parts.push(continuation);
                    continue;
                }

                const afterQuote = continuation
                    .substring(closingQuote + 1)
                    .trim();
                if (afterQuote !== '' && !afterQuote.startsWith('#')) {
                    throw new Error(
                        `Unexpected text after closing quote at line ${i + 1}: ${afterQuote}`
                    );
                }
                parts.push(continuation.substring(0, closingQuote + 1));
                closed = true;
                break;
            }

            if (!closed) {
                throw new Error(
                    `Unterminated quoted text starting at line ${lineNumber}`
                );
            }
            line = parts.join('\n');
        }

        tokens.push({ line, lineNumber, indent });
    }

    return tokens;
}

function stripIndent(line: string, width: number): string {
    let offset = 0;
    while (
        offset < line.length &&
        offset < width &&
        (line[offset] === ' ' || line[offset] === '\t')
    ) {
        offset++;
    }
    return line.substring(offset);
}

/**
 * Parse text that may be a localization key or inline text
 * - @key -> returns "@key" (localization reference, resolved at snapshot time)
 * - "text" -> returns "text" (inline literal, quotes stripped; \" and \\
 *   inside the quotes stand for a double quote and a backslash)
 * - text -> returns "text" (plain text)
 */
function parseText(text: string): string {
    const trimmed = text.trim();

    // Localization key - keep as-is with @ prefix
    // Will be resolved to actual text by snapshot builder
    if (trimmed.startsWith('@')) {
        return trimmed;
    }

    // Quoted inline text - strip quotes and resolve escapes
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed
            .substring(1, trimmed.length - 1)
            .replace(/\\(["\\])/g, '$1');
    }

    // Plain text (shouldn't normally happen in well-formed DSL, but handle it)
    return trimmed;
}

/**
 * Parse a condition string into a Condition object
 * Examples:
 *   "hasFlag metBartender" -> { type: 'hasFlag', flag: 'metBartender' }
 *   "variableGreaterThan gold 10" -> { type: 'variableGreaterThan', variable: 'gold', value: 10 }
 */
export function parseCondition(conditionStr: string): Condition {
    const parts = conditionStr.trim().split(/\s+/);
    const type = parts[0];

    // Quotes are for dialogue/choice display text only. Condition arguments are
    // plain tokens (flag names, IDs, numbers, single-token values).
    if (parts.some((part) => part.includes('"'))) {
        throw new Error(
            `Quotes are not allowed in condition "${type}" arguments. Quotes are only for dialogue and choice text; use a plain value or a @locale key.`
        );
    }

    switch (type) {
        case 'hasFlag':
            return { type: 'hasFlag', flag: parts[1] };
        case 'notFlag':
            return { type: 'notFlag', flag: parts[1] };
        case 'hasItem':
            return { type: 'hasItem', itemId: parts[1] };
        case 'variableEquals':
            if (parts.length > 3) {
                throw new Error(
                    `Condition "variableEquals" takes a single value; multi-word values are not supported. Use a single token or a @locale key.`
                );
            }
            return {
                type: 'variableEquals',
                variable: parts[1],
                value: isNaN(Number(parts[2])) ? parts[2] : Number(parts[2]),
            };
        case 'variableGreaterThan':
            return {
                type: 'variableGreaterThan',
                variable: parts[1],
                value: Number(parts[2]),
            };
        case 'variableLessThan':
            return {
                type: 'variableLessThan',
                variable: parts[1],
                value: Number(parts[2]),
            };
        case 'atLocation':
            return { type: 'atLocation', locationId: parts[1] };
        case 'questAtStage':
            return {
                type: 'questAtStage',
                questId: parts[1],
                stageId: parts[2],
            };
        case 'characterAt':
            return {
                type: 'characterAt',
                characterId: parts[1],
                locationId: parts[2],
            };
        case 'characterInParty':
            return { type: 'characterInParty', characterId: parts[1] };
        case 'relationshipAbove':
            return {
                type: 'relationshipAbove',
                characterId: parts[1],
                value: Number(parts[2]),
            };
        case 'relationshipBelow':
            return {
                type: 'relationshipBelow',
                characterId: parts[1],
                value: Number(parts[2]),
            };
        case 'timeIs':
            return {
                type: 'timeIs',
                startHour: Number(parts[1]),
                endHour: Number(parts[2]),
            };
        case 'itemAt':
            return { type: 'itemAt', itemId: parts[1], locationId: parts[2] };
        case 'roll':
            return {
                type: 'roll',
                min: Number(parts[1]),
                max: Number(parts[2]),
                threshold: Number(parts[3]),
            };
        default:
            throw new Error(`Unknown condition type: ${type}`);
    }
}

/**
 * Parse an effect string into an Effect object
 * Examples:
 *   "SET flag metBartender" -> { type: 'setFlag', flag: 'metBartender' }
 *   "ADD variable gold -50" -> { type: 'addVariable', variable: 'gold', value: -50 }
 *   "NOTIFY @quest.started" -> { type: 'notify', message: '@quest.started' }
 */
export function parseEffect(effectStr: string): Effect {
    const trimmed = effectStr.trim();

    // NOTIFY is the one effect that takes display text, so it may be quoted.
    if (trimmed.startsWith('NOTIFY ')) {
        return { type: 'notify', message: parseText(trimmed.substring(7)) };
    }

    // Every other effect takes plain, unquoted tokens (filenames, IDs, numbers,
    // values). Quotes are only for dialogue/choice text and NOTIFY.
    if (trimmed.includes('"')) {
        throw new Error(
            `Quotes are not allowed in "${trimmed.split(/\s+/)[0]}" arguments. Quotes are only for dialogue/choice text and NOTIFY; use a plain value or a @locale key.`
        );
    }

    if (trimmed === 'MUSIC') {
        return { type: 'playMusic', track: '' };
    }
    if (trimmed.startsWith('MUSIC ')) {
        return { type: 'playMusic', track: trimmed.substring(6).trim() };
    }
    if (trimmed.startsWith('SOUND ')) {
        return { type: 'playSound', sound: trimmed.substring(6).trim() };
    }
    if (trimmed.startsWith('VIDEO ')) {
        return { type: 'playVideo', file: trimmed.substring(6).trim() };
    }
    if (trimmed.startsWith('INTERLUDE ')) {
        return {
            type: 'showInterlude',
            interludeId: trimmed.substring(10).trim(),
        };
    }
    if (trimmed.startsWith('ROLL ')) {
        const parts = trimmed.split(/\s+/);
        return {
            type: 'roll',
            variable: parts[1],
            min: Number(parts[2]),
            max: Number(parts[3]),
        };
    }

    const parts = trimmed.split(/\s+/);
    const keyword = parts[0];

    switch (keyword) {
        case 'SET':
            if (parts[1] === 'flag') {
                return { type: 'setFlag', flag: parts[2] };
            }
            if (parts[1] === 'variable') {
                if (parts.length > 4) {
                    throw new Error(
                        `"SET variable" takes a single value; multi-word values are not supported. Use a single token or a @locale key.`
                    );
                }
                return {
                    type: 'setVariable',
                    variable: parts[2],
                    value: isNaN(Number(parts[3]))
                        ? parts[3]
                        : Number(parts[3]),
                };
            }
            if (parts[1] === 'questStage') {
                return {
                    type: 'setQuestStage',
                    questId: parts[2],
                    stageId: parts[3],
                };
            }
            if (parts[1] === 'characterLocation') {
                return {
                    type: 'setCharacterLocation',
                    characterId: parts[2],
                    locationId: parts[3],
                };
            }
            if (parts[1] === 'relationship') {
                return {
                    type: 'setRelationship',
                    characterId: parts[2],
                    value: Number(parts[3]),
                };
            }
            if (parts[1] === 'characterStat') {
                if (parts.length > 5) {
                    throw new Error(
                        `"SET characterStat" takes a single value; multi-word values are not supported. Use a single token or a @locale key.`
                    );
                }
                return {
                    type: 'setCharacterStat',
                    characterId: parts[2],
                    stat: parts[3],
                    value: isNaN(Number(parts[4]))
                        ? parts[4]
                        : Number(parts[4]),
                };
            }
            if (parts[1] === 'mapEnabled') {
                return { type: 'setMapEnabled', enabled: parts[2] === 'true' };
            }
            throw new Error(`Unknown SET effect: ${parts[1]}`);

        case 'CLEAR':
            if (parts[1] === 'flag') {
                return { type: 'clearFlag', flag: parts[2] };
            }
            throw new Error(`Unknown CLEAR effect: ${parts[1]}`);

        case 'ADD':
            if (parts[1] === 'variable') {
                return {
                    type: 'addVariable',
                    variable: parts[2],
                    value: Number(parts[3]),
                };
            }
            if (parts[1] === 'item') {
                return { type: 'addItem', itemId: parts[2] };
            }
            if (parts[1] === 'journalEntry') {
                return { type: 'addJournalEntry', entryId: parts[2] };
            }
            if (parts[1] === 'toParty') {
                return { type: 'addToParty', characterId: parts[2] };
            }
            if (parts[1] === 'relationship') {
                return {
                    type: 'addRelationship',
                    characterId: parts[2],
                    value: Number(parts[3]),
                };
            }
            if (parts[1] === 'characterStat') {
                return {
                    type: 'addCharacterStat',
                    characterId: parts[2],
                    stat: parts[3],
                    value: Number(parts[4]),
                };
            }
            throw new Error(`Unknown ADD effect: ${parts[1]}`);

        case 'REMOVE':
            if (parts[1] === 'item') {
                return { type: 'removeItem', itemId: parts[2] };
            }
            if (parts[1] === 'fromParty') {
                return { type: 'removeFromParty', characterId: parts[2] };
            }
            throw new Error(`Unknown REMOVE effect: ${parts[1]}`);

        case 'MOVE':
            if (parts[1] === 'item') {
                return {
                    type: 'moveItem',
                    itemId: parts[2],
                    locationId: parts[3],
                };
            }
            throw new Error(`Unknown MOVE effect: ${parts[1]}`);

        case 'GOTO':
            if (parts[1] === 'location') {
                return { type: 'goToLocation', locationId: parts[2] };
            }
            throw new Error('GOTO should not be parsed as an effect');

        case 'ADVANCE':
            if (parts[1] === 'time') {
                return { type: 'advanceTime', hours: Number(parts[2]) };
            }
            throw new Error(`Unknown ADVANCE effect: ${parts[1]}`);

        case 'START':
            if (parts[1] === 'dialogue') {
                return { type: 'startDialogue', dialogueId: parts[2] };
            }
            throw new Error(`Unknown START effect: ${parts[1]}`);

        case 'END':
            if (parts[1] === 'dialogue') {
                return { type: 'endDialogue' };
            }
            throw new Error('END should not be parsed as an effect');

        default:
            throw new Error(`Unknown effect keyword: ${keyword}`);
    }
}

interface ChoiceParseResult {
    choice: Choice;
    nextIndex: number;
}

/**
 * Parse a CHOICE block
 * Syntax:
 *   CHOICE text
 *     REQUIRE condition (optional, multiple)
 *     effects
 *     speaker lines
 *     GOTO target or END dialogue
 *   END
 */
function parseChoice(
    tokens: Token[],
    startIndex: number,
    nodeId: string,
    choiceIndex: number
): ChoiceParseResult {
    const token = tokens[startIndex];
    const choiceText = parseText(token.line.substring(7)); // Remove "CHOICE " and parse text

    const conditions: Condition[] = [];
    const effects: Effect[] = [];
    let next = '';

    let i = startIndex + 1;
    const baseIndent = token.indent;

    while (i < tokens.length) {
        const current = tokens[i];

        // Check for END at same indent level
        if (current.line === 'END' && current.indent === baseIndent) {
            i++;
            break;
        }

        if (current.line.startsWith('REQUIRE ')) {
            const conditionStr = current.line.substring(8).trim();
            const condition = parseCondition(conditionStr);
            // A requirement decides whether the choice is shown, and it is
            // checked again when the choice is clicked. A roll is random, so
            // those two checks can disagree and a shown choice can do nothing.
            // Roll on click instead: route the choice to a node with ROLL + IF.
            if (condition.type === 'roll') {
                throw new Error(
                    `Choice in node "${nodeId}" (line ${current.lineNumber}) uses "roll" in a REQUIRE. A choice cannot roll in its requirement. To roll when the player clicks, send the choice to a NODE that uses ROLL and IF.`
                );
            }
            conditions.push(condition);
            i++;
        } else if (current.line.startsWith('GOTO ')) {
            const gotoTarget = current.line.substring(5).trim();
            if (gotoTarget.startsWith('location ')) {
                // GOTO location ends dialogue and travels
                const locationId = gotoTarget.substring(9).trim();
                effects.push({ type: 'goToLocation', locationId });
                effects.push({ type: 'endDialogue' });
                next = ''; // No next node, dialogue ends
            } else {
                next = gotoTarget;
            }
            i++;
        } else if (isEffectLine(current.line)) {
            // Effect keyword takes precedence over the ':' speaker heuristic, so a
            // NOTIFY (or other effect) whose text contains ':' still parses.
            effects.push(parseEffect(current.line));
            i++;
        } else if (current.line.includes(':')) {
            // A choice holds button text, conditions, effects, and a route only.
            // A spoken line here is invalid; the author must move it to a node.
            throw new Error(
                `Choice in node "${nodeId}" (line ${current.lineNumber}) contains a spoken line. Choices cannot contain spoken lines; put the line in its own NODE and route the choice there with GOTO.`
            );
        } else {
            // Must be an effect
            effects.push(parseEffect(current.line));
            i++;
        }
    }

    // Generate a choice ID that is unique within the node. The index guarantees
    // uniqueness even when two choices sanitize to the same text; the sanitized
    // text is kept only as a human-readable hint.
    const sanitized = choiceText
        .replace(/[@"]/g, '')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .substring(0, 30)
        .replace(/^_+|_+$/g, '');
    const choiceId = sanitized
        ? `${nodeId}_choice_${choiceIndex}_${sanitized}`
        : `${nodeId}_choice_${choiceIndex}`;

    const choice: Choice = {
        id: choiceId,
        text: choiceText,
        conditions: conditions.length > 0 ? conditions : undefined,
        effects: effects.length > 0 ? effects : undefined,
        next: next || '',
    };

    return { choice, nextIndex: i };
}

interface IfBlockParseResult {
    condition: Condition;
    next?: string;
    effects: Effect[];
    nextIndex: number;
}

/**
 * Parse an IF block
 * Syntax:
 *   IF condition
 *     effects
 *     GOTO target
 *   END
 */
function parseIfBlock(tokens: Token[], startIndex: number): IfBlockParseResult {
    const token = tokens[startIndex];
    const conditionStr = token.line.substring(3).trim(); // Remove "IF "
    const condition = parseCondition(conditionStr);

    let next: string | undefined;
    const effects: Effect[] = [];
    let i = startIndex + 1;
    const baseIndent = token.indent;

    while (i < tokens.length) {
        const current = tokens[i];

        // Check for END at same indent level
        if (current.line === 'END' && current.indent === baseIndent) {
            i++;
            break;
        }

        if (current.line.startsWith('GOTO ')) {
            const gotoTarget = current.line.substring(5).trim();
            if (gotoTarget.startsWith('location ')) {
                const locationId = gotoTarget.substring(9).trim();
                effects.push({ type: 'goToLocation', locationId });
                effects.push({ type: 'endDialogue' });
            } else {
                next = gotoTarget;
            }
            i++;
        } else {
            effects.push(parseEffect(current.line));
            i++;
        }
    }

    return { condition, next, effects, nextIndex: i };
}

interface NodeParseResult {
    node: DialogueNode;
    nextIndex: number;
}

/**
 * Parse a NODE block
 * Syntax:
 *   NODE nodeId
 *     SPEAKER: text
 *       VOICE file.ogg
 *     effects
 *     IF blocks
 *     CHOICE blocks
 */
function parseNode(tokens: Token[], startIndex: number): NodeParseResult {
    const token = tokens[startIndex];
    const nodeId = token.line.substring(5).trim(); // Remove "NODE "

    let speaker: string | null = null;
    let text = '';
    let voice: string | undefined;
    let portrait: string | undefined;
    let sawSpeaker = false;
    const conditions: Condition[] = [];
    const choices: Choice[] = [];
    const effects: Effect[] = [];
    let next: string | undefined;
    const conditionalBranches: ConditionalBranch[] = [];

    let i = startIndex + 1;

    while (i < tokens.length) {
        const current = tokens[i];

        // Check if we've reached the next node
        if (current.line.startsWith('NODE ')) {
            break;
        }

        // Structural and effect keywords are checked before the generic
        // "line contains ':' → speaker line" rule, so a CHOICE/IF/GOTO/PORTRAIT
        // or effect line whose text contains ':' is not mistaken for a speaker.
        if (current.line.startsWith('VOICE ')) {
            voice = current.line.substring(6).trim();
            i++;
        } else if (current.line.startsWith('PORTRAIT ')) {
            portrait = current.line.substring(9).trim();
            i++;
        } else if (current.line.startsWith('CHOICE ')) {
            const choiceResult = parseChoice(tokens, i, nodeId, choices.length);
            choices.push(choiceResult.choice);
            i = choiceResult.nextIndex;
        } else if (current.line.startsWith('IF ')) {
            const ifResult = parseIfBlock(tokens, i);
            conditionalBranches.push({
                condition: ifResult.condition,
                effects:
                    ifResult.effects.length > 0 ? ifResult.effects : undefined,
                next: ifResult.next,
            });
            i = ifResult.nextIndex;
        } else if (current.line.startsWith('GOTO ')) {
            const gotoTarget = current.line.substring(5).trim();
            if (gotoTarget.startsWith('location ')) {
                // GOTO location ends dialogue and travels
                const locationId = gotoTarget.substring(9).trim();
                effects.push({ type: 'goToLocation', locationId });
                effects.push({ type: 'endDialogue' });
            } else {
                next = gotoTarget;
            }
            i++;
        } else if (isEffectLine(current.line)) {
            // Effect keyword (incl. NOTIFY) takes precedence over the ':' rule.
            effects.push(parseEffect(current.line));
            i++;
        } else if (current.line.includes(':')) {
            // Speaker line. A node supports exactly one speaker; a second speaker
            // line is a mistake (it would silently overwrite the first), so reject
            // it and point the author at routing to another NODE.
            if (sawSpeaker) {
                throw new Error(
                    `Node "${nodeId}" (line ${current.lineNumber}) has more than one speaker line. Each node supports a single speaker; route to another NODE to let a different character speak.`
                );
            }
            sawSpeaker = true;

            const colonIndex = current.line.indexOf(':');
            const speakerName = current.line.substring(0, colonIndex).trim();
            const speakerText = current.line.substring(colonIndex + 1).trim();

            if (speakerName === 'NARRATOR') {
                speaker = null;
            } else {
                speaker = speakerName.toLowerCase();
            }
            text = parseText(speakerText);
            i++;
        } else {
            // Must be an effect
            effects.push(parseEffect(current.line));
            i++;
        }
    }

    const node: DialogueNode = {
        id: nodeId,
        speaker,
        text,
        voice,
        portrait,
        conditions: conditions.length > 0 ? conditions : undefined,
        choices,
        effects: effects.length > 0 ? effects : undefined,
        next,
    };

    // Store conditional branches if any (IF blocks)
    if (conditionalBranches.length > 0) {
        node.conditionalBranches = conditionalBranches;
    }

    return { node, nextIndex: i };
}

/**
 * Parse a complete dialogue from DSL source
 * @param input - The DSL source code
 * @param id - The dialogue ID
 * @returns A complete Dialogue entity
 */
export function parseDialogue(input: string, id: string): Dialogue {
    const tokens = tokenize(input);

    let triggerLocation: string | undefined;
    const conditions: Condition[] = [];
    const nodes: DialogueNode[] = [];
    let startNode = '';

    let i = 0;

    // Parse top-level directives
    while (i < tokens.length) {
        const token = tokens[i];

        if (token.line.startsWith('TRIGGER ')) {
            triggerLocation = token.line.substring(8).trim();
            i++;
        } else if (token.line.startsWith('REQUIRE ')) {
            const conditionStr = token.line.substring(8).trim();
            conditions.push(parseCondition(conditionStr));
            i++;
        } else if (token.line.startsWith('NODE ')) {
            // Parse node
            const nodeResult = parseNode(tokens, i);
            nodes.push(nodeResult.node);
            if (!startNode) {
                startNode = nodeResult.node.id;
            }
            i = nodeResult.nextIndex;
        } else {
            throw new Error(
                `Unexpected token at line ${token.lineNumber}: ${token.line}`
            );
        }
    }

    return {
        id,
        triggerLocation,
        conditions: conditions.length > 0 ? conditions : undefined,
        startNode,
        nodes,
    };
}
