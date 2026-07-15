// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssetContextValue } from '../AssetProvider';
import { AssetContext } from '../AssetProvider';
import { AudioSettingsContext } from '../AudioSettingsContext';
import { Interlude } from '../components/Interlude';
import { InputProvider } from '../input/InputRouter';

class FakeAudio {
    static instances: FakeAudio[] = [];
    src: string;
    loop = false;
    volume = 1;
    play = vi.fn(async () => {});
    pause = vi.fn();

    constructor(src = '') {
        this.src = src;
        FakeAudio.instances.push(this);
    }
}

beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const interlude = {
    id: 'opening',
    background: '/background.png',
    banner: '/banner.png',
    text: 'First line\n\nLast line',
    scroll: true,
    scrollSpeed: 30,
    music: '/music.ogg',
    voice: '/voice.ogg',
    sounds: ['/wind.ogg', '/rain.ogg'],
};

function renderInterlude(onDismiss = vi.fn()) {
    const assetContext: AssetContextValue = {
        state: {
            phase: 'complete',
            bytesLoaded: 1,
            bytesTotal: 1,
            assetsLoaded: 1,
            assetsTotal: 1,
            progress: 1,
            overallProgress: 1,
            currentAsset: null,
            error: null,
        },
        getAssetUrl: (path) => `/cached${path}`,
        isReady: () => true,
        prefetch: () => {},
        loader: {} as AssetContextValue['loader'],
    };
    return render(
        <InputProvider>
            <AssetContext.Provider value={assetContext}>
                <AudioSettingsContext.Provider
                    value={{
                        masterVolume: 0.5,
                        musicVolume: 0.4,
                        soundVolume: 0.6,
                        voiceVolume: 0.8,
                        setMasterVolume: vi.fn(),
                        setMusicVolume: vi.fn(),
                        setSoundVolume: vi.fn(),
                        setVoiceVolume: vi.fn(),
                    }}
                >
                    <Interlude
                        interlude={interlude}
                        onDismiss={onDismiss}
                        ui={{ 'ui.skip': 'Omitir' }}
                    />
                </AudioSettingsContext.Provider>
            </AssetContext.Provider>
        </InputProvider>
    );
}

describe('Interlude interactions', () => {
    it('plays and cleans up all configured audio channels', () => {
        const { unmount } = renderInterlude();

        expect(FakeAudio.instances.map((audio) => audio.src)).toEqual([
            '/cached/music.ogg',
            '/cached/voice.ogg',
            '/cached/wind.ogg',
            '/cached/rain.ogg',
        ]);
        expect(FakeAudio.instances[0]).toMatchObject({
            loop: true,
            volume: 0.2,
        });
        expect(FakeAudio.instances[1].volume).toBe(0.4);
        expect(FakeAudio.instances[2]).toMatchObject({
            loop: true,
            volume: 0.3,
        });

        unmount();
        for (const audio of FakeAudio.instances) {
            expect(audio.pause).toHaveBeenCalledOnce();
            expect(audio.src).toBe('');
        }
    });

    it('dismisses from the backdrop, skip button, and routed keyboard input', async () => {
        const onDismiss = vi.fn();
        const user = userEvent.setup();
        const { container } = renderInterlude(onDismiss);

        await user.click(screen.getByRole('button', { name: /Omitir/ }));
        fireEvent.click(container.querySelector('.interlude-overlay')!);
        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(onDismiss).toHaveBeenCalledTimes(3);

        fireEvent.click(
            container.querySelector('.interlude-scroll-container')!
        );
        expect(onDismiss).toHaveBeenCalledTimes(3);
    });

    it('supports wheel and routed directional scrolling without dismissing', () => {
        const onDismiss = vi.fn();
        const { container } = renderInterlude(onDismiss);
        const scroll = container.querySelector(
            '.interlude-scroll-container'
        ) as HTMLDivElement;

        fireEvent.wheel(scroll, { deltaY: 80 });
        expect(scroll.scrollTop).toBe(80);
        fireEvent.keyDown(document.body, { key: 'ArrowDown' });
        expect(scroll.scrollTop).toBe(120);
        fireEvent.keyDown(document.body, { key: 'ArrowUp' });
        expect(scroll.scrollTop).toBe(80);
        expect(onDismiss).not.toHaveBeenCalled();
    });
});
