/**
 * GameRenderer - Main component that renders the complete game UI
 *
 * Renders the game layout, dialogue, characters, and bottom-bar panels.
 * Audio playback is NOT managed here. The wrapper (GameShell or custom)
 * is responsible for calling useAudioManager.
 *
 * Settings panel requires AudioSettingsProvider to be present in the tree.
 * If no provider is found, the settings button is hidden.
 */

import { useState, useContext } from 'react';
import { useGame } from './hooks/useGame';
import { AudioSettingsContext } from './AudioSettingsContext';
import { DialogueBox } from './components/DialogueBox';
import { ChoiceList } from './components/ChoiceList';
import { LocationView } from './components/LocationView';
import { CharacterList } from './components/CharacterList';
import { Inventory } from './components/Inventory';
import { Journal } from './components/Journal';
import { PlayerNotes } from './components/PlayerNotes';
import { MapView } from './components/MapView';
import { NotificationArea } from './components/NotificationArea';
import { SaveLoadPanel } from './components/SaveLoadPanel';
import { Interlude } from './components/Interlude';
import { GameTime } from './components/GameTime';
import { SettingsPanel } from './components/SettingsPanel';

export interface GameRendererProps {
    className?: string;
}

type ActivePanel = 'inventory' | 'journal' | 'notes' | 'map' | 'saveload' | 'settings' | null;

function BottomBarButton({
    label,
    icon,
    onClick,
    active,
}: {
    label: string;
    icon: string;
    onClick: () => void;
    active: boolean;
}) {
    return (
        <button
            className={`bottom-bar-button ${active ? 'active' : ''}`}
            onClick={onClick}
            title={label}
        >
            <span className="bottom-bar-icon" data-icon={icon} />
            <span className="bottom-bar-label">{label}</span>
        </button>
    );
}

export function GameRenderer({ className = '' }: GameRendererProps) {
    const { snapshot, actions } = useGame();
    const audioSettings = useContext(AudioSettingsContext);

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);

    // Filter out underscore-prefixed variables (internal tracking)
    const visibleVariables = Object.entries(snapshot.variables).filter(
        ([key]) => !key.startsWith('_')
    );

    return (
        <div className={`game-renderer ${className}`}>
            {snapshot.pendingInterlude && (
                <Interlude
                    interlude={snapshot.pendingInterlude}
                    onDismiss={actions.dismissInterlude}
                />
            )}

            <NotificationArea notifications={snapshot.notifications} />

            <div className="game-layout">
                <main className="game-main">
                    <LocationView location={snapshot.location} />

                    {snapshot.dialogue ? (
                        <div className="dialogue-container">
                            <DialogueBox dialogue={snapshot.dialogue} />
                            <ChoiceList
                                choices={snapshot.choices}
                                onSelectChoice={actions.selectChoice}
                                onContinue={actions.continueDialogue}
                                continueLabel={snapshot.ui['ui.continue']}
                            />
                        </div>
                    ) : (
                        <CharacterList
                            characters={snapshot.charactersHere}
                            onTalkTo={actions.talkTo}
                        />
                    )}
                </main>

                <aside className="game-sidebar">
                    <GameTime time={snapshot.time} format="narrative" />

                    <div className="party-panel">
                        <h2>Party</h2>
                        {snapshot.party.length === 0 ? (
                            <p className="party-empty">{snapshot.ui['ui.no_companions']}</p>
                        ) : (
                            <div className="party-portraits">
                                {snapshot.party.map((member) => (
                                    <div
                                        key={member.id}
                                        className="party-member"
                                    >
                                        {member.portrait ? (
                                            <img
                                                src={member.portrait}
                                                alt={member.name}
                                                className="party-portrait"
                                            />
                                        ) : (
                                            <div className="party-portrait-placeholder" />
                                        )}
                                        <span className="party-name">
                                            {member.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {visibleVariables.length > 0 && (
                        <div className="resources-panel">
                            <h2>Resources</h2>
                            <ul className="resources-list">
                                {visibleVariables.map(([key, value]) => (
                                    <li key={key} className="resource-entry">
                                        <span className="resource-name">
                                            {key}
                                        </span>
                                        <span className="resource-value">
                                            {value}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>
            </div>

            <nav className="game-bottom-bar">
                <BottomBarButton
                    label={snapshot.ui['ui.inventory']}
                    icon="inventory"
                    onClick={() =>
                        setActivePanel(
                            activePanel === 'inventory' ? null : 'inventory'
                        )
                    }
                    active={activePanel === 'inventory'}
                />
                <BottomBarButton
                    label={snapshot.ui['ui.journal']}
                    icon="journal"
                    onClick={() =>
                        setActivePanel(
                            activePanel === 'journal' ? null : 'journal'
                        )
                    }
                    active={activePanel === 'journal'}
                />
                <BottomBarButton
                    label={snapshot.ui['ui.notes']}
                    icon="notes"
                    onClick={() =>
                        setActivePanel(
                            activePanel === 'notes' ? null : 'notes'
                        )
                    }
                    active={activePanel === 'notes'}
                />
                {snapshot.map && (
                    <BottomBarButton
                        label={snapshot.ui['ui.map']}
                        icon="map"
                        onClick={() =>
                            setActivePanel(
                                activePanel === 'map' ? null : 'map'
                            )
                        }
                        active={activePanel === 'map'}
                    />
                )}
                <BottomBarButton
                    label={snapshot.ui['ui.save_load']}
                    icon="save"
                    onClick={() =>
                        setActivePanel(
                            activePanel === 'saveload' ? null : 'saveload'
                        )
                    }
                    active={activePanel === 'saveload'}
                />
                {audioSettings && (
                    <BottomBarButton
                        label={snapshot.ui['ui.settings']}
                        icon="settings"
                        onClick={() =>
                            setActivePanel(
                                activePanel === 'settings' ? null : 'settings'
                            )
                        }
                        active={activePanel === 'settings'}
                    />
                )}
            </nav>

            {activePanel === 'inventory' && (
                <div
                    className="panel-overlay"
                    onClick={() => setActivePanel(null)}
                >
                    <div
                        className="panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Inventory items={snapshot.inventory} />
                        <button
                            className="panel-close"
                            onClick={() => setActivePanel(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {activePanel === 'journal' && (
                <div
                    className="panel-overlay"
                    onClick={() => setActivePanel(null)}
                >
                    <div
                        className="panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Journal
                            quests={snapshot.quests}
                            entries={snapshot.journal}
                        />
                        <button
                            className="panel-close"
                            onClick={() => setActivePanel(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {activePanel === 'notes' && (
                <div
                    className="panel-overlay"
                    onClick={() => setActivePanel(null)}
                >
                    <div
                        className="panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PlayerNotes
                            notes={snapshot.playerNotes}
                            onWrite={actions.writeNote}
                            onDelete={actions.deleteNote}
                        />
                        <button
                            className="panel-close"
                            onClick={() => setActivePanel(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {activePanel === 'map' && snapshot.map && (
                <div
                    className="panel-overlay"
                    onClick={() => setActivePanel(null)}
                >
                    <div
                        className="panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MapView
                            map={snapshot.map}
                            currentLocation={snapshot.location.id}
                            currentTime={snapshot.time}
                            onTravelTo={(id) => {
                                actions.travelTo(id);
                                setActivePanel(null);
                            }}
                        />
                        <button
                            className="panel-close"
                            onClick={() => setActivePanel(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {activePanel === 'saveload' && (
                <div
                    className="panel-overlay"
                    onClick={() => setActivePanel(null)}
                >
                    <div
                        className="panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SaveLoadPanel
                            ui={snapshot.ui}
                            onSave={actions.saveGame}
                            onLoad={actions.loadGame}
                        />
                        <button
                            className="panel-close"
                            onClick={() => setActivePanel(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {activePanel === 'settings' && audioSettings && (
                <div
                    className="panel-overlay"
                    onClick={() => setActivePanel(null)}
                >
                    <div
                        className="panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SettingsPanel
                            audio={audioSettings}
                            onLocaleChange={actions.setLocale}
                            currentLocale={snapshot.currentLocale}
                            onBack={() => setActivePanel(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
