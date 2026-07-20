/**
 * GameShell - Complete game wrapper with splash, title, menus
 *
 * Manages the game lifecycle: loading, then splash, then title, then playing
 * Includes pause menu, settings, and video playback.
 * Wraps AssetProvider + GameProvider + GameRenderer with full shell chrome.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Engine,
    buildUIStrings,
    createInitialState,
    resolveAssetPath,
} from '@doodle-engine/core';
import type {
    ContentRegistry,
    GameConfig,
    Snapshot,
    AssetManifest,
    AssetLoadingState,
} from '@doodle-engine/core';
import type { AssetLoader } from '@doodle-engine/core';
import { GameProvider } from './GameProvider';
import { GameRenderer } from './GameRenderer';
import { AssetProvider } from './AssetProvider';
import { useAudioManager } from './hooks/useAudioManager';
import { useAssetUrl } from './hooks/useAsset';
import { useUISounds } from './hooks/useUISounds';
import {
    AudioSettingsProvider,
    useAudioSettings,
} from './AudioSettingsContext';
import type { UISoundConfig, UISoundControls } from './hooks/useUISounds';
import type { AudioManagerOptions } from './hooks/useAudioManager';
import { SplashScreen } from './components/SplashScreen';
import { TitleScreen } from './components/TitleScreen';
import { CreditsScreen } from './components/CreditsScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { PauseMenu } from './components/PauseMenu';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPlayer } from './components/VideoPlayer';
import { InputProvider, useInputAction } from './input/InputRouter';
import {
    hasSaves,
    latestSave,
    saveStorageKeyForProject,
    type SaveStorageKey,
    writeSave,
} from './saves';

type Screen = 'splash' | 'title' | 'credits' | 'playing';

export interface GameShellProps {
    /** Content registry (from api/content) */
    registry: ContentRegistry;
    /** Game config (from api/content), includes shell config */
    config: GameConfig;
    /** Asset manifest (from api/manifest) */
    manifest: AssetManifest;
    /** Custom asset loader (for non-browser environments) */
    assetLoader?: AssetLoader;
    /** Game title for title screen */
    title?: string;
    /** Subtitle text */
    subtitle?: string;
    /** Credits content. Defaults to the game title and Doodle Engine credit. */
    credits?: React.ReactNode;
    /** UI sound configuration, or false to disable */
    uiSounds?: UISoundConfig | false;
    /** Audio manager options (crossfade duration, etc.) */
    audioOptions?: AudioManagerOptions;
    /** Stable project identity generated once when the project is created. */
    projectId: string;
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
    credits,
    uiSounds: uiSoundsConfig,
    audioOptions,
    projectId,
    availableLocales,
    className = '',
    renderLoading,
    devTools = false,
}: GameShellProps) {
    const storageKey = saveStorageKeyForProject(projectId);
    const shell = config.shell;
    const loadingUi = buildUIStrings(registry.locales['en'] ?? {});

    return (
        <AudioSettingsProvider defaults={audioOptions}>
            <InputProvider>
                <AssetProvider
                    manifest={manifest}
                    loader={assetLoader}
                    renderLoading={(state) => {
                        if (renderLoading) return renderLoading(state);
                        return (
                            <LoadingScreen
                                state={state}
                                background={shell?.loading?.background}
                                ui={loadingUi}
                            />
                        );
                    }}
                >
                    <GameShellInner
                        registry={registry}
                        config={config}
                        title={title}
                        subtitle={subtitle}
                        credits={credits}
                        uiSoundsConfig={uiSoundsConfig}
                        audioOptions={audioOptions}
                        projectId={projectId}
                        storageKey={storageKey}
                        availableLocales={availableLocales}
                        className={className}
                        devTools={devTools}
                    />
                </AssetProvider>
            </InputProvider>
        </AudioSettingsProvider>
    );
}

// Inner component (rendered after shell and game assets are loaded)

interface GameShellInnerProps {
    registry: ContentRegistry;
    config: GameConfig;
    title: string;
    subtitle?: string;
    credits?: React.ReactNode;
    uiSoundsConfig?: UISoundConfig | false;
    audioOptions?: AudioManagerOptions;
    projectId: string;
    storageKey: SaveStorageKey;
    availableLocales?: { code: string; label: string }[];
    className: string;
    devTools: boolean;
}

export function resolveGameShellUISoundConfig(
    shell: GameConfig['shell'],
    uiSoundsConfig?: UISoundConfig | false
): UISoundConfig {
    if (uiSoundsConfig === false) {
        return { enabled: false };
    }

    return uiSoundsConfig ?? { sounds: shell?.uiSounds ?? {} };
}

function GameShellInner({
    registry,
    config,
    title,
    subtitle,
    credits,
    uiSoundsConfig,
    audioOptions,
    projectId,
    storageKey,
    availableLocales,
    className,
    devTools,
}: GameShellInnerProps) {
    const shell = config.shell;
    const [screen, setScreen] = useState<Screen>(
        shell?.splash ? 'splash' : 'title'
    );
    const [selectedLocale, setSelectedLocale] = useState('en');
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
        resolveGameShellUISoundConfig(shell, uiSoundsConfig)
    );

    const hasSaveData = hasSaves(localStorage, storageKey);

    const createEngine = useCallback(() => {
        return new Engine(registry, createInitialState(selectedLocale));
    }, [registry, selectedLocale]);

    const handleNewGame = useCallback(() => {
        uiSoundControls.playClick();
        const engine = createEngine();
        const snapshot = engine.newGame(config);
        setGameState({ engine, snapshot });
        setScreen('playing');
    }, [createEngine, config, uiSoundControls]);

    // Continue picks up the most recent save.
    const handleContinue = useCallback(() => {
        uiSoundControls.playClick();
        const saveData = latestSave(localStorage, storageKey);
        if (!saveData) return;
        const engine = createEngine();
        const snapshot = engine.loadGame(saveData);
        setGameState({ engine, snapshot });
        setScreen('playing');
    }, [createEngine, storageKey, uiSoundControls]);

    // The pause menu Save is a quick save: it overwrites the single quick-save
    // slot. Manual saves (as many as the player wants) are made from the
    // in-game Save/Load panel.
    const handleSave = useCallback(() => {
        if (!gameState) return;
        uiSoundControls.playClick();
        writeSave(
            localStorage,
            storageKey,
            gameState.engine.saveGame(),
            'quick'
        );
        setShowPauseMenu(false);
    }, [gameState, storageKey, uiSoundControls]);

    // The pause menu's Load happens inside GameShellPlaying (which owns the
    // live game view); this handles the click sound and closes the menu.
    const handleLoadFeedback = useCallback(() => {
        uiSoundControls.playClick();
        setShowPauseMenu(false);
    }, [uiSoundControls]);

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

    // Title screen music
    const audioSettings = useAudioSettings();
    const titleMusicRef = useRef<HTMLAudioElement | null>(null);
    const titleMusicPath = useAssetUrl(
        resolveAssetPath(shell?.title?.music, 'music')
    );

    useEffect(() => {
        if (screen !== 'title' || !titleMusicPath) return;
        const audio = new Audio(titleMusicPath);
        audio.loop = true;
        audio.volume = audioSettings.masterVolume * audioSettings.musicVolume;
        titleMusicRef.current = audio;
        audio.play().catch(() => {});
        return () => {
            audio.pause();
            audio.src = '';
            titleMusicRef.current = null;
        };
    }, [screen, titleMusicPath]);

    useEffect(() => {
        if (titleMusicRef.current) {
            titleMusicRef.current.volume =
                audioSettings.masterVolume * audioSettings.musicVolume;
        }
    }, [audioSettings.masterVolume, audioSettings.musicVolume]);

    useInputAction(
        ({ command }) => {
            if (command !== 'cancel' && command !== 'openMenu') {
                return false;
            }

            if (showSettings) {
                closeSettings();
                return true;
            }

            if (showPauseMenu) {
                uiSoundControls.playMenuClose();
                setShowPauseMenu(false);
            } else {
                uiSoundControls.playMenuOpen();
                setShowPauseMenu(true);
            }

            return true;
        },
        { priority: 50, enabled: screen === 'playing' }
    );

    const titleUi = buildUIStrings(
        registry.locales[selectedLocale] ?? registry.locales['en'] ?? {}
    );

    // Splash screen
    if (screen === 'splash') {
        return (
            <div className={`game-shell ${className}`}>
                <SplashScreen
                    shell={shell?.splash}
                    ui={titleUi}
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
                        ui={titleUi}
                        audio={audioSettings}
                        uiSoundControls={
                            uiSoundsConfig !== false
                                ? uiSoundControls
                                : undefined
                        }
                        availableLocales={availableLocales}
                        currentLocale={selectedLocale}
                        onLocaleChange={setSelectedLocale}
                        onBack={closeSettings}
                    />
                ) : (
                    <TitleScreen
                        ui={titleUi}
                        shell={shell?.title}
                        title={title}
                        subtitle={subtitle}
                        hasSaveData={hasSaveData}
                        onNewGame={handleNewGame}
                        onContinue={handleContinue}
                        onSettings={() => openSettings('title')}
                        onCredits={() => setScreen('credits')}
                    />
                )}
            </div>
        );
    }

    if (screen === 'credits') {
        return (
            <div className={`game-shell ${className}`}>
                <CreditsScreen
                    ui={titleUi}
                    title={title}
                    onBack={() => setScreen('title')}
                >
                    {credits}
                </CreditsScreen>
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
                    projectId={projectId}
                    storageKey={storageKey}
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
                    onLoad={handleLoadFeedback}
                    onSettings={() => openSettings('pause')}
                    onQuitToTitle={handleQuitToTitle}
                    onCloseSettings={closeSettings}
                />
            </GameProvider>
        </div>
    );
}

/**
 * Inner component that has access to GameContext via useGame.
 * Manages in-game audio playback and shell overlays (pause, settings, video).
 */
import { useGame } from './hooks/useGame';

interface GameShellPlayingProps {
    audioOptions?: AudioManagerOptions;
    projectId: string;
    storageKey: SaveStorageKey;
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
    projectId,
    storageKey,
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
    const audioSettings = useAudioSettings();

    // Quick load from the pause menu: load the newest save through the
    // provider action, so the screen shows the loaded game right away.
    const quickLoad = useCallback(() => {
        const saveData = latestSave(localStorage, storageKey);
        if (!saveData) return;
        actions.loadGame(saveData);
        onLoad();
    }, [storageKey, actions, onLoad]);

    // Autosave when the player travels to a new place. Overwrites the single
    // autosave slot. Skips the first render so a fresh game isn't saved at once.
    const prevLocationRef = useRef<string | null>(null);
    useEffect(() => {
        const location = snapshot.location.id;
        if (
            prevLocationRef.current !== null &&
            prevLocationRef.current !== location
        ) {
            writeSave(localStorage, storageKey, actions.saveGame(), 'auto');
        }
        prevLocationRef.current = location;
    }, [snapshot.location.id, actions, storageKey]);

    // Audio playback: volumes come from AudioSettingsContext (single source of truth)
    useAudioManager(snapshot, {
        ...audioOptions,
        masterVolume: audioSettings.masterVolume,
        musicVolume: audioSettings.musicVolume,
        soundVolume: audioSettings.soundVolume,
        voiceVolume: audioSettings.voiceVolume,
    });

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
                    ui={snapshot.ui}
                    src={pendingVideo}
                    onComplete={() => setPendingVideo(null)}
                />
            )}

            <GameRenderer projectId={projectId} />

            {!showPauseMenu && !showSettings && !pendingVideo && (
                <button
                    className="game-shell-menu-button"
                    onClick={onPause}
                    aria-label={snapshot.ui['ui.menu'] ?? 'Menu'}
                >
                    {snapshot.ui['ui.menu'] ?? 'Menu'}
                </button>
            )}

            {showPauseMenu && (
                <PauseMenu
                    ui={snapshot.ui}
                    onResume={onResume}
                    onSave={onSave}
                    onLoad={quickLoad}
                    canLoad={hasSaves(localStorage, storageKey)}
                    onSettings={onSettings}
                    onQuitToTitle={onQuitToTitle}
                />
            )}

            {showSettings && (
                <SettingsPanel
                    ui={snapshot.ui}
                    audio={audioSettings}
                    uiSoundControls={uiSoundControls}
                    availableLocales={availableLocales}
                    currentLocale={snapshot.currentLocale}
                    onLocaleChange={actions.setLocale}
                    onBack={onCloseSettings}
                />
            )}
        </>
    );
}
