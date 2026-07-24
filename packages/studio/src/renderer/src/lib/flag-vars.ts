import {
    conditionDescriptor,
    effectDescriptor,
    type Condition,
    type ContentRegistry,
    type Effect,
    type Reference,
    type ReferenceIndex,
} from '@doodle-engine/core';
import type { FlagVarNotes } from '../../../shared/project';

export type FlagVarKind = 'flag' | 'variable';
export type NameKind = FlagVarKind | 'stat';

export interface BaseFlagVarSummary {
    kind: FlagVarKind;
    id: string;
    count: number;
    setCount: number;
    checkCount: number;
    references: Reference[];
}

export interface NameSummary extends BaseFlagVarSummary {
    note: string;
}

export interface StatSummary {
    kind: 'stat';
    id: string;
    count: number;
    setCount: number;
    checkCount: number;
    references: Reference[];
    note: string;
}

export interface NameCatalog {
    flags: NameSummary[];
    variables: NameSummary[];
    stats: StatSummary[];
}

export interface NearNamePair {
    kind: FlagVarKind;
    first: string;
    second: string;
}

export const EMPTY_NAME_CATALOG: NameCatalog = {
    flags: [],
    variables: [],
    stats: [],
};

export const EMPTY_FLAG_VAR_NOTES: FlagVarNotes = {
    flags: {},
    variables: {},
};

export function buildFlagVarSummaries(
    index: ReferenceIndex | null
): BaseFlagVarSummary[] {
    if (!index) return [];
    const build = (kind: FlagVarKind): BaseFlagVarSummary[] => {
        const type = kind === 'flag' ? 'flags' : 'variables';
        return index.allSymbols(type).map((id) => {
            const references = index.find(type, id);
            return {
                kind,
                id,
                count: references.length,
                setCount: references.filter((ref) => ref.access === 'set')
                    .length,
                checkCount: references.filter((ref) => ref.access === 'check')
                    .length,
                references,
            };
        });
    };
    return [...build('flag'), ...build('variable')];
}

export function attachFlagVarNotes(
    summaries: BaseFlagVarSummary[],
    notes: FlagVarNotes
): Pick<NameCatalog, 'flags' | 'variables'> {
    const withNote = (summary: BaseFlagVarSummary): NameSummary => ({
        ...summary,
        note:
            (summary.kind === 'flag'
                ? notes.flags[summary.id]
                : notes.variables[summary.id]) ?? '',
    });
    return {
        flags: summaries.filter((item) => item.kind === 'flag').map(withNote),
        variables: summaries
            .filter((item) => item.kind === 'variable')
            .map(withNote),
    };
}

function walkRegistryState(
    registry: ContentRegistry,
    onCondition: (condition: Condition) => void,
    onEffect: (effect: Effect) => void
) {
    const conditions = (items: Condition[] | undefined) =>
        (items ?? []).forEach(onCondition);
    const effects = (items: Effect[] | undefined) =>
        (items ?? []).forEach(onEffect);

    for (const dialogue of Object.values(registry.dialogues)) {
        conditions(dialogue.conditions);
        for (const node of dialogue.nodes) {
            conditions(node.conditions);
            effects(node.effects);
            for (const branch of node.conditionalBranches ?? []) {
                onCondition(branch.condition);
                effects(branch.effects);
            }
            for (const choice of node.choices) {
                conditions(choice.conditions);
                effects(choice.effects);
            }
        }
    }
    for (const interlude of Object.values(registry.interludes)) {
        conditions(interlude.triggerConditions);
        effects(interlude.effects);
    }
}

export function buildStatSummaries(registry: ContentRegistry): StatSummary[] {
    const counts = new Map<string, number>();
    const add = (id: string) => {
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    };
    for (const character of Object.values(registry.characters)) {
        Object.keys(character.stats ?? {}).forEach(add);
    }
    for (const item of Object.values(registry.items)) {
        Object.keys(item.stats ?? {}).forEach(add);
    }
    const namedStat = (
        entity: Condition | Effect,
        args: { name: string; kind: string }[]
    ) => {
        const record = entity as unknown as Record<string, unknown>;
        for (const arg of args) {
            if (arg.kind === 'stat' && typeof record[arg.name] === 'string') {
                add(record[arg.name] as string);
            }
        }
    };
    walkRegistryState(
        registry,
        (condition) =>
            namedStat(condition, conditionDescriptor(condition.type).args),
        (effect) => namedStat(effect, effectDescriptor(effect.type).args)
    );

    return [...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, count]) => ({
            kind: 'stat',
            id,
            count,
            setCount: 0,
            checkCount: 0,
            references: [],
            note: '',
        }));
}

export function catalogFor(
    catalog: NameCatalog,
    kind: NameKind
): Array<NameSummary | StatSummary> {
    if (kind === 'flag') return catalog.flags;
    if (kind === 'variable') return catalog.variables;
    return catalog.stats;
}

export function usageSummary(summary: NameSummary | StatSummary): string {
    if (summary.kind === 'stat') {
        return `${summary.count} use${summary.count === 1 ? '' : 's'}`;
    }
    return `Set in ${summary.setCount} place${summary.setCount === 1 ? '' : 's'}, checked in ${summary.checkCount}`;
}

function editDistanceAtMostOne(a: string, b: string): boolean {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1) return false;
    if (a.length === b.length) {
        const mismatches: number[] = [];
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) mismatches.push(i);
            if (mismatches.length > 2) return false;
        }
        if (mismatches.length <= 1) return true;
        const [first, second] = mismatches;
        return (
            second === first + 1 &&
            a[first] === b[second] &&
            a[second] === b[first]
        );
    }
    let left = a;
    let right = b;
    if (left.length > right.length) [left, right] = [right, left];
    let changes = 0;
    for (let i = 0, j = 0; i < left.length || j < right.length; i++, j++) {
        if (left[i] === right[j]) continue;
        changes++;
        if (changes > 1) return false;
        if (left.length < right.length) i--;
    }
    return true;
}

export function nearIdenticalNames(catalog: NameCatalog): NearNamePair[] {
    const pairs: NearNamePair[] = [];
    for (const kind of ['flag', 'variable'] as const) {
        const names = catalogFor(catalog, kind).map((item) => item.id);
        const lowered = names.map((name) => name.toLocaleLowerCase());
        const byVariant = new Map<string, Set<number>>();
        for (let index = 0; index < lowered.length; index++) {
            const name = lowered[index];
            const variants = new Set<string>([name]);
            for (let position = 0; position < name.length; position++) {
                variants.add(
                    name.slice(0, position) + name.slice(position + 1)
                );
            }
            for (const variant of variants) {
                const bucket = byVariant.get(variant) ?? new Set<number>();
                bucket.add(index);
                byVariant.set(variant, bucket);
            }
        }

        const candidates = new Set<string>();
        for (const bucket of byVariant.values()) {
            const indexes = [...bucket];
            for (let left = 0; left < indexes.length; left++) {
                for (let right = left + 1; right < indexes.length; right++) {
                    const first = Math.min(indexes[left], indexes[right]);
                    const second = Math.max(indexes[left], indexes[right]);
                    candidates.add(`${first}:${second}`);
                }
            }
        }
        for (const candidate of candidates) {
            const [firstIndex, secondIndex] = candidate.split(':').map(Number);
            if (
                lowered[firstIndex] === lowered[secondIndex] ||
                editDistanceAtMostOne(lowered[firstIndex], lowered[secondIndex])
            ) {
                pairs.push({
                    kind,
                    first: names[firstIndex],
                    second: names[secondIndex],
                });
            }
        }
    }
    return pairs.sort(
        (a, b) =>
            a.kind.localeCompare(b.kind) ||
            a.first.localeCompare(b.first) ||
            a.second.localeCompare(b.second)
    );
}

export function closestExistingName(
    kind: FlagVarKind,
    staleId: string,
    catalog: NameCatalog
): string | null {
    const commonPrefix = (left: string, right: string) => {
        let length = 0;
        while (
            length < left.length &&
            length < right.length &&
            left[length].toLocaleLowerCase() ===
                right[length].toLocaleLowerCase()
        ) {
            length++;
        }
        return length;
    };
    const candidates = catalogFor(catalog, kind)
        .map((item) => item.id)
        .filter(
            (id) =>
                id[0]?.toLocaleLowerCase() ===
                    staleId[0]?.toLocaleLowerCase() &&
                Math.abs(id.length - staleId.length) <= 1 &&
                editDistanceAtMostOne(
                    id.toLocaleLowerCase(),
                    staleId.toLocaleLowerCase()
                )
        );
    return (
        candidates.sort(
            (a, b) =>
                Number(b[0] === staleId[0]) - Number(a[0] === staleId[0]) ||
                commonPrefix(b, staleId) - commonPrefix(a, staleId) ||
                a.localeCompare(b)
        )[0] ?? null
    );
}

export function prefixForName(id: string): string {
    const separator = id.search(/[_.:]/);
    return separator > 0 ? id.slice(0, separator) : 'No prefix';
}
