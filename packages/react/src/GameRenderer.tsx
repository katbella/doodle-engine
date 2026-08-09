/**
 * GameRenderer - Main component that renders the complete game UI
 *
 * Renders the game layout, dialogue, characters, and game menu panels.
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
import { InputProviderBoundary, useInputAction } from './input/InputRouter';
import { saveStorageKeyForProject } from './saves';
import { uiText } from './uiText';

const GAME_MENU_ICON_PATHS: Record<string, string> = {
    back: 'M10 6l-6 6 6 6M4 12h10a6 6 0 016 6',
    party: 'M9 10.6a3 3 0 100-6 3 3 0 000 6zM3.4 19.5v-1.4c0-2.2 2.5-3.6 5.6-3.6s5.6 1.4 5.6 3.6v1.4M16 5.2a3 3 0 010 5.7M17.4 14.7c1.9.5 3.2 1.6 3.2 3.1v1.7',
    inventory: 'M7 8h10l1 11H6zM9.5 8V6a2.5 2.5 0 015 0v2',
    journal: 'M4 5h7v14H4zM13 5h7v14h-7zM11 5v14',
    notes: 'M6 3h9l3 3v15H6zM15 3v3h3M9 12h7M9 15.5h5',
    map: 'M12 3l1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6z',
    save: 'M5 4h14v16H5zM9 4v6h6V4M9 16h6',
    settings:
        'M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zM12 3v2.4M12 18.6V21M4.6 7.2l2 1.2M17.4 15.6l2 1.2M4.6 16.8l2-1.2M17.4 8.4l2-1.2',
    menu: 'M5 21V9.5L12 4l7 5.5V21M9.5 21v-6.5a2.5 2.5 0 015 0V21M3.5 21h17',
};

function resourceLabel(key: string): string {
    return key
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export interface GameRendererProps {
    className?: string;
    /** Stable project identity generated once when the project is created. */
    projectId: string;
    /** Called once when an enabled button in the game interface is clicked. */
    onButtonClick?: () => void;
    /** Opens the shell menu from the anchored game-menu control. */
    onOpenMenu?: () => void;
    /** Called when the player cancels profile creation to return to the title. */
    onCancelSetup?: () => void;
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

const PANEL_UI_KEYS: Record<Exclude<ActivePanel, null>, string> = {
    party: 'ui.party',
    inventory: 'ui.inventory',
    journal: 'ui.journal',
    notes: 'ui.notes',
    map: 'ui.map',
    saveload: 'ui.save_load',
    settings: 'ui.settings',
};

function GameMenuButton({
    label,
    icon,
    onClick,
    active,
    className = '',
}: {
    label: string;
    icon: string;
    onClick: () => void;
    active: boolean;
    className?: string;
}) {
    return (
        <button
            className={`game-menu-button doodle-tooltip ${className} ${active ? 'active is-active' : ''}`}
            onClick={onClick}
            data-tip={label}
            aria-label={label}
            aria-pressed={active}
        >
            <span
                className="game-menu-icon"
                data-icon={icon}
                aria-hidden="true"
            >
                <svg viewBox="0 0 24 24" focusable="false">
                    <path d={GAME_MENU_ICON_PATHS[icon]} />
                </svg>
            </span>
            <span className="game-menu-label">{label}</span>
        </button>
    );
}

function PanelWorkspace({
    label,
    closeLabel,
    onDismiss,
    children,
}: {
    label: string;
    closeLabel: string;
    onDismiss: () => void;
    children: ReactNode;
}) {
    return (
        <div className="panel-workspace">
            <section className="panel" aria-label={label}>
                <header className="panel-header">
                    <div className="panel-header-title-group">
                        <span
                            className="panel-header-rule"
                            aria-hidden="true"
                        />
                        <h1 className="panel-title">{label}</h1>
                    </div>
                    <button
                        className="panel-close"
                        type="button"
                        onClick={onDismiss}
                        aria-label={closeLabel}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="panel-body">{children}</div>
            </section>
        </div>
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
    onOpenMenu,
    onCancelSetup,
}: GameRendererProps) {
    saveStorageKeyForProject(projectId);
    const { snapshot, actions } = useGame();
    const audioSettings = useContext(AudioSettingsContext);

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [partyIndex, setPartyIndex] = useState(0);
    const partyProfiles = [snapshot.player, ...snapshot.party];
    const selectedPartyProfile =
        partyProfiles[partyIndex % partyProfiles.length];
    const activePanelLabel = activePanel
        ? uiText(snapshot.ui, PANEL_UI_KEYS[activePanel])
        : '';
    const hasBlockingFlow =
        !snapshot.player.profileComplete || Boolean(snapshot.pendingInterlude);

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
            {snapshot.pendingInterlude && snapshot.player.profileComplete && (
                <Interlude
                    interlude={snapshot.pendingInterlude}
                    onDismiss={actions.dismissInterlude}
                    ui={snapshot.ui}
                />
            )}

            {!snapshot.player.profileComplete && (
                <PlayerSetup
                    ui={snapshot.ui}
                    onSubmit={actions.setPlayerProfile}
                    onCancel={onCancelSetup}
                />
            )}

            {!hasBlockingFlow && (
                <>
                    <NotificationArea notifications={snapshot.notifications} />

                    <div className="game-layout">
                        <nav
                            className="game-menu doodle-leather"
                            aria-label={uiText(snapshot.ui, 'ui.menu')}
                        >
                            {activePanel && (
                                <GameMenuButton
                                    label={uiText(
                                        snapshot.ui,
                                        'ui.return_to_game'
                                    )}
                                    icon="back"
                                    onClick={() => setActivePanel(null)}
                                    active={false}
                                    className="game-menu-back-button"
                                />
                            )}
                            <GameMenuButton
                                label={uiText(snapshot.ui, 'ui.party')}
                                icon="party"
                                onClick={() => setActivePanel('party')}
                                active={activePanel === 'party'}
                            />
                            <GameMenuButton
                                label={uiText(snapshot.ui, 'ui.inventory')}
                                icon="inventory"
                                onClick={() => setActivePanel('inventory')}
                                active={activePanel === 'inventory'}
                            />
                            <GameMenuButton
                                label={uiText(snapshot.ui, 'ui.journal')}
                                icon="journal"
                                onClick={() => setActivePanel('journal')}
                                active={activePanel === 'journal'}
                            />
                            <GameMenuButton
                                label={uiText(snapshot.ui, 'ui.notes')}
                                icon="notes"
                                onClick={() => setActivePanel('notes')}
                                active={activePanel === 'notes'}
                            />
                            {snapshot.map && (
                                <GameMenuButton
                                    label={uiText(snapshot.ui, 'ui.map')}
                                    icon="map"
                                    onClick={() => setActivePanel('map')}
                                    active={activePanel === 'map'}
                                />
                            )}
                            <GameMenuButton
                                label={uiText(snapshot.ui, 'ui.save_load')}
                                icon="save"
                                onClick={() => setActivePanel('saveload')}
                                active={activePanel === 'saveload'}
                            />
                            {audioSettings && (
                                <GameMenuButton
                                    label={uiText(snapshot.ui, 'ui.settings')}
                                    icon="settings"
                                    onClick={() => setActivePanel('settings')}
                                    active={activePanel === 'settings'}
                                />
                            )}
                            {onOpenMenu && (
                                <GameMenuButton
                                    label={uiText(snapshot.ui, 'ui.menu')}
                                    icon="menu"
                                    onClick={onOpenMenu}
                                    active={false}
                                    className="game-shell-menu-button"
                                />
                            )}
                        </nav>

                        <main className="game-content">
                            <LocationView
                                ui={snapshot.ui}
                                location={snapshot.location}
                            />

                            {snapshot.dialogue ? (
                                <DialogueBox dialogue={snapshot.dialogue}>
                                    <ChoiceList
                                        choices={snapshot.choices}
                                        onSelectChoice={actions.selectChoice}
                                        onContinue={actions.continueDialogue}
                                        continueLabel={
                                            snapshot.dialogue
                                                .continueEndsDialogue
                                                ? uiText(
                                                      snapshot.ui,
                                                      'ui.end_dialogue'
                                                  )
                                                : uiText(
                                                      snapshot.ui,
                                                      'ui.continue'
                                                  )
                                        }
                                    />
                                </DialogueBox>
                            ) : (
                                <div className="dialogue-stage is-idle">
                                    <div className="dialogue-container">
                                        <div className="dialogue-idle">
                                            {uiText(
                                                snapshot.ui,
                                                'ui.idle_hint'
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <CharacterList
                                ui={snapshot.ui}
                                characters={snapshot.charactersHere}
                                activeCharacterId={snapshot.dialogue?.speaker}
                                onTalkTo={actions.talkTo}
                            />
                        </main>

                        <aside className="game-status doodle-leather">
                            <GameTime
                                ui={snapshot.ui}
                                time={snapshot.time}
                                format="narrative"
                            />

                            <div className="party-panel">
                                {snapshot.party.length === 0 ? (
                                    <p className="party-empty">
                                        {uiText(
                                            snapshot.ui,
                                            'ui.no_companions'
                                        )}
                                    </p>
                                ) : (
                                    <div className="party-portraits">
                                        {snapshot.party.map((member) => {
                                            const isSpeaking =
                                                member.id ===
                                                snapshot.dialogue?.speaker;
                                            return (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    className={`party-member ${isSpeaking ? 'is-speaking' : ''}`}
                                                    onClick={() =>
                                                        actions.talkTo(
                                                            member.id
                                                        )
                                                    }
                                                    aria-pressed={isSpeaking}
                                                >
                                                    {member.portrait ? (
                                                        <img
                                                            src={
                                                                member.portrait
                                                            }
                                                            alt={member.name}
                                                            className="party-portrait"
                                                        />
                                                    ) : (
                                                        <div className="party-portrait party-portrait-placeholder" />
                                                    )}
                                                    <span className="party-member-body">
                                                        <span className="party-name">
                                                            {member.name}
                                                        </span>
                                                        {member.title && (
                                                            <span className="party-role">
                                                                {member.title}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {isSpeaking && (
                                                        <span
                                                            className="character-speaking-mark"
                                                            aria-hidden="true"
                                                        >
                                                            <svg viewBox="0 0 24 24">
                                                                <path d="M4 5.5h16v9H12l-4.5 4v-4H4z" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {visibleVariables.length > 0 && (
                                <div className="resources-panel">
                                    <ul className="resources-list">
                                        {visibleVariables.map(
                                            ([key, value]) => (
                                                <li
                                                    key={key}
                                                    className={`resource-entry resource-${key
                                                        .toLowerCase()
                                                        .replace(
                                                            /[^a-z0-9-]+/g,
                                                            '-'
                                                        )}`}
                                                >
                                                    <span className="resource-name">
                                                        {resourceLabel(key)}
                                                    </span>
                                                    <span className="resource-value">
                                                        {value}
                                                    </span>
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}
                        </aside>
                    </div>

                    {activePanel && (
                        <PanelWorkspace
                            label={activePanelLabel}
                            closeLabel={uiText(snapshot.ui, 'ui.close')}
                            onDismiss={() => setActivePanel(null)}
                        >
                            {activePanel === 'party' && (
                                <CharacterSheet
                                    ui={snapshot.ui}
                                    character={selectedPartyProfile}
                                    characters={partyProfiles}
                                    position={partyIndex % partyProfiles.length}
                                    count={partyProfiles.length}
                                    onSelect={setPartyIndex}
                                    onPrevious={() =>
                                        setPartyIndex(
                                            (current) =>
                                                (current -
                                                    1 +
                                                    partyProfiles.length) %
                                                partyProfiles.length
                                        )
                                    }
                                    onNext={() =>
                                        setPartyIndex(
                                            (current) =>
                                                (current + 1) %
                                                partyProfiles.length
                                        )
                                    }
                                />
                            )}
                            {activePanel === 'inventory' && (
                                <Inventory
                                    ui={snapshot.ui}
                                    items={snapshot.inventory}
                                />
                            )}
                            {activePanel === 'journal' && (
                                <div className="panel-parchment-body">
                                    <div className="panel-parchment-sheet doodle-parchment-surface">
                                        <Journal
                                            ui={snapshot.ui}
                                            quests={snapshot.quests}
                                            entries={snapshot.journal}
                                            onTrackQuest={(questId) => {
                                                const quest =
                                                    snapshot.quests.find(
                                                        (candidate) =>
                                                            candidate.id ===
                                                            questId
                                                    );
                                                if (quest?.tracked) {
                                                    actions.clearTrackedQuest();
                                                } else {
                                                    actions.trackQuest(questId);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            {activePanel === 'notes' && (
                                <div className="panel-parchment-body">
                                    <div className="panel-parchment-sheet doodle-parchment-surface">
                                        <PlayerNotes
                                            ui={snapshot.ui}
                                            notes={snapshot.playerNotes}
                                            onWrite={actions.writeNote}
                                            onDelete={actions.deleteNote}
                                        />
                                    </div>
                                </div>
                            )}
                            {activePanel === 'map' && snapshot.map && (
                                <div className="panel-parchment-body">
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
                                </div>
                            )}
                            {activePanel === 'saveload' && (
                                <SaveLoadPanel
                                    ui={snapshot.ui}
                                    onSave={actions.saveGame}
                                    onLoad={actions.loadGame}
                                    projectId={projectId}
                                />
                            )}
                            {activePanel === 'settings' && audioSettings && (
                                <SettingsPanel
                                    ui={snapshot.ui}
                                    audio={audioSettings}
                                    onLocaleChange={actions.setLocale}
                                    currentLocale={snapshot.currentLocale}
                                    onBack={() => setActivePanel(null)}
                                />
                            )}
                        </PanelWorkspace>
                    )}
                </>
            )}
        </div>
    );
}
