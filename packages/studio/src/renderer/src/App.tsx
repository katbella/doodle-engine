import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
    NewProjectOptions,
    OpenProject,
    PreviewStatus,
    RecentProject,
    StudioBuildResult,
} from '../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';
import { ReferenceIndex, type SymbolType } from '@doodle-engine/core';
import { applyDialogueEdits } from '@doodle-engine/core';
import type { SectionKey, Tab } from './types';
import { buildSections } from './lib/sections';
import { locateFile } from './lib/paths';
import {
    pathForNewItem,
    templateForNewItem,
    type CreatableSection,
} from './lib/new-content';
import {
    planRename,
    planFlagVariableRename,
    type RenamePlan,
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
import { usePersistedSize } from './lib/usePersistedSize';

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
        window.studio.listRecentProjects().then(setRecent);
    }, []);

    // Stream build and install output as it happens.
    useEffect(
        () =>
            window.studio.onBuildLog((line) =>
                setBuildLog((prev) => [...prev, line])
            ),
        []
    );
    useEffect(
        () =>
            window.studio.onInstallLog((line) =>
                setInstallLog((prev) => [...prev, line])
            ),
        []
    );
    useEffect(
        () =>
            window.studio.onPreviewLog((line) =>
                setPreviewLog((prev) => [...prev, line])
            ),
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
        setBuilding(true);
        setBuildLog([]);
        setBuildResult(null);
        setDockTab('build');
        try {
            setBuildResult(await window.studio.build(project.projectDir));
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
        setInstalling(true);
        setInstallLog([]);
        setDockTab('build');
        try {
            const result = await window.studio.installDependencies(
                project.projectDir
            );
            // Re-read the project so the "dependencies not installed" banner
            // clears and Build/Preview enable.
            if (result.ok)
                setProject(await window.studio.revalidate(project.projectDir));
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
            const relPath = project.files[id] ?? pathForNewItem(section, id);
            await window.studio.deleteDocument(project.projectDir, relPath);
            closeTab(`${section}:${id}`);
            setProject(await window.studio.revalidate(project.projectDir));
        },
        [project, closeTab]
    );

    // Apply a rename plan's reference edits (rewritten dialogues + YAML edits).
    // Shared by entity rename and flag/variable rename.
    const applyRenamePlan = useCallback(
        async (dir: string, plan: RenamePlan) => {
            for (const rewrite of plan.dialogueRewrites) {
                const relPath =
                    project?.files[rewrite.id] ??
                    pathForNewItem('dialogues', rewrite.id);
                const doc = await window.studio.readDocument(dir, relPath);
                const next = applyDialogueEdits(
                    doc.content,
                    rewrite.id,
                    rewrite.dialogue
                );
                await window.studio.writeDocument(dir, relPath, next);
            }
            for (const edit of plan.yamlEdits) {
                const relPath =
                    edit.id === 'game'
                        ? 'content/game.yaml'
                        : project?.files[edit.id];
                if (relPath)
                    await window.studio.writeEntity(dir, relPath, edit.edits);
            }
        },
        [project]
    );

    const renameItem = useCallback(
        async (section: CreatableSection, oldId: string, newId: string) => {
            if (!project || oldId === newId) return;
            setRenameTarget(null);
            const dir = project.projectDir;
            const plan = planRename(project.registry, section, oldId, newId);
            await applyRenamePlan(dir, plan);

            // Rename the file, and set the new id inside it for YAML entities
            // (a dialogue's id is its filename, so the move covers it).
            const oldPath =
                project.files[oldId] ?? pathForNewItem(section, oldId);
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
            const plan = planFlagVariableRename(
                project.registry,
                kind,
                oldId,
                newId,
                project.config
            );
            await applyRenamePlan(project.projectDir, plan);
            setProject(await window.studio.revalidate(project.projectDir));
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
        </div>
    );
}
