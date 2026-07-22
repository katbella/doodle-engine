/**
 * Engine class for the Doodle Engine.
 *
 * The engine is the heart of the system. It:
 * - Holds the content registry (static) and game state (dynamic)
 * - Exposes API methods for player actions
 * - Evaluates conditions and applies effects
 * - Builds snapshots for the renderer
 *
 * One-way data flow: actions in, snapshots out.
 */

import type { ContentRegistry } from '../types/registry';
import type { GameState, CharacterState } from '../types/state';
import type {
    GameConfig,
    DialogueNode,
    Map as GameMap,
} from '../types/entities';
import type { Snapshot } from '../types/snapshot';
import type { SaveData } from '../types/save';
import type { Effect } from '../types/effects';
import type { Condition } from '../types/conditions';
import type {
    TraceSink,
    TraceEvent,
    StateDelta,
    ConditionContext,
} from '../types/trace';
import { buildSnapshot } from '../snapshot';
import { applyEffects } from '../effects';
import {
    evaluateConditions,
    evaluateCondition,
    describeConditionValues,
} from '../conditions';

/**
 * How many automatic dialogue steps (silent nodes and START dialogue
 * redirects) one player action may take. Authored content never needs
 * anywhere near this many; the cap exists so a GOTO cycle between silent
 * nodes ends the dialogue instead of freezing the game.
 */
const MAX_AUTO_STEPS = 200;

/**
 * The Doodle Engine.
 *
 * Manages game state, processes actions, and produces snapshots.
 */
export class Engine {
    private registry: ContentRegistry;
    private state: GameState;

    /**
     * Automatic dialogue steps taken during the current player action.
     * Reset when the action's snapshot is built.
     */
    private autoSteps = 0;

    /**
     * Optional debug-trace sink. When null (the default), the engine records
     * nothing and behaves — and performs — exactly as it does without tracing.
     */
    private trace: TraceSink | null = null;

    /** Monotonic sequence counter for trace events; reset with each new sink. */
    private traceSeq = 0;

    /**
     * Create a new engine instance.
     *
     * @param registry - Content registry with all game entities
     * @param state - Existing game state, usually from a save. Omit this when
     * starting with newGame().
     */
    constructor(
        registry: ContentRegistry,
        state: GameState = createInitialState()
    ) {
        this.registry = registry;
        this.state = state;
    }

    // ===========================================================================
    // Core API Methods
    // ===========================================================================

    /**
     * Start a new game from configuration.
     *
     * Initializes game state from the provided config and builds the initial snapshot.
     *
     * @param config - Game configuration with starting conditions
     * @returns Initial snapshot
     */
    newGame(config: GameConfig): Snapshot {
        // Initialize character state from registry
        const characterState: Record<string, CharacterState> = {};
        for (const [id, character] of Object.entries(
            this.registry.characters
        )) {
            characterState[id] = {
                location: character.location,
                inParty: false,
                relationship: 0,
                stats: { ...character.stats }, // Clone stats
            };
        }

        // Initialize item locations from registry
        const itemLocations: Record<string, string> = {};
        for (const [id, item] of Object.entries(this.registry.items)) {
            itemLocations[id] = item.location;
        }
        for (const itemId of config.startInventory) {
            itemLocations[itemId] = 'inventory';
        }

        // Create initial game state
        this.state = {
            currentLocation: config.startLocation,
            currentTime: { ...config.startTime },
            flags: { ...config.startFlags },
            variables: { ...config.startVariables },
            inventory: [...config.startInventory],
            questProgress: {},
            unlockedJournalEntries: [],
            playerNotes: [],
            dialogueState: null,
            characterState,
            itemLocations,
            mapEnabled: true,
            notifications: [],
            pendingSounds: [],
            musicOverride: null,
            pendingVideo: null,
            pendingInterlude: null,
            currentLocale: this.state.currentLocale ?? 'en',
        };

        // Check for triggered dialogues and interludes at starting location
        this.checkTriggeredDialogues();
        this.checkTriggeredInterludes();

        // Build and return initial snapshot
        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Load a game from save data.
     *
     * Restores game state and builds a snapshot.
     *
     * @param saveData - Saved game data
     * @returns Snapshot of the loaded game
     */
    loadGame(saveData: SaveData): Snapshot {
        this.state = { ...saveData.state };

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Save the current game state.
     *
     * Returns save data that can be serialized and stored.
     *
     * @returns Save data with current state
     */
    saveGame(): SaveData {
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            state: { ...this.state },
        };
    }

    /**
     * Player selected a dialogue choice.
     *
     * Processes the choice effects and advances to the next node.
     *
     * @param choiceId - ID of the selected choice
     * @returns New snapshot after processing the choice
     */
    selectChoice(choiceId: string): Snapshot {
        if (!this.state.dialogueState) {
            // Not in dialogue - return current state
            return this.buildSnapshotAndClearTransients();
        }

        const dialogue =
            this.registry.dialogues[this.state.dialogueState.dialogueId];
        if (!dialogue) {
            return this.buildSnapshotAndClearTransients();
        }

        const currentNode = dialogue.nodes.find(
            (n) => n.id === this.state.dialogueState?.nodeId
        );
        if (!currentNode) {
            return this.buildSnapshotAndClearTransients();
        }

        const choice = currentNode.choices.find((c) => c.id === choiceId);
        if (!choice) {
            return this.buildSnapshotAndClearTransients();
        }
        if (
            choice.conditions &&
            !evaluateConditions(choice.conditions, this.state)
        ) {
            return this.buildSnapshotAndClearTransients();
        }

        // Apply choice effects
        if (choice.effects) {
            this.state = this.applyTracedEffects(choice.effects, this.state);
        }

        // If a startDialogue effect fired, nodeId will be ''. Initialize the new dialogue.
        if (this.initializePendingDialogueRedirect()) {
            return this.buildSnapshotAndClearTransients();
        }

        // Move to next node specified by choice
        const nextNode = dialogue.nodes.find((n) => n.id === choice.next);
        if (!nextNode) {
            // No next node - end dialogue
            this.emitTransition(dialogue.id, currentNode.id, null);
            this.state = {
                ...this.state,
                dialogueState: null,
            };
            return this.buildSnapshotAndClearTransients();
        }

        // Set dialogue state to this node
        this.emitTransition(dialogue.id, currentNode.id, nextNode.id);
        this.state = {
            ...this.state,
            dialogueState: {
                dialogueId: dialogue.id,
                nodeId: nextNode.id,
            },
        };
        this.emitNodeEnter(dialogue.id, nextNode.id);

        // Apply node effects first (before evaluating conditional branches)
        if (nextNode.effects) {
            this.state = this.applyTracedEffects(nextNode.effects, this.state);
        }
        if (this.initializePendingDialogueRedirect()) {
            return this.buildSnapshotAndClearTransients();
        }

        // Settle at this node: show text if any, auto-advance if silent
        if (nextNode.choices.length === 0) {
            this.settleAtNode(dialogue.id, nextNode);
            if (this.initializePendingDialogueRedirect()) {
                return this.buildSnapshotAndClearTransients();
            }
        }

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Player clicked on a character to talk.
     *
     * Starts the character's dialogue if they have one.
     *
     * @param characterId - ID of the character to talk to
     * @returns New snapshot with dialogue started
     */
    talkTo(characterId: string): Snapshot {
        const character = this.registry.characters[characterId];
        if (!character || !character.dialogue) {
            return this.buildSnapshotAndClearTransients();
        }
        return this.initDialogue(character.dialogue);
    }

    /**
     * Initialize a dialogue from its start node.
     * Used by talkTo and when a startDialogue effect fires mid-conversation.
     */
    private initDialogue(dialogueId: string): Snapshot {
        const dialogue = this.registry.dialogues[dialogueId];
        if (!dialogue) {
            return this.buildSnapshotAndClearTransients();
        }

        if (!this.enterDialogue(dialogue.id)) {
            return this.buildSnapshotAndClearTransients();
        }

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Player clicked on a map location to travel.
     *
     * Changes location, advances time based on distance, and checks for triggered dialogues.
     *
     * @param locationId - ID of the destination location
     * @returns New snapshot at the new location
     */
    travelTo(locationId: string): Snapshot {
        if (!this.state.mapEnabled) {
            return this.buildSnapshotAndClearTransients();
        }

        const currentLocation =
            this.registry.locations[this.state.currentLocation];
        const destinationLocation = this.registry.locations[locationId];
        if (!currentLocation || !destinationLocation) {
            return this.buildSnapshotAndClearTransients();
        }

        const map = this.findMapContainingLocation(this.state.currentLocation);
        if (!map) {
            return this.buildSnapshotAndClearTransients();
        }

        // Find locations on the map
        const currentLoc = map.locations.find(
            (l) => l.id === this.state.currentLocation
        );
        const destLoc = map.locations.find((l) => l.id === locationId);

        if (!currentLoc || !destLoc) {
            return this.buildSnapshotAndClearTransients();
        }

        // Turning distance into hours needs a positive, finite scale.
        // Validation tells the author about a bad scale; the engine refuses
        // the trip so the game clock always stays a real number.
        if (!Number.isFinite(map.scale) || map.scale <= 0) {
            return this.buildSnapshotAndClearTransients();
        }

        // Calculate travel time: distance × scale
        const distance = Math.sqrt(
            Math.pow(destLoc.x - currentLoc.x, 2) +
                Math.pow(destLoc.y - currentLoc.y, 2)
        );
        const travelTime = Math.max(1, Math.round(distance / map.scale));

        // Update location and time
        const newHour = this.state.currentTime.hour + travelTime;
        const daysToAdd = Math.floor(newHour / 24);
        const finalHour = newHour % 24;

        const updatedCharacterState = { ...this.state.characterState };
        for (const [charId, charState] of Object.entries(
            updatedCharacterState
        )) {
            if (charState.inParty) {
                updatedCharacterState[charId] = {
                    ...charState,
                    location: locationId,
                };
            }
        }

        this.state = {
            ...this.state,
            currentLocation: locationId,
            dialogueState: null,
            musicOverride: null,
            currentTime: {
                day: this.state.currentTime.day + daysToAdd,
                hour: finalHour,
            },
            characterState: updatedCharacterState,
        };

        // Check for triggered dialogues and interludes at new location
        this.checkTriggeredDialogues();
        this.checkTriggeredInterludes();

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Player wrote a note.
     *
     * Adds a note to the player's journal.
     *
     * @param title - Note title
     * @param text - Note content
     * @returns New snapshot with note added
     */
    writeNote(title: string, text: string): Snapshot {
        const note = {
            id: `note_${Date.now()}`,
            title,
            text,
        };

        this.state = {
            ...this.state,
            playerNotes: [...this.state.playerNotes, note],
        };

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Player deleted a note.
     *
     * Removes a note from the player's journal.
     *
     * @param noteId - ID of the note to delete
     * @returns New snapshot with note removed
     */
    deleteNote(noteId: string): Snapshot {
        this.state = {
            ...this.state,
            playerNotes: this.state.playerNotes.filter((n) => n.id !== noteId),
        };

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Change the current language.
     *
     * Updates the locale and rebuilds the snapshot with new translations.
     *
     * @param locale - Language code (e.g., "en", "es")
     * @returns New snapshot with updated locale
     */
    setLocale(locale: string): Snapshot {
        this.state = {
            ...this.state,
            currentLocale: locale,
        };

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Get the current snapshot without making any changes.
     *
     * Useful for initial rendering or refreshing the view.
     *
     * @returns Current snapshot
     */
    getSnapshot(): Snapshot {
        return buildSnapshot(this.state, this.registry);
    }

    /**
     * Clear the current pending interlude and return the updated snapshot.
     *
     * Renderers call this after the player dismisses an interlude.
     *
     * @returns Current snapshot with no pending interlude
     */
    dismissInterlude(): Snapshot {
        this.state = {
            ...this.state,
            pendingInterlude: null,
        };

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Player clicked to advance past a text-only dialogue node.
     *
     * Called when the current node has text but no choices. Advances to the
     * next node (via IF branch or next). If no next exists, ends the
     * dialogue.
     *
     * @returns New snapshot after advancing
     */
    continueDialogue(): Snapshot {
        if (!this.state.dialogueState) {
            return this.buildSnapshotAndClearTransients();
        }

        const dialogue =
            this.registry.dialogues[this.state.dialogueState.dialogueId];
        const currentNode = dialogue?.nodes.find(
            (n) => n.id === this.state.dialogueState!.nodeId
        );

        if (!dialogue || !currentNode) {
            this.state = { ...this.state, dialogueState: null };
            return this.buildSnapshotAndClearTransients();
        }

        if (this.hasVisibleChoices(currentNode)) {
            return this.buildSnapshotAndClearTransients();
        }

        const resolvedNext = this.resolveNextNode(currentNode);
        if (this.initializePendingDialogueRedirect()) {
            return this.buildSnapshotAndClearTransients();
        }
        if (!resolvedNext) {
            this.state = { ...this.state, dialogueState: null };
            return this.buildSnapshotAndClearTransients();
        }

        const nextNode = dialogue.nodes.find((n) => n.id === resolvedNext);
        if (!nextNode) {
            this.state = { ...this.state, dialogueState: null };
            return this.buildSnapshotAndClearTransients();
        }

        this.emitTransition(dialogue.id, currentNode.id, resolvedNext);
        this.state = {
            ...this.state,
            dialogueState: { dialogueId: dialogue.id, nodeId: resolvedNext },
        };
        this.emitNodeEnter(dialogue.id, resolvedNext);

        if (nextNode.effects) {
            this.state = this.applyTracedEffects(nextNode.effects, this.state);
        }

        // startDialogue effect: initialize the new dialogue
        if (this.initializePendingDialogueRedirect()) {
            return this.buildSnapshotAndClearTransients();
        }

        this.settleAtNode(dialogue.id, nextNode);

        // settleAtNode may have triggered a startDialogue via the silent-advance loop
        if (this.initializePendingDialogueRedirect()) {
            return this.buildSnapshotAndClearTransients();
        }

        return this.buildSnapshotAndClearTransients();
    }

    // ===========================================================================
    // Debug / Inspection / Trace API
    //
    // These methods exist for tooling (Doodle Studio's playtest, state
    // inspector, and debug trace). They are additive: they never change how a
    // normal game runs. Debug writes route through the same effect pipeline as
    // in-game effects, so a debug "set flag" is the exact same code path as a
    // SET flag in a dialogue.
    // ===========================================================================

    /**
     * Get a deep, read-only copy of the current game state.
     *
     * Returns a clone so callers (e.g. a state inspector) can read every field
     * without any risk of mutating engine internals. Changes to the returned
     * object never reach the engine; use applyDebugEffect() to change state.
     *
     * @returns A deep clone of the current GameState
     */
    getState(): GameState {
        return structuredClone(this.state);
    }

    /**
     * Get a deep copy of the loaded content registry.
     *
     * Changes to the returned object do not affect the content used by the
     * running engine.
     *
     * @returns A deep clone of the current ContentRegistry
     */
    getRegistry(): ContentRegistry {
        return structuredClone(this.registry);
    }

    /**
     * Attach or detach a debug-trace sink.
     *
     * While a sink is attached, the engine reports its decisions (nodes
     * entered, conditions evaluated with the values they saw, effects applied,
     * transitions, and hidden choices with reasons). Pass null to detach.
     *
     * When no sink is attached, tracing is a no-op: normal behavior and
     * performance are identical to running without this call.
     *
     * @param sink - The trace sink, or null to stop tracing
     */
    setTrace(sink: TraceSink | null): void {
        this.trace = sink;
        this.traceSeq = 0;
    }

    /**
     * Start a dialogue at an arbitrary node.
     *
     * Playtest uses this to begin at any node, not just the dialogue's start
     * node. The node's effects run and, if it is a silent node, it
     * auto-advances — exactly as if the engine had arrived there in normal
     * play. If the dialogue or node does not exist, the state is unchanged.
     *
     * @param dialogueId - ID of the dialogue to start
     * @param nodeId - ID of the node to begin at
     * @returns Snapshot after entering the node
     */
    startDialogueAt(dialogueId: string, nodeId: string): Snapshot {
        const dialogue = this.registry.dialogues[dialogueId];
        if (!dialogue) {
            this.emitError(`Dialogue not found: ${dialogueId}`);
            return this.buildSnapshotAndClearTransients();
        }

        const node = dialogue.nodes.find((n) => n.id === nodeId);
        if (!node) {
            this.emitError(`Node not found: ${dialogueId}/${nodeId}`);
            return this.buildSnapshotAndClearTransients();
        }

        this.state = {
            ...this.state,
            dialogueState: { dialogueId, nodeId: node.id },
        };
        this.emitNodeEnter(dialogueId, node.id);

        if (node.effects) {
            this.state = this.applyTracedEffects(node.effects, this.state);
        }
        if (this.initializePendingDialogueRedirect()) {
            return this.buildSnapshotAndClearTransients();
        }

        if (node.choices.length === 0) {
            this.settleAtNode(dialogue.id, node);
            this.initializePendingDialogueRedirect();
        }

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Apply a single effect through the official effect pipeline, for debugging.
     *
     * This is the principled way for a state inspector to change test state:
     * "set this flag", "give this item", "advance the quest". It routes through
     * the same applyEffects the runtime uses, so debug writes behave identically
     * to in-game effects. It never touches project files — only this session's
     * state.
     *
     * @param effect - The effect to apply
     * @returns Snapshot after applying the effect
     */
    applyDebugEffect(effect: Effect): Snapshot {
        this.state = this.applyTracedEffects([effect], this.state);
        // A debug startDialogue may leave a pending redirect (nodeId ''); settle it.
        this.initializePendingDialogueRedirect();
        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Teleport the player to any location, bypassing map travel.
     *
     * Unlike the goToLocation effect (which travels within the current map),
     * teleport reaches any location so a tester can jump anywhere. Party members
     * come along, matching goToLocation. No travel time is added and location
     * triggers do not fire — this is a debug jump, not in-game travel. Use
     * applyDebugEffect({ type: 'goToLocation', ... }) for the in-game path.
     *
     * @param locationId - Destination location ID
     * @returns Snapshot at the new location
     */
    teleport(locationId: string): Snapshot {
        const updatedCharacterState = { ...this.state.characterState };
        for (const [charId, charState] of Object.entries(
            updatedCharacterState
        )) {
            if (charState.inParty) {
                updatedCharacterState[charId] = {
                    ...charState,
                    location: locationId,
                };
            }
        }

        this.state = {
            ...this.state,
            currentLocation: locationId,
            characterState: updatedCharacterState,
        };

        return this.buildSnapshotAndClearTransients();
    }

    /**
     * Explain, for the current dialogue node, which choices are hidden and why.
     *
     * Answers the playtest question "why can't I see this choice?" For each
     * choice on the current node, reports whether it is visible and — for a
     * hidden one — the first requirement that failed and the state value it saw.
     * This reads state only; it changes nothing.
     *
     * @returns One entry per choice on the current node, in author order
     */
    explainChoices(): ChoiceVisibility[] {
        if (!this.state.dialogueState) {
            return [];
        }

        const dialogue =
            this.registry.dialogues[this.state.dialogueState.dialogueId];
        const node = dialogue?.nodes.find(
            (n) => n.id === this.state.dialogueState?.nodeId
        );
        if (!node) {
            return [];
        }

        return node.choices.map((choice) => {
            if (!choice.conditions || choice.conditions.length === 0) {
                return { choiceId: choice.id, visible: true };
            }

            // First failing condition is the reason it's hidden (AND logic).
            for (const condition of choice.conditions) {
                if (!evaluateCondition(condition, this.state)) {
                    return {
                        choiceId: choice.id,
                        visible: false,
                        failedCondition: condition,
                        resolvedValues: describeConditionValues(
                            condition,
                            this.state
                        ),
                    };
                }
            }

            return { choiceId: choice.id, visible: true };
        });
    }

    // ===========================================================================
    // Internal Helper Methods
    // ===========================================================================

    // ---------------------------------------------------------------------------
    // Trace emitters — all no-ops when no sink is attached.
    // ---------------------------------------------------------------------------

    private emit(event: TraceEvent): void {
        if (!this.trace) {
            return;
        }
        switch (event.kind) {
            case 'nodeEnter':
                this.trace.onNodeEnter?.(event);
                break;
            case 'condition':
                this.trace.onCondition?.(event);
                break;
            case 'effect':
                this.trace.onEffect?.(event);
                break;
            case 'transition':
                this.trace.onTransition?.(event);
                break;
            case 'choiceFiltered':
                this.trace.onChoiceFiltered?.(event);
                break;
            case 'error':
                this.trace.onError?.(event);
                break;
        }
    }

    private emitNodeEnter(dialogueId: string, nodeId: string): void {
        if (!this.trace) {
            return;
        }
        this.emit({
            kind: 'nodeEnter',
            seq: this.traceSeq++,
            dialogueId,
            nodeId,
        });
    }

    private emitTransition(
        dialogueId: string,
        fromNode: string,
        toNode: string | null,
        viaBranch?: number
    ): void {
        if (!this.trace) {
            return;
        }
        this.emit({
            kind: 'transition',
            seq: this.traceSeq++,
            dialogueId,
            fromNode,
            toNode,
            ...(viaBranch !== undefined ? { viaBranch } : {}),
        });
    }

    private emitError(message: string): void {
        if (!this.trace) {
            return;
        }
        this.emit({ kind: 'error', seq: this.traceSeq++, message });
    }

    /**
     * Emit a choiceFiltered event for each hidden choice on the current node.
     * Called only while tracing, just before a snapshot is built, so a debug
     * consumer sees the reason a choice is unavailable at the resting node.
     */
    private emitChoiceFilters(): void {
        for (const choice of this.explainChoices()) {
            if (!choice.visible && choice.failedCondition) {
                this.emit({
                    kind: 'choiceFiltered',
                    seq: this.traceSeq++,
                    dialogueId: this.state.dialogueState!.dialogueId,
                    nodeId: this.state.dialogueState!.nodeId,
                    choiceId: choice.choiceId,
                    failedCondition: choice.failedCondition,
                    resolvedValues: choice.resolvedValues ?? {},
                });
            }
        }
    }

    /**
     * Apply effects, emitting one trace event per effect with the fields it
     * changed. When tracing is off this is a straight call to applyEffects with
     * no extra work, so behavior and performance are unchanged.
     */
    private applyTracedEffects(effects: Effect[], state: GameState): GameState {
        if (!this.trace) {
            return applyEffects(effects, state);
        }

        let current = state;
        for (const effect of effects) {
            const before = current;
            current = applyEffects([effect], current);
            this.emit({
                kind: 'effect',
                seq: this.traceSeq++,
                effect,
                delta: computeStateDelta(before, current),
            });
        }
        return current;
    }

    /**
     * Build a snapshot and clear transient state (notifications, pendingSounds).
     * Transient state is data that should only appear in one snapshot.
     */
    private buildSnapshotAndClearTransients(): Snapshot {
        // While tracing, record why each hidden choice on the resting node is
        // hidden, so the debug trace can answer "why can't I see this choice?".
        if (this.trace) {
            this.emitChoiceFilters();
        }

        const snapshot = buildSnapshot(this.state, this.registry);

        // Clear transient fields after building snapshot
        this.state = {
            ...this.state,
            notifications: [],
            pendingSounds: [],
            pendingVideo: null,
            pendingInterlude: null,
        };

        // The action is over; the next one gets a fresh routing allowance.
        this.autoSteps = 0;

        return snapshot;
    }

    /**
     * Count one automatic dialogue step (a silent-node advance or a
     * START dialogue redirect). Returns true while the current action is
     * within its allowance. When the allowance runs out, the dialogue is
     * ended and a trace error is reported, so the game keeps responding.
     */
    private takeAutoStep(dialogueId: string): boolean {
        this.autoSteps++;
        if (this.autoSteps <= MAX_AUTO_STEPS) {
            return true;
        }
        this.emitError(
            `Dialogue "${dialogueId}" ended after ${MAX_AUTO_STEPS} automatic steps. ` +
                `Check its GOTO and START dialogue routing for a loop.`
        );
        this.state = { ...this.state, dialogueState: null };
        return false;
    }

    private hasVisibleChoices(node: DialogueNode): boolean {
        return node.choices.some((choice) => {
            if (!choice.conditions || choice.conditions.length === 0) {
                return true;
            }
            return evaluateConditions(choice.conditions, this.state);
        });
    }

    private enterDialogue(dialogueId: string): boolean {
        const dialogue = this.registry.dialogues[dialogueId];
        if (!dialogue) {
            return false;
        }

        const startNode = dialogue.nodes.find(
            (n) => n.id === dialogue.startNode
        );
        if (!startNode) {
            return false;
        }

        this.state = {
            ...this.state,
            dialogueState: {
                dialogueId: dialogue.id,
                nodeId: startNode.id,
            },
        };
        this.emitNodeEnter(dialogue.id, startNode.id);

        if (startNode.effects) {
            this.state = this.applyTracedEffects(startNode.effects, this.state);
        }
        if (this.initializePendingDialogueRedirect()) {
            return true;
        }

        if (startNode.choices.length === 0) {
            this.settleAtNode(dialogue.id, startNode);
            this.initializePendingDialogueRedirect();
        }

        return true;
    }

    private initializePendingDialogueRedirect(): boolean {
        if (this.state.dialogueState?.nodeId !== '') {
            return false;
        }

        const dialogueId = this.state.dialogueState.dialogueId;
        if (!this.takeAutoStep(dialogueId)) {
            // Out of automatic steps; the dialogue has been ended.
            return true;
        }
        return this.enterDialogue(dialogueId);
    }

    private findMapContainingLocation(locationId: string): GameMap | null {
        return (
            Object.values(this.registry.maps).find((map) =>
                map.locations.some((location) => location.id === locationId)
            ) ?? null
        );
    }

    /**
     * Settle at a node after entering it and applying its effects.
     *
     * - Node has text: show it, wait for player to call continueDialogue()
     * - Node has choices (no text): stay so the player can choose
     * - Silent (no text, no choices): auto-advance through the chain until
     *   we reach a node with text/choices or the end of the dialogue
     *
     * Handles the case where effects (e.g. endDialogue) may have already
     * nulled dialogueState; restores it when the node has text to display.
     */
    private settleAtNode(dialogueId: string, node: DialogueNode): void {
        // Node has text: show it, wait for player click
        if (node.text) {
            this.state = {
                ...this.state,
                dialogueState: { dialogueId, nodeId: node.id },
            };
            return;
        }

        // Node has choices (no text): stay, show choices
        if (node.choices.length > 0) {
            return;
        }

        // Silent node: auto-advance through the chain
        const dialogue = this.registry.dialogues[dialogueId];
        if (!dialogue) {
            this.state = { ...this.state, dialogueState: null };
            return;
        }

        let currentNode = node;
        while (true) {
            if (!this.takeAutoStep(dialogueId)) {
                return;
            }
            const nextId = this.resolveNextNode(currentNode);
            if (this.state.dialogueState?.nodeId === '') {
                return;
            }
            if (!nextId) {
                this.state = { ...this.state, dialogueState: null };
                return;
            }

            const nextNode = dialogue.nodes.find((n) => n.id === nextId);
            if (!nextNode) {
                this.state = { ...this.state, dialogueState: null };
                return;
            }

            this.emitTransition(dialogueId, currentNode.id, nextId);
            this.state = {
                ...this.state,
                dialogueState: { dialogueId, nodeId: nextId },
            };
            this.emitNodeEnter(dialogueId, nextId);

            if (nextNode.effects) {
                this.state = this.applyTracedEffects(
                    nextNode.effects,
                    this.state
                );
            }

            // startDialogue effect redirects to a new dialogue; signal to caller
            if (this.state.dialogueState?.nodeId === '') {
                return;
            }

            // Text or choices: show this node and stop
            if (nextNode.text || nextNode.choices.length > 0) {
                if (nextNode.text) {
                    // Restore in case effects (e.g. endDialogue) changed dialogueState
                    this.state = {
                        ...this.state,
                        dialogueState: { dialogueId, nodeId: nextNode.id },
                    };
                }
                return;
            }

            currentNode = nextNode;
        }
    }

    /**
     * Resolve the next node ID from a dialogue node.
     *
     * Evaluates IF branches in order. The first passing branch runs its
     * branch effects, then routes to its branch next or falls through to
     * node.next. If no branch passes, falls through to node.next.
     * Returns null if neither exists (end dialogue).
     *
     * @param node - The dialogue node to resolve next from
     * @returns Next node ID, or null to end dialogue
     */
    private resolveNextNode(node: DialogueNode): string | null {
        // Check IF branches in order; first passing branch wins.
        if (node.conditionalBranches && node.conditionalBranches.length > 0) {
            for (let i = 0; i < node.conditionalBranches.length; i++) {
                const conditionalBranch = node.conditionalBranches[i];
                if (
                    this.traceCondition(conditionalBranch.condition, {
                        type: 'branch',
                        branchIndex: i,
                    })
                ) {
                    if (conditionalBranch.effects) {
                        this.state = this.applyTracedEffects(
                            conditionalBranch.effects,
                            this.state
                        );
                    }

                    if (this.state.dialogueState === null) {
                        return null;
                    }

                    return conditionalBranch.next ?? node.next ?? null;
                }
            }
        }

        // Fall through to default next, or null if none
        return node.next ?? null;
    }

    /**
     * Evaluate a single condition, emitting a condition trace event when a sink
     * is attached. The returned value is exactly what evaluateCondition returns,
     * so runtime behavior is unchanged whether tracing is on or off.
     */
    private traceCondition(
        condition: Condition,
        context: ConditionContext
    ): boolean {
        const result = evaluateCondition(condition, this.state);
        if (this.trace) {
            this.emit({
                kind: 'condition',
                seq: this.traceSeq++,
                condition,
                resolvedValues: describeConditionValues(condition, this.state),
                result,
                context,
            });
        }
        return result;
    }

    /**
     * Check for dialogues that should auto-trigger at the current location.
     *
     * If a dialogue matches the current location and all its conditions pass,
     * start that dialogue.
     *
     * This is called after location changes (newGame, travelTo).
     */
    private checkTriggeredDialogues(): void {
        for (const dialogue of Object.values(this.registry.dialogues)) {
            // Check if dialogue triggers at current location
            if (dialogue.triggerLocation !== this.state.currentLocation) {
                continue;
            }

            // Check if conditions pass
            if (
                dialogue.conditions &&
                !evaluateConditions(dialogue.conditions, this.state)
            ) {
                continue;
            }

            if (!this.enterDialogue(dialogue.id)) {
                continue;
            }

            // Only trigger one dialogue at a time
            break;
        }
    }

    /**
     * Check for interludes that should auto-trigger at the current location.
     *
     * If an interlude matches the current location and all its conditions pass,
     * queue that interlude to show.
     *
     * This is called after location changes (newGame, travelTo).
     */
    private checkTriggeredInterludes(): void {
        for (const interlude of Object.values(this.registry.interludes)) {
            if (interlude.triggerLocation !== this.state.currentLocation) {
                continue;
            }

            if (
                interlude.triggerConditions &&
                !evaluateConditions(interlude.triggerConditions, this.state)
            ) {
                continue;
            }

            this.state = {
                ...this.state,
                pendingInterlude: interlude.id,
            };

            // Apply interlude effects (e.g. setFlag to prevent re-triggering on next visit)
            if (interlude.effects) {
                this.state = applyEffects(interlude.effects, this.state);
            }

            // Only trigger one interlude at a time
            break;
        }
    }
}

/**
 * Visibility of a single choice on the current node, from explainChoices().
 * A hidden choice carries the first requirement that failed and the state
 * value that requirement saw.
 */
export interface ChoiceVisibility {
    /** The choice's generated ID */
    choiceId: string;
    /** Whether the choice would be shown to the player */
    visible: boolean;
    /** For a hidden choice, the first requirement that failed */
    failedCondition?: Condition;
    /** For a hidden choice, the state values the failing requirement read */
    resolvedValues?: Record<string, unknown>;
}

/**
 * Compute a shallow delta between two states: for each top-level GameState
 * field whose reference changed, record its before and after value. Used only
 * for trace events, so it runs only while a trace sink is attached.
 */
function computeStateDelta(before: GameState, after: GameState): StateDelta {
    const delta: StateDelta = {};
    const keys = Object.keys(after) as (keyof GameState)[];
    for (const key of keys) {
        if (before[key] !== after[key]) {
            delta[key] = { before: before[key], after: after[key] };
        }
    }
    return delta;
}

/**
 * Create an empty game state suitable for constructing an Engine before
 * newGame() is called.
 */
export function createInitialState(currentLocale = 'en'): GameState {
    return {
        currentLocation: '',
        currentTime: { day: 1, hour: 0 },
        flags: {},
        variables: {},
        inventory: [],
        questProgress: {},
        unlockedJournalEntries: [],
        playerNotes: [],
        dialogueState: null,
        characterState: {},
        itemLocations: {},
        mapEnabled: true,
        notifications: [],
        pendingSounds: [],
        musicOverride: null,
        pendingVideo: null,
        pendingInterlude: null,
        currentLocale,
    };
}
