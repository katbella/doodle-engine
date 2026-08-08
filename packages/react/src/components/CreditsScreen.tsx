import type { ReactNode } from 'react';
import { uiText } from '../uiText';

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
                <h1 className="credits-heading">{uiText(ui, 'ui.credits')}</h1>
                <div className="credits-content">
                    {children ?? (
                        <>
                            <p>{title}</p>
                            <p>{uiText(ui, 'ui.made_with_doodle_engine')}</p>
                        </>
                    )}
                </div>
                <button className="title-button" onClick={onBack}>
                    <span className="title-button-label">
                        {uiText(ui, 'ui.back')}
                    </span>
                </button>
            </div>
        </div>
    );
}
