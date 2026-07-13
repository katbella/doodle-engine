import type { EngineInfo } from '../../../shared/project';
import { TriangleAlert } from '../lib/icons';

/**
 * Warns when the opened project's dependencies aren't installed — Build and
 * preview both run the project's own Vite, which needs them. Offers to run the
 * install from inside Studio (its output streams to the Build log) so a writer
 * never has to open a terminal, while still naming the manual command for anyone
 * who prefers it.
 */
export function EngineBanner({
    engine,
    installing,
    onInstall,
}: {
    engine: EngineInfo;
    installing: boolean;
    onInstall: () => void;
}) {
    if (engine.depsInstalled) return null;
    return (
        <div className="banner">
            <TriangleAlert className="banner__icon" size={15} aria-hidden />
            <span>
                This project's dependencies aren't installed, so Build and
                preview won't run yet.
            </span>
            <button
                className="btn btn--accent banner__action"
                onClick={onInstall}
                disabled={installing}
            >
                {installing ? (
                    <>
                        <span className="spinner spinner--sm" /> Installing…
                    </>
                ) : (
                    'Install dependencies'
                )}
            </button>
            <span className="banner__hint">
                or run{' '}
                <span className="mono">{engine.packageManager} install</span> in
                the project folder
            </span>
        </div>
    );
}
