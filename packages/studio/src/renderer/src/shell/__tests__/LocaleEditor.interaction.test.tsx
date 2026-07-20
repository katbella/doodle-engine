// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject, StudioApi } from '../../../../shared/project';
import { LocaleEditor } from '../LocaleEditor';

afterEach(cleanup);

describe('LocaleEditor', () => {
    it('edits one translation inline and preserves the dotted YAML key', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        }));
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: {
                readDocument: vi.fn(async () => ({
                    content: 'bartender.greeting: Hello\nui.map: Map\n',
                    mtimeMs: 1,
                })),
                writeEntity,
            },
        });
        const user = userEvent.setup();
        const { unmount } = render(
            <LocaleEditor
                project={
                    {
                        projectDir: 'C:/story',
                        registry: { locales: { en: {} } },
                    } as unknown as OpenProject
                }
                tabKey="locales:en"
                path="content/locales/en.yaml"
                localeId="en"
                onDirty={vi.fn()}
                onModified={vi.fn()}
            />
        );

        const greeting = await screen.findByRole('textbox', {
            name: 'bartender.greeting translation',
        });
        await user.clear(greeting);
        await user.type(greeting, 'Welcome, stranger.');
        unmount();

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity).toHaveBeenCalledWith(
            'C:/story',
            'content/locales/en.yaml',
            [
                {
                    path: ['bartender.greeting'],
                    value: 'Welcome, stranger.',
                },
            ],
            1
        );
    });

    it('filters, adds, and confirms deletion of locale keys', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        }));
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: {
                readDocument: vi.fn(async () => ({
                    content: 'bartender.greeting: Hello\nui.map: Map\n',
                    mtimeMs: 1,
                })),
                writeEntity,
            },
        });
        const user = userEvent.setup();
        render(
            <LocaleEditor
                project={
                    {
                        projectDir: 'C:/story',
                        registry: { locales: { en: {} } },
                    } as unknown as OpenProject
                }
                tabKey="locales:en"
                path="content/locales/en.yaml"
                localeId="en"
                onDirty={vi.fn()}
                onModified={vi.fn()}
            />
        );

        const filter = await screen.findByRole('textbox', {
            name: 'Filter locale keys and text',
        });
        await user.type(filter, 'map');
        expect(screen.getByText('ui.map')).toBeTruthy();
        expect(screen.queryByText('bartender.greeting')).toBeNull();

        await user.click(screen.getByRole('button', { name: 'Add key' }));
        await user.type(
            screen.getByRole('textbox', { name: 'New locale key' }),
            'story.created'
        );
        await user.click(screen.getByRole('button', { name: 'Add' }));
        expect(screen.getByText('story.created')).toBeTruthy();

        await user.clear(filter);
        await user.click(
            screen.getByRole('button', {
                name: 'Delete locale key ui.map',
            })
        );
        await user.click(screen.getByRole('button', { name: 'Delete key' }));
        expect(screen.queryByText('ui.map')).toBeNull();

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce(), {
            timeout: 2000,
        });
        expect(writeEntity.mock.calls[0][2]).toEqual(
            expect.arrayContaining([
                { path: ['story.created'], value: '' },
                { path: ['ui.map'], value: undefined },
            ])
        );
    });

    it('jumps to a revealed key by filtering to it', async () => {
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: {
                readDocument: vi.fn(async () => ({
                    content: 'bartender.greeting: Hello\nui.map: Map\n',
                    mtimeMs: 1,
                })),
                writeEntity: vi.fn(),
            },
        });
        render(
            <LocaleEditor
                project={
                    {
                        projectDir: 'C:/story',
                        registry: { locales: { en: {} } },
                    } as unknown as OpenProject
                }
                tabKey="locales:en"
                path="content/locales/en.yaml"
                localeId="en"
                revealKey="ui.map"
                revealSeq={1}
                onDirty={vi.fn()}
                onModified={vi.fn()}
            />
        );

        const filter = await screen.findByRole('textbox', {
            name: 'Filter locale keys and text',
        });
        expect((filter as HTMLInputElement).value).toBe('ui.map');
        expect(screen.getByText('ui.map')).toBeTruthy();
        expect(screen.queryByText('bartender.greeting')).toBeNull();
    });
});
