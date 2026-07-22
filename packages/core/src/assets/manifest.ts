/**
 * Asset path extraction for manifest generation.
 * Used by CLI at build time.
 */

import type { ContentRegistry } from '../types/registry';
import type { GameConfig } from '../types/entities';
import { resolveAssetPath } from './paths';
import type { Effect } from '../types/effects';

/**
 * Determine asset type from file extension.
 */
export function getAssetType(path: string): 'image' | 'audio' | 'video' {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) {
        return 'image';
    }
    if (['mp4', 'webm', 'ogv', 'mov'].includes(ext)) {
        return 'video';
    }
    return 'audio';
}

/**
 * Extract all asset paths from a content registry and game config.
 * Shell assets come first (tier 1). Game assets are tier 2.
 * Paths are deduplicated. Shell assets are never duplicated in game.
 */
export function extractAssetPaths(
    registry: ContentRegistry,
    config: GameConfig
): { shell: string[]; game: string[] } {
    const shell: Set<string> = new Set();
    const game: Set<string> = new Set();

    const addShell = (path: string | undefined) => {
        if (path) shell.add(path);
    };

    // Collect shell assets from config
    if (config.shell) {
        const { splash, loading, title, uiSounds } = config.shell;

        if (splash) {
            addShell(splash.logo);
            addShell(splash.background);
            addShell(splash.sound);
        }

        if (loading) {
            addShell(loading.background);
        }

        if (title) {
            addShell(title.logo);
            addShell(title.background);
            addShell(title.music);
        }

        if (uiSounds) {
            addShell(uiSounds.click);
            addShell(uiSounds.hover);
            addShell(uiSounds.menuOpen);
            addShell(uiSounds.menuClose);
        }
    }

    // Add a game asset only if it's a non-empty string not already in shell
    const addGame = (path: string | undefined) => {
        if (path && !shell.has(path)) game.add(path);
    };

    const addEffectAssets = (effects: Effect[] | undefined) => {
        if (!effects) return;

        for (const effect of effects) {
            if (effect.type === 'playMusic') {
                addGame(resolveAssetPath(effect.track, 'music'));
            } else if (effect.type === 'playSound') {
                addGame(resolveAssetPath(effect.sound, 'sfx'));
            } else if (effect.type === 'playVideo') {
                addGame(resolveAssetPath(effect.file, 'video'));
            } else if (effect.type === 'showInterlude') {
                const interlude = registry.interludes[effect.interludeId];
                if (interlude) {
                    addGame(resolveAssetPath(interlude.background, 'banner'));
                    addGame(resolveAssetPath(interlude.banner, 'banner'));
                    addGame(resolveAssetPath(interlude.music, 'music'));
                    addGame(resolveAssetPath(interlude.voice, 'voice'));
                    interlude.sounds?.forEach((sound) =>
                        addGame(resolveAssetPath(sound, 'sfx'))
                    );
                }
            }
        }
    };

    // Locations: banner, music, ambient
    for (const location of Object.values(registry.locations)) {
        addGame(resolveAssetPath(location.banner, 'banner'));
        addGame(resolveAssetPath(location.music, 'music'));
        addGame(resolveAssetPath(location.ambient, 'ambient'));
    }

    // Characters: portrait
    for (const character of Object.values(registry.characters)) {
        addGame(resolveAssetPath(character.portrait, 'portrait'));
    }

    // Items: icon, image
    for (const item of Object.values(registry.items)) {
        addGame(resolveAssetPath(item.icon, 'item'));
        addGame(resolveAssetPath(item.image, 'item'));
    }

    // Maps: image
    for (const map of Object.values(registry.maps)) {
        addGame(resolveAssetPath(map.image, 'map'));
    }

    // Interludes: background, banner, music, voice, sounds[]
    for (const interlude of Object.values(registry.interludes)) {
        addGame(resolveAssetPath(interlude.background, 'banner'));
        addGame(resolveAssetPath(interlude.banner, 'banner'));
        addGame(resolveAssetPath(interlude.music, 'music'));
        addGame(resolveAssetPath(interlude.voice, 'voice'));
        if (interlude.sounds) {
            for (const sound of interlude.sounds) {
                addGame(resolveAssetPath(sound, 'sfx'));
            }
        }
        addEffectAssets(interlude.effects);
    }

    // Dialogues: voice, portrait overrides, and effect media in each node
    for (const dialogue of Object.values(registry.dialogues)) {
        for (const node of dialogue.nodes) {
            addGame(resolveAssetPath(node.voice, 'voice'));
            addGame(resolveAssetPath(node.portrait, 'portrait'));
            addEffectAssets(node.effects);
            node.conditionalBranches?.forEach((branch) =>
                addEffectAssets(branch.effects)
            );
            node.choices.forEach((choice) => addEffectAssets(choice.effects));
        }
    }

    return {
        shell: Array.from(shell).filter(Boolean),
        game: Array.from(game).filter(Boolean),
    };
}
