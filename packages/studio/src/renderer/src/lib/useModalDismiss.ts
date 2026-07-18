import { useEffect } from 'react';

/** Close a modal with Escape. Backdrop click handling stays on the modal shell. */
export function useModalDismiss(onDismiss: () => void): void {
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onDismiss();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onDismiss]);
}
