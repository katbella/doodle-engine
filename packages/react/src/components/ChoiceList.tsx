/**
 * ChoiceList - Displays available dialogue choices, or a Continue button for text-only nodes
 */

import type { SnapshotChoice } from '@doodle-engine/core';
import { useInputAction, type InputCommand } from '../input/InputRouter';
import { FormattedText } from './FormattedText';

export interface ChoiceListProps {
    choices: SnapshotChoice[];
    onSelectChoice: (choiceId: string) => void;
    /** Called when the player clicks Continue on a text-only node */
    onContinue: () => void;
    /** Label for the Continue button (from snapshot.ui['ui.continue']) */
    continueLabel?: string;
    className?: string;
}

export type ChoiceListInputResult =
    | { type: 'continue' }
    | { type: 'selectChoice'; choiceId: string }
    | null;

export function resolveChoiceListInput(
    choices: SnapshotChoice[],
    command: InputCommand,
    choiceIndex?: number
): ChoiceListInputResult {
    if (
        choices.length === 0 &&
        (command === 'confirm' || command === 'continue')
    ) {
        return { type: 'continue' };
    }

    if (
        choiceIndex !== undefined &&
        choiceIndex >= 0 &&
        choiceIndex < choices.length
    ) {
        return {
            type: 'selectChoice',
            choiceId: choices[choiceIndex].id,
        };
    }

    return null;
}

export function ChoiceList({
    choices,
    onSelectChoice,
    onContinue,
    continueLabel = 'Continue',
    className = '',
}: ChoiceListProps) {
    useInputAction(
        ({ command, choiceIndex }) => {
            const result = resolveChoiceListInput(
                choices,
                command,
                choiceIndex
            );

            if (result?.type === 'continue') {
                onContinue();
                return true;
            }

            if (result?.type === 'selectChoice') {
                onSelectChoice(result.choiceId);
                return true;
            }

            return false;
        },
        { priority: 0 }
    );

    const showContinue = choices.length === 0;

    if (showContinue) {
        return (
            <div className={`choice-list ${className}`}>
                <div className="continue-button-row">
                    <button className="continue-button" onClick={onContinue}>
                        {continueLabel}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`choice-list ${className}`}>
            {choices.map((choice, index) => (
                <button
                    key={choice.id}
                    className="choice-button"
                    onClick={() => onSelectChoice(choice.id)}
                >
                    <span className="choice-button-number" aria-hidden="true">
                        {index + 1}.
                    </span>
                    <span className="choice-button-label">
                        <FormattedText text={choice.text} />
                    </span>
                </button>
            ))}
        </div>
    );
}
