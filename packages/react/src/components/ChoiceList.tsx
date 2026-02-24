/**
 * ChoiceList - Displays available dialogue choices
 */

import { useEffect } from 'react';
import type { SnapshotChoice } from '@doodle-engine/core';

export interface ChoiceListProps {
    choices: SnapshotChoice[];
    onSelectChoice: (choiceId: string) => void;
    className?: string;
}

export function ChoiceList({
    choices,
    onSelectChoice,
    className = '',
}: ChoiceListProps) {
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= choices.length) {
                onSelectChoice(choices[num - 1].id);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [choices, onSelectChoice]);

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
