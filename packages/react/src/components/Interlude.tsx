/**
 * Interlude - Full-screen narrative text scene
 *
 * Displays a background image with scrolling text, like chapter cards
 * in Infinity Engine games such as Baldur's Gate. The player can skip at any time.
 */

import { useEffect, useRef, useCallback, useContext } from 'react';
import type { SnapshotInterlude } from '@doodle-engine/core';
import { AudioSettingsContext } from '../AudioSettingsContext';

export interface InterludeProps {
    interlude: SnapshotInterlude;
    onDismiss: () => void;
}

export function Interlude({ interlude, onDismiss }: InterludeProps) {
    const textRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number | null>(null);
    const scrollOffsetRef = useRef(0);
    const manualPausedRef = useRef(false);
    const lastTimeRef = useRef<number | null>(null);

    // Volumes from context if available (Interlude may be used outside AudioSettingsProvider)
    const audioSettings = useContext(AudioSettingsContext);
    const masterVol = audioSettings?.masterVolume ?? 1;
    const musicVol = audioSettings?.musicVolume ?? 0.7;
    const soundVol = audioSettings?.soundVolume ?? 0.8;
    const voiceVol = audioSettings?.voiceVolume ?? 1;

    // Music: loops for the duration of the interlude
    useEffect(() => {
        if (!interlude.music) return;
        const audio = new Audio(interlude.music);
        audio.loop = true;
        audio.volume = masterVol * musicVol;
        audio.play().catch(() => {});
        return () => { audio.pause(); audio.src = ''; };
    }, [interlude.music, masterVol, musicVol]);

    // Voice narration: plays once
    useEffect(() => {
        if (!interlude.voice) return;
        const audio = new Audio(interlude.voice);
        audio.volume = masterVol * voiceVol;
        audio.play().catch(() => {});
        return () => { audio.pause(); audio.src = ''; };
    }, [interlude.voice, masterVol, voiceVol]);

    // Ambient sounds: each loops independently
    useEffect(() => {
        if (!interlude.sounds?.length) return;
        const audios = interlude.sounds.map((src) => {
            const audio = new Audio(src);
            audio.loop = true;
            audio.volume = masterVol * soundVol;
            audio.play().catch(() => {});
            return audio;
        });
        return () => { audios.forEach((a) => { a.pause(); a.src = ''; }); };
    }, [interlude.sounds, masterVol, soundVol]);

    // Auto-scroll: refs update the DOM directly to avoid per-frame React re-renders
    useEffect(() => {
        if (!interlude.scroll) return;

        const step = (timestamp: number) => {
            if (manualPausedRef.current) {
                animRef.current = null;
                return;
            }

            if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
            const elapsed = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            const textEl = textRef.current;
            const containerEl = containerRef.current;
            if (textEl && containerEl) {
                const maxScroll = textEl.scrollHeight - containerEl.clientHeight;
                if (scrollOffsetRef.current < maxScroll) {
                    scrollOffsetRef.current = Math.min(
                        scrollOffsetRef.current + interlude.scrollSpeed * elapsed,
                        maxScroll
                    );
                    containerEl.scrollTop = scrollOffsetRef.current;
                } else {
                    animRef.current = null;
                    return; // Reached the end, stop
                }
            }

            animRef.current = requestAnimationFrame(step);
        };

        animRef.current = requestAnimationFrame(step);

        return () => {
            if (animRef.current !== null) {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
            }
        };
    }, [interlude.scroll, interlude.scrollSpeed]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        manualPausedRef.current = true;
        scrollOffsetRef.current = Math.max(0, scrollOffsetRef.current + e.deltaY);
        if (containerRef.current) containerRef.current.scrollTop = scrollOffsetRef.current;
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                manualPausedRef.current = true;
                scrollOffsetRef.current = Math.max(
                    0,
                    scrollOffsetRef.current + (e.key === 'ArrowDown' ? 40 : -40)
                );
                if (containerRef.current) containerRef.current.scrollTop = scrollOffsetRef.current;
            }
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                onDismiss();
            }
        },
        [onDismiss]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div
            className="interlude-overlay"
            style={{ backgroundImage: `url(${interlude.background})` }}
            onClick={onDismiss}
        >
            {interlude.banner && (
                <img
                    className="interlude-banner"
                    src={interlude.banner}
                    alt=""
                    aria-hidden="true"
                />
            )}

            <div
                ref={containerRef}
                className="interlude-scroll-container"
                onWheel={handleWheel}
                onClick={(e) => e.stopPropagation()}
            >
                <div ref={textRef} className="interlude-text">
                    {interlude.text.split('\n').map((line, i) => (
                        <p key={i}>{line || '\u00A0'}</p>
                    ))}
                </div>
            </div>

            <button className="interlude-skip-button" onClick={onDismiss}>
                Skip &raquo;
            </button>
        </div>
    );
}
