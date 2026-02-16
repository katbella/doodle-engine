/**
 * TitleScreen - Main menu with New Game, Continue, Settings
 */

export interface TitleScreenProps {
  /** Game title */
  title?: string
  /** Subtitle text */
  subtitle?: string
  /** Logo image source */
  logoSrc?: string
  /** Whether a save exists to continue from */
  hasSaveData: boolean
  /** Start a new game */
  onNewGame: () => void
  /** Continue from save */
  onContinue: () => void
  /** Open settings */
  onSettings: () => void
  /** CSS class */
  className?: string
}

export function TitleScreen({
  title = 'Doodle Engine',
  subtitle,
  logoSrc,
  hasSaveData,
  onNewGame,
  onContinue,
  onSettings,
  className = '',
}: TitleScreenProps) {
  return (
    <div className={`title-screen ${className}`}>
      {logoSrc && <img src={logoSrc} alt={title} className="title-logo" />}
      <h1 className="title-heading">{title}</h1>
      {subtitle && <p className="title-subtitle">{subtitle}</p>}
      <div className="title-menu">
        <button className="title-button" onClick={onNewGame}>New Game</button>
        {hasSaveData && (
          <button className="title-button" onClick={onContinue}>Continue</button>
        )}
        <button className="title-button" onClick={onSettings}>Settings</button>
      </div>
    </div>
  )
}
