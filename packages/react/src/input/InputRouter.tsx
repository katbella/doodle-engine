/**
 * Renderer-level input command routing.
 *
 * Physical inputs are translated into commands, then delivered to the highest
 * priority active handler. This keeps overlays and modals from leaking input to
 * the gameplay UI underneath them.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';

export type InputCommand =
    | 'confirm'
    | 'cancel'
    | 'continue'
    | `choice${number}`
    | 'next'
    | 'previous'
    | 'openInventory'
    | 'openJournal'
    | 'openMap'
    | 'openMenu';

export interface InputCommandEvent {
    command: InputCommand;
    source: 'keyboard' | 'controller' | 'programmatic';
    choiceIndex?: number;
    originalEvent?: KeyboardEvent;
}

export type InputCommandHandler = (
    event: InputCommandEvent
) => boolean | void;

export interface InputHandlerOptions {
    /** Higher priority handlers receive commands first. */
    priority?: number;
    /** Disabled handlers remain registered but do not receive commands. */
    enabled?: boolean;
}

export interface InputHandlerEntry {
    id: number;
    priority: number;
    enabled: boolean;
    handleCommand: InputCommandHandler;
}

export interface InputRouterValue {
    dispatchCommand: (event: InputCommandEvent) => boolean;
    registerHandler: (
        getEntry: () => Omit<InputHandlerEntry, 'id'>
    ) => () => void;
}

export interface KeyboardCommandDescriptor {
    command: InputCommand;
    choiceIndex?: number;
}

interface KeyboardLike {
    key: string;
    code?: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}

export const InputRouterContext = createContext<InputRouterValue | null>(null);

export function mapKeyboardEventToInputCommand(
    event: KeyboardLike
): KeyboardCommandDescriptor | null {
    if (event.altKey || event.ctrlKey || event.metaKey) {
        return null;
    }

    if (event.key === 'Enter') {
        return { command: 'confirm' };
    }
    if (event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space') {
        return { command: 'confirm' };
    }
    if (event.key === 'Escape') {
        return { command: 'cancel' };
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        return { command: 'next' };
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        return { command: 'previous' };
    }
    if (/^[1-9]$/.test(event.key)) {
        const choiceNumber = Number(event.key);
        return {
            command: `choice${choiceNumber}`,
            choiceIndex: choiceNumber - 1,
        };
    }

    return null;
}

export function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function dispatchToInputHandlers(
    handlers: InputHandlerEntry[],
    event: InputCommandEvent
): boolean {
    const orderedHandlers = [...handlers]
        .filter((handler) => handler.enabled)
        .sort((a, b) => b.priority - a.priority || b.id - a.id);

    for (const handler of orderedHandlers) {
        if (handler.handleCommand(event)) {
            return true;
        }
    }

    return false;
}

export function InputProvider({ children }: { children: ReactNode }) {
    const handlersRef = useRef(new Map<number, () => Omit<InputHandlerEntry, 'id'>>());
    const nextIdRef = useRef(1);

    const registerHandler = useCallback(
        (getEntry: () => Omit<InputHandlerEntry, 'id'>) => {
            const id = nextIdRef.current;
            nextIdRef.current += 1;
            handlersRef.current.set(id, getEntry);

            return () => {
                handlersRef.current.delete(id);
            };
        },
        []
    );

    const dispatchCommand = useCallback((event: InputCommandEvent) => {
        const handlers = [...handlersRef.current.entries()].map(
            ([id, getEntry]) => ({
                id,
                ...getEntry(),
            })
        );

        return dispatchToInputHandlers(handlers, event);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (shouldIgnoreKeyboardEvent(event)) {
                return;
            }

            const descriptor = mapKeyboardEventToInputCommand(event);
            if (!descriptor) {
                return;
            }

            const handled = dispatchCommand({
                ...descriptor,
                source: 'keyboard',
                originalEvent: event,
            });

            if (handled) {
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatchCommand]);

    return (
        <InputRouterContext.Provider
            value={{ dispatchCommand, registerHandler }}
        >
            {children}
        </InputRouterContext.Provider>
    );
}

export function InputProviderBoundary({ children }: { children: ReactNode }) {
    const existingRouter = useContext(InputRouterContext);
    if (existingRouter) {
        return <>{children}</>;
    }

    return <InputProvider>{children}</InputProvider>;
}

export function useInputRouter(): InputRouterValue | null {
    return useContext(InputRouterContext);
}

export function useInputAction(
    handleCommand: InputCommandHandler,
    options: InputHandlerOptions = {}
) {
    const router = useInputRouter();
    const handleCommandRef = useRef(handleCommand);
    const priorityRef = useRef(options.priority ?? 0);
    const enabledRef = useRef(options.enabled ?? true);

    handleCommandRef.current = handleCommand;
    priorityRef.current = options.priority ?? 0;
    enabledRef.current = options.enabled ?? true;

    useEffect(() => {
        if (router) {
            return router.registerHandler(() => ({
                priority: priorityRef.current,
                enabled: enabledRef.current,
                handleCommand: (event) => handleCommandRef.current(event),
            }));
        }

        if (typeof window === 'undefined') {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (shouldIgnoreKeyboardEvent(event)) {
                return;
            }

            const descriptor = mapKeyboardEventToInputCommand(event);
            if (!descriptor || !enabledRef.current) {
                return;
            }

            const handled = handleCommandRef.current({
                ...descriptor,
                source: 'keyboard',
                originalEvent: event,
            });

            if (handled) {
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router]);
}
