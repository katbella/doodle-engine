import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    NewProjectOptions,
    OpenProject,
    PreviewStatus,
    RecentProject,
    StudioBuildResult,
} from '../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';
import { ReferenceIndex, type SymbolType } from '@doodle-engine/core';
import type { SectionKey, Tab } from './types';
import { buildSections } from './lib/sections';
import { locateFile, sectionFileKey } from './lib/paths';
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
    FolderOpen,
    FilePlus,
    FileText,
    Hammer,
    Check,
    Play,
    Monitor,
    Square,
    Sun,
    Moon,
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

export function App() {
    const [project, setProject] = useState<OpenProject | null>(null);
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [openError, setOpenError] = useState<string | null>(null);
    const [recent, setRecent] = useState<RecentProject[]>([]);
    const [showNewProject, setShowNewProject] = useState(false);
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
    const [theme, setTheme] = useState<'dark' | 'light'>(() =>
        localStorage.getItem('doodle-studio-theme') === 'light'
            ? 'light'
            : 'dark'
    );
    const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({});
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

    // The folder of the project on screen right now. Long-running work
    // (builds, installs) checks this when it finishes, so results from one
    // project never land in another that was opened in the meantime.
    const currentDirRef = useRef<string | null>(null);
    useEffect(() => {
        currentDirRef.current = project?.projectDir ?? null;
    }, [project]);

    const [railWidth, setRailWidth] = usePersistedSize(
        'doodle-studio-rail-w',
        236
    );
    const [rightWidth, setRightWidth] = usePersistedSize(
        'doodle-studio-right-w',
        260
    );
    const [dockHeight, setDockHeight] = usePersistedSize(
        'doodle-studio-dock-h',
        220
    );

    const referenceIndex = useMemo(
        () =>
            project
                ? new ReferenceIndex(
                      project.registry,
                      new Map(Object.entries(project.files)),
                      project.config
                  )
                : null,
        [project]
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
        localStorage.setItem('doodle-studio-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(
        () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
        []
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
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
                    setRecent(await window.studio.listRecentProjects());
                }
            } catch (error) {
                setOpenError(
                    error instanceof Error ? error.message : String(error)
                );
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
    const createProject = useCallback(
        (options: NewProjectOptions) => {
            setShowNewProject(false);
            return applyOpen(() => window.studio.createProject(options));
        },
        [applyOpen]
    );

    useEffect(
        () =>
            window.studio.onMenu({
                onNew: () => setShowNewProject(true),
                onOpen: () => openProject(),
                onOpenRecent: (path) => openRecent(path),
            }),
        [openProject, openRecent]
    );

    const markModified = useCallback((filePath: string) => {
        setStaleFiles((prev) =>
            prev.has(filePath) ? prev : new Set(prev).add(filePath)
        );
    }, []);

    const revalidate = useCallback(async () => {
        if (!project) return;
        setValidating(true);
        try {
            setProject(await window.studio.revalidate(project.projectDir));
            setStaleFiles(new Set());
        } finally {
            setValidating(false);
        }
    }, [project]);

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
                setProject(await window.studio.revalidate(dir));
            }
        } finally {
            setInstalling(false);
        }
    }, [project, installing]);

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
            setProject(await window.studio.revalidate(project.projectDir));
            const label = section === 'dialogues' ? `${id}.dlg` : id;
            openItem(section, id, label);
        },
        [project, openItem]
    );

    const openProblem = useCallback(
        (problem: ValidationError) => {
            const loc = locateFile(problem.file);
            if (!loc) return;
            const label =
                loc.section === 'dialogues' ? `${loc.itemId}.dlg` : loc.itemId;
            openItem(loc.section, loc.itemId, label);
            const key = `${loc.section}:${loc.itemId}`;
            setViewMode(key, 'source');
            setReveal((prev) => ({
                key,
                message: problem.message,
                seq: (prev?.seq ?? 0) + 1,
            }));
        },
        [openItem, setViewMode]
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
            setProject(await window.studio.revalidate(project.projectDir));
        },
        [project, closeTab]
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
            const fresh = await window.studio.revalidate(dir);
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
            setProject(await window.studio.revalidate(dir));
            const label = section === 'dialogues' ? `${newId}.dlg` : newId;
            openItem(section, newId, label);
        },
        [project, closeTab, openItem, applyRenamePlan]
    );

    const renameFlagVariable = useCallback(
        async (kind: 'flag' | 'variable', oldId: string, newId: string) => {
            if (!project || oldId === newId) return;
            const dir = project.projectDir;
            const fresh = await window.studio.revalidate(dir);
            setProject(fresh);
            const plan = planFlagVariableRename(
                fresh.registry,
                kind,
                oldId,
                newId,
                fresh.config
            );
            await applyRenamePlan(dir, fresh, plan, { kind }, oldId, newId);
            setProject(await window.studio.revalidate(dir));
        },
        [project, applyRenamePlan]
    );

    if (!project) {
        return (
            <div className="app">
                <Welcome
                    onOpen={openProject}
                    onNew={() => setShowNewProject(true)}
                    onOpenRecent={openRecent}
                    recent={recent}
                    loading={loading}
                    error={openError}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
                {showNewProject && (
                    <NewProjectModal
                        onCreate={createProject}
                        onCancel={() => setShowNewProject(false)}
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
            run: () => setShowNewProject(true),
        },
        ...(canBuild
            ? [
                  {
                      id: 'act:validate',
                      label: 'Validate',
                      group: 'Actions',
                      keywords: 'problems check errors',
                      icon: <Check size={15} />,
                      run: () => revalidate(),
                  },
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
            id: 'act:theme',
            label:
                theme === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode',
            group: 'Actions',
            keywords: 'theme dark light appearance',
            icon: theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />,
            run: toggleTheme,
        },
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
    const paletteCommands = [...actionCommands, ...fileCommands];

    // Every flag and variable key used anywhere, with its usage count.
    const flags = referenceIndex
        ? referenceIndex.allSymbols('flags').map((id) => ({
              id,
              count: referenceIndex.count('flags', id),
          }))
        : [];
    const variables = referenceIndex
        ? referenceIndex.allSymbols('variables').map((id) => ({
              id,
              count: referenceIndex.count('variables', id),
          }))
        : [];

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
                    onOpen={openProject}
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
                    theme={theme}
                    onToggleTheme={toggleTheme}
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
                    dirtyTabs={dirtyTabs}
                    staleFiles={staleFiles}
                    reveal={reveal}
                    onSelect={setActiveKey}
                    onClose={closeTab}
                    onSetViewMode={setViewMode}
                    onDirty={handleDirty}
                    onModified={markModified}
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
                    activeTab={activeTab}
                    referenceIndex={referenceIndex}
                    onOpenFile={(file) => {
                        const loc = locateFile(file);
                        if (!loc) return;
                        const label =
                            loc.section === 'dialogues'
                                ? `${loc.itemId}.dlg`
                                : loc.itemId;
                        openItem(loc.section, loc.itemId, label);
                    }}
                />
            </div>
            <ResizeHandle
                axis="y"
                size={dockHeight}
                min={120}
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
                previewLog={previewLog}
                onOpenProblem={openProblem}
                flags={flags}
                variables={variables}
                onRenameFlagVar={(kind, id) => setFlagVarTarget({ kind, id })}
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
                            ? ` ${n} place${n === 1 ? '' : 's'} reference it — those will show as problems until you fix them.`
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
