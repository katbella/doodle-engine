import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentRegistry } from '@doodle-engine/core';
import { useLocaleWriter } from '../lib/locale-writer';
import { authoredTextPreview, languageName } from '../lib/localized-text';
import { useModalDismiss } from '../lib/useModalDismiss';
import { AnchoredOverlay, OverlayPortal } from './OverlayPortal';

export type TextContentKind = 'short' | 'prose' | 'single-line-wrap';

export function LocalizedTextField({
    label,
    source,
    registry,
    textKind = 'short',
    hint,
    placeholder,
    ariaLabel,
    revealTarget,
    onSourceChange,
}: {
    label?: React.ReactNode;
    source: string;
    registry: ContentRegistry;
    textKind?: TextContentKind;
    hint?: string;
    placeholder?: string;
    ariaLabel?: string;
    /** Optional scroll destination used when opening a validation problem. */
    revealTarget?: string;
    onSourceChange: (source: string) => void;
}) {
    const writer = useLocaleWriter();
    const [showKeyMenu, setShowKeyMenu] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [singleLineNotice, setSingleLineNotice] = useState(false);
    const [rememberedKey, setRememberedKey] = useState<string | null>(null);
    const [unlinkedLocales, setUnlinkedLocales] = useState<string[]>([]);
    const keyChipRef = useRef<HTMLButtonElement>(null);

    // The chip menu closes like any menu: click away or Escape.
    useEffect(() => {
        if (!showKeyMenu) return;
        const dismiss = (event: PointerEvent) => {
            const target = event.target as Element | null;
            if (
                target?.closest('.localized-key-menu') ||
                keyChipRef.current?.contains(target)
            ) {
                return;
            }
            setShowKeyMenu(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowKeyMenu(false);
        };
        window.addEventListener('pointerdown', dismiss);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointerdown', dismiss);
            window.removeEventListener('keydown', onKey);
        };
    }, [showKeyMenu]);

    const isKey = source.startsWith('@');
    const keyName = isKey ? source.slice(1) : '';
    const locale =
        writer?.authoringLocale ??
        authoredTextPreview(source, registry)?.locale ??
        null;
    const localeValues = locale
        ? (writer?.files[locale]?.values ?? registry.locales[locale] ?? {})
        : {};
    const translated = keyName ? localeValues[keyName] : undefined;
    const displayValue = isKey ? (translated ?? '') : source;
    const isMissing = isKey && translated === undefined;
    const otherTranslatedLocales = keyName
        ? Object.keys(registry.locales)
              .filter((otherLocale) => otherLocale !== locale)
              .filter((otherLocale) => {
                  const values =
                      writer?.files[otherLocale]?.values ??
                      registry.locales[otherLocale] ??
                      {};
                  return Object.hasOwn(values, keyName);
              })
              .sort()
        : [];

    const setDisplayValue = (value: string) => {
        const next =
            textKind === 'single-line-wrap'
                ? value.replace(/[\r\n]+/g, ' ')
                : value;
        if (isKey && locale && writer) writer.setValue(locale, keyName, next);
        else onSourceChange(next);
    };

    const controlProps = {
        className: `dlg__input localized-text__control ${
            textKind === 'prose'
                ? 'prose-input'
                : textKind === 'single-line-wrap'
                  ? 'prose-input prose-input--single-line'
                  : ''
        }`,
        value: displayValue,
        placeholder,
        spellCheck: true,
        'aria-label': ariaLabel,
        onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => setDisplayValue(event.target.value),
    };

    return (
        <div
            className="field localized-text"
            data-problem-target={revealTarget}
        >
            <div className="field__labelrow">
                <span className="field__labelgroup">{label}</span>
                <div className="seg">
                    <button
                        type="button"
                        className={`seg__opt ${isKey ? 'seg__opt--on' : ''}`}
                        disabled={!locale}
                        title={
                            locale
                                ? 'Store this text in the locale file so it can be translated'
                                : 'Add a locale before assigning a key'
                        }
                        onClick={() => {
                            if (!isKey && locale) {
                                if (rememberedKey) {
                                    onSourceChange(`@${rememberedKey}`);
                                    setUnlinkedLocales([]);
                                } else {
                                    setShowPicker(true);
                                }
                            }
                        }}
                    >
                        @key
                    </button>
                    <button
                        type="button"
                        className={`seg__opt ${!isKey ? 'seg__opt--on' : ''}`}
                        disabled={isMissing}
                        title={
                            isMissing
                                ? `Add ${locale ? languageName(locale) + ' ' : ''}text before unlinking this key`
                                : undefined
                        }
                        onClick={() => {
                            if (isKey && !isMissing) {
                                setRememberedKey(keyName);
                                setUnlinkedLocales(otherTranslatedLocales);
                                onSourceChange(displayValue);
                            }
                        }}
                    >
                        literal
                    </button>
                </div>
            </div>

            {textKind === 'short' ? (
                <input {...controlProps} />
            ) : (
                <textarea
                    {...controlProps}
                    rows={textKind === 'prose' ? 3 : 1}
                    onKeyDown={(event) => {
                        if (
                            textKind === 'single-line-wrap' &&
                            event.key === 'Enter'
                        ) {
                            event.preventDefault();
                            setSingleLineNotice(true);
                            window.setTimeout(
                                () => setSingleLineNotice(false),
                                1800
                            );
                        }
                    }}
                />
            )}

            {isKey && locale && (
                <div className="localized-text__metadata">
                    <button
                        ref={keyChipRef}
                        type="button"
                        className="localized-key-chip mono"
                        aria-expanded={showKeyMenu}
                        onClick={() => setShowKeyMenu((open) => !open)}
                    >
                        @{keyName} · {locale}
                    </button>
                    {showKeyMenu && (
                        <AnchoredOverlay
                            anchorRef={keyChipRef}
                            className="localized-key-menu"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    void navigator.clipboard?.writeText(
                                        `@${keyName}`
                                    );
                                    setShowKeyMenu(false);
                                }}
                            >
                                Copy key
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    writer?.openLocale(locale, keyName);
                                    setShowKeyMenu(false);
                                }}
                            >
                                Open the {languageName(locale)} locale
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowKeyMenu(false);
                                    setShowPicker(true);
                                }}
                            >
                                Change key…
                            </button>
                        </AnchoredOverlay>
                    )}
                </div>
            )}
            {!isKey && rememberedKey && (
                <div className="localized-text__unlink-notice" role="status">
                    <span>
                        Now using literal text instead of{' '}
                        <span className="mono">@{rememberedKey}</span>.
                        {unlinkedLocales.length > 0 && (
                            <>
                                {' '}
                                The key and its{' '}
                                {unlinkedLocales
                                    .map(languageName)
                                    .join(', ')}{' '}
                                {unlinkedLocales.length === 1
                                    ? 'translation'
                                    : 'translations'}{' '}
                                stay in the locale files but won't be shown
                                here.
                            </>
                        )}{' '}
                        Switch back to @key to relink.
                    </span>
                    <button
                        type="button"
                        className="localized-text__change-key"
                        onClick={() => setShowPicker(true)}
                    >
                        Change key…
                    </button>
                </div>
            )}
            {singleLineNotice && (
                <span className="field__hint" role="status">
                    A choice is a single line.
                </span>
            )}
            {hint && <span className="field__hint">{hint}</span>}

            {showPicker && locale && (
                <LocaleKeyPicker
                    locale={locale}
                    values={localeValues}
                    currentText={displayValue}
                    preferredKey={isKey ? keyName : rememberedKey}
                    onPick={(key, overwriteKeyText) => {
                        if (overwriteKeyText) {
                            writer?.setValue(locale, key, displayValue);
                        }
                        onSourceChange(`@${key}`);
                        setRememberedKey(null);
                        setUnlinkedLocales([]);
                        setShowPicker(false);
                    }}
                    onCreate={(key) => {
                        writer?.setValue(locale, key, displayValue);
                        onSourceChange(`@${key}`);
                        setRememberedKey(null);
                        setUnlinkedLocales([]);
                        setShowPicker(false);
                    }}
                    onCancel={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}

function LocaleKeyPicker({
    locale,
    values,
    currentText,
    preferredKey,
    onPick,
    onCreate,
    onCancel,
}: {
    locale: string;
    values: Record<string, string>;
    currentText: string;
    preferredKey: string | null;
    onPick: (key: string, overwriteKeyText: boolean) => void;
    onCreate: (key: string) => void;
    onCancel: () => void;
}) {
    useModalDismiss(onCancel);
    const [query, setQuery] = useState('');
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const [active, setActive] = useState(0);
    const normalized = query.trim().replace(/^@/, '');
    const matches = useMemo(() => {
        const needle = normalized.toLowerCase();
        return Object.entries(values)
            .filter(
                ([key, value]) =>
                    needle === '' ||
                    key.toLowerCase().includes(needle) ||
                    value.toLowerCase().includes(needle)
            )
            .sort(([a], [b]) => {
                if (a === preferredKey) return -1;
                if (b === preferredKey) return 1;
                return a.localeCompare(b);
            });
    }, [normalized, preferredKey, values]);
    const canCreate =
        normalized.length > 0 &&
        matches.length === 0 &&
        /^[A-Za-z0-9_.-]+$/.test(normalized);

    // Rows are keyboard-walkable like the command palette: arrows move,
    // Enter picks (or creates when nothing matches).
    const rowCount = matches.length + (canCreate ? 1 : 0);
    const activeRow = Math.min(active, Math.max(0, rowCount - 1));
    const pickRow = (index: number) => {
        if (index < matches.length) {
            const [key, value] = matches[index];
            if (currentText && currentText !== value) setPendingKey(key);
            else onPick(key, false);
        } else if (canCreate) {
            onCreate(normalized);
        }
    };
    const onSearchKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(0, rowCount - 1)));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (event.key === 'Enter' && rowCount > 0) {
            event.preventDefault();
            pickRow(activeRow);
        }
    };

    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onCancel}>
                <div
                    className="modal modal--tall locale-key-picker"
                    role="dialog"
                    aria-modal="true"
                    onClick={(event) => event.stopPropagation()}
                >
                    {pendingKey ? (
                        <>
                            <div className="modal__title">
                                Choose which text to keep
                            </div>
                            <p className="modal__message">
                                Linking to{' '}
                                <span className="mono">@{pendingKey}</span>{' '}
                                would replace the current literal text. Choose
                                the value explicitly.
                            </p>
                            <div className="locale-key-picker__comparison">
                                <div>
                                    <span className="field__label">
                                        Current literal
                                    </span>
                                    <span>{currentText}</span>
                                </div>
                                <div>
                                    <span className="field__label">
                                        @{pendingKey} · {locale}
                                    </span>
                                    <span>{values[pendingKey]}</span>
                                </div>
                            </div>
                            <div className="modal__actions">
                                <button
                                    className="btn"
                                    onClick={() => setPendingKey(null)}
                                >
                                    Back
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => onPick(pendingKey, false)}
                                >
                                    Use @{pendingKey} text
                                </button>
                                <button
                                    className="btn btn--accent"
                                    onClick={() => onPick(pendingKey, true)}
                                >
                                    Overwrite @{pendingKey} with current text
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="modal__title">
                                Choose a localized text key
                            </div>
                            <input
                                className="field__input"
                                value={query}
                                autoFocus
                                spellCheck={false}
                                aria-label="Search locale keys"
                                placeholder={`Search ${languageName(locale)} keys and text…`}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setActive(0);
                                }}
                                onKeyDown={onSearchKeyDown}
                            />
                            <div className="locale-key-picker__list scroll">
                                {matches.map(([key, value], index) => (
                                    <button
                                        type="button"
                                        key={key}
                                        className={`locale-key-picker__row ${
                                            key === preferredKey
                                                ? 'locale-key-picker__row--current'
                                                : ''
                                        } ${
                                            index === activeRow
                                                ? 'locale-key-picker__row--active'
                                                : ''
                                        }`}
                                        onClick={() => pickRow(index)}
                                    >
                                        <span className="mono locale-key-picker__key">
                                            @{key}
                                        </span>
                                        <span className="locale-key-picker__value">
                                            {value ||
                                                `Empty in ${languageName(locale)}`}
                                        </span>
                                    </button>
                                ))}
                                {canCreate && (
                                    <button
                                        type="button"
                                        className={`locale-key-picker__row locale-key-picker__create ${
                                            activeRow === matches.length
                                                ? 'locale-key-picker__row--active'
                                                : ''
                                        }`}
                                        onClick={() => onCreate(normalized)}
                                    >
                                        Create “{normalized}”
                                        {currentText && (
                                            <span className="locale-key-picker__value">
                                                with the current text
                                            </span>
                                        )}
                                    </button>
                                )}
                                {matches.length === 0 && !canCreate && (
                                    <div className="dock__empty">
                                        {normalized
                                            ? 'Use letters, numbers, dots, dashes, or underscores.'
                                            : 'No locale keys yet. Type a name to create one.'}
                                    </div>
                                )}
                            </div>
                            <div className="modal__actions">
                                <button className="btn" onClick={onCancel}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </OverlayPortal>
    );
}
