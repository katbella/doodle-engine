/**
 * GameTime - Displays current in-game time
 */

export type TimeFormat = 'numeric' | 'narrative' | 'short';

export interface GameTimeProps {
    time: { day: number; hour: number };
    format?: TimeFormat;
    className?: string;
}

function getTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 8) return 'Dawn';
    if (hour >= 8 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 14) return 'Midday';
    if (hour >= 14 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 20) return 'Evening';
    if (hour >= 20 && hour < 22) return 'Dusk';
    return 'Night';
}

export function formatHour(hour: number): string {
    return hour.toString().padStart(2, '0') + ':00';
}

export function GameTime({
    time,
    format = 'numeric',
    className = '',
}: GameTimeProps) {
    let display: string;

    switch (format) {
        case 'narrative':
            display = `Day ${time.day}, ${getTimeOfDay(time.hour)}`;
            break;
        case 'short':
            display = `D${time.day} ${formatHour(time.hour)}`;
            break;
        case 'numeric':
        default:
            display = `Day ${time.day}, ${formatHour(time.hour)}`;
            break;
    }

    return (
        <div className={`game-time ${className}`}>
            <span className="game-time-display">{display}</span>
        </div>
    );
}
