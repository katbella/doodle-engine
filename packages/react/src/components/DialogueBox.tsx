/**
 * DialogueBox - Displays current dialogue node
 */

import type { SnapshotDialogue } from '@doodle-engine/core';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useInputAction } from '../input/InputRouter';
import { FormattedText } from './FormattedText';

export interface DialogueBoxProps {
    dialogue: SnapshotDialogue;
    className?: string;
    children?: ReactNode;
}

const DIALOGUE_KEYBOARD_SCROLL_FRACTION = 0.8;
const DIALOGUE_KEYBOARD_SCROLL_MINIMUM = 40;

function scrollDialogue(
    container: HTMLDivElement,
    direction: 'next' | 'previous'
): boolean {
    const maxScroll = Math.max(
        0,
        container.scrollHeight - container.clientHeight
    );
    if (maxScroll === 0) {
        return false;
    }

    const distance = Math.max(
        DIALOGUE_KEYBOARD_SCROLL_MINIMUM,
        Math.floor(container.clientHeight * DIALOGUE_KEYBOARD_SCROLL_FRACTION)
    );
    const delta = direction === 'next' ? distance : -distance;
    container.scrollTop = Math.min(
        maxScroll,
        Math.max(0, container.scrollTop + delta)
    );
    return true;
}

export function DialogueBox({
    dialogue,
    className = '',
    children,
}: DialogueBoxProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const speakerId = useId();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [dialogue.speaker, dialogue.text]);

    useInputAction(
        ({ command }) => {
            if (command !== 'next' && command !== 'previous') {
                return false;
            }

            const container = scrollRef.current;
            return container ? scrollDialogue(container, command) : false;
        },
        { priority: 10 }
    );

    return (
        <div className={`dialogue-stage ${className}`}>
            <div className="dialogue-portrait-panel">
                <div className="dialogue-portrait">
                    {dialogue.portrait ? (
                        <img
                            className="dialogue-portrait-image"
                            src={dialogue.portrait}
                            alt={dialogue.speakerName}
                        />
                    ) : (
                        <span
                            className="dialogue-portrait-placeholder"
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>

            <div className="dialogue-container">
                <div
                    ref={scrollRef}
                    className="dialogue-box doodle-scroll"
                    tabIndex={0}
                    aria-labelledby={speakerId}
                >
                    <div className="dialogue-content">
                        <div id={speakerId} className="dialogue-speaker">
                            {dialogue.speakerName}
                        </div>
                        <div className="dialogue-text">
                            <FormattedText text={dialogue.text} />
                        </div>
                    </div>
                    {children}
                </div>
                <div className="dialogue-hem" aria-hidden="true" />
            </div>
        </div>
    );
}
