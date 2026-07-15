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

const INDENT = '  ';

/** Display text for a speaker/choice/notify line: @keys and plain words pass
 * through; text containing '#' or '"' is wrapped in quotes so it isn't read
 * as a comment, with backslashes and double quotes escaped so the parser
 * reads back exactly the same text. */
function displayText(text: string): string {
    if (text.startsWith('@')) return text;
    if (text.includes('#') || text.includes('"')) {
        return `"${text.replace(/[\\"]/g, (ch) => '\\' + ch)}"`;
    }
    return text;
}

/** Serialize a condition to its `.dlg` form (e.g. `hasFlag metBartender`). */
export function serializeCondition(condition: Condition): string {
    switch (condition.type) {
        case 'hasFlag':
            return `hasFlag ${condition.flag}`;
        case 'notFlag':
            return `notFlag ${condition.flag}`;
        case 'hasItem':
            return `hasItem ${condition.itemId}`;
        case 'variableEquals':
            return `variableEquals ${condition.variable} ${condition.value}`;
        case 'variableGreaterThan':
            return `variableGreaterThan ${condition.variable} ${condition.value}`;
        case 'variableLessThan':
            return `variableLessThan ${condition.variable} ${condition.value}`;
        case 'atLocation':
            return `atLocation ${condition.locationId}`;
        case 'questAtStage':
            return `questAtStage ${condition.questId} ${condition.stageId}`;
        case 'characterAt':
            return `characterAt ${condition.characterId} ${condition.locationId}`;
        case 'characterInParty':
            return `characterInParty ${condition.characterId}`;
        case 'relationshipAbove':
            return `relationshipAbove ${condition.characterId} ${condition.value}`;
        case 'relationshipBelow':
            return `relationshipBelow ${condition.characterId} ${condition.value}`;
        case 'timeIs':
            return `timeIs ${condition.startHour} ${condition.endHour}`;
        case 'itemAt':
            return `itemAt ${condition.itemId} ${condition.locationId}`;
        case 'roll':
            return `roll ${condition.min} ${condition.max} ${condition.threshold}`;
    }
}

/** Serialize an effect to its `.dlg` form (e.g. `SET flag metBartender`). */
export function serializeEffect(effect: Effect): string {
    switch (effect.type) {
        case 'setFlag':
            return `SET flag ${effect.flag}`;
        case 'clearFlag':
            return `CLEAR flag ${effect.flag}`;
        case 'setVariable':
            return `SET variable ${effect.variable} ${effect.value}`;
        case 'addVariable':
            return `ADD variable ${effect.variable} ${effect.value}`;
        case 'addItem':
            return `ADD item ${effect.itemId}`;
        case 'removeItem':
            return `REMOVE item ${effect.itemId}`;
        case 'moveItem':
            return `MOVE item ${effect.itemId} ${effect.locationId}`;
        case 'goToLocation':
            return `GOTO location ${effect.locationId}`;
        case 'advanceTime':
            return `ADVANCE time ${effect.hours}`;
        case 'setQuestStage':
            return `SET questStage ${effect.questId} ${effect.stageId}`;
        case 'addJournalEntry':
            return `ADD journalEntry ${effect.entryId}`;
        case 'startDialogue':
            return `START dialogue ${effect.dialogueId}`;
        case 'endDialogue':
            return `END dialogue`;
        case 'setCharacterLocation':
            return `SET characterLocation ${effect.characterId} ${effect.locationId}`;
        case 'addToParty':
            return `ADD toParty ${effect.characterId}`;
        case 'removeFromParty':
            return `REMOVE fromParty ${effect.characterId}`;
        case 'setRelationship':
            return `SET relationship ${effect.characterId} ${effect.value}`;
        case 'addRelationship':
            return `ADD relationship ${effect.characterId} ${effect.value}`;
        case 'setCharacterStat':
            return `SET characterStat ${effect.characterId} ${effect.stat} ${effect.value}`;
        case 'addCharacterStat':
            return `ADD characterStat ${effect.characterId} ${effect.stat} ${effect.value}`;
        case 'setMapEnabled':
            return `SET mapEnabled ${effect.enabled}`;
        case 'playMusic':
            return effect.track ? `MUSIC ${effect.track}` : `MUSIC`;
        case 'playSound':
            return `SOUND ${effect.sound}`;
        case 'notify':
            return `NOTIFY ${displayText(effect.message)}`;
        case 'playVideo':
            return `VIDEO ${effect.file}`;
        case 'showInterlude':
            return `INTERLUDE ${effect.interludeId}`;
        case 'roll':
            return `ROLL ${effect.variable} ${effect.min} ${effect.max}`;
    }
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
        lines.push(`${INDENT + INDENT}REQUIRE ${serializeCondition(condition)}`);
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
        lines.push(`${INDENT}${who}: ${displayText(node.text)}`);
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
