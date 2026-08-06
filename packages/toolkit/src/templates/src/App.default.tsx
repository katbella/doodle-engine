import { useEffect, useState } from 'react';
import type {
    ContentRegistry,
    GameConfig,
    AssetManifest,
} from '@doodle-engine/core';
import { GameShell } from '@doodle-engine/react';
import { getAvailableLocales } from './locale-options';
import { PROJECT_ID } from './project';

export function App() {
    const [content, setContent] = useState<{
        registry: ContentRegistry;
        config: GameConfig;
    } | null>(null);
    const [manifest, setManifest] = useState<AssetManifest | null>(null);

    useEffect(() => {
        // Relative paths, so the game works at a domain root or under a folder.
        Promise.all([
            fetch('api/content').then((res) => res.json()),
            fetch('api/manifest').then((res) => res.json()),
        ]).then(([contentData, manifestData]) => {
            setContent({
                registry: contentData.registry,
                config: contentData.config,
            });
            setManifest(manifestData);
        });
    }, []);

    // Minimal bootstrap state while fetching manifest/content
    if (!content || !manifest) {
        return (
            <div className="app-bootstrap">
                <div className="app-bootstrap-mark">Doodle Engine</div>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <GameShell
            registry={content.registry}
            config={content.config}
            manifest={manifest}
            projectId={PROJECT_ID}
            availableLocales={getAvailableLocales(content.registry.locales)}
            devTools={import.meta.env.DEV}
        />
    );
}
