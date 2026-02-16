/**
 * NotificationArea - Displays notifications from effects
 *
 * Notifications are transient: the engine includes them in exactly one snapshot,
 * then clears them. This component simply renders whatever is in the snapshot.
 */

export interface NotificationAreaProps {
  notifications: string[]
  className?: string
}

export function NotificationArea({
  notifications,
  className = '',
}: NotificationAreaProps) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className={`notification-area ${className}`}>
      {notifications.map((text, index) => (
        <div key={index} className="notification">
          {text}
        </div>
      ))}
    </div>
  )
}
