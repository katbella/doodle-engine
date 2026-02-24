/**
 * @doodle-engine/react
 *
 * React renderer for the Doodle Engine
 */

export { VERSION } from '@doodle-engine/core';

// Provider and Context
export { GameProvider, GameContext } from './GameProvider';
export type { GameContextValue, GameProviderProps } from './GameProvider';

// Asset Provider and Context
export { AssetProvider, AssetContext, useAssetContext } from './AssetProvider';
export type { AssetContextValue, AssetProviderProps } from './AssetProvider';

// Hooks
export { useGame } from './hooks/useGame';
export { useAudioManager } from './hooks/useAudioManager';
export type {
    AudioManagerOptions,
    AudioManagerControls,
} from './hooks/useAudioManager';
export { useUISounds } from './hooks/useUISounds';
export type { UISoundConfig, UISoundControls } from './hooks/useUISounds';
export { useAsset, usePrefetch } from './hooks/useAsset';
export type { UseAssetResult } from './hooks/useAsset';

// Main Renderer
export { GameRenderer } from './GameRenderer';
export type { GameRendererProps } from './GameRenderer';

// Game Shell
export { GameShell } from './GameShell';
export type { GameShellProps } from './GameShell';

// Individual Components
export { DialogueBox } from './components/DialogueBox';
export type { DialogueBoxProps } from './components/DialogueBox';

export { ChoiceList } from './components/ChoiceList';
export type { ChoiceListProps } from './components/ChoiceList';

export { LocationView } from './components/LocationView';
export type { LocationViewProps } from './components/LocationView';

export { CharacterList } from './components/CharacterList';
export type { CharacterListProps } from './components/CharacterList';

export { Inventory } from './components/Inventory';
export type { InventoryProps } from './components/Inventory';

export { Journal } from './components/Journal';
export type { JournalProps } from './components/Journal';

export { MapView } from './components/MapView';
export type { MapViewProps } from './components/MapView';

export { NotificationArea } from './components/NotificationArea';
export type { NotificationAreaProps } from './components/NotificationArea';

export { SaveLoadPanel } from './components/SaveLoadPanel';
export type { SaveLoadPanelProps } from './components/SaveLoadPanel';

export { VideoPlayer } from './components/VideoPlayer';
export type { VideoPlayerProps } from './components/VideoPlayer';

export { Interlude } from './components/Interlude';
export type { InterludeProps } from './components/Interlude';

export { LoadingScreen } from './components/LoadingScreen';
export type { LoadingScreenProps } from './components/LoadingScreen';

export { SplashScreen } from './components/SplashScreen';
export type { SplashScreenProps } from './components/SplashScreen';

export { TitleScreen } from './components/TitleScreen';
export type { TitleScreenProps } from './components/TitleScreen';

export { AssetImage } from './components/AssetImage';
export type { AssetImageProps } from './components/AssetImage';

export { PauseMenu } from './components/PauseMenu';
export type { PauseMenuProps } from './components/PauseMenu';

export { SettingsPanel } from './components/SettingsPanel';
export type { SettingsPanelProps } from './components/SettingsPanel';

export { GameTime } from './components/GameTime';
export type { GameTimeProps, TimeFormat } from './components/GameTime';
