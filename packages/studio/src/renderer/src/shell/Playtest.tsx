/**
 * The playtest panel: runs the real engine over the loaded project and shows
 * its truth — the current node, every choice (available or hidden with the
 * reason), an editable state inspector, a debug trace, and a placeholder frame
 * for the project's own renderer.
 *
 * The engine runs in-process from the loaded registry and config; nothing here
 * touches project files. State edits go through the engine's debug-effect path,
 * so they behave exactly like in-game effects.
 */
import { useCallback, useRef, useState } from 'react';
import { Play, X } from '../lib/icons';
import type { ContentRegistry, GameConfig } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import { PlaytestSession, reloadSession } from '../lib/playtest';
import { useTestStates } from '../lib/useTestStates';
import { DebugTrace } from './DebugTrace';
import { StartNodePicker, type NodeTarget } from './StartNodePicker';
import { NameStateModal } from './NameStateModal';

type InnerTab = 'playtest' | 'trace';

export function Playtest({ project }: { project: OpenProject }) {
    // One engine session, rebuilt whenever the project's content changes — a new
    // registry or config after a re-validate — so edits reach the playtest
    // instead of it running the content from when the project first opened. On a
    // reload of the same project the tester's state and place are carried over;
    // opening a different project starts fresh.
    const sessionRef = useRef<PlaytestSession | null>(null);
    const builtFrom = useRef<{
        registry: ContentRegistry;
        config: GameConfig;
    } | null>(null);

    if (
        !sessionRef.current ||
        builtFrom.current?.registry !== project.registry ||
        builtFrom.current?.config !== project.config
    ) {
        const prev = sessionRef.current;
        sessionRef.current =
            prev && prev.projectKey === project.projectDir
                ? reloadSession(
                      prev,
                      project.registry,
                      project.config,
                      project.projectDir
                  )
                : new PlaytestSession(
                      project.registry,
                      project.config,
                      project.projectDir
                  );
        builtFrom.current = {
            registry: project.registry,
            config: project.config,
        };
    }
    const session = sessionRef.current;

    // Force a re-render after each engine action (the session is mutable).
    const [, setTick] = useState(0);
    const refresh = useCallback(() => setTick((t) => t + 1), []);

    const [tab, setTab] = useState<InnerTab>('playtest');
    const [picking, setPicking] = useState(false);
    const [naming, setNaming] = useState(false);

    // Named test states, persisted per project (survive tab switches/restarts).
    const testStates = useTestStates(project.projectDir);

    const act = useCallback(
        (fn: () => void) => {
            fn();
            refresh();
        },
        [refresh]
    );

    const pickStart = useCallback(
        (target: NodeTarget) => {
            setPicking(false);
            act(() => session.startAtNode(target.dialogueId, target.nodeId));
        },
        [act, session]
    );

    const saveState = useCallback(
        (name: string) => {
            setNaming(false);
            testStates.save(session.saveTestState(name));
        },
        [session, testStates]
    );

    const hasDialogues = Object.keys(project.registry.dialogues).length > 0;
    const currentLocale = session.getState().currentLocale;
    const localeIds = Object.keys(project.registry.locales).sort();

    return (
        <div className="playtest">
            <div className="playtest__toolbar">
                <button
                    className="btn btn--accent"
                    onClick={() => setPicking(true)}
                    disabled={!hasDialogues}
                    title={
                        hasDialogues
                            ? 'Choose a node to start the dialogue at'
                            : 'This project has no dialogues yet'
                    }
                >
                    <Play size={13} /> Start at node…
                </button>
                <button
                    className="btn"
                    onClick={() => act(() => session.restart())}
                >
                    Restart
                </button>
                {localeIds.length > 0 && (
                    <label className="playtest__field">
                        <span>Locale</span>
                        <select
                            className="playtest__select"
                            value={currentLocale}
                            aria-label="Playtest locale"
                            onChange={(event) =>
                                act(() => session.setLocale(event.target.value))
                            }
                        >
                            {localeIds.map((localeId) => (
                                <option key={localeId} value={localeId}>
                                    {localeId}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <div className="playtest__spacer" />
                <button className="btn" onClick={() => setNaming(true)}>
                    Save test state
                </button>
            </div>

            {testStates.states.length > 0 && (
                <div className="teststates">
                    <span className="teststates__label">Saved:</span>
                    {testStates.states.map((s) => (
                        <span key={s.name} className="teststate">
                            <button
                                className="teststate__load"
                                onClick={() =>
                                    act(() => session.loadTestState(s))
                                }
                                title="Load this test state"
                            >
                                {s.name}
                            </button>
                            <button
                                className="teststate__remove"
                                onClick={() => testStates.remove(s.name)}
                                title="Delete this test state"
                                aria-label={`Delete test state ${s.name}`}
                            >
                                <X size={13} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="playtest__tabs">
                <InnerTabButton
                    label="Playtest"
                    active={tab === 'playtest'}
                    onClick={() => setTab('playtest')}
                />
                <InnerTabButton
                    label="Debug trace"
                    active={tab === 'trace'}
                    onClick={() => setTab('trace')}
                />
            </div>

            {tab === 'playtest' && (
                <div className="playtest__body">
                    <Playback session={session} onAct={act} />
                    <StateInspector
                        session={session}
                        project={project}
                        onAct={act}
                    />
                </div>
            )}
            {tab === 'trace' && <DebugTrace trace={session.getTrace()} />}

            {picking && (
                <StartNodePicker
                    registry={project.registry}
                    onPick={pickStart}
                    onCancel={() => setPicking(false)}
                />
            )}
            {naming && (
                <NameStateModal
                    existingNames={testStates.states.map((s) => s.name)}
                    onSave={saveState}
                    onCancel={() => setNaming(false)}
                />
            )}
        </div>
    );
}

function Playback({
    session,
    onAct,
}: {
    session: PlaytestSession;
    onAct: (fn: () => void) => void;
}) {
    const snapshot = session.getSnapshot();
    const dialogue = snapshot.dialogue;

    if (!dialogue) {
        return (
            <div className="playback">
                <div className="dock__empty">
                    No dialogue running. Pick a node above and press Start.
                </div>
            </div>
        );
    }

    const rows = session.choiceRows();
    const line = session.speakerLine();
    // A node with text but no visible choices waits for Continue.
    const canContinue = dialogue.text !== '' && snapshot.choices.length === 0;

    return (
        <div className="playback scroll">
            <div className="playback__line">
                <span className="playback__speaker">
                    {dialogue.speakerName}
                </span>
                <span className="playback__text">
                    {dialogue.text}
                    {line?.key && <KeyTag k={line.key} />}
                </span>
            </div>
            <div className="playback__choices">
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className={`pchoice ${row.visible ? 'pchoice--on' : 'pchoice--off'}`}
                    >
                        <div className="pchoice__head">
                            <span
                                className={`pchoice__badge pchoice__badge--${
                                    row.visible ? 'on' : 'off'
                                }`}
                            >
                                {row.visible ? 'AVAILABLE' : 'HIDDEN'}
                            </span>
                            {row.visible ? (
                                <button
                                    className="pchoice__pick"
                                    onClick={() =>
                                        onAct(() =>
                                            session.selectChoice(row.id)
                                        )
                                    }
                                >
                                    {row.display.text}
                                    {row.display.key && (
                                        <KeyTag k={row.display.key} />
                                    )}
                                </button>
                            ) : (
                                <span className="pchoice__text">
                                    {row.display.text}
                                    {row.display.key && (
                                        <KeyTag k={row.display.key} />
                                    )}
                                </span>
                            )}
                        </div>
                        {!row.visible && row.requirement && (
                            <span className="pchoice__why">
                                Why hidden: REQUIRE {row.requirement} —{' '}
                                {row.reason}
                            </span>
                        )}
                    </div>
                ))}
                {canContinue && (
                    <button
                        className="btn btn--accent playback__continue"
                        onClick={() => onAct(() => session.continue())}
                    >
                        {dialogue.continueEndsDialogue
                            ? (snapshot.ui['ui.end_dialogue'] ?? 'End Dialogue')
                            : (snapshot.ui['ui.continue'] ?? 'Continue')}{' '}
                        <Play size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}

function StateInspector({
    session,
    project,
    onAct,
}: {
    session: PlaytestSession;
    project: OpenProject;
    onAct: (fn: () => void) => void;
}) {
    const state = session.getState();
    const questIds = Object.keys(project.registry.quests);
    const characterIds = Object.keys(project.registry.characters);

    return (
        <div className="inspector scroll">
            <span className="inspector__title">State inspector</span>

            <Group label="Flags">
                {Object.keys(state.flags).length === 0 && (
                    <span className="inspector__empty">none</span>
                )}
                {Object.entries(state.flags).map(([flag, value]) => (
                    <div key={flag} className="irow">
                        <span className="irow__key mono">{flag}</span>
                        <button
                            className={`itoggle itoggle--${value ? 'on' : 'off'}`}
                            onClick={() =>
                                onAct(() =>
                                    session.applyEffect(
                                        value
                                            ? { type: 'clearFlag', flag }
                                            : { type: 'setFlag', flag }
                                    )
                                )
                            }
                        >
                            {value ? 'true' : 'false'}
                        </button>
                    </div>
                ))}
            </Group>

            <Group label="Variables">
                {Object.keys(state.variables).length === 0 && (
                    <span className="inspector__empty">none</span>
                )}
                {Object.entries(state.variables).map(([variable, value]) => (
                    <div key={variable} className="irow">
                        <span className="irow__key mono">{variable}</span>
                        <input
                            className="ivalue mono"
                            defaultValue={String(value)}
                            aria-label={`Value of ${variable}`}
                            onBlur={(e) =>
                                onAct(() =>
                                    session.applyEffect({
                                        type: 'setVariable',
                                        variable,
                                        value: coerce(e.target.value),
                                    })
                                )
                            }
                        />
                    </div>
                ))}
            </Group>

            <Group label="Inventory">
                {state.inventory.length === 0 && (
                    <span className="inspector__empty">empty</span>
                )}
                {state.inventory.map((itemId) => (
                    <div key={itemId} className="irow">
                        <span className="irow__key mono">{itemId}</span>
                        <button
                            className="ilink"
                            onClick={() =>
                                onAct(() =>
                                    session.applyEffect({
                                        type: 'removeItem',
                                        itemId,
                                    })
                                )
                            }
                        >
                            remove
                        </button>
                    </div>
                ))}
            </Group>

            <Group label="Location">
                <span className="inspector__value mono">
                    {state.currentLocation}
                </span>
            </Group>

            {questIds.length > 0 && (
                <Group label="Quest stages">
                    {questIds.map((questId) => (
                        <div key={questId} className="irow">
                            <span className="irow__key mono">{questId}</span>
                            <select
                                className="ivalue mono"
                                value={state.questProgress[questId] ?? ''}
                                aria-label={`Stage of ${questId}`}
                                onChange={(e) =>
                                    onAct(() =>
                                        session.applyEffect({
                                            type: 'setQuestStage',
                                            questId,
                                            stageId: e.target.value,
                                        })
                                    )
                                }
                            >
                                <option value="">not started</option>
                                {project.registry.quests[questId].stages.map(
                                    (stage) => (
                                        <option key={stage.id} value={stage.id}>
                                            {stage.id}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    ))}
                </Group>
            )}

            {characterIds.length > 0 && (
                <Group label="Relationships">
                    {characterIds.map((characterId) => (
                        <div key={characterId} className="irow">
                            <span className="irow__key mono">
                                {characterId}
                            </span>
                            <input
                                className="ivalue mono"
                                type="number"
                                defaultValue={
                                    state.characterState[characterId]
                                        ?.relationship ?? 0
                                }
                                aria-label={`Relationship with ${characterId}`}
                                onBlur={(e) =>
                                    onAct(() =>
                                        session.applyEffect({
                                            type: 'setRelationship',
                                            characterId,
                                            value: Number(e.target.value) || 0,
                                        })
                                    )
                                }
                            />
                        </div>
                    ))}
                </Group>
            )}

            <Group label="Locale">
                <span className="inspector__value mono">
                    {state.currentLocale}
                </span>
            </Group>
        </div>
    );
}

function Group({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="inspector__group">
            <span className="inspector__label">{label}</span>
            {children}
        </div>
    );
}

/** A small monospace chip showing the `@key` a line came from, so a writer can
 * see both the resolved string and its localization key. */
function KeyTag({ k }: { k: string }) {
    return (
        <span className="keytag mono" title="Localization key">
            {k}
        </span>
    );
}

function InnerTabButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={`playtest__tab ${active ? 'playtest__tab--active' : ''}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

/** A variable is a number or string; keep numeric input numeric. */
function coerce(raw: string): number | string {
    const n = Number(raw);
    return raw.trim() !== '' && !Number.isNaN(n) ? n : raw;
}
