/**
 * Placeholder for the project's own renderer.
 *
 * Studio deliberately renders no game presentation itself — the game's look is
 * the project's CSS and React renderer. This tab is a labeled frame standing in
 * for where the project's dev server would be embedded, kept clearly separate
 * from behavior testing so the two are never confused.
 */
export function RendererPreview() {
    return (
        <div className="preview">
            <div className="preview__frame">
                <span className="preview__label">
                    The project's own renderer runs here — not part of Studio,
                    shown only as a frame.
                </span>
            </div>
        </div>
    );
}
