/**
 * Types shared between the Electron main process and the renderer.
 *
 * These describe the data that crosses the IPC bridge, so both sides agree on
 * the shape. Everything here must be plain JSON (no Maps, no class instances),
 * because IPC serializes it.
 */

import type {
    AssetCategory,
    ContentRegistry,
    GameConfig,
} from '@doodle-engine/core';
import type { ValidationError, YamlEdit } from '@doodle-engine/toolkit';

export type { YamlEdit };

export type StudioAssetKind =
    | AssetCategory
    | 'shellImage'
    | 'shellMusic'
    | 'shellSound';

export type ThemeMode = 'dark' | 'light';

export type ScaffoldLocalizationMode = 'literal' | 'localized';

export type ThemeColor = 'blue' | 'red' | 'violet' | 'green' | 'pink' | 'gold';

export interface ThemeState {
    mode: ThemeMode;
    color: ThemeColor;
}

/** A line of streamed output from a build, install, or preview. */
export interface ProcessLog {
    line: string;
}

/** Which Doodle Engine version a project targets and whether deps are installed. */
export interface EngineInfo {
    /** Version range the project's package.json declares for @doodle-engine/core. */
    declared: string | null;
    /** Version actually installed in the project's node_modules, if present. */
    installed: string | null;
    /** True when the project's dependencies appear to be installed. */
    depsInstalled: boolean;
    /** The package manager the project uses, inferred from its lockfile. */
    packageManager: PackageManager;
}

/** A project the user has opened, loaded through the toolkit. */
export interface OpenProject {
    /** Absolute path to the project root. */
    projectDir: string;
    /** Display name (from package.json, else the folder name). */
    name: string;
    /** Project version from package.json, if any. */
    version: string | null;
    /** All parsed content. */
    registry: ContentRegistry;
    /** Game configuration (game.yaml). */
    config: GameConfig;
    /** Map of content id to its file path, relative to the project root. */
    files: Record<string, string>;
    /** All problems found on open: dialogue parse errors plus content validation. */
    problems: ValidationError[];
    /** Engine version the project targets and whether its deps are installed. */
    engine: EngineInfo;
}

/** An entry in the recent-projects list. */
export interface RecentProject {
    /** Absolute path to the project root. */
    path: string;
    /** Display name at the time it was opened. */
    name: string;
    /** ISO timestamp of the most recent open. */
    openedAt: string;
}

/** Options for scaffolding a new project from within Studio. */
export interface NewProjectOptions {
    /** Project (and folder) name. */
    name: string;
    /** Player-facing game title. */
    title: string;
    /** Optional player-facing game subtitle. */
    subtitle: string;
    /** Parent directory to create the project folder inside. */
    targetDir: string;
    /** Use the batteries-included renderer. */
    useDefaultRenderer: boolean;
    /** Include the styled starter CSS. */
    useStarterStyles: boolean;
    /** How starter content stores player-facing text. */
    localizationMode: ScaffoldLocalizationMode;
}

export interface ProjectDestinationStatus {
    available: boolean;
    message?: string;
}

/** Result of running a production build. */
export interface StudioBuildResult {
    /** True when the build finished; false when validation or Vite stopped it. */
    ok: boolean;
    /** True when the user cancelled the build before it finished. */
    cancelled: boolean;
    /** Wall-clock time the build took, in milliseconds. */
    durationMs: number;
    /** Validation problems that blocked the build (empty when ok). */
    errors: ValidationError[];
    /** Progress and error lines to show in the build log. */
    logs: string[];
    /** Absolute path to the output folder. */
    outDir: string;
    /** Files the build wrote, relative to the output folder. */
    outputFiles: string[];
}

/** Which package manager a project uses, inferred from its lockfile. */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/** Result of installing a project's dependencies. */
export interface InstallResult {
    /** True when the install finished with a zero exit code. */
    ok: boolean;
    /** The package manager that ran. */
    packageManager: PackageManager;
}

/** A running dev-server preview: the URL it serves and the port it took. */
export interface PreviewStatus {
    /** URL the dev server is listening on (opened in the external browser). */
    url: string;
    /** Port the server actually bound to (Vite may pick another if busy). */
    port: number;
}

/** A file's text and the modified time it was read at. */
export interface DocumentContent {
    content: string;
    mtimeMs: number;
}

/** Result of a save attempt. */
export interface WriteResult {
    /** True when the file was written. */
    ok: boolean;
    /** True when the file changed on disk since it was read (write refused). */
    conflict: boolean;
    /** True when the file was deleted outside Studio since it was read
     * (write refused; also a conflict). */
    missing?: boolean;
    /** Current modified time on disk (new time on success, disk time on conflict). */
    mtimeMs: number;
    /** On conflict, the current file contents on disk. */
    content?: string;
}

/** Handlers the renderer registers for native application-menu actions. */
export interface MenuHandlers {
    onNew: () => void;
    onOpen: () => void;
    onOpenRecent: (path: string) => void;
    onAbout: (version: string) => void;
    onThemeMode: (mode: ThemeMode) => void;
    onThemeColor: (color: ThemeColor) => void;
}

/** The API the preload bridge exposes to the renderer as window.studio. */
export interface StudioApi {
    /** Show a folder picker and open the chosen project. Null if cancelled. */
    openProject: () => Promise<OpenProject | null>;
    /** Open a project by an already-known path (e.g. from the recent list). */
    openProjectPath: (projectDir: string) => Promise<OpenProject | null>;
    /** Scaffold a new project and open it. */
    createProject: (options: NewProjectOptions) => Promise<OpenProject | null>;
    /** Check whether a new project folder can be created without overwriting files. */
    checkProjectDestination: (
        targetDir: string,
        name: string
    ) => Promise<ProjectDestinationStatus>;
    /** Show a folder picker and return the chosen directory, for New Project. */
    chooseDirectory: () => Promise<string | null>;
    /** The recent-projects list, most recent first. */
    listRecentProjects: () => Promise<RecentProject[]>;
    /** Forget one recent project without changing anything in its folder. */
    removeRecentProject: (projectDir: string) => Promise<RecentProject[]>;
    /** Reload and re-validate the project from disk (the Validate button). */
    revalidate: (projectDir: string) => Promise<OpenProject>;
    /** Read a project file's text and its modified time. */
    readDocument: (
        projectDir: string,
        relPath: string
    ) => Promise<DocumentContent>;
    /** Save a project file. Pass the mtime it was read at to detect conflicts. */
    writeDocument: (
        projectDir: string,
        relPath: string,
        content: string,
        expectedMtimeMs?: number
    ) => Promise<WriteResult>;
    /**
     * Save form edits to a YAML entity file, keeping its comments, key order,
     * and untouched keys. Pass the mtime it was read at to detect conflicts.
     */
    writeEntity: (
        projectDir: string,
        relPath: string,
        edits: YamlEdit[],
        expectedMtimeMs?: number
    ) => Promise<WriteResult>;
    /** Delete a project file. */
    deleteDocument: (projectDir: string, relPath: string) => Promise<void>;
    /** Rename a project file within the project. */
    renameDocument: (
        projectDir: string,
        fromRel: string,
        toRel: string
    ) => Promise<void>;
    /** Choose a file, copy it into the project's asset tree, and return its content value. */
    importAsset: (
        projectDir: string,
        kind: StudioAssetKind
    ) => Promise<string | null>;
    /** Read an image or audio asset as a data URL for a Studio preview. */
    readAssetDataUrl: (
        projectDir: string,
        kind: StudioAssetKind,
        value: string
    ) => Promise<string | null>;
    /** Save an unsaved-edits recovery buffer for a file. */
    saveRecovery: (
        projectDir: string,
        relPath: string,
        content: string
    ) => Promise<void>;
    /** Read a file's recovery buffer, or null if there is none. */
    readRecovery: (
        projectDir: string,
        relPath: string
    ) => Promise<string | null>;
    /** Clear a file's recovery buffer (after a successful save). */
    clearRecovery: (projectDir: string, relPath: string) => Promise<void>;
    /**
     * Run a production build of the given project in a separate process. Log
     * lines stream through onBuildLog while this runs; the promise resolves with
     * the final result.
     */
    build: (projectDir: string) => Promise<StudioBuildResult>;
    /** Cancel a build in progress (kills the build process). */
    cancelBuild: () => Promise<void>;
    /** Subscribe to streamed build log lines. Returns an unsubscribe. */
    onBuildLog: (callback: (dir: string, line: string) => void) => () => void;
    /** The package manager a project uses, inferred from its lockfile. */
    detectPackageManager: (projectDir: string) => Promise<PackageManager>;
    /**
     * Install the project's dependencies with its package manager. Output
     * streams through onInstallLog; the promise resolves when it finishes.
     */
    installDependencies: (projectDir: string) => Promise<InstallResult>;
    /** Subscribe to streamed dependency-install output. Returns an unsubscribe. */
    onInstallLog: (callback: (dir: string, line: string) => void) => () => void;
    /**
     * Start the project's dev server in a separate process and open it in the
     * default browser. Resolves with the URL and port, or null on failure.
     */
    startPreview: (projectDir: string) => Promise<PreviewStatus | null>;
    /** Open the running preview's URL in the browser again. */
    openPreview: () => Promise<void>;
    /** Stop the running dev-server preview. */
    stopPreview: () => Promise<void>;
    /** Subscribe to streamed dev-server log lines. Returns an unsubscribe. */
    onPreviewLog: (callback: (dir: string, line: string) => void) => () => void;
    /** Open a folder (or file) in the OS file manager. */
    openPath: (targetPath: string) => Promise<void>;
    openDocumentation: () => Promise<void>;
    /** Persist a renderer error in Studio's error log. */
    reportError: (details: {
        context: string;
        message: string;
        stack?: string;
    }) => void;
    /**
     * Subscribe to external changes to a project file (edited outside Studio).
     * The callback gets the file's project-relative path. Returns an unsubscribe.
     */
    onFileChanged: (callback: (relPath: string) => void) => () => void;
    setThemeMenuState: (state: ThemeState) => void;
    /** Set the renderer zoom factor for accessible UI scaling. */
    setZoomFactor: (factor: number) => void;
    /** Wire native application-menu actions. Returns an unsubscribe. */
    onMenu: (handlers: MenuHandlers) => () => void;
}
