/**
 * Drives a real engine session for the playtest panel.
 *
 * The engine is pure and runs in the renderer directly from the loaded
 * registry and game config — no separate process, no HTTP, no build. This
 * controller wraps one engine, collects a decision trace, and exposes the
 * actions and reads the playtest UI needs. It holds no React state; a component
 * reads from it and re-renders when `version` changes after each action.
 */

import {
    Engine,
    serializeCondition,
    resolveText,
    type ContentRegistry,
    type GameConfig,
    type GameState,
    type Snapshot,
    type SaveData,
    type TraceEvent,
    type Effect,
} from '@doodle-engine/core';

/** A piece of authored display text, resolved for the current locale, keeping
 * the original `@key` alongside so a writer can see both. */
export interface DisplayText {
    /** The resolved string shown to the player. */
    text: string;
    /** The `@key` it came from, if the source was a localization key. */
    key?: string;
}

/** One choice on the current node, ready to render: its text plus, when hidden,
 * the exact requirement that failed and the live value it saw. */
export interface ChoiceRow {
    id: string;
    /** Resolved choice text, with its `@key` when it came from one. */
    display: DisplayText;
    visible: boolean;
    /** e.g. "questAtStage odd_jobs started" — the exact REQUIRE line. */
    requirement?: string;
    /** e.g. "quest is not_started" — the live state value that failed it. */
    reason?: string;
}

/** A named snapshot of a full engine state the tester can restore. */
export interface NamedTestState {
    name: string;
    save: SaveData;
}

export class PlaytestSession {
    private engine: Engine;
    private registry: ContentRegistry;
    private config: GameConfig;
    private snapshot: Snapshot;
    private events: TraceEvent[] = [];

    /** Identifies the project this session belongs to, so the view can tell
     * when to start a fresh session (e.g. after opening a different project). */
    readonly projectKey: string;

    /** Bumped after every action so a React view can depend on it to re-render. */
    version = 0;

    constructor(
        registry: ContentRegistry,
        config: GameConfig,
        projectKey = ''
    ) {
        this.registry = registry;
        this.config = config;
        this.projectKey = projectKey;
        this.engine = new Engine(registry);
        this.engine.setTrace({
            onNodeEnter: (e) => this.events.push(e),
            onCondition: (e) => this.events.push(e),
            onEffect: (e) => this.events.push(e),
            onTransition: (e) => this.events.push(e),
            onChoiceFiltered: (e) => this.events.push(e),
            onError: (e) => this.events.push(e),
        });
        this.snapshot = this.engine.newGame(config);
    }

    // --- reads -----------------------------------------------------------------

    getSnapshot(): Snapshot {
        return this.snapshot;
    }

    getState(): GameState {
        return this.engine.getState();
    }

    getTrace(): readonly TraceEvent[] {
        return this.events;
    }

    /** Whether a dialogue is currently active (drives the playback column). */
    inDialogue(): boolean {
        return this.snapshot.dialogue !== null;
    }

    /** The current node's spoken line, resolved for the locale, with its key. */
    speakerLine(): DisplayText | null {
        const node = this.currentNode();
        if (!node) return null;
        return this.display(node.text);
    }

    /** Every choice on the current node with visibility and, when hidden, why. */
    choiceRows(): ChoiceRow[] {
        const node = this.currentNode();
        return this.engine.explainChoices().map((choice) => {
            const source =
                node?.choices.find((c) => c.id === choice.choiceId)?.text ??
                choice.choiceId;
            const display = this.display(source);
            if (choice.visible || !choice.failedCondition) {
                return { id: choice.choiceId, display, visible: true };
            }
            return {
                id: choice.choiceId,
                display,
                visible: false,
                requirement: serializeCondition(choice.failedCondition),
                reason: describeReason(
                    choice.failedCondition,
                    choice.resolvedValues ?? {}
                ),
            };
        });
    }

    // --- actions ---------------------------------------------------------------

    restart(): void {
        this.events = [];
        this.snapshot = this.engine.newGame(this.config);
        this.version++;
    }

    startAtNode(dialogueId: string, nodeId: string): void {
        this.events = [];
        this.snapshot = this.engine.startDialogueAt(dialogueId, nodeId);
        this.version++;
    }

    selectChoice(choiceId: string): void {
        this.snapshot = this.engine.selectChoice(choiceId);
        this.version++;
    }

    continue(): void {
        this.snapshot = this.engine.continueDialogue();
        this.version++;
    }

    setLocale(locale: string): void {
        this.snapshot = this.engine.setLocale(locale);
        this.version++;
    }

    applyEffect(effect: Effect): void {
        this.snapshot = this.engine.applyDebugEffect(effect);
        this.version++;
    }

    teleport(locationId: string): void {
        this.snapshot = this.engine.teleport(locationId);
        this.version++;
    }

    clearTrace(): void {
        this.events = [];
        this.version++;
    }

    // --- named test states -----------------------------------------------------

    /** Capture the full engine state so it can be restored later by name. */
    saveTestState(name: string): NamedTestState {
        return { name, save: this.engine.saveGame() };
    }

    /** The full engine state, for carrying a session across a content reload. */
    exportState(): SaveData {
        return this.engine.saveGame();
    }

    loadTestState(state: NamedTestState): void {
        this.events = [];
        this.snapshot = this.engine.loadGame(state.save);
        this.version++;
    }

    // --- helpers ---------------------------------------------------------------

    /** The node the dialogue is currently resting on, or null if not in one. */
    private currentNode() {
        const ds = this.engine.getState().dialogueState;
        if (!ds) return null;
        return (
            this.registry.dialogues[ds.dialogueId]?.nodes.find(
                (n) => n.id === ds.nodeId
            ) ?? null
        );
    }

    /** Resolve authored text for the current locale (with {var} substitution,
     * matching the runtime), keeping the original `@key` when there was one. */
    private display(source: string): DisplayText {
        const state = this.engine.getState();
        const locale = this.registry.locales[state.currentLocale] ?? {};
        const text = resolveText(source, locale, state.variables);
        return source.startsWith('@') ? { text, key: source } : { text };
    }
}

/**
 * Build a fresh session for reloaded content, carrying the previous session's
 * state and place across the reload. The engine is rebuilt from the new registry
 * and config, then restored to where the tester was — same flags, variables,
 * inventory, location, and current dialogue node — so an edit shows up without
 * losing the tester's place. The one exception: if the tester was resting on a
 * dialogue node the edit removed, it starts fresh, so the engine never resumes
 * on a node that no longer exists.
 */
export function reloadSession(
    prev: PlaytestSession,
    registry: ContentRegistry,
    config: GameConfig,
    projectKey: string
): PlaytestSession {
    const next = new PlaytestSession(registry, config, projectKey);
    const ds = prev.getState().dialogueState;
    const nodeGone =
        !!ds &&
        !registry.dialogues[ds.dialogueId]?.nodes.some(
            (n) => n.id === ds.nodeId
        );
    if (!nodeGone) next.loadTestState({ name: '', save: prev.exportState() });
    return next;
}

/** A short, human explanation of why a requirement failed, from the values the
 * condition actually read. Falls back to the raw values for kinds without a
 * tailored phrasing. */
function describeReason(
    condition: import('@doodle-engine/core').Condition,
    values: Record<string, unknown>
): string {
    switch (condition.type) {
        case 'hasFlag':
            return `flag ${condition.flag} is not set`;
        case 'notFlag':
            return `flag ${condition.flag} is set`;
        case 'hasItem':
            return `${condition.itemId} not in inventory`;
        case 'variableEquals':
        case 'variableGreaterThan':
        case 'variableLessThan':
            return `${condition.variable} is ${fmt(values.variable)}`;
        case 'atLocation':
            return `at ${fmt(values.currentLocation)}`;
        case 'questAtStage':
            return values.questStage === undefined
                ? 'quest is not started'
                : `quest is ${fmt(values.questStage)}`;
        case 'characterAt':
            return `${condition.characterId} is at ${fmt(values.characterLocation)}`;
        case 'characterInParty':
            return `${condition.characterId} not in party`;
        case 'relationshipAbove':
        case 'relationshipBelow':
            return `relationship is ${fmt(values.relationship)}`;
        case 'timeIs':
            return `hour is ${fmt(values.hour)}`;
        case 'itemAt':
            return `${condition.itemId} is at ${fmt(values.itemLocation)}`;
        case 'roll':
            return 'roll did not meet the threshold';
    }
}

function fmt(value: unknown): string {
    if (value === undefined || value === null) return '—';
    return String(value);
}
