import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';

export function AboutModal({
    version,
    onClose,
}: {
    version: string;
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
                    aria-labelledby="about-title"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="modal__title" id="about-title">
                        Doodle Studio
                    </div>
                    <div className="about__version">Version {version}</div>
                    <p className="modal__message">
                        A visual editor and playtesting environment for Doodle
                        Engine games.
                    </p>
                    <div className="modal__actions">
                        <button className="btn btn--accent" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </OverlayPortal>
    );
}
