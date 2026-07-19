import { describe, expect, it, vi } from 'vitest';
import type { MenuItemConstructorOptions } from 'electron';
import { createThemeMenu, syncThemeMenuChecks } from '../theme-menu';

function submenu(item: MenuItemConstructorOptions) {
    return item.submenu as MenuItemConstructorOptions[];
}

describe('Themes menu', () => {
    it('shows every theme and checks only the selected theme and color', () => {
        const send = vi.fn();
        const menu = createThemeMenu({ mode: 'dark', color: 'default' }, send);
        const items = submenu(menu);
        const colors = submenu(
            items.find((item) => item.label === 'Accent Colors')!
        );

        expect(
            items.filter((item) => item.id?.startsWith('theme-mode-'))
        ).toEqual([
            expect.objectContaining({ label: 'Doodle Dark', checked: true }),
            expect.objectContaining({
                label: 'Into the Woods',
                checked: false,
            }),
            expect.objectContaining({ label: 'Outer Space', checked: false }),
            expect.objectContaining({ label: 'Neon City', checked: false }),
            expect.objectContaining({ label: 'Deep Sea', checked: false }),
            expect.objectContaining({ label: 'Terminal', checked: false }),
            expect.objectContaining({ label: 'Storm', checked: false }),
            expect.objectContaining({ label: 'Royal Velvet', checked: false }),
            expect.objectContaining({ label: 'Pumpkin', checked: false }),
            expect.objectContaining({ label: 'Blueprint', checked: false }),
            expect.objectContaining({ label: 'Sepia Noir', checked: false }),
            expect.objectContaining({ label: 'Firelight', checked: false }),
            expect.objectContaining({
                label: 'High Contrast',
                checked: false,
            }),
            expect.objectContaining({ label: 'Doodle Light', checked: false }),
            expect.objectContaining({ label: 'Parchment', checked: false }),
            expect.objectContaining({ label: 'Sakura', checked: false }),
            expect.objectContaining({ label: 'Glacier', checked: false }),
        ]);
        // Dark-based themes come first, then a separator, then light-based.
        const separatorIndex = items.findIndex(
            (item) => item.type === 'separator'
        );
        const lightIndex = items.findIndex(
            (item) => item.id === 'theme-mode-light'
        );
        const contrastIndex = items.findIndex(
            (item) => item.id === 'theme-mode-high-contrast'
        );
        expect(contrastIndex).toBeLessThan(separatorIndex);
        expect(separatorIndex).toBeLessThan(lightIndex);
        expect(colors).toEqual([
            expect.objectContaining({ label: 'Default', checked: true }),
            expect.objectContaining({ label: 'Red', checked: false }),
            expect.objectContaining({ label: 'Violet', checked: false }),
            expect.objectContaining({ label: 'Green', checked: false }),
            expect.objectContaining({ label: 'Pink', checked: false }),
            expect.objectContaining({ label: 'Gold', checked: false }),
        ]);
        expect(colors.every((item) => item.type === 'checkbox')).toBe(true);

        items
            .filter((item) => item.id?.startsWith('theme-mode-'))
            .forEach((item) =>
                item.click?.({} as never, {} as never, {} as never)
            );
        colors.forEach((item) =>
            item.click?.({} as never, {} as never, {} as never)
        );
        expect(send.mock.calls).toEqual([
            ['menu:themeMode', 'dark'],
            ['menu:themeMode', 'forest'],
            ['menu:themeMode', 'space'],
            ['menu:themeMode', 'neon'],
            ['menu:themeMode', 'deep-sea'],
            ['menu:themeMode', 'terminal'],
            ['menu:themeMode', 'storm'],
            ['menu:themeMode', 'royal-velvet'],
            ['menu:themeMode', 'pumpkin'],
            ['menu:themeMode', 'blueprint'],
            ['menu:themeMode', 'sepia-noir'],
            ['menu:themeMode', 'firelight'],
            ['menu:themeMode', 'high-contrast'],
            ['menu:themeMode', 'light'],
            ['menu:themeMode', 'parchment'],
            ['menu:themeMode', 'sakura'],
            ['menu:themeMode', 'glacier'],
            ['menu:themeColor', 'default'],
            ['menu:themeColor', 'red'],
            ['menu:themeColor', 'violet'],
            ['menu:themeColor', 'green'],
            ['menu:themeColor', 'pink'],
            ['menu:themeColor', 'gold'],
        ]);
    });

    it('synchronizes every checkmark without allowing the last color to win', () => {
        const items = new Map(
            [
                'theme-mode-dark',
                'theme-mode-light',
                'theme-mode-forest',
                'theme-mode-space',
                'theme-mode-neon',
                'theme-mode-deep-sea',
                'theme-mode-terminal',
                'theme-mode-storm',
                'theme-mode-royal-velvet',
                'theme-mode-pumpkin',
                'theme-mode-blueprint',
                'theme-mode-sepia-noir',
                'theme-mode-firelight',
                'theme-mode-parchment',
                'theme-mode-sakura',
                'theme-mode-glacier',
                'theme-mode-high-contrast',
                'theme-color-default',
                'theme-color-red',
                'theme-color-violet',
                'theme-color-green',
                'theme-color-pink',
                'theme-color-gold',
            ].map((id) => [id, { checked: true }])
        );

        syncThemeMenuChecks({ mode: 'forest', color: 'red' }, (id) =>
            items.get(id)
        );

        expect(Object.fromEntries(items)).toEqual({
            'theme-mode-dark': { checked: false },
            'theme-mode-light': { checked: false },
            'theme-mode-forest': { checked: true },
            'theme-mode-space': { checked: false },
            'theme-mode-neon': { checked: false },
            'theme-mode-deep-sea': { checked: false },
            'theme-mode-terminal': { checked: false },
            'theme-mode-storm': { checked: false },
            'theme-mode-royal-velvet': { checked: false },
            'theme-mode-pumpkin': { checked: false },
            'theme-mode-blueprint': { checked: false },
            'theme-mode-sepia-noir': { checked: false },
            'theme-mode-firelight': { checked: false },
            'theme-mode-parchment': { checked: false },
            'theme-mode-sakura': { checked: false },
            'theme-mode-glacier': { checked: false },
            'theme-mode-high-contrast': { checked: false },
            'theme-color-default': { checked: false },
            'theme-color-red': { checked: true },
            'theme-color-violet': { checked: false },
            'theme-color-green': { checked: false },
            'theme-color-pink': { checked: false },
            'theme-color-gold': { checked: false },
        });
    });
});
