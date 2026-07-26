import { describe, expect, it } from 'vitest';
import { initialStatValues, statNameSources } from '../stats';

describe('character stat definitions', () => {
    it('normalizes detailed definitions and scalar shorthand', () => {
        const stats = {
            strength: {
                name: '@stat.strength',
                value: 16.2,
            },
            class: '@class.ranger',
        };

        expect(initialStatValues(stats)).toEqual({
            strength: 16.2,
            class: '@class.ranger',
        });
        expect(statNameSources(stats)).toEqual({
            strength: '@stat.strength',
            class: 'class',
        });
    });

    it('treats an omitted stats object as empty', () => {
        expect(initialStatValues(undefined)).toEqual({});
        expect(statNameSources(undefined)).toEqual({});
    });
});
