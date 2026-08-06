export interface RendererScalingOptions {
    enabled: boolean;
    /** Empty space, in CSS pixels, kept around the scaled stage. */
    margin?: number;
}

/**
 * Fits `.game-shell` into the viewport while preserving the theme's authored
 * aspect ratio. The stage dimensions stay customizable in CSS through
 * `--doodle-stage-width` and `--doodle-stage-height`.
 */
export function enableRendererScaling({
    enabled,
    margin = 24,
}: RendererScalingOptions): () => void {
    if (!enabled) return () => undefined;

    let frame = 0;

    const apply = () => {
        frame = 0;
        const shell = document.querySelector<HTMLElement>('.game-shell');
        if (!shell) return;

        const styles = getComputedStyle(shell);
        const width = cssPixels(styles, '--doodle-stage-width', 1920);
        const height = cssPixels(styles, '--doodle-stage-height', 1080);
        const availableWidth = Math.max(1, window.innerWidth - margin);
        const availableHeight = Math.max(1, window.innerHeight - margin);
        const scale = Math.min(
            availableWidth / width,
            availableHeight / height
        );

        shell.style.position = 'fixed';
        shell.style.left = '50%';
        shell.style.top = '50%';
        shell.style.width = `${width}px`;
        shell.style.height = `${height}px`;
        shell.style.transformOrigin = 'center center';
        shell.style.transform = `translate(-50%, -50%) scale(${scale})`;
        document.documentElement.style.setProperty(
            '--doodle-stage-scale',
            String(scale)
        );
    };

    const schedule = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(apply);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById('root') ?? document.body, {
        childList: true,
        subtree: true,
    });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
        if (frame) cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener('resize', schedule);
        document.documentElement.style.removeProperty('--doodle-stage-scale');
    };
}

function cssPixels(
    styles: CSSStyleDeclaration,
    property: string,
    fallback: number
): number {
    const value = Number.parseFloat(styles.getPropertyValue(property));
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
