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
    const day = slot.save.state?.currentTime?.day;
    const usesGeneratedLabel =
        (slot.kind === 'quick' && slot.label === 'Quick Save') ||
        (slot.kind === 'auto' && slot.label === 'Autosave') ||
        (slot.kind === 'manual' &&
            (slot.label === 'Save' || slot.label === `Day ${day}`));
    if (day !== undefined && usesGeneratedLabel) {
        return uiText(ui, 'ui.day').replace('{day}', String(day));
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
            <ul className="save-slot-list doodle-scroll">
                {slots.length === 0 && (
                    <li className="save-load-empty">
                        {uiText(ui, 'ui.no_saves')}
                    </li>
                )}
                {slots.map((slot) => (
                    <li
                        key={slot.id}
                        className={`save-slot save-slot-${slot.kind}`}
                    >
                        <div className="save-slot-thumbnail" aria-hidden="true">
                            <span className="doodle-placeholder-text">
                                thumbnail
                            </span>
                        </div>
                        <div className="save-slot-kind">
                            {slot.kind === 'quick'
                                ? uiText(ui, 'ui.quick_save')
                                : slot.kind === 'auto'
                                  ? uiText(ui, 'ui.autosave')
                                  : uiText(ui, 'ui.save')}
                        </div>
                        <div className="save-slot-info">
                            <span className="save-slot-label">
                                {displaySlotLabel(slot, ui)}
                            </span>
                            {slot.timestamp && (
                                <time
                                    className="save-slot-time"
                                    dateTime={slot.timestamp}
                                >
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
                <li className="save-slot-new">
                    <button
                        className="save-slot is-empty"
                        onClick={handleNewSave}
                    >
                        <span
                            className="save-slot-thumbnail-empty"
                            aria-hidden="true"
                        />
                        <span
                            className="save-slot-kind-empty"
                            aria-hidden="true"
                        />
                        <span className="save-slot-empty-label">
                            {uiText(ui, 'ui.new_save')}
                        </span>
                        <span className="save-slot-empty-action">
                            {uiText(ui, 'ui.save')}
                        </span>
                    </button>
                </li>
            </ul>

            {message && <span className="save-load-message">{message}</span>}
        </div>
    );
}
