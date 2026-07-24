import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { LocaleData } from '@doodle-engine/core';
import type { OpenProject, YamlEdit } from '../../../shared/project';

export interface LocaleFileState {
    values: Record<string, string>;
    saved: Record<string, string>;
    mtimeMs: number | null;
    loading: boolean;
    writing: boolean;
    conflict: boolean;
    missing: boolean;
    error: string | null;
}

interface LocaleWriterValue {
    authoringLocale: string | null;
    files: Record<string, LocaleFileState>;
    setValue: (locale: string, key: string, value: string) => void;
    deleteValue: (locale: string, key: string) => void;
    flush: (locale: string, force?: boolean) => Promise<void>;
    reload: (locale: string) => Promise<void>;
    openLocale: (locale: string, key?: string) => void;
}

const LocaleWriterContext = createContext<LocaleWriterValue | null>(null);

const localePath = (locale: string) => `content/locales/${locale}.yaml`;

function stringsFromYaml(content: string): Record<string, string> {
    const parsed = (parseYaml(content) ?? {}) as Record<string, unknown>;
    return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [
            key,
            value == null ? '' : String(value),
        ])
    );
}

function initialFile(values?: LocaleData): LocaleFileState {
    const strings = Object.fromEntries(
        Object.entries(values ?? {}).map(([key, value]) => [
            key,
            value == null ? '' : String(value),
        ])
    );
    return {
        values: strings,
        saved: strings,
        mtimeMs: null,
        loading: true,
        writing: false,
        conflict: false,
        missing: false,
        error: null,
    };
}

function isDirty(file: LocaleFileState): boolean {
    const keys = new Set([
        ...Object.keys(file.values),
        ...Object.keys(file.saved),
    ]);
    return [...keys].some(
        (key) =>
            Object.hasOwn(file.values, key) !==
                Object.hasOwn(file.saved, key) ||
            file.values[key] !== file.saved[key]
    );
}

function editsFor(file: LocaleFileState): YamlEdit[] {
    const keys = new Set([
        ...Object.keys(file.values),
        ...Object.keys(file.saved),
    ]);
    const edits: YamlEdit[] = [];
    for (const key of keys) {
        const hasValue = Object.hasOwn(file.values, key);
        if (
            hasValue !== Object.hasOwn(file.saved, key) ||
            file.values[key] !== file.saved[key]
        ) {
            edits.push({
                path: [key],
                value: hasValue ? file.values[key] : undefined,
            });
        }
    }
    return edits;
}

function applyEdits(
    values: Record<string, string>,
    edits: YamlEdit[]
): Record<string, string> {
    const next = { ...values };
    for (const edit of edits) {
        const key = String(edit.path[0]);
        if (edit.value === undefined) delete next[key];
        else next[key] = String(edit.value);
    }
    return next;
}

function mergeUnsaved(
    disk: Record<string, string>,
    previous: LocaleFileState
): Record<string, string> {
    const merged = { ...disk };
    for (const edit of editsFor(previous)) {
        const key = String(edit.path[0]);
        if (edit.value === undefined) delete merged[key];
        else merged[key] = String(edit.value);
    }
    return merged;
}

export function authoringLocaleFor(
    locales: Record<string, LocaleData>
): string | null {
    if (locales.en) return 'en';
    return Object.keys(locales).sort()[0] ?? null;
}

export function LocaleWriterProvider({
    project,
    onModified,
    onOpenLocale,
    children,
}: {
    project: OpenProject;
    onModified: (filePath: string) => void;
    onOpenLocale?: (locale: string, key?: string) => void;
    children: React.ReactNode;
}) {
    const [files, setFiles] = useState<Record<string, LocaleFileState>>(() =>
        Object.fromEntries(
            Object.entries(project.registry.locales).map(([locale, values]) => [
                locale,
                initialFile(values),
            ])
        )
    );
    const filesRef = useRef(files);
    filesRef.current = files;
    const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    const loadsRef = useRef(new Map<string, Promise<void>>());
    const writesRef = useRef(new Map<string, Promise<void>>());
    const disposedRef = useRef(false);
    const flushRef = useRef<(locale: string, force?: boolean) => Promise<void>>(
        async () => {}
    );
    const dir = project.projectDir;

    const updateFiles = useCallback(
        (
            update: (
                current: Record<string, LocaleFileState>
            ) => Record<string, LocaleFileState>
        ) => {
            const next = update(filesRef.current);
            filesRef.current = next;
            setFiles(next);
        },
        []
    );

    const load = useCallback(
        async (locale: string, discardUnsaved = false) => {
            const existing = loadsRef.current.get(locale);
            if (existing) return existing;
            const promise = window.studio
                .readDocument(dir, localePath(locale))
                .then((doc) => {
                    const disk = stringsFromYaml(doc.content);
                    updateFiles((current) => {
                        const previous = current[locale] ?? initialFile();
                        return {
                            ...current,
                            [locale]: {
                                ...previous,
                                values: discardUnsaved
                                    ? disk
                                    : mergeUnsaved(disk, previous),
                                saved: disk,
                                mtimeMs: doc.mtimeMs,
                                loading: false,
                                conflict: false,
                                missing: false,
                                error: null,
                            },
                        };
                    });
                })
                .catch((reason) => {
                    updateFiles((current) => {
                        const previous = current[locale] ?? initialFile();
                        return {
                            ...current,
                            [locale]: {
                                ...previous,
                                loading: false,
                                missing: true,
                                error:
                                    reason instanceof Error
                                        ? reason.message
                                        : String(reason),
                            },
                        };
                    });
                })
                .finally(() => loadsRef.current.delete(locale));
            loadsRef.current.set(locale, promise);
            return promise;
        },
        [dir, updateFiles]
    );

    const schedule = useCallback((locale: string) => {
        const previous = timersRef.current.get(locale);
        if (previous) clearTimeout(previous);
        timersRef.current.set(
            locale,
            setTimeout(() => {
                timersRef.current.delete(locale);
                void flushRef.current(locale);
            }, 700)
        );
    }, []);

    const flush = useCallback(
        async (locale: string, force = false): Promise<void> => {
            const active = writesRef.current.get(locale);
            if (active) {
                await active;
                if (isDirty(filesRef.current[locale])) {
                    return flushRef.current(locale, force);
                }
                return;
            }
            if (filesRef.current[locale]?.mtimeMs === null) await load(locale);
            const file = filesRef.current[locale];
            if (!file || (!force && (file.conflict || file.missing))) return;
            const edits = editsFor(file);
            const recreating = force && file.missing;
            if (edits.length === 0 && !recreating) return;

            updateFiles((current) => ({
                ...current,
                [locale]: { ...current[locale], writing: true },
            }));
            const write = (
                recreating
                    ? window.studio.writeDocument(
                          dir,
                          localePath(locale),
                          stringifyYaml(file.values)
                      )
                    : window.studio.writeEntity(
                          dir,
                          localePath(locale),
                          edits,
                          force ? undefined : (file.mtimeMs ?? undefined)
                      )
            )
                .then((result) => {
                    if (result.conflict) {
                        updateFiles((current) => ({
                            ...current,
                            [locale]: {
                                ...current[locale],
                                writing: false,
                                conflict: !result.missing,
                                missing: Boolean(result.missing),
                                mtimeMs: result.mtimeMs,
                            },
                        }));
                        return;
                    }
                    if (result.ok) {
                        updateFiles((current) => ({
                            ...current,
                            [locale]: {
                                ...current[locale],
                                saved: recreating
                                    ? { ...current[locale].values }
                                    : applyEdits(current[locale].saved, edits),
                                mtimeMs: result.mtimeMs,
                                writing: false,
                                conflict: false,
                                missing: false,
                                error: null,
                            },
                        }));
                        onModified(localePath(locale));
                    }
                })
                .finally(() => {
                    writesRef.current.delete(locale);
                    updateFiles((current) => ({
                        ...current,
                        [locale]: { ...current[locale], writing: false },
                    }));
                    if (
                        !disposedRef.current &&
                        isDirty(filesRef.current[locale])
                    )
                        schedule(locale);
                });
            writesRef.current.set(locale, write);
            await write;
        },
        [dir, load, onModified, schedule, updateFiles]
    );
    flushRef.current = flush;

    const setValue = useCallback(
        (locale: string, key: string, value: string) => {
            updateFiles((current) => {
                const previous = current[locale] ?? initialFile();
                return {
                    ...current,
                    [locale]: {
                        ...previous,
                        values: { ...previous.values, [key]: value },
                    },
                };
            });
            void load(locale);
            schedule(locale);
        },
        [load, schedule, updateFiles]
    );

    const deleteValue = useCallback(
        (locale: string, key: string) => {
            updateFiles((current) => {
                const previous = current[locale] ?? initialFile();
                const values = { ...previous.values };
                delete values[key];
                return { ...current, [locale]: { ...previous, values } };
            });
            void load(locale);
            schedule(locale);
        },
        [load, schedule, updateFiles]
    );

    useEffect(() => {
        if (typeof window.studio.onFileChanged !== 'function') return;
        return window.studio.onFileChanged((changedPath) => {
            const match = changedPath
                .replace(/\\/g, '/')
                .match(/^content\/locales\/([^/]+)\.ya?ml$/);
            if (!match) return;
            const locale = match[1];
            setTimeout(() => {
                void window.studio
                    .readDocument(dir, localePath(locale))
                    .then((doc) => {
                        const current = filesRef.current[locale];
                        if (current?.mtimeMs === doc.mtimeMs) return;
                        const disk = stringsFromYaml(doc.content);
                        if (current && (current.writing || isDirty(current))) {
                            updateFiles((all) => ({
                                ...all,
                                [locale]: {
                                    ...all[locale],
                                    conflict: true,
                                    missing: false,
                                    mtimeMs: doc.mtimeMs,
                                },
                            }));
                        } else {
                            updateFiles((all) => ({
                                ...all,
                                [locale]: {
                                    ...(all[locale] ?? initialFile()),
                                    values: disk,
                                    saved: disk,
                                    mtimeMs: doc.mtimeMs,
                                    loading: false,
                                    conflict: false,
                                    missing: false,
                                    error: null,
                                },
                            }));
                        }
                    })
                    .catch(() => {
                        const current = filesRef.current[locale];
                        if (!current) return;
                        updateFiles((all) => ({
                            ...all,
                            [locale]: {
                                ...all[locale],
                                missing: true,
                                conflict: false,
                            },
                        }));
                    });
            }, 40);
        });
    }, [dir, updateFiles]);

    useEffect(() => {
        disposedRef.current = false;
        return () => {
            disposedRef.current = true;
            for (const timer of timersRef.current.values()) clearTimeout(timer);
            for (const [locale, file] of Object.entries(filesRef.current)) {
                if (isDirty(file) && !file.conflict && !file.missing) {
                    void flushRef.current(locale);
                }
            }
        };
    }, []);

    const reload = useCallback((locale: string) => load(locale, true), [load]);

    const value = useMemo<LocaleWriterValue>(
        () => ({
            authoringLocale: authoringLocaleFor(project.registry.locales),
            files,
            setValue,
            deleteValue,
            flush,
            reload,
            openLocale: (locale, key) => onOpenLocale?.(locale, key),
        }),
        [
            deleteValue,
            files,
            flush,
            onOpenLocale,
            project.registry.locales,
            reload,
            setValue,
        ]
    );

    return (
        <LocaleWriterContext.Provider value={value}>
            {children}
        </LocaleWriterContext.Provider>
    );
}

export function LocaleWriterBoundary({
    project,
    onModified,
    onOpenLocale,
    children,
}: {
    project: OpenProject;
    onModified: (filePath: string) => void;
    onOpenLocale?: (locale: string, key?: string) => void;
    children: React.ReactNode;
}) {
    const existing = useContext(LocaleWriterContext);
    if (existing) return children;
    if (!project.projectDir || !project.registry?.locales) return children;
    return (
        <LocaleWriterProvider
            project={project}
            onModified={onModified}
            onOpenLocale={onOpenLocale}
        >
            {children}
        </LocaleWriterProvider>
    );
}

export const useLocaleWriter = () => useContext(LocaleWriterContext);

export function localeDirty(file: LocaleFileState | undefined): boolean {
    return file ? isDirty(file) : false;
}
