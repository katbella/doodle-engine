import { useModalDismiss } from '../lib/useModalDismiss';
import { Download } from '../lib/icons';
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
                    className="modal modal--update"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="update-title"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="modal__title" id="update-title">
                        {titleForState(state)}
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
            return (
                <div className="update__checking">
                    <span className="spinner" aria-hidden />
                    <span>Looking for a newer Studio release…</span>
                </div>
            );
        case 'current':
            return (
                <div className="update__current-version">
                    Version {state.currentVersion}
                </div>
            );
        case 'available':
            return (
                <>
                    <div className="update__version-summary">
                        <span className="update__available-version">
                            Version {state.version}
                        </span>
                        <span className="update__installed-version">
                            Installed: {state.currentVersion}
                        </span>
                    </div>
                    <p className="modal__message">
                        {installInstruction(state.platform)}
                    </p>
                    {state.releaseNotes && (
                        <ReleaseNotes notes={state.releaseNotes} />
                    )}
                </>
            );
        case 'error':
            return (
                <div className="modal__error" role="alert">
                    {state.message}
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
                    <Download size={14} aria-hidden /> Download
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

function titleForState(state: StudioUpdateState): string {
    switch (state.status) {
        case 'checking':
            return 'Checking for updates';
        case 'current':
            return 'Doodle Studio is up to date';
        case 'available':
            return 'Update available';
        case 'error':
            return 'Could not check for updates';
        case 'idle':
        default:
            return 'Doodle Studio updates';
    }
}

function ReleaseNotes({ notes }: { notes: string }) {
    const items = releaseNoteItems(notes);
    if (items.length === 0) return null;
    return (
        <section className="update__notes" aria-labelledby="update-notes-title">
            <div className="update__notes-title" id="update-notes-title">
                What’s new
            </div>
            <ul className="update__notes-list">
                {items.map((item, index) => (
                    <li key={`${index}:${item}`}>{item}</li>
                ))}
            </ul>
        </section>
    );
}

/** Keep untrusted GitHub notes short and render them only as React text. */
function releaseNoteItems(notes: string): string[] {
    const trimmed = notes.trim();
    const limit = 600;
    const clamped =
        trimmed.length > limit
            ? `${trimmed.slice(0, limit).trimEnd()}…`
            : trimmed;
    return clamped
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(
            (line) =>
                line.length > 0 &&
                !/^#{1,6}\s+(what'?s changed|what'?s new)$/i.test(line) &&
                !/^(?:\*\*)?full changelog(?:\*\*)?\s*:/i.test(line)
        )
        .map((line) =>
            line
                .replace(/^#{1,6}\s+/, '')
                .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/(\*\*|__)(.*?)\1/g, '$2')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/\s+by\s+@\S+\s+in\s+https?:\/\/\S+\s*$/i, '')
                .trim()
        )
        .filter(Boolean)
        .slice(0, 6);
}
