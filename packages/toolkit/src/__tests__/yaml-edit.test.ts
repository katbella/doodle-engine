/**
 * The visual forms must save without damaging the file. These tests are the
 * gate: editing one field keeps every comment, the key order, blank lines, and
 * any keys the form never saw (including the open `stats` bag and a commented
 * `shell:` block).
 */

import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { applyYamlEdits, readYamlValue } from '../yaml-edit';

const CHARACTER = `# The tavern keeper
id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: ""        # no art yet
location: tavern
dialogue: bartender_greeting
stats:
  friendliness: 7   # 0-10
voiceProfile: gruff_low
`;

describe('applyYamlEdits', () => {
    it('changes one field and keeps comments, order, and unknown keys', () => {
        const result = applyYamlEdits(CHARACTER, [
            { path: ['portrait'], value: 'bartender_neutral.png' },
        ]);

        // The edited value is written.
        expect(parse(result).portrait).toBe('bartender_neutral.png');
        // Every comment survives.
        expect(result).toContain('# The tavern keeper');
        expect(result).toContain('# 0-10');
        // The unknown key the form doesn't model is untouched.
        expect(result).toContain('voiceProfile: gruff_low');
        // Key order is unchanged (id first, voiceProfile last).
        const keys = Object.keys(parse(result));
        expect(keys).toEqual([
            'id',
            'name',
            'biography',
            'portrait',
            'location',
            'dialogue',
            'stats',
            'voiceProfile',
        ]);
    });

    it('leaves the file byte-identical when there are no edits', () => {
        // The form sends edits only for fields that actually changed, so a save
        // with nothing changed is a no-op and the file is not rewritten at all.
        expect(applyYamlEdits(CHARACTER, [])).toBe(CHARACTER);
    });

    it('comments survive a real edit (inline alignment may normalize)', () => {
        // The yaml printer can collapse the run of spaces before an inline
        // comment. The comment text itself is always kept.
        const result = applyYamlEdits(CHARACTER, [
            { path: ['location'], value: 'market' },
        ]);
        expect(result).toContain('# no art yet');
        expect(result).toContain('# 0-10');
        expect(result).toContain('voiceProfile: gruff_low');
    });

    it('edits a nested field without disturbing siblings', () => {
        const source = `startLocation: tavern
startTime:
  day: 1      # chapter one
  hour: 8
`;
        const result = applyYamlEdits(source, [
            { path: ['startTime', 'hour'], value: 20 },
        ]);
        expect(parse(result).startTime).toEqual({ day: 1, hour: 20 });
        expect(result).toContain('# chapter one');
    });

    it('preserves the open stats bag when editing another field', () => {
        const result = applyYamlEdits(CHARACTER, [
            { path: ['name'], value: '@character.bartender.newName' },
        ]);
        expect(parse(result).stats).toEqual({ friendliness: 7 });
        expect(result).toContain('# 0-10');
    });

    it('adds a new stat key inside the bag', () => {
        const result = applyYamlEdits(CHARACTER, [
            { path: ['stats', 'wisdom'], value: 3 },
        ]);
        const parsed = parse(result);
        expect(parsed.stats).toEqual({ friendliness: 7, wisdom: 3 });
        // The original stat and its comment are still there.
        expect(result).toContain('# 0-10');
    });

    it('removes a key when the value is undefined', () => {
        const result = applyYamlEdits(CHARACTER, [
            { path: ['voiceProfile'], value: undefined },
        ]);
        expect(parse(result).voiceProfile).toBeUndefined();
        expect(result).not.toContain('voiceProfile');
    });

    it('keeps a commented-out shell block intact', () => {
        const game = `# Game Configuration
#
# shell:
#   splash:
#     logo: /assets/images/studio-logo.png
startLocation: tavern
startTime:
  day: 1
  hour: 8
`;
        const result = applyYamlEdits(game, [
            { path: ['startLocation'], value: 'market' },
        ]);
        expect(parse(result).startLocation).toBe('market');
        expect(result).toContain('# shell:');
        expect(result).toContain('#     logo: /assets/images/studio-logo.png');
    });

    it('replaces an array value whole (e.g. start inventory)', () => {
        const source = `startInventory: []\n`;
        const result = applyYamlEdits(source, [
            { path: ['startInventory'], value: ['old_coin', 'rusty_key'] },
        ]);
        expect(parse(result).startInventory).toEqual(['old_coin', 'rusty_key']);
    });

    it('rewrites a quest stages list of objects and keeps other keys/comments', () => {
        const quest = `# The odd jobs quest
id: odd_jobs
name: "@quest.odd_jobs.name"
description: "@quest.odd_jobs.description"
stages:
  - id: started
    description: "@quest.odd_jobs.stage.started"
  - id: complete
    description: "@quest.odd_jobs.stage.complete"
`;
        const result = applyYamlEdits(quest, [
            {
                path: ['stages'],
                value: [
                    { id: 'started', description: '@quest.odd_jobs.stage.started' },
                    { id: 'midway', description: '' },
                    { id: 'complete', description: '@quest.odd_jobs.stage.complete' },
                ],
            },
        ]);
        const parsed = parse(result);
        expect(parsed.stages.map((s: { id: string }) => s.id)).toEqual([
            'started',
            'midway',
            'complete',
        ]);
        // Other keys and the header comment are untouched.
        expect(parsed.id).toBe('odd_jobs');
        expect(parsed.name).toBe('@quest.odd_jobs.name');
        expect(result).toContain('# The odd jobs quest');
    });

    it('rewrites map markers (objects with coordinates)', () => {
        const map = `id: town
name: Town
image: town.png
scale: 10
locations:
  - id: tavern
    x: 0
    y: 0
`;
        const result = applyYamlEdits(map, [
            {
                path: ['locations'],
                value: [
                    { id: 'tavern', x: 10, y: 20 },
                    { id: 'market', x: 100, y: 0 },
                ],
            },
        ]);
        const parsed = parse(result);
        expect(parsed.locations).toEqual([
            { id: 'tavern', x: 10, y: 20 },
            { id: 'market', x: 100, y: 0 },
        ]);
        expect(parsed.scale).toBe(10);
    });
});

describe('readYamlValue', () => {
    it('reads a scalar and a nested value as plain JS', () => {
        expect(readYamlValue(CHARACTER, ['dialogue'])).toBe(
            'bartender_greeting'
        );
        expect(readYamlValue(CHARACTER, ['stats', 'friendliness'])).toBe(7);
    });
});
