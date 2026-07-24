import type { MenuItemConstructorOptions } from 'electron';
import { THEMES } from '../shared/project';
import type { ThemeColor, ThemeState } from '../shared/project';

export type ThemeMenuSender = (channel: string, value: string) => void;

export function createThemeMenu(
    state: ThemeState,
    send: ThemeMenuSender
): MenuItemConstructorOptions {
    const themeItem = (
        theme: (typeof THEMES)[number]
    ): MenuItemConstructorOptions => ({
        id: `theme-mode-${theme.id}`,
        label: theme.label,
        type: 'checkbox',
        checked: state.mode === theme.id,
        click: () => send('menu:themeMode', theme.id),
    });
    return {
        label: 'Themes',
        submenu: [
            ...THEMES.filter((theme) => theme.base === 'dark').map(themeItem),
            { type: 'separator' },
            ...THEMES.filter((theme) => theme.base === 'light').map(themeItem),
            { type: 'separator' },
            {
                label: 'Accent Colors',
                submenu: [
                    {
                        id: 'theme-color-default',
                        label: 'Default',
                        type: 'checkbox',
                        checked: state.color === 'default',
                        click: () => send('menu:themeColor', 'default'),
                    },
                    {
                        id: 'theme-color-red',
                        label: 'Red',
                        type: 'checkbox',
                        checked: state.color === 'red',
                        click: () => send('menu:themeColor', 'red'),
                    },
                    {
                        id: 'theme-color-violet',
                        label: 'Violet',
                        type: 'checkbox',
                        checked: state.color === 'violet',
                        click: () => send('menu:themeColor', 'violet'),
                    },
                    {
                        id: 'theme-color-green',
                        label: 'Green',
                        type: 'checkbox',
                        checked: state.color === 'green',
                        click: () => send('menu:themeColor', 'green'),
                    },
                    {
                        id: 'theme-color-pink',
                        label: 'Pink',
                        type: 'checkbox',
                        checked: state.color === 'pink',
                        click: () => send('menu:themeColor', 'pink'),
                    },
                    {
                        id: 'theme-color-gold',
                        label: 'Gold',
                        type: 'checkbox',
                        checked: state.color === 'gold',
                        click: () => send('menu:themeColor', 'gold'),
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
    for (const theme of THEMES) {
        const item = getItem(`theme-mode-${theme.id}`);
        if (item) item.checked = state.mode === theme.id;
    }
    for (const color of [
        'default',
        'red',
        'violet',
        'green',
        'pink',
        'gold',
    ] as ThemeColor[]) {
        const item = getItem(`theme-color-${color}`);
        if (item) item.checked = state.color === color;
    }
}
