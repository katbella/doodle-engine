/**
 * useAudioManager - Manages game audio channels
 *
 * Handles four audio channels:
 * - Music: Background music (loops, crossfades between tracks)
 * - Ambient: Location ambient sound (loops, swaps on location change)
 * - Sound: Sound effects (one-shots from pendingSounds array)
 * - Voice: Dialogue voice (one at a time, from dialogue.voice)
 *
 * Watches snapshot for audio cues and plays them automatically.
 * Volume values are reactive parameters. The caller owns volume state
 * (typically via AudioSettingsContext); this hook just applies them.
 */

import { useEffect, useRef } from 'react';
import type { Snapshot } from '@doodle-engine/core';

export interface AudioManagerOptions {
    /** Master volume (0-1) */
    masterVolume?: number;
    /** Music volume (0-1) */
    musicVolume?: number;
    /** Sound effects volume (0-1) */
    soundVolume?: number;
    /** Voice volume (0-1) */
    voiceVolume?: number;
    /** Music crossfade duration in ms */
    crossfadeDuration?: number;
}

export interface AudioManagerControls {
    /** Stop all audio */
    stopAll: () => void;
}

/**
 * Audio manager hook
 * Watches snapshot for audio changes and manages playback.
 * Volumes are reactive: pass current values each render.
 */
export function useAudioManager(
    snapshot: Snapshot,
    options: AudioManagerOptions = {}
): AudioManagerControls {
    const {
        masterVolume = 1.0,
        musicVolume = 0.7,
        soundVolume = 0.8,
        voiceVolume = 1.0,
        crossfadeDuration = 1000,
    } = options;

    // Ref for current volumes, used in callbacks/timers without stale closures
    const volumesRef = useRef({ masterVolume, musicVolume, soundVolume, voiceVolume });
    volumesRef.current = { masterVolume, musicVolume, soundVolume, voiceVolume };

    // Audio elements
    const musicAudioRef = useRef<HTMLAudioElement | null>(null);
    const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
    const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
    const currentMusicTrack = useRef<string | null>(null);
    const currentAmbientTrack = useRef<string | null>(null);
    const fadeIntervalRef = useRef<number | null>(null);

    // Initialize audio elements
    useEffect(() => {
        const musicAudio = new Audio();
        musicAudio.loop = true;
        musicAudioRef.current = musicAudio;

        const ambientAudio = new Audio();
        ambientAudio.loop = true;
        ambientAudioRef.current = ambientAudio;

        const voiceAudio = new Audio();
        voiceAudioRef.current = voiceAudio;

        return () => {
            if (fadeIntervalRef.current) {
                clearInterval(fadeIntervalRef.current);
            }
            musicAudio.pause();
            ambientAudio.pause();
            voiceAudio.pause();
            musicAudio.src = '';
            ambientAudio.src = '';
            voiceAudio.src = '';
        };
    }, []);

    // Update volumes on all active audio elements when volumes change
    useEffect(() => {
        if (musicAudioRef.current?.src) {
            musicAudioRef.current.volume = masterVolume * musicVolume;
        }
        if (ambientAudioRef.current?.src) {
            ambientAudioRef.current.volume = masterVolume * soundVolume;
        }
        if (voiceAudioRef.current?.src) {
            voiceAudioRef.current.volume = masterVolume * voiceVolume;
        }
    }, [masterVolume, musicVolume, soundVolume, voiceVolume]);

    // Switch music track when snapshot.music changes
    useEffect(() => {
        const musicAudio = musicAudioRef.current;
        if (!musicAudio) return;

        const newTrack = snapshot.music;
        if (newTrack === currentMusicTrack.current) return;

        currentMusicTrack.current = newTrack;

        if (!newTrack) {
            fadeOut(musicAudio, crossfadeDuration);
        } else {
            crossfadeMusic(musicAudio, newTrack, crossfadeDuration);
        }
    }, [snapshot.music, crossfadeDuration]);

    // Switch ambient track when snapshot.ambient changes
    useEffect(() => {
        const ambientAudio = ambientAudioRef.current;
        if (!ambientAudio) return;

        const newTrack = snapshot.ambient;
        if (newTrack === currentAmbientTrack.current) return;

        currentAmbientTrack.current = newTrack;

        ambientAudio.pause();
        if (newTrack) {
            ambientAudio.src = newTrack;
            const v = volumesRef.current;
            ambientAudio.volume = v.masterVolume * v.soundVolume;
            ambientAudio.play().catch(() => {});
        } else {
            ambientAudio.src = '';
        }
    }, [snapshot.ambient]);

    // Play voice when dialogue.voice changes
    useEffect(() => {
        const voiceAudio = voiceAudioRef.current;
        if (!voiceAudio) return;

        const voiceFile = snapshot.dialogue?.voice;
        if (voiceFile) {
            voiceAudio.pause();
            voiceAudio.currentTime = 0;
            voiceAudio.src = voiceFile;
            const v = volumesRef.current;
            voiceAudio.volume = v.masterVolume * v.voiceVolume;
            voiceAudio.play().catch((error) => {
                console.warn('Voice playback failed:', error);
            });
        }
    }, [snapshot.dialogue?.voice]);

    // Play sound effects from pendingSounds
    useEffect(() => {
        if (snapshot.pendingSounds.length === 0) return;

        const v = volumesRef.current;
        snapshot.pendingSounds.forEach((soundFile) => {
            const soundAudio = new Audio(soundFile);
            soundAudio.volume = v.masterVolume * v.soundVolume;
            soundAudio.play().catch((error) => {
                console.warn('Sound playback failed:', error);
            });
        });
    }, [snapshot.pendingSounds]);

    // Helper: Crossfade to new music track
    const crossfadeMusic = (
        audio: HTMLAudioElement,
        newTrackPath: string,
        duration: number
    ) => {
        fadeOut(audio, duration / 2).then(() => {
            audio.src = newTrackPath;
            audio.load();
            audio.volume = 0;

            const v = volumesRef.current;
            audio
                .play()
                .then(() => {
                    fadeIn(audio, duration / 2, v.masterVolume * v.musicVolume);
                })
                .catch((error) => {
                    console.warn('Music playback failed:', error);
                });
        });
    };

    // Helper: Fade out audio
    const fadeOut = (
        audio: HTMLAudioElement,
        duration: number
    ): Promise<void> => {
        return new Promise((resolve) => {
            const startVolume = audio.volume;
            const steps = 20;
            const stepDuration = duration / steps;
            const volumeDecrement = startVolume / steps;

            let step = 0;
            const interval = setInterval(() => {
                step++;
                audio.volume = Math.max(
                    0,
                    startVolume - volumeDecrement * step
                );

                if (step >= steps) {
                    clearInterval(interval);
                    audio.pause();
                    audio.currentTime = 0;
                    resolve();
                }
            }, stepDuration);

            fadeIntervalRef.current = interval as unknown as number;
        });
    };

    // Helper: Fade in audio
    const fadeIn = (
        audio: HTMLAudioElement,
        duration: number,
        targetVolume: number
    ) => {
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeIncrement = targetVolume / steps;

        let step = 0;
        const interval = setInterval(() => {
            step++;
            audio.volume = Math.min(targetVolume, volumeIncrement * step);

            if (step >= steps) {
                clearInterval(interval);
            }
        }, stepDuration);

        fadeIntervalRef.current = interval as unknown as number;
    };

    // Stop all audio
    const stopAll = () => {
        if (musicAudioRef.current) {
            musicAudioRef.current.pause();
            musicAudioRef.current.currentTime = 0;
        }
        if (ambientAudioRef.current) {
            ambientAudioRef.current.pause();
            ambientAudioRef.current.currentTime = 0;
        }
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause();
            voiceAudioRef.current.currentTime = 0;
        }
    };

    return { stopAll };
}
