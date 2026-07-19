import { useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlert, X, ChevronUp, ChevronDown, Plus } from '../lib/icons';
import { parse as parseYaml } from 'yaml';
import type { OpenProject } from '../../../shared/project';
import type { YamlEdit } from '../../../shared/project';
import type { SectionKey } from '../types';
import {
    ENTITY_FORMS,
    type FieldDescriptor,
    type RefTarget,
} from '../lib/entity-fields';
import { AssetField, AssetListField } from './AssetField';
import { LocalizedTextField } from './LocalizedTextField';
import { LocaleWriterBoundary } from '../lib/locale-writer';
import { ConfirmModal } from './ConfirmModal';
import { ConditionList, EffectList } from './NodeEditor';
import type { Condition, Effect } from '@doodle-engine/core';

/**
 * Visual form for a YAML entity (character, location, item, quest, map,
 * interlude, journal). It reads the file text, shows a control per known field,
 * and saves changes with writeEntity, which keeps comments, key order, and any
 * key the form doesn't model (unknown fields and the open `stats` bag).
 *
 * Values are read from the file text, not the parsed registry, so the form and
 * the file agree even for keys the engine ignores.
 */
interface EntityFormProps {
    project: OpenProject;
    tabKey: string;
    section: SectionKey;
    path: string;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
}

export function EntityForm(props: EntityFormProps) {
    return (
        <LocaleWriterBoundary
            project={props.project}
            onModified={props.onModified}
        >
            <EntityFormInner {...props} />
        </LocaleWriterBoundary>
    );
}

function EntityFormInner({
    project,
    tabKey,
    section,
    path,
    onDirty,
    onModified,
}: EntityFormProps) {
    const form = ENTITY_FORMS[section];
    const dir = project.projectDir;

    const [values, setValues] = useState<Record<string, unknown>>({});
    const [saved, setSaved] = useState<Record<string, unknown>>({});
    const [unknownKeys, setUnknownKeys] = useState<string[]>([]);
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
            if (result.missing) setMissing(true);
            else setConflict(true);
            setMtimeMs(result.mtimeMs);
        } else if (result.ok) {
            setSaved(values);
            setMtimeMs(result.mtimeMs);
            setConflict(false);
            onModified(path);
        }
    };

    // Autosave a short while after the last edit (same debounce as the locale
    // writer, so the dirty dot behaves identically everywhere).
    useEffect(() => {
        if (!dirty || conflict || missing) return;
        const t = setTimeout(() => void save(), 700);
        return () => clearTimeout(t);
    }, [values, dirty, conflict, missing]);
    // Save any pending edit when this editor goes away (closing the tab,
    // switching views, or opening another project), so a quick edit
    // followed by navigation still lands on disk.
    const flushRef = useRef(() => {});
    flushRef.current = () => {
        if (dirty && !conflict && !missing) void save();
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
                <span className="form__title">{String(values.id ?? '')}</span>
                <span className="form__kind">{form.label}</span>
            </div>

            {form.fields.map((field) => (
                <Field
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    project={project}
                    section={section}
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
                    project={project}
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
                    image={typeof values.image === 'string' ? values.image : ''}
                    projectDir={project.projectDir}
                    onChange={(markers) => setField('locations', markers)}
                />
            )}

            {unknownKeys.length > 0 && (
                <div className="form__unknown">
                    <div className="form__unknown-head">
                        Other fields in this file
                    </div>
                    <p className="form__unknown-hint">
                        The engine doesn't define these keys, so Studio has no
                        field for them. They're kept exactly as written. Edit
                        them in the Source view.
                    </p>
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
    section,
    onChange,
}: {
    field: FieldDescriptor;
    value: unknown;
    project: OpenProject;
    section: SectionKey;
    onChange: (value: unknown) => void;
}) {
    const labelContent = (
        <>
            <span className="field__label">{field.label}</span>
            {field.required && <span className="field__req">required</span>}
        </>
    );
    const label = (
        <div className="field__labelrow">
            <span className="field__labelgroup">{labelContent}</span>
        </div>
    );
    const control = field.control;
    const hint =
        typeof field.hint === 'function' ? field.hint(value) : field.hint;

    if (control.kind === 'reference') {
        const ids = idsFor(project, control.target);
        const current = typeof value === 'string' ? value : '';
        const itemDestination =
            section === 'items' && field.name === 'location';
        const characterIds = itemDestination
            ? idsFor(project, 'characters')
            : [];
        const missing =
            current !== '' &&
            current !== 'inventory' &&
            !ids.includes(current) &&
            !characterIds.includes(current);
        return (
            <label className="field">
                {label}
                <select
                    className="dlg__select"
                    value={current}
                    onChange={(e) => onChange(e.target.value || undefined)}
                >
                    <option value="">(none)</option>
                    {missing && (
                        <option value={current}>
                            {current} (
                            {itemDestination ? 'unrecognized' : 'missing'})
                        </option>
                    )}
                    {itemDestination ? (
                        <>
                            <optgroup label="Inventory">
                                <option value="inventory">inventory</option>
                            </optgroup>
                            <optgroup label="Locations">
                                {ids.map((id) => (
                                    <option key={id} value={id}>
                                        {id}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Characters">
                                {characterIds.map((id) => (
                                    <option key={id} value={id}>
                                        {id}
                                    </option>
                                ))}
                            </optgroup>
                        </>
                    ) : (
                        ids.map((id) => (
                            <option key={id} value={id}>
                                {id}
                            </option>
                        ))
                    )}
                </select>
                {hint && <span className="field__hint">{hint}</span>}
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
                {hint && <span className="field__hint">{hint}</span>}
            </label>
        );
    }

    if (control.kind === 'localizable') {
        return (
            <LocalizedTextField
                label={labelContent}
                hint={hint}
                source={typeof value === 'string' ? value : ''}
                registry={project.registry}
                textKind={field.textKind === 'prose' ? 'prose' : 'short'}
                onSourceChange={onChange}
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

    if (control.kind === 'conditionList' || control.kind === 'effectList') {
        const list = Array.isArray(value) ? value : [];
        const commit = (next: unknown[]) =>
            onChange(next.length ? next : undefined);
        return (
            <div className="field">
                {label}
                {control.kind === 'conditionList' ? (
                    <ConditionList
                        conditions={list as Condition[]}
                        registry={project.registry}
                        projectDir={project.projectDir}
                        onChange={commit}
                    />
                ) : (
                    <EffectList
                        effects={list as Effect[]}
                        registry={project.registry}
                        projectDir={project.projectDir}
                        onChange={commit}
                    />
                )}
                {hint && <span className="field__hint">{hint}</span>}
            </div>
        );
    }

    if (control.kind === 'assetList') {
        return (
            <AssetListField
                label={label}
                name={field.label}
                values={Array.isArray(value) ? (value as string[]) : []}
                projectDir={project.projectDir}
                kind={control.category}
                hint={hint}
                onChange={(list) => onChange(list.length ? list : undefined)}
            />
        );
    }

    if (control.kind === 'asset') {
        return (
            <AssetField
                label={label}
                name={field.label}
                value={typeof value === 'string' ? value : ''}
                projectDir={project.projectDir}
                kind={control.category}
                hint={hint}
                onChange={onChange}
            />
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
            {hint && <span className="field__hint">{hint}</span>}
        </label>
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
                        <X size={15} />
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
    project,
    onChange,
}: {
    stages: Stage[];
    project: OpenProject;
    onChange: (stages: Stage[]) => void;
}) {
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const set = (i: number, patch: Partial<Stage>) =>
        onChange(stages.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    const remove = (i: number) => onChange(stages.filter((_, j) => j !== i));
    const move = (i: number, delta: number) => {
        const j = i + delta;
        if (j < 0 || j >= stages.length) return;
        const next = [...stages];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    const add = () =>
        onChange([
            ...stages,
            { id: `stage_${stages.length + 1}`, description: '' },
        ]);

    return (
        <div className="field">
            <span className="field__label">Stages</span>
            {stages.map((stage, i) => {
                return (
                    <div key={i} className="rowedit__stack">
                        <div className="rowedit rowedit--stage">
                            <div className="field rowedit__id">
                                <div className="field__labelrow">
                                    <span className="field__labelgroup">
                                        <span className="field__label">
                                            Stage id
                                        </span>
                                    </span>
                                </div>
                                <input
                                    className="dlg__input mono"
                                    value={stage.id}
                                    title={stage.id}
                                    placeholder="stage_id"
                                    spellCheck={false}
                                    onChange={(e) =>
                                        set(i, { id: e.target.value })
                                    }
                                />
                            </div>
                            <div className="rowedit__grow">
                                <LocalizedTextField
                                    label={
                                        <span className="field__label">
                                            Description
                                        </span>
                                    }
                                    source={stage.description ?? ''}
                                    registry={project.registry}
                                    textKind="prose"
                                    placeholder="Stage description"
                                    onSourceChange={(description) =>
                                        set(i, { description })
                                    }
                                />
                            </div>
                            <button
                                className="rowedit__btn"
                                title="Move up"
                                aria-label="Move up"
                                disabled={i === 0}
                                onClick={() => move(i, -1)}
                            >
                                <ChevronUp size={15} />
                            </button>
                            <button
                                className="rowedit__btn"
                                title="Move down"
                                aria-label="Move down"
                                disabled={i === stages.length - 1}
                                onClick={() => move(i, 1)}
                            >
                                <ChevronDown size={15} />
                            </button>
                            <button
                                className="rowedit__btn rowedit__btn--danger"
                                title="Remove stage"
                                aria-label="Remove stage"
                                onClick={() => setDeleteIndex(i)}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                );
            })}
            <button className="dlg__add" onClick={add}>
                <Plus size={13} /> Add stage
            </button>
            {deleteIndex !== null && (
                <ConfirmModal
                    title={`Delete stage “${stages[deleteIndex]?.id ?? ''}”?`}
                    message="This stage and its authored description will be removed."
                    confirmLabel="Delete stage"
                    danger
                    onConfirm={() => {
                        remove(deleteIndex);
                        setDeleteIndex(null);
                    }}
                    onCancel={() => setDeleteIndex(null)}
                />
            )}
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
    image,
    projectDir,
    onChange,
}: {
    markers: Marker[];
    locationIds: string[];
    image: string;
    projectDir: string;
    onChange: (markers: Marker[]) => void;
}) {
    const [preview, setPreview] = useState<{
        loaded: boolean;
        url: string | null;
    }>({ loaded: false, url: null });
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const previewRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [drag, setDrag] = useState<{
        index: number;
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);
    const set = (i: number, patch: Partial<Marker>) =>
        onChange(markers.map((m, j) => (j === i ? { ...m, ...patch } : m)));
    const remove = (i: number) => {
        onChange(markers.filter((_, j) => j !== i));
        setSelectedIndex((current) => {
            if (current === null) return null;
            if (current === i) return null;
            return current > i ? current - 1 : current;
        });
    };
    const add = () => {
        setSelectedIndex(markers.length);
        onChange([...markers, { id: '', x: 0, y: 0 }]);
    };

    // A marker may point at a location not in the list (e.g. a typo); keep it
    // selectable so the value isn't silently dropped.
    const options = (id: string) =>
        id && !locationIds.includes(id) ? [id, ...locationIds] : locationIds;

    useEffect(() => {
        let alive = true;
        setNaturalSize({ width: 0, height: 0 });
        if (!image) {
            setPreview({ loaded: true, url: null });
            return;
        }
        setPreview({ loaded: false, url: null });
        if (typeof window.studio.readAssetDataUrl !== 'function') {
            setPreview({ loaded: true, url: null });
            return;
        }
        void window.studio
            .readAssetDataUrl(projectDir, 'map', image)
            .then((url) => alive && setPreview({ loaded: true, url }));
        return () => {
            alive = false;
        };
    }, [image, projectDir]);

    const width =
        naturalSize.width ||
        Math.max(1, ...markers.map((marker) => (marker.x ?? 0) * 1.08));
    const height =
        naturalSize.height ||
        Math.max(1, ...markers.map((marker) => (marker.y ?? 0) * 1.08));
    const pointFromClient = (clientX: number, clientY: number) => {
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return null;
        const px = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const py = Math.max(0, Math.min(rect.height, clientY - rect.top));
        return {
            x: Math.round((px / rect.width) * width),
            y: Math.round((py / rect.height) * height),
        };
    };
    const placeSelected = (event: React.MouseEvent<HTMLDivElement>) => {
        const fallback = markers.findIndex((marker) => !marker.id);
        const index =
            selectedIndex !== null && markers[selectedIndex]
                ? selectedIndex
                : fallback;
        const point = pointFromClient(event.clientX, event.clientY);
        if (index >= 0 && point) {
            setSelectedIndex(index);
            set(index, point);
        }
    };

    return (
        <div className="field">
            <span className="field__label">Map markers</span>
            <div
                ref={previewRef}
                className="map-preview"
                style={{ aspectRatio: `${width} / ${height}` }}
                onClick={placeSelected}
            >
                {preview.url ? (
                    <img
                        className="map-preview__image"
                        src={preview.url}
                        alt="Map marker preview"
                        onLoad={(event) =>
                            setNaturalSize({
                                width: event.currentTarget.naturalWidth,
                                height: event.currentTarget.naturalHeight,
                            })
                        }
                    />
                ) : (
                    <div className="map-preview__empty">
                        {!preview.loaded
                            ? 'Loading map image…'
                            : image
                              ? `No image file found at “${image}”.`
                              : 'Choose a map image to preview marker placement.'}
                    </div>
                )}
                {markers.map((marker, index) => {
                    const shown =
                        drag?.index === index
                            ? { ...marker, x: drag.x, y: drag.y }
                            : marker;
                    const minimum = preview.url ? 0 : 2;
                    const maximum = preview.url ? 100 : 98;
                    const left = Math.max(
                        minimum,
                        Math.min(maximum, ((shown.x ?? 0) / width) * 100)
                    );
                    const top = Math.max(
                        minimum,
                        Math.min(maximum, ((shown.y ?? 0) / height) * 100)
                    );
                    return (
                        <span
                            key={`${marker.id}-${index}`}
                            className={`map-preview__marker ${
                                selectedIndex === index
                                    ? 'map-preview__marker--selected'
                                    : ''
                            } ${
                                drag?.index === index
                                    ? 'map-preview__marker--dragging'
                                    : ''
                            }`}
                            style={{ left: `${left}%`, top: `${top}%` }}
                            title={`${marker.id || 'Unnamed location'} — ${shown.x ?? 0}, ${shown.y ?? 0}`}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                const point = pointFromClient(
                                    event.clientX,
                                    event.clientY
                                );
                                if (!point) return;
                                setSelectedIndex(index);
                                event.currentTarget.setPointerCapture(
                                    event.pointerId
                                );
                                setDrag({
                                    index,
                                    pointerId: event.pointerId,
                                    ...point,
                                });
                            }}
                            onPointerMove={(event) => {
                                if (
                                    drag?.index !== index ||
                                    drag.pointerId !== event.pointerId
                                ) {
                                    return;
                                }
                                const point = pointFromClient(
                                    event.clientX,
                                    event.clientY
                                );
                                if (point) setDrag({ ...drag, ...point });
                            }}
                            onPointerUp={(event) => {
                                if (
                                    drag?.index !== index ||
                                    drag.pointerId !== event.pointerId
                                ) {
                                    return;
                                }
                                set(index, { x: drag.x, y: drag.y });
                                event.currentTarget.releasePointerCapture(
                                    event.pointerId
                                );
                                setDrag(null);
                            }}
                            onPointerCancel={() => setDrag(null)}
                        >
                            <span className="map-preview__dot" />
                            <span className="map-preview__label">
                                {marker.id || 'unnamed'}
                            </span>
                        </span>
                    );
                })}
            </div>
            {markers.map((marker, i) => {
                // Rows track the drag live, exactly like the dots do.
                const shown =
                    drag?.index === i
                        ? { ...marker, x: drag.x, y: drag.y }
                        : marker;
                return (
                    <div
                        key={i}
                        className="rowedit"
                        onPointerDown={() => setSelectedIndex(i)}
                    >
                        <select
                            className="dlg__select rowedit__grow"
                            value={marker.id}
                            onChange={(e) => set(i, { id: e.target.value })}
                        >
                            <option value="">(location)</option>
                            {options(marker.id).map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </select>
                        <input
                            className="dlg__input rowedit__num"
                            type="number"
                            value={shown.x ?? 0}
                            title="x"
                            onChange={(e) =>
                                set(i, { x: Number(e.target.value) })
                            }
                        />
                        <input
                            className="dlg__input rowedit__num"
                            type="number"
                            value={shown.y ?? 0}
                            title="y"
                            onChange={(e) =>
                                set(i, { y: Number(e.target.value) })
                            }
                        />
                        <button
                            className="rowedit__btn rowedit__btn--danger"
                            title="Remove marker"
                            aria-label="Remove marker"
                            onClick={() => remove(i)}
                        >
                            <X size={15} />
                        </button>
                    </div>
                );
            })}
            <button className="dlg__add" onClick={add}>
                <Plus size={13} /> Add marker
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
