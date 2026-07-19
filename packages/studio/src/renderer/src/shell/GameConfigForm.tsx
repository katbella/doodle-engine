import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, TriangleAlert, X } from '../lib/icons';
import { parse as parseYaml } from 'yaml';
import { isValidIdentifier } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import type { YamlEdit } from '../../../shared/project';
import { AssetField } from './AssetField';

/**
 * Form for game.yaml: starting state and shell media. Saves through writeEntity,
 * so comments, key order, and unmodeled fields are kept.
 */
export function GameConfigForm({
    project,
    tabKey,
    path,
    onDirty,
    onModified,
}: {
    project: OpenProject;
    tabKey: string;
    path: string;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
}) {
    const dir = project.projectDir;

    const [config, setConfig] = useState<Record<string, unknown>>({});
    const [saved, setSaved] = useState<Record<string, unknown>>({});
    const [mtimeMs, setMtimeMs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [conflict, setConflict] = useState(false);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        setConflict(false);
        (async () => {
            try {
                const doc = await window.studio.readDocument(dir, path);
                if (!alive) return;
                const parsed = (parseYaml(doc.content) ?? {}) as Record<
                    string,
                    unknown
                >;
                setConfig(parsed);
                setSaved(parsed);
                setMtimeMs(doc.mtimeMs);
            } catch (e) {
                if (alive) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [dir, path]);

    const OWNED = [
        'startLocation',
        'startTime',
        'startFlags',
        'startVariables',
        'startInventory',
    ];
    const edits = useMemo<YamlEdit[]>(() => {
        const out: YamlEdit[] = [];
        for (const key of OWNED) {
            if (!deepEqual(config[key], saved[key])) {
                out.push({ path: [key], value: config[key] });
            }
        }
        for (const [section, key] of SHELL_FIELDS) {
            const path = ['shell', section, key];
            const next = valueAt(config, path);
            if (!deepEqual(next, valueAt(saved, path))) {
                out.push({ path, value: next });
            }
        }
        return out;
    }, [config, saved]);

    const dirty = edits.length > 0;
    const hasInvalidIdentifiers = ['startFlags', 'startVariables'].some(
        (field) =>
            Object.keys(
                (config[field] as Record<string, unknown> | undefined) ?? {}
            ).some((key) => !isValidIdentifier(key))
    );
    useEffect(() => onDirty(tabKey, dirty), [dirty, tabKey, onDirty]);

    const set = (key: string, value: unknown) =>
        setConfig((c) => ({ ...c, [key]: value }));

    const save = async (force = false) => {
        if (edits.length === 0 || hasInvalidIdentifiers) return;
        const result = await window.studio.writeEntity(
            dir,
            path,
            edits,
            force ? undefined : mtimeMs
        );
        if (result.conflict) {
            if (result.missing) setMissing(true);
            else setConflict(true);
            setMtimeMs(result.mtimeMs);
        } else if (result.ok) {
            setSaved(config);
            setMtimeMs(result.mtimeMs);
            setConflict(false);
            onModified(path);
        }
    };

    useEffect(() => {
        if (!dirty || conflict || missing || hasInvalidIdentifiers) return;
        const t = setTimeout(() => void save(), 1000);
        return () => clearTimeout(t);
    }, [config, dirty, conflict, missing, hasInvalidIdentifiers]);
    // Save any pending edit when this editor goes away (closing the tab,
    // switching views, or opening another project), so a quick edit
    // followed by navigation still lands on disk.
    const flushRef = useRef(() => {});
    flushRef.current = () => {
        if (dirty && !conflict && !missing && !hasInvalidIdentifiers) {
            void save();
        }
    };
    useEffect(() => () => flushRef.current(), []);
    useEffect(() => {
        const handleSaveShortcut = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's'
            ) {
                event.preventDefault();
                flushRef.current();
            }
        };
        window.addEventListener('keydown', handleSaveShortcut);
        return () => window.removeEventListener('keydown', handleSaveShortcut);
    }, []);

    if (loading) {
        return (
            <div className="editor__empty">
                <span className="spinner" />
                Loading…
            </div>
        );
    }
    if (error) {
        return (
            <div className="editor__empty">
                <span>game.yaml could not be read.</span>
                <span className="editor__empty-hint">{error}</span>
            </div>
        );
    }

    const locationIds = Object.keys(project.registry.locations);
    const itemIds = Object.keys(project.registry.items);
    const time = (config.startTime as { day?: number; hour?: number }) ?? {};
    const flags = (config.startFlags as Record<string, boolean>) ?? {};
    const variables =
        (config.startVariables as Record<string, number | string>) ?? {};
    const inventory = Array.isArray(config.startInventory)
        ? (config.startInventory as string[])
        : [];
    const shell = (config.shell as Record<string, unknown> | undefined) ?? {};
    const shellSection = (name: string) =>
        (shell[name] as Record<string, unknown> | undefined) ?? {};
    const setShellField = (section: string, key: string, value: unknown) => {
        const nextSection = { ...shellSection(section) };
        if (value === '' || value === undefined) delete nextSection[key];
        else nextSection[key] = value;
        set('shell', { ...shell, [section]: nextSection });
    };
    const shellValue = (section: string, key: string) => {
        const value = shellSection(section)[key];
        return typeof value === 'string' ? value : '';
    };

    return (
        <div className="form game-config scroll">
            {conflict && (
                <div className="banner">
                    <TriangleAlert
                        className="banner__icon"
                        size={15}
                        aria-hidden
                    />
                    <span>This file changed on disk since you opened it.</span>
                    <button className="btn" onClick={() => save(true)}>
                        Overwrite
                    </button>
                </div>
            )}
            {missing && (
                <div className="banner">
                    <TriangleAlert
                        className="banner__icon"
                        size={15}
                        aria-hidden
                    />
                    <span>
                        This file was deleted outside Studio. Close the tab, or
                        recreate the item from the sidebar.
                    </span>
                </div>
            )}

            <div className="form__head">
                <span className="form__title">game.yaml</span>
                <span className="game-config__kind">Game configuration</span>
            </div>

            <section className="game-config__section">
                <h2 className="game-config__section-title">Starting state</h2>
                <div className="game-config__starting-grid">
                    <label className="field">
                        <span className="field__label">Location</span>
                        <select
                            className="dlg__select"
                            value={(config.startLocation as string) ?? ''}
                            onChange={(e) =>
                                set('startLocation', e.target.value)
                            }
                        >
                            <option value="">(none)</option>
                            {locationIds.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span className="field__label">Day</span>
                        <input
                            className="dlg__input mono"
                            type="number"
                            value={time.day ?? 1}
                            onChange={(e) =>
                                set('startTime', {
                                    ...time,
                                    day: Number(e.target.value),
                                })
                            }
                        />
                    </label>
                    <label className="field">
                        <span className="field__label">Hour (0–23)</span>
                        <input
                            className="dlg__input mono"
                            type="number"
                            min={0}
                            max={23}
                            value={time.hour ?? 0}
                            onChange={(e) =>
                                set('startTime', {
                                    ...time,
                                    hour: Number(e.target.value),
                                })
                            }
                        />
                    </label>
                </div>

                <div className="field">
                    <div className="field__labelrow">
                        <span className="field__label">Initial inventory</span>
                        <select
                            className="dlg__select game-config__add-select"
                            value=""
                            onChange={(e) => {
                                if (e.target.value)
                                    set('startInventory', [
                                        ...inventory,
                                        e.target.value,
                                    ]);
                            }}
                        >
                            <option value="">Add item…</option>
                            {itemIds
                                .filter((id) => !inventory.includes(id))
                                .map((id) => (
                                    <option key={id} value={id}>
                                        {id}
                                    </option>
                                ))}
                        </select>
                    </div>
                    {inventory.length === 0 && (
                        <span className="field__hint">None.</span>
                    )}
                    <div className="form__list">
                        {inventory.map((id) => (
                            <span key={id} className="form__list-item">
                                {id}
                                <button
                                    className="dlg__x"
                                    aria-label={`Remove ${id}`}
                                    onClick={() =>
                                        set(
                                            'startInventory',
                                            inventory.filter((x) => x !== id)
                                        )
                                    }
                                >
                                    <X size={15} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="game-config__section">
                <h2 className="game-config__section-title">
                    Flags and variables
                </h2>
                <div className="game-config__state-grid">
                    <KeyValueEditor
                        label="Flags"
                        addLabel="Add flag"
                        entries={Object.entries(flags)}
                        renderValue={(key, value) => (
                            <select
                                className="dlg__select"
                                value={value ? 'true' : 'false'}
                                onChange={(e) =>
                                    set('startFlags', {
                                        ...flags,
                                        [key]: e.target.value === 'true',
                                    })
                                }
                            >
                                <option value="true">true</option>
                                <option value="false">false</option>
                            </select>
                        )}
                        onRename={(oldKey, newKey) => {
                            const next = { ...flags };
                            const v = next[oldKey];
                            delete next[oldKey];
                            next[newKey] = v;
                            set('startFlags', next);
                        }}
                        onRemove={(key) => {
                            const next = { ...flags };
                            delete next[key];
                            set('startFlags', next);
                        }}
                        onAdd={() =>
                            set('startFlags', { ...flags, newFlag: false })
                        }
                    />

                    <KeyValueEditor
                        label="Variables"
                        addLabel="Add variable"
                        entries={Object.entries(variables)}
                        renderValue={(key, value) => (
                            <input
                                className="dlg__input mono"
                                value={String(value)}
                                spellCheck={false}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    const num = Number(raw);
                                    set('startVariables', {
                                        ...variables,
                                        [key]:
                                            raw !== '' && !isNaN(num)
                                                ? num
                                                : raw,
                                    });
                                }}
                            />
                        )}
                        onRename={(oldKey, newKey) => {
                            const next = { ...variables };
                            const v = next[oldKey];
                            delete next[oldKey];
                            next[newKey] = v;
                            set('startVariables', next);
                        }}
                        onRemove={(key) => {
                            const next = { ...variables };
                            delete next[key];
                            set('startVariables', next);
                        }}
                        onAdd={() =>
                            set('startVariables', { ...variables, newVar: 0 })
                        }
                    />
                </div>
            </section>

            <section className="game-config__section">
                <h2 className="game-config__section-title">Game screens</h2>
                <div className="game-config__subsection">
                    <h3 className="game-config__subsection-title">
                        Splash screen
                    </h3>
                    <div className="node-editor__grid">
                        <AssetField
                            label="Logo"
                            name="Splash logo"
                            value={shellValue('splash', 'logo')}
                            projectDir={dir}
                            kind="shellImage"
                            onChange={(value) =>
                                setShellField('splash', 'logo', value)
                            }
                        />
                        <AssetField
                            label="Background"
                            name="Splash background"
                            value={shellValue('splash', 'background')}
                            projectDir={dir}
                            kind="shellImage"
                            onChange={(value) =>
                                setShellField('splash', 'background', value)
                            }
                        />
                        <AssetField
                            label="Sound"
                            name="Splash sound"
                            value={shellValue('splash', 'sound')}
                            projectDir={dir}
                            kind="shellSound"
                            onChange={(value) =>
                                setShellField('splash', 'sound', value)
                            }
                        />
                        <label className="field">
                            <span className="field__label">Duration (ms)</span>
                            <input
                                className="dlg__input mono"
                                aria-label="Splash duration"
                                type="number"
                                min={0}
                                value={
                                    (shellSection('splash')
                                        .duration as number) ?? ''
                                }
                                onChange={(event) =>
                                    setShellField(
                                        'splash',
                                        'duration',
                                        event.target.value === ''
                                            ? undefined
                                            : Number(event.target.value)
                                    )
                                }
                            />
                        </label>
                    </div>
                </div>

                <div className="game-config__subsection">
                    <h3 className="game-config__subsection-title">
                        Loading screen
                    </h3>
                    <div className="node-editor__grid">
                        <AssetField
                            label="Background"
                            name="Loading background"
                            value={shellValue('loading', 'background')}
                            projectDir={dir}
                            kind="shellImage"
                            onChange={(value) =>
                                setShellField('loading', 'background', value)
                            }
                        />
                        <AssetField
                            label="Music"
                            name="Loading music"
                            value={shellValue('loading', 'music')}
                            projectDir={dir}
                            kind="shellMusic"
                            onChange={(value) =>
                                setShellField('loading', 'music', value)
                            }
                        />
                    </div>
                </div>

                <div className="game-config__subsection">
                    <h3 className="game-config__subsection-title">
                        Title screen
                    </h3>
                    <div className="node-editor__grid">
                        <AssetField
                            label="Logo"
                            name="Title logo"
                            value={shellValue('title', 'logo')}
                            projectDir={dir}
                            kind="shellImage"
                            onChange={(value) =>
                                setShellField('title', 'logo', value)
                            }
                        />
                        <AssetField
                            label="Background"
                            name="Title background"
                            value={shellValue('title', 'background')}
                            projectDir={dir}
                            kind="shellImage"
                            onChange={(value) =>
                                setShellField('title', 'background', value)
                            }
                        />
                        <AssetField
                            label="Music"
                            name="Title music"
                            value={shellValue('title', 'music')}
                            projectDir={dir}
                            kind="shellMusic"
                            onChange={(value) =>
                                setShellField('title', 'music', value)
                            }
                        />
                    </div>
                </div>
            </section>

            <section className="game-config__section">
                <h2 className="game-config__section-title">Interface sounds</h2>
                <div className="node-editor__grid">
                    {[
                        ['click', 'Click'],
                        ['hover', 'Hover'],
                        ['menuOpen', 'Menu open'],
                        ['menuClose', 'Menu close'],
                    ].map(([key, label]) => (
                        <AssetField
                            key={key}
                            label={label}
                            name={`UI ${label.toLowerCase()} sound`}
                            value={shellValue('uiSounds', key)}
                            projectDir={dir}
                            kind="shellSound"
                            onChange={(value) =>
                                setShellField('uiSounds', key, value)
                            }
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}

/** A list of key/value rows with add, rename, edit-value, and remove. */
function KeyValueEditor({
    label,
    addLabel,
    entries,
    renderValue,
    onRename,
    onRemove,
    onAdd,
}: {
    label: string;
    addLabel: string;
    entries: [string, unknown][];
    renderValue: (key: string, value: unknown) => React.ReactNode;
    onRename: (oldKey: string, newKey: string) => void;
    onRemove: (key: string) => void;
    onAdd: () => void;
}) {
    return (
        <div className="field">
            <div className="field__labelrow">
                <span className="field__label">{label}</span>
                <button className="dlg__add" onClick={onAdd}>
                    <Plus size={13} /> {addLabel}
                </button>
            </div>
            {entries.length === 0 && <span className="field__hint">None.</span>}
            {entries.map(([key, value], index) => (
                <div key={index} className="dlg__row">
                    <div className="node-editor__id-field">
                        <input
                            className={`dlg__input mono ${isValidIdentifier(key) ? '' : 'dlg__input--invalid'}`}
                            value={key}
                            spellCheck={false}
                            aria-invalid={!isValidIdentifier(key)}
                            onChange={(e) => onRename(key, e.target.value)}
                        />
                        {!isValidIdentifier(key) && (
                            <span className="field__error">
                                Use letters, numbers, and underscores only.
                            </span>
                        )}
                    </div>
                    {renderValue(key, value)}
                    <button
                        className="dlg__x"
                        aria-label={`Remove ${key}`}
                        onClick={() => onRemove(key)}
                    >
                        <X size={15} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

const SHELL_FIELDS = [
    ['splash', 'logo'],
    ['splash', 'background'],
    ['splash', 'sound'],
    ['splash', 'duration'],
    ['loading', 'background'],
    ['loading', 'music'],
    ['title', 'logo'],
    ['title', 'background'],
    ['title', 'music'],
    ['uiSounds', 'click'],
    ['uiSounds', 'hover'],
    ['uiSounds', 'menuOpen'],
    ['uiSounds', 'menuClose'],
] as const;

function valueAt(
    root: Record<string, unknown>,
    path: readonly string[]
): unknown {
    let value: unknown = root;
    for (const key of path) {
        if (!value || typeof value !== 'object') return undefined;
        value = (value as Record<string, unknown>)[key];
    }
    return value;
}
