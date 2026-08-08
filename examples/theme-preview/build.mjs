import { buildProject } from '@doodle-engine/toolkit';

const result = await buildProject({
    projectDir: process.cwd(),
    onLog: (message) => console.log(message),
});

if (!result.ok) {
    console.log(result.errors);
    console.log('Build failed due to validation errors.');
    process.exit(1);
}

console.log('Build complete. Output in dist/');
