import {
    useId,
    useLayoutEffect,
    useRef,
    type ReactNode,
    type RefObject,
} from 'react';
import { OverlayPortal } from './OverlayPortal';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
].join(',');

const openModals: symbol[] = [];

export function isAnyModalOpen(): boolean {
    return openModals.length > 0;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(
        (element) =>
            !element.hidden && element.getAttribute('aria-hidden') !== 'true'
    );
}

export interface ModalShellProps {
    children: ReactNode;
    onDismiss: () => void;
    title?: ReactNode;
    ariaLabel?: string;
    className?: string;
    backdropClassName?: string;
    initialFocusRef?: RefObject<HTMLElement | null>;
    dismissOnBackdrop?: boolean;
    dismissOnBackdropMouseDown?: boolean;
    dismissOnEscape?: boolean;
}

export function ModalShell({
    children,
    onDismiss,
    title,
    ariaLabel,
    className = 'modal',
    backdropClassName = '',
    initialFocusRef,
    dismissOnBackdrop = true,
    dismissOnBackdropMouseDown = false,
    dismissOnEscape = true,
}: ModalShellProps) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const modalIdRef = useRef(Symbol('studio-modal'));
    const dismissRef = useRef(onDismiss);

    useLayoutEffect(() => {
        dismissRef.current = onDismiss;
    }, [onDismiss]);

    useLayoutEffect(() => {
        const modalId = modalIdRef.current;
        const dialog = dialogRef.current;
        const previouslyFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        openModals.push(modalId);

        const isTopmost = () => openModals.at(-1) === modalId;
        const focusFirst = () => {
            const target =
                initialFocusRef?.current ??
                dialog?.querySelector<HTMLElement>('[autofocus]') ??
                (dialog ? focusableElements(dialog)[0] : null) ??
                dialog;
            target?.focus();
        };

        focusFirst();

        const onKeyDown = (event: KeyboardEvent) => {
            if (!dialog || !isTopmost()) return;
            if (event.key === 'Escape' && dismissOnEscape) {
                event.preventDefault();
                event.stopImmediatePropagation();
                dismissRef.current();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = focusableElements(dialog);
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const active = document.activeElement;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (
                event.shiftKey &&
                (active === first || !dialog.contains(active))
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                (active === last || !dialog.contains(active))
            ) {
                event.preventDefault();
                first.focus();
            }
        };

        const onFocusIn = (event: FocusEvent) => {
            if (
                dialog &&
                isTopmost() &&
                event.target instanceof Node &&
                !dialog.contains(event.target)
            ) {
                focusFirst();
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('focusin', onFocusIn, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('focusin', onFocusIn, true);
            const index = openModals.lastIndexOf(modalId);
            if (index >= 0) openModals.splice(index, 1);
            if (previouslyFocused?.isConnected) previouslyFocused.focus();
        };
    }, [dismissOnEscape, initialFocusRef]);

    return (
        <OverlayPortal>
            <div
                className={`modal-backdrop ${backdropClassName}`.trim()}
                onMouseDown={(event) => {
                    if (
                        dismissOnBackdrop &&
                        dismissOnBackdropMouseDown &&
                        event.target === event.currentTarget
                    ) {
                        onDismiss();
                    }
                }}
                onClick={(event) => {
                    if (
                        dismissOnBackdrop &&
                        !dismissOnBackdropMouseDown &&
                        event.target === event.currentTarget
                    ) {
                        onDismiss();
                    }
                }}
            >
                <div
                    ref={dialogRef}
                    className={className}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={title === undefined ? undefined : titleId}
                    aria-label={title === undefined ? ariaLabel : undefined}
                    tabIndex={-1}
                >
                    {title !== undefined && (
                        <div className="modal__title" id={titleId}>
                            {title}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </OverlayPortal>
    );
}
