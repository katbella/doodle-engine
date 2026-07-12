import { useCallback, useRef } from 'react';

/**
 * A draggable divider. On drag it reports the new size for the region it borders,
 * computed from the pointer position and clamped to [min, max]. `axis` is the
 * dimension being sized: 'x' for a vertical handle (resizes width), 'y' for a
 * horizontal handle (resizes height).
 */
export function ResizeHandle({
    axis,
    /** Current size in px, so a drag starts from where the region actually is. */
    size,
    min,
    max,
    /** True when dragging grows the region in the opposite direction of pointer
     * movement (a right-side or bottom handle, where the region is before it). */
    invert,
    onResize,
}: {
    axis: 'x' | 'y';
    size: number;
    min: number;
    max: number;
    invert?: boolean;
    onResize: (size: number) => void;
}) {
    const start = useRef({ pos: 0, size: 0 });

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            start.current = {
                pos: axis === 'x' ? e.clientX : e.clientY,
                size,
            };
        },
        [axis, size]
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId))
                return;
            const now = axis === 'x' ? e.clientX : e.clientY;
            const delta = (now - start.current.pos) * (invert ? -1 : 1);
            const next = Math.min(
                max,
                Math.max(min, start.current.size + delta)
            );
            onResize(next);
        },
        [axis, invert, min, max, onResize]
    );

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    return (
        <div
            className={`resize-handle resize-handle--${axis}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            role="separator"
            aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
        />
    );
}
