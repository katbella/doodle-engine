import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { RecoveryService } from '../recovery-service';

describe('RecoveryService', () => {
    it('saves, reads back, and clears a buffer per project+file', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-recovery-'));
        try {
            const svc = new RecoveryService(join(dir, 'recovery'));

            expect(await svc.read('/proj', 'content/a.dlg')).toBe(null);

            await svc.save('/proj', 'content/a.dlg', 'unsaved text');
            expect(await svc.read('/proj', 'content/a.dlg')).toBe(
                'unsaved text'
            );
            // A different file in the same project is independent.
            expect(await svc.read('/proj', 'content/b.dlg')).toBe(null);

            await svc.clear('/proj', 'content/a.dlg');
            expect(await svc.read('/proj', 'content/a.dlg')).toBe(null);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
