// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Snapshot } from '@doodle-engine/core';
import { useAudioManager } from '../hooks/useAudioManager';

class FakeAudio {
    static instances: FakeAudio[] = [];
    static rejectPlayback = false;
    src: string;
    loop = false;
    volume = 1;
    currentTime = 0;
    play = vi.fn(() =>
        FakeAudio.rejectPlayback
            ? Promise.reject(new Error('blocked'))
            : Promise.resolve()
    );
    pause = vi.fn();
    load = vi.fn();

    constructor(src = '') {
        this.src = src;
        FakeAudio.instances.push(this);
    }
}

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
    return {
        location: { id: 'town', name: 'Town', description: '', banner: '' },
        charactersHere: [],
        itemsHere: [],
        choices: [],
        dialogue: null,
        party: [],
        inventory: [],
        quests: [],
        journal: [],
        playerNotes: [],
        variables: {},
        time: { day: 1, hour: 8 },
        map: null,
        music: '',
        ambient: '',
        notifications: [],
        pendingSounds: [],
        pendingVideo: null,
        pendingInterlude: null,
        ui: {},
        currentLocale: 'en',
        ...overrides,
    };
}

function Harness({
    value,
    master = 0.5,
}: {
    value: Snapshot;
    master?: number;
}) {
    const audio = useAudioManager(value, {
        masterVolume: master,
        musicVolume: 0.4,
        soundVolume: 0.6,
        voiceVolume: 0.8,
        crossfadeDuration: 20,
    });
    return <button onClick={audio.stopAll}>Stop</button>;
}

beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudio.rejectPlayback = false;
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('useAudioManager', () => {
    it('plays, switches, updates, stops, and cleans up every channel', async () => {
        const first = snapshot({
            music: '/music-a.ogg',
            ambient: '/ambient-a.ogg',
            dialogue: {
                speaker: 'narrator',
                speakerName: 'Narrator',
                text: 'Hello',
                voice: '/voice.ogg',
            },
            pendingSounds: ['/effect.ogg'],
        });
        const { rerender, unmount } = render(<Harness value={first} />);
        await vi.runAllTimersAsync();

        const [music, ambient, voice, effect] = FakeAudio.instances;
        expect(music.src).toBe('/music-a.ogg');
        expect(music.load).toHaveBeenCalled();
        expect(music.play).toHaveBeenCalled();
        expect(music.volume).toBeCloseTo(0.2);
        expect(ambient).toMatchObject({
            src: '/ambient-a.ogg',
            loop: true,
            volume: 0.3,
        });
        expect(voice).toMatchObject({ src: '/voice.ogg', volume: 0.4 });
        expect(effect).toMatchObject({ src: '/effect.ogg', volume: 0.3 });

        rerender(
            <Harness
                value={snapshot({ music: '', ambient: '' })}
                master={0.25}
            />
        );
        await vi.runAllTimersAsync();
        expect(music.pause).toHaveBeenCalled();
        expect(ambient.src).toBe('');

        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
        expect(music.currentTime).toBe(0);
        expect(ambient.currentTime).toBe(0);
        expect(voice.currentTime).toBe(0);

        unmount();
        expect(music.src).toBe('');
        expect(ambient.src).toBe('');
        expect(voice.src).toBe('');
    });

    it('reports rejected playback without crashing the render', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        FakeAudio.rejectPlayback = true;
        render(
            <Harness
                value={snapshot({
                    dialogue: {
                        speaker: null,
                        speakerName: 'Narrator',
                        text: 'Hello',
                        voice: '/voice-b.ogg',
                    },
                    pendingSounds: ['/effect-b.ogg'],
                })}
            />
        );
        await Promise.resolve();
        await Promise.resolve();
        expect(warn).toHaveBeenCalledWith(
            'Voice playback failed:',
            expect.any(Error)
        );
        expect(warn).toHaveBeenCalledWith(
            'Sound playback failed:',
            expect.any(Error)
        );
        warn.mockRestore();
    });
});
