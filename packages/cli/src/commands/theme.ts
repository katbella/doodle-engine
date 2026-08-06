/** Switch the current project's managed renderer theme. */

import { crayon } from 'crayon.js';
import {
    RENDERER_TEMPLATES,
    isRendererTemplate,
    switchRendererTheme,
} from '@doodle-engine/toolkit';

export async function theme(templateName: string): Promise<void> {
    if (!isRendererTemplate(templateName)) {
        console.error(crayon.red(`Unknown renderer theme "${templateName}".`));
        console.log(`Available themes: ${RENDERER_TEMPLATES.join(', ')}`);
        process.exit(1);
        return;
    }

    try {
        const result = await switchRendererTheme(process.cwd(), templateName);
        console.log('');
        console.log(
            crayon.green(
                `Renderer theme changed from ${result.previousTemplate} to ${result.template}.`
            )
        );
        console.log(
            crayon.dim(
                'Project overrides in src/renderer-overrides.css were preserved.'
            )
        );
        if (result.dependenciesChanged) {
            console.log('');
            console.log(
                'Font dependencies changed. Run your package manager install command before previewing or building.'
            );
        }
        console.log('');
    } catch (error) {
        console.error(
            crayon.red('Theme switch failed:'),
            error instanceof Error ? error.message : error
        );
        process.exit(1);
    }
}
