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
    /** Style the confirm button as destructive. */
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__title">{title}</div>
                <p className="modal__message">{message}</p>
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
    );
}
