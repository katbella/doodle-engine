/**
 * Localization system for the Doodle Engine.
 *
 * Handles resolution of @keys to translated strings based on the current locale.
 * Authors use @keys in content files, and the engine resolves them when building snapshots.
 */

import type { LocaleData } from '../types/registry';

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
    variables?: Record<string, number | string>
): string {
    // Resolve @localization key first
    let resolved: string;
    if (text.startsWith('@')) {
        const key = text.slice(1);
        resolved = localeData[key] ?? text;
    } else {
        resolved = text;
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

/**
 * Create a localization resolver function bound to a specific locale and variables.
 * Useful for passing to functions that need to resolve multiple strings.
 *
 * @param localeData - Locale dictionary for the current language
 * @param variables - Optional game variables for {varName} substitution
 * @returns Function that resolves text using the provided locale data and variables
 *
 * @example
 * ```ts
 * const resolve = createResolver(localeData, variables)
 * const name = resolve("@character.bartender.name")
 * const roll = resolve("You rolled a {bluffRoll}.")
 * ```
 */
export function createResolver(
    localeData: LocaleData,
    variables?: Record<string, number | string>
): (text: string) => string {
    return (text: string) => resolveText(text, localeData, variables);
}
