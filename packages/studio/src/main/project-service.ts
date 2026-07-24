import { dialog } from 'electron';
import { basename, join } from 'path';
import { readFile, readdir } from 'fs/promises';
import {
    addRecentProject,
    pruneRecentProjects,
    removeRecentProject,
} from './recent-projects';
import { readEngineInfo } from './engine-info';
import type {
    NewProjectOptions,
    OpenProject,
    RecentProject,
} from '../shared/project';

/**
 * Owns everything the main process does with a project: opening, creating,
 * remembering recents, and re-validating on demand. Content loading and
 * validation go through @doodle-engine/toolkit, so Studio and the CLI stay in
 * lockstep. The toolkit is ESM-only and the main process is CommonJS, so it is
 * loaded with dynamic import.
 *
 * Validation runs only when asked (open, create, or the Validate button), never
 * automatically on file changes.
 */
export class ProjectService {
    constructor(
        private readonly recentFile: string,
        private readonly currentEngineVersion: string
    ) {}

    async chooseDirectory(title = 'Choose folder'): Promise<string | null> {
        const result = await dialog.showOpenDialog({
            title,
            properties: ['openDirectory', 'createDirectory'],
        });
        return result.canceled || result.filePaths.length === 0
            ? null
            : result.filePaths[0];
    }

    async open(): Promise<OpenProject | null> {
        const projectDir = await this.chooseDirectory('Open Doodle project');
        return projectDir ? this.openPath(projectDir) : null;
    }

    async openPath(projectDir: string): Promise<OpenProject> {
        const project = await this.load(projectDir);
        await this.remember(project);
        return project;
    }

    async create(options: NewProjectOptions): Promise<OpenProject> {
        const { createProject } = await import('@doodle-engine/toolkit');
        const { projectPath } = await createProject(options.name, {
            targetDir: options.targetDir,
            title: options.title,
            subtitle: options.subtitle,
            useDefaultRenderer: options.useDefaultRenderer,
            useStarterStyles: options.useStarterStyles,
            contentMode: options.contentMode,
            localizationMode: options.localizationMode,
        });
        return this.openPath(projectPath);
    }

    async checkDestination(
        targetDir: string,
        name: string
    ): Promise<{ available: boolean; message?: string }> {
        const trimmedName = name.trim();
        if (
            !trimmedName ||
            trimmedName === '.' ||
            trimmedName === '..' ||
            basename(trimmedName) !== trimmedName
        ) {
            return {
                available: false,
                message: 'Use a folder name without slashes.',
            };
        }

        const projectPath = join(targetDir, trimmedName);
        try {
            const entries = await readdir(projectPath);
            return entries.length === 0
                ? { available: true }
                : {
                      available: false,
                      message: `A non-empty folder named "${trimmedName}" already exists in this location. Choose another name or an empty folder.`,
                  };
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') return { available: true };
            if (code === 'ENOTDIR') {
                return {
                    available: false,
                    message: `A file named "${trimmedName}" already exists in this location. Choose another name.`,
                };
            }
            throw error;
        }
    }

    /** Reload and re-validate a project from disk (for the Validate button). */
    reload(projectDir: string): Promise<OpenProject> {
        return this.load(projectDir);
    }

    listRecent(): Promise<RecentProject[]> {
        return pruneRecentProjects(this.recentFile);
    }

    removeRecent(projectDir: string): Promise<RecentProject[]> {
        return removeRecentProject(this.recentFile, projectDir);
    }

    private async load(projectDir: string): Promise<OpenProject> {
        const { loadProject, validateContent } =
            await import('@doodle-engine/toolkit');
        const { registry, config, fileMap, parseErrors } =
            await loadProject(projectDir);
        const problems = [
            ...parseErrors,
            ...validateContent(registry, fileMap, config),
        ];
        const pkg = await this.readPackageJson(projectDir);

        return {
            projectDir,
            name:
                typeof pkg?.name === 'string' && pkg.name
                    ? pkg.name
                    : basename(projectDir),
            version: typeof pkg?.version === 'string' ? pkg.version : null,
            registry,
            config,
            files: Object.fromEntries(fileMap),
            problems,
            engine: await readEngineInfo(
                projectDir,
                this.currentEngineVersion
            ),
        };
    }

    private async remember(project: OpenProject): Promise<void> {
        await addRecentProject(this.recentFile, {
            path: project.projectDir,
            name: project.name,
            openedAt: new Date().toISOString(),
        });
    }

    private async readPackageJson(
        projectDir: string
    ): Promise<Record<string, unknown> | null> {
        try {
            return JSON.parse(
                await readFile(join(projectDir, 'package.json'), 'utf-8')
            );
        } catch {
            return null;
        }
    }
}
