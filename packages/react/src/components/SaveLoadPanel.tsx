/**
 * SaveLoadPanel - Manage saved games in localStorage.
 *
 * Shows the quick save and autosave (if any), then the player's manual saves.
 * "New Save" makes a manual save. Each save can be loaded; manual saves can
 * also be deleted. The actual save/load of game state is done by the
 * onSave/onLoad callbacks; this panel manages the list of slots.
 */

import { useState } from 'react';
import type { SaveData } from '@doodle-engine/core';
import {
    listSaves,
    writeSave,
    loadSave,
    deleteSave,
    saveStorageKeyForProject,
    type SaveSlot,
} from '../saves';
import { uiText } from '../uiText';

export interface SaveLoadPanelProps {
    /** Resolved UI strings from snapshot.ui */
    ui: Record<string, string>;
    onSave: () => SaveData;
    onLoad: (saveData: SaveData) => void;
    /** Stable project identity generated once when the project is created. */
    projectId: string;
    className?: string;
}

function formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

function displaySlotLabel(slot: SaveSlot, ui: Record<string, string>): string {
    if (slot.kind === 'quick' && slot.label === 'Quick Save') {
        return uiText(ui, 'ui.quick_save');
    }
    if (slot.kind === 'auto' && slot.label === 'Autosave') {
        return uiText(ui, 'ui.autosave');
    }
    const day = slot.save.state?.currentTime?.day;
    if (slot.kind === 'manual' && slot.label === `Day ${day}`) {
        return uiText(ui, 'ui.day').replace('{day}', String(day));
    }
    if (slot.kind === 'manual' && slot.label === 'Save') {
        return uiText(ui, 'ui.save');
    }
    return slot.label;
}

export function SaveLoadPanel({
    ui,
    onSave,
    onLoad,
    projectId,
    className = '',
}: SaveLoadPanelProps) {
    const storageKey = saveStorageKeyForProject(projectId);
    const [slots, setSlots] = useState<SaveSlot[]>(() =>
        listSaves(localStorage, storageKey)
    );
    const [message, setMessage] = useState('');

    const flash = (text: string) => {
        setMessage(text);
        setTimeout(() => setMessage(''), 2000);
    };

    const refresh = () => setSlots(listSaves(localStorage, storageKey));

    const handleNewSave = () => {
        writeSave(localStorage, storageKey, onSave(), 'manual');
        refresh();
        flash(uiText(ui, 'ui.saved'));
    };

    const handleLoad = (id: string) => {
        const data = loadSave(localStorage, storageKey, id);
        if (data) {
            onLoad(data);
            flash(uiText(ui, 'ui.loaded'));
        }
    };

    const handleDelete = (id: string) => {
        deleteSave(localStorage, storageKey, id);
        refresh();
    };

    return (
        <div className={`save-load-panel ${className}`}>
            <button className="save-button" onClick={handleNewSave}>
                {uiText(ui, 'ui.new_save')}
            </button>

            {slots.length === 0 ? (
                <p className="save-load-empty">{uiText(ui, 'ui.no_saves')}</p>
            ) : (
                <ul className="save-slot-list">
                    {slots.map((slot) => (
                        <li
                            key={slot.id}
                            className={`save-slot save-slot-${slot.kind}`}
                        >
                            <div className="save-slot-info">
                                <span className="save-slot-label">
                                    {displaySlotLabel(slot, ui)}
                                </span>
                                {slot.timestamp && (
                                    <time
                                        className="save-slot-time"
                                        dateTime={slot.timestamp}
                                    >
                                        {' · '}
                                        {formatTimestamp(slot.timestamp)}
                                    </time>
                                )}
                            </div>
                            <div className="save-slot-actions">
                                <button
                                    className="load-button"
                                    onClick={() => handleLoad(slot.id)}
                                >
                                    {uiText(ui, 'ui.load')}
                                </button>
                                {slot.kind === 'manual' && (
                                    <button
                                        className="delete-button"
                                        onClick={() => handleDelete(slot.id)}
                                    >
                                        {uiText(ui, 'ui.delete')}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {message && <span className="save-load-message">{message}</span>}
        </div>
    );
}
