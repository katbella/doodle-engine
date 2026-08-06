/**
 * Stable identity for this game. Keep it the same when renaming, moving, or
 * releasing updates to this project so players keep the same saves.
 */
export const PROJECT_ID = __PROJECT_ID_JSON__;

/**
 * Uniformly fit the authored game stage inside the browser viewport.
 * Set `enabled` to false to use the theme at its authored CSS size without
 * automatic scaling. Stage width and height come from the theme's
 * `--doodle-stage-width` and `--doodle-stage-height` variables.
 */
export const RENDERER_SCALING = {
    enabled: __RENDERER_SCALING_ENABLED__,
    margin: 24,
} as const;
