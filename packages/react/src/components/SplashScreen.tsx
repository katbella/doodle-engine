/**
 * SplashScreen - Brief studio/logo screen before the title.
 *
 * Reads assets from shell config when available.
 * All assets are optional. Renders gracefully with none.
 */

import { useEffect, useRef } from 'react';
import type { ShellConfig } from '@doodle-engine/core';
import { useAssetUrl } from '../hooks/useAsset';
import { screenBackgroundStyle } from './screenBackground';

export interface SplashScreenProps {
    /** Shell splash config (from game.yaml) */
    shell?: ShellConfig['splash'];
    /** Called when splash completes */
    onComplete: () => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    /** Playback volume from 0 to 1 (default: 0.8) */
    volume?: number;
    /** CSS class */
    className?: string;
}

export function SplashScreen({
    shell,
    onComplete,
    ui,
    volume = 0.8,
    className = '',
}: SplashScreenProps) {
    const displayDuration = shell?.duration ?? 2000;
    const displayLogo = useAssetUrl(shell?.logo);
    const background = useAssetUrl(shell?.background);
    const sound = useAssetUrl(shell?.sound);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const timer = setTimeout(onComplete, displayDuration);
        return () => clearTimeout(timer);
    }, [onComplete, displayDuration]);

    // Play splash sound if provided
    useEffect(() => {
        if (sound) {
            const audio = new Audio(sound);
            audio.volume = volume;
            audioRef.current = audio;
            audio.play().catch(() => {
                console.warn(
                    'Splash sound playback was blocked by the browser.'
                );
            });
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [sound, volume]);

    const bgStyle = screenBackgroundStyle(background);

    return (
        <div
            className={`splash-screen ${className}`}
            style={bgStyle}
            onClick={onComplete}
            role="button"
            aria-label={ui?.['ui.skip_splash'] ?? 'Skip splash screen'}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onComplete();
            }}
        >
            {displayLogo && (
                <img src={displayLogo} alt="" className="splash-logo" />
            )}
        </div>
    );
}
