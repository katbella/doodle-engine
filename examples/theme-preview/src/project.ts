/**
 * Stable identity for this game. Keep it the same when renaming, moving, or
 * releasing updates to this project so players keep the same saves.
 */
export const PROJECT_ID = "4e320389-85ba-4868-950f-f0bf965902fb";

/**
 * Uniformly fit the authored game stage inside the browser viewport.
 * Set `enabled` to false to use the theme at its authored CSS size without
 * automatic scaling. Stage width and height come from the theme's
 * `--doodle-stage-width` and `--doodle-stage-height` variables.
 */
export const RENDERER_SCALING = {
    enabled: true,
    margin: 24,
} as const;
