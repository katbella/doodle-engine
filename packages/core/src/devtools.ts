/**
 * Dev Tools for Doodle Engine
 *
 * Framework-agnostic debugging API for browser console.
 * Exposes window.doodle API for debugging and testing.
 * Only enabled in development mode.
 */

import type { Engine } from './engine';
import type { ContentRegistry } from './types/registry';
import type { GameState } from './types/state';

export interface DevTools {
    // Flag manipulation
    setFlag: (flag: string) => void;
    clearFlag: (flag: string) => void;

    // Variable manipulation
    setVariable: (variable: string, value: number | string) => void;
    getVariable: (variable: string) => number | string | undefined;

    // Location control
    teleport: (locationId: string) => void;

    // Dialogue control
    triggerDialogue: (dialogueId: string) => void;

    // Quest control
    setQuestStage: (questId: string, stageId: string) => void;

    // Inventory control
    addItem: (itemId: string) => void;
    removeItem: (itemId: string) => void;

    // Inspection
    inspect: () => void;
    inspectState: () => GameState;
    inspectRegistry: () => ContentRegistry;
}

declare global {
    interface Window {
        doodle?: DevTools;
    }
}

/**
 * Enable dev tools by exposing window.doodle API.
 *
 * Framework-agnostic - works with React, Vue, Svelte, or vanilla JS.
 * The onUpdate callback is called whenever dev tools mutate engine state,
 * allowing the renderer to trigger a re-render.
 *
 * @param engine - Engine instance to debug
 * @param onUpdate - Callback invoked when state changes (renderer should update UI)
 *
 * @example
 * // React
 * enableDevTools(engine, () => setSnapshot(engine.getSnapshot()))
 *
 * @example
 * // Vue
 * enableDevTools(engine, () => snapshot.value = engine.getSnapshot())
 *
 * @example
 * // Vanilla JS
 * enableDevTools(engine, () => render(engine.getSnapshot()))
 */
export function enableDevTools(engine: Engine, onUpdate: () => void) {
    window.doodle = {
        // Flag manipulation
        setFlag(flag: string) {
            engine.applyDebugEffect({ type: 'setFlag', flag });
            onUpdate();
            console.log(`🐾 Flag set: ${flag}`);
        },

        clearFlag(flag: string) {
            engine.applyDebugEffect({ type: 'clearFlag', flag });
            onUpdate();
            console.log(`🐾 Flag cleared: ${flag}`);
        },

        // Variable manipulation
        setVariable(variable: string, value: number | string) {
            engine.applyDebugEffect({ type: 'setVariable', variable, value });
            onUpdate();
            console.log(`🐾 Variable set: ${variable} = ${value}`);
        },

        getVariable(variable: string) {
            const value = engine.getState().variables[variable];
            console.log(`🐾 Variable: ${variable} = ${value}`);
            return value;
        },

        // Location control. Sets the location directly so it can reach any
        // place, not just spots on the current map. Party members come along,
        // matching the goToLocation effect.
        teleport(locationId: string) {
            engine.teleport(locationId);
            onUpdate();
            console.log(`🐾 Teleported to: ${locationId}`);
        },

        // Dialogue control. Starts the dialogue the same way the engine does,
        // so start-node effects run and a silent first node auto-advances.
        triggerDialogue(dialogueId: string) {
            const dialogue = engine.getRegistry().dialogues[dialogueId];
            if (!dialogue) {
                console.error(`🐾 Dialogue not found: ${dialogueId}`);
                return;
            }

            if (
                !dialogue.nodes.some((node) => node.id === dialogue.startNode)
            ) {
                console.error(`🐾 Could not start dialogue: ${dialogueId}`);
                return;
            }

            engine.startDialogueAt(dialogueId, dialogue.startNode);
            onUpdate();
            console.log(`🐾 Triggered dialogue: ${dialogueId}`);
        },

        // Quest control
        setQuestStage(questId: string, stageId: string) {
            engine.applyDebugEffect({
                type: 'setQuestStage',
                questId,
                stageId,
            });
            onUpdate();
            console.log(`🐾 Quest stage set: ${questId} -> ${stageId}`);
        },

        // Inventory control
        addItem(itemId: string) {
            if (!engine.getState().inventory.includes(itemId)) {
                engine.applyDebugEffect({ type: 'addItem', itemId });
                onUpdate();
                console.log(`🐾 Item added: ${itemId}`);
            } else {
                console.log(`🐾 Item already in inventory: ${itemId}`);
            }
        },

        removeItem(itemId: string) {
            if (engine.getState().inventory.includes(itemId)) {
                engine.applyDebugEffect({ type: 'removeItem', itemId });
                onUpdate();
                console.log(`🐾 Item removed: ${itemId}`);
            } else {
                console.log(`🐾 Item not in inventory: ${itemId}`);
            }
        },

        // Inspection
        inspect() {
            const snapshot = engine.getSnapshot();
            const state = engine.getState();
            console.log('🐾 DOODLE ENGINE INSPECTOR 🐾');
            console.log('');
            console.log('Current Location:', snapshot.location.name);
            console.log(
                'Current Time:',
                `Day ${snapshot.time.day}, Hour ${snapshot.time.hour}`
            );
            console.log('Flags:', Object.keys(state.flags));
            console.log('Variables:', state.variables);
            console.log(
                'Inventory:',
                snapshot.inventory.map((item) => item.name)
            );
            console.log('Quest Progress:', state.questProgress);
            console.log('');
            console.log('Available commands:');
            console.log('  doodle.setFlag(flag)');
            console.log('  doodle.clearFlag(flag)');
            console.log('  doodle.setVariable(variable, value)');
            console.log('  doodle.getVariable(variable)');
            console.log('  doodle.teleport(locationId)');
            console.log('  doodle.triggerDialogue(dialogueId)');
            console.log('  doodle.setQuestStage(questId, stageId)');
            console.log('  doodle.addItem(itemId)');
            console.log('  doodle.removeItem(itemId)');
            console.log('  doodle.inspectState()');
            console.log('  doodle.inspectRegistry()');
            console.log('');
            console.log('📚 Docs: https://doodleengine.dev/');
        },

        inspectState() {
            const state = engine.getState();
            console.log('🐾 GAME STATE:', state);
            return state;
        },

        inspectRegistry() {
            const registry = engine.getRegistry();
            console.log('🐾 CONTENT REGISTRY:', registry);
            return registry;
        },
    };

    console.log(
        '🐾 Doodle Engine dev tools enabled! Type `doodle.inspect()` to see available commands.\n📚 You can also check out the docs: https://doodleengine.dev/'
    );
}
