import { startDevServer } from '@doodle-engine/toolkit';

const server = await startDevServer({
    projectDir: process.cwd(),
    port: 3000,
    open: true,
    onContentChange: (path, kind) => {
        console.log(`content ${kind}: ${path}`);
    },
    onValidation: (errors) => {
        if (errors.length > 0) console.log(errors);
    },
    onError: (message, error) => {
        console.error(message, error);
    },
});

server.printUrls();
console.log('Watching content files for changes...');
