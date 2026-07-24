import { useEffect, useMemo, useState } from 'react';
import type { OpenProject } from '../../../shared/project';
import { Plus, Search, X } from '../lib/icons';
import {
    LocaleWriterBoundary,
    localeDirty,
    useLocaleWriter,
} from '../lib/locale-writer';
import { ConfirmModal } from './ConfirmModal';

interface LocaleEditorProps {
    project: OpenProject;
    tabKey: string;
    path: string;
    localeId: string;
    /** A key to jump to: the filter is set to it so its row is in view. */
    revealKey?: string;
    revealSeq?: number;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
}

/** Inline editor for the flat key/value dictionaries in locale YAML files. */
export function LocaleEditor(props: LocaleEditorProps) {
    return (
        <LocaleWriterBoundary
            project={props.project}
            onModified={props.onModified}
        >
            <LocaleEditorInner {...props} />
        </LocaleWriterBoundary>
    );
}

function LocaleEditorInner({
    tabKey,
    localeId,
    revealKey,
    revealSeq,
    onDirty,
}: LocaleEditorProps) {
    const writer = useLocaleWriter();
    const file = writer?.files[localeId];
    const [filter, setFilter] = useState(revealKey ?? '');
    const [adding, setAdding] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [addError, setAddError] = useState<string | null>(null);
    const [deleteKey, setDeleteKey] = useState<string | null>(null);
    const dirty = localeDirty(file);
    const reload = writer?.reload;

    useEffect(() => onDirty(tabKey, dirty), [dirty, onDirty, tabKey]);
    useEffect(() => {
        if (revealSeq !== undefined && revealKey) setFilter(revealKey);
    }, [revealKey, revealSeq]);
    useEffect(() => {
        void reload?.(localeId);
    }, [localeId, reload]);
    useEffect(() => {
        const handleSave = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's'
            ) {
                event.preventDefault();
                void writer?.flush(localeId);
            }
        };
        window.addEventListener('keydown', handleSave);
        return () => window.removeEventListener('keydown', handleSave);
    }, [localeId, writer]);

    const entries = useMemo(() => {
        const query = filter.trim().toLowerCase();
        return Object.entries(file?.values ?? {})
            .filter(
                ([key, value]) =>
                    query === '' ||
                    key.toLowerCase().includes(query) ||
                    value.toLowerCase().includes(query)
            )
            .sort(([a], [b]) => a.localeCompare(b));
    }, [file?.values, filter]);

    const addKey = () => {
        const key = newKey.trim().replace(/^@/, '');
        if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
            setAddError('Use letters, numbers, dots, dashes, or underscores.');
            return;
        }
        if (Object.hasOwn(file?.values ?? {}, key)) {
            setAddError('That key already exists.');
            return;
        }
        writer?.setValue(localeId, key, '');
        setFilter(key);
        setNewKey('');
        setAddError(null);
        setAdding(false);
    };

    if (!file || file.loading) {
        return (
            <div className="editor__empty">
                <span className="spinner" /> Loading…
            </div>
        );
    }
    if (file.error && !file.missing) {
        return (
            <div className="editor__empty">
                Could not read locale: {file.error}
            </div>
        );
    }

    return (
        <div className="locale-editor scroll">
            <div className="form__head">
                <span className="form__title">{localeId}</span>
                <span className="form__kind">Locale</span>
            </div>
            <div className="locale-editor__tools">
                <label className="locale-editor__filter">
                    <Search size={15} aria-hidden />
                    <input
                        className="dlg__input"
                        value={filter}
                        placeholder="Filter keys and text…"
                        aria-label="Filter locale keys and text"
                        onChange={(event) => setFilter(event.target.value)}
                    />
                </label>
                <button
                    type="button"
                    className="btn"
                    onClick={() => setAdding((visible) => !visible)}
                >
                    <Plus size={14} /> Add key
                </button>
            </div>
            {adding && (
                <div className="locale-editor__add">
                    <input
                        className="dlg__input mono"
                        value={newKey}
                        autoFocus
                        spellCheck={false}
                        placeholder="story.new_key"
                        aria-label="New locale key"
                        onChange={(event) => {
                            setNewKey(event.target.value);
                            setAddError(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') addKey();
                            if (event.key === 'Escape') setAdding(false);
                        }}
                    />
                    <button className="btn btn--accent" onClick={addKey}>
                        Add
                    </button>
                    {addError && (
                        <span className="field__error">{addError}</span>
                    )}
                </div>
            )}
            <div className="locale-editor__table">
                {entries.map(([key, value]) => (
                    <div className="locale-editor__row" key={key}>
                        <span className="locale-editor__key mono" title={key}>
                            {key}
                        </span>
                        <textarea
                            className="dlg__input locale-editor__value prose-input"
                            value={value}
                            rows={3}
                            aria-label={`${key} translation`}
                            onChange={(event) =>
                                writer?.setValue(
                                    localeId,
                                    key,
                                    event.target.value
                                )
                            }
                        />
                        <button
                            type="button"
                            className="dlg__x locale-editor__delete"
                            aria-label={`Delete locale key ${key}`}
                            title="Delete locale key"
                            onClick={() => setDeleteKey(key)}
                        >
                            <X size={15} />
                        </button>
                    </div>
                ))}
                {entries.length === 0 && (
                    <div className="dock__empty">
                        No locale keys match this filter.
                    </div>
                )}
            </div>
            {deleteKey && (
                <ConfirmModal
                    title={`Delete locale key “${deleteKey}”?`}
                    message="This removes the authored translation from this locale file. References to the key will become missing text."
                    confirmLabel="Delete key"
                    danger
                    onConfirm={() => {
                        writer?.deleteValue(localeId, deleteKey);
                        setDeleteKey(null);
                    }}
                    onCancel={() => setDeleteKey(null)}
                />
            )}
        </div>
    );
}
