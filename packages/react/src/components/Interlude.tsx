/**
 * Interlude - Full-screen narrative text scene
 *
 * Displays a background image with scrolling text, like chapter cards
 * in Baldur's Gate. The player can skip at any time.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SnapshotInterlude } from '@doodle-engine/core';

export interface InterludeProps {
    interlude: SnapshotInterlude;
    onDismiss: () => void;
}

export function Interlude({ interlude, onDismiss }: InterludeProps) {
    const textRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const [manualScrollPaused, setManualScrollPaused] = useState(false);
    const [scrollOffset, setScrollOffset] = useState(0);

    const speed = interlude.scrollSpeed;
    const shouldScroll = interlude.scroll;

    // Auto-scroll animation
    useEffect(() => {
        if (!shouldScroll || manualScrollPaused) {
            if (animRef.current !== null) {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
            }
            lastTimeRef.current = null;
            return;
        }

        const step = (timestamp: number) => {
            if (lastTimeRef.current === null) {
                lastTimeRef.current = timestamp;
            }
            const elapsed = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            setScrollOffset((prev) => {
                const textEl = textRef.current;
                const containerEl = containerRef.current;
                if (!textEl || !containerEl) return prev;
                const maxScroll =
                    textEl.scrollHeight - containerEl.clientHeight;
                if (prev >= maxScroll) {
                    return prev;
                }
                return prev + speed * elapsed;
            });

            animRef.current = requestAnimationFrame(step);
        };

        animRef.current = requestAnimationFrame(step);

        return () => {
            if (animRef.current !== null) {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
            }
        };
    }, [shouldScroll, manualScrollPaused, speed]);

    // Apply scroll offset to container
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = scrollOffset;
        }
    }, [scrollOffset]);

    // Wheel/key manual scroll pauses auto-scroll
    const handleWheel = useCallback((e: React.WheelEvent) => {
        setManualScrollPaused(true);
        setScrollOffset((prev) => Math.max(0, prev + e.deltaY));
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setManualScrollPaused(true);
                setScrollOffset((prev) =>
                    Math.max(0, prev + (e.key === 'ArrowDown' ? 40 : -40))
                );
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
