/**
 * SaveLoadPanel - Save and load game state via localStorage
 */

import { useState } from 'react';
import type { SaveData } from '@doodle-engine/core';

export interface SaveLoadPanelProps {
    /** Resolved UI strings from snapshot.ui */
    ui: Record<string, string>;
    onSave: () => SaveData;
    onLoad: (saveData: SaveData) => void;
    storageKey?: string;
    className?: string;
}

export function SaveLoadPanel({
    ui,
    onSave,
    onLoad,
    storageKey = 'doodle-engine-save',
    className = '',
}: SaveLoadPanelProps) {
    const [message, setMessage] = useState('');

    const handleSave = () => {
        const saveData = onSave();
        localStorage.setItem(storageKey, JSON.stringify(saveData));
        setMessage('Saved!');
        setTimeout(() => setMessage(''), 2000);
    };

    const handleLoad = () => {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            setMessage('No save found');
            setTimeout(() => setMessage(''), 2000);
            return;
        }
        const saveData: SaveData = JSON.parse(raw);
        onLoad(saveData);
        setMessage('Loaded!');
        setTimeout(() => setMessage(''), 2000);
    };

    const hasSave = localStorage.getItem(storageKey) !== null;

    return (
        <div className={`save-load-panel ${className}`}>
            <button className="save-button" onClick={handleSave}>
                {ui['ui.save']}
            </button>
            <button
                className="load-button"
                onClick={handleLoad}
                disabled={!hasSave}
            >
                {ui['ui.load']}
            </button>
            {message && <span className="save-load-message">{message}</span>}
        </div>
    );
}
