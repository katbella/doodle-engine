/**
 * GameTime - Displays current in-game time
 */

export type TimeFormat = 'numeric' | 'narrative' | 'short';

export interface GameTimeProps {
    time: { day: number; hour: number };
    format?: TimeFormat;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

function getTimeOfDay(
    hour: number,
    t: (key: string, fallback: string) => string
): string {
    if (hour >= 5 && hour < 8) return t('ui.time_dawn', 'Dawn');
    if (hour >= 8 && hour < 12) return t('ui.time_morning', 'Morning');
    if (hour >= 12 && hour < 14) return t('ui.time_midday', 'Midday');
    if (hour >= 14 && hour < 17) return t('ui.time_afternoon', 'Afternoon');
    if (hour >= 17 && hour < 20) return t('ui.time_evening', 'Evening');
    if (hour >= 20 && hour < 22) return t('ui.time_dusk', 'Dusk');
    return t('ui.time_night', 'Night');
}

export function formatHour(hour: number): string {
    return hour.toString().padStart(2, '0') + ':00';
}

export function GameTime({
    time,
    format = 'numeric',
    ui,
    className = '',
}: GameTimeProps) {
    const t = (key: string, fallback: string) => ui?.[key] ?? fallback;
    const day = t('ui.day', 'Day {day}').replace('{day}', String(time.day));
    let display: string;

    switch (format) {
        case 'narrative':
            display = `${day}, ${getTimeOfDay(time.hour, t)}`;
            break;
        case 'short':
            display = `D${time.day} ${formatHour(time.hour)}`;
            break;
        case 'numeric':
        default:
            display = `${day}, ${formatHour(time.hour)}`;
            break;
    }

    return (
        <div className={`game-time ${className}`}>
            <span className="game-time-display">{display}</span>
        </div>
    );
}
