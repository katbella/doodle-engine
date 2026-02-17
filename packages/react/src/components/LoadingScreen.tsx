/**
 * LoadingScreen - Displayed while game content is loading
 *
 * Simple default loading state. Replace with your own component or
 * style it with CSS using the className prop.
 */

export interface LoadingScreenProps {
  /** Optional message to display */
  message?: string
  /** CSS class for custom styling */
  className?: string
}

export function LoadingScreen({ message = 'Loading...', className = '' }: LoadingScreenProps) {
  return (
    <div className={`loading-screen ${className}`}>
      <div className="loading-screen-content">
        <div className="loading-screen-spinner" />
        <p className="loading-screen-message">{message}</p>
      </div>
    </div>
  )
}
