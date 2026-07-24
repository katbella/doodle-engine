// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { MenuHandlers, ThemeState } from '../../../shared/project';

vi.mock('../shell/SourceView', () => ({ SourceView: () => null }));

import { App } from '../App';

function installBridge() {
    let menuHandlers: MenuHandlers | undefined;
    const setThemeMenuState = vi.fn((_state: ThemeState) => {});
    const setZoomFactor = vi.fn((_factor: number) => {});
    const unsubscribe = () => {};

    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            listRecentProjects: vi.fn(async () => []),
            onBuildLog: vi.fn(() => unsubscribe),
            onInstallLog: vi.fn(() => unsubscribe),
            onPreviewLog: vi.fn(() => unsubscribe),
            setThemeMenuState,
            setZoomFactor,
            onMenu: vi.fn((handlers: MenuHandlers) => {
                menuHandlers = handlers;
                return unsubscribe;
            }),
        },
    });

    return {
        setThemeMenuState,
        setZoomFactor,
        menuHandlers: () => menuHandlers,
    };
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
});

afterEach(cleanup);

describe('Studio appearance preferences', () => {
    it('defaults to the theme accent and applies native Themes menu changes', async () => {
        const bridge = installBridge();
        render(<App />);

        await waitFor(() =>
            expect(bridge.setThemeMenuState).toHaveBeenLastCalledWith({
                mode: 'dark',
                color: 'default',
            })
        );
        expect(document.documentElement.getAttribute('data-accent')).toBe(
            'default'
        );

        act(() => bridge.menuHandlers()?.onThemeColor('violet'));
        await waitFor(() =>
            expect(document.documentElement.getAttribute('data-accent')).toBe(
                'violet'
            )
        );
        expect(localStorage.getItem('doodle-studio-theme-color')).toBe(
            'violet'
        );

        act(() => bridge.menuHandlers()?.onThemeMode('light'));
        await waitFor(() =>
            expect(document.documentElement.getAttribute('data-theme')).toBe(
                'light'
            )
        );
        expect(document.documentElement.getAttribute('data-theme-base')).toBe(
            'light'
        );
        expect(bridge.setThemeMenuState).toHaveBeenLastCalledWith({
            mode: 'light',
            color: 'violet',
        });

        act(() => bridge.menuHandlers()?.onThemeMode('forest'));
        await waitFor(() =>
            expect(document.documentElement.getAttribute('data-theme')).toBe(
                'forest'
            )
        );
        expect(document.documentElement.getAttribute('data-theme-base')).toBe(
            'dark'
        );
        expect(localStorage.getItem('doodle-studio-theme')).toBe('forest');
        expect(bridge.setThemeMenuState).toHaveBeenLastCalledWith({
            mode: 'forest',
            color: 'violet',
        });
    });

    it('falls back to dark when a saved theme no longer exists', async () => {
        localStorage.setItem('doodle-studio-theme', 'sepia');
        const bridge = installBridge();

        render(<App />);

        await waitFor(() =>
            expect(bridge.setThemeMenuState).toHaveBeenCalledWith({
                mode: 'dark',
                color: 'default',
            })
        );
        expect(document.documentElement.getAttribute('data-theme')).toBe(
            'dark'
        );
    });

    it('restores the red accent and light mode from persisted preferences', async () => {
        localStorage.setItem('doodle-studio-theme', 'light');
        localStorage.setItem('doodle-studio-theme-color', 'red');
        const bridge = installBridge();

        render(<App />);

        await waitFor(() =>
            expect(bridge.setThemeMenuState).toHaveBeenCalledWith({
                mode: 'light',
                color: 'red',
            })
        );
        expect(document.documentElement.getAttribute('data-theme')).toBe(
            'light'
        );
        expect(document.documentElement.getAttribute('data-accent')).toBe(
            'red'
        );
    });

    it('persists Ctrl zoom shortcuts and resets with Ctrl+0', async () => {
        localStorage.setItem('doodle-studio-zoom', '1.25');
        const bridge = installBridge();
        render(<App />);

        await waitFor(() =>
            expect(bridge.setZoomFactor).toHaveBeenLastCalledWith(1.25)
        );
        fireEvent.keyDown(window, { key: '=', ctrlKey: true });
        await waitFor(() =>
            expect(bridge.setZoomFactor).toHaveBeenLastCalledWith(1.4)
        );
        expect(localStorage.getItem('doodle-studio-zoom')).toBe('1.4');

        fireEvent.keyDown(window, { key: '-', ctrlKey: true });
        await waitFor(() =>
            expect(bridge.setZoomFactor).toHaveBeenLastCalledWith(1.25)
        );
        fireEvent.keyDown(window, { key: '0', ctrlKey: true });
        await waitFor(() =>
            expect(bridge.setZoomFactor).toHaveBeenLastCalledWith(1)
        );
    });
});
