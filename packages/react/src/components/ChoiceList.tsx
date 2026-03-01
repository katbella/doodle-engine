/**
 * ChoiceList - Displays available dialogue choices, or a Continue button for text-only nodes
 */

import { useEffect } from 'react';
import type { SnapshotChoice } from '@doodle-engine/core';

export interface ChoiceListProps {
    choices: SnapshotChoice[];
    onSelectChoice: (choiceId: string) => void;
    /** Called when the player clicks Continue on a text-only node */
    onContinue?: () => void;
    /** Label for the Continue button (from snapshot.ui['ui.continue']) */
    continueLabel?: string;
    className?: string;
}

export function ChoiceList({
    choices,
    onSelectChoice,
    onContinue,
    continueLabel = 'Continue',
    className = '',
}: ChoiceListProps) {
    const showContinue = choices.length === 0 && onContinue !== undefined;

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (showContinue && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onContinue!();
                return;
            }
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= choices.length) {
                onSelectChoice(choices[num - 1].id);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [choices, onSelectChoice, onContinue, showContinue]);

    if (showContinue) {
        return (
            <div className={`choice-list ${className}`}>
                <button className="continue-button" onClick={onContinue}>
                    {continueLabel}
                </button>
            </div>
        );
    }

    if (choices.length === 0) {
        return null;
    }

    return (
        <div className={`choice-list ${className}`}>
            {choices.map((choice) => (
                <button
                    key={choice.id}
                    className="choice-button"
                    onClick={() => onSelectChoice(choice.id)}
                >
                    {choice.text}
                </button>
            ))}
        </div>
    );
}
