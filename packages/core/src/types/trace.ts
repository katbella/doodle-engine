/**
 * Debug-trace type definitions for the Doodle Engine.
 *
 * The engine can explain its decisions to a debugger (Doodle Studio's playtest
 * panel) by reporting to an optional TraceSink. When no sink is attached, the
 * engine records nothing and behaves — and performs — exactly as it does today.
 *
 * A sink receives one event per meaningful runtime step: a node entered, a
 * condition evaluated (with the values it actually saw), an effect applied, a
 * transition between nodes, a choice hidden (with the reason), or an error.
 * Every event carries a sequence number so a consumer can order them.
 */

import type { Condition } from './conditions';
import type { Effect } from './effects';
import type { GameState } from './state';

/**
 * A node was entered during dialogue.
 */
export interface NodeEnterEvent {
    kind: 'nodeEnter';
    /** Monotonic sequence number within a trace session */
    seq: number;
    dialogueId: string;
    nodeId: string;
}

/**
 * A single condition was evaluated. Reports the values the evaluator actually
 * saw so a debugger can show *why* it passed or failed.
 */
export interface ConditionEvent {
    kind: 'condition';
    seq: number;
    condition: Condition;
    /** The state values the evaluator read, keyed by role (e.g. flag, variable) */
    resolvedValues: Record<string, unknown>;
    result: boolean;
    /** Where this condition was evaluated (choice requirement, IF branch, etc.) */
    context: ConditionContext;
}

/**
 * Where a condition was evaluated. Lets the debugger attribute a pass/fail to
 * the right place in the dialogue.
 */
export type ConditionContext =
    | { type: 'choice'; choiceId: string }
    | { type: 'branch'; branchIndex: number }
    | { type: 'dialogueTrigger'; dialogueId: string }
    | { type: 'interludeTrigger'; interludeId: string };

/**
 * An effect was applied, with the state fields it changed.
 */
export interface EffectEvent {
    kind: 'effect';
    seq: number;
    effect: Effect;
    /** Fields that changed, each with its value before and after */
    delta: StateDelta;
}

/**
 * A shallow record of state fields an effect changed. Keyed by the top-level
 * GameState field name (e.g. "flags", "variables"); only changed fields appear.
 */
export type StateDelta = Partial<
    Record<keyof GameState, { before: unknown; after: unknown }>
>;

/**
 * A transition from one node to another.
 */
export interface TransitionEvent {
    kind: 'transition';
    seq: number;
    dialogueId: string;
    fromNode: string;
    toNode: string | null;
    /** Index of the IF branch that routed here, if a branch decided the target */
    viaBranch?: number;
}

/**
 * A choice was hidden because a condition failed. This is the "why is this
 * choice unavailable" answer.
 */
export interface ChoiceFilteredEvent {
    kind: 'choiceFiltered';
    seq: number;
    dialogueId: string;
    nodeId: string;
    choiceId: string;
    /** The first condition that failed */
    failedCondition: Condition;
    /** The values the failing condition read */
    resolvedValues: Record<string, unknown>;
}

/**
 * A runtime error the engine recovered from.
 */
export interface TraceErrorEvent {
    kind: 'error';
    seq: number;
    message: string;
}

/**
 * Any trace event.
 */
export type TraceEvent =
    | NodeEnterEvent
    | ConditionEvent
    | EffectEvent
    | TransitionEvent
    | ChoiceFilteredEvent
    | TraceErrorEvent;

/**
 * A consumer of trace events. Attach one with `engine.setTrace(sink)`; detach
 * with `engine.setTrace(null)`. Every method is optional so a sink can listen
 * for only the events it cares about.
 */
export interface TraceSink {
    onNodeEnter?(event: NodeEnterEvent): void;
    onCondition?(event: ConditionEvent): void;
    onEffect?(event: EffectEvent): void;
    onTransition?(event: TransitionEvent): void;
    onChoiceFiltered?(event: ChoiceFilteredEvent): void;
    onError?(event: TraceErrorEvent): void;
}
