import type { EngineInfo } from '../../../shared/project';

export function EngineBanner({ engine }: { engine: EngineInfo }) {
    if (engine.depsInstalled) return null;
    return (
        <div className="banner">
            <span className="banner__icon">⚠</span>
            <span>
                This project's dependencies aren't installed, so Build and
                preview won't run yet. Run{' '}
                <span className="mono">npm install</span> in the project folder.
            </span>
        </div>
    );
}
