/**
 * GameShell - Complete game wrapper with splash, title, menus
 *
 * Manages the game lifecycle: loading → splash → title → playing
 * Includes pause menu, settings, and video playback.
 * Wraps AssetProvider + GameProvider + GameRenderer with full shell chrome.
 */

import { useState, useEffect, useCallback } from 'react';
import { Engine, buildUIStrings } from '@doodle-engine/core';
import type {
    ContentRegistry,
    GameConfig,
    GameState,
    Snapshot,
    SaveData,
    AssetManifest,
    AssetLoadingState,
} from '@doodle-engine/core';
import type { AssetLoader } from '@doodle-engine/core';
import { GameProvider } from './GameProvider';
import { GameRenderer } from './GameRenderer';
import { AssetProvider } from './AssetProvider';
import { useAudioManager } from './hooks/useAudioManager';
import { useUISounds } from './hooks/useUISounds';
import type { UISoundConfig, UISoundControls } from './hooks/useUISounds';
import type { AudioManagerOptions } from './hooks/useAudioManager';
import { SplashScreen } from './components/SplashScreen';
import { TitleScreen } from './components/TitleScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { PauseMenu } from './components/PauseMenu';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPlayer } from './components/VideoPlayer';

type Screen = 'splash' | 'title' | 'playing';

export interface GameShellProps {
    /** Content registry (from /api/content) */
    registry: ContentRegistry;
    /** Game config (from /api/content), includes shell config */
    config: GameConfig;
    /** Asset manifest (from /api/manifest) */
    manifest: AssetManifest;
    /** Custom asset loader (for non-browser environments) */
    assetLoader?: AssetLoader;
    /** Game title for title screen */
    title?: string;
    /** Subtitle text */
    subtitle?: string;
    /** UI sound configuration, or false to disable */
    uiSounds?: UISoundConfig | false;
    /** Audio manager options */
    audioOptions?: AudioManagerOptions;
    /** localStorage key for saves */
    storageKey?: string;
    /** Available languages for settings */
    availableLocales?: { code: string; label: string }[];
    /** CSS class */
    className?: string;
    /** Override the loading screen entirely */
    renderLoading?: (state: AssetLoadingState) => React.ReactNode;
    /**
     * Enable the browser console debugging API (window.doodle).
     * Pass import.meta.env.DEV to automatically enable in development.
     */
    devTools?: boolean;
}

export function GameShell({
    registry,
    config,
    manifest,
    assetLoader,
    title = 'Doodle Engine',
    subtitle,
    uiSounds: uiSoundsConfig,
    audioOptions,
    storageKey = 'doodle-engine-save',
    availableLocales,
    className = '',
    renderLoading,
    devTools = false,
}: GameShellProps) {
    const shell = config.shell;

    return (
        <AssetProvider
            manifest={manifest}
            loader={assetLoader}
            renderLoading={(state) => {
                if (renderLoading) return renderLoading(state);
                return (
                    <LoadingScreen
                        state={state}
                        background={shell?.loading?.background}
                    />
                );
            }}
        >
            <GameShellInner
                registry={registry}
                config={config}
                title={title}
                subtitle={subtitle}
                uiSoundsConfig={uiSoundsConfig}
                audioOptions={audioOptions}
                storageKey={storageKey}
                availableLocales={availableLocales}
                className={className}
                devTools={devTools}
            />
        </AssetProvider>
    );
}

// ── Inner component (rendered after shell assets are loaded) ──────────────────

interface GameShellInnerProps {
    registry: ContentRegistry;
    config: GameConfig;
    title: string;
    subtitle?: string;
    uiSoundsConfig?: UISoundConfig | false;
    audioOptions?: AudioManagerOptions;
    storageKey: string;
    availableLocales?: { code: string; label: string }[];
    className: string;
    devTools: boolean;
}

function GameShellInner({
    registry,
    config,
    title,
    subtitle,
    uiSoundsConfig,
    audioOptions,
    storageKey,
    availableLocales,
    className,
    devTools,
}: GameShellInnerProps) {
    const shell = config.shell;
    const [screen, setScreen] = useState<Screen>(
        shell?.splash ? 'splash' : 'title'
    );
    const [showPauseMenu, setShowPauseMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsFrom, setSettingsFrom] = useState<'title' | 'pause'>(
        'title'
    );
    const [pendingVideo, setPendingVideo] = useState<string | null>(null);

    const [gameState, setGameState] = useState<{
        engine: Engine;
        snapshot: Snapshot;
    } | null>(null);

    const uiSoundControls = useUISounds(
        uiSoundsConfig === false ? { enabled: false } : uiSoundsConfig
    );

    const hasSaveData = localStorage.getItem(storageKey) !== null;

    const createEngine = useCallback(() => {
        const state: GameState = {
            currentLocation: config.startLocation,
            currentTime: { ...config.startTime },
            flags: { ...config.startFlags },
            variables: { ...config.startVariables },
            inventory: [...config.startInventory],
            questProgress: {},
            unlockedJournalEntries: [],
            playerNotes: [],
            dialogueState: null,
            characterState: {},
            itemLocations: {},
            mapEnabled: true,
            notifications: [],
            pendingSounds: [],
            pendingVideo: null,
            pendingInterlude: null,
            currentLocale: 'en',
        };
        return new Engine(registry, state);
    }, [registry, config]);

    const handleNewGame = useCallback(() => {
        uiSoundControls.playClick();
        const engine = createEngine();
        const snapshot = engine.newGame(config);
        setGameState({ engine, snapshot });
        setScreen('playing');
    }, [createEngine, config, uiSoundControls]);

    const handleContinue = useCallback(() => {
        uiSoundControls.playClick();
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const saveData: SaveData = JSON.parse(raw);
        const engine = createEngine();
        const snapshot = engine.loadGame(saveData);
        setGameState({ engine, snapshot });
        setScreen('playing');
    }, [createEngine, storageKey, uiSoundControls]);

    const handleSave = useCallback(() => {
        if (!gameState) return;
        uiSoundControls.playClick();
        const saveData = gameState.engine.saveGame();
        localStorage.setItem(storageKey, JSON.stringify(saveData));
        setShowPauseMenu(false);
    }, [gameState, storageKey, uiSoundControls]);

    const handleLoad = useCallback(() => {
        const raw = localStorage.getItem(storageKey);
        if (!raw || !gameState) return;
        uiSoundControls.playClick();
        const saveData: SaveData = JSON.parse(raw);
        const snapshot = gameState.engine.loadGame(saveData);
        setGameState({ engine: gameState.engine, snapshot });
        setShowPauseMenu(false);
    }, [gameState, storageKey, uiSoundControls]);

    const handleQuitToTitle = useCallback(() => {
        uiSoundControls.playClick();
        setShowPauseMenu(false);
        setShowSettings(false);
        setGameState(null);
        setScreen('title');
    }, [uiSoundControls]);

    const openSettings = useCallback(
        (from: 'title' | 'pause') => {
            uiSoundControls.playMenuOpen();
            setSettingsFrom(from);
            setShowSettings(true);
            if (from === 'pause') setShowPauseMenu(false);
        },
        [uiSoundControls]
    );

    const closeSettings = useCallback(() => {
        uiSoundControls.playMenuClose();
        setShowSettings(false);
        if (settingsFrom === 'pause') setShowPauseMenu(true);
    }, [settingsFrom, uiSoundControls]);

    // Escape key toggles pause menu
    useEffect(() => {
        if (screen !== 'playing') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (showSettings) {
                    closeSettings();
                } else {
                    if (showPauseMenu) {
                        uiSoundControls.playMenuClose();
                    } else {
                        uiSoundControls.playMenuOpen();
                    }
                    setShowPauseMenu((prev) => !prev);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [screen, showPauseMenu, showSettings, closeSettings, uiSoundControls]);

    // Stub audio controls for settings when not playing
    const stubAudioControls = {
        setMasterVolume: () => {},
        setMusicVolume: () => {},
        setSoundVolume: () => {},
        setVoiceVolume: () => {},
        stopAll: () => {},
    };

    // Splash screen
    if (screen === 'splash') {
        return (
            <div className={`game-shell ${className}`}>
                <SplashScreen
                    shell={shell?.splash}
                    onComplete={() => setScreen('title')}
                />
            </div>
        );
    }

    // Title screen
    if (screen === 'title') {
        return (
            <div className={`game-shell ${className}`}>
                {showSettings ? (
                    <SettingsPanel
                        audioControls={stubAudioControls}
                        uiSoundControls={
                            uiSoundsConfig !== false
                                ? uiSoundControls
                                : undefined
                        }
                        availableLocales={availableLocales}
                        onBack={closeSettings}
                    />
                ) : (
                    <TitleScreen
                        ui={buildUIStrings(registry.locales['en'] ?? {})}
                        shell={shell?.title}
                        title={title}
                        subtitle={subtitle}
                        hasSaveData={hasSaveData}
                        onNewGame={handleNewGame}
                        onContinue={handleContinue}
                        onSettings={() => openSettings('title')}
                    />
                )}
            </div>
        );
    }

    // Playing
    if (!gameState) return null;

    return (
        <div className={`game-shell ${className}`}>
            <GameProvider
                engine={gameState.engine}
                initialSnapshot={gameState.snapshot}
                devTools={devTools}
            >
                <GameShellPlaying
                    audioOptions={audioOptions}
                    uiSoundControls={
                        uiSoundsConfig !== false ? uiSoundControls : undefined
                    }
                    showPauseMenu={showPauseMenu}
                    showSettings={showSettings}
                    availableLocales={availableLocales}
                    pendingVideo={pendingVideo}
                    setPendingVideo={setPendingVideo}
                    onPause={() => {
                        uiSoundControls.playMenuOpen();
                        setShowPauseMenu(true);
                    }}
                    onResume={() => {
                        uiSoundControls.playMenuClose();
                        setShowPauseMenu(false);
                    }}
                    onSave={handleSave}
                    onLoad={handleLoad}
                    onSettings={() => openSettings('pause')}
                    onQuitToTitle={handleQuitToTitle}
                    onCloseSettings={closeSettings}
                />
            </GameProvider>
        </div>
    );
}

/**
 * Inner component that has access to GameContext via useGame
 */
import { useGame } from './hooks/useGame';

interface GameShellPlayingProps {
    audioOptions?: AudioManagerOptions;
    uiSoundControls?: UISoundControls;
    showPauseMenu: boolean;
    showSettings: boolean;
    availableLocales?: { code: string; label: string }[];
    pendingVideo: string | null;
    setPendingVideo: (video: string | null) => void;
    onPause: () => void;
    onResume: () => void;
    onSave: () => void;
    onLoad: () => void;
    onSettings: () => void;
    onQuitToTitle: () => void;
    onCloseSettings: () => void;
}

function GameShellPlaying({
    audioOptions,
    uiSoundControls,
    showPauseMenu,
    showSettings,
    availableLocales,
    pendingVideo,
    setPendingVideo,
    onPause,
    onResume,
    onSave,
    onLoad,
    onSettings,
    onQuitToTitle,
    onCloseSettings,
}: GameShellPlayingProps) {
    const { snapshot, actions } = useGame();
    const audioControls = useAudioManager(snapshot, audioOptions);

    // Watch for pending video from snapshot
    useEffect(() => {
        if (snapshot.pendingVideo) {
            setPendingVideo(snapshot.pendingVideo);
        }
    }, [snapshot.pendingVideo, setPendingVideo]);

    return (
        <>
            {pendingVideo && (
                <VideoPlayer
                    src={pendingVideo}
                    onComplete={() => setPendingVideo(null)}
                />
            )}

            <GameRenderer />

            {!showPauseMenu && !showSettings && !pendingVideo && (
                <button
                    className="game-shell-menu-button"
                    onClick={onPause}
                    aria-label="Menu"
                >
                    Menu
                </button>
            )}

            {showPauseMenu && (
                <PauseMenu
                    ui={snapshot.ui}
                    onResume={onResume}
                    onSave={onSave}
                    onLoad={onLoad}
                    onSettings={onSettings}
                    onQuitToTitle={onQuitToTitle}
                />
            )}

            {showSettings && (
                <SettingsPanel
                    audioControls={audioControls}
                    uiSoundControls={uiSoundControls}
                    availableLocales={availableLocales}
                    currentLocale={snapshot.time ? undefined : undefined}
                    onLocaleChange={actions.setLocale}
                    onBack={onCloseSettings}
                />
            )}
        </>
    );
}
