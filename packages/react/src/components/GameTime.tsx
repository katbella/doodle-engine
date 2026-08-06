/**
 * GameTime - Displays current in-game time
 */

import { uiText } from '../uiText';

export type TimeFormat = 'numeric' | 'narrative' | 'short';

export interface GameTimeProps {
    time: { day: number; hour: number };
    format?: TimeFormat;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

function getTimeOfDay(hour: number, t: (key: string) => string): string {
    if (hour >= 5 && hour < 8) return t('ui.time_dawn');
    if (hour >= 8 && hour < 12) return t('ui.time_morning');
    if (hour >= 12 && hour < 14) return t('ui.time_midday');
    if (hour >= 14 && hour < 17) return t('ui.time_afternoon');
    if (hour >= 17 && hour < 20) return t('ui.time_evening');
    if (hour >= 20 && hour < 22) return t('ui.time_dusk');
    return t('ui.time_night');
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
    const t = (key: string) => uiText(ui, key);
    const day = t('ui.day').replace('{day}', String(time.day));
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
            <div className="game-time-display">{display}</div>
            {format === 'narrative' && (
                <div className="game-time-clock">{formatHour(time.hour)}</div>
            )}
        </div>
    );
}
