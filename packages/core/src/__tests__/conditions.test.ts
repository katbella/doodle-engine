/**
 * Tests for condition evaluators.
 * Each condition type is tested in isolation to ensure correct behavior.
 */

import { describe, it, expect } from 'vitest';
import { evaluateCondition, evaluateConditions } from '../conditions';
import type { Condition } from '../types/conditions';
import type { GameState } from '../types/state';

// Helper to create a minimal game state for testing
function createTestState(): GameState {
    return {
        currentLocation: 'tavern',
        currentTime: { day: 1, hour: 14 },
        flags: {
            metBartender: true,
            doorLocked: false,
        },
        variables: {
            gold: 100,
            reputation: 5,
            playerName: 'Hero',
        },
        inventory: ['rusty_key', 'letter'],
        questProgress: {
            odd_jobs: 'started',
            main_quest: 'investigating',
        },
        unlockedJournalEntries: ['tavern_discovery'],
        playerNotes: [],
        dialogueState: null,
        characterState: {
            bartender: {
                location: 'tavern',
                inParty: false,
                relationship: 5,
                stats: {},
            },
            pixel_the_dog: {
                location: 'camp',
                inParty: true,
                relationship: 8,
                stats: { level: 3 },
            },
            merchant: {
                location: 'market',
                inParty: false,
                relationship: -2,
                stats: {},
            },
        },
        itemLocations: {
            rusty_key: 'inventory',
            letter: 'inventory',
            sword: 'armory',
            ancient_tome: 'library',
        },
        mapEnabled: true,
        notifications: [],
        pendingSounds: [],
        pendingVideo: null,
        currentLocale: 'en',
    };
}

describe('Condition Evaluators', () => {
    describe('hasFlag', () => {
        it('should return true when flag is set', () => {
            const condition: Condition = {
                type: 'hasFlag',
                flag: 'metBartender',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when flag is not set', () => {
            const condition: Condition = {
                type: 'hasFlag',
                flag: 'doorLocked',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when flag does not exist', () => {
            const condition: Condition = {
                type: 'hasFlag',
                flag: 'nonexistent',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('notFlag', () => {
        it('should return true when flag is not set', () => {
            const condition: Condition = {
                type: 'notFlag',
                flag: 'doorLocked',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when flag is set', () => {
            const condition: Condition = {
                type: 'notFlag',
                flag: 'metBartender',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return true when flag does not exist', () => {
            const condition: Condition = {
                type: 'notFlag',
                flag: 'nonexistent',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });
    });

    describe('hasItem', () => {
        it('should return true when item is in inventory', () => {
            const condition: Condition = {
                type: 'hasItem',
                itemId: 'rusty_key',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when item is not in inventory', () => {
            const condition: Condition = { type: 'hasItem', itemId: 'sword' };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('variableEquals', () => {
        it('should return true when numeric variable equals value', () => {
            const condition: Condition = {
                type: 'variableEquals',
                variable: 'gold',
                value: 100,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return true when string variable equals value', () => {
            const condition: Condition = {
                type: 'variableEquals',
                variable: 'playerName',
                value: 'Hero',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when variable does not equal value', () => {
            const condition: Condition = {
                type: 'variableEquals',
                variable: 'gold',
                value: 50,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when variable does not exist', () => {
            const condition: Condition = {
                type: 'variableEquals',
                variable: 'nonexistent',
                value: 100,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('variableGreaterThan', () => {
        it('should return true when variable is greater', () => {
            const condition: Condition = {
                type: 'variableGreaterThan',
                variable: 'gold',
                value: 50,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when variable is equal', () => {
            const condition: Condition = {
                type: 'variableGreaterThan',
                variable: 'gold',
                value: 100,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when variable is less', () => {
            const condition: Condition = {
                type: 'variableGreaterThan',
                variable: 'gold',
                value: 200,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when variable is a string', () => {
            const condition: Condition = {
                type: 'variableGreaterThan',
                variable: 'playerName',
                value: 10,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('variableLessThan', () => {
        it('should return true when variable is less', () => {
            const condition: Condition = {
                type: 'variableLessThan',
                variable: 'gold',
                value: 200,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when variable is equal', () => {
            const condition: Condition = {
                type: 'variableLessThan',
                variable: 'gold',
                value: 100,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when variable is greater', () => {
            const condition: Condition = {
                type: 'variableLessThan',
                variable: 'gold',
                value: 50,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('atLocation', () => {
        it('should return true when at the specified location', () => {
            const condition: Condition = {
                type: 'atLocation',
                locationId: 'tavern',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when at a different location', () => {
            const condition: Condition = {
                type: 'atLocation',
                locationId: 'market',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('questAtStage', () => {
        it('should return true when quest is at the specified stage', () => {
            const condition: Condition = {
                type: 'questAtStage',
                questId: 'odd_jobs',
                stageId: 'started',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when quest is at a different stage', () => {
            const condition: Condition = {
                type: 'questAtStage',
                questId: 'odd_jobs',
                stageId: 'complete',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when quest has not been started', () => {
            const condition: Condition = {
                type: 'questAtStage',
                questId: 'unknown_quest',
                stageId: 'started',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('characterAt', () => {
        it('should return true when character is at the specified location', () => {
            const condition: Condition = {
                type: 'characterAt',
                characterId: 'bartender',
                locationId: 'tavern',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when character is at a different location', () => {
            const condition: Condition = {
                type: 'characterAt',
                characterId: 'bartender',
                locationId: 'market',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when character does not exist', () => {
            const condition: Condition = {
                type: 'characterAt',
                characterId: 'unknown',
                locationId: 'tavern',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('characterInParty', () => {
        it('should return true when character is in party', () => {
            const condition: Condition = {
                type: 'characterInParty',
                characterId: 'pixel_the_dog',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when character is not in party', () => {
            const condition: Condition = {
                type: 'characterInParty',
                characterId: 'bartender',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('relationshipAbove', () => {
        it('should return true when relationship is above value', () => {
            const condition: Condition = {
                type: 'relationshipAbove',
                characterId: 'pixel_the_dog',
                value: 5,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when relationship equals value', () => {
            const condition: Condition = {
                type: 'relationshipAbove',
                characterId: 'bartender',
                value: 5,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when relationship is below value', () => {
            const condition: Condition = {
                type: 'relationshipAbove',
                characterId: 'merchant',
                value: 0,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('relationshipBelow', () => {
        it('should return true when relationship is below value', () => {
            const condition: Condition = {
                type: 'relationshipBelow',
                characterId: 'merchant',
                value: 0,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when relationship equals value', () => {
            const condition: Condition = {
                type: 'relationshipBelow',
                characterId: 'bartender',
                value: 5,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when relationship is above value', () => {
            const condition: Condition = {
                type: 'relationshipBelow',
                characterId: 'pixel_the_dog',
                value: 5,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('timeIs', () => {
        it('should return true when time is within normal range', () => {
            const condition: Condition = {
                type: 'timeIs',
                startHour: 9,
                endHour: 17,
            };
            const state = createTestState(); // hour is 14
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when time is outside normal range', () => {
            const condition: Condition = {
                type: 'timeIs',
                startHour: 18,
                endHour: 22,
            };
            const state = createTestState(); // hour is 14
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should handle wrap-around range (night time)', () => {
            const condition: Condition = {
                type: 'timeIs',
                startHour: 20,
                endHour: 6,
            };
            const state = {
                ...createTestState(),
                currentTime: { day: 1, hour: 2 },
            };
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should handle wrap-around range boundary', () => {
            const condition: Condition = {
                type: 'timeIs',
                startHour: 20,
                endHour: 6,
            };
            const state = {
                ...createTestState(),
                currentTime: { day: 1, hour: 20 },
            };
            expect(evaluateCondition(condition, state)).toBe(true);
        });
    });

    describe('itemAt', () => {
        it('should return true when item is at the specified location', () => {
            const condition: Condition = {
                type: 'itemAt',
                itemId: 'sword',
                locationId: 'armory',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when item is at a different location', () => {
            const condition: Condition = {
                type: 'itemAt',
                itemId: 'sword',
                locationId: 'tavern',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return false when item does not exist', () => {
            const condition: Condition = {
                type: 'itemAt',
                itemId: 'unknown',
                locationId: 'tavern',
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });
    });

    describe('roll', () => {
        it('should return true when roll meets threshold', () => {
            // With min=max=20 and threshold=20, always passes
            const condition: Condition = {
                type: 'roll',
                min: 20,
                max: 20,
                threshold: 20,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(true);
        });

        it('should return false when roll is below threshold', () => {
            // With min=max=1 and threshold=20, always fails
            const condition: Condition = {
                type: 'roll',
                min: 1,
                max: 1,
                threshold: 20,
            };
            const state = createTestState();
            expect(evaluateCondition(condition, state)).toBe(false);
        });

        it('should return a boolean result', () => {
            const condition: Condition = {
                type: 'roll',
                min: 1,
                max: 20,
                threshold: 10,
            };
            const state = createTestState();
            const result = evaluateCondition(condition, state);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('evaluateConditions (multiple)', () => {
        it('should return true when all conditions pass', () => {
            const conditions: Condition[] = [
                { type: 'hasFlag', flag: 'metBartender' },
                { type: 'hasItem', itemId: 'rusty_key' },
                { type: 'variableGreaterThan', variable: 'gold', value: 50 },
            ];
            const state = createTestState();
            expect(evaluateConditions(conditions, state)).toBe(true);
        });

        it('should return false when any condition fails', () => {
            const conditions: Condition[] = [
                { type: 'hasFlag', flag: 'metBartender' },
                { type: 'hasItem', itemId: 'sword' }, // Not in inventory
                { type: 'variableGreaterThan', variable: 'gold', value: 50 },
            ];
            const state = createTestState();
            expect(evaluateConditions(conditions, state)).toBe(false);
        });

        it('should return true for empty conditions array', () => {
            const state = createTestState();
            expect(evaluateConditions([], state)).toBe(true);
        });
    });
});
