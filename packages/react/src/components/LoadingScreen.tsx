/**
 * LoadingScreen - Displayed while game assets are loading.
 */

import type { AssetLoadingState } from '@doodle-engine/core';

export interface LoadingScreenProps {
    /** Asset loading state (from AssetProvider) */
    state: AssetLoadingState;
    /** Background image (from shell config) — shown behind the progress UI */
    background?: string;
    /** Custom progress bar renderer */
    renderProgress?: (progress: number, phase: string) => React.ReactNode;
    /** CSS class */
    className?: string;
}

function phaseLabel(phase: AssetLoadingState['phase']): string {
    switch (phase) {
        case 'loading-shell':
            return 'Loading...';
        case 'loading-game':
            return 'Loading game assets...';
        case 'complete':
            return 'Ready!';
        case 'error':
            return 'Error loading assets';
        default:
            return 'Loading...';
    }
}

export function LoadingScreen({
    state,
    background,
    renderProgress,
    className = '',
}: LoadingScreenProps) {
    const bgStyle = background
        ? { backgroundImage: `url(${background})` }
        : undefined;

    const percent = Math.round(state.overallProgress * 100);
    const label = phaseLabel(state.phase);

    return (
        <div className={`loading-screen ${className}`} style={bgStyle}>
            <div className="loading-screen-content">
                <div className="loading-screen-spinner" />

                <div className="loading-screen-progress-wrap">
                    <div className="loading-screen-row">
                        <span className="loading-screen-phase">{label}</span>
                        <span className="loading-screen-percent">
                            {percent}%
                        </span>
                    </div>

                    {renderProgress ? (
                        renderProgress(state.overallProgress, state.phase)
                    ) : (
                        <div className="loading-screen-bar-track">
                            <div
                                className="loading-screen-bar-fill"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    )}

                    {state.currentAsset && (
                        <div
                            className="loading-screen-asset"
                            title={state.currentAsset}
                        >
                            {state.currentAsset.split('/').pop()}
                        </div>
                    )}
                </div>

                {state.error && (
                    <p
                        className="loading-screen-message"
                        style={{ color: '#f87171' }}
                    >
                        {state.error}
                    </p>
                )}
            </div>
        </div>
    );
}
