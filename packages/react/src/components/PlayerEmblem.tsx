/**
 * PlayerEmblem - Displays the built-in portrait fallback for the player
 */

export interface PlayerEmblemProps {
    className?: string;
}

export function PlayerEmblem({
    className = 'player-emblem',
}: PlayerEmblemProps) {
    return (
        <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
            <path
                d="M32 5 53 20v24L32 59 11 44V20L32 5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path d="m32 15 10 17-10 17-10-17 10-17Z" fill="currentColor" />
        </svg>
    );
}
