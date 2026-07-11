/**
 * The builders must produce entities that match the engine and source lines
 * that the engine parses. These tests are the parity gate for Phase 7: build
 * every condition/effect type from an empty draft filled with sample values,
 * and confirm the entity type and the generated source agree with the engine.
 */

import { describe, it, expect } from 'vitest';
import {
    CONDITION_DESCRIPTORS,
    EFFECT_DESCRIPTORS,
    parseCondition,
    parseEffect,
    type ArgDescriptor,
} from '@doodle-engine/core';
import {
    buildCondition,
    buildEffect,
    conditionToDraft,
    effectToDraft,
    draftToSource,
    emptyDraft,
} from '../builder';

// A representative value per argument kind.
const sample: Record<string, string> = {
    flag: 'metBartender',
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
    number: '4',
    value: '5',
    hours: '2',
    boolean: 'true',
    text: 'thing.ogg',
};

function fill(descriptor: { args: ArgDescriptor[]; type: string }): {
    type: string;
    values: Record<string, string>;
} {
    const draft = emptyDraft(descriptor as never);
    for (const arg of descriptor.args)
        draft.values[arg.name] = sample[arg.kind];
    return draft;
}

describe('condition builder', () => {
    it('builds every condition type to a matching entity and source line', () => {
        for (const descriptor of CONDITION_DESCRIPTORS) {
            const draft = fill(descriptor);
            const result = buildCondition(draft, false);
            expect(result.ok, `${descriptor.type}: ${result.error}`).toBe(true);
            expect(result.value?.type).toBe(descriptor.type);
            // The preview line is exactly what the engine parses.
            const source = draftToSource(draft, descriptor);
            expect(parseCondition(source).type).toBe(descriptor.type);
        }
    });

    it('rejects roll as a requirement (matches the parser)', () => {
        const roll = CONDITION_DESCRIPTORS.find((d) => d.type === 'roll')!;
        const draft = fill(roll);
        expect(buildCondition(draft, true).ok).toBe(false);
        // But roll is fine as a plain condition (IF branch).
        expect(buildCondition(draft, false).ok).toBe(true);
    });

    it('reports a missing required argument', () => {
        const hasFlag = CONDITION_DESCRIPTORS.find(
            (d) => d.type === 'hasFlag'
        )!;
        const draft = emptyDraft(hasFlag);
        const result = buildCondition(draft, false);
        expect(result.ok).toBe(false);
        expect(result.error).toContain('required');
    });

    it('round-trips an existing condition through a draft', () => {
        const condition = parseCondition('questAtStage odd_jobs started');
        const draft = conditionToDraft(condition);
        expect(draft.values).toEqual({
            questId: 'odd_jobs',
            stageId: 'started',
        });
        expect(buildCondition(draft, false).value).toEqual(condition);
    });
});

describe('effect builder', () => {
    it('builds every effect type to a matching entity and source line', () => {
        for (const descriptor of EFFECT_DESCRIPTORS) {
            const draft = fill(descriptor);
            const result = buildEffect(draft);
            expect(result.ok, `${descriptor.type}: ${result.error}`).toBe(true);
            expect(result.value?.type).toBe(descriptor.type);
            const source = draftToSource(draft, descriptor);
            expect(parseEffect(source).type).toBe(descriptor.type);
        }
    });

    it('builds endDialogue with no arguments', () => {
        const end = EFFECT_DESCRIPTORS.find((d) => d.type === 'endDialogue')!;
        const result = buildEffect(emptyDraft(end));
        expect(result.ok).toBe(true);
        expect(result.value).toEqual({ type: 'endDialogue' });
    });

    it('lets playMusic omit its optional track', () => {
        const music = EFFECT_DESCRIPTORS.find((d) => d.type === 'playMusic')!;
        const draft = emptyDraft(music); // track empty
        const result = buildEffect(draft);
        expect(result.ok).toBe(true);
        expect(result.value?.type).toBe('playMusic');
    });

    it('round-trips an existing effect through a draft', () => {
        const effect = parseEffect('ADD variable gold -5');
        const draft = effectToDraft(effect);
        expect(draft.values).toEqual({ variable: 'gold', value: '-5' });
        expect(buildEffect(draft).value).toEqual(effect);
    });
});
