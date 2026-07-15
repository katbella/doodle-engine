import type { MenuItemConstructorOptions } from 'electron';
import type { ThemeColor, ThemeMode, ThemeState } from '../shared/project';

export type ThemeMenuSender = (channel: string, value: string) => void;

export function createThemeMenu(
    state: ThemeState,
    send: ThemeMenuSender
): MenuItemConstructorOptions {
    return {
        label: 'Themes',
        submenu: [
            {
                id: 'theme-mode-dark',
                label: 'Dark Mode',
                type: 'checkbox',
                checked: state.mode === 'dark',
                click: () => send('menu:themeMode', 'dark'),
            },
            {
                id: 'theme-mode-light',
                label: 'Light Mode',
                type: 'checkbox',
                checked: state.mode === 'light',
                click: () => send('menu:themeMode', 'light'),
            },
            { type: 'separator' },
            {
                label: 'Colors',
                submenu: [
                    {
                        id: 'theme-color-blue',
                        label: 'Default Blue',
                        type: 'checkbox',
                        checked: state.color === 'blue',
                        click: () => send('menu:themeColor', 'blue'),
                    },
                    {
                        id: 'theme-color-red',
                        label: 'Awesome Red',
                        type: 'checkbox',
                        checked: state.color === 'red',
                        click: () => send('menu:themeColor', 'red'),
                    },
                    {
                        id: 'theme-color-violet',
                        label: 'Very Violet',
                        type: 'checkbox',
                        checked: state.color === 'violet',
                        click: () => send('menu:themeColor', 'violet'),
                    },
                ],
            },
        ],
    };
}

export function syncThemeMenuChecks(
    state: ThemeState,
    getItem: (id: string) => { checked: boolean } | undefined
): void {
    for (const mode of ['dark', 'light'] as ThemeMode[]) {
        const item = getItem(`theme-mode-${mode}`);
        if (item) item.checked = state.mode === mode;
    }
    for (const color of ['blue', 'red', 'violet'] as ThemeColor[]) {
        const item = getItem(`theme-color-${color}`);
        if (item) item.checked = state.color === color;
    }
}
