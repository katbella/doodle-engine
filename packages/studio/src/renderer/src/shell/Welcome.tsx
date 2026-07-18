import type { RecentProject } from '../../../shared/project';
import { Sun, Moon, CircleHelp, X } from '../lib/icons';

export function Welcome({
    onOpen,
    onNew,
    onOpenRecent,
    onRemoveRecent,
    recent,
    loading,
    error,
    theme,
    onToggleTheme,
}: {
    onOpen: () => void;
    onNew: () => void;
    onOpenRecent: (path: string) => void;
    onRemoveRecent: (path: string) => void;
    recent: RecentProject[];
    loading: boolean;
    error: string | null;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
}) {
    return (
        <div className="welcome">
            <div className="welcome__tools">
                <button
                    className="btn btn--icon"
                    onClick={() => void window.studio.openDocumentation()}
                    aria-label="Open Doodle Studio documentation"
                    title="Open Doodle Studio documentation"
                >
                    <CircleHelp size={16} />
                </button>
                <button
                    className="btn btn--icon"
                    onClick={onToggleTheme}
                    aria-label={
                        theme === 'dark'
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    }
                    title={
                        theme === 'dark'
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    }
                >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </div>
            <div className="welcome__mark" aria-hidden="true">
                <img
                    className="welcome__mark-image"
                    src="./apple-touch-icon.png"
                    alt=""
                />
            </div>
            <div className="welcome__title">Doodle Studio</div>
            <div className="welcome__sub">
                Open or create a Doodle project to browse and edit its
                dialogues, characters, locations, quests, and more.
            </div>

            {loading ? (
                <div className="welcome__loading">
                    <span className="spinner" />
                    Reading project…
                </div>
            ) : (
                <div className="welcome__actions">
                    <button className="btn btn--accent" onClick={onOpen}>
                        Open project…
                    </button>
                    <button className="btn" onClick={onNew}>
                        New project…
                    </button>
                </div>
            )}

            {error && !loading && (
                <div className="welcome__error">
                    Couldn’t open project: {error}
                </div>
            )}

            {recent.length > 0 && !loading && (
                <div className="recent">
                    <div className="recent__label">Recent Projects</div>
                    <div
                        className="recent__list scroll"
                        role="region"
                        aria-label="Recent projects"
                    >
                        {recent.map((entry) => (
                            <div key={entry.path} className="recent__item">
                                <button
                                    className="recent__open"
                                    aria-label={`Open recent project ${entry.name}`}
                                    onClick={() => onOpenRecent(entry.path)}
                                >
                                    <span className="recent__name">
                                        {entry.name}
                                    </span>
                                    <span
                                        className="recent__path mono"
                                        title={entry.path}
                                    >
                                        <RecentPath path={entry.path} />
                                    </span>
                                </button>
                                <button
                                    className="recent__remove"
                                    aria-label={`Remove ${entry.name} from recent projects`}
                                    title="Remove from recent projects"
                                    onClick={() => onRemoveRecent(entry.path)}
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function RecentPath({ path }: { path: string }) {
    const normalized = path.replace(/\\/g, '/');
    const slash = normalized.lastIndexOf('/');
    return (
        <>
            <span className="recent__path-dir">
                {slash >= 0 ? normalized.slice(0, slash + 1) : ''}
            </span>
            <span className="recent__path-name">
                {slash >= 0 ? normalized.slice(slash + 1) : normalized}
            </span>
        </>
    );
}
