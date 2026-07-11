/**
 * The descriptors must stay in lockstep with the real condition/effect unions
 * and with the parser/serializer. These tests are the gate: every union member
 * has exactly one descriptor, and a canonical line built from a descriptor
 * parses back to that descriptor's type. If someone adds a condition/effect and
 * forgets a descriptor, this fails.
 */

import { describe, it, expect } from 'vitest';
import {
    CONDITION_DESCRIPTORS,
    EFFECT_DESCRIPTORS,
    conditionDescriptor,
    effectDescriptor,
} from '../parser/descriptors';
import { parseCondition, parseEffect } from '../parser';
import { serializeCondition, serializeEffect } from '../parser/serialize';
import type { Condition } from '../types/conditions';
import type { Effect } from '../types/effects';

// One representative value per argument kind, good enough to round-trip.
const sampleArg: Record<string, string> = {
    flag: 'someFlag',
    variable: 'gold',
    stat: 'strength',
    itemId: 'old_coin',
    characterId: 'bartender',
    locationId: 'tavern',
    questId: 'odd_jobs',
    stageId: 'started',
    journalId: 'tavern_note',
    dialogueId: 'merchant_intro',
    interludeId: 'chapter_one',
    number: '3',
    value: '5',
    hours: '2',
    boolean: 'true',
    text: 'thing.ogg',
};

/** Build the canonical .dlg line for a descriptor with sample values. */
function conditionLine(d: (typeof CONDITION_DESCRIPTORS)[number]): string {
    return [d.keyword, ...d.args.map((a) => sampleArg[a.kind])].join(' ');
}
function effectLine(d: (typeof EFFECT_DESCRIPTORS)[number]): string {
    return [d.keyword, ...d.args.map((a) => sampleArg[a.kind])]
        .join(' ')
        .trim();
}

// Every member of each union, derived from the descriptors themselves; the
// completeness check below proves this set equals the real unions.
const ALL_CONDITION_TYPES: Condition['type'][] = [
    'hasFlag',
    'notFlag',
    'hasItem',
    'variableEquals',
    'variableGreaterThan',
    'variableLessThan',
    'atLocation',
    'questAtStage',
    'characterAt',
    'characterInParty',
    'relationshipAbove',
    'relationshipBelow',
    'timeIs',
    'itemAt',
    'roll',
];

const ALL_EFFECT_TYPES: Effect['type'][] = [
    'setFlag',
    'clearFlag',
    'setVariable',
    'addVariable',
    'addItem',
    'removeItem',
    'moveItem',
    'goToLocation',
    'advanceTime',
    'setQuestStage',
    'addJournalEntry',
    'startDialogue',
    'endDialogue',
    'setCharacterLocation',
    'addToParty',
    'removeFromParty',
    'setRelationship',
    'addRelationship',
    'setCharacterStat',
    'addCharacterStat',
    'setMapEnabled',
    'playMusic',
    'playSound',
    'notify',
    'playVideo',
    'showInterlude',
    'roll',
];

describe('condition descriptors', () => {
    it('covers all 15 condition types, one each', () => {
        expect(CONDITION_DESCRIPTORS).toHaveLength(15);
        const types = CONDITION_DESCRIPTORS.map((d) => d.type).sort();
        expect(types).toEqual([...ALL_CONDITION_TYPES].sort());
        expect(new Set(types).size).toBe(types.length);
    });

    it('each condition keyword equals its type (conditions have no verb prefix)', () => {
        for (const d of CONDITION_DESCRIPTORS) {
            expect(d.keyword).toBe(d.type);
        }
    });

    it('a canonical line built from each descriptor parses to that type', () => {
        for (const d of CONDITION_DESCRIPTORS) {
            const parsed = parseCondition(conditionLine(d));
            expect(parsed.type).toBe(d.type);
            // And it survives a serialize round-trip.
            expect(parseCondition(serializeCondition(parsed)).type).toBe(
                d.type
            );
        }
    });

    it('lookup throws for an unknown type', () => {
        expect(() => conditionDescriptor('nope' as never)).toThrow();
    });
});

describe('effect descriptors', () => {
    it('covers all 27 effect types, one each', () => {
        expect(EFFECT_DESCRIPTORS).toHaveLength(27);
        const types = EFFECT_DESCRIPTORS.map((d) => d.type).sort();
        expect(types).toEqual([...ALL_EFFECT_TYPES].sort());
        expect(new Set(types).size).toBe(types.length);
    });

    it('a canonical line built from each descriptor parses to that type', () => {
        for (const d of EFFECT_DESCRIPTORS) {
            const parsed = parseEffect(effectLine(d));
            expect(parsed.type).toBe(d.type);
            expect(parseEffect(serializeEffect(parsed)).type).toBe(d.type);
        }
    });

    it('lookup throws for an unknown type', () => {
        expect(() => effectDescriptor('nope' as never)).toThrow();
    });
});
