import { Download } from '../lib/icons';
import { ModalShell } from './ModalShell';
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
    onViewChangelog,
    onCheck,
    onClose,
}: {
    state: StudioUpdateState;
    onDownload: () => void;
    onViewChangelog: () => void;
    onCheck: () => void;
    onClose: () => void;
}) {
    return (
        <ModalShell
            title={titleForState(state)}
            className="modal modal--update"
            onDismiss={onClose}
        >
            <Body state={state} onViewChangelog={onViewChangelog} />
            <Actions
                state={state}
                onDownload={onDownload}
                onCheck={onCheck}
                onClose={onClose}
            />
        </ModalShell>
    );
}

function Body({
    state,
    onViewChangelog,
}: {
    state: StudioUpdateState;
    onViewChangelog: () => void;
}) {
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
                        <ReleaseNotes
                            notes={state.releaseNotes}
                            onViewChangelog={onViewChangelog}
                        />
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

function ReleaseNotes({
    notes,
    onViewChangelog,
}: {
    notes: string;
    onViewChangelog: () => void;
}) {
    const summary = releaseNoteSummary(notes);
    if (!summary) return null;
    return (
        <section className="update__notes" aria-labelledby="update-notes-title">
            <div className="update__notes-title" id="update-notes-title">
                What’s new
            </div>
            <p className="update__notes-summary">{summary}</p>
            <button
                type="button"
                className="update__notes-link"
                onClick={onViewChangelog}
            >
                View full changelog
            </button>
        </section>
    );
}

function releaseNoteSummary(notes: string): string | null {
    const lines = notes.split(/\r?\n/);
    const firstLine = lines.find((line) => line.trim().length > 0);
    if (firstLine && !/^#{1,6}\s+/.test(firstLine.trim())) {
        const summary = cleanReleaseNoteLine(firstLine);
        if (
            summary &&
            !/^All Doodle Engine packages in this release use version\b/i.test(
                summary
            )
        ) {
            return clampSummary(summary);
        }
    }

    const changesHeading = lines.findIndex((line) =>
        /^#{1,6}\s+what'?s changed\s*$/i.test(line.trim())
    );
    const candidates =
        changesHeading >= 0 ? lines.slice(changesHeading + 1) : lines;

    for (const candidate of candidates) {
        const line = candidate.trim();
        if (
            line.length === 0 ||
            /^#{1,6}\s+/.test(line) ||
            /^(?:\*\*)?full changelog(?:\*\*)?\s*:/i.test(line)
        ) {
            continue;
        }

        const summary = cleanReleaseNoteLine(line);
        if (summary) return clampSummary(summary);
    }

    return null;
}

function cleanReleaseNoteLine(line: string): string {
    return line
        .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
        .replace(/\s+by\s+@\S+\s+in\s+https?:\/\/\S+\s*$/i, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
}

function clampSummary(summary: string): string {
    const limit = 200;
    if (summary.length <= limit) return summary;
    const wordBoundary = summary.lastIndexOf(' ', limit);
    const end = wordBoundary >= limit / 2 ? wordBoundary : limit;
    return `${summary.slice(0, end).trimEnd()}…`;
}
