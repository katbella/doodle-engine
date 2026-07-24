/**
 * VideoPlayer - Fullscreen video/cutscene overlay
 *
 * Plays a video file fullscreen. Supports skip via click or keypress.
 * Calls onComplete when the video ends or is skipped.
 */

import { useRef } from 'react';
import { useInputAction, type InputCommand } from '../input/InputRouter';
import { useAssetUrl } from '../hooks/useAsset';

export interface VideoPlayerProps {
    /** Video file path (resolved by the engine) */
    src: string;
    /** Called when video ends or is skipped */
    onComplete: () => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    /** CSS class */
    className?: string;
}

export function shouldCompleteVideoFromInput(command: InputCommand): boolean {
    return (
        command === 'cancel' ||
        command === 'confirm' ||
        command === 'continue'
    );
}

export function VideoPlayer({
    src,
    onComplete,
    ui,
    className = '',
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoSrc = useAssetUrl(src);

    useInputAction(
        ({ command }) => {
            if (shouldCompleteVideoFromInput(command)) {
                onComplete();
                return true;
            }

            return false;
        },
        { priority: 300 }
    );

    return (
        <div className={`video-player-overlay ${className}`}>
            <video
                ref={videoRef}
                src={videoSrc}
                autoPlay
                onEnded={onComplete}
                className="video-player-video"
            />
            <button className="video-player-skip-button" onClick={onComplete}>
                {ui?.['ui.skip'] ?? 'Skip'}
            </button>
        </div>
    );
}
