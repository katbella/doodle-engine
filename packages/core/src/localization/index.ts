/**
 * Localization system for the Doodle Engine.
 *
 * Handles resolution of @keys to translated strings based on the current locale.
 * Authors use @keys in content files, and the engine resolves them when building snapshots.
 */

import type { LocaleData } from '../types/registry';
import type { StatValue } from '../types/entities';

export interface TextCharacterValues {
    name: string;
    title: string;
    biography: string;
    stats: Record<string, StatValue>;
    /** Player-entered profile text must not be treated as localization keys. */
    literalProfile?: boolean;
}

export type TextCharacterMap = Record<string, TextCharacterValues>;

/**
 * Resolve a localization key to a translated string.
 *
 * If the text starts with '@', looks up the key (without @) in the locale data.
 * If the key is not found, returns the key itself as a fallback.
 * If the text doesn't start with '@', returns it as-is (inline text).
 *
 * @param text - Text that may be a @key or inline text
 * @param localeData - Locale dictionary for the current language
 * @returns Resolved string
 *
 * @example
 * ```ts
 * resolveText("@location.tavern.name", localeData) // "The Salty Dog"
 * resolveText("Just some text", localeData)         // "Just some text"
 * resolveText("@missing.key", localeData)           // "@missing.key" (fallback)
 * ```
 */
export function resolveText(
    text: string,
    localeData: LocaleData,
    variables?: Record<string, number | string>,
    characters?: TextCharacterMap
): string {
    // Resolve @localization key first
    let resolved: string;
    if (text.startsWith('@')) {
        const key = text.slice(1);
        resolved = localeData[key] ?? text;
    } else {
        resolved = text;
    }

    if (characters && resolved.includes('{')) {
        resolved = resolved.replace(
            /\{(\w+)\.(name|title|biography|stats\.(\w+))\}/g,
            (placeholder, characterId, path, stat) => {
                const character = characters[characterId];
                if (!character) return placeholder;

                const value =
                    stat === undefined
                        ? character[path as 'name' | 'title' | 'biography']
                        : character.stats[stat];
                if (value === undefined) return placeholder;

                if (
                    typeof value === 'string' &&
                    value.startsWith('@') &&
                    (stat !== undefined || !character.literalProfile)
                ) {
                    return localeData[value.slice(1)] ?? value;
                }
                return String(value);
            }
        );
    }

    // Substitute {varName} placeholders with variable values
    if (variables && resolved.includes('{')) {
        resolved = resolved.replace(/\{(\w+)\}/g, (_, name) => {
            const val = variables[name];
            return val !== undefined ? String(val) : `{${name}}`;
        });
    }

    return resolved;
}
