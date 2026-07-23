// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
    OpenProject,
    StudioBuildResult,
} from '../../../../shared/project';
import { BottomDock, type DockTab } from '../BottomDock';

afterEach(cleanup);

function project(problems: OpenProject['problems'] = []): OpenProject {
    return {
        projectDir: 'C:/story',
        name: 'Story',
        version: '1.0.0',
        registry: {
            locations: {},
            characters: {},
            items: {},
            maps: {},
            dialogues: {},
            quests: {},
            journalEntries: {},
            interludes: {},
            locales: {},
        },
        config: {
            startLocation: '',
            startTime: { day: 1, hour: 8 },
            startFlags: {},
            startVariables: {},
            startInventory: [],
        },
        files: {},
        problems,
        engine: {
            declared: 'workspace:*',
            installed: '0.1.3',
            depsInstalled: true,
            packageManager: 'yarn',
        },
    };
}

function props(activeTab: DockTab, overrides: Record<string, unknown> = {}) {
    return {
        project: project(),
        activeTab,
        onTabChange: vi.fn(),
        building: false,
        buildResult: null,
        buildLog: [],
        installing: false,
        installLog: [],
        onCancelBuild: vi.fn(),
        onRebuild: vi.fn(),
        onOpenOutput: vi.fn(),
        preview: null,
        previewBusy: false,
        previewLog: [],
        onOpenProblem: vi.fn(),
        lastValidatedAt: null,
        lastSavedAt: null,
        playtestStart: null,
        ...overrides,
    };
}

describe('BottomDock', () => {
    it('switches tabs and opens validation problems', async () => {
        const onTabChange = vi.fn();
        const onOpenProblem = vi.fn();
        const problem = {
            file: 'content/game.yaml',
            message: 'Missing start location',
            severity: 'error' as const,
        };
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText');
        render(
            <BottomDock
                {...props('problems', {
                    project: project([problem]),
                    onTabChange,
                    onOpenProblem,
                })}
            />
        );
        await user.click(
            screen.getByRole('button', { name: /Missing start location/ })
        );
        expect(onOpenProblem).toHaveBeenCalledWith(problem);
        await user.click(screen.getByRole('button', { name: 'Copy problem' }));
        expect(writeText).toHaveBeenCalledWith(
            'content/game.yaml: Missing start location'
        );
        expect(
            screen.getByRole('button', { name: 'Problem copied' })
        ).toBeTruthy();
    });

    it('shows idle, installing, active, successful, failed, and cancelled builds', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<BottomDock {...props('build')} />);
        expect(screen.getByText('Build output will appear here.')).toBeTruthy();

        rerender(
            <BottomDock
                {...props('build', {
                    installing: true,
                    installLog: ['Resolving packages'],
                })}
            />
        );
        expect(screen.getByText('Installing dependencies…')).toBeTruthy();
        expect(screen.getByText('Resolving packages')).toBeTruthy();

        const onCancelBuild = vi.fn();
        rerender(
            <BottomDock
                {...props('build', {
                    building: true,
                    buildLog: ['Bundling'],
                    onCancelBuild,
                })}
            />
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancelBuild).toHaveBeenCalledOnce();
        expect(screen.getByText('Bundling')).toBeTruthy();

        const success: StudioBuildResult = {
            ok: true,
            cancelled: false,
            durationMs: 125,
            errors: [],
            logs: ['Built'],
            outDir: 'C:/story/dist',
            outputFiles: ['index.html', 'assets/app.js'],
        };
        const onOpenOutput = vi.fn();
        const onRebuild = vi.fn();
        rerender(
            <BottomDock
                {...props('build', {
                    buildResult: success,
                    onOpenOutput,
                    onRebuild,
                })}
            />
        );
        expect(screen.getByText('Build complete in 125 ms')).toBeTruthy();
        expect(screen.getByText(/Generated files \(2\)/)).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Open output folder' })
        );
        await user.click(screen.getByRole('button', { name: 'Rebuild' }));
        expect(onOpenOutput).toHaveBeenCalledOnce();
        expect(onRebuild).toHaveBeenCalledOnce();

        rerender(
            <BottomDock
                {...props('build', {
                    buildResult: {
                        ...success,
                        ok: false,
                        outputFiles: [],
                        errors: [
                            { file: 'src/main.ts', message: 'Syntax error' },
                        ],
                    },
                })}
            />
        );
        expect(screen.getByText('Build failed')).toBeTruthy();
        expect(screen.getByText('src/main.ts: Syntax error')).toBeTruthy();

        rerender(
            <BottomDock
                {...props('build', {
                    buildResult: {
                        ...success,
                        ok: false,
                        cancelled: true,
                        outputFiles: [],
                    },
                })}
            />
        );
        expect(screen.getByText('Build cancelled')).toBeTruthy();
    });

    it('shows utilities and timestamps in the status area', async () => {
        const openDocumentation = vi.fn(async () => {});
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { openDocumentation },
        });
        const user = userEvent.setup();
        const onTabChange = vi.fn();
        render(
            <BottomDock
                {...props('problems', {
                    onTabChange,
                    lastValidatedAt: new Date(2026, 6, 18, 9, 41),
                    lastSavedAt: new Date(2026, 6, 18, 9, 42),
                    preview: {
                        url: 'http://localhost:4173',
                        port: 4173,
                        projectDir: 'C:/story',
                    },
                })}
            />
        );

        expect(screen.getByText(/^validated /).textContent).toContain('9:41');
        expect(screen.getByText(/^saved /).textContent).toContain('9:42');

        await user.click(
            screen.getByRole('button', {
                name: 'Open Doodle Studio documentation',
            })
        );
        expect(openDocumentation).toHaveBeenCalledOnce();

        await user.click(
            screen.getByTitle('Dev server running at http://localhost:4173')
        );
        expect(onTabChange).toHaveBeenCalledWith('devserver');
    });

    it('shows dev-server state and opens the real preview boundary', async () => {
        const openPreview = vi.fn(async () => {});
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { openPreview },
        });
        const user = userEvent.setup();
        const { rerender } = render(<BottomDock {...props('devserver')} />);
        expect(screen.getByText(/No dev server running/)).toBeTruthy();

        rerender(<BottomDock {...props('devserver', { previewBusy: true })} />);
        expect(screen.getByText('Starting the dev server…')).toBeTruthy();
        expect(screen.queryByText(/No dev server running/)).toBeNull();

        rerender(
            <BottomDock
                {...props('devserver', {
                    preview: {
                        url: 'http://localhost:4173',
                        projectDir: 'C:/story',
                    },
                    previewLog: ['Ready'],
                })}
            />
        );
        await user.click(
            screen.getByRole('link', { name: 'http://localhost:4173' })
        );
        expect(openPreview).toHaveBeenCalledOnce();
        expect(screen.getByText('Ready')).toBeTruthy();
    });
});
