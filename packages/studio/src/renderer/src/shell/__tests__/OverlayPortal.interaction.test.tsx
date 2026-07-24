// @vitest-environment jsdom

import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AnchoredOverlay, OverlayPortal, PointOverlay } from '../OverlayPortal';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function rect(
    left: number,
    top: number,
    width: number,
    height: number
): DOMRect {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
    };
}

function setViewport(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: height,
    });
}

function AnchoredHarness({ align }: { align?: 'start' | 'end' }) {
    const anchorRef = useRef<HTMLButtonElement>(null);
    return (
        <div data-testid="host">
            <button ref={anchorRef} data-anchor>
                Open
            </button>
            <AnchoredOverlay
                anchorRef={anchorRef}
                align={align}
                className="test-menu"
            >
                Menu content
            </AnchoredOverlay>
        </div>
    );
}

describe('overlay positioning', () => {
    it('portals content to the document body', () => {
        const { container } = render(
            <div>
                Host
                <OverlayPortal>
                    <span>Portaled content</span>
                </OverlayPortal>
            </div>
        );

        expect(container.textContent).toBe('Host');
        expect(screen.getByText('Portaled content').parentElement).toBe(
            document.body
        );
    });

    it('places an anchored menu below its trigger and tracks viewport changes', () => {
        setViewport(300, 200);
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect'
        ).mockImplementation(function (this: HTMLElement) {
            return this.hasAttribute('data-anchor')
                ? rect(20, 10, 50, 20)
                : rect(0, 0, 100, 60);
        });
        const disconnect = vi.fn();
        const observe = vi.fn();
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe = observe;
                disconnect = disconnect;
            }
        );

        const { unmount } = render(<AnchoredHarness />);
        const menu = screen.getByText('Menu content');
        expect(menu.style.left).toBe('20px');
        expect(menu.style.top).toBe('34px');
        expect(menu.style.maxHeight).toBe('162px');
        expect(observe).toHaveBeenCalledWith(menu);

        fireEvent.resize(window);
        fireEvent.scroll(window);
        unmount();
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it('opens above and clamps an end-aligned menu inside the viewport', () => {
        setViewport(200, 120);
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect'
        ).mockImplementation(function (this: HTMLElement) {
            return this.hasAttribute('data-anchor')
                ? rect(170, 90, 25, 20)
                : rect(0, 0, 80, 70);
        });

        render(<AnchoredHarness align="end" />);
        const menu = screen.getByText('Menu content');
        expect(menu.style.left).toBe('112px');
        expect(menu.style.top).toBe('16px');
        expect(menu.style.maxHeight).toBe('82px');
    });

    it('clamps a point menu and repositions it after a resize', () => {
        setViewport(200, 120);
        vi.spyOn(
            HTMLElement.prototype,
            'getBoundingClientRect'
        ).mockReturnValue(rect(0, 0, 80, 40));

        render(
            <PointOverlay x={190} y={115} className="point-menu">
                Context action
            </PointOverlay>
        );
        const menu = screen.getByText('Context action');
        expect(menu.style.left).toBe('112px');
        expect(menu.style.top).toBe('72px');

        setViewport(300, 200);
        fireEvent.resize(window);
        expect(menu.style.left).toBe('190px');
        expect(menu.style.top).toBe('115px');
    });
});
