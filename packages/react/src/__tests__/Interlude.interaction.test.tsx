// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function renderInterlude(
    onDismiss = vi.fn(),
    value: Parameters<typeof Interlude>[0]['interlude'] = interlude
) {
    return render(
        <InputProvider>
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
                    interlude={value}
                    onDismiss={onDismiss}
                    ui={{ 'ui.skip': 'Omitir' }}
                />
            </AudioSettingsContext.Provider>
        </InputProvider>
    );
}

describe('Interlude interactions', () => {
    it('renders a text-only interlude without a background image', () => {
        const { container } = renderInterlude(vi.fn(), {
            id: 'text_only',
            text: 'The room falls silent.',
            scroll: true,
            scrollSpeed: 30,
        });

        expect(
            (container.querySelector('.interlude-overlay') as HTMLElement).style
                .backgroundImage
        ).toBe('');
        expect(screen.getByText('The room falls silent.')).toBeTruthy();
    });

    it('uses the opening section as the chapter heading and preserves blank-line paragraphs', () => {
        const { container } = renderInterlude(vi.fn(), {
            id: 'chapter_one',
            text: 'Chapter One: A New Beginning\n\nThe road is empty.\nThe night is cold.\n\nThe lights are ahead.',
            scroll: false,
            scrollSpeed: 30,
        });

        expect(screen.getByText('Chapter One')).toBeTruthy();
        expect(
            screen.getByRole('heading', { name: 'A New Beginning' })
        ).toBeTruthy();
        const paragraphs = container.querySelectorAll('.interlude-text > p');
        expect(paragraphs).toHaveLength(2);
        expect(paragraphs[0].textContent).toBe(
            'The road is empty. The night is cold.'
        );
        expect(paragraphs[1].textContent).toBe('The lights are ahead.');
        expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    });

    it('delays every prose section and reveals Continue after the final one', () => {
        renderInterlude(vi.fn(), {
            id: 'chapter_one',
            text: 'Chapter One: A New Beginning\n\nFirst.\n\nSecond.\n\nThird.\n\nLast.',
            scroll: false,
            scrollSpeed: 30,
        });

        expect(screen.getByText('First.').style.animationDelay).toBe('0.6s');
        expect(screen.getByText('Third.').style.animationDelay).toBe('1.8s');
        expect(screen.getByText('Last.').style.animationDelay).toBe('2.4s');
        expect(
            screen.getByRole('button', { name: 'Continue' }).parentElement
                ?.style.animationDelay
        ).toBe('3s');
    });

    it('plays and cleans up all configured audio channels', () => {
        const { unmount } = renderInterlude();

        expect(FakeAudio.instances.map((audio) => audio.src)).toEqual([
            '/music.ogg',
            '/voice.ogg',
            '/wind.ogg',
            '/rain.ogg',
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
        Object.defineProperties(scroll, {
            clientHeight: { configurable: true, value: 100 },
            scrollHeight: { configurable: true, value: 300 },
        });

        fireEvent.wheel(scroll, { deltaY: 80 });
        expect(scroll.scrollTop).toBe(80);
        fireEvent.keyDown(document.body, { key: 'ArrowDown' });
        expect(scroll.scrollTop).toBe(120);
        fireEvent.keyDown(document.body, { key: 'ArrowUp' });
        expect(scroll.scrollTop).toBe(80);
        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('auto-scrolls the scroll container at the configured speed', () => {
        const frames: FrameRequestCallback[] = [];
        vi.stubGlobal(
            'requestAnimationFrame',
            vi.fn((callback: FrameRequestCallback) => {
                frames.push(callback);
                return frames.length;
            })
        );
        vi.stubGlobal('cancelAnimationFrame', vi.fn());

        const { container } = renderInterlude();
        const scroll = container.querySelector(
            '.interlude-scroll-container'
        ) as HTMLDivElement;
        const content = container.querySelector(
            '.interlude-scroll-content'
        ) as HTMLDivElement;
        Object.defineProperties(scroll, {
            clientHeight: { configurable: true, value: 100 },
        });
        Object.defineProperties(content, {
            scrollHeight: { configurable: true, value: 300 },
        });

        frames.shift()?.(1_000);
        frames.shift()?.(2_000);

        expect(scroll.scrollTop).toBe(30);
    });
});
