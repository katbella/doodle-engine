import { parse, stringify } from 'yaml';
import type {
    FlagVarNoteKind,
    FlagVarNotes,
    FlagVarNotesReadResult,
} from '../shared/project';
import { DocumentService } from './document-service';

const NOTES_PATH = 'metadata/flags-and-vars.yaml';

function emptyNotes(): FlagVarNotes {
    return { flags: {}, variables: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function noteMap(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(
                (entry): entry is [string, string] =>
                    typeof entry[1] === 'string'
            )
            .sort(([a], [b]) => a.localeCompare(b))
    );
}

type LoadedNotes =
    | {
          status: 'available';
          notes: FlagVarNotes;
          root: Record<string, unknown>;
          mtimeMs?: number;
      }
    | { status: 'unavailable'; message: string };

function unavailable(error: unknown): LoadedNotes {
    return {
        status: 'unavailable',
        message: error instanceof Error ? error.message : String(error),
    };
}

function sectionFor(kind: FlagVarNoteKind): keyof FlagVarNotes {
    return kind === 'flag' ? 'flags' : 'variables';
}

/** Reads and writes optional Studio annotations without involving the loader. */
export class FlagVarNotesService {
    constructor(private readonly documents: DocumentService) {}

    private async load(projectDir: string): Promise<LoadedNotes> {
        let source: string;
        try {
            const document = await this.documents.read(projectDir, NOTES_PATH);
            source = document.content;
            const loaded = this.parse(source);
            if (loaded.status === 'available') {
                loaded.mtimeMs = document.mtimeMs;
            }
            return loaded;
        } catch (error) {
            if (
                error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'ENOENT'
            ) {
                return {
                    status: 'available',
                    notes: emptyNotes(),
                    root: {},
                };
            }
            return unavailable(error);
        }
    }

    private parse(source: string): LoadedNotes {
        let parsed: unknown;
        try {
            parsed = parse(source);
        } catch (error) {
            return unavailable(error);
        }

        if (parsed == null) parsed = {};
        if (!isRecord(parsed)) {
            return unavailable(
                new Error('Notes metadata must contain a YAML mapping.')
            );
        }
        for (const section of ['flags', 'variables'] as const) {
            if (parsed[section] !== undefined && !isRecord(parsed[section])) {
                return unavailable(
                    new Error(`Notes metadata '${section}' must be a mapping.`)
                );
            }
        }

        const root = parsed;
        return {
            status: 'available',
            notes: {
                flags: noteMap(root.flags),
                variables: noteMap(root.variables),
            },
            root,
        };
    }

    async read(projectDir: string): Promise<FlagVarNotesReadResult> {
        const loaded = await this.load(projectDir);
        return loaded.status === 'available'
            ? { status: 'available', notes: loaded.notes }
            : loaded;
    }

    private async save(
        projectDir: string,
        root: Record<string, unknown>,
        expectedMtimeMs?: number
    ): Promise<FlagVarNotes> {
        const content = stringify(root, { lineWidth: 0 });
        const result = await this.documents.write(
            projectDir,
            NOTES_PATH,
            content,
            expectedMtimeMs
        );
        if (!result.ok) {
            throw new Error(
                'Notes changed on disk while Studio was saving. Validate and try again.'
            );
        }
        return {
            flags: noteMap(root.flags),
            variables: noteMap(root.variables),
        };
    }

    async update(
        projectDir: string,
        kind: FlagVarNoteKind,
        id: string,
        note: string
    ): Promise<FlagVarNotes> {
        const loaded = await this.load(projectDir);
        if (loaded.status === 'unavailable') {
            throw new Error(loaded.message);
        }
        const section = sectionFor(kind);
        const values = { ...(loaded.root[section] as Record<string, unknown>) };
        const trimmed = note.trim();
        if (trimmed) values[id] = trimmed;
        else delete values[id];
        return this.save(
            projectDir,
            { ...loaded.root, [section]: values },
            loaded.mtimeMs
        );
    }

    async move(
        projectDir: string,
        kind: FlagVarNoteKind,
        from: string,
        to: string
    ): Promise<FlagVarNotes> {
        const loaded = await this.load(projectDir);
        if (loaded.status === 'unavailable') {
            throw new Error(loaded.message);
        }
        const section = sectionFor(kind);
        const values = { ...(loaded.root[section] as Record<string, unknown>) };
        if (
            from === to ||
            typeof values[from] !== 'string' ||
            Object.prototype.hasOwnProperty.call(values, to)
        ) {
            return loaded.notes;
        }
        values[to] = values[from];
        delete values[from];
        return this.save(
            projectDir,
            { ...loaded.root, [section]: values },
            loaded.mtimeMs
        );
    }
}
