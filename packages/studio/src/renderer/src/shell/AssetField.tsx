import { useEffect, useRef, useState } from 'react';
import type { StudioAssetKind } from '../../../shared/project';
import { FolderOpen, ImageOff, Play, Square, X } from '../lib/icons';

const IMAGE_KINDS = new Set<StudioAssetKind>([
    'portrait',
    'banner',
    'item',
    'map',
    'shellImage',
]);
const WIDE_KINDS = new Set<StudioAssetKind>(['banner', 'map', 'shellImage']);
const AUDIO_KINDS = new Set<StudioAssetKind>([
    'music',
    'ambient',
    'sfx',
    'voice',
    'shellMusic',
    'shellSound',
]);

// One page-wide player so starting a sound always stops the previous one.
let activeAudio: HTMLAudioElement | null = null;
let notifyActiveStopped: (() => void) | null = null;

function stopActiveAudio(): void {
    activeAudio?.pause();
    activeAudio = null;
    notifyActiveStopped?.();
    notifyActiveStopped = null;
}

function canPreview(): boolean {
    return typeof window.studio?.readAssetDataUrl === 'function';
}

export function AssetField({
    label,
    name,
    value,
    projectDir,
    kind,
    placeholder = '(none)',
    hint,
    onChange,
    onPick = onChange,
}: {
    label: React.ReactNode;
    name: string;
    value: string;
    projectDir: string;
    kind: StudioAssetKind;
    placeholder?: string;
    hint?: string;
    onChange: (value: string) => void;
    onPick?: (value: string) => void;
}) {
    const [choosing, setChoosing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const choose = async () => {
        setChoosing(true);
        setError(null);
        try {
            const selected = await window.studio.importAsset(projectDir, kind);
            if (selected) onPick(selected);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setChoosing(false);
        }
    };

    return (
        <div className="field">
            {typeof label === 'string' ? (
                <span className="field__label">{label}</span>
            ) : (
                label
            )}
            <div className="asset-field">
                {IMAGE_KINDS.has(kind) && (
                    <ImageThumb
                        projectDir={projectDir}
                        kind={kind}
                        value={value.trim()}
                    />
                )}
                <input
                    className="dlg__input mono"
                    aria-label={name}
                    value={value}
                    placeholder={placeholder}
                    spellCheck={false}
                    onChange={(event) => onChange(event.target.value)}
                />
                {AUDIO_KINDS.has(kind) && canPreview() && value.trim() && (
                    <PlayButton
                        projectDir={projectDir}
                        kind={kind}
                        value={value.trim()}
                        onError={setError}
                    />
                )}
                <button
                    className="btn asset-field__choose"
                    type="button"
                    disabled={choosing}
                    aria-label={`Choose ${name} file`}
                    onClick={() => void choose()}
                >
                    <FolderOpen size={14} aria-hidden />
                    {choosing ? 'Choosing…' : 'Choose file…'}
                </button>
            </div>
            {hint && <span className="field__hint">{hint}</span>}
            {error && <span className="field__error">{error}</span>}
        </div>
    );
}

/** A list of asset filenames (the interlude sounds), one row per file so each
 * entry can be renamed, played, and removed on its own. */
export function AssetListField({
    label,
    name,
    values,
    projectDir,
    kind,
    hint,
    onChange,
}: {
    label: React.ReactNode;
    name: string;
    values: string[];
    projectDir: string;
    kind: StudioAssetKind;
    hint?: string;
    onChange: (values: string[]) => void;
}) {
    const [choosing, setChoosing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Editing happens on local rows so a row can sit empty mid-edit (or as
    // the always-present trailing "type to add" row) without empty strings
    // reaching the saved list.
    const [rows, setRows] = useState<string[]>(() => [...values, '']);
    useEffect(() => {
        setRows((prev) => {
            const kept = prev.filter((row) => row.trim() !== '');
            const same =
                kept.length === values.length &&
                kept.every((row, i) => row === values[i]);
            return same ? prev : [...values, ''];
        });
    }, [values]);

    const commit = (next: string[]) => {
        const last = next[next.length - 1];
        setRows(last === undefined || last.trim() !== '' ? [...next, ''] : next);
        onChange(next.filter((row) => row.trim() !== ''));
    };

    const choose = async () => {
        setChoosing(true);
        setError(null);
        try {
            const selected = await window.studio.importAsset(projectDir, kind);
            if (selected) onChange([...values, selected]);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setChoosing(false);
        }
    };

    return (
        <div className="field">
            {typeof label === 'string' ? (
                <span className="field__label">{label}</span>
            ) : (
                label
            )}
            <div className="asset-list">
                {rows.map((entry, index) => {
                    const isTrailingBlank =
                        index === rows.length - 1 && entry.trim() === '';
                    return (
                        <div key={index} className="asset-list__row">
                            <input
                                className="dlg__input mono"
                                aria-label={`${name} ${index + 1}`}
                                value={entry}
                                placeholder="(none)"
                                spellCheck={false}
                                onChange={(event) =>
                                    commit(
                                        rows.map((row, j) =>
                                            j === index
                                                ? event.target.value
                                                : row
                                        )
                                    )
                                }
                            />
                            {AUDIO_KINDS.has(kind) &&
                                canPreview() &&
                                entry.trim() && (
                                    <PlayButton
                                        projectDir={projectDir}
                                        kind={kind}
                                        value={entry.trim()}
                                        onError={setError}
                                    />
                                )}
                            {!isTrailingBlank && (
                                <button
                                    className="dlg__x"
                                    type="button"
                                    aria-label={`Remove ${entry.trim() || name.toLowerCase()}`}
                                    onClick={() =>
                                        commit(
                                            rows.filter((_, j) => j !== index)
                                        )
                                    }
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                    );
                })}
                <button
                    className="btn asset-field__choose"
                    type="button"
                    disabled={choosing}
                    aria-label={`Add ${name} file`}
                    onClick={() => void choose()}
                >
                    <FolderOpen size={14} aria-hidden />
                    {choosing ? 'Choosing…' : 'Add file…'}
                </button>
            </div>
            {hint && <span className="field__hint">{hint}</span>}
            {error && <span className="field__error">{error}</span>}
        </div>
    );
}

function ImageThumb({
    projectDir,
    kind,
    value,
}: {
    projectDir: string;
    kind: StudioAssetKind;
    value: string;
}) {
    const [thumb, setThumb] = useState<string | 'missing' | null>(null);

    useEffect(() => {
        if (!value || !canPreview()) {
            setThumb(null);
            return;
        }
        // Debounced so typing in the path input doesn't read a file per key.
        let stale = false;
        const timer = setTimeout(() => {
            void window.studio
                .readAssetDataUrl(projectDir, kind, value)
                .then((url) => {
                    if (!stale) setThumb(url ?? 'missing');
                })
                .catch(() => {
                    if (!stale) setThumb('missing');
                });
        }, 300);
        return () => {
            stale = true;
            clearTimeout(timer);
        };
    }, [projectDir, kind, value]);

    if (!value || thumb === null) return null;
    const wide = WIDE_KINDS.has(kind);
    if (thumb === 'missing') {
        return (
            <span
                className={`asset-field__thumb asset-field__thumb--missing ${
                    wide ? 'asset-field__thumb--wide' : ''
                }`}
                title={`Could not load ${value} from the project`}
            >
                <ImageOff size={14} aria-hidden />
            </span>
        );
    }
    return (
        <img
            className={`asset-field__thumb ${
                wide ? 'asset-field__thumb--wide' : ''
            }`}
            src={thumb}
            alt=""
        />
    );
}

function PlayButton({
    projectDir,
    kind,
    value,
    onError,
}: {
    projectDir: string;
    kind: StudioAssetKind;
    value: string;
    onError: (message: string) => void;
}) {
    const [playing, setPlaying] = useState(false);
    const mine = useRef<HTMLAudioElement | null>(null);

    // Leaving the form (tab switch, project close) silences this player.
    useEffect(
        () => () => {
            if (mine.current && mine.current === activeAudio) stopActiveAudio();
        },
        []
    );

    const play = async () => {
        stopActiveAudio();
        const url = await window.studio
            .readAssetDataUrl(projectDir, kind, value)
            .catch(() => null);
        if (!url) {
            onError(`Could not load ${value} from the project`);
            return;
        }
        const audio = new Audio(url);
        mine.current = audio;
        activeAudio = audio;
        notifyActiveStopped = () => setPlaying(false);
        audio.onended = stopActiveAudio;
        try {
            await audio.play();
            setPlaying(true);
        } catch {
            stopActiveAudio();
            onError(`Could not play ${value}`);
        }
    };

    return (
        <button
            className={`btn asset-field__play ${
                playing ? 'asset-field__play--on' : ''
            }`}
            type="button"
            aria-label={playing ? `Stop ${value}` : `Play ${value}`}
            title={playing ? `Stop ${value}` : `Play ${value}`}
            onClick={() => (playing ? stopActiveAudio() : void play())}
        >
            {playing ? (
                <Square size={13} aria-hidden />
            ) : (
                <Play size={13} aria-hidden />
            )}
        </button>
    );
}
