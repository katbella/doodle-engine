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
    ConditionalBranch,
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
export {
    evaluateCondition,
    evaluateConditions,
    describeConditionValues,
} from './conditions';

// Effect Processors
export { applyEffect, applyEffects } from './effects';

// Localization
export { resolveText, createResolver } from './localization';

// Snapshot Builder
export { buildSnapshot, buildUIStrings } from './snapshot';

// Engine
export { Engine, createInitialState } from './engine';
export type { ChoiceVisibility } from './engine';

// Debug trace (for tooling: playtest, state inspector, debug trace)
export type {
    TraceSink,
    TraceEvent,
    NodeEnterEvent,
    ConditionEvent,
    ConditionContext,
    EffectEvent,
    StateDelta,
    TransitionEvent,
    ChoiceFilteredEvent,
    TraceErrorEvent,
} from './types/trace';

// Parser
export { parseDialogue, parseCondition, parseEffect } from './parser';

// Lossless concrete-syntax layer (for editors: round-trip safe, position-aware)
export {
    parseDialogueCst,
    printDialogueCst,
    cstToDialogue,
} from './parser/cst';
export type {
    DialogueCst,
    CstLine,
    CstNode,
    CstChoice,
    CstIf,
    CstDirective,
    CstEdit,
    Span,
} from './parser/cst';

// Serializer (dialogue entities -> .dlg source, for the visual editor)
export {
    serializeDialogue,
    serializeNode,
    serializeCondition,
    serializeEffect,
} from './parser/serialize';

// Visual-editor write-back (splices changed nodes, preserving comments)
export { applyDialogueEdits } from './parser/edit';

// Condition/effect descriptors (single source of truth for builder UIs)
export {
    CONDITION_DESCRIPTORS,
    EFFECT_DESCRIPTORS,
    REFERENCE_KIND_TARGET,
    conditionDescriptor,
    effectDescriptor,
} from './parser/descriptors';
export type {
    ArgKind,
    ArgDescriptor,
    DescriptorGroup,
    ConditionDescriptor,
    EffectDescriptor,
} from './parser/descriptors';

// Dev Tools (framework-agnostic debugging API)
export type { DevTools } from './devtools';

export { enableDevTools } from './devtools';

// Reference index (id → usages; find-references, orphans, safe rename)
export { ReferenceIndex } from './reference-index';
export type { SymbolType, Reference } from './reference-index';
