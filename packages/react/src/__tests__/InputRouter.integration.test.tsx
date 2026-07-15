// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { InputProvider, useInputAction } from '../input/InputRouter';

afterEach(cleanup);

function GameLayer({ onCancel }: { onCancel: () => void }) {
    useInputAction(
        ({ command }) => {
            if (command === 'cancel') {
                onCancel();
                return true;
            }
            return false;
        },
        { priority: 0 }
    );
    return null;
}

function OverlayLayer({
    onCancel,
    enabled,
}: {
    onCancel: () => void;
    enabled: boolean;
}) {
    useInputAction(
        ({ command }) => {
            if (command === 'cancel') {
                onCancel();
                return true;
            }
            return false;
        },
        { priority: 100, enabled }
    );
    return null;
}

describe('InputProvider priority routing', () => {
    it('a higher-priority overlay handler consumes Escape before the base game layer', () => {
        const gameCancel = vi.fn();
        const overlayCancel = vi.fn();

        render(
            <InputProvider>
                <GameLayer onCancel={gameCancel} />
                <OverlayLayer onCancel={overlayCancel} enabled={true} />
            </InputProvider>
        );

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(overlayCancel).toHaveBeenCalledOnce();
        expect(gameCancel).not.toHaveBeenCalled();
    });

    it('falls through to the game layer once the overlay is disabled', () => {
        const gameCancel = vi.fn();
        const overlayCancel = vi.fn();

        render(
            <InputProvider>
                <GameLayer onCancel={gameCancel} />
                <OverlayLayer onCancel={overlayCancel} enabled={false} />
            </InputProvider>
        );

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(overlayCancel).not.toHaveBeenCalled();
        expect(gameCancel).toHaveBeenCalledOnce();
    });

    it('falls through to the game layer once the overlay unmounts', () => {
        const gameCancel = vi.fn();
        const overlayCancel = vi.fn();

        function Scene() {
            const [showOverlay, setShowOverlay] = useState(true);
            return (
                <InputProvider>
                    <GameLayer onCancel={gameCancel} />
                    {showOverlay && (
                        <OverlayLayer onCancel={overlayCancel} enabled={true} />
                    )}
                    <button onClick={() => setShowOverlay(false)}>close</button>
                </InputProvider>
            );
        }

        const { getByText } = render(<Scene />);

        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(overlayCancel).toHaveBeenCalledOnce();
        expect(gameCancel).not.toHaveBeenCalled();

        fireEvent.click(getByText('close'));
        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(overlayCancel).toHaveBeenCalledOnce();
        expect(gameCancel).toHaveBeenCalledOnce();
    });

    it('does not dispatch a shortcut while typing in a focused text field', () => {
        const gameCancel = vi.fn();
        render(
            <InputProvider>
                <input data-testid="field" />
                <GameLayer onCancel={gameCancel} />
            </InputProvider>
        );
        const input = document.querySelector(
            '[data-testid="field"]'
        ) as HTMLInputElement;
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(gameCancel).not.toHaveBeenCalled();
    });
});
