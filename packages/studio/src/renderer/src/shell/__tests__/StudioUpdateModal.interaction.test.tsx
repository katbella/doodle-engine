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
        onCheck: () => void;
        onClose: () => void;
    }> = {}
) {
    const onDownload = handlers.onDownload ?? vi.fn();
    const onCheck = handlers.onCheck ?? vi.fn();
    const onClose = handlers.onClose ?? vi.fn();
    render(
        <StudioUpdateModal
            state={state}
            onDownload={onDownload}
            onCheck={onCheck}
            onClose={onClose}
        />
    );
    return { onDownload, onCheck, onClose };
}

describe('StudioUpdateModal', () => {
    it('shows a checking state with no action', () => {
        renderModal({
            status: 'checking',
            currentVersion: '0.2.0',
            manual: true,
        });
        expect(screen.getByText('Checking for updates…')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
    });

    it('shows the up-to-date state with the current version', () => {
        renderModal({
            status: 'current',
            currentVersion: '0.2.0',
            manual: true,
        });
        expect(screen.getByText('Doodle Studio is up to date.')).toBeTruthy();
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
        expect(
            screen.getByText('Version 0.3.0 is available. You have 0.2.0.')
        ).toBeTruthy();
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
            releaseNotes: 'What changed',
            platform: 'windows',
        });
        expect(screen.getByText('What changed')).toBeTruthy();
        fireEvent.click(screen.getByText('Download'));
        expect(onDownload).toHaveBeenCalledOnce();
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
