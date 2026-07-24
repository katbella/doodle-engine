export function isValidIdentifier(value: unknown): value is string {
    return typeof value === 'string' && /^[A-Za-z0-9_]+$/.test(value);
}
