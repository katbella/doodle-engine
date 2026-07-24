import type { CSSProperties } from 'react';

/**
 * Build a CSS background-image value without treating spaces or punctuation in
 * an asset path as CSS syntax.
 */
export function screenBackgroundStyle(url: string): CSSProperties | undefined {
    return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}
