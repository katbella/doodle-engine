// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ChoiceList } from '../components/ChoiceList';

afterEach(cleanup);

const choices = [
    { id: 'ask', text: 'Ask about the news' },
    { id: 'leave', text: 'Leave' },
];

describe('ChoiceList real interaction', () => {
    it('clicking a choice button calls onSelectChoice with its id', () => {
        const onSelectChoice = vi.fn();
        render(
            <ChoiceList
                choices={choices}
                onSelectChoice={onSelectChoice}
                onContinue={() => {}}
            />
        );
        fireEvent.click(screen.getByText('Leave'));
        expect(onSelectChoice).toHaveBeenCalledExactlyOnceWith('leave');
    });

    it('pressing "2" on the keyboard selects the second choice', () => {
        const onSelectChoice = vi.fn();
        render(
            <ChoiceList
                choices={choices}
                onSelectChoice={onSelectChoice}
                onContinue={() => {}}
            />
        );
        fireEvent.keyDown(document.body, { key: '2' });
        expect(onSelectChoice).toHaveBeenCalledExactlyOnceWith('leave');
    });

    it('pressing a number beyond the choice count does nothing', () => {
        const onSelectChoice = vi.fn();
        render(
            <ChoiceList
                choices={choices}
                onSelectChoice={onSelectChoice}
                onContinue={() => {}}
            />
        );
        fireEvent.keyDown(document.body, { key: '9' });
        expect(onSelectChoice).not.toHaveBeenCalled();
    });

    it('with no choices, shows a Continue button that calls onContinue when clicked', () => {
        const onContinue = vi.fn();
        render(
            <ChoiceList
                choices={[]}
                onSelectChoice={() => {}}
                onContinue={onContinue}
                continueLabel="Keep going"
            />
        );
        fireEvent.click(screen.getByText('Keep going'));
        expect(onContinue).toHaveBeenCalledOnce();
    });

    it('with no choices, pressing Enter calls onContinue', () => {
        const onContinue = vi.fn();
        render(
            <ChoiceList
                choices={[]}
                onSelectChoice={() => {}}
                onContinue={onContinue}
            />
        );
        fireEvent.keyDown(document.body, { key: 'Enter' });
        expect(onContinue).toHaveBeenCalledOnce();
    });

    it('typing a digit into a text field does not trigger a choice shortcut', () => {
        // Regression guard for shouldIgnoreKeyboardEvent: number keys are
        // dialogue-choice shortcuts, so they must not fire while the player
        // is typing in an unrelated text field (e.g. the notes panel).
        const onSelectChoice = vi.fn();
        render(
            <>
                <input data-testid="notes-field" />
                <ChoiceList
                    choices={choices}
                    onSelectChoice={onSelectChoice}
                    onContinue={() => {}}
                />
            </>
        );
        const input = screen.getByTestId('notes-field');
        input.focus();
        fireEvent.keyDown(input, { key: '1' });
        expect(onSelectChoice).not.toHaveBeenCalled();
    });
});
