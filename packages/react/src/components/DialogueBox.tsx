/**
 * DialogueBox - Displays current dialogue node
 */

import type { SnapshotDialogue } from '@doodle-engine/core';
import { AssetImage } from './AssetImage';
import { FormattedText } from './FormattedText';

export interface DialogueBoxProps {
    dialogue: SnapshotDialogue;
    className?: string;
}

export function DialogueBox({ dialogue, className = '' }: DialogueBoxProps) {
    return (
        <div className={`dialogue-box ${className}`}>
            {dialogue.portrait && (
                <div className="dialogue-portrait">
                    <AssetImage
                        src={dialogue.portrait}
                        alt={dialogue.speakerName}
                    />
                </div>
            )}

            <div className="dialogue-content">
                <div className="dialogue-speaker">{dialogue.speakerName}</div>
                <div className="dialogue-text">
                    <FormattedText text={dialogue.text} />
                </div>
            </div>
        </div>
    );
}
