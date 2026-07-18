import { dialog, type FileFilter } from 'electron';
import { copyFile, mkdir, readFile, realpath, stat } from 'fs/promises';
import { constants } from 'fs';
import { basename, extname, join, sep } from 'path';
import type { StudioAssetKind } from '../shared/project';

interface AssetDestination {
    directory: string;
    fullPath: boolean;
}

const DESTINATIONS: Record<StudioAssetKind, AssetDestination> = {
    portrait: { directory: 'assets/images/portraits', fullPath: false },
    banner: { directory: 'assets/images/banners', fullPath: false },
    item: { directory: 'assets/images/items', fullPath: false },
    map: { directory: 'assets/images/maps', fullPath: false },
    music: { directory: 'assets/audio/music', fullPath: false },
    ambient: { directory: 'assets/audio/sfx', fullPath: false },
    sfx: { directory: 'assets/audio/sfx', fullPath: false },
    voice: { directory: 'assets/audio/voice', fullPath: false },
    video: { directory: 'assets/video', fullPath: false },
    shellImage: { directory: 'assets/images/ui', fullPath: true },
    shellMusic: { directory: 'assets/audio/music', fullPath: true },
    shellSound: { directory: 'assets/audio/ui', fullPath: true },
};

const IMAGE_FILTER: FileFilter = {
    name: 'Images',
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif'],
};
const AUDIO_FILTER: FileFilter = {
    name: 'Audio',
    extensions: ['mp3', 'ogg', 'wav', 'm4a', 'aac', 'flac'],
};
const VIDEO_FILTER: FileFilter = {
    name: 'Video',
    extensions: ['mp4', 'webm', 'ogv', 'mov'],
};

const IMAGE_MIME: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
};

function filtersFor(kind: StudioAssetKind): FileFilter[] {
    if (
        kind === 'portrait' ||
        kind === 'banner' ||
        kind === 'item' ||
        kind === 'map' ||
        kind === 'shellImage'
    ) {
        return [IMAGE_FILTER];
    }
    if (kind === 'video') return [VIDEO_FILTER];
    return [AUDIO_FILTER];
}

export class AssetService {
    constructor(private readonly onWrite?: (absPath: string) => void) {}

    async chooseAndImport(
        projectDir: string,
        kind: StudioAssetKind
    ): Promise<string | null> {
        const result = await dialog.showOpenDialog({
            title: 'Choose asset',
            properties: ['openFile'],
            filters: filtersFor(kind),
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return this.import(projectDir, result.filePaths[0], kind);
    }

    async import(
        projectDir: string,
        sourcePath: string,
        kind: StudioAssetKind
    ): Promise<string> {
        const sourceInfo = await stat(sourcePath);
        if (!sourceInfo.isFile()) {
            throw new Error('The selected asset is not a file.');
        }

        const root = await realpath(projectDir);
        if (!Object.hasOwn(DESTINATIONS, kind)) {
            throw new Error(`Unsupported asset type: ${kind}`);
        }
        const destination = DESTINATIONS[kind];

        const directory = join(root, destination.directory);
        await mkdir(directory, { recursive: true });
        const directoryReal = await realpath(directory);
        if (directoryReal !== root && !directoryReal.startsWith(root + sep)) {
            throw new Error(
                'The asset directory resolves outside the project.'
            );
        }
        const sourceReal = await realpath(sourcePath);
        const originalName = basename(sourcePath);
        const extension = extname(originalName);
        const stem = originalName.slice(
            0,
            originalName.length - extension.length
        );

        for (let index = 1; ; index++) {
            const filename =
                index === 1 ? originalName : `${stem}-${index}${extension}`;
            const target = join(directoryReal, filename);
            const targetReal = await realpath(target).catch(() => null);
            if (targetReal === sourceReal) {
                return this.value(destination, filename);
            }

            try {
                await copyFile(sourceReal, target, constants.COPYFILE_EXCL);
                this.onWrite?.(target);
                return this.value(destination, filename);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    /** Read a project image for a Studio-only thumbnail without exposing fs.
     * The value is resolved the way the engine resolves assets: as a path
     * relative to the project root, with bare filenames falling back to the
     * kind's conventional directory. */
    async previewDataUrl(
        projectDir: string,
        kind: StudioAssetKind,
        value: string
    ): Promise<string | null> {
        if (!value || !Object.hasOwn(DESTINATIONS, kind)) return null;
        const destination = DESTINATIONS[kind];
        const hasPath = value.includes('/') || value.includes('\\');
        const relative = hasPath ? value : join(destination.directory, value);
        const mime = IMAGE_MIME[extname(relative).toLowerCase()];
        if (!mime) return null;

        try {
            const root = await realpath(projectDir);
            const target = await realpath(join(root, relative));
            if (target !== root && !target.startsWith(root + sep)) {
                return null;
            }
            const info = await stat(target);
            if (!info.isFile() || info.size > 15 * 1024 * 1024) return null;
            const encoded = (await readFile(target)).toString('base64');
            return `data:${mime};base64,${encoded}`;
        } catch {
            return null;
        }
    }

    private value(destination: AssetDestination, filename: string): string {
        return destination.fullPath
            ? `${destination.directory}/${filename}`
            : filename;
    }
}
