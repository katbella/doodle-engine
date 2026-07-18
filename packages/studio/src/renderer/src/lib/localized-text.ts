import { resolveText, type ContentRegistry } from '@doodle-engine/core';

export interface AuthoredTextPreview {
    text: string;
    locale: string;
    missing: boolean;
}

/** Resolve an authored @key using English when present, else the first locale. */
export function authoredTextPreview(
    source: string,
    registry: ContentRegistry
): AuthoredTextPreview | null {
    if (!source.startsWith('@')) return null;
    const locale = registry.locales.en
        ? 'en'
        : Object.keys(registry.locales).sort()[0];
    if (!locale) return null;
    const text = resolveText(source, registry.locales[locale]);
    return { text, locale, missing: text === source };
}
