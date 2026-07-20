// @vitest-environment jsdom

import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject, StudioApi } from '../../../../shared/project';
import { LocaleWriterProvider } from '../../lib/locale-writer';
import { LocalizedTextField } from '../LocalizedTextField';

afterEach(cleanup);

const project = {
    projectDir: 'C:/story',
    registry: {
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {
            en: {
                'story.first': 'First line',
                'story.second': 'Second line',
                'bartender.greeting': 'Welcome to the Salty Dog, stranger.',
            },
            sv: {
                'bartender.greeting': 'Välkommen till Salty Dog.',
            },
        },
    },
} as unknown as OpenProject;

function installBridge() {
    const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
        ok: true,
        conflict: false,
        mtimeMs: 2,
    }));
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            readDocument: vi.fn(async (_projectDir, path) => ({
                content: path.endsWith('/sv.yaml')
                    ? 'bartender.greeting: Välkommen till Salty Dog.\n'
                    : 'story.first: First line\nstory.second: Second line\nbartender.greeting: Welcome to the Salty Dog, stranger.\n',
                mtimeMs: 1,
            })),
            writeEntity,
        },
    });
    return writeEntity;
}

describe('LocalizedTextField write-through editing', () => {
    it('merges edits from multiple fields into one locale-file write', async () => {
        const writeEntity = installBridge();
        const firstSource = vi.fn();
        const secondSource = vi.fn();
        const user = userEvent.setup();
        render(
            <LocaleWriterProvider project={project} onModified={vi.fn()}>
                <LocalizedTextField
                    label={<span>First</span>}
                    source="@story.first"
                    registry={project.registry}
                    textKind="prose"
                    onSourceChange={firstSource}
                />
                <LocalizedTextField
                    label={<span>Second</span>}
                    source="@story.second"
                    registry={project.registry}
                    textKind="prose"
                    onSourceChange={secondSource}
                />
            </LocaleWriterProvider>
        );

        const first = screen.getByDisplayValue('First line');
        const second = screen.getByDisplayValue('Second line');
        await user.clear(first);
        await user.type(first, 'Rewritten first');
        await user.clear(second);
        await user.type(second, 'Rewritten second');

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce(), {
            timeout: 2000,
        });
        expect(writeEntity).toHaveBeenCalledWith(
            'C:/story',
            'content/locales/en.yaml',
            [
                { path: ['story.first'], value: 'Rewritten first' },
                { path: ['story.second'], value: 'Rewritten second' },
            ],
            1
        );
        expect(firstSource).not.toHaveBeenCalled();
        expect(secondSource).not.toHaveBeenCalled();
    });

    it('finds keys by translated text and creates a key with current literal text', async () => {
        const writeEntity = installBridge();
        const onSourceChange = vi.fn();
        const user = userEvent.setup();
        const view = render(
            <LocaleWriterProvider project={project} onModified={vi.fn()}>
                <LocalizedTextField
                    label={<span>Line</span>}
                    source="Current literal"
                    registry={project.registry}
                    onSourceChange={onSourceChange}
                />
            </LocaleWriterProvider>
        );

        await user.click(screen.getByRole('button', { name: '@key' }));
        await user.type(
            screen.getByRole('textbox', { name: 'Search locale keys' }),
            'salty dog'
        );
        await user.click(
            screen.getByRole('button', { name: /@bartender\.greeting/ })
        );
        expect(screen.getByText('Choose which text to keep')).toBeTruthy();
        await user.click(
            screen.getByRole('button', {
                name: 'Use @bartender.greeting text',
            })
        );
        expect(onSourceChange).toHaveBeenLastCalledWith('@bartender.greeting');

        view.rerender(
            <LocaleWriterProvider project={project} onModified={vi.fn()}>
                <LocalizedTextField
                    label={<span>Line</span>}
                    source="Current literal"
                    registry={project.registry}
                    onSourceChange={onSourceChange}
                />
            </LocaleWriterProvider>
        );
        await user.click(screen.getByRole('button', { name: '@key' }));
        await user.type(
            screen.getByRole('textbox', { name: 'Search locale keys' }),
            'story.created'
        );
        await user.click(
            screen.getByRole('button', { name: /Create “story\.created”/ })
        );
        expect(onSourceChange).toHaveBeenLastCalledWith('@story.created');
        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce(), {
            timeout: 2000,
        });
        expect(writeEntity.mock.calls[0][2]).toEqual([
            { path: ['story.created'], value: 'Current literal' },
        ]);
    });

    it('unlinks reversibly, warns about other locales, and blocks empty conversions', async () => {
        installBridge();
        const user = userEvent.setup();

        function Harness({ initial }: { initial: string }) {
            const [source, setSource] = useState(initial);
            return (
                <LocaleWriterProvider project={project} onModified={vi.fn()}>
                    <LocalizedTextField
                        label={<span>Line</span>}
                        source={source}
                        registry={project.registry}
                        onSourceChange={setSource}
                    />
                    <output data-testid="source">{source}</output>
                </LocaleWriterProvider>
            );
        }

        const view = render(<Harness initial="@bartender.greeting" />);
        await user.click(screen.getByRole('button', { name: 'literal' }));
        expect(screen.getByTestId('source').textContent).toBe(
            'Welcome to the Salty Dog, stranger.'
        );
        const notice = document.querySelector(
            '.localized-text__unlink-notice'
        )!;
        expect(notice.textContent).toContain(
            'Now using literal text instead of @bartender.greeting.'
        );
        expect(notice.textContent).toContain(
            'The key and its Swedish translation stay in the locale files'
        );
        expect(notice.textContent).toContain('Switch back to @key to relink.');

        await user.click(screen.getByRole('button', { name: '@key' }));
        expect(screen.getByTestId('source').textContent).toBe(
            '@bartender.greeting'
        );

        view.unmount();
        render(<Harness initial="@story.missing" />);
        const literal = screen.getByRole('button', { name: 'literal' });
        expect((literal as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByTestId('source').textContent).toBe('@story.missing');
    });

    it('can explicitly overwrite a key with the current literal text', async () => {
        const writeEntity = installBridge();
        const onSourceChange = vi.fn();
        const user = userEvent.setup();
        render(
            <LocaleWriterProvider project={project} onModified={vi.fn()}>
                <LocalizedTextField
                    source="A newly written greeting"
                    registry={project.registry}
                    onSourceChange={onSourceChange}
                />
            </LocaleWriterProvider>
        );

        await user.click(screen.getByRole('button', { name: '@key' }));
        await user.click(
            screen.getByRole('button', { name: /@bartender\.greeting/ })
        );
        await user.click(
            screen.getByRole('button', {
                name: 'Overwrite @bartender.greeting with current text',
            })
        );

        expect(onSourceChange).toHaveBeenCalledWith('@bartender.greeting');
        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce(), {
            timeout: 2000,
        });
        expect(writeEntity.mock.calls[0][2]).toEqual([
            {
                path: ['bartender.greeting'],
                value: 'A newly written greeting',
            },
        ]);
    });
});
