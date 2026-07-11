import { useCallback, useEffect, useState } from 'react';
import type {
    NewProjectOptions,
    OpenProject,
    RecentProject,
    StudioBuildResult,
} from '../../shared/project';
import type { ValidationError } from '@doodle-engine/toolkit';
import type { SectionKey, Tab } from './types';
import { buildSections } from './lib/sections';
import { locateFile } from './lib/paths';
import { Welcome } from './shell/Welcome';
import { NewProjectModal } from './shell/NewProjectModal';
import { TopBar } from './shell/TopBar';
import { EngineBanner } from './shell/EngineBanner';
import { LeftRail } from './shell/LeftRail';
import { EditorArea, type ViewMode } from './shell/EditorArea';
import { RightPanel } from './shell/RightPanel';
import { BottomDock, type DockTab } from './shell/BottomDock';

export function App() {
    const [project, setProject] = useState<OpenProject | null>(null);
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [openError, setOpenError] = useState<string | null>(null);
    const [recent, setRecent] = useState<RecentProject[]>([]);
    const [showNewProject, setShowNewProject] = useState(false);
    const [dockTab, setDockTab] = useState<DockTab>('problems');
    const [building, setBuilding] = useState(false);
    const [buildResult, setBuildResult] = useState<StudioBuildResult | null>(
        null
    );
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
    const [staleFiles, setStaleFiles] = useState<Set<string>>(
        () => new Set()
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
        setDockTab('build');
        try {
            setBuildResult(await window.studio.build(project.projectDir));
        } finally {
            setBuilding(false);
        }
    }, [project, building]);

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

    const openProblem = useCallback(
        (problem: ValidationError) => {
            const loc = locateFile(problem.file);
            if (!loc) return;
            const label =
                loc.section === 'dialogues'
                    ? `${loc.itemId}.dlg`
                    : loc.itemId;
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

    return (
        <div className="app">
            <div className="app__header">
                <TopBar
                    project={project}
                    onOpen={openProject}
                    onValidate={revalidate}
                    validating={validating}
                    stale={staleFiles.size > 0}
                    onBuild={runBuild}
                    building={building}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
                <EngineBanner engine={project.engine} />
            </div>
            <div className="body">
                <LeftRail
                    sections={sections}
                    activeKey={activeKey}
                    onOpenItem={openItem}
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
                <RightPanel project={project} activeTab={activeTab} />
            </div>
            <BottomDock
                project={project}
                activeTab={dockTab}
                onTabChange={setDockTab}
                building={building}
                buildResult={buildResult}
                onOpenProblem={openProblem}
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
        </div>
    );
}
