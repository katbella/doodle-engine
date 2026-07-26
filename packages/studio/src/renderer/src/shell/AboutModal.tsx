import { ModalShell } from './ModalShell';

export function AboutModal({
    version,
    onClose,
}: {
    version: string;
    onClose: () => void;
}) {
    const currentYear = new Date().getFullYear();
    return (
        <ModalShell
            title="Doodle Studio"
            className="modal modal--about"
            onDismiss={onClose}
        >
            <div className="about__version">Version {version}</div>
            <p className="modal__message">
                A visual editor and playtesting environment for Doodle Engine
                games.
            </p>
            <p className="about__copyright">&copy; {currentYear} Kat Bella</p>
            <div className="modal__actions">
                <button className="btn btn--accent" onClick={onClose}>
                    Close
                </button>
            </div>
        </ModalShell>
    );
}
