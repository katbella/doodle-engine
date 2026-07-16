export interface LocaleOption {
    code: string;
    label: string;
}

export function getAvailableLocales(
    locales: Record<string, unknown>
): LocaleOption[] {
    return Object.keys(locales)
        .sort()
        .map((code) => ({
            code,
            label: getLanguageName(code),
        }));
}

function getLanguageName(code: string): string {
    try {
        return (
            new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
        );
    } catch {
        return code;
    }
}
