import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';

/** A simple confirm/cancel modal, used in place of window.confirm (which, as a
 * native dialog, leaves Electron's focus in a broken state for later modals). */
export function ConfirmModal({
    title,
    message,
    confirmLabel,
    danger,
    onConfirm,
    onCancel,
}: {
    title: string;
    message: string;
    confirmLabel: string;
    /** Style the confirm button as destructive and warn that the action is
     * permanent. Callers should not repeat the no-undo warning themselves. */
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useModalDismiss(onCancel);
    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onCancel}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal__title">{title}</div>
                    <p className="modal__message">
                        {message}
                        {danger && " This can't be undone."}
                    </p>
                    <div className="modal__actions">
                        <button className="btn" onClick={onCancel} autoFocus>
                            Cancel
                        </button>
                        <button
                            className={`btn ${danger ? 'btn--danger' : 'btn--accent'}`}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </OverlayPortal>
    );
}
