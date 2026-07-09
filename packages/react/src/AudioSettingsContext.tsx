/**
 * AudioSettingsContext - Persistent audio volume settings
 *
 * Stores master, music, sound, and voice volumes in React state.
 * Persists to localStorage under 'doodle-engine-audio' so settings
 * survive page reloads without requiring a save file.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'doodle-engine-audio';
const DEFAULT_AUDIO_SETTINGS = {
    masterVolume: 1.0,
    musicVolume: 0.7,
    soundVolume: 0.8,
    voiceVolume: 1.0,
};

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

function loadFromStorage(): Partial<{
    masterVolume: number;
    musicVolume: number;
    soundVolume: number;
    voiceVolume: number;
}> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function saveToStorage(volumes: { masterVolume: number; musicVolume: number; soundVolume: number; voiceVolume: number }) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    } catch { /* ignore */ }
}

export function AudioSettingsProvider({ children, defaults }: { children: ReactNode; defaults?: Partial<{ masterVolume: number; musicVolume: number; soundVolume: number; voiceVolume: number }> }) {
    const initial = {
        ...DEFAULT_AUDIO_SETTINGS,
        ...defaults,
        ...loadFromStorage(),
    };

    const [masterVolume, setMasterVolumeState] = useState(initial.masterVolume);
    const [musicVolume, setMusicVolumeState] = useState(initial.musicVolume);
    const [soundVolume, setSoundVolumeState] = useState(initial.soundVolume);
    const [voiceVolume, setVoiceVolumeState] = useState(initial.voiceVolume);

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
