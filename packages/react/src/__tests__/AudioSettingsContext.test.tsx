/**
 * Tests for audio settings defaults and saved settings merge behavior.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AudioSettingsProvider,
    useAudioSettings,
    type AudioSettings,
} from '../AudioSettingsContext';

function readSettings(
    defaults?: Partial<AudioSettings>,
    stored?: Partial<AudioSettings> | string | null
): AudioSettings {
    const getItem = vi.fn(() => {
        if (stored === undefined || stored === null) return null;
        return typeof stored === 'string' ? stored : JSON.stringify(stored);
    });

    vi.stubGlobal('localStorage', {
        getItem,
        setItem: vi.fn(),
    });

    let observed: AudioSettings | null = null;

    function Capture() {
        observed = useAudioSettings();
        return null;
    }

    renderToStaticMarkup(
        <AudioSettingsProvider defaults={defaults}>
            <Capture />
        </AudioSettingsProvider>
    );

    if (!observed) {
        throw new Error('Audio settings were not captured');
    }

    return observed;
}

describe('AudioSettingsProvider', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses audioOptions defaults when there are no saved settings', () => {
        const settings = readSettings({
            masterVolume: 0.5,
            musicVolume: 0.4,
            soundVolume: 0.3,
            voiceVolume: 0.2,
        });

        expect(settings.masterVolume).toBe(0.5);
        expect(settings.musicVolume).toBe(0.4);
        expect(settings.soundVolume).toBe(0.3);
        expect(settings.voiceVolume).toBe(0.2);
    });

    it('lets saved settings override provided defaults', () => {
        const settings = readSettings(
            {
                masterVolume: 0.5,
                musicVolume: 0.4,
                soundVolume: 0.3,
                voiceVolume: 0.2,
            },
            {
                musicVolume: 0.9,
            }
        );

        expect(settings.masterVolume).toBe(0.5);
        expect(settings.musicVolume).toBe(0.9);
        expect(settings.soundVolume).toBe(0.3);
        expect(settings.voiceVolume).toBe(0.2);
    });

    it('falls back to defaults when saved settings are invalid JSON', () => {
        const settings = readSettings(
            {
                masterVolume: 0.6,
                musicVolume: 0.5,
            },
            '{bad json'
        );

        expect(settings.masterVolume).toBe(0.6);
        expect(settings.musicVolume).toBe(0.5);
        expect(settings.soundVolume).toBe(0.8);
        expect(settings.voiceVolume).toBe(1);
    });
});
