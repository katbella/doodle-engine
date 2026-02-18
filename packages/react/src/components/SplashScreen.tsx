/**
 * SplashScreen - Brief studio/logo screen before the title.
 *
 * Reads assets from shell config when available.
 * All assets are optional — renders gracefully with none.
 */

import { useEffect, useRef } from 'react';
import type { ShellConfig } from '@doodle-engine/core';

export interface SplashScreenProps {
    /** Shell splash config (from game.yaml) */
    shell?: ShellConfig['splash'];
    /** Called when splash completes */
    onComplete: () => void;
    /** CSS class */
    className?: string;
}

export function SplashScreen({
    shell,
    onComplete,
    className = '',
}: SplashScreenProps) {
    const displayDuration = shell?.duration ?? 2000;
    const displayLogo = shell?.logo;
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const timer = setTimeout(onComplete, displayDuration);
        return () => clearTimeout(timer);
    }, [onComplete, displayDuration]);

    // Play splash sound if provided
    useEffect(() => {
        if (shell?.sound) {
            const audio = new Audio(shell.sound);
            audio.volume = 0.8;
            audioRef.current = audio;
            audio.play().catch(() => {
                // Autoplay may be blocked — fail silently
            });
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [shell?.sound]);

    const bgStyle = shell?.background
        ? { backgroundImage: `url(${shell.background})` }
        : undefined;

    return (
        <div
            className={`splash-screen ${className}`}
            style={bgStyle}
            onClick={onComplete}
            role="button"
            aria-label="Skip splash screen"
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
