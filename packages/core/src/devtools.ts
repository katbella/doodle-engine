/**
 * Dev Tools for Doodle Engine
 *
 * Framework-agnostic debugging API for browser console.
 * Exposes window.doodle API for debugging and testing.
 * Only enabled in development mode.
 */

import type { Engine } from './engine';

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
    inspectState: () => any;
    inspectRegistry: () => any;
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
    // Get internal state by casting engine to any
    // This is a dev-only hack to access private fields
    const engineInternal = engine as any;

    window.doodle = {
        // Flag manipulation
        setFlag(flag: string) {
            engineInternal.state.flags[flag] = true;
            onUpdate();
            console.log(`🐾 Flag set: ${flag}`);
        },

        clearFlag(flag: string) {
            delete engineInternal.state.flags[flag];
            onUpdate();
            console.log(`🐾 Flag cleared: ${flag}`);
        },

        // Variable manipulation
        setVariable(variable: string, value: number | string) {
            engineInternal.state.variables[variable] = value;
            onUpdate();
            console.log(`🐾 Variable set: ${variable} = ${value}`);
        },

        getVariable(variable: string) {
            const value = engineInternal.state.variables[variable];
            console.log(`🐾 Variable: ${variable} = ${value}`);
            return value;
        },

        // Location control. Sets the location directly so it can reach any
        // place, not just spots on the current map. Party members come along,
        // matching the goToLocation effect.
        teleport(locationId: string) {
            engineInternal.state.currentLocation = locationId;
            for (const charState of Object.values(
                engineInternal.state.characterState
            ) as any[]) {
                if (charState.inParty) {
                    charState.location = locationId;
                }
            }
            onUpdate();
            console.log(`🐾 Teleported to: ${locationId}`);
        },

        // Dialogue control. Starts the dialogue the same way the engine does,
        // so start-node effects run and a silent first node auto-advances.
        triggerDialogue(dialogueId: string) {
            const dialogue = engineInternal.registry.dialogues[dialogueId];
            if (!dialogue) {
                console.error(`🐾 Dialogue not found: ${dialogueId}`);
                return;
            }

            if (!engineInternal.enterDialogue(dialogueId)) {
                console.error(`🐾 Could not start dialogue: ${dialogueId}`);
                return;
            }

            onUpdate();
            console.log(`🐾 Triggered dialogue: ${dialogueId}`);
        },

        // Quest control
        setQuestStage(questId: string, stageId: string) {
            engineInternal.state.questProgress[questId] = stageId;
            onUpdate();
            console.log(`🐾 Quest stage set: ${questId} -> ${stageId}`);
        },

        // Inventory control
        addItem(itemId: string) {
            if (!engineInternal.state.inventory.includes(itemId)) {
                engineInternal.state.inventory.push(itemId);
                engineInternal.state.itemLocations[itemId] = 'inventory';
                onUpdate();
                console.log(`🐾 Item added: ${itemId}`);
            } else {
                console.log(`🐾 Item already in inventory: ${itemId}`);
            }
        },

        removeItem(itemId: string) {
            const index = engineInternal.state.inventory.indexOf(itemId);
            if (index !== -1) {
                engineInternal.state.inventory.splice(index, 1);
                delete engineInternal.state.itemLocations[itemId];
                onUpdate();
                console.log(`🐾 Item removed: ${itemId}`);
            } else {
                console.log(`🐾 Item not in inventory: ${itemId}`);
            }
        },

        // Inspection
        inspect() {
            const snapshot = engine.getSnapshot();
            console.log('🐾 DOODLE ENGINE INSPECTOR 🐾');
            console.log('');
            console.log('Current Location:', snapshot.location.name);
            console.log(
                'Current Time:',
                `Day ${snapshot.time.day}, Hour ${snapshot.time.hour}`
            );
            console.log('Flags:', Object.keys(engineInternal.state.flags));
            console.log('Variables:', engineInternal.state.variables);
            console.log(
                'Inventory:',
                snapshot.inventory.map((i: any) => i.name)
            );
            console.log('Quest Progress:', engineInternal.state.questProgress);
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
            console.log('🐾 GAME STATE:', engineInternal.state);
            return engineInternal.state;
        },

        inspectRegistry() {
            console.log('🐾 CONTENT REGISTRY:', engineInternal.registry);
            return engineInternal.registry;
        },
    };

    console.log(
        '🐾 Doodle Engine dev tools enabled! Type `doodle.inspect()` to see available commands.\n📚 You can also check out the docs: https://doodleengine.dev/'
    );
}
