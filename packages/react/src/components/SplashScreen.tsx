/**
 * SplashScreen - Brief logo/loading screen
 *
 * Displays a logo and title, then auto-advances after a duration.
 */

import { useEffect } from 'react'

export interface SplashScreenProps {
  /** Logo image source */
  logoSrc?: string
  /** Game title */
  title?: string
  /** Called when splash completes */
  onComplete: () => void
  /** Duration in ms before auto-advancing */
  duration?: number
  /** CSS class */
  className?: string
}

export function SplashScreen({
  logoSrc,
  title,
  onComplete,
  duration = 2000,
  className = '',
}: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration)
    return () => clearTimeout(timer)
  }, [onComplete, duration])

  return (
    <div className={`splash-screen ${className}`} onClick={onComplete}>
      {logoSrc && <img src={logoSrc} alt={title || ''} className="splash-logo" />}
      {title && <h1 className="splash-title">{title}</h1>}
      <div className="splash-loading">Loading...</div>
    </div>
  )
}
