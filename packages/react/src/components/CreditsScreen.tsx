import type { ReactNode } from 'react';

export interface CreditsScreenProps {
    ui: Record<string, string>;
    title: string;
    children?: ReactNode;
    onBack: () => void;
    className?: string;
}

export function CreditsScreen({
    ui,
    title,
    children,
    onBack,
    className = '',
}: CreditsScreenProps) {
    return (
        <div className={`credits-screen ${className}`}>
            <div className="credits-panel">
                <h1 className="credits-heading">
                    {ui['ui.credits'] ?? 'Credits'}
                </h1>
                <div className="credits-content">
                    {children ?? (
                        <>
                            <p>{title}</p>
                            <p>
                                {ui['ui.made_with_doodle_engine'] ??
                                    'Made with Doodle Engine'}
                            </p>
                        </>
                    )}
                </div>
                <button className="title-button" onClick={onBack}>
                    {ui['ui.back']}
                </button>
            </div>
        </div>
    );
}
