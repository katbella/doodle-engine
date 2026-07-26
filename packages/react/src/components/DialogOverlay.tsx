import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
].join(',');

const openDialogs: symbol[] = [];

function focusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(
        (element) =>
            !element.hidden && element.getAttribute('aria-hidden') !== 'true'
    );
}

export interface DialogOverlayProps {
    children: ReactNode;
    onDismiss: () => void;
    ariaLabel: string;
    overlayClassName: string;
    className: string;
    initialFocusRef?: RefObject<HTMLElement | null>;
    dismissOnBackdrop?: boolean;
    dismissOnEscape?: boolean;
}

export function DialogOverlay({
    children,
    onDismiss,
    ariaLabel,
    overlayClassName,
    className,
    initialFocusRef,
    dismissOnBackdrop = true,
    dismissOnEscape = true,
}: DialogOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const dialogIdRef = useRef(Symbol('doodle-dialog'));
    const dismissRef = useRef(onDismiss);

    useLayoutEffect(() => {
        dismissRef.current = onDismiss;
    }, [onDismiss]);

    useLayoutEffect(() => {
        const dialogId = dialogIdRef.current;
        const dialog = dialogRef.current;
        const previouslyFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        openDialogs.push(dialogId);

        const isTopmost = () => openDialogs.at(-1) === dialogId;
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
            const index = openDialogs.lastIndexOf(dialogId);
            if (index >= 0) openDialogs.splice(index, 1);
            if (previouslyFocused?.isConnected) previouslyFocused.focus();
        };
    }, [dismissOnEscape, initialFocusRef]);

    return (
        <div
            className={overlayClassName}
            onClick={(event) => {
                if (dismissOnBackdrop && event.target === event.currentTarget) {
                    onDismiss();
                }
            }}
        >
            <div
                ref={dialogRef}
                className={className}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                tabIndex={-1}
            >
                {children}
            </div>
        </div>
    );
}
