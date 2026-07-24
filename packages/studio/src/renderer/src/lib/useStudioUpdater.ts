import { useCallback, useEffect, useState } from 'react';
import type { StudioUpdateState } from '../../../shared/project';

export interface StudioUpdaterUi {
    state: StudioUpdateState | null;
    open: boolean;
    check: () => void;
    openDownload: () => void;
    close: () => void;
}

/** Show all manual results, but only available updates from startup checks. */
export function useStudioUpdater(): StudioUpdaterUi {
    const [state, setState] = useState<StudioUpdateState | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let active = true;
        let receivedState = false;
        const applyState = (next: StudioUpdateState) => {
            if (!active) return;
            setState(next);
            if (shouldShow(next)) setOpen(true);
        };
        const unsubscribe = window.studio.onStudioUpdateState?.((next) => {
            receivedState = true;
            applyState(next);
        });
        const initial = window.studio.getStudioUpdateState?.();
        if (initial) {
            void initial.then((value) => {
                if (receivedState) return;
                applyState(value);
            });
        }
        return () => {
            active = false;
            unsubscribe?.();
        };
    }, []);

    const check = useCallback(() => {
        setOpen(true);
        void window.studio.checkForStudioUpdates?.();
    }, []);
    const openDownload = useCallback(() => {
        void window.studio.openStudioUpdateDownload?.();
    }, []);
    const close = useCallback(() => setOpen(false), []);

    return { state, open, check, openDownload, close };
}

function shouldShow(state: StudioUpdateState): boolean {
    if (state.status === 'available') return true;
    if (state.status === 'idle') return false;
    return state.manual;
}
