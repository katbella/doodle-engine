/**
 * useUISounds - Manages UI chrome sounds (clicks, menus)
 *
 * Separate from useAudioManager which handles game content audio.
 * This hook is for renderer UI interactions only.
 */

import { useRef, useState, useCallback } from 'react';
import { useOptionalAssetContext } from '../AssetProvider';

export interface UISoundConfig {
    /** Whether UI sounds are enabled */
    enabled?: boolean;
    /** Base URL for UI sound files */
    basePath?: string;
    /** Volume for UI sounds (0-1) */
    volume?: number;
    /** Sound file mappings */
    sounds?: {
        click?: string;
        hover?: string;
        menuOpen?: string;
        menuClose?: string;
    };
}

export interface UISoundControls {
    /** Play the click sound */
    playClick: () => void;
    /** Play the hover sound */
    playHover: () => void;
    /** Play the menu open sound */
    playMenuOpen: () => void;
    /** Play the menu close sound */
    playMenuClose: () => void;
    /** Play a sound by key */
    playSound: (key: string) => void;
    /** Enable or disable UI sounds */
    setEnabled: (enabled: boolean) => void;
    /** Set UI sound volume */
    setVolume: (volume: number) => void;
    /** Whether UI sounds are currently enabled */
    enabled: boolean;
    /** Current volume */
    volume: number;
}

const DEFAULT_SOUNDS = {
    click: 'click.ogg',
    hover: 'hover.ogg',
    menuOpen: 'menu_open.ogg',
    menuClose: 'menu_close.ogg',
};

export function resolveSoundPath(basePath: string, file: string): string {
    if (
        file.startsWith('/') ||
        file.startsWith('http://') ||
        file.startsWith('https://') ||
        file.startsWith('data:') ||
        file.startsWith('blob:')
    ) {
        return file;
    }
    return `${basePath.replace(/\/$/, '')}/${file}`;
}

export function useUISounds(config: UISoundConfig = {}): UISoundControls {
    const {
        enabled: initialEnabled = true,
        basePath = 'assets/audio/ui',
        volume: initialVolume = 0.5,
        sounds = {},
    } = config;

    const [enabled, setEnabled] = useState(initialEnabled);
    const [volume, setVolume] = useState(initialVolume);
    const soundMap = useRef({ ...DEFAULT_SOUNDS, ...sounds });
    const assetContext = useOptionalAssetContext();

    const play = useCallback(
        (file: string) => {
            if (!enabled || !file) return;
            const path = resolveSoundPath(basePath, file);
            const audio = new Audio(assetContext?.getAssetUrl(path) ?? path);
            audio.volume = volume;
            audio.play().catch(() => {
                // Ignore autoplay restrictions
            });
        },
        [enabled, volume, basePath, assetContext]
    );

    const playSound = useCallback(
        (key: string) => {
            const file = soundMap.current[key as keyof typeof DEFAULT_SOUNDS];
            if (file) play(file);
        },
        [play]
    );

    const playClick = useCallback(() => play(soundMap.current.click), [play]);
    const playHover = useCallback(() => play(soundMap.current.hover), [play]);
    const playMenuOpen = useCallback(
        () => play(soundMap.current.menuOpen),
        [play]
    );
    const playMenuClose = useCallback(
        () => play(soundMap.current.menuClose),
        [play]
    );

    return {
        playClick,
        playHover,
        playMenuOpen,
        playMenuClose,
        playSound,
        setEnabled,
        setVolume,
        enabled,
        volume,
    };
}
