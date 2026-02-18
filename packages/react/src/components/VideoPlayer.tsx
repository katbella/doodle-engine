/**
 * VideoPlayer - Fullscreen video/cutscene overlay
 *
 * Plays a video file fullscreen. Supports skip via click or keypress.
 * Calls onComplete when the video ends or is skipped.
 */

import { useEffect, useRef } from "react";

export interface VideoPlayerProps {
  /** Video file path */
  src: string;
  /** Base path for video files */
  basePath?: string;
  /** Called when video ends or is skipped */
  onComplete: () => void;
  /** CSS class */
  className?: string;
}

export function VideoPlayer({
  src,
  basePath = "/video",
  onComplete,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onComplete]);

  return (
    <div className={`video-player-overlay ${className}`}>
      <video
        ref={videoRef}
        src={`${basePath}/${src}`}
        autoPlay
        onEnded={onComplete}
        className="video-player-video"
      />
      <button className="video-player-skip-button" onClick={onComplete}>
        Skip
      </button>
    </div>
  );
}
