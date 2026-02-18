/**
 * ChoiceList - Displays available dialogue choices
 */

import React from 'react';
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
