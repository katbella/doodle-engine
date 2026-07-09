/**
 * Tests for GameShell behavior that can be verified without a browser DOM.
 */

import { describe, expect, it } from 'vitest';
import { resolveGameShellUISoundConfig } from '../GameShell';

describe('resolveGameShellUISoundConfig', () => {
    it('uses shell UI sounds when no explicit prop is supplied', () => {
        expect(
            resolveGameShellUISoundConfig({
                uiSounds: {
                    click: 'shell-click.ogg',
                    menuOpen: 'shell-open.ogg',
                },
            })
        ).toEqual({
            sounds: {
                click: 'shell-click.ogg',
                menuOpen: 'shell-open.ogg',
            },
        });
    });

    it('lets explicit uiSounds props win over shell UI sounds', () => {
        expect(
            resolveGameShellUISoundConfig(
                {
                    uiSounds: {
                        click: 'shell-click.ogg',
                    },
                },
                {
                    sounds: {
                        click: 'prop-click.ogg',
                    },
                }
            )
        ).toEqual({
            sounds: {
                click: 'prop-click.ogg',
            },
        });
    });

    it('preserves explicit false as disabled UI sounds', () => {
        expect(resolveGameShellUISoundConfig({}, false)).toEqual({
            enabled: false,
        });
    });
});
