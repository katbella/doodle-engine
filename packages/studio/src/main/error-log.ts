import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export class ErrorLog {
    private pending: Promise<void> = Promise.resolve();

    constructor(readonly path: string) {}

    initialize(): Promise<void> {
        return this.enqueue('');
    }

    write(context: string, error: unknown): Promise<void> {
        const timestamp = new Date().toISOString();
        return this.enqueue(
            `[${timestamp}] ${context}\n${formatError(error)}\n\n`
        );
    }

    private enqueue(content: string): Promise<void> {
        this.pending = this.pending
            .catch(() => {})
            .then(async () => {
                await mkdir(dirname(this.path), { recursive: true });
                await appendFile(this.path, content, 'utf-8');
            });
        return this.pending;
    }
}

function formatError(error: unknown): string {
    if (error instanceof Error) return error.stack ?? error.message;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error, null, 2);
    } catch {
        return String(error);
    }
}
