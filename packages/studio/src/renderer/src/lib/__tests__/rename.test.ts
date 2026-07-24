import { describe, it, expect } from 'vitest';
import {
    parseDialogue,
    applyDialogueEdits,
    type ContentRegistry,
} from '@doodle-engine/core';
import { planRename, planFlagVariableRename } from '../rename';

/** A minimal registry with the pieces a test needs; unused collections empty. */
function registry(over: Partial<ContentRegistry>): ContentRegistry {
    return {
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
        ...over,
    };
}

describe('planRename — dialogue references', () => {
    // A dialogue that both references the character `bartender` (speaker, a
    // condition, an effect) AND mentions the word "bartender" in display text.
    const SOURCE = `NODE start
  BARTENDER: The bartender wipes the counter.
  IF characterInParty bartender
    ADD relationship bartender 1
  END
  CHOICE Ask the bartender about the bartender's brew
    GOTO start
  END
`;

    function rename(oldId: string, newId: string): string {
        const dialogue = parseDialogue(SOURCE, 'chat');
        const plan = planRename(
            registry({ dialogues: { chat: dialogue } }),
            'characters',
            oldId,
            newId
        );
        expect(plan.dialogueRewrites).toHaveLength(1);
        return applyDialogueEdits(
            SOURCE,
            'chat',
            plan.dialogueRewrites[0].dialogue
        );
    }

    it('renames the speaker and the condition/effect references', () => {
        const out = rename('bartender', 'marcus');
        expect(out).toContain('MARCUS:');
        expect(out).toContain('characterInParty marcus');
        expect(out).toContain('ADD relationship marcus 1');
    });

    it('does NOT touch the word "bartender" in display text', () => {
        const out = rename('bartender', 'marcus');
        expect(out).toContain('The bartender wipes the counter.');
        expect(out).toContain('Ask the bartender about the bartender');
        // Re-parsing shows the references moved but the prose stayed.
        const reparsed = parseDialogue(out, 'chat');
        expect(reparsed.nodes[0].speaker).toBe('marcus');
        expect(reparsed.nodes[0].text).toContain('bartender wipes');
    });

    it('leaves the dialogue unchanged when the id is not referenced', () => {
        const dialogue = parseDialogue(SOURCE, 'chat');
        const plan = planRename(
            registry({ dialogues: { chat: dialogue } }),
            'characters',
            'someone_else',
            'x'
        );
        expect(plan.dialogueRewrites).toHaveLength(0);
    });
});

describe('planRename — YAML references', () => {
    it('renames only reference keys, by entity id', () => {
        const plan = planRename(
            registry({
                locations: {
                    tavern: {
                        id: 'tavern',
                        name: 'Tavern',
                        description: '',
                        banner: '',
                        music: '',
                        ambient: '',
                    },
                },
                characters: {
                    guard: {
                        id: 'guard',
                        name: 'Guard',
                        biography: '',
                        portrait: '',
                        location: 'tavern',
                        dialogue: '',
                        stats: {},
                    },
                },
            }),
            'locations',
            'tavern',
            'inn'
        );

        expect(plan.yamlEdits).toEqual([
            {
                collection: 'characters',
                id: 'guard',
                edits: [{ path: ['location'], value: 'inn' }],
            },
        ]);
    });

    it('renames a character reference on a character.dialogue key', () => {
        const plan = planRename(
            registry({
                characters: {
                    guard: {
                        id: 'guard',
                        name: 'Guard',
                        biography: '',
                        portrait: '',
                        location: '',
                        dialogue: 'greeting',
                        stats: {},
                    },
                },
            }),
            'dialogues',
            'greeting',
            'hello'
        );
        expect(plan.yamlEdits).toEqual([
            {
                collection: 'characters',
                id: 'guard',
                edits: [{ path: ['dialogue'], value: 'hello' }],
            },
        ]);
    });
});

describe('planFlagVariableRename', () => {
    const SOURCE = `NODE start
  NARRATOR: The flag metBartender is not shown to the player.
  IF hasFlag metBartender
    SET flag metBartender
    GOTO start
  END
`;

    it('rewrites flag reads and writes but not display text', () => {
        const dialogue = parseDialogue(SOURCE, 'chat');
        const plan = planFlagVariableRename(
            registry({ dialogues: { chat: dialogue } }),
            'flag',
            'metBartender',
            'metMarcus',
            {}
        );
        expect(plan.dialogueRewrites).toHaveLength(1);
        const out = applyDialogueEdits(
            SOURCE,
            'chat',
            plan.dialogueRewrites[0].dialogue
        );
        expect(out).toContain('hasFlag metMarcus');
        expect(out).toContain('SET flag metMarcus');
        // The narration mentioning "metBartender" is untouched.
        expect(out).toContain(
            'The flag metBartender is not shown to the player.'
        );
    });

    it('moves the start-block key in game.yaml', () => {
        const plan = planFlagVariableRename(
            registry({}),
            'flag',
            'metBartender',
            'metMarcus',
            { startFlags: { metBartender: true } }
        );
        expect(plan.yamlEdits).toEqual([
            {
                collection: 'game',
                id: 'game',
                edits: [
                    { path: ['startFlags', 'metMarcus'], value: true },
                    { path: ['startFlags', 'metBartender'], value: undefined },
                ],
            },
        ]);
    });

    it('renames a variable used by conditions and effects', () => {
        const src = `NODE start
  NARRATOR: hi
  IF variableGreaterThan gold 5
    ADD variable gold -5
    GOTO start
  END
`;
        const dialogue = parseDialogue(src, 'shop');
        const plan = planFlagVariableRename(
            registry({ dialogues: { shop: dialogue } }),
            'variable',
            'gold',
            'coins',
            {}
        );
        const out = applyDialogueEdits(
            src,
            'shop',
            plan.dialogueRewrites[0].dialogue
        );
        expect(out).toContain('variableGreaterThan coins 5');
        expect(out).toContain('ADD variable coins -5');
    });
});

describe('planRename reference sites', () => {
    it('rewrites a reference that only appears in an IF condition', () => {
        const SOURCE = [
            'NODE start',
            '  NARRATOR: Checking.',
            '  IF hasItem coin',
            '    GOTO rich',
            '  END',
            '',
            'NODE rich',
            '  NARRATOR: Rich.',
            '  END dialogue',
        ].join('\n');
        const dialogue = parseDialogue(SOURCE, 'check');
        const plan = planRename(
            registry({
                dialogues: { check: dialogue },
                items: {
                    coin: {
                        id: 'coin',
                        name: 'Coin',
                        description: '',
                        location: 'inventory',
                        icon: '',
                        image: '',
                        stats: {},
                    },
                },
            }),
            'items',
            'coin',
            'gold_coin'
        );
        expect(plan.dialogueRewrites.map((r) => r.id)).toEqual(['check']);
    });

    it('rewrites a reference in a top-level REQUIRE', () => {
        const SOURCE = [
            'REQUIRE hasItem coin',
            'NODE start',
            '  NARRATOR: Gated.',
            '  END dialogue',
        ].join('\n');
        const dialogue = parseDialogue(SOURCE, 'gated');
        const plan = planRename(
            registry({ dialogues: { gated: dialogue } }),
            'items',
            'coin',
            'gold_coin'
        );
        expect(plan.dialogueRewrites).toHaveLength(1);
        const out = applyDialogueEdits(
            SOURCE,
            'gated',
            plan.dialogueRewrites[0].dialogue
        );
        expect(out).toContain('REQUIRE hasItem gold_coin');
    });

    it('plans edits for interlude trigger conditions and effects', () => {
        const plan = planRename(
            registry({
                interludes: {
                    intro: {
                        id: 'intro',
                        background: 'bg.png',
                        text: 'Chapter One',
                        triggerConditions: [
                            { type: 'hasItem', itemId: 'coin' },
                        ],
                        effects: [{ type: 'addItem', itemId: 'coin' }],
                    },
                },
            }),
            'items',
            'coin',
            'gold_coin'
        );
        expect(plan.yamlEdits).toEqual([
            {
                collection: 'interludes',
                id: 'intro',
                edits: [
                    {
                        path: ['triggerConditions', 0, 'itemId'],
                        value: 'gold_coin',
                    },
                    { path: ['effects', 0, 'itemId'], value: 'gold_coin' },
                ],
            },
        ]);
    });

    it('plans edits for game.yaml startLocation and startInventory', () => {
        const config = {
            startLocation: 'town',
            startTime: { day: 1, hour: 8 },
            startFlags: {},
            startVariables: {},
            startInventory: ['coin', 'map'],
        };
        const locationPlan = planRename(
            registry({}),
            'locations',
            'town',
            'harbor',
            config
        );
        expect(locationPlan.yamlEdits).toEqual([
            {
                collection: 'game',
                id: 'game',
                edits: [{ path: ['startLocation'], value: 'harbor' }],
            },
        ]);

        const itemPlan = planRename(
            registry({}),
            'items',
            'coin',
            'gold_coin',
            config
        );
        expect(itemPlan.yamlEdits).toEqual([
            {
                collection: 'game',
                id: 'game',
                edits: [{ path: ['startInventory', 0], value: 'gold_coin' }],
            },
        ]);
    });
});

describe('rewriteDialogueSource', () => {
    it('renames references in the source as it is on disk, keeping newer text', async () => {
        const { rewriteDialogueSource } = await import('../rename');
        // The file on disk has newer text and an extra node that no loaded
        // registry has seen. The rename touches the references and nothing else.
        const DISK = [
            'NODE start',
            '  BARTENDER: Newly saved author edit.',
            '  GOTO extra',
            '',
            'NODE extra',
            '  NARRATOR: A whole new node.',
            '  END dialogue',
        ].join('\n');
        const out = rewriteDialogueSource(
            DISK,
            'chat',
            { section: 'characters' },
            'bartender',
            'marcus'
        );
        expect(out).not.toBeNull();
        expect(out).toContain('MARCUS: Newly saved author edit.');
        expect(out).toContain('A whole new node.');
    });

    it('returns null when the dialogue does not reference the id', async () => {
        const { rewriteDialogueSource } = await import('../rename');
        const DISK = [
            'NODE start',
            '  NARRATOR: Nothing here.',
            '  END dialogue',
        ].join('\n');
        expect(
            rewriteDialogueSource(
                DISK,
                'chat',
                { section: 'characters' },
                'bartender',
                'marcus'
            )
        ).toBeNull();
    });
});
