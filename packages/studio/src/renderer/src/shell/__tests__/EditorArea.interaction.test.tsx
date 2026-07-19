// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject } from '../../../../shared/project';
import type { Tab } from '../../types';

vi.mock('../SourceView', () => ({
    SourceView: (props: any) => (
        <div>
            source:{props.tabKey}:{String(props.stale)}:
            {props.revealMessage ?? ''}
        </div>
    ),
}));
vi.mock('../DialogueEditor', () => ({
    DialogueEditor: (props: any) => <div>dialogue:{props.dialogueId}</div>,
}));
vi.mock('../EntityForm', () => ({
    EntityForm: (props: any) => <div>entity:{props.section}</div>,
}));
vi.mock('../GameConfigForm', () => ({
    GameConfigForm: () => <div>game-config</div>,
}));
vi.mock('../LocaleEditor', () => ({
    LocaleEditor: (props: any) => <div>locale-editor:{props.localeId}</div>,
}));
vi.mock('../DetailView', () => ({
    DetailView: (props: any) => <div>detail:{props.tab.section}</div>,
}));
vi.mock('../ProjectOverview', () => ({
    ProjectOverview: () => <div>overview</div>,
}));

import { EditorArea } from '../EditorArea';

afterEach(cleanup);

const project = {
    files: {
        'dialogues:intro': 'content/dialogues/intro.dlg',
        'characters:hero': 'content/characters/hero.yaml',
    },
} as unknown as OpenProject;

const tabs: Tab[] = [
    {
        key: 'dialogues:intro',
        label: 'intro.dlg',
        section: 'dialogues',
        itemId: 'intro',
    },
    {
        key: 'characters:hero',
        label: 'Hero',
        section: 'characters',
        itemId: 'hero',
    },
    { key: 'config:game', label: 'Game', section: 'config', itemId: 'game' },
    {
        key: 'maps:missing',
        label: 'Missing',
        section: 'maps',
        itemId: 'missing',
    },
];

function renderArea(overrides: Record<string, unknown> = {}) {
    const callbacks = {
        onSelect: vi.fn(),
        onClose: vi.fn(),
        onSetViewMode: vi.fn(),
        onDirty: vi.fn(),
        onModified: vi.fn(),
        onPlayFromNode: vi.fn(),
    };
    return {
        callbacks,
        ...render(
            <EditorArea
                project={project}
                tabs={tabs}
                activeKey={null}
                viewModes={{}}
                dirtyTabs={new Set(['characters:hero'])}
                staleFiles={new Set(['content/characters/hero.yaml'])}
                reveal={null}
                {...callbacks}
                {...overrides}
            />
        ),
    };
}

describe('EditorArea', () => {
    it('selects and closes tabs without bubbling and shows overview with no active tab', async () => {
        const user = userEvent.setup();
        const { callbacks } = renderArea();
        expect(screen.getByText('overview')).toBeTruthy();
        await user.click(screen.getByText('Hero'));
        expect(callbacks.onSelect).toHaveBeenCalledWith('characters:hero');
        await user.click(screen.getByRole('button', { name: 'Close Hero' }));
        expect(callbacks.onClose).toHaveBeenCalledWith('characters:hero');
        expect(callbacks.onSelect).toHaveBeenCalledOnce();
        expect(
            document.querySelector('[title="Unsaved changes"]')
        ).toBeTruthy();
    });

    it('renders each visual editor type and detail fallback', () => {
        const { rerender, callbacks } = renderArea({
            activeKey: 'dialogues:intro',
        });
        expect(screen.getByText('dialogue:intro')).toBeTruthy();
        rerender(
            <EditorArea
                project={project}
                tabs={tabs}
                activeKey="characters:hero"
                viewModes={{}}
                dirtyTabs={new Set()}
                staleFiles={new Set()}
                reveal={null}
                {...callbacks}
            />
        );
        expect(screen.getByText('entity:characters')).toBeTruthy();
        rerender(
            <EditorArea
                project={project}
                tabs={tabs}
                activeKey="config:game"
                viewModes={{}}
                dirtyTabs={new Set()}
                staleFiles={new Set()}
                reveal={null}
                {...callbacks}
            />
        );
        expect(screen.getByText('game-config')).toBeTruthy();
        rerender(
            <EditorArea
                project={project}
                tabs={tabs}
                activeKey="maps:missing"
                viewModes={{}}
                dirtyTabs={new Set()}
                staleFiles={new Set()}
                reveal={null}
                {...callbacks}
            />
        );
        expect(screen.getByText('detail:maps')).toBeTruthy();
    });

    it('keeps source editors mounted, labels toolbar modes, and forwards reveal state', async () => {
        const onSetViewMode = vi.fn();
        const user = userEvent.setup();
        renderArea({
            activeKey: 'characters:hero',
            viewModes: {
                'characters:hero': 'source',
                'dialogues:intro': 'source',
            },
            reveal: { key: 'characters:hero', message: 'line 2', seq: 4 },
            onSetViewMode,
        });
        expect(
            screen.getByText('source:characters:hero:true:line 2')
        ).toBeTruthy();
        expect(screen.getByText('source:dialogues:intro:false:')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Visual' }));
        expect(onSetViewMode).toHaveBeenCalledWith('characters:hero', 'view');
        await user.click(screen.getByRole('button', { name: 'Source' }));
        expect(onSetViewMode).toHaveBeenCalledWith('characters:hero', 'source');
    });

    it('closes tabs with middle-click and offers close-others/all on right-click', async () => {
        const user = userEvent.setup();
        const { callbacks } = renderArea({ activeKey: 'characters:hero' });
        const heroTab = screen.getByText('Hero').closest('.tab')!;

        fireEvent(
            heroTab,
            new MouseEvent('auxclick', { bubbles: true, button: 1 })
        );
        expect(callbacks.onClose).toHaveBeenCalledWith('characters:hero');
        callbacks.onClose.mockClear();

        fireEvent.contextMenu(heroTab, { clientX: 40, clientY: 30 });
        await user.click(screen.getByRole('button', { name: 'Close others' }));
        expect(callbacks.onClose).toHaveBeenCalledTimes(tabs.length - 1);
        expect(callbacks.onClose).not.toHaveBeenCalledWith('characters:hero');
        expect(callbacks.onSelect).toHaveBeenCalledWith('characters:hero');

        callbacks.onClose.mockClear();
        fireEvent.contextMenu(heroTab, { clientX: 40, clientY: 30 });
        await user.click(screen.getByRole('button', { name: 'Close all' }));
        expect(
            screen.getByText(/1 affected tab has unsaved edits/)
        ).toBeTruthy();
        expect(callbacks.onClose).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Close tabs' }));
        expect(callbacks.onClose).toHaveBeenCalledTimes(tabs.length);
    });
});
