import type { EngineInfo } from '../../../shared/project';
import { TriangleAlert } from '../lib/icons';

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
                Install project dependencies to enable Build and Preview.
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
        </div>
    );
}
