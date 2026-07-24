/**
 * LoadingScreen - Displayed while game assets are loading.
 */

import type { AssetLoadingState } from '@doodle-engine/core';
import { useAssetUrl } from '../hooks/useAsset';
import { screenBackgroundStyle } from './screenBackground';

export interface LoadingScreenProps {
    /** Asset loading state (from AssetProvider) */
    state: AssetLoadingState;
    /** Background image (from shell config), shown behind the progress UI */
    background?: string;
    /** Custom progress bar renderer */
    renderProgress?: (progress: number, phase: string) => React.ReactNode;
    /** Resolved UI strings; English defaults when absent. */
    ui?: Record<string, string>;
    /** Continue from the completed loading screen */
    onStart?: () => void;
    /** Label for the post-load continue button */
    startLabel?: string;
    /** CSS class */
    className?: string;
}

function phaseLabel(
    phase: AssetLoadingState['phase'],
    ui?: Record<string, string>
): string {
    switch (phase) {
        case 'loading-shell':
            return ui?.['ui.loading'] ?? 'Loading...';
        case 'loading-game':
            return ui?.['ui.loading_game_assets'] ?? 'Loading game assets...';
        case 'complete':
            return ui?.['ui.ready'] ?? 'Ready!';
        case 'error':
            return ui?.['ui.error_loading_assets'] ?? 'Error loading assets';
        default:
            return ui?.['ui.loading'] ?? 'Loading...';
    }
}

export function LoadingScreen({
    state,
    background,
    renderProgress,
    ui,
    onStart,
    startLabel = 'Start game',
    className = '',
}: LoadingScreenProps) {
    const backgroundUrl = useAssetUrl(background);
    const bgStyle = screenBackgroundStyle(backgroundUrl);

    const percent = Math.round(state.overallProgress * 100);
    const label = phaseLabel(state.phase, ui);

    return (
        <div className={`loading-screen ${className}`} style={bgStyle}>
            <div className="loading-screen-content">
                {state.phase !== 'complete' && (
                    <div className="loading-screen-spinner" />
                )}

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

                {state.phase === 'complete' && onStart && (
                    <button
                        className="title-button loading-screen-start"
                        type="button"
                        onClick={onStart}
                    >
                        {startLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
