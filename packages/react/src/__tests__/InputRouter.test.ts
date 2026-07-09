/**
 * Tests for renderer-level input command routing.
 */

import { describe, expect, it, vi } from 'vitest';
import {
    dispatchToInputHandlers,
    mapKeyboardEventToInputCommand,
    type InputCommandEvent,
    type InputHandlerEntry,
} from '../input/InputRouter';

function commandEvent(command: InputCommandEvent['command']): InputCommandEvent {
    return {
        command,
        source: 'keyboard',
    };
}

describe('mapKeyboardEventToInputCommand', () => {
    it('maps confirm keys', () => {
        expect(mapKeyboardEventToInputCommand({ key: 'Enter' })).toEqual({
            command: 'confirm',
        });
        expect(mapKeyboardEventToInputCommand({ key: ' ' })).toEqual({
            command: 'confirm',
        });
        expect(
            mapKeyboardEventToInputCommand({ key: 'Spacebar' })
        ).toEqual({
            command: 'confirm',
        });
    });

    it('maps cancel and navigation keys', () => {
        expect(mapKeyboardEventToInputCommand({ key: 'Escape' })).toEqual({
            command: 'cancel',
        });
        expect(mapKeyboardEventToInputCommand({ key: 'ArrowDown' })).toEqual({
            command: 'next',
        });
        expect(mapKeyboardEventToInputCommand({ key: 'ArrowUp' })).toEqual({
            command: 'previous',
        });
    });

    it('maps number keys to choice commands', () => {
        expect(mapKeyboardEventToInputCommand({ key: '1' })).toEqual({
            command: 'choice1',
            choiceIndex: 0,
        });
        expect(mapKeyboardEventToInputCommand({ key: '9' })).toEqual({
            command: 'choice9',
            choiceIndex: 8,
        });
    });

    it('ignores modified shortcuts and unsupported keys', () => {
        expect(
            mapKeyboardEventToInputCommand({ key: '1', ctrlKey: true })
        ).toBeNull();
        expect(mapKeyboardEventToInputCommand({ key: 'a' })).toBeNull();
        expect(mapKeyboardEventToInputCommand({ key: '0' })).toBeNull();
    });
});

describe('dispatchToInputHandlers', () => {
    it('delivers commands to the highest priority enabled handler first', () => {
        const low = vi.fn(() => true);
        const high = vi.fn(() => true);
        const handlers: InputHandlerEntry[] = [
            {
                id: 1,
                priority: 0,
                enabled: true,
                handleCommand: low,
            },
            {
                id: 2,
                priority: 100,
                enabled: true,
                handleCommand: high,
            },
        ];

        expect(dispatchToInputHandlers(handlers, commandEvent('confirm'))).toBe(
            true
        );
        expect(high).toHaveBeenCalledOnce();
        expect(low).not.toHaveBeenCalled();
    });

    it('falls through when a higher priority handler does not consume', () => {
        const low = vi.fn(() => true);
        const high = vi.fn(() => false);
        const handlers: InputHandlerEntry[] = [
            {
                id: 1,
                priority: 0,
                enabled: true,
                handleCommand: low,
            },
            {
                id: 2,
                priority: 100,
                enabled: true,
                handleCommand: high,
            },
        ];

        expect(dispatchToInputHandlers(handlers, commandEvent('confirm'))).toBe(
            true
        );
        expect(high).toHaveBeenCalledOnce();
        expect(low).toHaveBeenCalledOnce();
    });

    it('ignores disabled handlers', () => {
        const disabled = vi.fn(() => true);
        const enabled = vi.fn(() => true);
        const handlers: InputHandlerEntry[] = [
            {
                id: 1,
                priority: 100,
                enabled: false,
                handleCommand: disabled,
            },
            {
                id: 2,
                priority: 0,
                enabled: true,
                handleCommand: enabled,
            },
        ];

        expect(dispatchToInputHandlers(handlers, commandEvent('cancel'))).toBe(
            true
        );
        expect(disabled).not.toHaveBeenCalled();
        expect(enabled).toHaveBeenCalledOnce();
    });
});
