import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const child = spawn(command, ['test:e2e:run', 'studio.e2e.ts'], {
    cwd: process.cwd(),
    env: {
        ...process.env,
        DOODLE_CAPTURE_STUDIO_TOUR: '1',
    },
    stdio: 'inherit',
});

child.on('error', (error) => {
    console.error(error);
    process.exitCode = 1;
});

child.on('exit', (code, signal) => {
    if (signal) {
        console.error(`Visual tour stopped by ${signal}.`);
        process.exitCode = 1;
        return;
    }
    process.exitCode = code ?? 1;
});
