// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject, StudioApi } from '../../../../shared/project';
import type { SectionKey } from '../../types';
import { EntityForm } from '../EntityForm';

afterEach(cleanup);

const project = {
    projectDir: 'C:/story',
    registry: {
        locations: { town: { id: 'town' }, market: { id: 'market' } },
        dialogues: { intro: { id: 'intro' } },
        characters: {},
        items: {},
        maps: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    },
} as unknown as OpenProject;

function installBridge(
    content: string,
    writeEntity: StudioApi['writeEntity'] = vi.fn(async () => ({
        ok: true,
        conflict: false,
        mtimeMs: 2,
    }))
) {
    const readDocument = vi.fn(async () => ({ content, mtimeMs: 1 }));
    const importAsset = vi.fn(async () => 'chosen.png');
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: { readDocument, writeEntity, importAsset },
    });
    return { readDocument, writeEntity, importAsset };
}

function editor(
    section: SectionKey,
    onDirty = vi.fn(),
    onModified = vi.fn(),
    formProject: OpenProject = project
) {
    return render(
        <EntityForm
            project={formProject}
            tabKey={`${section}:entry`}
            section={section}
            path={`content/${section}/entry.yaml`}
            onDirty={onDirty}
            onModified={onModified}
        />
    );
}

describe('EntityForm field controls', () => {
    it('resolves localized text and groups every valid item destination', async () => {
        const itemProject = {
            ...project,
            registry: {
                ...project.registry,
                characters: { bartender: { id: 'bartender' } },
                locales: {
                    en: { 'item.old_coin.name': 'Old Coin' },
                },
            },
        } as unknown as OpenProject;
        installBridge(`id: old_coin
name: "@item.old_coin.name"
description: A keepsake
location: bartender
`);
        const user = userEvent.setup();
        editor('items', vi.fn(), vi.fn(), itemProject);
        await screen.findByText('old_coin');

        expect(screen.getByDisplayValue('Old Coin')).toBeTruthy();
        expect(screen.getByRole('option', { name: 'bartender' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Inventory' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Locations' })).toBeTruthy();
        expect(screen.getByRole('group', { name: 'Characters' })).toBeTruthy();
        // The out-of-play hint only shows while no starting location is set.
        expect(screen.queryByText(/stays out of play/)).toBeNull();
        await user.selectOptions(screen.getByRole('combobox'), '');
        expect(screen.getByText(/stays out of play/)).toBeTruthy();

        await user.selectOptions(screen.getByRole('combobox'), 'inventory');
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe(
            'inventory'
        );
        expect(screen.queryByText(/stays out of play/)).toBeNull();
    });

    it('edits localizable, reference, asset, stats, and unknown character fields', async () => {
        const bridge = installBridge(`id: hero
name: Hero
biography: "@bio.hero"
portrait: hero.png
location: missing
dialogue: intro
stats:
  strength: 10
extension:
  custom: true
`);
        const user = userEvent.setup();
        const localizedProject = {
            ...project,
            registry: {
                ...project.registry,
                locales: { en: { 'bio.hero': 'A storied hero.' } },
            },
        } as unknown as OpenProject;
        editor('characters', vi.fn(), vi.fn(), localizedProject);
        expect(await screen.findByText('hero')).toBeTruthy();
        expect(screen.getByText('Other fields in this file')).toBeTruthy();
        expect(screen.getByText(/kept exactly as written/)).toBeTruthy();
        expect(screen.getByText(/extension:/)).toBeTruthy();
        expect(
            screen.getByRole('option', { name: 'missing (missing)' })
        ).toBeTruthy();

        await user.click(
            screen.getByRole('button', { name: 'Choose Portrait file' })
        );
        expect(bridge.importAsset).toHaveBeenCalledWith('C:/story', 'portrait');
        expect(screen.getByDisplayValue('chosen.png')).toBeTruthy();

        const literal = screen.getAllByRole('button', { name: 'literal' });
        await user.click(literal[1]);
        expect(screen.getByDisplayValue('A storied hero.')).toBeTruthy();
        await user.click(screen.getAllByRole('button', { name: '@key' })[0]);
        await user.click(screen.getByRole('button', { name: /@bio\.hero/ }));
        await user.click(
            screen.getByRole('button', { name: 'Use @bio.hero text' })
        );
        expect(screen.getAllByDisplayValue('A storied hero.')).toHaveLength(2);

        const selects = screen.getAllByRole('combobox');
        await user.selectOptions(selects[0], 'town');
        await user.selectOptions(selects[1], '');
        await user.click(screen.getByRole('button', { name: '+ Add stat' }));
        expect(screen.getByDisplayValue('stat')).toBeTruthy();
        const strength = screen.getByDisplayValue('strength');
        await user.clear(strength);
        await user.type(strength, 'power');
        const statValue = screen.getByDisplayValue('10');
        await user.clear(statValue);
        await user.type(statValue, '12');
        await user.click(
            screen.getAllByRole('button', { name: 'Remove stat' })[0]
        );
    });

    it('edits every interlude scalar and list control', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        }));
        installBridge(
            `id: opening
background: bg.png
sounds: [wind.ogg]
text: Opening
scroll: true
scrollSpeed: 30
triggerLocation: missing
`,
            writeEntity
        );
        const user = userEvent.setup();
        const { unmount } = editor('interludes');
        await screen.findByText('opening');

        // One row per sound file; edits target a single entry.
        const firstSound = screen.getByRole('textbox', {
            name: 'Layered ambient sounds 1',
        });
        expect((firstSound as HTMLInputElement).value).toBe('wind.ogg');
        await user.clear(firstSound);
        await user.type(firstSound, 'rain.ogg');
        await user.click(screen.getByRole('checkbox'));
        const speed = screen.getByDisplayValue('30');
        fireEvent.change(speed, { target: { value: '' } });
        fireEvent.change(speed, { target: { value: '45' } });
        await user.selectOptions(screen.getByRole('combobox'), 'town');
        await user.clear(screen.getByDisplayValue('bg.png'));
        // Trigger conditions and effects are real engine fields with their
        // own builder-backed list editors, not "other fields in this file".
        expect(
            screen.getByRole('button', { name: /Add condition/ })
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: /Add effect/ })).toBeTruthy();
        expect(screen.queryByText('Other fields in this file')).toBeNull();

        unmount();
        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity).toHaveBeenCalledWith(
            'C:/story',
            'content/interludes/entry.yaml',
            expect.arrayContaining([
                { path: ['background'], value: '' },
                { path: ['sounds'], value: ['rain.ogg'] },
                { path: ['scroll'], value: false },
                { path: ['scrollSpeed'], value: 45 },
                { path: ['triggerLocation'], value: 'town' },
            ]),
            1
        );
    });

    it('adds, edits, reorders, and removes quest stages', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        }));
        installBridge(
            `id: main
name: Main quest
description: Story
stages:
  - id: start
    description: Begin
  - id: finish
    description: End
`,
            writeEntity
        );
        const user = userEvent.setup();
        const { unmount } = editor('quests');
        await screen.findByText('main');

        await user.click(
            screen.getAllByRole('button', { name: 'Move down' })[0]
        );
        await user.click(screen.getByRole('button', { name: /Add stage/ }));
        const newStage = screen.getByDisplayValue('stage_3');
        await user.clear(newStage);
        await user.type(newStage, 'epilogue');
        await user.click(
            screen.getAllByRole('button', { name: 'Remove stage' })[0]
        );
        await user.click(screen.getByRole('button', { name: 'Delete stage' }));

        unmount();
        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity).toHaveBeenCalledWith(
            'C:/story',
            'content/quests/entry.yaml',
            [
                {
                    path: ['stages'],
                    value: [
                        { id: 'start', description: 'Begin' },
                        { id: 'epilogue', description: '' },
                    ],
                },
            ],
            1
        );
    });

    it('adds, edits, preserves missing, and removes map markers', async () => {
        installBridge(`id: world
name: World
image: world.png
scale: 2
locations:
  - id: unknown
    x: 10
    y: 20
`);
        const user = userEvent.setup();
        editor('maps');
        await screen.findByText('world');
        expect(screen.getByRole('option', { name: 'unknown' })).toBeTruthy();
        await user.selectOptions(screen.getByRole('combobox'), 'town');
        fireEvent.change(screen.getByTitle('x'), { target: { value: '15' } });
        fireEvent.change(screen.getByTitle('y'), { target: { value: '25' } });

        const preview = document.querySelector(
            '.map-preview'
        ) as HTMLDivElement;
        vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            right: 200,
            bottom: 100,
            width: 200,
            height: 100,
            toJSON: () => ({}),
        });
        fireEvent.pointerDown(screen.getByTitle('x'));
        fireEvent.click(preview, { clientX: 100, clientY: 50 });
        expect((screen.getByTitle('x') as HTMLInputElement).value).toBe('8');
        expect((screen.getByTitle('y') as HTMLInputElement).value).toBe('14');

        const marker = document.querySelector(
            '.map-preview__marker'
        ) as HTMLSpanElement & {
            setPointerCapture: (pointerId: number) => void;
            releasePointerCapture: (pointerId: number) => void;
        };
        marker.setPointerCapture = vi.fn();
        marker.releasePointerCapture = vi.fn();
        fireEvent.pointerDown(marker, {
            pointerId: 7,
            clientX: 100,
            clientY: 50,
        });
        fireEvent.pointerMove(marker, {
            pointerId: 7,
            clientX: 20,
            clientY: 20,
        });
        // The coordinate rows follow the drag live, like the dot does.
        expect((screen.getByTitle('x') as HTMLInputElement).value).toBe('1');
        fireEvent.pointerUp(marker, {
            pointerId: 7,
            clientX: 20,
            clientY: 20,
        });
        expect((screen.getByTitle('x') as HTMLInputElement).value).toBe('1');
        expect((screen.getByTitle('y') as HTMLInputElement).value).toBe('3');

        await user.click(screen.getByRole('button', { name: /Add marker/ }));
        expect(screen.getAllByRole('combobox')).toHaveLength(2);
        await user.click(
            screen.getAllByRole('button', { name: 'Remove marker' })[0]
        );
    });

    it('shows read failures and unsupported form types', async () => {
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: {
                readDocument: vi.fn(async () => {
                    throw new Error('access denied');
                }),
            },
        });
        const { rerender } = editor('characters');
        expect(
            await screen.findByText('This file could not be read.')
        ).toBeTruthy();
        expect(screen.getByText('access denied')).toBeTruthy();

        installBridge('id: intro\n');
        rerender(
            <EntityForm
                project={project}
                tabKey="dialogues:intro"
                section="dialogues"
                path="content/dialogues/intro.dlg"
                onDirty={vi.fn()}
                onModified={vi.fn()}
            />
        );
        expect(
            await screen.findByText('No form for this content type.')
        ).toBeTruthy();
    });

    it('overwrites an external conflict only after explicit confirmation', async () => {
        const writeEntity = vi
            .fn<StudioApi['writeEntity']>()
            .mockResolvedValueOnce({
                ok: false,
                conflict: true,
                mtimeMs: 4,
            })
            .mockResolvedValueOnce({
                ok: true,
                conflict: false,
                mtimeMs: 5,
            });
        const onModified = vi.fn();
        installBridge('id: town\nname: Town\n', writeEntity);
        const user = userEvent.setup();
        editor('locations', vi.fn(), onModified);
        const name = await screen.findByDisplayValue('Town');
        await user.clear(name);
        await user.type(name, 'New Town');
        expect(
            await screen.findByText(/changed on disk/, undefined, {
                timeout: 2000,
            })
        ).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Overwrite' }));
        await waitFor(() => expect(writeEntity).toHaveBeenCalledTimes(2));
        expect(writeEntity.mock.calls[1][3]).toBeUndefined();
        expect(onModified).toHaveBeenCalledWith('content/locations/entry.yaml');
    });
});
