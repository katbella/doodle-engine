// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePersistedSize } from '../usePersistedSize';
import { useThemeName } from '../useThemeName';

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
});
afterEach(cleanup);

function ThemeProbe() {
    return <output>{useThemeName()}</output>;
}

function SizeProbe({ storageKey = 'panel' }: { storageKey?: string }) {
    const [size, setSize] = usePersistedSize(storageKey, 320);
    return <button onClick={() => setSize(480)}>{size}</button>;
}

describe('renderer hooks', () => {
    it('tracks root theme changes and disconnects cleanly', async () => {
        const { unmount } = render(<ThemeProbe />);
        expect(screen.getByText('dark')).toBeTruthy();
        document.documentElement.setAttribute('data-theme', 'light');
        await waitFor(() => expect(screen.getByText('light')).toBeTruthy());
        document.documentElement.setAttribute('data-theme', 'unknown');
        await waitFor(() => expect(screen.getByText('dark')).toBeTruthy());
        unmount();
    });

    it('loads, updates, and persists panel sizes', async () => {
        localStorage.setItem('panel', '275');
        const user = userEvent.setup();
        render(<SizeProbe />);
        expect(screen.getByRole('button', { name: '275' })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: '275' }));
        expect(screen.getByRole('button', { name: '480' })).toBeTruthy();
        expect(localStorage.getItem('panel')).toBe('480');
    });

    it('falls back for missing and non-finite persisted sizes', () => {
        localStorage.setItem('bad', 'Infinity');
        const { rerender } = render(<SizeProbe storageKey="missing" />);
        expect(screen.getByRole('button', { name: '320' })).toBeTruthy();
        rerender(<SizeProbe storageKey="bad" />);
        expect(screen.getByRole('button', { name: '320' })).toBeTruthy();
    });
});
