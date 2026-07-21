import { describe, expect, it } from 'vitest';
import type { ReferenceIndex } from '@doodle-engine/core';
import {
    attachFlagVarNotes,
    buildFlagVarSummaries,
    closestExistingName,
    nearIdenticalNames,
    prefixForName,
    type NameCatalog,
} from '../flag-vars';

const references = {
    ready: [
        { file: 'one.dlg', where: 'first', access: 'set' as const },
        { file: 'two.dlg', where: 'second', access: 'check' as const },
        { file: 'three.dlg', where: 'third', access: 'check' as const },
    ],
    score: [{ file: 'game.yaml', where: 'start', access: 'set' as const }],
};

const index = {
    allSymbols: (type: string) => (type === 'flags' ? ['ready'] : ['score']),
    find: (_type: string, id: keyof typeof references) => references[id],
} as unknown as ReferenceIndex;

describe('flag and variable summaries', () => {
    it('computes set and check totals once from indexed references', () => {
        expect(buildFlagVarSummaries(index)).toEqual([
            {
                kind: 'flag',
                id: 'ready',
                count: 3,
                setCount: 1,
                checkCount: 2,
                references: references.ready,
            },
            {
                kind: 'variable',
                id: 'score',
                count: 1,
                setCount: 1,
                checkCount: 0,
                references: references.score,
            },
        ]);
    });

    it('attaches optional notes without changing the indexed totals', () => {
        const attached = attachFlagVarNotes(buildFlagVarSummaries(index), {
            flags: { ready: 'The player can continue.' },
            variables: {},
        });
        expect(attached.flags[0].note).toBe('The player can continue.');
        expect(attached.variables[0].note).toBe('');
    });
});

describe('flag and variable name health', () => {
    const catalog: NameCatalog = {
        flags: [
            {
                kind: 'flag',
                id: 'metGuide',
                count: 1,
                setCount: 1,
                checkCount: 0,
                references: [],
                note: '',
            },
            {
                kind: 'flag',
                id: 'metGiude',
                count: 1,
                setCount: 0,
                checkCount: 1,
                references: [],
                note: '',
            },
            {
                kind: 'flag',
                id: 'MetGuide',
                count: 1,
                setCount: 1,
                checkCount: 1,
                references: [],
                note: '',
            },
        ],
        variables: [],
        stats: [],
    };

    it('finds one-edit pairs at every position without unrelated collisions', () => {
        const name = (id: string) => ({
            kind: 'flag' as const,
            id,
            count: 1,
            setCount: 1,
            checkCount: 0,
            references: [],
            note: '',
        });
        const healthCatalog: NameCatalog = {
            flags: [
                'metGuide',
                'netGuide',
                'emtGuide',
                'MetGuide',
                'metGiude',
                'sunLight',
                'abcd',
                'bcad',
            ].map(name),
            variables: [],
            stats: [],
        };
        const pairs = nearIdenticalNames(healthCatalog).map((pair) =>
            [pair.first, pair.second].sort().join(':')
        );

        expect(pairs).toEqual(
            expect.arrayContaining([
                ['metGuide', 'netGuide'].sort().join(':'),
                ['metGuide', 'emtGuide'].sort().join(':'),
                ['metGuide', 'MetGuide'].sort().join(':'),
                ['metGuide', 'metGiude'].sort().join(':'),
            ])
        );
        expect(pairs.some((pair) => pair.includes('sunLight'))).toBe(false);
        expect(pairs).not.toContain(['abcd', 'bcad'].sort().join(':'));
    });

    it('suggests a close owner for a stale note and derives prefix groups', () => {
        expect(closestExistingName('flag', 'metGude', catalog)).toBe(
            'metGuide'
        );
        expect(prefixForName('quest_miller_stage')).toBe('quest');
        expect(prefixForName('act1.tavern.rumor')).toBe('act1');
        expect(prefixForName('ui:volume')).toBe('ui');
        expect(prefixForName('.hidden')).toBe('No prefix');
        expect(prefixForName('metGuide')).toBe('No prefix');
    });
});
