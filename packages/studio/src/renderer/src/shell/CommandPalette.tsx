import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Search } from '../lib/icons';

export interface Command {
    id: string;
    label: string;
    group: string;
    /** Extra words to match on that aren't in the visible label. */
    keywords?: string;
    hint?: string;
    icon?: ReactNode;
    run: () => void;
}

/** Fuzzy-ish filter: every whitespace-separated term in the query must appear
 * somewhere in the command's searchable text. */
function matches(command: Command, terms: string[]): boolean {
    if (terms.length === 0) return true;
    const hay =
        `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
}

export function CommandPalette({
    commands,
    onClose,
}: {
    commands: Command[];
    onClose: () => void;
}) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = useMemo(
        () => commands.filter((c) => matches(c, terms)),
        [commands, terms.join(' ')]
    );

    // Keep the highlight on the first result as the list changes under it.
    useEffect(() => setActive(0), [query]);
    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const run = (command: Command | undefined) => {
        if (!command) return;
        onClose();
        command.run();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            run(filtered[active]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div className="modal-backdrop palette-backdrop" onMouseDown={onClose}>
            <div
                className="palette"
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="palette__search">
                    <Search size={16} aria-hidden />
                    <input
                        ref={inputRef}
                        className="palette__input"
                        placeholder="Type a command or search files…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="palette-list"
                        aria-activedescendant={
                            filtered[active]
                                ? `palette-opt-${filtered[active].id}`
                                : undefined
                        }
                    />
                </div>
                <div
                    className="palette__list scroll"
                    id="palette-list"
                    role="listbox"
                >
                    {filtered.length === 0 && (
                        <div className="palette__empty">
                            No matching commands.
                        </div>
                    )}
                    {filtered.map((command, i) => {
                        const showGroup =
                            i === 0 || filtered[i - 1].group !== command.group;
                        return (
                            <div key={command.id}>
                                {showGroup && (
                                    <div className="palette__group">
                                        {command.group}
                                    </div>
                                )}
                                <button
                                    ref={i === active ? activeRef : undefined}
                                    id={`palette-opt-${command.id}`}
                                    role="option"
                                    aria-selected={i === active}
                                    className={`palette__opt ${
                                        i === active
                                            ? 'palette__opt--active'
                                            : ''
                                    }`}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => run(command)}
                                >
                                    {command.icon && (
                                        <span
                                            className="palette__opt-icon"
                                            aria-hidden
                                        >
                                            {command.icon}
                                        </span>
                                    )}
                                    <span className="palette__opt-label">
                                        {command.label}
                                    </span>
                                    {command.hint && (
                                        <span className="palette__opt-hint">
                                            {command.hint}
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
