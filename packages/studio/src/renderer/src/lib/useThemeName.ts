import { useEffect, useState } from 'react';

/** The current theme, read from the root data-theme attribute and kept in sync. */
export function useThemeName(): 'dark' | 'light' {
    const read = (): 'dark' | 'light' =>
        document.documentElement.getAttribute('data-theme') === 'light'
            ? 'light'
            : 'dark';

    const [theme, setTheme] = useState<'dark' | 'light'>(read);

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
