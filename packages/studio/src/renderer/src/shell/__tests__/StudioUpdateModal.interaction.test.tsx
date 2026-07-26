// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StudioUpdateModal } from '../StudioUpdateModal';
import type { StudioUpdateState } from '../../../../shared/project';

afterEach(cleanup);

function renderModal(
    state: StudioUpdateState,
    handlers: Partial<{
        onDownload: () => void;
        onViewChangelog: () => void;
        onCheck: () => void;
        onClose: () => void;
    }> = {}
) {
    const onDownload = handlers.onDownload ?? vi.fn();
    const onViewChangelog = handlers.onViewChangelog ?? vi.fn();
    const onCheck = handlers.onCheck ?? vi.fn();
    const onClose = handlers.onClose ?? vi.fn();
    render(
        <StudioUpdateModal
            state={state}
            onDownload={onDownload}
            onViewChangelog={onViewChangelog}
            onCheck={onCheck}
            onClose={onClose}
        />
    );
    return { onDownload, onViewChangelog, onCheck, onClose };
}

describe('StudioUpdateModal', () => {
    it('shows a checking state with no action', () => {
        renderModal({
            status: 'checking',
            currentVersion: '0.2.0',
            manual: true,
        });
        expect(
            screen.getByText('Looking for a newer Studio release…')
        ).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
    });

    it('shows the up-to-date state with the current version', () => {
        renderModal({
            status: 'current',
            currentVersion: '0.2.0',
            manual: true,
        });
        expect(screen.getByText('Doodle Studio is up to date')).toBeTruthy();
        expect(screen.getByText('Version 0.2.0')).toBeTruthy();
    });

    it('shows both versions and the Windows install instruction', () => {
        renderModal({
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: null,
            platform: 'windows',
        });
        expect(screen.getByText('Update available')).toBeTruthy();
        expect(screen.getByText('Version 0.3.0')).toBeTruthy();
        expect(screen.getByText('Installed: 0.2.0')).toBeTruthy();
        expect(screen.getByText(/run the installer/i)).toBeTruthy();
    });

    it('shows the macOS drag-to-Applications instruction', () => {
        renderModal({
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: null,
            platform: 'mac',
        });
        expect(screen.getByText(/Applications folder/i)).toBeTruthy();
    });

    it('downloads the update when Download is clicked', () => {
        const { onDownload } = renderModal({
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: null,
            platform: 'windows',
        });
        fireEvent.click(screen.getByText('Download'));
        expect(onDownload).toHaveBeenCalledOnce();
    });

    it('shows the release summary and opens the full changelog', () => {
        const onViewChangelog = vi.fn();
        renderModal(
            {
                status: 'available',
                currentVersion: '0.2.0',
                manual: false,
                version: '0.3.0',
                releaseNotes: [
                    'Build richer character-driven games with player profiles, party stats, and formatted dialogue.',
                    '',
                    'All Doodle Engine packages in this release use version 0.3.0:',
                    '',
                    '- `@doodle-engine/core`',
                    '- `@doodle-engine/react`',
                    '- `@doodle-engine/toolkit`',
                    '- `@doodle-engine/cli`',
                    '- Doodle Studio',
                    '',
                    "## What's Changed",
                    '',
                    '### Features',
                    '',
                    '- **Source editor:** Add project-aware suggestions by @kat in https://github.test/1',
                    '- Improve theme previews by @kat in https://github.test/2',
                    '',
                    'Full Changelog: https://github.test/compare',
                ].join('\n'),
                platform: 'windows',
            },
            { onViewChangelog }
        );

        expect(
            screen.getByText(
                'Build richer character-driven games with player profiles, party stats, and formatted dialogue.'
            )
        ).toBeTruthy();
        expect(screen.queryByText('@doodle-engine/core')).toBeNull();
        expect(
            screen.queryByText('Source editor: Add project-aware suggestions')
        ).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'View full changelog' })
        );
        expect(onViewChangelog).toHaveBeenCalledOnce();
    });

    it('uses the first actual change for releases without a summary', () => {
        renderModal({
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: [
                'All Doodle Engine packages in this release use version 0.3.0:',
                '',
                '- `@doodle-engine/core`',
                '- Doodle Studio',
                '',
                "## What's Changed",
                '',
                '### Features',
                '',
                '- **Source editor:** Add project-aware suggestions by @kat in https://github.test/1',
            ].join('\n'),
            platform: 'windows',
        });

        expect(
            screen.getByText('Source editor: Add project-aware suggestions')
        ).toBeTruthy();
    });

    it('shortens a long release summary with an ellipsis', () => {
        const summary =
            'This release makes character-driven games easier to build with a focused set of improvements that work together across the engine, Studio, default renderer, playtester, documentation, examples, and project templates without changing the established release process.';
        renderModal({
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: summary,
            platform: 'windows',
        });

        const displayed = document.querySelector(
            '.update__notes-summary'
        )?.textContent;
        expect(displayed?.endsWith('…')).toBe(true);
        expect(displayed!.length).toBeLessThanOrEqual(201);
        expect(summary.startsWith(displayed!.slice(0, -1))).toBe(true);
    });

    it('retries from the error state', () => {
        const { onCheck } = renderModal({
            status: 'error',
            currentVersion: '0.2.0',
            manual: true,
            message: 'Network is unreachable.',
        });
        expect(screen.getByText(/Network is unreachable\./i)).toBeTruthy();
        fireEvent.click(screen.getByText('Try Again'));
        expect(onCheck).toHaveBeenCalledOnce();
    });

    it('closes on the backdrop and on Escape', () => {
        const onClose = vi.fn();
        renderModal(
            { status: 'current', currentVersion: '0.2.0', manual: true },
            { onClose }
        );
        fireEvent.click(document.querySelector('.modal-backdrop')!);
        expect(onClose).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
