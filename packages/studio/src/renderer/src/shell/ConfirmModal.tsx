import { ModalShell } from './ModalShell';

/** Application-level confirmation with consistent focus and keyboard handling. */
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
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <ModalShell title={title} onDismiss={onCancel}>
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
        </ModalShell>
    );
}
