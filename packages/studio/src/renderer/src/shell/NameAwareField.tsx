import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type {
    NameCatalog,
    NameKind,
    NameSummary,
    StatSummary,
} from '../lib/flag-vars';
import { catalogFor, usageSummary } from '../lib/flag-vars';
import { useOpenFlagVar } from './FlagVarNavigation';

export function NameAwareField({
    kind,
    value,
    catalog,
    placeholder,
    ariaLabel,
    invalid = false,
    showContext = true,
    onChange,
    onBlur,
}: {
    kind: NameKind;
    value: string;
    catalog: NameCatalog;
    placeholder?: string;
    ariaLabel?: string;
    invalid?: boolean;
    /** Show the details panel under the field when the value is an existing
     * name. Off in list rows, where a panel per row would swamp the list. */
    showContext?: boolean;
    onChange: (value: string) => void;
    onBlur?: () => void;
}) {
    const [focused, setFocused] = useState(false);
    const [active, setActive] = useState(0);
    const openFlagVar = useOpenFlagVar();
    const inputRef = useRef<HTMLInputElement>(null);
    const all = catalogFor(catalog, kind);
    const exact = all.find((item) => item.id === value);
    const matches = useMemo(() => {
        const query = value.trim().toLocaleLowerCase();
        return all
            .filter((item) =>
                query ? item.id.toLocaleLowerCase().includes(query) : true
            )
            .sort((a, b) => {
                const aStarts = a.id.toLocaleLowerCase().startsWith(query);
                const bStarts = b.id.toLocaleLowerCase().startsWith(query);
                return (
                    Number(bStarts) - Number(aStarts) ||
                    a.id.localeCompare(b.id)
                );
            })
            .slice(0, 50);
    }, [all, value]);

    const choose = (summary: NameSummary | StatSummary) => {
        onChange(summary.id);
        setActive(0);
        setFocused(false);
        inputRef.current?.focus();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!focused) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setFocused(false);
            return;
        }
        if (matches.length === 0) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, matches.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Enter' && matches[active]) {
            event.preventDefault();
            choose(matches[active]);
        }
    };

    const newLabel = kind === 'stat' ? 'new stat' : `new ${kind}`;
    const contextLabel = `${kind[0].toLocaleUpperCase()}${kind.slice(1)} details`;
    const noteLabel = kind === 'flag' ? 'Flag note' : 'Variable note';
    const openNoteEditor = () => {
        if (kind !== 'stat') openFlagVar?.(kind, value);
    };

    return (
        <div className="name-field">
            <input
                ref={inputRef}
                className={`dlg__input mono ${invalid ? 'dlg__input--invalid' : ''}`}
                value={value}
                placeholder={placeholder}
                aria-label={ariaLabel}
                aria-invalid={invalid}
                aria-autocomplete="list"
                aria-expanded={focused}
                spellCheck={false}
                onFocus={() => {
                    setFocused(true);
                    setActive(0);
                }}
                onChange={(event) => {
                    onChange(event.target.value);
                    setFocused(true);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => {
                    window.setTimeout(() => setFocused(false), 0);
                    onBlur?.();
                }}
            />
            {showContext && exact && (
                <div className="name-field__context" aria-label={contextLabel}>
                    <div className="name-field__context-header">
                        <span className="name-field__context-label">
                            {contextLabel}
                        </span>
                        <span className="name-field__context-usage">
                            {usageSummary(exact)}
                        </span>
                    </div>
                    {kind !== 'stat' && (
                        <div className="name-field__context-note">
                            <div className="name-field__context-note-header">
                                <span className="name-field__context-note-label">
                                    {noteLabel}
                                </span>
                                {openFlagVar && (
                                    <button
                                        type="button"
                                        className="name-field__context-note-source"
                                        onClick={openNoteEditor}
                                    >
                                        Edit in Flags &amp; variables
                                    </button>
                                )}
                            </div>
                            <p
                                className={
                                    exact.note
                                        ? 'name-field__context-note-text'
                                        : 'name-field__context-note-text name-field__context-note-text--empty'
                                }
                            >
                                {exact.note ||
                                    `No note has been added for this ${kind}.`}
                            </p>
                        </div>
                    )}
                </div>
            )}
            {focused && (
                <div className="name-field__popover" role="listbox">
                    {matches.map((summary, index) => (
                        <button
                            key={summary.id}
                            type="button"
                            role="option"
                            aria-selected={index === active}
                            className={`name-field__option ${index === active ? 'name-field__option--active' : ''}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => choose(summary)}
                        >
                            <span className="name-field__option-main">
                                <span className="mono">{summary.id}</span>
                                <span className="name-field__count">
                                    {summary.count} use
                                    {summary.count === 1 ? '' : 's'}
                                </span>
                            </span>
                            {summary.note && summary.id !== exact?.id && (
                                <span className="name-field__option-note">
                                    {summary.note}
                                </span>
                            )}
                        </button>
                    ))}
                    {value.trim() && !exact && (
                        <div className="name-field__new">
                            <span>{newLabel}</span>
                            <span className="mono">{value.trim()}</span>
                        </div>
                    )}
                    {matches.length === 0 && !value.trim() && (
                        <div className="name-field__empty">
                            No existing names yet.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
