import { useEffect, useState } from 'react';
import type {
    ContentRegistry,
    GameConfig,
    AssetManifest,
} from '@doodle-engine/core';
import { GameShell } from '@doodle-engine/react';

const GAME_TITLE = __GAME_TITLE_JSON__;
const GAME_SUBTITLE = __GAME_SUBTITLE_JSON__;

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
                <div className="spinner" />
            </div>
        );
    }

    return (
        <GameShell
            registry={content.registry}
            config={content.config}
            manifest={manifest}
            title={GAME_TITLE}
            subtitle={GAME_SUBTITLE || undefined}
            credits={
                <>
                    <p>{GAME_TITLE}</p>
                    <p>Made with Doodle Engine</p>
                </>
            }
            availableLocales={[{ code: 'en', label: 'English' }]}
            devTools={import.meta.env.DEV}
        />
    );
}
