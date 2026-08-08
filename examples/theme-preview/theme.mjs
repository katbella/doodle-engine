import { switchRendererTheme, isRendererTemplate, RENDERER_TEMPLATES } from '@doodle-engine/toolkit';

const name = process.argv[2];

if (!isRendererTemplate(name)) {
    console.error(`Unknown renderer theme "${name}".`);
    console.log(`Available themes: ${RENDERER_TEMPLATES.join(', ')}`);
    process.exit(1);
}

const result = await switchRendererTheme(process.cwd(), name);
console.log(`Renderer theme changed from ${result.previousTemplate} to ${result.template}.`);
if (result.dependenciesChanged) {
    console.log('Font dependencies changed. Run npm install before previewing or building.');
}
