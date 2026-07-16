import { useEffect, useState } from 'react';
import { Engine } from '@doodle-engine/core';
import type { AssetManifest, Snapshot } from '@doodle-engine/core';
import {
    AssetProvider,
    GameProvider,
    InputProvider,
    Interlude,
    VideoPlayer,
    useGame,
    useInputAction,
} from '@doodle-engine/react';
import { getAvailableLocales, type LocaleOption } from './locale-options';

export function App() {
    const [game, setGame] = useState<{
        engine: Engine;
        snapshot: Snapshot;
        manifest: AssetManifest;
        availableLocales: LocaleOption[];
    } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('api/content').then((res) => res.json()),
            fetch('api/manifest').then((res) => res.json()),
        ]).then(([contentData, manifest]) => {
            const engine = new Engine(contentData.registry);
            const snapshot = engine.newGame(contentData.config);
            setGame({
                engine,
                snapshot,
                manifest,
                availableLocales: getAvailableLocales(
                    contentData.registry.locales
                ),
            });
        });
    }, []);

    if (!game) {
        return (
            <div className="app-bootstrap">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <InputProvider>
            <AssetProvider
                manifest={game.manifest}
                renderLoading={() => (
                    <div className="app-bootstrap">
                        <div className="spinner" />
                    </div>
                )}
            >
                <GameProvider
                    engine={game.engine}
                    initialSnapshot={game.snapshot}
                    devTools={import.meta.env.DEV}
                >
                    <GameUI availableLocales={game.availableLocales} />
                </GameProvider>
            </AssetProvider>
        </InputProvider>
    );
}

function GameUI({ availableLocales }: { availableLocales: LocaleOption[] }) {
    const { snapshot, actions } = useGame();
    const [pendingVideo, setPendingVideo] = useState<string | null>(null);

    useEffect(() => {
        if (snapshot.pendingVideo) {
            setPendingVideo(snapshot.pendingVideo);
        }
    }, [snapshot.pendingVideo]);

    useInputAction(
        ({ command, choiceIndex }) => {
            if (!snapshot.dialogue) {
                return false;
            }

            if (
                snapshot.choices.length === 0 &&
                (command === 'confirm' || command === 'continue')
            ) {
                actions.continueDialogue();
                return true;
            }

            if (
                choiceIndex !== undefined &&
                choiceIndex >= 0 &&
                choiceIndex < snapshot.choices.length
            ) {
                actions.selectChoice(snapshot.choices[choiceIndex].id);
                return true;
            }

            return false;
        },
        { priority: 0 }
    );

    return (
        <div
            style={{
                padding: '2rem',
                fontFamily: 'sans-serif',
                maxWidth: '800px',
                margin: '0 auto',
            }}
        >
            {availableLocales.length > 1 && (
                <label>
                    {snapshot.ui['ui.language']}{' '}
                    <select
                        value={snapshot.currentLocale}
                        onChange={(event) =>
                            actions.setLocale(event.target.value)
                        }
                    >
                        {availableLocales.map((locale) => (
                            <option key={locale.code} value={locale.code}>
                                {locale.label}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {pendingVideo && (
                <VideoPlayer
                    src={pendingVideo}
                    onComplete={() => setPendingVideo(null)}
                />
            )}

            {snapshot.pendingInterlude && (
                <Interlude
                    interlude={snapshot.pendingInterlude}
                    onDismiss={actions.dismissInterlude}
                />
            )}

            <h1>{snapshot.location.name}</h1>
            <p>{snapshot.location.description}</p>

            {snapshot.dialogue && (
                <div
                    style={{
                        background: '#f0f0f0',
                        padding: '1rem',
                        borderRadius: '8px',
                        margin: '1rem 0',
                    }}
                >
                    <strong>{snapshot.dialogue.speakerName}:</strong>
                    <p>{snapshot.dialogue.text}</p>
                    {snapshot.choices.length > 0
                        ? snapshot.choices.map((choice) => (
                              <button
                                  key={choice.id}
                                  onClick={() => actions.selectChoice(choice.id)}
                                  style={{
                                      display: 'block',
                                      margin: '0.5rem 0',
                                      padding: '0.5rem 1rem',
                                      cursor: 'pointer',
                                  }}
                              >
                                  {choice.text}
                              </button>
                          ))
                        : (
                              <button
                                  onClick={actions.continueDialogue}
                                  style={{
                                      display: 'block',
                                      margin: '0.5rem 0',
                                      padding: '0.5rem 1rem',
                                      cursor: 'pointer',
                                  }}
                              >
                                  {snapshot.ui['ui.continue']}
                              </button>
                          )}
                </div>
            )}

            {!snapshot.dialogue && snapshot.charactersHere.length > 0 && (
                <div>
                    <h2>{snapshot.ui['ui.characters']}</h2>
                    {snapshot.charactersHere.map((char) => (
                        <button
                            key={char.id}
                            onClick={() => actions.talkTo(char.id)}
                            style={{
                                display: 'block',
                                margin: '0.5rem 0',
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                            }}
                        >
                            {char.name}
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
}
