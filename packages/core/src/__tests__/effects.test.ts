/**
 * Tests for effect processors.
 * Each effect type is tested in isolation to verify correct state mutations.
 */

import { describe, it, expect } from "vitest";
import { applyEffect, applyEffects } from "../effects";
import type { Effect } from "../types/effects";
import type { GameState } from "../types/state";

// Helper to create a minimal game state for testing
function createTestState(): GameState {
  return {
    currentLocation: "tavern",
    currentTime: { day: 1, hour: 14 },
    flags: { metBartender: true },
    variables: { gold: 100, reputation: 5 },
    inventory: ["rusty_key"],
    questProgress: {},
    unlockedJournalEntries: [],
    playerNotes: [],
    dialogueState: null,
    characterState: {
      bartender: {
        location: "tavern",
        inParty: false,
        relationship: 5,
        stats: { health: 100 },
      },
      pixel_the_dog: {
        location: "camp",
        inParty: true,
        relationship: 8,
        stats: { level: 3, health: 50 },
      },
    },
    itemLocations: {
      rusty_key: "inventory",
      sword: "armory",
    },
    mapEnabled: true,
    notifications: [],
    pendingSounds: [],
    pendingVideo: null,
    pendingInterlude: null,
    currentLocale: "en",
  };
}

describe("Effect Processors", () => {
  describe("setFlag", () => {
    it("should set a flag to true", () => {
      const effect: Effect = { type: "setFlag", flag: "doorUnlocked" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.flags.doorUnlocked).toBe(true);
      expect(newState).not.toBe(state); // Immutability check
    });

    it("should not mutate original state", () => {
      const effect: Effect = { type: "setFlag", flag: "doorUnlocked" };
      const state = createTestState();
      applyEffect(effect, state);

      expect(state.flags.doorUnlocked).toBeUndefined();
    });
  });

  describe("clearFlag", () => {
    it("should set a flag to false", () => {
      const effect: Effect = { type: "clearFlag", flag: "metBartender" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.flags.metBartender).toBe(false);
    });
  });

  describe("setVariable", () => {
    it("should set a numeric variable", () => {
      const effect: Effect = {
        type: "setVariable",
        variable: "gold",
        value: 250,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.variables.gold).toBe(250);
    });

    it("should set a string variable", () => {
      const effect: Effect = {
        type: "setVariable",
        variable: "playerName",
        value: "Hero",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.variables.playerName).toBe("Hero");
    });
  });

  describe("addVariable", () => {
    it("should add to an existing numeric variable", () => {
      const effect: Effect = {
        type: "addVariable",
        variable: "gold",
        value: 50,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.variables.gold).toBe(150);
    });

    it("should subtract from an existing numeric variable", () => {
      const effect: Effect = {
        type: "addVariable",
        variable: "gold",
        value: -30,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.variables.gold).toBe(70);
    });

    it("should initialize variable if it does not exist", () => {
      const effect: Effect = {
        type: "addVariable",
        variable: "newVar",
        value: 100,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.variables.newVar).toBe(100);
    });

    it("should not add to string variables", () => {
      const effect: Effect = {
        type: "addVariable",
        variable: "playerName",
        value: 10,
      };
      const state = { ...createTestState(), variables: { playerName: "Hero" } };
      const newState = applyEffect(effect, state);

      // Should initialize to the value instead
      expect(newState.variables.playerName).toBe(10);
    });
  });

  describe("addItem", () => {
    it("should add item to inventory", () => {
      const effect: Effect = { type: "addItem", itemId: "letter" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.inventory).toContain("letter");
      expect(newState.itemLocations.letter).toBe("inventory");
    });

    it("should not add duplicate items", () => {
      const effect: Effect = { type: "addItem", itemId: "rusty_key" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.inventory.filter((id) => id === "rusty_key").length).toBe(
        1,
      );
    });
  });

  describe("removeItem", () => {
    it("should remove item from inventory", () => {
      const effect: Effect = { type: "removeItem", itemId: "rusty_key" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.inventory).not.toContain("rusty_key");
    });
  });

  describe("moveItem", () => {
    it("should move item to a location", () => {
      const effect: Effect = {
        type: "moveItem",
        itemId: "rusty_key",
        locationId: "cellar",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.inventory).not.toContain("rusty_key");
      expect(newState.itemLocations.rusty_key).toBe("cellar");
    });
  });

  describe("goToLocation", () => {
    it("should change current location", () => {
      const effect: Effect = { type: "goToLocation", locationId: "market" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.currentLocation).toBe("market");
    });
  });

  describe("advanceTime", () => {
    it("should advance time within same day", () => {
      const effect: Effect = { type: "advanceTime", hours: 3 };
      const state = createTestState(); // day: 1, hour: 14
      const newState = applyEffect(effect, state);

      expect(newState.currentTime).toEqual({ day: 1, hour: 17 });
    });

    it("should roll over to next day", () => {
      const effect: Effect = { type: "advanceTime", hours: 12 };
      const state = createTestState(); // day: 1, hour: 14
      const newState = applyEffect(effect, state);

      expect(newState.currentTime).toEqual({ day: 2, hour: 2 });
    });

    it("should handle multiple day rollover", () => {
      const effect: Effect = { type: "advanceTime", hours: 48 };
      const state = createTestState(); // day: 1, hour: 14
      const newState = applyEffect(effect, state);

      expect(newState.currentTime).toEqual({ day: 3, hour: 14 });
    });
  });

  describe("setQuestStage", () => {
    it("should set quest to a specific stage", () => {
      const effect: Effect = {
        type: "setQuestStage",
        questId: "odd_jobs",
        stageId: "started",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.questProgress.odd_jobs).toBe("started");
    });

    it("should update existing quest stage", () => {
      const effect: Effect = {
        type: "setQuestStage",
        questId: "odd_jobs",
        stageId: "complete",
      };
      const state = {
        ...createTestState(),
        questProgress: { odd_jobs: "started" },
      };
      const newState = applyEffect(effect, state);

      expect(newState.questProgress.odd_jobs).toBe("complete");
    });
  });

  describe("addJournalEntry", () => {
    it("should add journal entry", () => {
      const effect: Effect = { type: "addJournalEntry", entryId: "chapter_1" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.unlockedJournalEntries).toContain("chapter_1");
    });

    it("should not add duplicate entries", () => {
      const effect: Effect = { type: "addJournalEntry", entryId: "chapter_1" };
      const state = {
        ...createTestState(),
        unlockedJournalEntries: ["chapter_1"],
      };
      const newState = applyEffect(effect, state);

      expect(
        newState.unlockedJournalEntries.filter((id) => id === "chapter_1")
          .length,
      ).toBe(1);
    });
  });

  describe("startDialogue", () => {
    it("should start a dialogue", () => {
      const effect: Effect = {
        type: "startDialogue",
        dialogueId: "bartender_greeting",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.dialogueState).toEqual({
        dialogueId: "bartender_greeting",
        nodeId: "",
      });
    });
  });

  describe("endDialogue", () => {
    it("should end the current dialogue", () => {
      const effect: Effect = { type: "endDialogue" };
      const state = {
        ...createTestState(),
        dialogueState: { dialogueId: "test", nodeId: "intro" },
      };
      const newState = applyEffect(effect, state);

      expect(newState.dialogueState).toBeNull();
    });
  });

  describe("setCharacterLocation", () => {
    it("should move character to new location", () => {
      const effect: Effect = {
        type: "setCharacterLocation",
        characterId: "bartender",
        locationId: "market",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.location).toBe("market");
    });

    it("should not affect non-existent characters", () => {
      const effect: Effect = {
        type: "setCharacterLocation",
        characterId: "unknown",
        locationId: "market",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState).toEqual(state);
    });
  });

  describe("addToParty", () => {
    it("should add character to party", () => {
      const effect: Effect = { type: "addToParty", characterId: "bartender" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.inParty).toBe(true);
    });
  });

  describe("removeFromParty", () => {
    it("should remove character from party", () => {
      const effect: Effect = {
        type: "removeFromParty",
        characterId: "pixel_the_dog",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.pixel_the_dog.inParty).toBe(false);
    });
  });

  describe("setRelationship", () => {
    it("should set character relationship value", () => {
      const effect: Effect = {
        type: "setRelationship",
        characterId: "bartender",
        value: 10,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.relationship).toBe(10);
    });
  });

  describe("addRelationship", () => {
    it("should add to character relationship", () => {
      const effect: Effect = {
        type: "addRelationship",
        characterId: "bartender",
        value: 3,
      };
      const state = createTestState(); // bartender starts at 5
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.relationship).toBe(8);
    });

    it("should subtract from character relationship", () => {
      const effect: Effect = {
        type: "addRelationship",
        characterId: "bartender",
        value: -2,
      };
      const state = createTestState(); // bartender starts at 5
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.relationship).toBe(3);
    });
  });

  describe("setCharacterStat", () => {
    it("should set character stat value", () => {
      const effect: Effect = {
        type: "setCharacterStat",
        characterId: "pixel_the_dog",
        stat: "level",
        value: 5,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.pixel_the_dog.stats.level).toBe(5);
    });

    it("should create new stat if it does not exist", () => {
      const effect: Effect = {
        type: "setCharacterStat",
        characterId: "bartender",
        stat: "mana",
        value: 100,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.stats.mana).toBe(100);
    });
  });

  describe("addCharacterStat", () => {
    it("should add to existing numeric stat", () => {
      const effect: Effect = {
        type: "addCharacterStat",
        characterId: "bartender",
        stat: "health",
        value: 20,
      };
      const state = createTestState(); // health is 100
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.stats.health).toBe(120);
    });

    it("should subtract from existing numeric stat", () => {
      const effect: Effect = {
        type: "addCharacterStat",
        characterId: "pixel_the_dog",
        stat: "health",
        value: -10,
      };
      const state = createTestState(); // health is 50
      const newState = applyEffect(effect, state);

      expect(newState.characterState.pixel_the_dog.stats.health).toBe(40);
    });

    it("should initialize stat if it does not exist", () => {
      const effect: Effect = {
        type: "addCharacterStat",
        characterId: "bartender",
        stat: "mana",
        value: 50,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.characterState.bartender.stats.mana).toBe(50);
    });
  });

  describe("setMapEnabled", () => {
    it("should enable the map", () => {
      const effect: Effect = { type: "setMapEnabled", enabled: true };
      const state = { ...createTestState(), mapEnabled: false };
      const newState = applyEffect(effect, state);

      expect(newState.mapEnabled).toBe(true);
    });

    it("should disable the map", () => {
      const effect: Effect = { type: "setMapEnabled", enabled: false };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.mapEnabled).toBe(false);
    });
  });

  describe("playMusic", () => {
    it("should not modify state (audio handled by renderer)", () => {
      const effect: Effect = { type: "playMusic", track: "tension_theme.ogg" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState).toBe(state); // Same reference since no modification
    });
  });

  describe("playSound", () => {
    it("should add sound to pendingSounds queue", () => {
      const effect: Effect = { type: "playSound", sound: "door_slam.ogg" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.pendingSounds).toEqual(["door_slam.ogg"]);
      expect(newState).not.toBe(state); // New state object
    });

    it("should append to existing pendingSounds", () => {
      const effect: Effect = { type: "playSound", sound: "explosion.ogg" };
      const state = {
        ...createTestState(),
        pendingSounds: ["door_slam.ogg"],
      };
      const newState = applyEffect(effect, state);

      expect(newState.pendingSounds).toEqual([
        "door_slam.ogg",
        "explosion.ogg",
      ]);
    });
  });

  describe("notify", () => {
    it("should add notification", () => {
      const effect: Effect = {
        type: "notify",
        message: "@quest.odd_jobs.started",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.notifications).toContain("@quest.odd_jobs.started");
    });
  });

  describe("playVideo", () => {
    it("should set pendingVideo", () => {
      const effect: Effect = { type: "playVideo", file: "intro.mp4" };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.pendingVideo).toBe("intro.mp4");
      expect(newState).not.toBe(state);
    });

    it("should replace existing pendingVideo", () => {
      const effect: Effect = { type: "playVideo", file: "outro.mp4" };
      const state = { ...createTestState(), pendingVideo: "intro.mp4" };
      const newState = applyEffect(effect, state);

      expect(newState.pendingVideo).toBe("outro.mp4");
    });
  });

  describe("roll", () => {
    it("should store a value within the specified range", () => {
      const effect: Effect = {
        type: "roll",
        variable: "bluffRoll",
        min: 1,
        max: 20,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      const result = newState.variables["bluffRoll"];
      expect(typeof result).toBe("number");
      expect(result as number).toBeGreaterThanOrEqual(1);
      expect(result as number).toBeLessThanOrEqual(20);
    });

    it("should store exactly the value when min equals max", () => {
      const effect: Effect = {
        type: "roll",
        variable: "fixedRoll",
        min: 15,
        max: 15,
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.variables["fixedRoll"]).toBe(15);
    });

    it("should overwrite an existing variable", () => {
      const effect: Effect = { type: "roll", variable: "gold", min: 5, max: 5 };
      const state = createTestState(); // gold is 100
      const newState = applyEffect(effect, state);

      expect(newState.variables["gold"]).toBe(5);
    });

    it("should produce different results across multiple rolls", () => {
      const effect: Effect = { type: "roll", variable: "r", min: 1, max: 100 };
      const state = createTestState();
      const results = new Set<number>();
      for (let i = 0; i < 20; i++) {
        const newState = applyEffect(effect, state);
        results.add(newState.variables["r"] as number);
      }
      // With 100 possible values and 20 rolls, very likely to get at least 2 distinct values
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe("showInterlude", () => {
    it("should set pendingInterlude to the interlude ID", () => {
      const effect: Effect = {
        type: "showInterlude",
        interludeId: "chapter_one",
      };
      const state = createTestState();
      const newState = applyEffect(effect, state);

      expect(newState.pendingInterlude).toBe("chapter_one");
      expect(newState).not.toBe(state);
    });

    it("should replace existing pendingInterlude", () => {
      const effect: Effect = {
        type: "showInterlude",
        interludeId: "chapter_two",
      };
      const state = { ...createTestState(), pendingInterlude: "chapter_one" };
      const newState = applyEffect(effect, state);

      expect(newState.pendingInterlude).toBe("chapter_two");
    });
  });

  describe("applyEffects (multiple)", () => {
    it("should apply multiple effects in sequence", () => {
      const effects: Effect[] = [
        { type: "setFlag", flag: "questStarted" },
        { type: "addVariable", variable: "gold", value: 50 },
        { type: "setQuestStage", questId: "odd_jobs", stageId: "started" },
      ];
      const state = createTestState();
      const newState = applyEffects(effects, state);

      expect(newState.flags.questStarted).toBe(true);
      expect(newState.variables.gold).toBe(150);
      expect(newState.questProgress.odd_jobs).toBe("started");
    });

    it("should apply effects using results from previous effects", () => {
      const effects: Effect[] = [
        { type: "setVariable", variable: "gold", value: 100 },
        { type: "addVariable", variable: "gold", value: 50 },
        { type: "addVariable", variable: "gold", value: 25 },
      ];
      const state = { ...createTestState(), variables: {} };
      const newState = applyEffects(effects, state);

      expect(newState.variables.gold).toBe(175);
    });

    it("should handle empty effects array", () => {
      const state = createTestState();
      const newState = applyEffects([], state);

      expect(newState).toBe(state);
    });
  });
});
