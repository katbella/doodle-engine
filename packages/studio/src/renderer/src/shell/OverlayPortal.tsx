import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_MARGIN = 8;

export function OverlayPortal({ children }: { children: React.ReactNode }) {
    return createPortal(children, document.body);
}

/** A body-level menu positioned from its trigger and kept inside the viewport. */
export function AnchoredOverlay({
    anchorRef,
    className,
    align = 'start',
    children,
}: {
    anchorRef: React.RefObject<HTMLElement | null>;
    className: string;
    align?: 'start' | 'end';
    children: React.ReactNode;
}) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{
        left: number;
        top: number;
        maxHeight: number;
    } | null>(null);

    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        const overlay = overlayRef.current;
        if (!anchor || !overlay) return;

        const place = () => {
            const anchorRect = anchor.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            const spaceBelow =
                window.innerHeight - anchorRect.bottom - VIEWPORT_MARGIN;
            const spaceAbove = anchorRect.top - VIEWPORT_MARGIN;
            const openAbove =
                spaceBelow < overlayRect.height && spaceAbove > spaceBelow;
            const availableHeight = Math.max(
                0,
                openAbove ? spaceAbove : spaceBelow
            );
            const desiredLeft =
                align === 'end'
                    ? anchorRect.right - overlayRect.width
                    : anchorRect.left;
            const maxLeft = Math.max(
                VIEWPORT_MARGIN,
                window.innerWidth - overlayRect.width - VIEWPORT_MARGIN
            );
            const left = Math.min(
                Math.max(VIEWPORT_MARGIN, desiredLeft),
                maxLeft
            );
            const top = openAbove
                ? Math.max(
                      VIEWPORT_MARGIN,
                      anchorRect.top -
                          Math.min(overlayRect.height, availableHeight) -
                          4
                  )
                : Math.min(
                      window.innerHeight - VIEWPORT_MARGIN,
                      anchorRect.bottom + 4
                  );
            setPosition({ left, top, maxHeight: availableHeight });
        };

        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(place);
        observer?.observe(overlay);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
            observer?.disconnect();
        };
    }, [align, anchorRef]);

    return (
        <OverlayPortal>
            <div
                ref={overlayRef}
                className={className}
                style={
                    position
                        ? {
                              left: position.left,
                              top: position.top,
                              maxHeight: position.maxHeight,
                          }
                        : { visibility: 'hidden' }
                }
            >
                {children}
            </div>
        </OverlayPortal>
    );
}

/** A body-level context menu clamped around the point that opened it. */
export function PointOverlay({
    x,
    y,
    className,
    children,
}: {
    x: number;
    y: number;
    className: string;
    children: React.ReactNode;
}) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{
        left: number;
        top: number;
    } | null>(null);

    useLayoutEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const place = () => {
            const rect = overlay.getBoundingClientRect();
            setPosition({
                left: Math.max(
                    VIEWPORT_MARGIN,
                    Math.min(
                        x,
                        window.innerWidth - rect.width - VIEWPORT_MARGIN
                    )
                ),
                top: Math.max(
                    VIEWPORT_MARGIN,
                    Math.min(
                        y,
                        window.innerHeight - rect.height - VIEWPORT_MARGIN
                    )
                ),
            });
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, [x, y]);

    return (
        <OverlayPortal>
            <div
                ref={overlayRef}
                className={className}
                style={
                    position
                        ? { left: position.left, top: position.top }
                        : { visibility: 'hidden' }
                }
            >
                {children}
            </div>
        </OverlayPortal>
    );
}
