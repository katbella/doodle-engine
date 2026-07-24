import { useEffect, useState } from 'react';
import { THEMES } from '../../../shared/project';
import type { ThemeMode } from '../../../shared/project';

/** The current theme, read from the root data-theme attribute and kept in sync. */
export function useThemeName(): ThemeMode {
    const read = (): ThemeMode => {
        const value = document.documentElement.getAttribute('data-theme');
        return THEMES.some((theme) => theme.id === value)
            ? (value as ThemeMode)
            : 'dark';
    };

    const [theme, setTheme] = useState<ThemeMode>(read);

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => setTheme(read()));
        observer.observe(root, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    return theme;
}
