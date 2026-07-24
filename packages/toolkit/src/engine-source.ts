import { join } from 'path';

export function engineSourceAliases(engineRoot: string) {
    return [
        {
            find: /^@doodle-engine\/react\/style\.css$/,
            replacement: join(
                engineRoot,
                'packages/react/src/styles/shell.css'
            ),
        },
        {
            find: /^@doodle-engine\/react$/,
            replacement: join(engineRoot, 'packages/react/src/index.ts'),
        },
        {
            find: /^@doodle-engine\/core$/,
            replacement: join(engineRoot, 'packages/core/src/index.ts'),
        },
    ];
}
