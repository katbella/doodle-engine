import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';
import type {
    StudioUpdatePlatform,
    StudioUpdateState,
} from '../../../shared/project';

function installInstruction(platform: StudioUpdatePlatform): string {
    if (platform === 'mac') {
        return 'Download it, then drag Doodle Studio into your Applications folder to replace this version.';
    }
    return 'Download and run the installer. It replaces this version in place.';
}

export function StudioUpdateModal({
    state,
    onDownload,
    onCheck,
    onClose,
}: {
    state: StudioUpdateState;
    onDownload: () => void;
    onCheck: () => void;
    onClose: () => void;
}) {
    useModalDismiss(onClose);
    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onClose}>
                <div
                    className="modal modal--about"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="update-title"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="modal__title" id="update-title">
                        Doodle Studio
                    </div>
                    <Body state={state} />
                    <Actions
                        state={state}
                        onDownload={onDownload}
                        onCheck={onCheck}
                        onClose={onClose}
                    />
                </div>
            </div>
        </OverlayPortal>
    );
}

function Body({ state }: { state: StudioUpdateState }) {
    switch (state.status) {
        case 'checking':
            return <p className="modal__message">Checking for updates…</p>;
        case 'current':
            return (
                <p className="modal__message">
                    Doodle Studio is up to date.
                    <br />
                    <span className="about__version">
                        Version {state.currentVersion}
                    </span>
                </p>
            );
        case 'available':
            return (
                <>
                    <div className="about__version">
                        Version {state.version} is available. You have{' '}
                        {state.currentVersion}.
                    </div>
                    <p className="modal__message">
                        {installInstruction(state.platform)}
                    </p>
                    {state.releaseNotes && (
                        <p className="modal__message">
                            {clampNotes(state.releaseNotes)}
                        </p>
                    )}
                </>
            );
        case 'error':
            return (
                <div className="modal__error">
                    Could not check for updates. {state.message}
                </div>
            );
        case 'idle':
        default:
            return null;
    }
}

function Actions({
    state,
    onDownload,
    onCheck,
    onClose,
}: {
    state: StudioUpdateState;
    onDownload: () => void;
    onCheck: () => void;
    onClose: () => void;
}) {
    if (state.status === 'available') {
        return (
            <div className="modal__actions">
                <button className="btn" onClick={onClose}>
                    Close
                </button>
                <button className="btn btn--accent" onClick={onDownload}>
                    Download
                </button>
            </div>
        );
    }
    if (state.status === 'error') {
        return (
            <div className="modal__actions">
                <button className="btn" onClick={onClose}>
                    Close
                </button>
                <button className="btn btn--accent" onClick={onCheck}>
                    Try Again
                </button>
            </div>
        );
    }
    if (state.status === 'checking') {
        return null;
    }
    return (
        <div className="modal__actions">
            <button className="btn btn--accent" onClick={onClose}>
                Close
            </button>
        </div>
    );
}

/** Keep untrusted release notes short; React renders them as text. */
function clampNotes(notes: string): string {
    const trimmed = notes.trim();
    const limit = 600;
    return trimmed.length > limit
        ? `${trimmed.slice(0, limit).trimEnd()}…`
        : trimmed;
}
