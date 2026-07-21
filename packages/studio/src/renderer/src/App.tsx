import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THEMES } from '../../shared/project';
import type {
    NewProjectOptions,
    OpenProject,
    PreviewStatus,
    RecentProject,
    StudioBuildResult,
    ThemeColor,
    ThemeMode,
    FlagVarNotes,
} from '../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';
import {
    ReferenceIndex,
    type Reference,
    type SymbolType,
} from '@doodle-engine/core';
import type { SectionKey, Tab } from './types';
import { buildSections } from './lib/sections';
import { dialogueProblemTarget, locateFile, sectionFileKey } from './lib/paths';
import {
    pathForNewItem,
    templateForNewItem,
    type CreatableSection,
} from './lib/new-content';
import {
    planRename,
    planFlagVariableRename,
    rewriteDialogueSource,
    type RenamePlan,
    type RenameTarget,
} from './lib/rename';
import { Welcome } from './shell/Welcome';
import { NewProjectModal } from './shell/NewProjectModal';
import { AboutModal } from './shell/AboutModal';
import { CreateItemModal } from './shell/CreateItemModal';
import { RenameModal } from './shell/RenameModal';
import { ConfirmModal } from './shell/ConfirmModal';
import { FlagVarRenameModal } from './shell/FlagVarRenameModal';
import { TopBar } from './shell/TopBar';
import { EngineBanner } from './shell/EngineBanner';
import { LeftRail } from './shell/LeftRail';
import { EditorArea, type ViewMode } from './shell/EditorArea';
import { RightPanel } from './shell/RightPanel';
import { BottomDock, type DockTab } from './shell/BottomDock';
import { ResizeHandle } from './shell/ResizeHandle';
import { CommandPalette, type Command } from './shell/CommandPalette';
import { usePersistedSize } from './lib/usePersistedSize';
import {
    EMPTY_FLAG_VAR_NOTES,
    attachFlagVarNotes,
    buildFlagVarSummaries,
    buildStatSummaries,
    type FlagVarKind,
    type NameCatalog,
} from './lib/flag-vars';
import type { FlagVarSelection } from './shell/FlagsVariablesPage';
import {
    FolderOpen,
    FilePlus,
    FileText,
    Hammer,
    Check,
    Play,
    Monitor,
    Square,
    Palette,
    CircleHelp,
} from './lib/icons';

/** The reference-index symbol type for each content section, where one exists.
 * Maps and locales have no incoming references, so they're absent. */
const SECTION_SYMBOL: Partial<Record<CreatableSection, SymbolType>> = {
    characters: 'characters',
    items: 'items',
    locations: 'locations',
    quests: 'quests',
    dialogues: 'dialogues',
    interludes: 'interludes',
    journal: 'journalEntries',
};

const DOCK_DEFAULT_HEIGHTS: Record<DockTab, number> = {
    problems: 112,
    build: 260,
    devserver: 260,
    playtest: Math.min(600, Math.max(360, Math.round(innerHeight * 0.48))),
};
const ZOOM_FACTORS = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6];

function displayError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(
        /^Error invoking remote method '[^']+': Error: /,
        ''
    );
}

export function App() {
    const [project, setProject] = useState<OpenProject | null>(null);
    const [referenceProject, setReferenceProject] =
        useState<OpenProject | null>(null);
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [openError, setOpenError] = useState<string | null>(null);
    const [recent, setRecent] = useState<RecentProject[]>([]);
    const [showNewProject, setShowNewProject] = useState(false);
    const [aboutVersion, setAboutVersion] = useState<string | null>(null);
    const [newItemSection, setNewItemSection] =
        useState<CreatableSection | null>(null);
    const [renameTarget, setRenameTarget] = useState<{
        section: CreatableSection;
        id: string;
    } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{
        section: CreatableSection;
        id: string;
        label: string;
    } | null>(null);
    const [flagVarTarget, setFlagVarTarget] = useState<{
        kind: 'flag' | 'variable';
        id: string;
    } | null>(null);
    const [flagVarSelection, setFlagVarSelection] =
        useState<FlagVarSelection | null>(null);
    const [flagVarNotes, setFlagVarNotes] =
        useState<FlagVarNotes>(EMPTY_FLAG_VAR_NOTES);
    const [flagVarNotesError, setFlagVarNotesError] = useState<string | null>(
        null
    );
    const [dockTab, setDockTab] = useState<DockTab>('problems');
    const [showPalette, setShowPalette] = useState(false);
    const [building, setBuilding] = useState(false);
    const [buildResult, setBuildResult] = useState<StudioBuildResult | null>(
        null
    );
    // Lines streamed from the build process while it runs, shown live before the
    // final result lands.
    const [buildLog, setBuildLog] = useState<string[]>([]);
    const [installing, setInstalling] = useState(false);
    const [installLog, setInstallLog] = useState<string[]>([]);
    const [preview, setPreview] = useState<PreviewStatus | null>(null);
    const [previewBusy, setPreviewBusy] = useState(false);
    const [previewLog, setPreviewLog] = useState<string[]>([]);
    const [theme, setTheme] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('doodle-studio-theme');
        return THEMES.some((t) => t.id === saved)
            ? (saved as ThemeMode)
            : 'dark';
    });
    const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
        const saved = localStorage.getItem('doodle-studio-theme-color');
        return saved === 'red' ||
            saved === 'violet' ||
            saved === 'green' ||
            saved === 'pink' ||
            saved === 'gold'
            ? saved
            : 'default';
    });
    const [zoomFactor, setZoomFactor] = useState(() => {
        const stored = Number(localStorage.getItem('doodle-studio-zoom'));
        return ZOOM_FACTORS.includes(stored) ? stored : 1;
    });
    const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({});
    // Selected dialogue node per tab, shared by the Visual editor and the
    // graph so switching modes (or clicking a graph node) keeps the place.
    const [selectedNodes, setSelectedNodes] = useState<Record<string, string>>(
        {}
    );
    const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(() => new Set());
    const [reveal, setReveal] = useState<{
        key: string;
        message: string;
        seq: number;
    } | null>(null);
    const [validating, setValidating] = useState(false);
    // Files edited since the last validation; their markers are stale until
    // Validate runs again.
    const [staleFiles, setStaleFiles] = useState<Set<string>>(() => new Set());
    // Every project object comes from a fresh validation (open or revalidate),
    // so its arrival time is when the shown problems were computed.
    const [lastValidatedAt, setLastValidatedAt] = useState<Date | null>(null);
    useEffect(() => {
        setLastValidatedAt(project ? new Date() : null);
    }, [project]);
    // When an editor last wrote this project's content to disk (autosave or
    // manual). Cleared when a different project opens.
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const projectDir = project?.projectDir;
    const currentDirRef = useRef<string | null>(null);
    const notesWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
    const referenceRefreshTimerRef = useRef<ReturnType<
        typeof setTimeout
    > | null>(null);
    const referenceRefreshSequenceRef = useRef(0);
    useEffect(() => {
        setLastSavedAt(null);
    }, [projectDir]);
    useEffect(() => {
        currentDirRef.current = projectDir ?? null;
    }, [projectDir]);
    useEffect(() => {
        setReferenceProject(project);
    }, [project]);
    const refreshFlagVarNotes = useCallback(async (dir: string) => {
        if (!window.studio.readFlagVarNotes) return;
        try {
            const result = await window.studio.readFlagVarNotes(dir);
            if (currentDirRef.current !== dir) return;
            if (result.status === 'available') {
                setFlagVarNotes(result.notes);
                setFlagVarNotesError(null);
            } else {
                setFlagVarNotes(EMPTY_FLAG_VAR_NOTES);
                setFlagVarNotesError(result.message);
            }
        } catch (error) {
            const message = displayError(error);
            if (currentDirRef.current === dir) {
                setFlagVarNotes(EMPTY_FLAG_VAR_NOTES);
                setFlagVarNotesError(message);
            }
            window.studio.reportError?.({
                context: 'metadata:readFlagVarNotes',
                message,
            });
        }
    }, []);
    const reloadProject = useCallback(
        async (dir: string) => {
            const [fresh] = await Promise.all([
                window.studio.revalidate(dir),
                refreshFlagVarNotes(dir),
            ]);
            return fresh;
        },
        [refreshFlagVarNotes]
    );
    useEffect(() => {
        setFlagVarNotes(EMPTY_FLAG_VAR_NOTES);
        setFlagVarNotesError(null);
        if (projectDir) void refreshFlagVarNotes(projectDir);
    }, [projectDir, refreshFlagVarNotes]);
    // Hand edits to the notes file made outside Studio show up live, the same
    // way external edits to content files do.
    useEffect(() => {
        if (!projectDir || typeof window.studio.onFileChanged !== 'function')
            return;
        return window.studio.onFileChanged((relPath) => {
            if (
                relPath.replace(/\\/g, '/') === 'metadata/flags-and-vars.yaml'
            ) {
                void refreshFlagVarNotes(projectDir);
            }
        });
    }, [projectDir, refreshFlagVarNotes]);
    // "Play from here" on a node: opens the playtest tab and jumps the running
    // session to that node. The seq makes repeat clicks on the same node fire.
    const [playtestStart, setPlaytestStart] = useState<{
        dialogueId: string;
        nodeId: string;
        seq: number;
    } | null>(null);
    const playFromNode = useCallback((dialogueId: string, nodeId: string) => {
        setPlaytestStart((prev) => ({
            dialogueId,
            nodeId,
            seq: (prev?.seq ?? 0) + 1,
        }));
        setDockTab('playtest');
    }, []);

    useEffect(() => {
        const report = (context: string, value: unknown) => {
            const error =
                value instanceof Error ? value : new Error(String(value));
            window.studio.reportError({
                context,
                message: error.message,
                stack: error.stack,
            });
        };
        const onError = (event: ErrorEvent) =>
            report('renderer:error', event.error ?? event.message);
        const onUnhandledRejection = (event: PromiseRejectionEvent) =>
            report('renderer:unhandledRejection', event.reason);
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener(
                'unhandledrejection',
                onUnhandledRejection
            );
        };
    }, []);

    // The folder of the project on screen right now. Long-running work
    // (builds, installs) checks this when it finishes, so results from one
    // project never land in another that was opened in the meantime.
    const [railWidth, setRailWidth] = usePersistedSize(
        'doodle-studio-rail-w',
        236
    );
    const [rightWidth, setRightWidth] = usePersistedSize(
        'doodle-studio-right-w',
        260
    );
    const [dockSizes, setDockSizes] = useState<Record<DockTab, number>>(
        () =>
            Object.fromEntries(
                (Object.keys(DOCK_DEFAULT_HEIGHTS) as DockTab[]).map((tab) => {
                    const stored = Number(
                        localStorage.getItem(`doodle-studio-dock-h-${tab}`)
                    );
                    return [
                        tab,
                        Number.isFinite(stored) && stored > 0
                            ? stored
                            : DOCK_DEFAULT_HEIGHTS[tab],
                    ];
                })
            ) as Record<DockTab, number>
    );
    const dockHeight = dockSizes[dockTab];
    const setDockHeight = useCallback(
        (value: number) => {
            setDockSizes((sizes) => ({ ...sizes, [dockTab]: value }));
            localStorage.setItem(
                `doodle-studio-dock-h-${dockTab}`,
                String(value)
            );
        },
        [dockTab]
    );

    const referenceSource = referenceProject ?? project;
    const referenceIndex = useMemo(
        () =>
            referenceSource
                ? new ReferenceIndex(
                      referenceSource.registry,
                      new Map(Object.entries(referenceSource.files)),
                      referenceSource.config
                  )
                : null,
        [referenceSource]
    );
    const baseFlagVarSummaries = useMemo(
        () => buildFlagVarSummaries(referenceIndex),
        [referenceIndex]
    );
    const namedFlagVars = useMemo(
        () => attachFlagVarNotes(baseFlagVarSummaries, flagVarNotes),
        [baseFlagVarSummaries, flagVarNotes]
    );
    const statSummaries = useMemo(
        () =>
            referenceSource ? buildStatSummaries(referenceSource.registry) : [],
        [referenceSource]
    );
    const nameCatalog = useMemo<NameCatalog>(
        () => ({ ...namedFlagVars, stats: statSummaries }),
        [namedFlagVars, statSummaries]
    );

    // How many places reference this content item (0 if the index isn't ready
    // or the section has no symbol type, e.g. maps/locales).
    const referenceCount = useCallback(
        (section: CreatableSection, id: string): number => {
            const symbol = SECTION_SYMBOL[section];
            if (!referenceIndex || !symbol) return 0;
            return referenceIndex.count(symbol, id);
        },
        [referenceIndex]
    );

    const setViewMode = useCallback(
        (key: string, mode: ViewMode) =>
            setViewModes((prev) => ({ ...prev, [key]: mode })),
        []
    );
    const selectNode = useCallback((key: string, nodeId: string | null) => {
        setSelectedNodes((prev) => {
            if (nodeId === null) {
                if (!(key in prev)) return prev;
                const { [key]: _removed, ...rest } = prev;
                return rest;
            }
            return prev[key] === nodeId ? prev : { ...prev, [key]: nodeId };
        });
    }, []);
    const handleDirty = useCallback((key: string, dirty: boolean) => {
        setDirtyTabs((prev) => {
            if (dirty === prev.has(key)) return prev;
            const next = new Set(prev);
            if (dirty) next.add(key);
            else next.delete(key);
            return next;
        });
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute(
            'data-theme-base',
            THEMES.find((t) => t.id === theme)?.base ?? 'dark'
        );
        document.documentElement.setAttribute('data-accent', themeColor);
        localStorage.setItem('doodle-studio-theme', theme);
        localStorage.setItem('doodle-studio-theme-color', themeColor);
        window.studio.setThemeMenuState({ mode: theme, color: themeColor });
    }, [theme, themeColor]);

    useEffect(() => {
        localStorage.setItem('doodle-studio-zoom', String(zoomFactor));
        window.studio.setZoomFactor?.(zoomFactor);
    }, [zoomFactor]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                const zoomDirection =
                    e.key === '+' || e.key === '=' ? 1 : e.key === '-' ? -1 : 0;
                if (zoomDirection !== 0) {
                    e.preventDefault();
                    setZoomFactor((current) => {
                        const index = ZOOM_FACTORS.indexOf(current);
                        const next = Math.max(
                            0,
                            Math.min(
                                ZOOM_FACTORS.length - 1,
                                index + zoomDirection
                            )
                        );
                        return ZOOM_FACTORS[next];
                    });
                    return;
                }
                if (e.key === '0') {
                    e.preventDefault();
                    setZoomFactor(1);
                    return;
                }
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                // Modal and builder dialogs own keyboard focus. Never stack the
                // command palette over one of them.
                if (
                    document.querySelector('.modal-backdrop, .popover-backdrop')
                ) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                setShowPalette((v) => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        window.studio.listRecentProjects().then(setRecent);
    }, []);

    // Stream build and install output as it happens. Lines are tagged with
    // the project they came from; lines for any other project are ignored.
    useEffect(
        () =>
            window.studio.onBuildLog((dir, line) => {
                if (dir !== currentDirRef.current) return;
                setBuildLog((prev) => [...prev, line]);
            }),
        []
    );
    useEffect(
        () =>
            window.studio.onInstallLog((dir, line) => {
                if (dir !== currentDirRef.current) return;
                setInstallLog((prev) => [...prev, line]);
            }),
        []
    );
    useEffect(
        () =>
            window.studio.onPreviewLog((dir, line) => {
                if (dir !== currentDirRef.current) return;
                setPreviewLog((prev) => [...prev, line]);
            }),
        []
    );

    const applyOpen = useCallback(
        async (run: () => Promise<OpenProject | null>) => {
            setLoading(true);
            setOpenError(null);
            try {
                const opened = await run();
                if (opened) {
                    setProject(opened);
                    setReferenceProject(opened);
                    setTabs([]);
                    setActiveKey(null);
                    setBuildResult(null);
                    setBuildLog([]);
                    setInstallLog([]);
                    setPreview(null);
                    setPreviewLog([]);
                    setDockTab('problems');
                    setStaleFiles(new Set());
                    setDirtyTabs(new Set());
                    setViewModes({});
                    setSelectedNodes({});
                    setFlagVarSelection(null);
                    setFlagVarNotes(EMPTY_FLAG_VAR_NOTES);
                    setFlagVarNotesError(null);
                    setRecent(await window.studio.listRecentProjects());
                    return true;
                }
                return false;
            } catch (error) {
                setOpenError(displayError(error));
                return false;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const openProject = useCallback(
        () => applyOpen(() => window.studio.openProject()),
        [applyOpen]
    );
    const openRecent = useCallback(
        (path: string) => applyOpen(() => window.studio.openProjectPath(path)),
        [applyOpen]
    );
    const removeRecent = useCallback(async (path: string) => {
        setRecent(await window.studio.removeRecentProject(path));
    }, []);
    const createProject = useCallback(
        async (options: NewProjectOptions) => {
            const created = await applyOpen(() =>
                window.studio.createProject(options)
            );
            if (created) setShowNewProject(false);
        },
        [applyOpen]
    );
    const openNewProjectModal = useCallback(() => {
        setOpenError(null);
        setShowNewProject(true);
    }, []);

    useEffect(
        () =>
            window.studio.onMenu({
                onNew: openNewProjectModal,
                onOpen: () => openProject(),
                onOpenRecent: (path) => openRecent(path),
                onAbout: setAboutVersion,
                onThemeMode: setTheme,
                onThemeColor: setThemeColor,
            }),
        [openProject, openRecent, openNewProjectModal]
    );

    const scheduleReferenceRefresh = useCallback(() => {
        const dir = currentDirRef.current;
        if (!dir) return;
        if (referenceRefreshTimerRef.current) {
            clearTimeout(referenceRefreshTimerRef.current);
        }
        const sequence = ++referenceRefreshSequenceRef.current;
        referenceRefreshTimerRef.current = setTimeout(() => {
            referenceRefreshTimerRef.current = null;
            void window.studio
                .revalidate(dir)
                .then((fresh) => {
                    if (
                        currentDirRef.current === dir &&
                        referenceRefreshSequenceRef.current === sequence
                    ) {
                        setReferenceProject(fresh);
                    }
                })
                .catch((error) =>
                    window.studio.reportError?.({
                        context: 'symbols:refreshAfterSave',
                        message: displayError(error),
                    })
                );
        }, 120);
    }, []);
    useEffect(
        () => () => {
            referenceRefreshSequenceRef.current++;
            if (referenceRefreshTimerRef.current) {
                clearTimeout(referenceRefreshTimerRef.current);
            }
        },
        []
    );
    const markModified = useCallback(
        (filePath: string) => {
            setLastSavedAt(new Date());
            setStaleFiles((prev) =>
                prev.has(filePath) ? prev : new Set(prev).add(filePath)
            );
            scheduleReferenceRefresh();
        },
        [scheduleReferenceRefresh]
    );

    const revalidate = useCallback(async () => {
        if (!project) return;
        const dir = project.projectDir;
        // Fast runs skip the busy state entirely: a "Validating…" pill that
        // exists for two frames reads as a glitch, not feedback.
        const showBusy = setTimeout(() => setValidating(true), 150);
        try {
            setProject(await reloadProject(dir));
            setStaleFiles(new Set());
        } finally {
            clearTimeout(showBusy);
            setValidating(false);
        }
    }, [project, reloadProject]);

    const runBuild = useCallback(async () => {
        if (!project || building) return;
        const dir = project.projectDir;
        setBuilding(true);
        setBuildLog([]);
        setBuildResult(null);
        setDockTab('build');
        try {
            const result = await window.studio.build(dir);
            // Show the result only if this is still the open project.
            if (currentDirRef.current === dir) setBuildResult(result);
        } finally {
            setBuilding(false);
        }
    }, [project, building]);

    const cancelBuild = useCallback(() => window.studio.cancelBuild(), []);

    const openOutput = useCallback(() => {
        if (buildResult?.outDir) window.studio.openPath(buildResult.outDir);
    }, [buildResult]);

    const installDeps = useCallback(async () => {
        if (!project || installing) return;
        const dir = project.projectDir;
        setInstalling(true);
        setInstallLog([]);
        setDockTab('build');
        try {
            const result = await window.studio.installDependencies(dir);
            // Re-read the project so the "dependencies not installed" banner
            // clears and Build/Preview enable. Only if this is still the
            // open project; otherwise the finished install changes nothing
            // on screen.
            if (result.ok && currentDirRef.current === dir) {
                setProject(await reloadProject(dir));
            }
        } finally {
            setInstalling(false);
        }
    }, [project, installing, reloadProject]);

    const startPreview = useCallback(async () => {
        if (!project || previewBusy) return;
        setPreviewBusy(true);
        setPreviewLog([]);
        setDockTab('devserver');
        try {
            setPreview(await window.studio.startPreview(project.projectDir));
        } finally {
            setPreviewBusy(false);
        }
    }, [project, previewBusy]);

    const stopPreview = useCallback(async () => {
        setPreviewBusy(true);
        try {
            await window.studio.stopPreview();
            setPreview(null);
        } finally {
            setPreviewBusy(false);
        }
    }, []);

    const openItem = useCallback(
        (section: SectionKey, itemId: string, label: string) => {
            const key = `${section}:${itemId}`;
            setTabs((prev) =>
                prev.some((t) => t.key === key)
                    ? prev
                    : [...prev, { key, section, itemId, label }]
            );
            setActiveKey(key);
        },
        []
    );
    const openFlagsVariables = useCallback(
        (selection?: FlagVarSelection) => {
            if (selection) setFlagVarSelection(selection);
            openItem('flags-vars', 'all', 'Flags & variables');
        },
        [openItem]
    );

    const queueFlagVarNoteOperation = useCallback(
        async (
            context: string,
            operation: (dir: string) => Promise<FlagVarNotes>
        ) => {
            if (flagVarNotesError || !project) return;
            const dir = project.projectDir;
            notesWriteQueueRef.current = notesWriteQueueRef.current
                .catch(() => {})
                .then(async () => {
                    const notes = await operation(dir);
                    if (currentDirRef.current === dir) {
                        setFlagVarNotes(notes);
                        setFlagVarNotesError(null);
                        setLastSavedAt(new Date());
                    }
                });
            try {
                await notesWriteQueueRef.current;
            } catch (error) {
                const message = displayError(error);
                if (currentDirRef.current === dir) {
                    setFlagVarNotesError(message);
                }
                window.studio.reportError?.({
                    context,
                    message,
                });
            }
        },
        [flagVarNotesError, project]
    );
    const updateFlagVarNote = useCallback(
        (kind: FlagVarKind, id: string, note: string) =>
            queueFlagVarNoteOperation('metadata:updateFlagVarNote', (dir) =>
                window.studio.updateFlagVarNote(dir, kind, id, note)
            ),
        [queueFlagVarNoteOperation]
    );
    const moveFlagVarNote = useCallback(
        (kind: FlagVarKind, from: string, to: string) =>
            queueFlagVarNoteOperation('metadata:moveFlagVarNote', (dir) =>
                window.studio.moveFlagVarNote(dir, kind, from, to)
            ),
        [queueFlagVarNoteOperation]
    );

    const existingIds = useCallback(
        (section: CreatableSection): string[] => {
            if (!project) return [];
            const r = project.registry;
            const bySection: Record<
                CreatableSection,
                Record<string, unknown>
            > = {
                dialogues: r.dialogues,
                characters: r.characters,
                locations: r.locations,
                items: r.items,
                quests: r.quests,
                maps: r.maps,
                interludes: r.interludes,
                journal: r.journalEntries,
                locales: r.locales,
            };
            return Object.keys(bySection[section]);
        },
        [project]
    );

    const createItem = useCallback(
        async (section: CreatableSection, id: string) => {
            if (!project) return;
            setNewItemSection(null);
            const relPath = pathForNewItem(section, id);
            const result = await window.studio.writeDocument(
                project.projectDir,
                relPath,
                templateForNewItem(section, id)
            );
            if (!result.ok) return;
            // Reload so the new file shows in the rail, then open it.
            setProject(await reloadProject(project.projectDir));
            openItem(section, id, id);
        },
        [project, openItem, reloadProject]
    );

    const openProblem = useCallback(
        (problem: ValidationError) => {
            const loc = locateFile(problem.file);
            if (!loc) return;
            openItem(loc.section, loc.itemId, loc.itemId);
            const key = `${loc.section}:${loc.itemId}`;
            if (loc.section === 'dialogues') {
                const target = dialogueProblemTarget(
                    problem.message,
                    project?.registry.dialogues[loc.itemId]
                );
                if (target) {
                    setViewMode(key, 'view');
                    selectNode(key, target.nodeId);
                    setReveal((prev) => ({
                        key,
                        message: problem.message,
                        seq: (prev?.seq ?? 0) + 1,
                    }));
                    return;
                }
            }
            setViewMode(key, 'source');
            setReveal((prev) => ({
                key,
                message: problem.message,
                seq: (prev?.seq ?? 0) + 1,
            }));
        },
        [openItem, project, selectNode, setViewMode]
    );

    const closeTab = useCallback((key: string) => {
        setTabs((prev) => {
            const next = prev.filter((t) => t.key !== key);
            setActiveKey((current) =>
                current === key
                    ? next.length
                        ? next[next.length - 1].key
                        : null
                    : current
            );
            return next;
        });
        setDirtyTabs((prev) => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
        setViewModes((prev) => {
            if (!(key in prev)) return prev;
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });
        setSelectedNodes((prev) => {
            if (!(key in prev)) return prev;
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const deleteItem = useCallback(
        async (section: CreatableSection, id: string) => {
            if (!project) return;
            setDeleteTarget(null);
            const key = sectionFileKey(section, id);
            const relPath =
                (key ? project.files[key] : undefined) ??
                pathForNewItem(section, id);
            await window.studio.deleteDocument(project.projectDir, relPath);
            closeTab(`${section}:${id}`);
            setProject(await reloadProject(project.projectDir));
        },
        [project, closeTab, reloadProject]
    );

    // Apply a rename plan's reference edits. Every dialogue is rewritten from
    // the file as it is on disk right now, and every write carries the read's
    // timestamp, so a rename can only ever change the references themselves.
    const applyRenamePlan = useCallback(
        async (
            dir: string,
            fresh: OpenProject,
            plan: RenamePlan,
            target: RenameTarget,
            oldId: string,
            newId: string
        ) => {
            for (const rewrite of plan.dialogueRewrites) {
                const relPath =
                    fresh.files[`dialogues:${rewrite.id}`] ??
                    pathForNewItem('dialogues', rewrite.id);

                // Read, rewrite from the current text, write with the read's
                // timestamp. One retry if the file changed in between.
                for (let attempt = 0; attempt < 2; attempt++) {
                    const doc = await window.studio.readDocument(dir, relPath);
                    const next = rewriteDialogueSource(
                        doc.content,
                        rewrite.id,
                        target,
                        oldId,
                        newId
                    );
                    if (next === null) break;
                    const result = await window.studio.writeDocument(
                        dir,
                        relPath,
                        next,
                        doc.mtimeMs
                    );
                    if (!result.conflict) break;
                }
            }
            for (const edit of plan.yamlEdits) {
                const relPath =
                    edit.collection === 'game'
                        ? 'content/game.yaml'
                        : fresh.files[`${edit.collection}:${edit.id}`];
                if (relPath)
                    await window.studio.writeEntity(dir, relPath, edit.edits);
            }
        },
        []
    );

    const renameItem = useCallback(
        async (section: CreatableSection, oldId: string, newId: string) => {
            if (!project || oldId === newId) return;
            setRenameTarget(null);
            const dir = project.projectDir;

            // Re-read the project first so the plan reflects the files as
            // they are now, including everything saved since the last
            // validation.
            const fresh = await reloadProject(dir);
            setProject(fresh);
            const plan = planRename(
                fresh.registry,
                section,
                oldId,
                newId,
                fresh.config
            );
            await applyRenamePlan(dir, fresh, plan, { section }, oldId, newId);

            // Rename the file, and set the new id inside it for YAML entities
            // (a dialogue's id is its filename, so the move covers it).
            const key = sectionFileKey(section, oldId);
            const oldPath =
                (key ? fresh.files[key] : undefined) ??
                pathForNewItem(section, oldId);
            const newPath = pathForNewItem(section, newId);
            if (section !== 'dialogues' && section !== 'locales') {
                await window.studio.writeEntity(dir, oldPath, [
                    { path: ['id'], value: newId },
                ]);
            }
            await window.studio.renameDocument(dir, oldPath, newPath);

            closeTab(`${section}:${oldId}`);
            setProject(await reloadProject(dir));
            openItem(section, newId, newId);
        },
        [project, closeTab, openItem, applyRenamePlan, reloadProject]
    );

    const renameFlagVariable = useCallback(
        async (kind: FlagVarKind, oldId: string, newId: string) => {
            if (!project || oldId === newId) return;
            const dir = project.projectDir;
            const fresh = await reloadProject(dir);
            setProject(fresh);
            const plan = planFlagVariableRename(
                fresh.registry,
                kind,
                oldId,
                newId,
                fresh.config
            );
            await applyRenamePlan(dir, fresh, plan, { kind }, oldId, newId);
            await moveFlagVarNote(kind, oldId, newId);
            setProject(await reloadProject(dir));
            setFlagVarSelection((selection) =>
                selection?.kind === kind && selection.id === oldId
                    ? { kind, id: newId }
                    : selection
            );
        },
        [project, applyRenamePlan, moveFlagVarNote, reloadProject]
    );

    if (!project) {
        return (
            <div className="app">
                <Welcome
                    onOpen={openProject}
                    onNew={openNewProjectModal}
                    onOpenRecent={openRecent}
                    onRemoveRecent={(path) => void removeRecent(path)}
                    recent={recent}
                    loading={loading}
                    error={openError}
                />
                {showNewProject && (
                    <NewProjectModal
                        onCreate={createProject}
                        onCancel={() => setShowNewProject(false)}
                        error={openError}
                        onClearError={() => setOpenError(null)}
                    />
                )}
                {aboutVersion && (
                    <AboutModal
                        version={aboutVersion}
                        onClose={() => setAboutVersion(null)}
                    />
                )}
            </div>
        );
    }

    const sections = buildSections(project);
    const activeTab = tabs.find((t) => t.key === activeKey) ?? null;

    const canBuild = project.engine.depsInstalled;
    const actionCommands: Command[] = [
        {
            id: 'act:open',
            label: 'Open project…',
            group: 'Actions',
            icon: <FolderOpen size={15} />,
            run: openProject,
        },
        {
            id: 'act:new',
            label: 'New project…',
            group: 'Actions',
            icon: <FilePlus size={15} />,
            run: openNewProjectModal,
        },
        {
            id: 'act:validate',
            label: 'Validate',
            group: 'Actions',
            keywords: 'problems check errors',
            icon: <Check size={15} />,
            run: () => revalidate(),
        },
        ...(canBuild
            ? [
                  {
                      id: 'act:build',
                      label: 'Build',
                      group: 'Actions',
                      keywords: 'production dist',
                      icon: <Hammer size={15} />,
                      run: () => runBuild(),
                  },
              ]
            : []),
        {
            id: 'act:playtest',
            label: 'Playtest',
            group: 'Actions',
            keywords: 'run play test engine',
            icon: <Play size={15} />,
            run: () => setDockTab('playtest'),
        },
        ...(preview
            ? [
                  {
                      id: 'act:stop-preview',
                      label: 'Stop preview',
                      group: 'Actions',
                      keywords: 'dev server',
                      icon: <Square size={15} />,
                      run: () => stopPreview(),
                  },
              ]
            : canBuild
              ? [
                    {
                        id: 'act:preview',
                        label: 'Start preview',
                        group: 'Actions',
                        keywords: 'dev server browser',
                        icon: <Monitor size={15} />,
                        run: () => startPreview(),
                    },
                ]
              : []),
        {
            id: 'act:documentation',
            label: 'Documentation',
            group: 'Actions',
            keywords: 'help guide studio manual',
            icon: <CircleHelp size={15} />,
            run: () => void window.studio.openDocumentation(),
        },
        ...THEMES.map(
            (t): Command => ({
                id: `act:theme:${t.id}`,
                label: `Theme: ${t.label}`,
                group: 'Actions',
                keywords: 'theme appearance dark light',
                icon: <Palette size={15} />,
                run: () => setTheme(t.id),
            })
        ),
    ];
    const fileCommands: Command[] = sections.flatMap((section) =>
        section.items.map((item) => ({
            id: `file:${section.key}:${item.id}`,
            label: item.label,
            group: 'Files',
            keywords: section.label,
            hint: section.label,
            icon: <FileText size={15} />,
            run: () => openItem(section.key, item.id, item.label),
        }))
    );
    const symbolCommands: Command[] = [
        ...nameCatalog.flags,
        ...nameCatalog.variables,
    ].map((summary) => ({
        id: `symbol:${summary.kind}:${summary.id}`,
        label: summary.id,
        group: 'Flags & variables',
        keywords: `${summary.kind} ${summary.note}`,
        hint: summary.kind,
        run: () => openFlagsVariables({ kind: summary.kind, id: summary.id }),
    }));
    const paletteCommands = [
        ...actionCommands,
        ...fileCommands,
        ...symbolCommands,
    ];

    const openReferencedFile = (file: string) => {
        const loc = locateFile(file);
        if (!loc) return;
        openItem(loc.section, loc.itemId, loc.itemId);
    };
    const openFlagVarReference = (reference: Reference) => {
        if (!reference.file) return;
        const loc = locateFile(reference.file);
        if (!loc) return;
        openItem(loc.section, loc.itemId, loc.itemId);
        const node = reference.where.match(/ node "([^"]+)"/i)?.[1];
        if (loc.section === 'dialogues' && node) {
            const key = `dialogues:${loc.itemId}`;
            selectNode(key, node);
            setViewMode(key, 'view');
        }
    };

    return (
        <div
            className="app"
            style={
                {
                    '--rail-w': `${railWidth}px`,
                    '--right-w': `${rightWidth}px`,
                    '--dock-h': `${dockHeight}px`,
                } as React.CSSProperties
            }
        >
            <div className="app__header">
                <TopBar
                    project={project}
                    onValidate={revalidate}
                    validating={validating}
                    stale={staleFiles.size > 0}
                    onBuild={runBuild}
                    building={building}
                    canBuild={project.engine.depsInstalled}
                    preview={preview}
                    previewBusy={previewBusy}
                    onStartPreview={startPreview}
                    onStopPreview={stopPreview}
                    onOpenPreview={() => window.studio.openPreview()}
                    onPlaytest={() => setDockTab('playtest')}
                    onOpenPalette={() => setShowPalette(true)}
                />
                <EngineBanner
                    engine={project.engine}
                    installing={installing}
                    onInstall={installDeps}
                />
            </div>
            <div className="body">
                <LeftRail
                    sections={sections}
                    activeKey={activeKey}
                    onOpenItem={openItem}
                    onNewItem={(section) => setNewItemSection(section)}
                    onDeleteItem={(section, id, label) =>
                        setDeleteTarget({ section, id, label })
                    }
                    onRenameItem={(section, id) =>
                        setRenameTarget({ section, id })
                    }
                />
                <ResizeHandle
                    axis="x"
                    size={railWidth}
                    min={160}
                    max={480}
                    onResize={setRailWidth}
                />
                <EditorArea
                    project={project}
                    tabs={tabs}
                    activeKey={activeKey}
                    viewModes={viewModes}
                    selectedNodes={selectedNodes}
                    dirtyTabs={dirtyTabs}
                    staleFiles={staleFiles}
                    reveal={reveal}
                    onSelect={setActiveKey}
                    onClose={closeTab}
                    onSetViewMode={setViewMode}
                    onSelectNode={selectNode}
                    onDirty={handleDirty}
                    onModified={markModified}
                    onOpenLocale={(locale, key) => {
                        openItem('locales', locale, locale);
                        if (key) {
                            setReveal((prev) => ({
                                key: `locales:${locale}`,
                                message: key,
                                seq: (prev?.seq ?? 0) + 1,
                            }));
                        }
                    }}
                    onPlayFromNode={playFromNode}
                    onOpenFlagVar={(kind, id) =>
                        openFlagsVariables({ kind, id })
                    }
                    nameCatalog={nameCatalog}
                    flagVarPage={{
                        notes: flagVarNotes,
                        notesError: flagVarNotesError,
                        selected: flagVarSelection,
                        onSelect: setFlagVarSelection,
                        onRename: (kind, id) => setFlagVarTarget({ kind, id }),
                        onNoteChange: (kind, id, note) =>
                            void updateFlagVarNote(kind, id, note),
                        onNoteMove: (kind, from, to) =>
                            void moveFlagVarNote(kind, from, to),
                        onOpenReference: openFlagVarReference,
                    }}
                />
                <ResizeHandle
                    axis="x"
                    size={rightWidth}
                    min={180}
                    max={520}
                    invert
                    onResize={setRightWidth}
                />
                <RightPanel
                    project={project}
                    activeTab={
                        activeTab?.section === 'flags-vars' ? null : activeTab
                    }
                    referenceIndex={referenceIndex}
                    onOpenFile={openReferencedFile}
                    onOpenProblem={openProblem}
                />
            </div>
            <ResizeHandle
                axis="y"
                size={dockHeight}
                min={96}
                max={600}
                invert
                onResize={setDockHeight}
            />
            <BottomDock
                project={project}
                activeTab={dockTab}
                onTabChange={setDockTab}
                building={building}
                buildResult={buildResult}
                buildLog={buildLog}
                installing={installing}
                installLog={installLog}
                onCancelBuild={cancelBuild}
                onRebuild={runBuild}
                onOpenOutput={openOutput}
                preview={preview}
                previewBusy={previewBusy}
                previewLog={previewLog}
                onOpenProblem={openProblem}
                symbolCount={
                    nameCatalog.flags.length + nameCatalog.variables.length
                }
                onOpenSymbols={() => openFlagsVariables()}
                lastValidatedAt={lastValidatedAt}
                lastSavedAt={lastSavedAt}
                playtestStart={playtestStart}
            />
            {loading && (
                <div className="overlay">
                    <span className="spinner" />
                    <span>Reading project…</span>
                </div>
            )}
            {showNewProject && (
                <NewProjectModal
                    onCreate={createProject}
                    onCancel={() => setShowNewProject(false)}
                    error={openError}
                    onClearError={() => setOpenError(null)}
                />
            )}
            {aboutVersion && (
                <AboutModal
                    version={aboutVersion}
                    onClose={() => setAboutVersion(null)}
                />
            )}
            {newItemSection && (
                <CreateItemModal
                    initialSection={newItemSection}
                    existingIds={existingIds}
                    onCreate={createItem}
                    onCancel={() => setNewItemSection(null)}
                />
            )}
            {renameTarget && (
                <RenameModal
                    section={renameTarget.section}
                    oldId={renameTarget.id}
                    existingIds={existingIds(renameTarget.section)}
                    referenceCount={referenceCount(
                        renameTarget.section,
                        renameTarget.id
                    )}
                    onRename={(newId) =>
                        renameItem(renameTarget.section, renameTarget.id, newId)
                    }
                    onCancel={() => setRenameTarget(null)}
                />
            )}
            {deleteTarget &&
                (() => {
                    const n = referenceCount(
                        deleteTarget.section,
                        deleteTarget.id
                    );
                    const impact =
                        n > 0
                            ? ` ${n} place${n === 1 ? '' : 's'} reference it. Those will show as problems until you fix them.`
                            : ' Nothing else references it.';
                    return (
                        <ConfirmModal
                            title={`Delete “${deleteTarget.label}”?`}
                            message={`This removes the file.${impact}`}
                            confirmLabel="Delete"
                            danger
                            onConfirm={() =>
                                deleteItem(
                                    deleteTarget.section,
                                    deleteTarget.id
                                )
                            }
                            onCancel={() => setDeleteTarget(null)}
                        />
                    );
                })()}
            {flagVarTarget && (
                <FlagVarRenameModal
                    kind={flagVarTarget.kind}
                    oldId={flagVarTarget.id}
                    usageCount={
                        referenceIndex?.count(
                            flagVarTarget.kind === 'flag'
                                ? 'flags'
                                : 'variables',
                            flagVarTarget.id
                        ) ?? 0
                    }
                    onRename={(newId) => {
                        renameFlagVariable(
                            flagVarTarget.kind,
                            flagVarTarget.id,
                            newId
                        );
                        setFlagVarTarget(null);
                    }}
                    onCancel={() => setFlagVarTarget(null)}
                />
            )}
            {showPalette && (
                <CommandPalette
                    commands={paletteCommands}
                    onClose={() => setShowPalette(false)}
                />
            )}
        </div>
    );
}
