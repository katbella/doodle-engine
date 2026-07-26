import type {
    CharacterStat,
    CharacterStats,
    StatValue,
} from './types/entities';

function isCharacterStat(
    value: CharacterStat | StatValue
): value is CharacterStat {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof value.name === 'string' &&
        (typeof value.value === 'number' || typeof value.value === 'string')
    );
}

export function initialStatValues(
    stats: CharacterStats | undefined
): Record<string, StatValue> {
    const values: Record<string, StatValue> = {};
    for (const [key, stat] of Object.entries(stats ?? {})) {
        values[key] = isCharacterStat(stat) ? stat.value : stat;
    }
    return values;
}

export function statNameSources(
    stats: CharacterStats | undefined
): Record<string, string> {
    const names: Record<string, string> = {};
    for (const [key, stat] of Object.entries(stats ?? {})) {
        names[key] = isCharacterStat(stat) ? stat.name : key;
    }
    return names;
}
