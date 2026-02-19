/**
 * @doodle-engine/core
 *
 * Pure TypeScript narrative RPG engine.
 * Framework-agnostic - manages game state, evaluates conditions, processes effects, builds snapshots.
 */

export const VERSION = '0.0.1';

// Content Entities
export type {
    Location,
    Character,
    Item,
    Map,
    MapLocation,
    Dialogue,
    DialogueNode,
    Choice,
    Quest,
    QuestStage,
    JournalEntry,
    Interlude,
    ShellConfig,
    GameConfig,
} from './types/entities';

// Asset Types
export type {
    AssetEntry,
    AssetManifest,
    AssetLoadingState,
} from './types/assets';

// Asset Manifest Utilities
export { getAssetType, extractAssetPaths } from './assets/manifest';

// Asset Path Resolution
export { resolveAssetPath } from './assets/paths';
export type { AssetCategory } from './assets/paths';

// Asset Loader
export type { AssetLoader } from './assets/loader';

export { createAssetLoader } from './assets/loader';

// Conditions
export type {
    Condition,
    HasFlagCondition,
    NotFlagCondition,
    HasItemCondition,
    VariableEqualsCondition,
    VariableGreaterThanCondition,
    VariableLessThanCondition,
    AtLocationCondition,
    QuestAtStageCondition,
    CharacterAtCondition,
    CharacterInPartyCondition,
    RelationshipAboveCondition,
    RelationshipBelowCondition,
    TimeIsCondition,
    ItemAtCondition,
    RollCondition,
} from './types/conditions';

// Effects
export type {
    Effect,
    SetFlagEffect,
    ClearFlagEffect,
    SetVariableEffect,
    AddVariableEffect,
    AddItemEffect,
    RemoveItemEffect,
    MoveItemEffect,
    GoToLocationEffect,
    AdvanceTimeEffect,
    SetQuestStageEffect,
    AddJournalEntryEffect,
    StartDialogueEffect,
    EndDialogueEffect,
    SetCharacterLocationEffect,
    AddToPartyEffect,
    RemoveFromPartyEffect,
    SetRelationshipEffect,
    AddRelationshipEffect,
    SetCharacterStatEffect,
    AddCharacterStatEffect,
    SetMapEnabledEffect,
    PlayMusicEffect,
    PlaySoundEffect,
    NotifyEffect,
    PlayVideoEffect,
    ShowInterludeEffect,
    RollEffect,
} from './types/effects';

// Game State
export type {
    GameState,
    CharacterState,
    DialogueState,
    PlayerNote,
    Time,
} from './types/state';

// Snapshot
export type {
    Snapshot,
    SnapshotLocation,
    SnapshotCharacter,
    SnapshotItem,
    SnapshotChoice,
    SnapshotDialogue,
    SnapshotQuest,
    SnapshotJournalEntry,
    SnapshotMapLocation,
    SnapshotMap,
    SnapshotInterlude,
} from './types/snapshot';

// Save Data
export type { SaveData } from './types/save';

// Content Registry
export type { ContentRegistry, LocaleData } from './types/registry';

// Condition Evaluators
export { evaluateCondition, evaluateConditions } from './conditions';

// Effect Processors
export { applyEffect, applyEffects } from './effects';

// Localization
export { resolveText, createResolver } from './localization';

// Snapshot Builder
export { buildSnapshot } from './snapshot';

// Engine
export { Engine } from './engine';

// Parser
export { parseDialogue, parseCondition, parseEffect } from './parser';

// Dev Tools (framework-agnostic debugging API)
export type { DevTools } from './devtools';

export { enableDevTools } from './devtools';
