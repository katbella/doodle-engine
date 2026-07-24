// @vitest-environment jsdom

import { useMemo, useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlagVarNotes } from '../../../../shared/project';
import type { Reference } from '@doodle-engine/core';
import {
    attachFlagVarNotes,
    type BaseFlagVarSummary,
    type FlagVarKind,
    type NameCatalog,
} from '../../lib/flag-vars';
import {
    FlagsVariablesPage,
    type FlagVarSelection,
} from '../FlagsVariablesPage';

afterEach(cleanup);

const base: BaseFlagVarSummary[] = [
    {
        kind: 'flag',
        id: 'metGuide',
        count: 2,
        setCount: 1,
        checkCount: 1,
        references: [
            {
                file: 'content/dialogues/intro.dlg',
                where: 'dialogue "intro" node "start"',
                access: 'check',
            },
            {
                file: 'content/game.yaml',
                where: 'game config start flags',
                access: 'set',
            },
        ],
    },
    {
        kind: 'flag',
        id: 'metGiude',
        count: 1,
        setCount: 0,
        checkCount: 1,
        references: [],
    },
    {
        kind: 'flag',
        id: 'quest_intro_done',
        count: 1,
        setCount: 1,
        checkCount: 0,
        references: [],
    },
    {
        kind: 'variable',
        id: 'gold',
        count: 4,
        setCount: 2,
        checkCount: 2,
        references: [],
    },
];

function Harness({
    onRename,
    onOpenReference,
    notesError = null,
    summaries = base,
    initialNotes = {
        flags: { metGude: 'Stale guide note.' },
        variables: { gold: 'Current coins.' },
    },
}: {
    onRename: (kind: FlagVarKind, id: string) => void;
    onOpenReference: (reference: Reference) => void;
    notesError?: string | null;
    summaries?: BaseFlagVarSummary[];
    initialNotes?: FlagVarNotes;
}) {
    const [notes, setNotes] = useState<FlagVarNotes>(initialNotes);
    const [selected, setSelected] = useState<FlagVarSelection | null>(null);
    const named = useMemo(
        () => attachFlagVarNotes(summaries, notes),
        [notes, summaries]
    );
    const catalog: NameCatalog = { ...named, stats: [] };
    const updateNote = (kind: FlagVarKind, id: string, note: string) => {
        const section = kind === 'flag' ? 'flags' : 'variables';
        setNotes((current) => {
            const values = { ...current[section] };
            if (note) values[id] = note;
            else delete values[id];
            return { ...current, [section]: values };
        });
    };
    const moveNote = (kind: FlagVarKind, from: string, to: string) => {
        const section = kind === 'flag' ? 'flags' : 'variables';
        setNotes((current) => {
            const values = {
                ...current[section],
                [to]: current[section][from],
            };
            delete values[from];
            return { ...current, [section]: values };
        });
    };
    return (
        <FlagsVariablesPage
            catalog={catalog}
            notes={notes}
            notesError={notesError}
            selected={selected}
            onSelect={setSelected}
            onRename={onRename}
            onNoteChange={updateNote}
            onNoteMove={moveNote}
            onOpenReference={onOpenReference}
        />
    );
}

describe('FlagsVariablesPage', () => {
    it('reviews health, searches groups, edits notes, renames, and opens exact uses', async () => {
        const user = userEvent.setup();
        const onRename = vi.fn<(kind: FlagVarKind, id: string) => void>();
        const onOpenReference = vi.fn<(reference: Reference) => void>();
        render(
            <Harness onRename={onRename} onOpenReference={onOpenReference} />
        );

        const health = screen.getByRole('region', { name: 'Name health' });
        expect(
            within(health)
                .getByRole('button', {
                    name: /Checked, never set/,
                })
                .getAttribute('aria-expanded')
        ).toBe('true');
        expect(
            within(health).getByRole('button', {
                name: /Set, never checked/,
            })
        ).toBeTruthy();
        expect(
            within(health).getByRole('button', {
                name: /Possible name collisions/,
            })
        ).toBeTruthy();
        expect(
            within(health).getByRole('button', { name: /Orphaned notes/ })
        ).toBeTruthy();
        expect(within(health).getByText('4 findings')).toBeTruthy();
        expect(
            screen.queryByText('Select a flag or variable to inspect it.')
        ).toBeNull();

        await user.click(
            within(health).getByRole('button', { name: /Orphaned notes/ })
        );
        await user.click(
            screen.getByRole('button', { name: 'Move note to metGuide' })
        );
        expect(screen.queryByText('metGude')).toBeNull();

        const list = screen.getByRole('region', { name: 'Project names' });
        const metGuide = within(list).getByRole('button', { name: /metGuide/ });
        await user.click(metGuide);
        expect(metGuide.getAttribute('aria-current')).toBe('true');
        expect(screen.getByText('Set in 1 place, checked in 1')).toBeTruthy();
        expect(screen.getByDisplayValue('Stale guide note.')).toBeTruthy();

        const note = screen.getByRole('textbox', { name: 'Note' });
        await user.clear(note);
        await user.type(note, 'Guide introduction is complete.');
        await user.click(screen.getByRole('button', { name: 'Save note' }));
        expect(
            await screen.findByDisplayValue('Guide introduction is complete.')
        ).toBeTruthy();
        expect(document.activeElement).toBe(note);

        await user.click(screen.getByRole('button', { name: 'Rename' }));
        expect(onRename).toHaveBeenCalledWith('flag', 'metGuide');

        await user.click(
            screen.getByRole('button', {
                name: /dialogue "intro" node "start"/,
            })
        );
        expect(onOpenReference).toHaveBeenCalledWith(
            expect.objectContaining({
                file: 'content/dialogues/intro.dlg',
                access: 'check',
            })
        );

        const search = screen.getByRole('textbox', {
            name: 'Search flags and variables',
        });
        await user.type(search, 'quest');
        expect(within(list).getByText('quest')).toBeTruthy();
        expect(within(list).getByText('quest_intro_done')).toBeTruthy();
        expect(within(list).queryByText('gold')).toBeNull();
    });

    it('shows a read-only state when notes metadata cannot be read', async () => {
        const user = userEvent.setup();
        render(
            <Harness
                notesError="Malformed YAML"
                onRename={vi.fn()}
                onOpenReference={vi.fn()}
            />
        );

        await user.click(
            screen.getByRole('button', { name: /Orphaned notes/ })
        );
        expect(
            screen
                .getByRole('button', { name: 'Move note to metGuide' })
                .hasAttribute('disabled')
        ).toBe(true);
        expect(
            screen
                .getByRole('button', { name: 'Delete note for metGude' })
                .hasAttribute('disabled')
        ).toBe(true);

        const list = screen.getByRole('region', { name: 'Project names' });
        await user.click(
            within(list).getByRole('button', { name: /metGuide/ })
        );
        expect(screen.getByRole('alert').textContent).toContain(
            'Notes could not be read'
        );
        expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
    });

    it('reveals a health-shelf selection hidden by the current search', async () => {
        const user = userEvent.setup();
        render(<Harness onRename={vi.fn()} onOpenReference={vi.fn()} />);
        const list = screen.getByRole('region', { name: 'Project names' });
        const search = screen.getByRole('textbox', {
            name: 'Search flags and variables',
        });

        await user.type(search, 'gold');
        expect(within(list).queryByText('quest_intro_done')).toBeNull();
        await user.click(
            screen.getByRole('button', { name: /Set, never checked/ })
        );
        await user.click(
            within(
                screen.getByRole('region', { name: 'Name health' })
            ).getByRole('button', { name: /quest_intro_done/ })
        );

        expect((search as HTMLInputElement).value).toBe('');
        expect(
            within(list)
                .getByRole('button', { name: /quest_intro_done/ })
                .getAttribute('aria-current')
        ).toBe('true');
    });

    it('collapses prefix groups and distinguishes no matches from an empty project', async () => {
        const user = userEvent.setup();
        const view = render(
            <Harness onRename={vi.fn()} onOpenReference={vi.fn()} />
        );
        const list = screen.getByRole('region', { name: 'Project names' });

        await user.click(within(list).getByRole('button', { name: /quest1/ }));
        expect(within(list).queryByText('quest_intro_done')).toBeNull();
        await user.click(within(list).getByRole('button', { name: /quest1/ }));
        expect(within(list).getByText('quest_intro_done')).toBeTruthy();

        await user.selectOptions(
            screen.getByRole('combobox', { name: 'Sort flags and variables' }),
            'uses'
        );
        expect(
            (
                screen.getByRole('combobox', {
                    name: 'Sort flags and variables',
                }) as HTMLSelectElement
            ).value
        ).toBe('uses');

        await user.type(
            screen.getByRole('textbox', {
                name: 'Search flags and variables',
            }),
            'not-present'
        );
        expect(screen.getByText('No names match this search.')).toBeTruthy();

        view.unmount();
        render(
            <Harness
                summaries={[]}
                initialNotes={{ flags: {}, variables: {} }}
                onRename={vi.fn()}
                onOpenReference={vi.fn()}
            />
        );
        expect(
            screen.getByText('No flags or variables are used yet.')
        ).toBeTruthy();
        expect(screen.getAllByText('No issues')).toHaveLength(4);
    });

    it('deletes an unowned note when notes metadata is writable', async () => {
        const user = userEvent.setup();
        render(<Harness onRename={vi.fn()} onOpenReference={vi.fn()} />);

        await user.click(
            screen.getByRole('button', { name: /Orphaned notes/ })
        );
        await user.click(
            screen.getByRole('button', { name: 'Delete note for metGude' })
        );
        expect(screen.queryByText('metGude')).toBeNull();
    });
});
