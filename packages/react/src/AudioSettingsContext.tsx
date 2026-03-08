/**
 * AudioSettingsContext - Persistent audio volume settings
 *
 * Stores master, music, sound, and voice volumes in React state.
 * Persists to localStorage under 'doodle-engine-audio' so settings
 * survive page reloads without requiring a save file.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'doodle-engine-audio';

export interface AudioSettings {
    masterVolume: number;
    musicVolume: number;
    soundVolume: number;
    voiceVolume: number;
    setMasterVolume: (v: number) => void;
    setMusicVolume: (v: number) => void;
    setSoundVolume: (v: number) => void;
    setVoiceVolume: (v: number) => void;
}

export const AudioSettingsContext = createContext<AudioSettings | null>(null);

export function useAudioSettings(): AudioSettings {
    const ctx = useContext(AudioSettingsContext);
    if (!ctx) throw new Error('useAudioSettings must be used within AudioSettingsProvider');
    return ctx;
}

function loadFromStorage(): { masterVolume: number; musicVolume: number; soundVolume: number; voiceVolume: number } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { masterVolume: 1.0, musicVolume: 0.7, soundVolume: 0.8, voiceVolume: 1.0 };
        return { masterVolume: 1.0, musicVolume: 0.7, soundVolume: 0.8, voiceVolume: 1.0, ...JSON.parse(raw) };
    } catch {
        return { masterVolume: 1.0, musicVolume: 0.7, soundVolume: 0.8, voiceVolume: 1.0 };
    }
}

function saveToStorage(volumes: { masterVolume: number; musicVolume: number; soundVolume: number; voiceVolume: number }) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    } catch { /* ignore */ }
}

export function AudioSettingsProvider({ children, defaults }: { children: ReactNode; defaults?: Partial<{ masterVolume: number; musicVolume: number; soundVolume: number; voiceVolume: number }> }) {
    const stored = loadFromStorage();

    const [masterVolume, setMasterVolumeState] = useState(stored.masterVolume ?? defaults?.masterVolume ?? 1.0);
    const [musicVolume, setMusicVolumeState] = useState(stored.musicVolume ?? defaults?.musicVolume ?? 0.7);
    const [soundVolume, setSoundVolumeState] = useState(stored.soundVolume ?? defaults?.soundVolume ?? 0.8);
    const [voiceVolume, setVoiceVolumeState] = useState(stored.voiceVolume ?? defaults?.voiceVolume ?? 1.0);

    const setMasterVolume = (v: number) => {
        setMasterVolumeState(v);
        saveToStorage({ masterVolume: v, musicVolume, soundVolume, voiceVolume });
    };
    const setMusicVolume = (v: number) => {
        setMusicVolumeState(v);
        saveToStorage({ masterVolume, musicVolume: v, soundVolume, voiceVolume });
    };
    const setSoundVolume = (v: number) => {
        setSoundVolumeState(v);
        saveToStorage({ masterVolume, musicVolume, soundVolume: v, voiceVolume });
    };
    const setVoiceVolume = (v: number) => {
        setVoiceVolumeState(v);
        saveToStorage({ masterVolume, musicVolume, soundVolume, voiceVolume: v });
    };

    return (
        <AudioSettingsContext.Provider value={{ masterVolume, musicVolume, soundVolume, voiceVolume, setMasterVolume, setMusicVolume, setSoundVolume, setVoiceVolume }}>
            {children}
        </AudioSettingsContext.Provider>
    );
}
