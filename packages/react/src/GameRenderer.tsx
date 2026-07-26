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

import { useState, useContext, type ReactNode } from 'react';
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
import { CharacterSheet } from './components/CharacterSheet';
import { PlayerSetup } from './components/PlayerSetup';
import { DialogOverlay } from './components/DialogOverlay';
import { InputProviderBoundary, useInputAction } from './input/InputRouter';
import { saveStorageKeyForProject } from './saves';
import { uiText } from './uiText';

export interface GameRendererProps {
    className?: string;
    /** Stable project identity generated once when the project is created. */
    projectId: string;
    /** Called once when an enabled button in the game interface is clicked. */
    onButtonClick?: () => void;
}

type ActivePanel =
    | 'party'
    | 'inventory'
    | 'journal'
    | 'notes'
    | 'map'
    | 'saveload'
    | 'settings'
    | null;

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

function PanelDialog({
    label,
    onDismiss,
    children,
}: {
    label: string;
    onDismiss: () => void;
    children: ReactNode;
}) {
    return (
        <DialogOverlay
            overlayClassName="panel-overlay"
            className="panel"
            ariaLabel={label}
            onDismiss={onDismiss}
        >
            {children}
        </DialogOverlay>
    );
}

export function GameRenderer(props: GameRendererProps) {
    return (
        <InputProviderBoundary>
            <GameRendererInner {...props} />
        </InputProviderBoundary>
    );
}

function GameRendererInner({
    className = '',
    projectId,
    onButtonClick,
}: GameRendererProps) {
    saveStorageKeyForProject(projectId);
    const { snapshot, actions } = useGame();
    const audioSettings = useContext(AudioSettingsContext);

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [partyIndex, setPartyIndex] = useState(0);
    const partyProfiles = [snapshot.player, ...snapshot.party];
    const selectedPartyProfile =
        partyProfiles[partyIndex % partyProfiles.length];

    useInputAction(
        ({ command }) => {
            if (command !== 'cancel' || !activePanel) {
                return false;
            }

            setActivePanel(null);
            return true;
        },
        { priority: 150, enabled: activePanel !== null }
    );

    // Filter out underscore-prefixed variables (internal tracking)
    const visibleVariables = Object.entries(snapshot.variables).filter(
        ([key]) => !key.startsWith('_')
    );

    return (
        <div
            className={`game-renderer ${className}`}
            onClickCapture={(event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                const button = target.closest('button');
                if (!button || button.disabled) return;
                onButtonClick?.();
            }}
        >
            {snapshot.pendingInterlude && (
                <Interlude
                    interlude={snapshot.pendingInterlude}
                    onDismiss={actions.dismissInterlude}
                />
            )}

            {!snapshot.player.profileComplete && (
                <PlayerSetup
                    ui={snapshot.ui}
                    onSubmit={actions.setPlayerProfile}
                />
            )}

            <NotificationArea notifications={snapshot.notifications} />

            <div className="game-layout">
                <main className="game-main">
                    <LocationView
                        ui={snapshot.ui}
                        location={snapshot.location}
                    />

                    {snapshot.dialogue ? (
                        <div className="dialogue-container">
                            <DialogueBox dialogue={snapshot.dialogue} />
                            <ChoiceList
                                choices={snapshot.choices}
                                onSelectChoice={actions.selectChoice}
                                onContinue={actions.continueDialogue}
                                continueLabel={
                                    snapshot.dialogue.continueEndsDialogue
                                        ? uiText(snapshot.ui, 'ui.end_dialogue')
                                        : uiText(snapshot.ui, 'ui.continue')
                                }
                            />
                        </div>
                    ) : (
                        <CharacterList
                            ui={snapshot.ui}
                            characters={snapshot.charactersHere}
                            onTalkTo={actions.talkTo}
                        />
                    )}
                </main>

                <aside className="game-sidebar">
                    <GameTime
                        ui={snapshot.ui}
                        time={snapshot.time}
                        format="narrative"
                    />

                    <div className="party-panel">
                        <h2>{uiText(snapshot.ui, 'ui.party')}</h2>
                        {snapshot.party.length === 0 ? (
                            <p className="party-empty">
                                {uiText(snapshot.ui, 'ui.no_companions')}
                            </p>
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
                            <h2>{uiText(snapshot.ui, 'ui.resources')}</h2>
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
                    label={uiText(snapshot.ui, 'ui.party')}
                    icon="party"
                    onClick={() =>
                        setActivePanel(activePanel === 'party' ? null : 'party')
                    }
                    active={activePanel === 'party'}
                />
                <BottomBarButton
                    label={uiText(snapshot.ui, 'ui.inventory')}
                    icon="inventory"
                    onClick={() =>
                        setActivePanel(
                            activePanel === 'inventory' ? null : 'inventory'
                        )
                    }
                    active={activePanel === 'inventory'}
                />
                <BottomBarButton
                    label={uiText(snapshot.ui, 'ui.journal')}
                    icon="journal"
                    onClick={() =>
                        setActivePanel(
                            activePanel === 'journal' ? null : 'journal'
                        )
                    }
                    active={activePanel === 'journal'}
                />
                <BottomBarButton
                    label={uiText(snapshot.ui, 'ui.notes')}
                    icon="notes"
                    onClick={() =>
                        setActivePanel(activePanel === 'notes' ? null : 'notes')
                    }
                    active={activePanel === 'notes'}
                />
                {snapshot.map && (
                    <BottomBarButton
                        label={uiText(snapshot.ui, 'ui.map')}
                        icon="map"
                        onClick={() =>
                            setActivePanel(activePanel === 'map' ? null : 'map')
                        }
                        active={activePanel === 'map'}
                    />
                )}
                <BottomBarButton
                    label={uiText(snapshot.ui, 'ui.save_load')}
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
                        label={uiText(snapshot.ui, 'ui.settings')}
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

            {activePanel === 'party' && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.party')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <CharacterSheet
                        ui={snapshot.ui}
                        character={selectedPartyProfile}
                        position={partyIndex % partyProfiles.length}
                        count={partyProfiles.length}
                        onPrevious={() =>
                            setPartyIndex(
                                (current) =>
                                    (current - 1 + partyProfiles.length) %
                                    partyProfiles.length
                            )
                        }
                        onNext={() =>
                            setPartyIndex(
                                (current) =>
                                    (current + 1) % partyProfiles.length
                            )
                        }
                    />
                    <button
                        className="panel-close"
                        onClick={() => setActivePanel(null)}
                    >
                        {uiText(snapshot.ui, 'ui.close')}
                    </button>
                </PanelDialog>
            )}

            {activePanel === 'inventory' && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.inventory')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <Inventory ui={snapshot.ui} items={snapshot.inventory} />
                    <button
                        className="panel-close"
                        onClick={() => setActivePanel(null)}
                    >
                        {uiText(snapshot.ui, 'ui.close')}
                    </button>
                </PanelDialog>
            )}
            {activePanel === 'journal' && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.journal')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <Journal
                        ui={snapshot.ui}
                        quests={snapshot.quests}
                        entries={snapshot.journal}
                    />
                    <button
                        className="panel-close"
                        onClick={() => setActivePanel(null)}
                    >
                        {uiText(snapshot.ui, 'ui.close')}
                    </button>
                </PanelDialog>
            )}
            {activePanel === 'notes' && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.notes')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <PlayerNotes
                        ui={snapshot.ui}
                        notes={snapshot.playerNotes}
                        onWrite={actions.writeNote}
                        onDelete={actions.deleteNote}
                    />
                    <button
                        className="panel-close"
                        onClick={() => setActivePanel(null)}
                    >
                        {uiText(snapshot.ui, 'ui.close')}
                    </button>
                </PanelDialog>
            )}
            {activePanel === 'map' && snapshot.map && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.map')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <MapView
                        ui={snapshot.ui}
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
                        {uiText(snapshot.ui, 'ui.close')}
                    </button>
                </PanelDialog>
            )}
            {activePanel === 'saveload' && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.save_load')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <SaveLoadPanel
                        ui={snapshot.ui}
                        onSave={actions.saveGame}
                        onLoad={actions.loadGame}
                        projectId={projectId}
                    />
                    <button
                        className="panel-close"
                        onClick={() => setActivePanel(null)}
                    >
                        {uiText(snapshot.ui, 'ui.close')}
                    </button>
                </PanelDialog>
            )}
            {activePanel === 'settings' && audioSettings && (
                <PanelDialog
                    label={uiText(snapshot.ui, 'ui.settings')}
                    onDismiss={() => setActivePanel(null)}
                >
                    <SettingsPanel
                        ui={snapshot.ui}
                        audio={audioSettings}
                        onLocaleChange={actions.setLocale}
                        currentLocale={snapshot.currentLocale}
                        onBack={() => setActivePanel(null)}
                    />
                </PanelDialog>
            )}
        </div>
    );
}
