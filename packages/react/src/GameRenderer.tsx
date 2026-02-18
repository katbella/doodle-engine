/**
 * GameRenderer - Main component that renders the complete game UI
 */

import { useGame } from "./hooks/useGame";
import { useAudioManager } from "./hooks/useAudioManager";
import { DialogueBox } from "./components/DialogueBox";
import { ChoiceList } from "./components/ChoiceList";
import { LocationView } from "./components/LocationView";
import { CharacterList } from "./components/CharacterList";
import { Inventory } from "./components/Inventory";
import { Journal } from "./components/Journal";
import { MapView } from "./components/MapView";
import { NotificationArea } from "./components/NotificationArea";
import { SaveLoadPanel } from "./components/SaveLoadPanel";
import { Interlude } from "./components/Interlude";

export interface GameRendererProps {
  className?: string;
}

export function GameRenderer({ className = "" }: GameRendererProps) {
  const { snapshot, actions } = useGame();
  useAudioManager(snapshot);

  // Filter out underscore-prefixed variables (internal tracking)
  const visibleVariables = Object.entries(snapshot.variables).filter(
    ([key]) => !key.startsWith("_"),
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

      <div className="game-main">
        <LocationView location={snapshot.location} />

        {snapshot.dialogue && (
          <div className="dialogue-container">
            <DialogueBox dialogue={snapshot.dialogue} />
            <ChoiceList
              choices={snapshot.choices}
              onSelectChoice={actions.selectChoice}
            />
          </div>
        )}

        {!snapshot.dialogue && (
          <CharacterList
            characters={snapshot.charactersHere}
            onTalkTo={actions.talkTo}
          />
        )}
      </div>

      <div className="game-sidebar">
        <SaveLoadPanel onSave={actions.saveGame} onLoad={actions.loadGame} />

        {visibleVariables.length > 0 && (
          <div className="resources">
            <h2>Resources</h2>
            <ul className="resources-list">
              {visibleVariables.map(([key, value]) => (
                <li key={key} className="resource-entry">
                  <span className="resource-name">{key}</span>
                  <span className="resource-value">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {snapshot.party.length > 0 && (
          <div className="party">
            <h2>Party</h2>
            <ul className="party-list">
              {snapshot.party.map((member) => (
                <li key={member.id} className="party-member">
                  <span className="party-member-name">{member.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Inventory items={snapshot.inventory} />
        <Journal quests={snapshot.quests} entries={snapshot.journal} />
        {snapshot.map && (
          <MapView map={snapshot.map} onTravelTo={actions.travelTo} />
        )}
      </div>
    </div>
  );
}
