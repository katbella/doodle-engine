// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentRegistry } from '@doodle-engine/core';
import { ConditionEffectBuilder } from '../ConditionEffectBuilder';

const registry: ContentRegistry = {
    locations: {},
    characters: {},
    items: {},
    maps: {},
    dialogues: {},
    quests: {
        entry: {
            id: 'entry',
            name: 'Entry',
            description: '',
            stages: [
                { id: 'started', description: '' },
                { id: 'complete', description: '' },
            ],
        },
    },
    journalEntries: {},
    interludes: {},
    locales: {},
};

afterEach(cleanup);

describe('ConditionEffectBuilder interactions', () => {
    it('offers a file picker for media filename arguments', async () => {
        const importAsset = vi.fn(async () => 'intro.mp4');
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { importAsset },
        });
        const user = userEvent.setup();
        render(
            <ConditionEffectBuilder
                mode="effect"
                registry={registry}
                projectDir="C:/story"
                onCommit={() => {}}
                onCancel={() => {}}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Play video' }));
        // A filename argument: no @key/literal placeholder, just a filename.
        expect(screen.getByPlaceholderText('intro.mp4')).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Choose a file for File' })
        );
        expect(importAsset).toHaveBeenCalledWith('C:/story', 'video');
        await screen.findByDisplayValue('intro.mp4');

        // Non-media text arguments stay plain inputs.
        await user.click(screen.getByRole('button', { name: 'Notify' }));
        expect(
            screen.queryByRole('button', { name: /Choose a file/ })
        ).toBeNull();
    });

    it('keeps requirements neutral until the author leaves a field', async () => {
        const user = userEvent.setup();
        render(
            <ConditionEffectBuilder
                mode="effect"
                registry={registry}
                onCommit={() => {}}
                onCancel={() => {}}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Set flag' }));
        expect(screen.queryByText('Flag is required.')).toBeNull();
        expect(screen.getByText(/Complete the required fields/)).toBeTruthy();

        fireEvent.blur(screen.getByPlaceholderText('flagName'));
        expect(screen.getByText('Flag is required.')).toBeTruthy();
    });

    it('builds a choice requirement from authored input', async () => {
        const onCommit = vi.fn();
        const user = userEvent.setup();
        render(
            <ConditionEffectBuilder
                mode="condition"
                registry={registry}
                inRequire
                onCommit={onCommit}
                onCancel={() => {}}
            />
        );

        await user.type(screen.getByPlaceholderText('flagName'), 'metGuide');
        expect(screen.getByText('REQUIRE hasFlag metGuide')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Add' }));
        expect(onCommit).toHaveBeenCalledExactlyOnceWith({
            type: 'hasFlag',
            flag: 'metGuide',
        });
    });

    it('uses the selected quest to populate and build a valid stage effect', async () => {
        const onCommit = vi.fn();
        const user = userEvent.setup();
        render(
            <ConditionEffectBuilder
                mode="effect"
                registry={registry}
                onCommit={onCommit}
                onCancel={() => {}}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Set quest stage' })
        );
        const selects = screen.getAllByRole('combobox');
        await user.selectOptions(selects[0], 'entry');
        await user.selectOptions(selects[1], 'started');
        expect(screen.getByText('SET questStage entry started')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Add' }));
        expect(onCommit).toHaveBeenCalledExactlyOnceWith({
            type: 'setQuestStage',
            questId: 'entry',
            stageId: 'started',
        });
    });

    it('explains why dice rolls cannot be used as choice requirements', async () => {
        const user = userEvent.setup();
        render(
            <ConditionEffectBuilder
                mode="condition"
                registry={registry}
                inRequire
                onCommit={() => {}}
                onCancel={() => {}}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Dice roll vs threshold' })
        );
        const numbers = screen.getAllByRole('spinbutton');
        await user.type(numbers[0], '1');
        await user.type(numbers[1], '20');
        await user.type(numbers[2], '10');

        expect(
            screen.getByText(/can’t be used as a requirement/i)
        ).toBeTruthy();
        expect(
            (screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement)
                .disabled
        ).toBe(true);
    });
});
