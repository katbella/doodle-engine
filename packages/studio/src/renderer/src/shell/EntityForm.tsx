import { useEffect, useMemo, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import type { OpenProject } from '../../../shared/project';
import type { YamlEdit } from '../../../shared/project';
import type { SectionKey } from '../types';
import {
    ENTITY_FORMS,
    type FieldDescriptor,
    type RefTarget,
} from '../lib/entity-fields';

/**
 * Visual form for a YAML entity (character, location, item, quest, map,
 * interlude, journal). It reads the file text, shows a control per known field,
 * and saves changes with writeEntity, which keeps comments, key order, and any
 * key the form doesn't model (unknown fields and the open `stats` bag).
 *
 * Values are read from the file text, not the parsed registry, so the form and
 * the file agree even for keys the engine ignores.
 */
export function EntityForm({
    project,
    tabKey,
    section,
    path,
    onDirty,
    onModified,
}: {
    project: OpenProject;
    tabKey: string;
    section: SectionKey;
    path: string;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
}) {
    const form = ENTITY_FORMS[section];
    const dir = project.projectDir;

    const [values, setValues] = useState<Record<string, unknown>>({});
    const [saved, setSaved] = useState<Record<string, unknown>>({});
    const [unknownKeys, setUnknownKeys] = useState<string[]>([]);
    const [mtimeMs, setMtimeMs] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [conflict, setConflict] = useState(false);

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
                setValues(parsed);
                setSaved(parsed);
                setMtimeMs(doc.mtimeMs);
                setUnknownKeys(unknownFieldsFor(section, parsed));
            } catch (e) {
                if (alive) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [dir, path, section]);

    // The fields that changed since the last save, as YAML edits.
    const edits = useMemo<YamlEdit[]>(() => {
        const out: YamlEdit[] = [];
        for (const key of Object.keys(values)) {
            if (!deepEqual(values[key], saved[key])) {
                out.push({ path: [key], value: values[key] });
            }
        }
        return out;
    }, [values, saved]);

    const dirty = edits.length > 0;
    useEffect(() => onDirty(tabKey, dirty), [dirty, tabKey, onDirty]);

    const setField = (name: string, value: unknown) =>
        setValues((v) => ({ ...v, [name]: value }));

    const save = async (force = false) => {
        if (edits.length === 0) return;
        const result = await window.studio.writeEntity(
            dir,
            path,
            edits,
            force ? undefined : mtimeMs
        );
        if (result.conflict) {
            setConflict(true);
            setMtimeMs(result.mtimeMs);
        } else if (result.ok) {
            setSaved(values);
            setMtimeMs(result.mtimeMs);
            setConflict(false);
            onModified(path);
        }
    };

    // Autosave a short while after the last edit.
    useEffect(() => {
        if (!dirty || conflict) return;
        const t = setTimeout(() => void save(), 1000);
        return () => clearTimeout(t);
    }, [values, dirty, conflict]);

    if (loading) {
        return (
            <div className="editor__empty">
                <span className="spinner" />
                Loading…
            </div>
        );
    }
    if (error || !form) {
        return (
            <div className="editor__empty">
                <span>
                    {form
                        ? 'This file could not be read.'
                        : 'No form for this content type.'}
                </span>
                {error && <span className="editor__empty-hint">{error}</span>}
            </div>
        );
    }

    return (
        <div className="form scroll">
            {conflict && (
                <div className="banner">
                    <span className="banner__icon">⚠</span>
                    <span>This file changed on disk since you opened it.</span>
                    <button className="btn" onClick={() => save(true)}>
                        Overwrite
                    </button>
                </div>
            )}

            <div className="form__head">
                <span className="form__title mono">
                    {String(values.id ?? '')}
                </span>
                <span className="form__kind">{form.label}</span>
            </div>

            {form.fields.map((field) => (
                <Field
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    project={project}
                    onChange={(v) => setField(field.name, v)}
                />
            ))}

            {section === 'quests' && (
                <StageListEditor
                    stages={
                        Array.isArray(values.stages)
                            ? (values.stages as Stage[])
                            : []
                    }
                    onChange={(stages) => setField('stages', stages)}
                />
            )}
            {section === 'maps' && (
                <MarkerListEditor
                    markers={
                        Array.isArray(values.locations)
                            ? (values.locations as Marker[])
                            : []
                    }
                    locationIds={idsFor(project, 'locations')}
                    onChange={(markers) => setField('locations', markers)}
                />
            )}

            {unknownKeys.length > 0 && (
                <div className="form__unknown">
                    <div className="form__unknown-head">
                        Other fields — kept as written
                    </div>
                    {unknownKeys.map((key) => (
                        <div key={key} className="form__unknown-row mono">
                            {key}: {formatValue(values[key])}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** One field control, chosen by its descriptor. */
function Field({
    field,
    value,
    project,
    onChange,
}: {
    field: FieldDescriptor;
    value: unknown;
    project: OpenProject;
    onChange: (value: unknown) => void;
}) {
    const label = (
        <div className="field__labelrow">
            <span className="field__label">{field.label}</span>
            {field.required && <span className="field__req">required</span>}
        </div>
    );
    const control = field.control;

    if (control.kind === 'reference') {
        const ids = idsFor(project, control.target);
        const current = typeof value === 'string' ? value : '';
        const missing = current !== '' && !ids.includes(current);
        return (
            <label className="field">
                {label}
                <select
                    className="dlg__select"
                    value={current}
                    onChange={(e) => onChange(e.target.value || undefined)}
                >
                    <option value="">— none —</option>
                    {missing && (
                        <option value={current}>{current} (missing)</option>
                    )}
                    {ids.map((id) => (
                        <option key={id} value={id}>
                            {id}
                        </option>
                    ))}
                </select>
                {field.hint && (
                    <span className="field__hint">{field.hint}</span>
                )}
            </label>
        );
    }

    if (control.kind === 'boolean') {
        return (
            <label className="field field--inline">
                <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="field__label">{field.label}</span>
            </label>
        );
    }

    if (control.kind === 'number') {
        return (
            <label className="field">
                {label}
                <input
                    className="dlg__input mono"
                    type="number"
                    value={
                        value === undefined || value === null
                            ? ''
                            : String(value)
                    }
                    onChange={(e) =>
                        onChange(
                            e.target.value === ''
                                ? undefined
                                : Number(e.target.value)
                        )
                    }
                />
                {field.hint && (
                    <span className="field__hint">{field.hint}</span>
                )}
            </label>
        );
    }

    if (control.kind === 'localizable') {
        return (
            <LocalizableField
                label={label}
                hint={field.hint}
                value={typeof value === 'string' ? value : ''}
                onChange={onChange}
            />
        );
    }

    if (control.kind === 'statsBag') {
        return (
            <StatsBag
                value={(value as Record<string, unknown>) ?? {}}
                onChange={onChange}
            />
        );
    }

    if (control.kind === 'asset' || control.kind === 'assetList') {
        // Assets are plain filenames; existence is checked by validation, not here.
        const text =
            control.kind === 'assetList'
                ? Array.isArray(value)
                    ? value.join(', ')
                    : ''
                : typeof value === 'string'
                  ? value
                  : '';
        return (
            <label className="field">
                {label}
                <input
                    className="dlg__input mono"
                    value={text}
                    placeholder={
                        control.kind === 'assetList'
                            ? 'file1.ogg, file2.ogg'
                            : '(none)'
                    }
                    spellCheck={false}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (control.kind === 'assetList') {
                            const list = raw
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                            onChange(list.length ? list : undefined);
                        } else {
                            onChange(raw);
                        }
                    }}
                />
                {field.hint && (
                    <span className="field__hint">{field.hint}</span>
                )}
            </label>
        );
    }

    // text / textarea
    return (
        <label className="field">
            {label}
            {control.kind === 'textarea' ? (
                <textarea
                    className="dlg__input mono field__textarea"
                    value={typeof value === 'string' ? value : ''}
                    spellCheck={false}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <input
                    className="dlg__input mono"
                    value={typeof value === 'string' ? value : ''}
                    spellCheck={false}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
            {field.hint && <span className="field__hint">{field.hint}</span>}
        </label>
    );
}

/** A text field with a @key/literal toggle, matching the dialogue line field. */
function LocalizableField({
    label,
    hint,
    value,
    onChange,
}: {
    label: React.ReactNode;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const isKey = value.startsWith('@');
    return (
        <div className="field">
            <div className="field__labelrow">
                {label}
                <div className="seg seg--small">
                    <button
                        type="button"
                        className={`seg__opt ${isKey ? 'seg__opt--on' : ''}`}
                        onClick={() => !isKey && onChange('@' + value)}
                    >
                        @key
                    </button>
                    <button
                        type="button"
                        className={`seg__opt ${!isKey ? 'seg__opt--on' : ''}`}
                        onClick={() =>
                            isKey && onChange(value.replace(/^@/, ''))
                        }
                    >
                        literal
                    </button>
                </div>
            </div>
            <input
                className="dlg__input mono"
                value={value}
                placeholder={isKey ? '@some.key' : 'plain text'}
                spellCheck={false}
                onChange={(e) => onChange(e.target.value)}
            />
            {hint && <span className="field__hint">{hint}</span>}
        </div>
    );
}

/** The open key/value `stats` bag: add, edit, remove arbitrary keys. */
function StatsBag({
    value,
    onChange,
}: {
    value: Record<string, unknown>;
    onChange: (value: Record<string, unknown> | undefined) => void;
}) {
    const entries = Object.entries(value);
    const setEntry = (key: string, v: string) => {
        const num = Number(v);
        onChange({ ...value, [key]: v !== '' && !isNaN(num) ? num : v });
    };
    const remove = (key: string) => {
        const next = { ...value };
        delete next[key];
        onChange(Object.keys(next).length ? next : {});
    };
    const add = () => {
        let key = 'stat';
        for (let n = 2; key in value; n++) key = `stat_${n}`;
        onChange({ ...value, [key]: '' });
    };

    return (
        <div className="field">
            <div className="field__labelrow">
                <span className="field__label">Stats</span>
                <button type="button" className="dlg__add" onClick={add}>
                    + Add stat
                </button>
            </div>
            {entries.length === 0 && (
                <span className="field__hint">
                    None. The engine stores these but doesn’t read them.
                </span>
            )}
            {entries.map(([key, v]) => (
                <div key={key} className="dlg__row">
                    <input
                        className="dlg__input mono"
                        value={key}
                        spellCheck={false}
                        onChange={(e) => {
                            const next = { ...value };
                            delete next[key];
                            next[e.target.value] = v;
                            onChange(next);
                        }}
                    />
                    <input
                        className="dlg__input mono"
                        value={String(v)}
                        spellCheck={false}
                        onChange={(e) => setEntry(key, e.target.value)}
                    />
                    <button
                        type="button"
                        className="dlg__x"
                        onClick={() => remove(key)}
                        aria-label="Remove stat"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

interface Stage {
    id: string;
    description?: string;
}

/** Editable list of quest stages. Order matters (a quest progresses through
 * them), so rows can move up and down. */
function StageListEditor({
    stages,
    onChange,
}: {
    stages: Stage[];
    onChange: (stages: Stage[]) => void;
}) {
    const set = (i: number, patch: Partial<Stage>) =>
        onChange(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    const remove = (i: number) =>
        onChange(stages.filter((_, j) => j !== i));
    const move = (i: number, delta: number) => {
        const j = i + delta;
        if (j < 0 || j >= stages.length) return;
        const next = [...stages];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    const add = () =>
        onChange([...stages, { id: `stage_${stages.length + 1}`, description: '' }]);

    return (
        <div className="field">
            <span className="field__label">Stages</span>
            {stages.map((stage, i) => (
                <div key={i} className="rowedit">
                    <input
                        className="dlg__input mono rowedit__id"
                        value={stage.id}
                        placeholder="stage_id"
                        spellCheck={false}
                        onChange={(e) => set(i, { id: e.target.value })}
                    />
                    <input
                        className="dlg__input rowedit__grow"
                        value={stage.description ?? ''}
                        placeholder="@key or description text"
                        spellCheck={false}
                        onChange={(e) =>
                            set(i, { description: e.target.value })
                        }
                    />
                    <button
                        className="rowedit__btn"
                        title="Move up"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                    >
                        ↑
                    </button>
                    <button
                        className="rowedit__btn"
                        title="Move down"
                        disabled={i === stages.length - 1}
                        onClick={() => move(i, 1)}
                    >
                        ↓
                    </button>
                    <button
                        className="rowedit__btn rowedit__btn--danger"
                        title="Remove stage"
                        onClick={() => remove(i)}
                    >
                        ×
                    </button>
                </div>
            ))}
            <button className="dlg__add" onClick={add}>
                + Add stage
            </button>
        </div>
    );
}

interface Marker {
    id: string;
    x?: number;
    y?: number;
}

/** Editable list of map markers: which location, and its x/y on the map. */
function MarkerListEditor({
    markers,
    locationIds,
    onChange,
}: {
    markers: Marker[];
    locationIds: string[];
    onChange: (markers: Marker[]) => void;
}) {
    const set = (i: number, patch: Partial<Marker>) =>
        onChange(markers.map((m, j) => (j === i ? { ...m, ...patch } : m)));
    const remove = (i: number) =>
        onChange(markers.filter((_, j) => j !== i));
    const add = () => onChange([...markers, { id: '', x: 0, y: 0 }]);

    // A marker may point at a location not in the list (e.g. a typo); keep it
    // selectable so the value isn't silently dropped.
    const options = (id: string) =>
        id && !locationIds.includes(id) ? [id, ...locationIds] : locationIds;

    return (
        <div className="field">
            <span className="field__label">Map markers</span>
            {markers.map((marker, i) => (
                <div key={i} className="rowedit">
                    <select
                        className="dlg__select rowedit__grow"
                        value={marker.id}
                        onChange={(e) => set(i, { id: e.target.value })}
                    >
                        <option value="">— location —</option>
                        {options(marker.id).map((id) => (
                            <option key={id} value={id}>
                                {id}
                            </option>
                        ))}
                    </select>
                    <input
                        className="dlg__input rowedit__num"
                        type="number"
                        value={marker.x ?? 0}
                        title="x"
                        onChange={(e) =>
                            set(i, { x: Number(e.target.value) })
                        }
                    />
                    <input
                        className="dlg__input rowedit__num"
                        type="number"
                        value={marker.y ?? 0}
                        title="y"
                        onChange={(e) =>
                            set(i, { y: Number(e.target.value) })
                        }
                    />
                    <button
                        className="rowedit__btn rowedit__btn--danger"
                        title="Remove marker"
                        onClick={() => remove(i)}
                    >
                        ×
                    </button>
                </div>
            ))}
            <button className="dlg__add" onClick={add}>
                + Add marker
            </button>
        </div>
    );
}

function idsFor(project: OpenProject, target: RefTarget): string[] {
    const collection = (
        project.registry as unknown as Record<string, Record<string, unknown>>
    )[target];
    return collection ? Object.keys(collection) : [];
}

/** Keys present in the file that the form doesn't model (shown, kept on save). */
function unknownFieldsFor(
    section: SectionKey,
    parsed: Record<string, unknown>
): string[] {
    const form = ENTITY_FORMS[section];
    if (!form) return [];
    const known = new Set(['id', ...form.fields.map((f) => f.name)]);
    // Structured lists have their own editors below the fields.
    if (section === 'quests') known.add('stages');
    if (section === 'maps') known.add('locations');
    return Object.keys(parsed).filter((k) => !known.has(k));
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
