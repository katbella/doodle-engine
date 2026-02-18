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

import type { ContentRegistry } from "../types/registry";
import type { GameState, CharacterState } from "../types/state";
import type { GameConfig, DialogueNode } from "../types/entities";
import type { Snapshot } from "../types/snapshot";
import type { SaveData } from "../types/save";
import { buildSnapshot } from "../snapshot";
import { applyEffects } from "../effects";
import { evaluateConditions } from "../conditions";

/**
 * The Doodle Engine.
 *
 * Manages game state, processes actions, and produces snapshots.
 */
export class Engine {
  private registry: ContentRegistry;
  private state: GameState;

  /**
   * Create a new engine instance.
   *
   * @param registry - Content registry with all game entities
   * @param state - Initial game state
   */
  constructor(registry: ContentRegistry, state: GameState) {
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
    for (const [id, character] of Object.entries(this.registry.characters)) {
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
      pendingVideo: null,
      pendingInterlude: null,
      currentLocale: "en", // Default locale
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
    // In a real implementation, you'd handle version migration here
    // For now, just restore the state directly
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
      version: "1.0",
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
      (n) => n.id === this.state.dialogueState?.nodeId,
    );
    if (!currentNode) {
      return this.buildSnapshotAndClearTransients();
    }

    const choice = currentNode.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return this.buildSnapshotAndClearTransients();
    }

    // Apply choice effects
    if (choice.effects) {
      this.state = applyEffects(choice.effects, this.state);
    }

    // If a startDialogue effect fired, nodeId will be '' — initialize the new dialogue
    if (this.state.dialogueState?.nodeId === "") {
      return this.initDialogue(this.state.dialogueState.dialogueId);
    }

    // Move to next node specified by choice
    const nextNode = dialogue.nodes.find((n) => n.id === choice.next);
    if (!nextNode) {
      // No next node - end dialogue
      this.state = {
        ...this.state,
        dialogueState: null,
      };
      return this.buildSnapshotAndClearTransients();
    }

    // Set dialogue state to this node
    this.state = {
      ...this.state,
      dialogueState: {
        dialogueId: dialogue.id,
        nodeId: nextNode.id,
      },
    };

    // Apply node effects first (before evaluating conditionalNext)
    if (nextNode.effects) {
      this.state = applyEffects(nextNode.effects, this.state);
    }

    // If node has no choices, auto-advance using conditionalNext or next
    if (nextNode.choices.length === 0) {
      const resolvedNext = this.resolveNextNode(nextNode);
      if (resolvedNext) {
        this.state = {
          ...this.state,
          dialogueState: {
            dialogueId: dialogue.id,
            nodeId: resolvedNext,
          },
        };
      } else {
        // No next - end dialogue
        this.state = {
          ...this.state,
          dialogueState: null,
        };
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

    // Find the start node
    const startNode = dialogue.nodes.find((n) => n.id === dialogue.startNode);
    if (!startNode) {
      return this.buildSnapshotAndClearTransients();
    }

    // Start dialogue
    this.state = {
      ...this.state,
      dialogueState: {
        dialogueId: dialogue.id,
        nodeId: startNode.id,
      },
    };

    // Apply start node effects
    if (startNode.effects) {
      this.state = applyEffects(startNode.effects, this.state);
    }

    // If start node has no choices, auto-advance using conditionalNext or next
    if (startNode.choices.length === 0) {
      const resolvedNext = this.resolveNextNode(startNode);
      if (resolvedNext) {
        this.state = {
          ...this.state,
          dialogueState: {
            dialogueId: dialogue.id,
            nodeId: resolvedNext,
          },
        };
      } else {
        // No next - end dialogue
        this.state = {
          ...this.state,
          dialogueState: null,
        };
      }
    }

    return this.buildSnapshotAndClearTransients();
  }

  /**
   * Player clicked on an item to pick it up.
   *
   * Adds the item to inventory if it's at the current location.
   *
   * @param itemId - ID of the item to take
   * @returns New snapshot with item in inventory
   */
  takeItem(itemId: string): Snapshot {
    // Check if item is at current location
    if (this.state.itemLocations[itemId] !== this.state.currentLocation) {
      return this.buildSnapshotAndClearTransients();
    }

    // Add to inventory
    this.state = {
      ...this.state,
      inventory: [...this.state.inventory, itemId],
      itemLocations: {
        ...this.state.itemLocations,
        [itemId]: "inventory",
      },
    };

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

    // Find the map that contains both current and destination locations
    // For simplicity, we'll just use the first map
    const mapIds = Object.keys(this.registry.maps);
    if (mapIds.length === 0) {
      return this.buildSnapshotAndClearTransients();
    }

    const map = this.registry.maps[mapIds[0]];
    if (!map) {
      return this.buildSnapshotAndClearTransients();
    }

    // Find locations on the map
    const currentLoc = map.locations.find(
      (l) => l.id === this.state.currentLocation,
    );
    const destLoc = map.locations.find((l) => l.id === locationId);

    if (!currentLoc || !destLoc) {
      return this.buildSnapshotAndClearTransients();
    }

    // Calculate travel time: distance × scale
    const distance = Math.sqrt(
      Math.pow(destLoc.x - currentLoc.x, 2) +
        Math.pow(destLoc.y - currentLoc.y, 2),
    );
    const travelTime = Math.round(distance * map.scale);

    // Update location and time
    const newHour = this.state.currentTime.hour + travelTime;
    const daysToAdd = Math.floor(newHour / 24);
    const finalHour = newHour % 24;

    this.state = {
      ...this.state,
      currentLocation: locationId,
      dialogueState: null,
      currentTime: {
        day: this.state.currentTime.day + daysToAdd,
        hour: finalHour,
      },
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
    return this.buildSnapshotAndClearTransients();
  }

  // ===========================================================================
  // Internal Helper Methods
  // ===========================================================================

  /**
   * Build a snapshot and clear transient state (notifications, pendingSounds).
   * Transient state is data that should only appear in one snapshot.
   */
  private buildSnapshotAndClearTransients(): Snapshot {
    const snapshot = buildSnapshot(this.state, this.registry);

    // Clear transient fields after building snapshot
    this.state = {
      ...this.state,
      notifications: [],
      pendingSounds: [],
      pendingVideo: null,
      pendingInterlude: null,
    };

    return snapshot;
  }

  /**
   * Resolve the next node ID from a dialogue node.
   *
   * Evaluates conditionalNext (IF blocks) in order, returning the first passing condition's next node.
   * Falls through to node.next if no conditionalNext passes.
   * Returns null if neither exists (end dialogue).
   *
   * @param node - The dialogue node to resolve next from
   * @returns Next node ID, or null to end dialogue
   */
  private resolveNextNode(node: DialogueNode): string | null {
    // Check conditionalNext (IF blocks) in order
    if (node.conditionalNext && node.conditionalNext.length > 0) {
      for (const conditionalBranch of node.conditionalNext) {
        if (evaluateConditions([conditionalBranch.condition], this.state)) {
          // First passing condition wins
          return conditionalBranch.next;
        }
      }
    }

    // Fall through to default next, or null if none
    return node.next ?? null;
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

      // Find start node
      const startNode = dialogue.nodes.find((n) => n.id === dialogue.startNode);
      if (!startNode) {
        continue;
      }

      // Start this dialogue
      this.state = {
        ...this.state,
        dialogueState: {
          dialogueId: dialogue.id,
          nodeId: startNode.id,
        },
      };

      // Apply start node effects
      if (startNode.effects) {
        this.state = applyEffects(startNode.effects, this.state);
      }

      // If start node has no choices, auto-advance using conditionalNext or next
      if (startNode.choices.length === 0) {
        const resolvedNext = this.resolveNextNode(startNode);
        if (resolvedNext) {
          this.state = {
            ...this.state,
            dialogueState: {
              dialogueId: dialogue.id,
              nodeId: resolvedNext,
            },
          };
        } else {
          // No next - end dialogue
          this.state = {
            ...this.state,
            dialogueState: null,
          };
        }
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
