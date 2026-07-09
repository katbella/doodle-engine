/**
 * Tests for UI sound path resolution.
 */

import { describe, expect, it } from 'vitest';
import { resolveSoundPath } from '../hooks/useUISounds';

describe('resolveSoundPath', () => {
    it('joins relative sound files to the base path', () => {
        expect(resolveSoundPath('/assets/audio/ui', 'click.ogg')).toBe(
            '/assets/audio/ui/click.ogg'
        );
        expect(resolveSoundPath('/assets/audio/ui/', 'click.ogg')).toBe(
            '/assets/audio/ui/click.ogg'
        );
    });

    it('leaves absolute and externally hosted paths unchanged', () => {
        expect(resolveSoundPath('/assets/audio/ui', '/sounds/click.ogg')).toBe(
            '/sounds/click.ogg'
        );
        expect(
            resolveSoundPath('/assets/audio/ui', 'https://cdn.test/click.ogg')
        ).toBe('https://cdn.test/click.ogg');
        expect(
            resolveSoundPath('/assets/audio/ui', 'data:audio/ogg;base64,abc')
        ).toBe('data:audio/ogg;base64,abc');
        expect(
            resolveSoundPath('/assets/audio/ui', 'blob:https://app.test/123')
        ).toBe('blob:https://app.test/123');
    });
});
