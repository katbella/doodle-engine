/**
 * DialogueBox - Displays current dialogue node
 */

import type { SnapshotDialogue } from '@doodle-engine/core';
import type { ReactNode } from 'react';
import { FormattedText } from './FormattedText';

export interface DialogueBoxProps {
    dialogue: SnapshotDialogue;
    className?: string;
    children?: ReactNode;
}

export function DialogueBox({
    dialogue,
    className = '',
    children,
}: DialogueBoxProps) {
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
                <div className="dialogue-box doodle-scroll">
                    <div className="dialogue-content">
                        <div className="dialogue-speaker">
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
