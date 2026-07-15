// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameTime } from '../components/GameTime';
import { NotificationArea } from '../components/NotificationArea';
import { SettingsPanel } from '../components/SettingsPanel';
import { SplashScreen } from '../components/SplashScreen';
import { VideoPlayer } from '../components/VideoPlayer';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('display component behavior', () => {
    it('formats numeric, short, localized, and every narrative time period', () => {
        const { rerender } = render(<GameTime time={{ day: 2, hour: 4 }} />);
        expect(screen.getByText('Day 2, 04:00')).toBeTruthy();

        rerender(<GameTime time={{ day: 2, hour: 9 }} format="short" />);
        expect(screen.getByText('D2 09:00')).toBeTruthy();

        const periods = [
            [6, 'Dawn'],
            [9, 'Morning'],
            [12, 'Midday'],
            [15, 'Afternoon'],
            [18, 'Evening'],
            [21, 'Dusk'],
            [23, 'Night'],
        ] as const;
        for (const [hour, label] of periods) {
            rerender(
                <GameTime
                    time={{ day: 3, hour }}
                    format="narrative"
                    ui={{ 'ui.day': 'Jour {day}' }}
                />
            );
            expect(screen.getByText(`Jour 3, ${label}`)).toBeTruthy();
        }
    });

    it('renders notifications only when there are messages', () => {
        const { container, rerender } = render(
            <NotificationArea notifications={[]} />
        );
        expect(container.firstChild).toBeNull();

        rerender(
            <NotificationArea
                notifications={['Quest updated', 'Item received']}
                className="custom"
            />
        );
        expect(screen.getByText('Quest updated')).toBeTruthy();
        expect(screen.getByText('Item received')).toBeTruthy();
        expect(container.querySelector('.custom')).toBeTruthy();
    });

    it('changes all settings, language, UI sound volume, and closes', async () => {
        const user = userEvent.setup();
        const setters = {
            master: vi.fn(),
            music: vi.fn(),
            sound: vi.fn(),
            voice: vi.fn(),
            ui: vi.fn(),
            locale: vi.fn(),
            back: vi.fn(),
        };
        render(
            <SettingsPanel
                audio={{
                    masterVolume: 1,
                    musicVolume: 0.7,
                    soundVolume: 0.8,
                    voiceVolume: 1,
                    setMasterVolume: setters.master,
                    setMusicVolume: setters.music,
                    setSoundVolume: setters.sound,
                    setVoiceVolume: setters.voice,
                }}
                uiSoundControls={{
                    playClick: vi.fn(),
                    playHover: vi.fn(),
                    playMenuOpen: vi.fn(),
                    playMenuClose: vi.fn(),
                    playSound: vi.fn(),
                    setEnabled: vi.fn(),
                    setVolume: setters.ui,
                    enabled: true,
                    volume: 0.5,
                }}
                availableLocales={[
                    { code: 'en', label: 'English' },
                    { code: 'es', label: 'Español' },
                ]}
                currentLocale="en"
                onLocaleChange={setters.locale}
                onBack={setters.back}
            />
        );

        const sliders = screen.getAllByRole('slider');
        for (const slider of sliders)
            fireEvent.change(slider, { target: { value: '0.25' } });
        expect(setters.master).toHaveBeenCalledWith(0.25);
        expect(setters.music).toHaveBeenCalledWith(0.25);
        expect(setters.sound).toHaveBeenCalledWith(0.25);
        expect(setters.voice).toHaveBeenCalledWith(0.25);
        expect(setters.ui).toHaveBeenCalledWith(0.25);

        await user.selectOptions(screen.getByRole('combobox'), 'es');
        expect(setters.locale).toHaveBeenCalledWith('es');
        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(setters.back).toHaveBeenCalledOnce();
    });

    it('does not render a language chooser without multiple usable locales', () => {
        const audio = {
            masterVolume: 1,
            musicVolume: 1,
            soundVolume: 1,
            voiceVolume: 1,
            setMasterVolume: vi.fn(),
            setMusicVolume: vi.fn(),
            setSoundVolume: vi.fn(),
            setVoiceVolume: vi.fn(),
        };
        const { rerender } = render(
            <SettingsPanel
                audio={audio}
                availableLocales={[{ code: 'en', label: 'English' }]}
                onLocaleChange={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.queryByRole('combobox')).toBeNull();
        rerender(
            <SettingsPanel
                audio={audio}
                availableLocales={[
                    { code: 'en', label: 'English' },
                    { code: 'es', label: 'Español' },
                ]}
                onBack={vi.fn()}
            />
        );
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('completes a splash by timer, click, and keyboard', async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const { rerender } = render(
            <SplashScreen shell={{ duration: 25 }} onComplete={onComplete} />
        );
        vi.advanceTimersByTime(25);
        expect(onComplete).toHaveBeenCalledOnce();

        const splash = screen.getByRole('button', {
            name: 'Skip splash screen',
        });
        fireEvent.click(splash);
        fireEvent.keyDown(splash, { key: 'Enter' });
        fireEvent.keyDown(splash, { key: ' ' });
        fireEvent.keyDown(splash, { key: 'Escape' });
        expect(onComplete).toHaveBeenCalledTimes(4);

        rerender(
            <SplashScreen
                shell={{ duration: 100 }}
                onComplete={onComplete}
                ui={{ 'ui.skip_splash': 'Skip intro' }}
            />
        );
        expect(screen.getByRole('button', { name: 'Skip intro' })).toBeTruthy();
    });

    it('completes video playback from both the media event and skip button', async () => {
        const onComplete = vi.fn();
        const user = userEvent.setup();
        const { container, rerender } = render(
            <VideoPlayer
                src="/intro.mp4"
                onComplete={onComplete}
                ui={{ 'ui.skip': 'Omitir' }}
            />
        );
        fireEvent.ended(container.querySelector('video')!);
        await user.click(screen.getByRole('button', { name: 'Omitir' }));
        expect(onComplete).toHaveBeenCalledTimes(2);
        expect(within(container).getByText('Omitir')).toBeTruthy();

        rerender(<VideoPlayer src="/fallback.mp4" onComplete={onComplete} />);
        expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
        expect(container.querySelector('video')?.getAttribute('src')).toBe(
            '/fallback.mp4'
        );
    });
});
