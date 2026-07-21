import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import type { DocumentService } from '../document-service';
import { FlagVarNotesService } from '../flag-var-notes-service';

function service(documentOverrides: Partial<DocumentService>) {
    const documents = documentOverrides as DocumentService;
    return { notes: new FlagVarNotesService(documents), documents };
}

describe('FlagVarNotesService', () => {
    it('treats a missing metadata file as empty optional notes', async () => {
        const { notes } = service({
            read: vi.fn(async () => {
                throw Object.assign(new Error('missing'), { code: 'ENOENT' });
            }),
        });
        await expect(notes.read('C:/story')).resolves.toEqual({
            status: 'available',
            notes: { flags: {}, variables: {} },
        });
    });

    it('reads string notes and ignores unrelated metadata', async () => {
        const { notes } = service({
            read: vi.fn(async () => ({
                content:
                    'flags:\n  metGuide: Met the guide.\n  count: 2\nvariables:\n  gold: Current coins.\nquests:\n  intro: Ignore me.\n',
                mtimeMs: 1,
            })),
        });
        await expect(notes.read('C:/story')).resolves.toEqual({
            status: 'available',
            notes: {
                flags: { metGuide: 'Met the guide.' },
                variables: { gold: 'Current coins.' },
            },
        });
    });

    it('marks malformed YAML unavailable instead of returning empty notes', async () => {
        const { notes } = service({
            read: vi.fn(async () => ({
                content: 'flags:\n  broken: [\n',
                mtimeMs: 1,
            })),
        });
        await expect(notes.read('C:/story')).resolves.toMatchObject({
            status: 'unavailable',
        });
    });

    it('never writes when the current file does not parse', async () => {
        const write = vi.fn(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        }));
        const { notes } = service({
            read: vi.fn(async () => ({
                content: 'flags:\n  broken: [\n',
                mtimeMs: 1,
            })),
            write,
        });
        await expect(
            notes.update('C:/story', 'flag', 'ready', 'Ready.')
        ).rejects.toThrow();
        expect(write).not.toHaveBeenCalled();
    });

    it('re-reads before an update and preserves hand-added entries', async () => {
        const read = vi
            .fn()
            .mockResolvedValueOnce({
                content: 'flags:\n  ready: Original.\n',
                mtimeMs: 1,
            })
            .mockResolvedValueOnce({
                content:
                    'flags:\n  ready: Original.\n  handAdded: Keep me.\nother:\n  owner: author\n',
                mtimeMs: 2,
            });
        const write = vi.fn<DocumentService['write']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 3,
        }));
        const { notes } = service({ read, write });

        await notes.read('C:/story');
        const result = await notes.update(
            'C:/story',
            'flag',
            'ready',
            'Updated.'
        );

        expect(result.flags).toEqual({
            ready: 'Updated.',
            handAdded: 'Keep me.',
        });
        const written = write.mock.calls[0][2];
        expect(parse(written)).toEqual({
            flags: { ready: 'Updated.', handAdded: 'Keep me.' },
            other: { owner: 'author' },
        });
    });

    it('moves a note without replacing an existing destination', async () => {
        const write = vi.fn(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        }));
        const { notes } = service({
            read: vi.fn(async () => ({
                content:
                    'flags:\n  oldName: Old note.\n  newName: Hand-added note.\n',
                mtimeMs: 1,
            })),
            write,
        });

        await expect(
            notes.move('C:/story', 'flag', 'oldName', 'newName')
        ).resolves.toEqual({
            flags: {
                oldName: 'Old note.',
                newName: 'Hand-added note.',
            },
            variables: {},
        });
        expect(write).not.toHaveBeenCalled();
    });
});
