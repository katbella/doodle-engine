/**
 * LoadingScreen - Displayed while game assets are loading.
 */

import type { AssetLoadingState } from '@doodle-engine/core';
import { screenBackgroundStyle } from './screenBackground';
import { uiText } from '../uiText';

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
            return uiText(ui, 'ui.loading');
        case 'loading-game':
            return uiText(ui, 'ui.loading_game_assets');
        case 'complete':
            return uiText(ui, 'ui.ready');
        case 'error':
            return uiText(ui, 'ui.error_loading_assets');
        default:
            return uiText(ui, 'ui.loading');
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
    const bgStyle = screenBackgroundStyle(background ?? '');

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
                                style={{
                                    transform: `scaleX(${Math.min(
                                        1,
                                        Math.max(0, state.overallProgress)
                                    )})`,
                                }}
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
                    <p className="loading-screen-message loading-screen-message--error">
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
