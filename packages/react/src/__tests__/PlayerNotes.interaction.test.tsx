// @vitest-environment jsdom
/**
 * Real form interaction for PlayerNotes: typing into the title/text fields
 * and submitting calls onWrite with the trimmed values and clears the
 * fields; submitting with both fields empty does nothing; Delete calls
 * onDelete with the right note id.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlayerNotes } from '../components/PlayerNotes';

afterEach(cleanup);

describe('PlayerNotes real interaction', () => {
    it('typing a title and text and submitting calls onWrite trimmed, then clears the form', () => {
        const onWrite = vi.fn();
        render(
            <PlayerNotes notes={[]} onWrite={onWrite} onDelete={() => {}} />
        );

        const title = screen.getByPlaceholderText('Title') as HTMLInputElement;
        const text = screen.getByPlaceholderText(
            'Write a note...'
        ) as HTMLTextAreaElement;

        fireEvent.change(title, { target: { value: '  Suspicious key  ' } });
        fireEvent.change(text, {
            target: { value: '  Found in the cellar.  ' },
        });
        fireEvent.click(screen.getByText('Add Note'));

        expect(onWrite).toHaveBeenCalledExactlyOnceWith(
            'Suspicious key',
            'Found in the cellar.'
        );
        expect(title.value).toBe('');
        expect(text.value).toBe('');
    });

    it('submitting with both fields blank does not call onWrite', () => {
        const onWrite = vi.fn();
        render(
            <PlayerNotes notes={[]} onWrite={onWrite} onDelete={() => {}} />
        );
        fireEvent.click(screen.getByText('Add Note'));
        expect(onWrite).not.toHaveBeenCalled();
    });

    it('clicking Delete on a note calls onDelete with that note id', () => {
        const onDelete = vi.fn();
        render(
            <PlayerNotes
                notes={[
                    { id: 'n1', title: 'First', text: 'One' },
                    { id: 'n2', title: 'Second', text: 'Two' },
                ]}
                onWrite={() => {}}
                onDelete={onDelete}
            />
        );
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[1]);
        expect(onDelete).toHaveBeenCalledExactlyOnceWith('n2');
    });

    it('shows the custom localized labels when a ui catalog is supplied', () => {
        render(
            <PlayerNotes
                notes={[]}
                onWrite={() => {}}
                onDelete={() => {}}
                ui={{
                    'ui.notes': 'Notas',
                    'ui.note_title': 'Titulo',
                    'ui.note_text': 'Escribe una nota...',
                    'ui.add_note': 'Anadir nota',
                }}
            />
        );
        expect(screen.getByText('Notas')).toBeTruthy();
        expect(screen.getByPlaceholderText('Titulo')).toBeTruthy();
        expect(screen.getByPlaceholderText('Escribe una nota...')).toBeTruthy();
        expect(screen.getByText('Anadir nota')).toBeTruthy();
    });
});
