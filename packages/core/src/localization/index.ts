/**
 * Localization system for the Doodle Engine.
 *
 * Handles resolution of @keys to translated strings based on the current locale.
 * Authors use @keys in content files, and the engine resolves them when building snapshots.
 */

import type { LocaleData } from '../types/registry'

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
export function resolveText(text: string, localeData: LocaleData): string {
  // If doesn't start with @, it's inline text - return as-is
  if (!text.startsWith('@')) {
    return text
  }

  // Remove @ prefix and look up in locale data
  const key = text.slice(1)
  const resolved = localeData[key]

  // Return resolved text, or the original @key as fallback if not found
  return resolved ?? text
}

/**
 * Create a localization resolver function bound to a specific locale.
 * Useful for passing to functions that need to resolve multiple strings.
 *
 * @param localeData - Locale dictionary for the current language
 * @returns Function that resolves text using the provided locale data
 *
 * @example
 * ```ts
 * const resolve = createResolver(localeData)
 * const name = resolve("@character.bartender.name")
 * const bio = resolve("@character.bartender.bio")
 * ```
 */
export function createResolver(localeData: LocaleData): (text: string) => string {
  return (text: string) => resolveText(text, localeData)
}
