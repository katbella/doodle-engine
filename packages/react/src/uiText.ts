import { UI_DEFAULTS } from '@doodle-engine/core';

export function uiText(
    ui: Record<string, string> | undefined,
    key: string
): string {
    return ui?.[key] ?? UI_DEFAULTS[key] ?? key;
}
