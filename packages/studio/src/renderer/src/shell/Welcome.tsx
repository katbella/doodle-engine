import type { RecentProject } from '../../../shared/project';
import { Sun, Moon } from '../lib/icons';

export function Welcome({
    onOpen,
    onNew,
    onOpenRecent,
    recent,
    loading,
    error,
    theme,
    onToggleTheme,
}: {
    onOpen: () => void;
    onNew: () => void;
    onOpenRecent: (path: string) => void;
    recent: RecentProject[];
    loading: boolean;
    error: string | null;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
}) {
    return (
        <div className="welcome">
            <button
                className="btn btn--icon welcome__theme"
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
            <div className="welcome__mark">DS</div>
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
                    <div className="recent__label">Recent</div>
                    {recent.map((entry) => (
                        <button
                            key={entry.path}
                            className="recent__item"
                            onClick={() => onOpenRecent(entry.path)}
                        >
                            <span className="recent__name">{entry.name}</span>
                            <span className="recent__path mono">
                                {entry.path}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
