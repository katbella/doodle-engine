// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorLoading } from '../EditorLoading';

describe('EditorLoading', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('waits before showing loading feedback', () => {
        vi.useFakeTimers();
        render(<EditorLoading />);

        expect(screen.queryByRole('status')).toBeNull();

        act(() => vi.advanceTimersByTime(149));
        expect(screen.queryByRole('status')).toBeNull();

        act(() => vi.advanceTimersByTime(1));
        expect(screen.getByRole('status').textContent).toContain('Loading…');
    });
});
