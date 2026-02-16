/**
 * PauseMenu - In-game overlay with Resume, Save, Load, Settings, Quit
 */

export interface PauseMenuProps {
  /** Resume gameplay */
  onResume: () => void
  /** Save the game */
  onSave: () => void
  /** Load a saved game */
  onLoad: () => void
  /** Open settings */
  onSettings: () => void
  /** Quit to title screen */
  onQuitToTitle: () => void
  /** CSS class */
  className?: string
}

export function PauseMenu({
  onResume,
  onSave,
  onLoad,
  onSettings,
  onQuitToTitle,
  className = '',
}: PauseMenuProps) {
  return (
    <div className={`pause-menu-overlay ${className}`}>
      <div className="pause-menu">
        <h2 className="pause-title">Paused</h2>
        <div className="pause-buttons">
          <button className="pause-button" onClick={onResume}>Resume</button>
          <button className="pause-button" onClick={onSave}>Save</button>
          <button className="pause-button" onClick={onLoad}>Load</button>
          <button className="pause-button" onClick={onSettings}>Settings</button>
          <button className="pause-button pause-button-quit" onClick={onQuitToTitle}>Quit to Title</button>
        </div>
      </div>
    </div>
  )
}
