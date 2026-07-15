import { describe, expect, it, vi } from 'vitest';
import type { MenuItemConstructorOptions } from 'electron';
import { createThemeMenu, syncThemeMenuChecks } from '../theme-menu';

function submenu(item: MenuItemConstructorOptions) {
    return item.submenu as MenuItemConstructorOptions[];
}

describe('Themes menu', () => {
    it('shows both modes and checks only the selected mode and color', () => {
        const send = vi.fn();
        const menu = createThemeMenu({ mode: 'dark', color: 'blue' }, send);
        const items = submenu(menu);
        const colors = submenu(items.find((item) => item.label === 'Colors')!);

        expect(items.filter((item) => item.label?.endsWith('Mode'))).toEqual([
            expect.objectContaining({ label: 'Dark Mode', checked: true }),
            expect.objectContaining({ label: 'Light Mode', checked: false }),
        ]);
        expect(colors).toEqual([
            expect.objectContaining({ label: 'Default Blue', checked: true }),
            expect.objectContaining({ label: 'Awesome Red', checked: false }),
            expect.objectContaining({ label: 'Very Violet', checked: false }),
        ]);
        expect(colors.every((item) => item.type === 'checkbox')).toBe(true);

        items[0].click?.({} as never, {} as never, {} as never);
        items[1].click?.({} as never, {} as never, {} as never);
        colors.forEach((item) =>
            item.click?.({} as never, {} as never, {} as never)
        );
        expect(send.mock.calls).toEqual([
            ['menu:themeMode', 'dark'],
            ['menu:themeMode', 'light'],
            ['menu:themeColor', 'blue'],
            ['menu:themeColor', 'red'],
            ['menu:themeColor', 'violet'],
        ]);
    });

    it('synchronizes every checkmark without allowing the last color to win', () => {
        const items = new Map(
            [
                'theme-mode-dark',
                'theme-mode-light',
                'theme-color-blue',
                'theme-color-red',
                'theme-color-violet',
            ].map((id) => [id, { checked: true }])
        );

        syncThemeMenuChecks({ mode: 'light', color: 'red' }, (id) =>
            items.get(id)
        );

        expect(Object.fromEntries(items)).toEqual({
            'theme-mode-dark': { checked: false },
            'theme-mode-light': { checked: true },
            'theme-color-blue': { checked: false },
            'theme-color-red': { checked: true },
            'theme-color-violet': { checked: false },
        });
    });
});
