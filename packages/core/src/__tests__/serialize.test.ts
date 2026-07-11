/**
 * Tests for the dialogue serializer.
 *
 * The guarantee that matters: serializing a parsed dialogue and parsing it again
 * yields the same dialogue. If this holds for the real starter dialogues plus
 * every condition and effect type, the visual editor can write a node back
 * without changing its meaning.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDialogue } from '../parser';
import { serializeDialogue, serializeNode } from '../parser/serialize';
import type { Condition } from '../types/conditions';
import type { Effect } from '../types/effects';

function roundTrips(source: string, id: string) {
    const original = parseDialogue(source, id);
    const reparsed = parseDialogue(serializeDialogue(original), id);
    expect(reparsed).toEqual(original);
}

describe('serializeDialogue — round-trips the starter dialogues', () => {
    const dir = join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../toolkit/src/templates/content/dialogues'
    );
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.dlg'))) {
        it(`parse → serialize → parse is stable for ${file}`, () => {
            roundTrips(readFileSync(join(dir, file), 'utf-8'), file.replace(/\.dlg$/, ''));
        });
    }
});

describe('serializeDialogue — round-trips hand-written cases', () => {
    it('handles narration, choices, IF branches, effects, GOTO location, and END', () => {
        const source = `TRIGGER tavern
REQUIRE notFlag seenIntro

NODE start
  NARRATOR: @intro
  SET flag seenIntro
  ADD variable gold -5

  IF variableGreaterThan gold 4
    SET flag rich
    GOTO rumors
  END

  CHOICE @ask
    REQUIRE notFlag heard
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE Head out.
    GOTO location market
  END

  GOTO fallback

NODE rumors
  BARTENDER: @rumors

  CHOICE Bye
    END dialogue
  END

NODE fallback
  ROLL result 1 20
  GOTO rumors
`;
        roundTrips(source, 'sample');
    });
});

describe('serializeCondition / serializeEffect — every type parses back', () => {
    const conditions: Condition[] = [
        { type: 'hasFlag', flag: 'f' },
        { type: 'notFlag', flag: 'f' },
        { type: 'hasItem', itemId: 'i' },
        { type: 'variableEquals', variable: 'v', value: 3 },
        { type: 'variableGreaterThan', variable: 'v', value: 3 },
        { type: 'variableLessThan', variable: 'v', value: 3 },
        { type: 'atLocation', locationId: 'l' },
        { type: 'questAtStage', questId: 'q', stageId: 's' },
        { type: 'characterAt', characterId: 'c', locationId: 'l' },
        { type: 'characterInParty', characterId: 'c' },
        { type: 'relationshipAbove', characterId: 'c', value: 2 },
        { type: 'relationshipBelow', characterId: 'c', value: 2 },
        { type: 'timeIs', startHour: 20, endHour: 6 },
        { type: 'itemAt', itemId: 'i', locationId: 'l' },
        { type: 'roll', min: 1, max: 20, threshold: 15 },
    ];

    const effects: Effect[] = [
        { type: 'setFlag', flag: 'f' },
        { type: 'clearFlag', flag: 'f' },
        { type: 'setVariable', variable: 'v', value: 5 },
        { type: 'addVariable', variable: 'v', value: -5 },
        { type: 'addItem', itemId: 'i' },
        { type: 'removeItem', itemId: 'i' },
        { type: 'moveItem', itemId: 'i', locationId: 'l' },
        { type: 'advanceTime', hours: 2 },
        { type: 'setQuestStage', questId: 'q', stageId: 's' },
        { type: 'addJournalEntry', entryId: 'e' },
        { type: 'startDialogue', dialogueId: 'd' },
        { type: 'setCharacterLocation', characterId: 'c', locationId: 'l' },
        { type: 'addToParty', characterId: 'c' },
        { type: 'removeFromParty', characterId: 'c' },
        { type: 'setRelationship', characterId: 'c', value: 5 },
        { type: 'addRelationship', characterId: 'c', value: 1 },
        { type: 'setCharacterStat', characterId: 'c', stat: 'hp', value: 10 },
        { type: 'addCharacterStat', characterId: 'c', stat: 'hp', value: -3 },
        { type: 'setMapEnabled', enabled: false },
        { type: 'playSound', sound: 'door.ogg' },
        { type: 'playVideo', file: 'intro.mp4' },
        { type: 'showInterlude', interludeId: 'chapter_one' },
        { type: 'roll', variable: 'r', min: 1, max: 6 },
    ];

    it('round-trips each condition inside a node', () => {
        for (const condition of conditions) {
            const node = serializeNode({
                id: 'n',
                speaker: null,
                text: '',
                choices: [],
                conditionalBranches: [{ condition, next: 'x' }],
            });
            const parsed = parseDialogue(`${node}\n\nNODE x\n  NARRATOR: @t\n`, 'd');
            expect(parsed.nodes[0].conditionalBranches?.[0].condition).toEqual(
                condition
            );
        }
    });

    it('round-trips each effect inside a node', () => {
        for (const effect of effects) {
            const node = serializeNode({
                id: 'n',
                speaker: null,
                text: '',
                choices: [],
                effects: [effect],
                next: 'x',
            });
            const parsed = parseDialogue(`${node}\n\nNODE x\n  NARRATOR: @t\n`, 'd');
            expect(parsed.nodes[0].effects?.[0]).toEqual(effect);
        }
    });
});
