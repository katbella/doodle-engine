/**
 * Interlude - Full-screen narrative text scene
 *
 * Displays scrolling text with optional art and audio. The player can skip at
 * any time.
 */

import {
    useEffect,
    useRef,
    useCallback,
    useContext,
    type CSSProperties,
} from 'react';
import type { SnapshotInterlude } from '@doodle-engine/core';
import { AudioSettingsContext } from '../AudioSettingsContext';
import { useInputAction, type InputCommand } from '../input/InputRouter';
import { uiText } from '../uiText';

export interface InterludeProps {
    interlude: SnapshotInterlude;
    onDismiss: () => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
}

export type InterludeInputResult =
    | 'dismiss'
    | 'scrollNext'
    | 'scrollPrevious'
    | null;

export function resolveInterludeInput(
    command: InputCommand
): InterludeInputResult {
    if (command === 'next') {
        return 'scrollNext';
    }
    if (command === 'previous') {
        return 'scrollPrevious';
    }
    if (
        command === 'confirm' ||
        command === 'continue' ||
        command === 'cancel'
    ) {
        return 'dismiss';
    }

    return null;
}

export function Interlude({ interlude, onDismiss, ui }: InterludeProps) {
    const contentRef = useRef<HTMLDivElement>(null);
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
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, [interlude.music, masterVol, musicVol]);

    // Voice narration: plays once
    useEffect(() => {
        if (!interlude.voice) return;
        const audio = new Audio(interlude.voice);
        audio.volume = masterVol * voiceVol;
        audio.play().catch(() => {});
        return () => {
            audio.pause();
            audio.src = '';
        };
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
        return () => {
            audios.forEach((a) => {
                a.pause();
                a.src = '';
            });
        };
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

            const textEl = contentRef.current;
            const containerEl = containerRef.current;
            if (textEl && containerEl) {
                const maxScroll =
                    textEl.scrollHeight - containerEl.clientHeight;
                if (scrollOffsetRef.current < maxScroll) {
                    scrollOffsetRef.current = Math.min(
                        scrollOffsetRef.current +
                            interlude.scrollSpeed * elapsed,
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
        const container = containerRef.current;
        if (!container) return;
        const maxScroll = Math.max(
            0,
            container.scrollHeight - container.clientHeight
        );
        scrollOffsetRef.current = Math.min(
            maxScroll,
            Math.max(0, scrollOffsetRef.current + e.deltaY)
        );
        container.scrollTop = scrollOffsetRef.current;
    }, []);

    const scrollBy = useCallback((delta: number) => {
        manualPausedRef.current = true;
        const container = containerRef.current;
        if (!container) return;
        const maxScroll = Math.max(
            0,
            container.scrollHeight - container.clientHeight
        );
        scrollOffsetRef.current = Math.min(
            maxScroll,
            Math.max(0, scrollOffsetRef.current + delta)
        );
        container.scrollTop = scrollOffsetRef.current;
    }, []);

    const sections = interlude.text
        .trim()
        .split(/\n\s*\n+/)
        .map((section) => section.replace(/\s*\n\s*/g, ' ').trim())
        .filter(Boolean);
    const headingSource = sections.length > 1 ? sections.shift()! : '';
    const headingParts = headingSource.match(/^([^:]+):\s*(.+)$/);
    const eyebrow = headingParts?.[1];
    const title = headingParts?.[2] ?? headingSource;
    const revealDelay = (index: number): CSSProperties => ({
        animationDelay: `${((index + 1) * 6) / 10}s`,
    });

    useInputAction(
        ({ command }) => {
            const result = resolveInterludeInput(command);

            if (result === 'scrollNext' || result === 'scrollPrevious') {
                scrollBy(result === 'scrollNext' ? 40 : -40);
                return true;
            }

            if (result === 'dismiss') {
                onDismiss();
                return true;
            }

            return false;
        },
        { priority: 300 }
    );

    return (
        <div className="interlude-overlay" onClick={onDismiss}>
            <div
                className="interlude-background"
                style={
                    interlude.background
                        ? {
                              backgroundImage: `url(${interlude.background})`,
                          }
                        : undefined
                }
                aria-hidden="true"
            />
            {interlude.banner && (
                <img
                    className="interlude-banner"
                    src={interlude.banner}
                    alt=""
                    aria-hidden="true"
                />
            )}
            <div className="interlude-vignette" aria-hidden="true" />

            <div
                ref={containerRef}
                className="interlude-scroll-container"
                onWheel={handleWheel}
                onScroll={(event) => {
                    scrollOffsetRef.current = event.currentTarget.scrollTop;
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div ref={contentRef} className="interlude-scroll-content">
                    {eyebrow && (
                        <div className="interlude-eyebrow">
                            <span
                                className="interlude-eyebrow-rule"
                                aria-hidden="true"
                            />
                            <span className="interlude-eyebrow-text">
                                {eyebrow}
                            </span>
                            <span
                                className="interlude-eyebrow-rule is-trailing"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                    {title && <h1 className="interlude-title">{title}</h1>}
                    <div className="interlude-text">
                        {sections.map((section, index) => (
                            <p key={index} style={revealDelay(index)}>
                                {section}
                            </p>
                        ))}
                    </div>
                    <div
                        className="interlude-dismiss"
                        style={revealDelay(sections.length)}
                    >
                        <button
                            className="title-button is-primary"
                            type="button"
                            onClick={onDismiss}
                        >
                            <span className="title-button-label">
                                {uiText(ui, 'ui.continue')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <button
                className="interlude-skip-button"
                onClick={(event) => {
                    event.stopPropagation();
                    onDismiss();
                }}
            >
                {uiText(ui, 'ui.skip')}
            </button>
        </div>
    );
}
