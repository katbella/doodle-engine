import { useEffect, useState } from 'react';

const LOADING_INDICATOR_DELAY_MS = 150;

export function EditorLoading() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setVisible(true),
            LOADING_INDICATOR_DELAY_MS
        );
        return () => window.clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="editor__empty" role="status">
            <span className="spinner" aria-hidden />
            Loading…
        </div>
    );
}
